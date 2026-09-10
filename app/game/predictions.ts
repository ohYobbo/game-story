import { getContentPopularity, getFirstWeekSales, getReleaseFatigueMultiplier, getReviewScores, getGeneralQualityGain } from "../game-balance.ts";
import { getPlatformQuote, type PlatformPhase } from "./platforms.ts";
import { combinationKey, getCombination, getCombinationPopularity } from "./combinations.ts";
import { CONTRACTS, GREAT_COMBOS } from "./data.ts";
import { getAudience, getDirectionAudienceGains, getDirectionBoosts, getDirectionConfig, getKnowledgeLevel, getStageTarget } from "./rules.ts";
import type { DirectionPoints, FanSegments, GameState, Project, Release } from "./types";
import type { NumberRange } from "./operations.ts";
import { forecastProject } from "./forecast.ts";
export * from "./operations.ts";

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
  productionCost: number;
  platformDevelopmentFee: number;
  licenseFee: number;
  platformPhase: PlatformPhase;
  platformWeeksRemaining: number | null;
  marketEvent: string | null;
  durationWeeks: NumberRange | null;
  qualityRange: NumberRange | null;
  qualityLevel: string;
  cashPressure: string;
  riskLevel: string;
  combinationLevel: string;
  popularityPercent: number;
  fatiguePercent: number;
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

export function createGameProject(input: GamePlanInput): Project {
  const { state, sequel } = input;
  const combination = getCombination(input.genre, input.theme);
  const comboBoost = combination.quality;
  const sequelBoost = sequel ? 7 + Math.floor(sequel.score / 8) : 0;
  const masteryBoost =
    getKnowledgeLevel(state.genreExperience[input.genre] ?? 0) +
    getKnowledgeLevel(state.themeExperience[input.theme] ?? 0) - 2;
  const directionConfig = getDirectionConfig(input.direction);
  const directionBoosts = getDirectionBoosts(input.directionPoints);
  const quote = getPlatformQuote(state, { ...input, platform: input.platform.name });
  if (!quote) throw new Error("该平台尚未上市或已经退市");

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
    hype: 2 + directionBoosts.hype + combination.hype,
    marketUsers: quote.platform.users,
    platformDevelopmentFee: quote.platform.cost,
    licenseFee: quote.licenseFee,
    productionCost: quote.productionCost,
    stage: "planning",
    stageProgress: 0,
    stageTarget: getStageTarget("planning", input.direction),
    elapsedWeeks: 0,
    sequelOfId: sequel?.id,
    combination: combination.rating,
    itemUses: 0,
    eventCount: 0,
    challengeCount: 0,
    directionPoints: { ...input.directionPoints },
    contentPopularity: getCombinationPopularity(input.genre, input.theme),
    debugResearch: 0,
    developmentCost: quote.total,
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
  const { platform } = getPlatformQuote(input.state, project)!;
  const forecast = forecastProject(input.state, project);
  const { durationWeeks } = forecast;
  const cost = project.developmentCost ?? 0;
  const cashRatio = cost / Math.max(1, input.state.cash);
  const fatigue = getReleaseFatigueMultiplier(input.state.releases, input.genre, input.theme);
  const popularity = getContentPopularity(input.genre, input.theme, false);
  const discovery = input.state.combinationDiscoveries[combinationKey(input.genre, input.theme)];
  const known = discovery !== undefined && discovery !== "tried";
  // Two of four initial qualities vary by at most four points across affinity tiers.
  // Widen their average by two while the player has not confirmed this combination.
  const qualityRange = forecast.qualityRange && (known ? forecast.qualityRange : {
    min: Math.max(0, forecast.qualityRange.min - 2),
    max: forecast.qualityRange.max + 2,
  });
  const averageEnergy = input.state.staff.length
    ? input.state.staff.reduce((sum, member) => sum + member.energy, 0) / input.state.staff.length
    : 0;
  const yearsRemaining = platform.weeksRemaining === null ? null : Math.ceil(platform.weeksRemaining / 48);
  const combinationLevel = known ? `${getCombination(input.genre, input.theme).label}相性` : discovery === "tried" ? "尝试过 · 相性待确认" : "未发现 · 发售后揭晓";

  const advantageCandidates: PredictionFactor[] = [
    !known
      ? { tone: "neutral", text: "相性尚未确认，品质预测包含未知组合的不确定性" }
      : popularity >= 1
        ? { tone: "positive", text: "题材市场接受度较好" }
        : { tone: "neutral", text: "小众组合有明确核心受众" },
    averageEnergy >= 70
      ? { tone: "positive", text: `团队平均体力 ${Math.round(averageEnergy)}%，制作状态充足` }
      : { tone: "neutral", text: `团队平均体力 ${Math.round(averageEnergy)}%，需安排休息` },
    platform.users >= 700_000
      ? { tone: "positive", text: `${platform.name}拥有${marketLabel(platform.users)}市场` }
      : { tone: "neutral", text: `${platform.name}拥有${marketLabel(platform.users)}市场` },
    input.sequel
      ? { tone: "positive", text: `续作继承《${input.sequel.name}》的开发积累` }
      : { tone: "neutral", text: `${input.direction}方针决定速度与品质取舍` },
  ];
  const advantages = advantageCandidates.slice(0, 2);

  const risks: PredictionFactor[] = [];
  if (forecast.blockedRuns) risks.push({ tone: "negative", text: `${forecast.blockedRuns}/${forecast.sampleCount} 次模拟无法由内部团队完成，需调整人员或邀请外援` });
  if (input.state.cash < cost) risks.push({ tone: "negative", text: `资金缺口 ${cost - input.state.cash}千，当前无法开工` });
  else if (cashRatio >= .65) risks.push({ tone: "negative", text: `开发费占现金 ${Math.round(cashRatio * 100)}%，现金压力高` });
  if (platform.phase === "衰退期") risks.push({ tone: "negative", text: "平台费用下调，但活跃用户持续收缩" });
  if (platform.weeksRemaining !== null && platform.weeksRemaining <= 48) risks.push({ tone: "negative", text: `${platform.name}将在 ${platform.weeksRemaining} 周后退市；此后无法开新作` });
  if (platform.weeksRemaining !== null && durationWeeks && durationWeeks.max >= platform.weeksRemaining) risks.push({ tone: "negative", text: "预计开发可能跨过退市日；可继续发售，沿用开工时锁定的用户量" });
  if (fatigue < 1) risks.push({ tone: "negative", text: `近期重复内容使市场需求降至 ${Math.round(fatigue * 100)}%` });
  if (averageEnergy < 45) risks.push({ tone: "negative", text: "团队体力偏低，开发中可能休息" });
  if (risks.length < 2) risks.push({ tone: "neutral", text: "开发事件可能改变常规周期与品质" });
  if (risks.length < 2) risks.push({ tone: "neutral", text: "最终除错周期取决于制作中产生的漏洞" });

  const riskPoints = risks.filter((factor) => factor.tone === "negative").length;
  return {
    project,
    cost,
    cashRatio,
    productionCost: project.productionCost!,
    platformDevelopmentFee: platform.cost,
    licenseFee: project.licenseFee!,
    platformPhase: platform.phase,
    platformWeeksRemaining: platform.weeksRemaining,
    marketEvent: platform.marketEvent,
    durationWeeks,
    qualityRange,
    qualityLevel: qualityRange ? qualityLabel((qualityRange.min + qualityRange.max) / 2) : "无法估计",
    cashPressure: input.state.cash < cost ? "无法开工" : cashRatio >= .65 ? "高" : cashRatio >= .35 ? "中" : "低",
    riskLevel: riskPoints >= 2 ? "高" : riskPoints === 1 ? "中" : "低",
    combinationLevel,
    popularityPercent: Math.round(popularity * 100),
    fatiguePercent: Math.round(fatigue * 100),
    audience: getAudience(input.genre, input.theme).label,
    audienceChanges: getAudienceChanges(input.genre, input.theme, input.directionPoints),
    marketLevel: marketLabel(platform.users),
    marketUsers: platform.users,
    platformYearsRemaining: yearsRemaining,
    advantages,
    risks,
  };
}

export function predictContract(state: GameState, contract: (typeof CONTRACTS)[number]) {
  // Estimate time to satisfy every requirement; compare that time with the real deadline.
  const forecast = forecastProject(state, {
    kind: "contract", name: contract.name, platform: "委托", genre: "外包", theme: "",
    direction: "均衡", progress: 0, target: contract.target,
    fun: 0, creativity: 0, graphics: 0, sound: 0, bugs: 0, hype: 0,
    elapsedWeeks: 0, deadlineWeeks: Number.MAX_SAFE_INTEGER, qualityTargets: contract.requirements,
  });
  const { durationWeeks } = forecast;
  const totalPower = state.staff.reduce((sum, member) => member.resting ? sum : sum + member.code + member.scenario + member.art + member.sound, 0);
  return {
    durationWeeks,
    risk: !durationWeeks || durationWeeks.min > contract.deadline ? "很高" : durationWeeks.max > contract.deadline || forecast.blockedRuns ? "中" : "低",
    teamPower: Math.round(totalPower),
    qualityPerTick: Math.round(getGeneralQualityGain(totalPower, 1) * 10) / 10,
  };
}

export function predictConsole(state: GameState, performance: number, cost: number) {
  const forecast = forecastProject(state, {
    kind: "console", name: "像素盒子", platform: "硬件研发", genre: "自研主机", theme: "次世代",
    direction: "重视品质", progress: 0, target: Math.round(560 * performance),
    fun: 0, creativity: 0, graphics: 0, sound: 0, bugs: 0, hype: 25,
    consoleSpec: { cpu: "", media: "", body: "", performance, cost },
  });
  return { durationWeeks: forecast.durationWeeks, userRange: forecast.userRange, cashRatio: cost / Math.max(1, state.cash) };
}

export type ConsolePrediction = ReturnType<typeof predictConsole>;

export function predictEarlyRelease(state: GameState, project: Project) {
  const isGreatCombo = project.combination ? project.combination === "great" : GREAT_COMBOS.has(`${project.genre}|${project.theme}`);
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
