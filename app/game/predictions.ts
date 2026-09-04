import {
  COMBO_STARTING_BONUS,
  getConsoleInitialUsers,
  getContentPopularity,
  getDevelopmentCost,
  getDevelopmentGain,
  getEnergyModifier,
  getFirstWeekSales,
  getGeneralProjectGain,
  getGeneralQualityGain,
  getLeadRepeatMultiplier,
  getQualityGain,
  getReleaseFatigueMultiplier,
  getRepeatedUseMultiplier,
  getReviewScores,
  getStageTeamPower,
  type ProductionStage,
} from "../game-balance.ts";
import {
  CONTRACTS,
  DIRECTIONS,
  GREAT_COMBOS,
  STAGE_INFO,
  TRAINING_METHODS,
} from "./data.ts";
import {
  getAudience,
  getDirectionAudienceGains,
  getDirectionBoosts,
  getDirectionConfig,
  getKnowledgeLevel,
  getStageTarget,
} from "./rules.ts";
import type {
  DirectionPoints,
  FanSegments,
  GameState,
  Inventory,
  Project,
  RandomSource,
  Release,
  Staff,
} from "./types";

export type NumberRange = { min: number; max: number };
export type PredictionFactor = {
  tone: "positive" | "negative" | "neutral";
  text: string;
};

export type PlatformPredictionInput = {
  name: string;
  cost: number;
  users: number;
  debut: number;
  retire: number;
};

export type GamePlanInput = {
  state: GameState;
  name: string;
  platform: PlatformPredictionInput;
  genre: string;
  theme: string;
  direction: string;
  directionPoints: DirectionPoints;
  sequel?: Release;
};

export type GamePlanPrediction = {
  project: Project;
  cost: number;
  cashRatio: number;
  durationWeeks: NumberRange;
  qualityRange: NumberRange;
  qualityLevel: string;
  cashPressure: string;
  riskLevel: string;
  combinationLevel: string;
  audience: string;
  audienceChanges: string[];
  marketLevel: string;
  marketUsers: number;
  platformYearsRemaining: number | null;
  advantages: PredictionFactor[];
  risks: PredictionFactor[];
};

const qualityLabel = (value: number) =>
  value >= 55 ? "突破级" : value >= 38 ? "优秀" : value >= 24 ? "稳健" : "基础";

const marketLabel = (users: number) =>
  users >= 1_500_000 ? "超大型" : users >= 700_000 ? "大型" : users >= 350_000 ? "中型" : "小型";

const segmentLabels: Record<keyof FanSegments, string> = {
  kids: "儿童",
  teens: "青少年",
  adults: "成人",
  seniors: "银发族",
  male: "男性",
  female: "女性",
};

export function getExternalLeadCost(stage: ProductionStage) {
  return 15 + ["planning", "coding", "graphics", "sound"].indexOf(stage) * 20;
}

export function createGameProject(input: GamePlanInput): Project {
  const { state, sequel } = input;
  const isGreatCombo = GREAT_COMBOS.has(`${input.genre}|${input.theme}`);
  const comboBoost = isGreatCombo ? COMBO_STARTING_BONUS : 0;
  const sequelBoost = sequel ? 7 + Math.floor(sequel.score / 8) : 0;
  const masteryBoost =
    getKnowledgeLevel(state.genreExperience[input.genre] ?? 0) +
    getKnowledgeLevel(state.themeExperience[input.theme] ?? 0) - 2;
  const directionConfig = getDirectionConfig(input.direction);
  const directionBoosts = getDirectionBoosts(input.directionPoints);
  const developmentCost = getDevelopmentCost(
    input.platform.cost,
    input.genre,
    input.theme,
    directionConfig.cost,
  );

  return {
    kind: "game",
    name: input.name.trim() || "无名游戏",
    platform: input.platform.name,
    genre: input.genre,
    theme: input.theme,
    direction: input.direction,
    progress: 0,
    target: Math.round(270 * directionConfig.target),
    fun: 6 + comboBoost + masteryBoost + sequelBoost + directionBoosts.fun,
    creativity: 5 + comboBoost + masteryBoost + sequelBoost + directionBoosts.creativity,
    graphics: 4 + Math.floor(masteryBoost / 2) + sequelBoost + directionBoosts.graphics,
    sound: 3 + Math.floor(masteryBoost / 2) + sequelBoost + directionBoosts.sound,
    bugs: 0,
    hype: 2 + directionBoosts.hype,
    marketUsers: input.platform.users,
    stage: "planning",
    stageProgress: 0,
    stageTarget: getStageTarget("planning", input.direction),
    elapsedWeeks: 0,
    sequelOf: sequel?.name,
    itemUses: 0,
    eventCount: 0,
    directionPoints: { ...input.directionPoints },
    contentPopularity: getContentPopularity(input.genre, input.theme, isGreatCombo),
    debugResearch: 0,
    developmentCost,
  };
}

function getAudienceChanges(genre: string, theme: string, points: DirectionPoints) {
  const base = getAudience(genre, theme).gains;
  const direction = getDirectionAudienceGains(points);
  return (Object.keys(segmentLabels) as (keyof FanSegments)[])
    .map((key) => ({ key, value: (base[key] ?? 0) + direction[key] }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => `${segmentLabels[item.key]} +${item.value}`);
}

export function predictGamePlan(input: GamePlanInput): GamePlanPrediction {
  const project = createGameProject(input);
  const direction = getDirectionConfig(input.direction);
  const energyModifier = getEnergyModifier(input.state.staff);
  let minTicks = 0;
  let maxTicks = 0;
  let minQuality = project.fun + project.creativity + project.graphics + project.sound;
  let maxQuality = minQuality;

  for (const stage of ["planning", "coding", "graphics", "sound"] as const) {
    const stagePower = getStageTeamPower(input.state.staff, stage);
    const skillKey = STAGE_INFO[stage].skill;
    const leadSkill = Math.max(0, ...input.state.staff.map((member) => member[skillKey]));
    const target = getStageTarget(stage, input.direction);
    const lowProgress = Math.max(.01, getDevelopmentGain(stagePower, leadSkill, direction.speed, energyModifier, 0));
    const highProgress = Math.max(.01, getDevelopmentGain(stagePower, leadSkill, direction.speed, energyModifier, 1));
    const stageMinTicks = Math.ceil(target / highProgress);
    const stageMaxTicks = Math.ceil(target / lowProgress);
    const lowQuality = getQualityGain(stagePower, leadSkill, direction.quality, 0);
    const highQuality = getQualityGain(stagePower, leadSkill, direction.quality, 1);
    const qualityWeight = stage === "planning" ? 1.65 : stage === "coding" ? .35 : stage === "graphics" ? 1.17 : 1.1;
    minTicks += stageMinTicks;
    maxTicks += stageMaxTicks;
    minQuality += lowQuality * stageMinTicks * qualityWeight;
    maxQuality += highQuality * stageMaxTicks * qualityWeight;
  }

  const qualityRange = {
    min: Math.round(minQuality / 4),
    max: Math.round(maxQuality / 4),
  };
  const durationWeeks = {
    min: Math.max(1, Math.ceil(minTicks / 4) + 1),
    max: Math.max(2, Math.ceil(maxTicks / 4) + 3),
  };
  const cost = project.developmentCost ?? 0;
  const cashRatio = cost / Math.max(1, input.state.cash);
  const fatigue = getReleaseFatigueMultiplier(input.state.releases, input.genre, input.theme);
  const popularity = project.contentPopularity ?? 1;
  const isGreatCombo = GREAT_COMBOS.has(`${input.genre}|${input.theme}`);
  const averageEnergy = input.state.staff.length
    ? input.state.staff.reduce((sum, member) => sum + member.energy, 0) / input.state.staff.length
    : 0;
  const yearsRemaining = input.platform.retire >= 99
    ? null
    : Math.max(0, input.platform.retire - input.state.year + 1);
  const combinationLevel = fatigue < .8
    ? "内容疲劳"
    : isGreatCombo
      ? "杰作相性"
      : popularity >= 1.05
        ? "良好"
        : popularity >= .95
          ? "普通"
          : "小众";

  const advantageCandidates: PredictionFactor[] = [
    isGreatCombo
      ? { tone: "positive", text: "类型与题材形成杰作相性" }
      : popularity >= 1
        ? { tone: "positive", text: "题材市场接受度较好" }
        : { tone: "neutral", text: "小众组合有明确核心受众" },
    averageEnergy >= 70
      ? { tone: "positive", text: `团队平均体力 ${Math.round(averageEnergy)}%，制作状态充足` }
      : { tone: "neutral", text: `团队平均体力 ${Math.round(averageEnergy)}%，需安排休息` },
    input.platform.users >= 700_000
      ? { tone: "positive", text: `${input.platform.name}拥有${marketLabel(input.platform.users)}市场` }
      : { tone: "neutral", text: `${input.platform.name}授权成本较低` },
    input.sequel
      ? { tone: "positive", text: `续作继承《${input.sequel.name}》的开发积累` }
      : { tone: "neutral", text: `${input.direction}方针决定速度与品质取舍` },
  ];
  const advantages = advantageCandidates.slice(0, 2);

  const risks: PredictionFactor[] = [];
  if (input.state.cash < cost) risks.push({ tone: "negative", text: `资金缺口 ${cost - input.state.cash}千，当前无法开工` });
  else if (cashRatio >= .65) risks.push({ tone: "negative", text: `开发费占现金 ${Math.round(cashRatio * 100)}%，现金压力高` });
  if (yearsRemaining !== null && yearsRemaining <= 1) risks.push({ tone: "negative", text: `${input.platform.name}将在本年退市` });
  if (fatigue < 1) risks.push({ tone: "negative", text: `近期重复内容使市场需求降至 ${Math.round(fatigue * 100)}%` });
  if (averageEnergy < 45) risks.push({ tone: "negative", text: "团队体力偏低，开发中可能休息" });
  if (risks.length < 2) risks.push({ tone: "neutral", text: "开发事件可能改变常规周期与品质" });
  if (risks.length < 2) risks.push({ tone: "neutral", text: "最终除错周期取决于制作中产生的漏洞" });

  const riskPoints = risks.filter((factor) => factor.tone === "negative").length;
  return {
    project,
    cost,
    cashRatio,
    durationWeeks,
    qualityRange,
    qualityLevel: qualityLabel((qualityRange.min + qualityRange.max) / 2),
    cashPressure: input.state.cash < cost ? "无法开工" : cashRatio >= .65 ? "高" : cashRatio >= .35 ? "中" : "低",
    riskLevel: riskPoints >= 2 ? "高" : riskPoints === 1 ? "中" : "低",
    combinationLevel,
    audience: getAudience(input.genre, input.theme).label,
    audienceChanges: getAudienceChanges(input.genre, input.theme, input.directionPoints),
    marketLevel: marketLabel(input.platform.users),
    marketUsers: input.platform.users,
    platformYearsRemaining: yearsRemaining,
    advantages,
    risks: risks.slice(0, 2),
  };
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
  const candidates = state.staff.map((candidate) => {
    const candidateRaw = candidate[skillKey];
    const repeat = state.lastStageLeads[stage] === candidate.id;
    return candidateRaw * getLeadRepeatMultiplier(repeat);
  });
  const best = Math.max(values.effectiveSkill, ...candidates);
  const gapToBest = Math.max(0, Math.round((best - values.effectiveSkill) * 10) / 10);
  const ratio = best > 0 ? values.effectiveSkill / best : 0;
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
    contributionLevel: ratio >= .95 ? "最佳" : ratio >= .75 ? "合适" : "偏弱",
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

export function predictContract(state: GameState, contract: (typeof CONTRACTS)[number]) {
  const direction = DIRECTIONS[0];
  const energyModifier = getEnergyModifier(state.staff);
  const totalPower = state.staff.reduce((sum, member) => member.resting
    ? sum
    : sum + member.code + member.scenario + member.art + member.sound, 0);
  const lowProgress = Math.max(.01, getGeneralProjectGain(totalPower, direction.speed, energyModifier, 0));
  const highProgress = Math.max(.01, getGeneralProjectGain(totalPower, direction.speed, energyModifier, 1));
  const quality = getGeneralQualityGain(totalPower, direction.quality);
  const qualityWeights = { fun: [.8, 1.8], creativity: [.7, 1.7], graphics: [.65, 1.65], sound: [.55, 1.55] } as const;
  let minTicks = Math.ceil(contract.target / highProgress);
  let maxTicks = Math.ceil(contract.target / lowProgress);
  for (const [key, target] of Object.entries(contract.requirements) as [keyof typeof qualityWeights, number][]) {
    minTicks = Math.max(minTicks, Math.ceil(target / Math.max(.01, quality * qualityWeights[key][1])));
    maxTicks = Math.max(maxTicks, Math.ceil(target / Math.max(.01, quality * qualityWeights[key][0])));
  }
  const durationWeeks = { min: Math.ceil(minTicks / 4), max: Math.ceil(maxTicks / 4) };
  const risk = durationWeeks.min > contract.deadline ? "很高" : durationWeeks.max > contract.deadline ? "中" : "低";
  return {
    durationWeeks,
    risk,
    teamPower: Math.round(totalPower),
    qualityPerTick: Math.round(quality * 10) / 10,
  };
}

export function predictTraining(
  member: Staff,
  method: (typeof TRAINING_METHODS)[number],
  unlockedThemes: string[],
) {
  const used = member.training?.[method.id] ?? 0;
  const multiplier = getRepeatedUseMultiplier(used, .18, .2);
  const gains = Object.entries(method.gains).map(([key, value]) => ({
    key: key as keyof Pick<Staff, "code" | "scenario" | "art" | "sound">,
    min: Math.max(0, Math.round((value ?? 0) * multiplier)),
    max: Math.max(0, Math.round((value ?? 0) * multiplier * 3)),
  }));
  const canUnlock = member.role === method.unlock.role && member.level >= method.unlock.level;
  return {
    used,
    multiplier,
    gains,
    canUnlock,
    willDiscover: canUnlock && !unlockedThemes.includes(method.unlock.name),
    discovery: `${method.unlock.role} Lv.${method.unlock.level} 可发现“${method.unlock.name}”`,
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

export function predictConsole(state: GameState, performance: number, cost: number) {
  const totalPower = state.staff.reduce((sum, member) => sum + member.code + member.scenario + member.art + member.sound, 0);
  const expectedUsers = getConsoleInitialUsers(state.fans, totalPower, performance);
  const energyModifier = getEnergyModifier(state.staff);
  const direction = getDirectionConfig("重视品质");
  const target = Math.round(560 * performance);
  const lowGain = Math.max(.01, getGeneralProjectGain(totalPower, direction.speed, energyModifier, 0));
  const highGain = Math.max(.01, getGeneralProjectGain(totalPower, direction.speed, energyModifier, 1));
  return {
    durationWeeks: { min: Math.ceil(target / highGain / 4), max: Math.ceil(target / lowGain / 4) },
    userRange: { min: Math.round(expectedUsers * .9), max: Math.round(expectedUsers * 1.1) },
    cashRatio: cost / Math.max(1, state.cash),
  };
}

export type ConsolePrediction = ReturnType<typeof predictConsole>;

export function predictEarlyRelease(state: GameState, project: Project) {
  const isGreatCombo = GREAT_COMBOS.has(`${project.genre}|${project.theme}`);
  const scoreAt = (randomValue: number) => getReviewScores({
    qualities: project,
    isGreatCombo,
    reputation: state.reputation,
    bugs: project.bugs,
    randomValues: [randomValue, randomValue, randomValue, randomValue],
  }).reduce((sum, score) => sum + score, 0);
  const scoreRange = { min: scoreAt(0), max: scoreAt(1) };
  const popularity = (project.contentPopularity ?? getContentPopularity(project.genre, project.theme, isGreatCombo)) *
    getReleaseFatigueMultiplier(state.releases, project.genre, project.theme);
  const salesAt = (score: number, randomValue: number) => getFirstWeekSales({
    score,
    hype: project.hype,
    fans: state.fans,
    marketUsers: project.marketUsers ?? 280_000,
    contentPopularity: popularity,
    randomValue,
  });
  return {
    bugPenalty: Math.min(4, project.bugs * .18),
    scoreRange,
    salesRange: { min: salesAt(scoreRange.min, 0), max: salesAt(scoreRange.max, 1) },
    reputationRisk: scoreRange.max < 22 ? "口碑大概率下降" : scoreRange.min < 22 ? "口碑存在下降风险" : "口碑风险较低",
  };
}

export type EarlyReleasePrediction = ReturnType<typeof predictEarlyRelease>;
