import {
  DEBUG_RESEARCH_PER_BUG,
  HALL_OF_FAME_SCORE,
  getAnnualPayroll,
  getCareerOptionsFor,
  getConsoleInitialUsers,
  getContentPopularity,
  getDebugGain,
  getDevelopmentGain,
  getEnergyModifier,
  getFirstWeekSales,
  getGeneralProjectGain,
  getGeneralQualityGain,
  getQualityGain,
  getReleaseFatigueMultiplier,
  getReviewScores,
  getSalesIncome,
  getStageTeamPower,
} from "../game-balance.ts";
import { combinationKey, COMBINATION_RULES } from "./combinations.ts";
import { expandOffice, levelUpStaff, type ProgressionAction } from "./progression.ts";
import {
  DEFAULT_DIRECTION_POINTS,
  GREAT_COMBOS,
  HIRING_CANDIDATES,
  HIRING_METHODS,
  PLATFORMS,
  STAGE_INFO,
  STAGE_ORDER,
  TRAINING_METHODS,
} from "./data.ts";
import {
  advanceCalendar,
  canWaitForStageLead,
  clamp,
  formatCash,
  formatUsers,
  getAudience,
  getDirectionAudienceGains,
  getDirectionConfig,
  getKnowledgeLevel,
  getOfficeCapacity,
  getSalesRank,
  getStageTarget,
  isAvailableStageLead,
} from "./rules.ts";
import {
  CONTINUOUS_LEAD_MULTIPLIER,
  STAFF_CHALLENGE_INVESTMENTS,
  STAFF_CHALLENGE_METRICS,
  getStaffChallengeSuccessRate,
  getStaffChallengeTarget,
  predictItemUse,
  predictMarketing,
  predictTraining,
  rollStageLeadOpening,
} from "./operations.ts";
import type {
  EventData,
  FanSegments,
  GameState,
  Inventory,
  Project,
  RandomSource,
  ResultData,
  ReviewData,
  StageCreationData,
  StaffChallengeInvestment,
  StaffChallengeOffer,
} from "./types";

export type EngineEffect =
  | { type: "event"; event: EventData }
  | { type: "review"; review: ReviewData }
  | { type: "toast"; message: string }
  | { type: "result"; result: ResultData }
  | { type: "pause-for-stage"; stage: Exclude<NonNullable<Project["stage"]>, "debug"> }
  | { type: "stage-creation"; creation: StageCreationData }
  | { type: "staff-challenge"; offer: StaffChallengeOffer };

export type EngineResult = {
  state: GameState;
  effects: EngineEffect[];
};

export type GameAction =
  | ProgressionAction
  | { type: "tick"; isNewWeek: boolean; allowStaffChallenge?: boolean }
  | { type: "scheduled-event" }
  | { type: "wait-for-stage-lead" }
  | { type: "start-project"; project: Project; cost?: number }
  | {
      type: "choose-lead";
      leadStaffId?: number;
      leadName: string;
      leadSkill: number;
      cost?: number;
    }
  | {
      type: "apply-marketing";
      name: string;
      cost: number;
      hype: number;
      segment: keyof FanSegments;
    }
  | {
      type: "train-staff";
      staffId: number;
      method: (typeof TRAINING_METHODS)[number];
    }
  | {
      type: "hire-staff";
      method: (typeof HIRING_METHODS)[number];
    }
  | { type: "use-item"; key: keyof Inventory }
  | { type: "change-career"; staffId: number; role: string }
  | {
      type: "resolve-staff-challenge";
      offerId: string;
      investment: StaffChallengeInvestment | "skip";
    }
  | {
      type: "attend-expo";
      cost: number;
      gainedFans: number;
      gainedHype: number;
      label: string;
    }
  | { type: "complete-project"; project?: Project };

const noEffects = (state: GameState): EngineResult => ({ state, effects: [] });

function completeProject(
  state: GameState,
  finished: Project,
  random: RandomSource,
): EngineResult {
  if (finished.kind === "contract") {
    const reward = finished.reward ?? 600;
    const reputationGain = clamp(state.reputation + 1, 0, 100) - state.reputation;
    return {
      state: {
        ...state,
        cash: state.cash + reward,
        research: state.research + 4,
        reputation: state.reputation + reputationGain,
        project: null,
        industryNews: `像素工坊按期完成“${finished.name}”，业界评价稳步提升。`,
      },
      effects: [{
        type: "event",
        event: {
          kind: "contract",
          title: "委托交付",
          headline: "客户非常满意！",
          body: `“${finished.name}”在约定期限内完成，所有品质指标均已通过验收。`,
          reward: `报酬 ${formatCash(reward)} · 研究 +4 · 业界口碑 +${reputationGain}`,
          results: [
            { category: "resource", label: "资金", value: `+${formatCash(reward)}`, tone: "positive" },
            { category: "resource", label: "研究", value: "+4", tone: "positive" },
            { category: "risk", label: "业界口碑", value: `+${reputationGain}`, tone: reputationGain > 0 ? "positive" : "neutral", detail: reputationGain > 0 ? undefined : "已达上限" },
          ],
        },
      }],
    };
  }

  if (finished.kind === "console") {
    const hardwarePower = finished.consoleSpec?.performance ?? 1;
    const totalPower = state.staff.reduce(
      (sum, member) =>
        sum + member.code + member.scenario + member.art + member.sound,
      0,
    );
    const initialUsers = getConsoleInitialUsers(
      state.fans,
      totalPower,
      hardwarePower,
    );
    return {
      state: {
        ...state,
        ownConsole: true,
        consoleUsers: initialUsers,
        fans: state.fans + 600,
        research: state.research + 35,
        project: null,
      },
      effects: [{
        type: "event",
        event: {
          kind: "console",
          title: "自研主机发布会",
          headline: "像素盒子 正式发售！",
          body: `${finished.consoleSpec?.cpu ?? "定制芯片"}、${finished.consoleSpec?.media ?? "专用媒体"}与${finished.consoleSpec?.body ?? "家用机身"}顺利量产。今后开发新作时，可以选择自家平台并免除高额授权费。`,
          reward: `首批用户 ${formatUsers(initialUsers)} 人 · 粉丝 +600`,
          results: [
            { category: "resource", label: "平台用户", value: `+${formatUsers(initialUsers)}`, tone: "positive" },
            { category: "resource", label: "粉丝", value: "+600", tone: "positive" },
            { category: "resource", label: "研究", value: "+35", tone: "positive" },
          ],
        },
      }],
    };
  }

  const combination = finished.combination ?? (GREAT_COMBOS.has(`${finished.genre}|${finished.theme}`) ? "great" : "normal");
  const isGreatCombo = combination === "great";
  const scores = getReviewScores({
    qualities: finished,
    isGreatCombo,
    reputation: state.reputation,
    bugs: finished.bugs,
    randomValues: [random(), random(), random(), random()],
  });
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const sales = getFirstWeekSales({
    score: totalScore,
    hype: finished.hype,
    fans: state.fans,
    marketUsers: finished.marketUsers ?? 280_000,
    contentPopularity:
      (finished.contentPopularity ??
        getContentPopularity(finished.genre, finished.theme, isGreatCombo)) *
      getReleaseFatigueMultiplier(
        state.releases,
        finished.genre,
        finished.theme,
      ),
    randomValue: random(),
  });
  const income = getSalesIncome(sales);
  const salesRank = getSalesRank(sales, state.year);
  const audience = getAudience(finished.genre, finished.theme);
  const oldGenreLevel = getKnowledgeLevel(
    state.genreExperience[finished.genre] ?? 0,
  );
  const oldThemeLevel = getKnowledgeLevel(
    state.themeExperience[finished.theme] ?? 0,
  );
  const nextGenreExperience =
    (state.genreExperience[finished.genre] ?? 0) + 1;
  const nextThemeExperience =
    (state.themeExperience[finished.theme] ?? 0) + 1;
  const nextGenreLevel = getKnowledgeLevel(nextGenreExperience);
  const nextThemeLevel = getKnowledgeLevel(nextThemeExperience);
  const reputationIntent =
    totalScore >= 34 ? 8 : totalScore >= 28 ? 4 : totalScore >= 22 ? 1 : -4;
  const reputationChange =
    clamp(state.reputation + reputationIntent, 0, 100) - state.reputation;
  const fanGrowth = Math.max(4, Math.round(sales / 220));
  const audienceScale = clamp(totalScore / 28, .6, 1.6);
  const directionPoints = finished.directionPoints ?? DEFAULT_DIRECTION_POINTS;
  const fanSegments = { ...state.fanSegments };
  for (const [key, value] of Object.entries(audience.gains) as [
    keyof FanSegments,
    number,
  ][]) {
    fanSegments[key] += Math.max(1, Math.round(value * audienceScale));
  }
  const directionAudienceGains = getDirectionAudienceGains(
    directionPoints,
    audienceScale,
  );
  for (const key of Object.keys(directionAudienceGains) as (keyof FanSegments)[]) {
    fanSegments[key] += directionAudienceGains[key];
  }
  const prior = state.releases.map((item) =>
    finished.sequelOfId && item.id === finished.sequelOfId
      ? { ...item, sequelEligible: false }
      : item,
  );
  const releases = [
    {
      id: `release-${state.nextReleaseNumber}`,
      name: finished.name,
      score: totalScore,
      sales,
      income,
      weeks: 0,
      releasedYear: state.year,
      platform: finished.platform,
      weeklySales: sales,
      remainingDemand: Math.round(sales * (1.8 + totalScore / 13)),
      trend: clamp(.68 + totalScore / 100 + finished.hype / 180, .72, 1.12),
      audience: audience.label,
      genre: finished.genre,
      theme: finished.theme,
      sequelEligible: totalScore >= HALL_OF_FAME_SCORE,
      weeklyRank: salesRank,
      fanLetterSent: false,
      developmentCost: finished.developmentCost,
      sequelOfId: finished.sequelOfId,
      finalQuality: { fun: finished.fun, creativity: finished.creativity, graphics: finished.graphics, sound: finished.sound, bugs: finished.bugs },
      combo: combination,
    },
    ...prior,
  ];
  const growth = `${finished.genre} Lv.${nextGenreLevel} · ${finished.theme} Lv.${nextThemeLevel}${
    nextGenreLevel > oldGenreLevel || nextThemeLevel > oldThemeLevel
      ? "  熟练度提升！"
      : ""
  }`;

  return {
    state: {
      ...state,
      cash: state.cash + income,
      fans: state.fans + fanGrowth,
      fanSegments,
      reputation: state.reputation + reputationChange,
      research:
        state.research + getDirectionConfig(finished.direction).research,
      releases,
      nextReleaseNumber: state.nextReleaseNumber + 1,
      combinationDiscoveries: {
        ...state.combinationDiscoveries,
        [combinationKey(finished.genre, finished.theme)]: finished.combination ?? state.combinationDiscoveries[combinationKey(finished.genre, finished.theme)] ?? "tried",
      },
      consoleUsers:
        finished.platform === "像素盒子"
          ? state.consoleUsers + Math.round(sales * .18)
          : state.consoleUsers,
      genreExperience: {
        ...state.genreExperience,
        [finished.genre]: nextGenreExperience,
      },
      themeExperience: {
        ...state.themeExperience,
        [finished.theme]: nextThemeExperience,
      },
      project: null,
      industryNews: `《${finished.name}》首周销量 ${sales.toLocaleString()} 套，登上周榜第 ${salesRank} 名！`,
    },
    effects: [{
      type: "review",
      review: {
        name: finished.name,
        scores,
        sales,
        income,
        audience: audience.label,
        reputationChange,
        growth,
        salesRank,
        results: [
          { category: "resource", label: "资金", value: `+${formatCash(income)}`, tone: "positive" },
          { category: "resource", label: "粉丝", value: `+${fanGrowth}`, tone: "positive" },
          { category: "risk", label: "业界口碑", value: `${reputationChange >= 0 ? "+" : ""}${reputationChange}`, tone: reputationChange > 0 ? "positive" : reputationChange < 0 ? "negative" : "neutral", detail: reputationChange === 0 ? "已达数值边界" : undefined },
          { category: "quality", label: "总评分", value: `${totalScore}/40`, tone: totalScore >= 22 ? "positive" : "negative" },
          { category: "quality", label: "组合相性", value: finished.combination ? COMBINATION_RULES[combination].label : "旧版制作 · 待重新验证", tone: "neutral", detail: `${finished.genre} × ${finished.theme}` },
        ],
      },
    }],
  };
}

function advanceWeeklySales(state: GameState): EngineResult {
  let weeklyIncome = 0;
  let weeklyFans = 0;
  let ownPlatformSales = 0;
  let fanLetterTitle = "";
  const releases = state.releases.map((item) => {
    const currentWeekly = item.weeklySales ?? 0;
    const remaining = item.remainingDemand ?? 0;
    const nextWeekly = Math.min(
      remaining,
      Math.max(0, Math.round(currentWeekly * (item.trend ?? .78) * .82)),
    );
    const income = getSalesIncome(nextWeekly);
    weeklyIncome += income;
    weeklyFans += Math.round(nextWeekly / 6500);
    if (item.platform === "像素盒子") ownPlatformSales += nextWeekly;
    const shouldSendFanLetter =
      !state.project &&
      !fanLetterTitle &&
      !item.fanLetterSent &&
      item.score >= 28 &&
      item.weeks >= 2 &&
      nextWeekly > 0;
    if (shouldSendFanLetter) fanLetterTitle = item.name;
    return {
      ...item,
      sales: item.sales + nextWeekly,
      income: item.income + income,
      weeks: item.weeks + 1,
      weeklySales: nextWeekly,
      remainingDemand: Math.max(0, remaining - nextWeekly),
      weeklyRank:
        nextWeekly > 0 ? getSalesRank(nextWeekly, state.year) : item.weeklyRank,
      fanLetterSent: item.fanLetterSent || shouldSendFanLetter,
    };
  });
  let fans = state.fans + weeklyFans;
  if ((releases[0]?.weeks ?? 0) > 16 && (releases[0]?.weeks ?? 0) % 4 === 0) {
    fans = Math.max(0, Math.round(fans * .98));
  }
  const effects: EngineEffect[] = [];
  let fanSegments = state.fanSegments;
  let industryNews = state.industryNews;
  if (fanLetterTitle) {
    fans += 90;
    fanSegments = {
      ...fanSegments,
      teens: fanSegments.teens + 3,
      female: fanSegments.female + 2,
    };
    industryNews = `玩家来信称赞《${fanLetterTitle}》，工作室人气持续上升。`;
    effects.push({
      type: "event",
      event: {
        kind: "fanmail",
        title: "玩家来信",
        headline: `“《${fanLetterTitle}》太好玩了！”`,
        body: "一封热情的玩家来信送到了办公室。团队士气大振，年轻玩家与女性玩家群体的支持也有所提升。",
        reward: "粉丝 +90 · 青少年支持度 +3 · 女性支持度 +2",
      },
    });
  }
  return {
    state: {
      ...state,
      ...advanceCalendar(state),
      releases,
      cash: state.cash + weeklyIncome,
      fans,
      consoleUsers:
        state.consoleUsers + Math.round(ownPlatformSales * .025),
      fanSegments,
      industryNews,
    },
    effects,
  };
}

function advanceStaffEnergy(state: GameState): GameState {
  return {
    ...state,
    staff: state.staff.map((member) => {
      if (!state.project || state.project.waitingForLeadRecovery || member.resting) {
        const energy = clamp(
          member.energy + (state.project ? 11 : 14),
          0,
          100,
        );
        return {
          ...member,
          energy,
          resting: state.project ? energy < 95 : false,
        };
      }
      const energy = clamp(
        member.energy - 100 / (Math.max(8, member.maxPower) * 3.2),
        0,
        100,
      );
      return { ...member, energy, resting: energy <= 10 };
    }),
  };
}

function createStaffChallengeOffer(
  state: GameState,
  project: Project,
  random: RandomSource,
): StaffChallengeOffer | null {
  const eligible = state.staff.filter((member) => {
    const [, target] = getStaffChallengeTarget(member);
    return !member.resting && member.energy >= 30 && member[target.skill] >= 8;
  });
  if (!eligible.length) return null;

  const member = eligible[Math.min(eligible.length - 1, Math.floor(random() * eligible.length))];
  const [metric, target] = getStaffChallengeTarget(member);
  const skill = member[target.skill];
  const baseSuccessRate = clamp(.28 + skill * .01 + member.energy * .0015, .38, .7);
  const minGain = Math.max(4, Math.round(skill * .35));
  const challengeNumber = (project.challengeCount ?? 0) + 1;
  return {
    id: `${project.name}-${state.year}-${state.month}-${state.week}-${challengeNumber}-${member.id}`,
    staffId: member.id,
    metric,
    visualStage: target.visualStage,
    skill,
    baseSuccessRate,
    gainRange: { min: minGain, max: minGain + Math.max(3, Math.round(skill * .18)) },
    successHype: 8,
    failureHypeLoss: 5,
    failureBugs: 5,
  };
}

function resolveStaffChallenge(
  state: GameState,
  offerId: string,
  investment: StaffChallengeInvestment | "skip",
  random: RandomSource,
): EngineResult {
  const current = state.project;
  const offer = current?.kind === "game" ? current.pendingChallenge : undefined;
  if (!current || current.kind !== "game" || !offer || offer.id !== offerId) {
    return noEffects(state);
  }

  const clearedProject = { ...current, pendingChallenge: undefined };
  const member = state.staff.find((item) => item.id === offer.staffId);
  if (investment === "skip") {
    return {
      state: { ...state, project: clearedProject },
      effects: [{
        type: "toast",
        message: `${member?.name ?? "员工"}收起了挑战方案，团队继续按原计划开发`,
      }],
    };
  }

  const option = STAFF_CHALLENGE_INVESTMENTS.find((item) => item.id === investment);
  if (!option) return noEffects(state);
  if (state.cash < option.cashCost || state.research < option.researchCost) {
    return {
      state,
      effects: [{ type: "toast", message: "资金或研究点不足，无法支持这次挑战" }],
    };
  }
  if (!member || member.resting || member.energy < 30) {
    return {
      state,
      effects: [{ type: "toast", message: "发起挑战的员工当前无法继续创作" }],
    };
  }

  const metricInfo = STAFF_CHALLENGE_METRICS[offer.metric];
  const successRate = getStaffChallengeSuccessRate(offer, investment);
  const success = random() < successRate;
  const qualityGain = success
    ? Math.round(offer.gainRange.min + (offer.gainRange.max - offer.gainRange.min) * random())
    : 0;
  const nextHype = success
    ? current.hype + offer.successHype
    : Math.max(0, current.hype - offer.failureHypeLoss);
  const hypeChange = Number((nextHype - current.hype).toFixed(1));
  const nextProject: Project = success
    ? {
        ...clearedProject,
        [offer.metric]: current[offer.metric] + qualityGain,
        hype: nextHype,
      }
    : {
        ...clearedProject,
        hype: nextHype,
        bugs: current.bugs + offer.failureBugs,
      };
  const entries = [
    { category: "resource" as const, label: "挑战预算", value: `-${formatCash(option.cashCost)}`, tone: "negative" as const },
    { category: "resource" as const, label: "研究投入", value: `-${option.researchCost}`, tone: "negative" as const },
    success
      ? { category: "quality" as const, label: metricInfo.label, value: `+${qualityGain}`, tone: "positive" as const }
      : { category: "risk" as const, label: "漏洞", value: `+${offer.failureBugs}`, tone: "negative" as const },
    {
      category: success ? "quality" as const : "risk" as const,
      label: "热度",
      value: `${hypeChange >= 0 ? "+" : ""}${hypeChange}`,
      tone: hypeChange > 0 ? "positive" as const : hypeChange < 0 ? "negative" as const : "neutral" as const,
      detail: hypeChange === 0 ? "当前热度已为 0" : undefined,
    },
  ];

  return {
    state: {
      ...state,
      cash: state.cash - option.cashCost,
      research: state.research - option.researchCost,
      project: nextProject,
      industryNews: success
        ? `${member.name}的${metricInfo.label}挑战成功，作品关注度上升。`
        : `${member.name}的${metricInfo.label}挑战失手，团队开始修补新增漏洞。`,
    },
    effects: [{
      type: "stage-creation",
      creation: {
        kind: "challenge",
        stage: offer.visualStage,
        leadStaffId: member.id,
        leadName: member.name,
        external: false,
        repeated: false,
        roleFit: `${option.name} · 成功率 ${Math.round(successRate * 100)}%`,
        skillLabel: metricInfo.label,
        effectiveSkill: offer.skill,
        result: {
          title: success ? `${metricInfo.label}挑战成功！` : `${metricInfo.label}挑战失败……`,
          summary: success
            ? `${member.name}的主动尝试奏效，真实品质和热度变化已计入《${current.name}》。`
            : `${member.name}的尝试没有达到预期，投入与风险变化已计入《${current.name}》。`,
          entries,
        },
      },
    }],
  };
}

function advanceProject(
  state: GameState,
  staffBeforeTick: GameState["staff"],
  isNewWeek: boolean,
  allowStaffChallenge: boolean,
  random: RandomSource,
): EngineResult {
  const current = state.project;
  if (!current) return noEffects(state);
  const directionConfig = getDirectionConfig(current.direction);
  const energyModifier = getEnergyModifier(staffBeforeTick);
  const activeTotalPower = staffBeforeTick.reduce(
    (sum, member) =>
      member.resting
        ? sum
        : sum + member.code + member.scenario + member.art + member.sound,
    0,
  );

  if (current.kind === "game") {
    const stage = current.stage ?? "coding";
    if (stage === "debug") {
      const stagePower = getStageTeamPower(staffBeforeTick, "debug");
      const debugGain = getDebugGain(stagePower, energyModifier, random());
      const bugs = Math.max(0, current.bugs - debugGain);
      const researchProgress =
        (current.debugResearch ?? 0) + (current.bugs - bugs) * DEBUG_RESEARCH_PER_BUG;
      const gainedResearch = Math.floor(researchProgress);
      const project = {
        ...current,
        bugs,
        debugResearch: researchProgress - gainedResearch,
        stageProgress: Math.min(
          current.stageTarget ?? 1,
          (current.stageProgress ?? 0) + debugGain,
        ),
        elapsedWeeks: (current.elapsedWeeks ?? 0) + (isNewWeek ? 1 : 0),
      };
      const nextState = {
        ...state,
        research: state.research + gainedResearch,
        project,
      };
      return bugs <= .05
        ? completeProject(nextState, { ...project, bugs: 0 }, random)
        : noEffects(nextState);
    }

    if (!current.leadName || !current.leadSkill) return noEffects(state);
    const leadIsResting = current.leadStaffId
      ? staffBeforeTick.find((member) => member.id === current.leadStaffId)?.resting
      : false;
    const leadSkill = leadIsResting ? 0 : current.leadSkill;
    const stagePower = getStageTeamPower(staffBeforeTick, stage);
    const gain = getDevelopmentGain(
      stagePower,
      leadSkill * CONTINUOUS_LEAD_MULTIPLIER,
      directionConfig.speed,
      energyModifier,
      random(),
    );
    const qualityGain = getQualityGain(
      stagePower,
      leadSkill * CONTINUOUS_LEAD_MULTIPLIER,
      directionConfig.quality,
      random(),
    );
    const polishProtection =
      1 - Math.min(.28, (current.directionPoints?.polish ?? 0) * .035);
    let project: Project = {
      ...current,
      progress: current.progress + gain,
      stageProgress: (current.stageProgress ?? 0) + gain,
      elapsedWeeks: (current.elapsedWeeks ?? 0) + (isNewWeek ? 1 : 0),
      fun:
        current.fun +
        (stage === "planning" ? qualityGain * .65 : stage === "coding" ? qualityGain * .35 : 0),
      creativity:
        current.creativity +
        (stage === "planning" ? qualityGain : stage === "graphics" ? qualityGain * .12 : 0),
      graphics:
        current.graphics + (stage === "graphics" ? qualityGain * 1.05 : 0),
      sound: current.sound + (stage === "sound" ? qualityGain * 1.1 : 0),
      bugs:
        current.bugs +
        (stage === "coding"
          ? (current.direction === "赶工" ? random() * 1.05 : random() * .65) *
            polishProtection
          : random() * .12 * polishProtection),
    };
    const effects: EngineEffect[] = [];
    let fans = state.fans;
    let industryNews = state.industryNews;
    let challengeTriggered = false;
    if (
      allowStaffChallenge &&
      isNewWeek &&
      (project.challengeCount ?? 0) < 2 &&
      (project.elapsedWeeks ?? 0) >= 2 + (project.challengeCount ?? 0) * 3 &&
      (project.stageProgress ?? 0) < (project.stageTarget ?? 1) * .82 &&
      random() < .3
    ) {
      const offer = createStaffChallengeOffer(state, project, random);
      if (offer) {
        project = {
          ...project,
          challengeCount: (project.challengeCount ?? 0) + 1,
          pendingChallenge: offer,
        };
        effects.push({ type: "staff-challenge", offer });
        challengeTriggered = true;
      }
    }
    if (
      !challengeTriggered &&
      isNewWeek &&
      (project.eventCount ?? 0) < 2 &&
      (project.elapsedWeeks ?? 0) >= 2 &&
      (project.stageProgress ?? 0) < (project.stageTarget ?? 1) * .86 &&
      random() < .16
    ) {
      const eventIndex = Math.floor(random() * 4);
      const events = [
        {
          headline: "游戏杂志前来采访！",
          body: "开发画面登上杂志专题，作品热度迅速上升。",
          reward: "热度 +14 · 粉丝 +45",
          apply: (value: Project) => ({ ...value, hype: value.hype + 14 }),
          fans: 45,
        },
        {
          headline: "团队灵感爆发！",
          body: "一次热烈讨论带来了突破性的玩法点子。",
          reward: "趣味 +13 · 创意 +13",
          apply: (value: Project) => ({
            ...value,
            fun: value.fun + 13,
            creativity: value.creativity + 13,
          }),
          fans: 0,
        },
        {
          headline: "办公室突然停电！",
          body: "部分开发进度没有及时保存，团队只能重新制作。",
          reward: "阶段进度大幅下降 · 漏洞 +5",
          apply: (value: Project) => ({
            ...value,
            stageProgress: Math.max(0, (value.stageProgress ?? 0) - 25),
            progress: Math.max(0, value.progress - 25),
            bugs: value.bugs + 5,
          }),
          fans: 0,
        },
        {
          headline: "测试机发生故障！",
          body: "硬件故障制造了大量隐藏问题，只能在最终除错阶段逐一解决。",
          reward: "漏洞 +22",
          apply: (value: Project) => ({ ...value, bugs: value.bugs + 22 }),
          fans: 0,
        },
      ];
      const event = events[eventIndex];
      project = {
        ...event.apply(project),
        eventCount: (project.eventCount ?? 0) + 1,
      };
      fans += event.fans;
      industryNews = event.headline;
      effects.push({
        type: "event",
        event: {
          kind: "development",
          title: "开发事件",
          headline: event.headline,
          body: event.body,
          reward: event.reward,
        },
      });
    }
    if ((project.stageProgress ?? 0) >= (project.stageTarget ?? 1)) {
      const stageIndex = STAGE_ORDER.indexOf(stage);
      const nextStage = STAGE_ORDER[stageIndex + 1] ?? "debug";
      if (nextStage === "debug") {
        const debugTarget = Math.max(1, project.bugs);
        project = {
          ...project,
          stage: "debug",
          stageProgress: 0,
          stageTarget: debugTarget,
          debugTarget,
          leadStaffId: undefined,
          leadName: "全体员工",
          leadSkill: getStageTeamPower(staffBeforeTick, "debug"),
        };
        effects.push({ type: "toast", message: "制作完成，进入最终除错！" });
      } else {
        project = {
          ...project,
          stage: nextStage,
          stageProgress: 0,
          stageTarget: getStageTarget(nextStage, project.direction),
          leadStaffId: undefined,
          leadName: undefined,
          leadSkill: undefined,
        };
        effects.push({ type: "pause-for-stage", stage: nextStage });
      }
    }
    return {
      state: { ...state, project, fans, industryNews },
      effects,
    };
  }

  const gain = getGeneralProjectGain(
    activeTotalPower,
    directionConfig.speed,
    energyModifier,
    random(),
  );
  const qualityGain = getGeneralQualityGain(
    activeTotalPower,
    directionConfig.quality,
  );
  const project: Project = {
    ...current,
    progress: current.progress + gain,
    fun: current.fun + qualityGain * (.8 + random()),
    creativity: current.creativity + qualityGain * (.7 + random()),
    graphics: current.graphics + qualityGain * (.65 + random()),
    sound: current.sound + qualityGain * (.55 + random()),
    bugs:
      current.bugs +
      (current.direction === "赶工" ? random() * .8 : random() * .35),
    elapsedWeeks: (current.elapsedWeeks ?? 0) + (isNewWeek ? 1 : 0),
  };
  const qualityMet = Object.entries(project.qualityTargets ?? {}).every(
    ([key, value]) =>
      project[
        key as keyof Pick<Project, "fun" | "creativity" | "graphics" | "sound">
      ] >= (value ?? 0),
  );
  if (project.progress >= project.target && qualityMet) {
    return completeProject(
      { ...state, project: { ...project, progress: project.target } },
      project,
      random,
    );
  }
  if (
    current.kind === "contract" &&
    isNewWeek &&
    (project.elapsedWeeks ?? 0) >= (current.deadlineWeeks ?? 12)
  ) {
    const reputationLoss = clamp(state.reputation - 5, 0, 100) - state.reputation;
    return {
      state: {
        ...state,
        project: null,
        reputation: state.reputation + reputationLoss,
        industryNews: `“${current.name}”未能按期交付，工作室的业界口碑受损。`,
      },
      effects: [{
        type: "event",
        event: {
          kind: "contract",
          title: "委托超时",
          headline: "客户取消了委托……",
          body: `“${current.name}”没有在 ${current.deadlineWeeks ?? 12} 周内达到全部品质指标，团队无法获得任何报酬。`,
          reward: `报酬 ¥0千 · 业界口碑 ${reputationLoss}`,
          results: [
            { category: "resource", label: "委托报酬", value: "¥0千", tone: "neutral", detail: "未达到交付条件" },
            { category: "risk", label: "业界口碑", value: `${reputationLoss}`, tone: reputationLoss < 0 ? "negative" : "neutral" },
          ],
        },
      }],
    };
  }
  return noEffects({ ...state, project });
}

function tick(
  state: GameState,
  isNewWeek: boolean,
  allowStaffChallenge: boolean,
  random: RandomSource,
): EngineResult {
  if (state.project?.pendingChallenge) return noEffects(state);
  const staffBeforeTick = state.staff;
  const weeklyResult = isNewWeek ? advanceWeeklySales(state) : noEffects(state);
  const energyState = advanceStaffEnergy(weeklyResult.state);
  if (energyState.project?.waitingForLeadRecovery) {
    return {
      state: {
        ...energyState,
        project: {
          ...energyState.project,
          elapsedWeeks: (energyState.project.elapsedWeeks ?? 0) + (isNewWeek ? 1 : 0),
          waitingForLeadRecovery: energyState.staff.some(isAvailableStageLead) ? undefined : true,
        },
      },
      effects: weeklyResult.effects,
    };
  }
  const projectResult = advanceProject(
    energyState,
    staffBeforeTick,
    isNewWeek,
    allowStaffChallenge,
    random,
  );
  return {
    state: projectResult.state,
    effects: [...weeklyResult.effects, ...projectResult.effects],
  };
}

export function applyScheduledEvent(
  state: GameState,
  random: RandomSource,
): EngineResult {
  const eventKey = `${state.year}-${state.month}-${state.week}`;
  if (state.lastEventKey === eventKey) return noEffects(state);

  if (state.year >= 20 && !state.endingShown) {
    const bestSeller = [...state.releases].sort((a, b) => b.sales - a.sales)[0];
    const bestProfit = state.releases.filter(item => item.developmentCost !== undefined).sort(
      (a, b) =>
        b.income -
        (b.developmentCost ?? 0) -
        (a.income - (a.developmentCost ?? 0)),
    )[0];
    const score = Math.round(state.cash);
    return {
      state: {
        ...state,
        endingScore: score,
        endingShown: true,
        lastEventKey: eventKey,
      },
      effects: [{
        type: "event",
        event: {
          kind: "ending",
          title: "20 年经营报告",
          headline:
            score >= 20_000
              ? "传奇工作室诞生！"
              : score >= 5_000
                ? "跻身一流开发商！"
                : "故事仍会继续",
          body: `二十年资产 ${formatCash(score)}。最高销量作品《${bestSeller?.name ?? "尚无作品"}》售出 ${(bestSeller?.sales ?? 0).toLocaleString()} 套；${bestProfit ? `作品收益最高《${bestProfit.name}》为 ${Math.round(bestProfit.income - bestProfit.developmentCost!).toLocaleString()} 千` : "作品收益未知（无开发费记录）"}。作品收益仅扣立项开发费，不含薪资、广告及挑战投入。${state.releaseHistoryIncomplete ? "旧记录不完整，仅统计已保留作品。" : ""}结算后仍可继续经营。`,
          reward: `20 年资产记录 ${formatCash(score)}`,
        },
      }],
    };
  }

  if (state.month === 3 && state.week === 1) {
    const payroll = getAnnualPayroll(state.staff);
    return {
      state: {
        ...state,
        cash: Math.max(0, state.cash - payroll),
        lastEventKey: eventKey,
      },
      effects: [{
        type: "event",
        event: {
          kind: "payroll",
          title: "年度结算",
          headline: "大家辛苦了一年！",
          body: "三月是发放年度薪资的月份。能力越强、职级越高，团队的年度薪资也会随之增长。",
          reward: `已支付员工薪资 ${formatCash(payroll)}`,
        },
      }],
    };
  }

  if (state.month === 7 && state.week === 1 && state.companyLevel >= 2) {
    return {
      state: { ...state, lastEventKey: eventKey },
      effects: [{
        type: "event",
        event: {
          kind: "expo",
          title: "像素游戏博览会",
          headline: "年度展会今天开幕！",
          body: "选择展位规模，让更多玩家认识工作室。正在开发的作品也会同时获得热度。",
        },
      }],
    };
  }

  if (state.month === 6 && state.week === 1) {
    const debut = PLATFORMS.find(
      (item) => item.debut === state.year && item.debut > 1,
    );
    if (debut) {
      return {
        state: { ...state, lastEventKey: eventKey },
        effects: [{
          type: "event",
          event: {
            kind: "market",
            title: "游戏行业快讯",
            headline: `新主机“${debut.name}”上市！`,
            body: "新平台正在迅速吸引玩家。授权费用不低，但庞大的用户市场可能带来惊人的销量。",
            reward: `首发用户 ${formatUsers(debut.users)} · 开发授权 ${formatCash(debut.cost)}`,
          },
        }],
      };
    }
  }

  if (state.month === 12 && state.week === 1) {
    const candidates = state.releases.filter(
      (item) => item.releasedYear === state.year,
    );
    const best = [...candidates].sort((a, b) => b.score - a.score)[0];
    const awardsUnlocked = state.releases.some(
      (item) => item.score >= HALL_OF_FAME_SCORE,
    );
    let headline = awardsUnlocked ? "今年没有作品获奖" : "工作室尚未取得参评资格";
    let body = awardsUnlocked
      ? "来年继续磨练团队，冲击游戏行业的最高荣誉吧。"
      : "先让一款作品进入名人堂，全球游戏大奖才会向工作室发出邀请。";
    let reward = "无奖金";
    let prize = 0;
    let newFans = 0;
    let newAwards = 0;
    const gotyChance =
      best && best.score >= 36
        ? Math.min(.82, .18 + (best.score - 36) * .16)
        : 0;
    if (awardsUnlocked && best && best.score >= 36 && random() < gotyChance) {
      headline = `《${best.name}》荣获年度最佳！`;
      body = "全场评审起立鼓掌，工作室的名字响彻整个游戏行业。";
      reward = "奖金 ¥2,000千 · 粉丝 +1,200";
      prize = 2000;
      newFans = 1200;
      newAwards = 1;
    } else if (awardsUnlocked && best && best.score >= HALL_OF_FAME_SCORE) {
      headline = `《${best.name}》荣获优秀设计奖！`;
      body = "独到的创意与完成度得到了评审们的一致肯定。";
      reward = "奖金 ¥500千 · 粉丝 +300";
      prize = 500;
      newFans = 300;
      newAwards = 1;
    } else if (awardsUnlocked && best && best.score >= 28) {
      headline = `《${best.name}》获得评审特别奖`;
      body = "虽然与大奖擦肩而过，但作品已经给玩家留下了深刻印象。";
      reward = "奖金 ¥200千 · 粉丝 +120";
      prize = 200;
      newFans = 120;
    }
    return {
      state: {
        ...state,
        cash: state.cash + prize,
        fans: state.fans + newFans,
        awards: state.awards + newAwards,
        lastEventKey: eventKey,
      },
      effects: [{
        type: "event",
        event: {
          kind: "awards",
          title: "全球游戏大奖",
          headline,
          body,
          reward,
        },
      }],
    };
  }

  return noEffects(state);
}

function applyMarketing(
  state: GameState,
  action: Extract<GameAction, { type: "apply-marketing" }>,
): EngineResult {
  const latestRelease = state.releases[0];
  if ((!state.project || state.project.kind !== "game") && !latestRelease) {
    return {
      state,
      effects: [{ type: "toast", message: "先发售一款游戏再开展宣传" }],
    };
  }
  if (state.cash < action.cost) {
    return { state, effects: [{ type: "toast", message: "资金不足" }] };
  }
  const prediction = predictMarketing(state, action);
  const { previousUses, effectiveHype } = prediction;
  let project = state.project;
  let releases = state.releases;
  if (project?.kind === "game") {
    project = {
      ...project,
      hype: project.hype + effectiveHype,
      advertisingUses: {
        ...(project.advertisingUses ?? {}),
        [action.name]: previousUses + 1,
      },
    };
  } else if (latestRelease) {
    releases = releases.map((item, index) =>
      index === 0
        ? {
            ...item,
            remainingDemand: (item.remainingDemand ?? 0) + prediction.addedDemand,
            advertisingUses: {
              ...(item.advertisingUses ?? {}),
              [action.name]: previousUses + 1,
            },
          }
        : item,
    );
  }
  return {
    state: {
      ...state,
      cash: state.cash - action.cost,
      project,
      releases,
      fans: state.fans + Math.round(effectiveHype * 2.5),
      fanSegments: {
        ...state.fanSegments,
        [action.segment]:
          state.fanSegments[action.segment] +
          Math.max(1, Math.round(effectiveHype / 2)),
      },
    },
    effects: [{
      type: "result",
      result: {
        title: "宣传投放结果",
        summary: previousUses > 0
          ? `${action.name}再次投放，重复曝光使效果降低至 ${Math.round(prediction.multiplier * 100)}%。`
          : `${action.name}完成投放，目标人群开始关注作品。`,
        entries: [
          { category: "resource", label: "资金", value: `-${formatCash(action.cost)}`, tone: "negative" },
          state.project?.kind === "game"
            ? { category: "quality", label: "作品热度", value: `+${effectiveHype}`, tone: "positive" }
            : { category: "quality", label: "后续需求", value: `+${prediction.addedDemand.toLocaleString()}`, tone: prediction.addedDemand > 0 ? "positive" : "neutral", detail: prediction.addedDemand > 0 ? undefined : "作品已无有效销量" },
          { category: "resource", label: "粉丝", value: `+${prediction.fanGain}`, tone: "positive" },
          { category: "risk", label: "重复衰减", value: previousUses > 0 ? `${Math.round((1 - prediction.multiplier) * 100)}%` : "未触发", tone: previousUses > 0 ? "negative" : "neutral" },
        ],
      },
    }],
  };
}

function trainStaff(
  state: GameState,
  action: Extract<GameAction, { type: "train-staff" }>,
  random: RandomSource,
): EngineResult {
  const member = state.staff.find((item) => item.id === action.staffId);
  if (!member) return noEffects(state);
  const method = TRAINING_METHODS.find(item => item.id === action.method.id);
  if (!method) return noEffects(state);
  const prediction = predictTraining(member, method, state.unlockedThemes, state.companyLevel, state.cash);
  if (prediction.blockedReason) return { state, effects: [{ type: "toast", message: prediction.blockedReason }] };
  const used = prediction.used;
  const superTraining = random() < .12;
  const canUnlock = prediction.canUnlock;
  const unlocked = prediction.willDiscover;
  const trained = { ...member, energy: member.energy - method.energy, training: { ...(member.training ?? {}), [method.id]: used + 1 } };
  for (const gain of prediction.gains) trained[gain.key] += superTraining ? gain.max : gain.min;
  const staff = state.staff.map(item => item.id === member.id ? trained : item);
  const message = unlocked
    ? `培训成功，发现新题材“${method.unlock.name}”！`
    : superTraining
      ? "超级培训成功！能力大幅提升"
      : !canUnlock
        ? `能力提升；${method.unlock.role} Lv.${method.unlock.level} 进行该培训可发现新题材`
        : used >= 3
          ? "已经很熟练，本次提升有限"
          : "培训成功，能力提升！";
  return {
    state: {
      ...state,
      cash: state.cash - method.cost,
      staff,
      unlockedThemes: unlocked
        ? [...state.unlockedThemes, method.unlock.name]
        : state.unlockedThemes,
    },
    effects: [{
      type: "result",
      result: {
        title: "培训结果",
        summary: message,
        entries: [
          { category: "resource", label: "资金", value: `-${formatCash(method.cost)}`, tone: "negative" },
          { category: "resource", label: "体力", value: `-${method.energy}`, tone: "negative" },
          ...prediction.gains.map((change) => {
            const labels = { code: "程序", scenario: "剧本", art: "画面", sound: "音乐" };
            const gain = superTraining ? change.max : change.min;
            return { category: "quality" as const, label: labels[change.key], value: `${gain >= 0 ? "+" : ""}${gain}`, tone: gain > 0 ? "positive" as const : gain < 0 ? "negative" as const : "neutral" as const, detail: gain === 0 ? "实际属性无变化" : undefined };
          }),
          ...(unlocked ? [{ category: "quality" as const, label: "发现题材", value: method.unlock.name, tone: "positive" as const }] : []),
          { category: "risk", label: "重复衰减", value: used > 0 ? `${Math.round((1 - prediction.multiplier) * 100)}%` : "未触发", tone: used > 0 ? "negative" : "neutral" },
        ],
      },
    }],
  };
}

function hireStaff(
  state: GameState,
  action: Extract<GameAction, { type: "hire-staff" }>,
  random: RandomSource,
): EngineResult {
  const method = action.method;
  const capacity = getOfficeCapacity(state.companyLevel);
  if (state.staff.length >= capacity) {
    return {
      state,
      effects: [{ type: "toast", message: `当前办公室最多容纳 ${capacity} 人` }],
    };
  }
  if (state.cash < method.cost) {
    return { state, effects: [{ type: "toast", message: "资金不足" }] };
  }
  const id = Math.max(0, ...state.staff.map((member) => member.id)) + 1;
  const poolSize = Math.min(HIRING_CANDIDATES.length, 2 + method.quality);
  const candidate = HIRING_CANDIDATES[(state.staff.length + state.year) % poolSize];
  const bonus = method.quality * 3 + Math.floor(random() * (method.quality + 2));
  return {
    state: {
      ...state,
      cash: state.cash - method.cost,
      staff: [...state.staff, {
        id,
        ...candidate,
        code: candidate.code + bonus,
        scenario: candidate.scenario + bonus,
        art: candidate.art + bonus,
        sound: candidate.sound + bonus,
        level: 1,
        energy: 100,
        resting: false,
        training: {},
        masteredRoles: [],
      }],
    },
    effects: [{ type: "toast", message: `${candidate.name} 加入了工作室` }],
  };
}

function applyItemAction(
  state: GameState,
  key: keyof Inventory,
): EngineResult {
  if (state.inventory[key] < 1) {
    return { state, effects: [{ type: "toast", message: "库存不足" }] };
  }
  if (key === "energyDrink") {
    const energyGain = state.staff.reduce(
      (sum, member) => sum + (clamp(member.energy + 42, 0, 100) - member.energy),
      0,
    );
    return {
      state: {
        ...state,
        inventory: { ...state.inventory, [key]: state.inventory[key] - 1 },
        staff: state.staff.map((member) => ({
          ...member,
          energy: clamp(member.energy + 42, 0, 100),
        })),
      },
      effects: [{
        type: "result",
        result: {
          title: "道具使用结果",
          summary: "活力汽水已分给全体员工。",
          entries: [
            { category: "resource", label: "库存", value: "-1", tone: "negative" },
            { category: "resource", label: "全员体力", value: `+${Math.round(energyGain)}`, tone: "positive", detail: "实际恢复总量" },
          ],
        },
      }],
    };
  }
  if (!state.project || state.project.kind !== "game") {
    return {
      state,
      effects: [{ type: "toast", message: "开发游戏时才能使用这个道具" }],
    };
  }
  const prediction = predictItemUse(state, key);
  const researchCost = prediction.researchCost;
  if (state.research < researchCost) {
    return {
      state,
      effects: [{ type: "toast", message: `使用需要 ${researchCost} 点研究` }],
    };
  }
  const amount = prediction.amount;
  const oldBugs = state.project.bugs;
  const qualityLabel = key === "funBoost" ? "趣味" : key === "creativityBoost" ? "创意" : key === "graphicsBoost" ? "画面" : key === "soundBoost" ? "音乐" : "漏洞";
  const actualChange = key === "bugSpray"
    ? Math.min(oldBugs, amount)
    : amount;
  return {
    state: {
      ...state,
      research: state.research - researchCost,
      inventory: { ...state.inventory, [key]: state.inventory[key] - 1 },
      project: {
        ...state.project,
        fun: state.project.fun + (key === "funBoost" ? amount : 0),
        creativity:
          state.project.creativity + (key === "creativityBoost" ? amount : 0),
        graphics:
          state.project.graphics + (key === "graphicsBoost" ? amount : 0),
        sound: state.project.sound + (key === "soundBoost" ? amount : 0),
        bugs:
          key === "bugSpray"
            ? Math.max(0, state.project.bugs - amount)
            : state.project.bugs,
        itemUses: (state.project.itemUses ?? 0) + 1,
      },
    },
    effects: [{
      type: "result",
      result: {
        title: "道具使用结果",
        summary: (state.project.itemUses ?? 0) > 0
          ? `道具已生效，连续使用效果为首次的 ${Math.round(prediction.multiplier * 100)}%。`
          : "道具效果已提交到当前项目。",
        entries: [
          { category: "resource", label: "库存", value: "-1", tone: "negative" },
          { category: "resource", label: "研究", value: `-${researchCost}`, tone: "negative" },
          { category: key === "bugSpray" ? "risk" : "quality", label: qualityLabel, value: `${key === "bugSpray" ? "-" : "+"}${actualChange}`, tone: actualChange > 0 ? "positive" : "neutral", detail: actualChange > 0 ? undefined : "当前没有可作用的漏洞" },
          { category: "risk", label: "连续使用衰减", value: (state.project.itemUses ?? 0) > 0 ? `${Math.round((1 - prediction.multiplier) * 100)}%` : "未触发", tone: (state.project.itemUses ?? 0) > 0 ? "negative" : "neutral" },
        ],
      },
    }],
  };
}

function changeCareer(
  state: GameState,
  staffId: number,
  role: string,
): EngineResult {
  const member = state.staff.find((item) => item.id === staffId);
  if (!member || state.careerManuals < 1) return noEffects(state);
  if (member.level < 5 || !getCareerOptionsFor(member.masteredRoles ?? [], member.role).includes(role)) return noEffects(state);
  return {
    state: {
      ...state,
      careerManuals: state.careerManuals - 1,
      staff: state.staff.map((item) =>
        item.id === staffId
          ? {
              ...item,
              role,
              level: 1,
              code:
                item.code +
                (["程序员", "硬件工程师", "黑客"].includes(role) ? 4 : 1),
              scenario:
                item.scenario +
                (["编剧", "总监", "制作人", "黑客"].includes(role) ? 4 : 1),
              art:
                item.art +
                (["美术", "总监", "黑客"].includes(role) ? 4 : 1),
              sound:
                item.sound +
                (["音效师", "制作人", "黑客"].includes(role) ? 4 : 1),
            }
          : item,
      ),
    },
    effects: [{ type: "toast", message: `${member.name} 转职为 ${role}！` }],
  };
}

function chooseStageLead(
  state: GameState,
  action: Extract<GameAction, { type: "choose-lead" }>,
  random: RandomSource,
): EngineResult {
  const current = state.project;
  if (!current || current.kind !== "game" || current.stage === "debug" || current.leadName) {
    return noEffects(state);
  }
  const stage = (current.stage ?? "planning") as Exclude<NonNullable<Project["stage"]>, "debug">;
  const stageInfo = STAGE_INFO[stage];
  const member = action.leadStaffId
    ? state.staff.find((item) => item.id === action.leadStaffId)
    : undefined;
  if (action.leadStaffId && (!member || member.resting || member.energy <= 10)) {
    return {
      state,
      effects: [{ type: "toast", message: "这名员工正在休息，暂时无法担任负责人" }],
    };
  }
  const cost = action.cost ?? 0;
  if (state.cash < cost) {
    return {
      state,
      effects: [{ type: "toast", message: "资金不足，无法邀请外部专家" }],
    };
  }
  const identity = member?.id ?? "external";
  const rawSkill = member ? member[stageInfo.skill] : action.leadSkill;
  const opening = rollStageLeadOpening(
    state,
    current,
    {
      rawSkill,
      identity,
      energy: member?.energy ?? null,
      maxPower: member?.maxPower,
      role: member?.role,
    },
    random,
  );
  const energyCost = member ? Math.min(member.energy, opening.openingEnergyCost) : 0;
  const nextEnergy = member ? clamp(member.energy - energyCost, 0, 100) : null;
  const funGain = stage === "planning"
    ? opening.quality * .65
    : stage === "coding" ? opening.quality * .35 : 0;
  const creativityGain = stage === "planning"
    ? opening.quality
    : stage === "graphics" ? opening.quality * .12 : 0;
  const graphicsGain = stage === "graphics" ? opening.quality * 1.05 : 0;
  const soundGain = stage === "sound" ? opening.quality * 1.1 : 0;
  const project = {
    ...current,
    waitingForLeadRecovery: undefined,
    leadStaffId: member?.id,
    leadName: member?.name ?? action.leadName,
    leadSkill: opening.effectiveSkill,
    progress: current.progress + opening.progress,
    stageProgress: (current.stageProgress ?? 0) + opening.progress,
    fun: current.fun + funGain,
    creativity: current.creativity + creativityGain,
    graphics: current.graphics + graphicsGain,
    sound: current.sound + soundGain,
    bugs: current.bugs + opening.bugs,
  };
  const formatGain = (value: number) => `+${value.toFixed(1)}`;
  const entries: ResultData["entries"] = [
    {
      category: "quality",
      label: "阶段进度",
      value: formatGain(opening.progress),
      tone: "positive",
      detail: "开工产出已写入项目",
    },
  ];
  if (funGain > 0) entries.push({ category: "quality", label: "趣味", value: formatGain(funGain), tone: "positive" });
  if (creativityGain > 0) entries.push({ category: "quality", label: "创意", value: formatGain(creativityGain), tone: "positive" });
  if (graphicsGain > 0) entries.push({ category: "quality", label: "画面", value: formatGain(graphicsGain), tone: "positive" });
  if (soundGain > 0) entries.push({ category: "quality", label: "音乐", value: formatGain(soundGain), tone: "positive" });
  entries.push({
    category: "risk",
    label: "漏洞",
    value: formatGain(opening.bugs),
    tone: opening.bugs > .05 ? "negative" : "neutral",
    detail: stage === "coding" ? "程序开工可能引入隐藏问题" : "本次新增",
  });
  entries.push(member
    ? {
        category: "resource",
        label: `${member.name}体力`,
        value: `-${energyCost.toFixed(1)}`,
        tone: "negative",
        detail: nextEnergy !== null && nextEnergy <= 10 ? "已进入休息" : `剩余 ${nextEnergy?.toFixed(1)}%`,
      }
    : {
        category: "resource",
        label: "外聘费用",
        value: `-${formatCash(cost)}`,
        tone: "negative",
        detail: "一次性专业产出",
      });
  if (opening.repeated) {
    entries.push({
      category: "risk",
      label: "重复负责",
      value: `-${Math.round((1 - opening.repeatMultiplier) * 100)}%`,
      tone: "negative",
      detail: "与上次同阶段负责人相同",
    });
  }
  const leadName = member?.name ?? action.leadName;
  return {
    state: {
      ...state,
      cash: state.cash - cost,
      staff: member
        ? state.staff.map((item) => item.id === member.id
            ? { ...item, energy: nextEnergy ?? item.energy, resting: (nextEnergy ?? item.energy) <= 10 }
            : item)
        : state.staff,
      lastStageLeads: { ...state.lastStageLeads, [stage]: identity },
      project,
    },
    effects: [{
      type: "stage-creation",
      creation: {
        stage,
        leadStaffId: member?.id,
        leadName,
        external: !member,
        repeated: opening.repeated,
        roleFit: opening.roleFit,
        skillLabel: stageInfo.short,
        effectiveSkill: opening.effectiveSkill,
        result: {
          title: `${stageInfo.label} · 开工成果`,
          summary: `${leadName}以${opening.roleFit}完成创作，实际变化已经计入《${current.name}》。`,
          entries,
        },
      },
    }],
  };
}

export function applyGameAction(
  state: GameState,
  action: GameAction,
  random: RandomSource = Math.random,
): EngineResult {
  switch (action.type) {
    case "tick":
      return tick(state, action.isNewWeek, action.allowStaffChallenge ?? false, random);
    case "scheduled-event":
      return applyScheduledEvent(state, random);
    case "level-up-staff":
      return levelUpStaff(state, action);
    case "expand-office":
      return expandOffice(state, action);
    case "wait-for-stage-lead":
      return canWaitForStageLead(state)
        ? noEffects({ ...state, project: { ...state.project!, waitingForLeadRecovery: true } })
        : noEffects(state);
    case "start-project":
      return noEffects({
        ...state,
        cash: state.cash - (action.cost ?? 0),
        project: action.project,
      });
    case "choose-lead":
      return chooseStageLead(state, action, random);
    case "apply-marketing":
      return applyMarketing(state, action);
    case "train-staff":
      return trainStaff(state, action, random);
    case "hire-staff":
      return hireStaff(state, action, random);
    case "use-item":
      return applyItemAction(state, action.key);
    case "change-career":
      return changeCareer(state, action.staffId, action.role);
    case "resolve-staff-challenge":
      return resolveStaffChallenge(state, action.offerId, action.investment, random);
    case "attend-expo":
      if (state.cash < action.cost) {
        return {
          state,
          effects: [{ type: "toast", message: "资金不足，无法布置这个展位" }],
        };
      }
      return {
        state: {
          ...state,
          cash: state.cash - action.cost,
          fans: state.fans + action.gainedFans,
          project:
            state.project?.kind === "game"
              ? { ...state.project, hype: state.project.hype + action.gainedHype }
              : state.project,
        },
        effects: [{
          type: "result",
          result: {
            title: "展会结果",
            summary: `${action.label}顺利结束，现场反馈已经计入公司状态。`,
            entries: [
              { category: "resource", label: "资金", value: `-${formatCash(action.cost)}`, tone: action.cost > 0 ? "negative" : "neutral" },
              { category: "resource", label: "粉丝", value: `+${action.gainedFans}`, tone: action.gainedFans > 0 ? "positive" : "neutral" },
              { category: "quality", label: "作品热度", value: `+${state.project?.kind === "game" ? action.gainedHype : 0}`, tone: state.project?.kind === "game" && action.gainedHype > 0 ? "positive" : "neutral" },
            ],
          },
        }],
      };
    case "complete-project":
      return state.project && (!action.project || action.project === state.project)
        ? completeProject(state, state.project, random)
        : noEffects(state);
  }
}
