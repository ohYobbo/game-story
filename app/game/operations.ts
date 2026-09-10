import { getDevelopmentGain, getEnergyModifier, getLeadRepeatMultiplier, getQualityGain, getRepeatedUseMultiplier, getStageTeamPower, type ProductionStage } from "../game-balance.ts";
import { STAGE_INFO, TRAINING_METHODS } from "./data.ts";
import { getDirectionConfig } from "./rules.ts";
import type { FanSegments, GameState, Inventory, Project, RandomSource, Staff, StaffChallengeInvestment, StaffChallengeMetric, StaffChallengeOffer } from "./types";
export type NumberRange = { min: number; max: number };

export const STAFF_CHALLENGE_SUCCESS_CAP = .9;

export const STAFF_CHALLENGE_INVESTMENTS: {
  id: StaffChallengeInvestment;
  name: string;
  cashCost: number;
  researchCost: number;
  chanceBonus: number;
}[] = [
  { id: "steady", name: "稳妥支持", cashCost: 30, researchCost: 2, chanceBonus: .1 },
  { id: "full", name: "全力支持", cashCost: 75, researchCost: 5, chanceBonus: .22 },
];

export const STAFF_CHALLENGE_METRICS: Record<
  StaffChallengeMetric,
  {
    label: string;
    skill: keyof Pick<Staff, "code" | "scenario" | "art" | "sound">;
    visualStage: Exclude<ProductionStage, "debug">;
  }
> = {
  fun: { label: "趣味", skill: "code", visualStage: "coding" },
  creativity: { label: "创意", skill: "scenario", visualStage: "planning" },
  graphics: { label: "画面", skill: "art", visualStage: "graphics" },
  sound: { label: "音乐", skill: "sound", visualStage: "sound" },
};

export function getStaffChallengeTarget(member: Staff) {
  return (Object.entries(STAFF_CHALLENGE_METRICS) as [
    StaffChallengeMetric,
    (typeof STAFF_CHALLENGE_METRICS)[StaffChallengeMetric],
  ][]).reduce((best, candidate) =>
    member[candidate[1].skill] > member[best[1].skill] ? candidate : best
  );
}

export function getStaffChallengeSuccessRate(
  offer: StaffChallengeOffer,
  investment: StaffChallengeInvestment,
) {
  const option = STAFF_CHALLENGE_INVESTMENTS.find((item) => item.id === investment);
  return Math.min(
    STAFF_CHALLENGE_SUCCESS_CAP,
    offer.baseSuccessRate + (option?.chanceBonus ?? 0),
  );
}

export function getExternalLeadCost(stage: ProductionStage) {
  return 15 + ["planning", "coding", "graphics", "sound"].indexOf(stage) * 20;
}

const stageRoleFit: Record<Exclude<ProductionStage, "debug">, string[]> = {
  planning: ["编剧", "总监", "制作人", "黑客"],
  coding: ["程序员", "总监", "硬件工程师", "黑客"],
  graphics: ["美术", "总监", "制作人", "黑客"],
  sound: ["音效师", "制作人", "黑客"],
};

export const CONTINUOUS_LEAD_MULTIPLIER = .8;

export type StageLeadInput = {
  rawSkill: number;
  identity: number | "external";
  energy: number | null;
  maxPower?: number;
  role?: string;
};

export type StageLeadPrediction = {
  skillLabel: string;
  rawSkill: number;
  effectiveSkill: number;
  roleFit: string;
  energy: number | null;
  mayRest: boolean;
  progressRange: NumberRange;
  qualityRange: NumberRange;
  openingProgressRange: NumberRange;
  openingQualityRange: NumberRange;
  openingBugRange: NumberRange;
  openingEnergyCost: number;
  contributionLevel: string;
  gapToBest: number;
  repeated: boolean;
  repeatPenalty: number;
  cost: number;
  external: boolean;
};

function stageLeadNumbers(
  state: GameState,
  project: Project,
  rawSkill: number,
  identity: number | "external",
  energy: number | null,
  maxPower = 10,
  role?: string,
) {
  const stage = (project.stage ?? "planning") as Exclude<ProductionStage, "debug">;
  const repeated = state.lastStageLeads[stage] === identity;
  const repeatMultiplier = getLeadRepeatMultiplier(repeated);
  const effectiveSkill = rawSkill * repeatMultiplier;
  const fitsRole = identity === "external" || stageRoleFit[stage].includes(role ?? "");
  const roleMultiplier = fitsRole ? 1 : .82;
  const energyMultiplier = energy === null ? 1 : .55 + Math.max(0, Math.min(100, energy)) / 100 * .45;
  const openingSkill = effectiveSkill * roleMultiplier * energyMultiplier;
  const direction = getDirectionConfig(project.direction);
  const stagePower = getStageTeamPower(state.staff, stage);
  const energyModifier = getEnergyModifier(state.staff);
  const progressRange = {
    min: getDevelopmentGain(stagePower, effectiveSkill * CONTINUOUS_LEAD_MULTIPLIER, direction.speed, energyModifier, 0),
    max: getDevelopmentGain(stagePower, effectiveSkill * CONTINUOUS_LEAD_MULTIPLIER, direction.speed, energyModifier, 1),
  };
  const qualityRange = {
    min: getQualityGain(stagePower, effectiveSkill * CONTINUOUS_LEAD_MULTIPLIER, direction.quality, 0),
    max: getQualityGain(stagePower, effectiveSkill * CONTINUOUS_LEAD_MULTIPLIER, direction.quality, 1),
  };
  const openingProgressRange = {
    min: getDevelopmentGain(0, openingSkill, direction.speed, 1, 0) * 1.4,
    max: getDevelopmentGain(0, openingSkill, direction.speed, 1, 1) * 1.4,
  };
  const openingQualityRange = {
    min: getQualityGain(0, openingSkill, direction.quality, 0) * 1.8,
    max: getQualityGain(0, openingSkill, direction.quality, 1) * 1.8,
  };
  const bugFactor = Math.max(.45, 1 - openingSkill / 120);
  const openingBugRange = {
    min: 0,
    max: stage === "coding"
      ? (project.direction === "赶工" ? 1.05 : .65) * bugFactor
      : .1 * bugFactor,
  };
  const openingEnergyCost = identity === "external"
    ? 0
    : Math.max(5, Math.min(12, 10 - Math.max(8, maxPower) * .18));
  const ticks = Math.ceil(Math.max(0, (project.stageTarget ?? 1) - openingProgressRange.max) / Math.max(.01, progressRange.max));
  const energyDrain = 100 / (Math.max(8, maxPower) * 3.2);
  return {
    stage,
    repeated,
    repeatMultiplier,
    effectiveSkill,
    roleFit: fitsRole ? (identity === "external" ? "专业外援" : "职业适配") : "跨职能",
    progressRange,
    qualityRange,
    openingProgressRange,
    openingQualityRange,
    openingBugRange,
    openingEnergyCost,
    mayRest: energy !== null && energy - openingEnergyCost - ticks * energyDrain <= 10,
  };
}

export function rollStageLeadOpening(
  state: GameState,
  project: Project,
  lead: StageLeadInput,
  random: RandomSource,
) {
  const values = stageLeadNumbers(
    state,
    project,
    lead.rawSkill,
    lead.identity,
    lead.energy,
    lead.maxPower,
    lead.role,
  );
  const roll = (range: NumberRange) => range.min + (range.max - range.min) * random();
  return {
    ...values,
    progress: roll(values.openingProgressRange),
    quality: roll(values.openingQualityRange),
    bugs: roll(values.openingBugRange),
  };
}

export function predictStageLead(state: GameState, project: Project, member: Staff): StageLeadPrediction {
  const stage = (project.stage ?? "planning") as Exclude<ProductionStage, "debug">;
  const skillKey = STAGE_INFO[stage].skill;
  const rawSkill = member[skillKey];
  const values = stageLeadNumbers(state, project, rawSkill, member.id, member.energy, member.maxPower, member.role);
  const openingQuality = (candidate: Staff) => {
    const opening = stageLeadNumbers(state, project, candidate[skillKey], candidate.id, candidate.energy, candidate.maxPower, candidate.role).openingQualityRange;
    return (opening.min + opening.max) / 2;
  };
  const available = !member.resting && member.energy > 10;
  const contribution = openingQuality(member);
  const best = Math.max(0, ...state.staff.filter((candidate) => !candidate.resting && candidate.energy > 10).map(openingQuality));
  const gapToBest = Math.max(0, Math.round((best - contribution) * 10) / 10);
  const ratio = best > 0 ? contribution / best : 0;
  return {
    skillLabel: STAGE_INFO[stage].short,
    rawSkill,
    effectiveSkill: values.effectiveSkill,
    roleFit: values.roleFit,
    energy: member.energy,
    mayRest: values.mayRest,
    progressRange: values.progressRange,
    qualityRange: values.qualityRange,
    openingProgressRange: values.openingProgressRange,
    openingQualityRange: values.openingQualityRange,
    openingBugRange: values.openingBugRange,
    openingEnergyCost: values.openingEnergyCost,
    contributionLevel: !available ? "休息" : ratio >= .95 ? "最佳" : ratio >= .75 ? "合适" : "偏弱",
    gapToBest,
    repeated: values.repeated,
    repeatPenalty: Math.round((1 - values.repeatMultiplier) * 100),
    cost: 0,
    external: false,
  };
}

export function predictExternalLead(state: GameState, project: Project): StageLeadPrediction {
  const stage = (project.stage ?? "planning") as Exclude<ProductionStage, "debug">;
  const skillKey = STAGE_INFO[stage].skill;
  const stageIndex = ["planning", "coding", "graphics", "sound"].indexOf(stage);
  const rawSkill = Math.max(0, ...state.staff.map((member) => member[skillKey])) + 6 + stageIndex * 2;
  const values = stageLeadNumbers(state, project, rawSkill, "external", null);
  return {
    skillLabel: STAGE_INFO[stage].short,
    rawSkill,
    effectiveSkill: values.effectiveSkill,
    roleFit: "专业外援",
    energy: null,
    mayRest: false,
    progressRange: values.progressRange,
    qualityRange: values.qualityRange,
    openingProgressRange: values.openingProgressRange,
    openingQualityRange: values.openingQualityRange,
    openingBugRange: values.openingBugRange,
    openingEnergyCost: values.openingEnergyCost,
    contributionLevel: "强力",
    gapToBest: 0,
    repeated: values.repeated,
    repeatPenalty: Math.round((1 - values.repeatMultiplier) * 100),
    cost: getExternalLeadCost(stage),
    external: true,
  };
}

export function predictTraining(
  member: Staff,
  method: (typeof TRAINING_METHODS)[number],
  unlockedThemes: string[],
  companyLevel = 1,
  cash = Infinity,
) {
  const used = member.training?.[method.id] ?? 0;
  const multiplier = getRepeatedUseMultiplier(used, .18, .2);
  const gains = Object.entries(method.gains).map(([key, value]) => {
    const stat = key as keyof Pick<Staff, "code" | "scenario" | "art" | "sound">;
    // Penalties stay fixed; only positive gains decay or receive the super-training bonus.
    const delta = (bonus: number) => value < 0 ? 0 - Math.min(member[stat], -value) : Math.round(value * multiplier * bonus);
    return { key: stat, min: delta(1), max: delta(3) };
  });
  const blockedReason = companyLevel < (method.officeLevel ?? 1)
    ? `第 ${method.officeLevel} 阶段办公室解锁`
    : method.requiredRole && member.role !== method.requiredRole ? `仅限当前职业为${method.requiredRole}`
      : cash < method.cost ? "培训资金不足"
        : member.energy < method.energy ? "体力不足，先让员工休息" : null;
  const canUnlock = member.role === method.unlock.role && member.level >= method.unlock.level;
  return {
    used,
    multiplier,
    gains,
    blockedReason,
    canUnlock,
    willDiscover: !blockedReason && canUnlock && !unlockedThemes.includes(method.unlock.name),
    discovery: unlockedThemes.includes(method.unlock.name) ? `已发现“${method.unlock.name}”` : `${method.unlock.role} Lv.${method.unlock.level} 可发现“${method.unlock.name}”`,
  };
}

export function predictMarketing(
  state: GameState,
  method: { name: string; hype: number; segment: keyof FanSegments },
) {
  const latestRelease = state.releases[0];
  const previousUses = state.project?.kind === "game"
    ? state.project.advertisingUses?.[method.name] ?? 0
    : latestRelease?.advertisingUses?.[method.name] ?? 0;
  const multiplier = getRepeatedUseMultiplier(previousUses, .25, .15);
  const effectiveHype = Math.max(1, Math.round(method.hype * multiplier));
  const addedDemand = latestRelease && state.project?.kind !== "game"
    ? Math.round(Math.max(latestRelease.weeklySales ?? 0, latestRelease.sales * .04) * (effectiveHype / 8))
    : 0;
  return {
    previousUses,
    multiplier,
    effectiveHype,
    fanGain: Math.round(effectiveHype * 2.5),
    segmentGain: Math.max(1, Math.round(effectiveHype / 2)),
    addedDemand,
    target: state.project?.kind === "game" ? "开发中作品热度" : "已发售作品后续需求",
  };
}

export function predictItemUse(state: GameState, key: keyof Inventory) {
  if (key === "energyDrink") {
    return { researchCost: 0, amount: 42, multiplier: 1, target: "全体员工体力" };
  }
  const uses = state.project?.kind === "game" ? state.project.itemUses ?? 0 : 0;
  const researchCost = 4 + uses * 2;
  const multiplier = 1 / (1 + uses * .7);
  const amount = Math.max(3, Math.round(10 * multiplier));
  const target = key === "funBoost" ? "趣味" : key === "creativityBoost" ? "创意" : key === "graphicsBoost" ? "画面" : key === "soundBoost" ? "音乐" : "漏洞";
  return { researchCost, amount: key === "bugSpray" ? Math.max(6, amount) : amount, multiplier, target };
}
