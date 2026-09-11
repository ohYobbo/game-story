export type ProductionStage = "planning" | "coding" | "graphics" | "sound" | "debug";

export type BalanceStaff = {
  role: string;
  code: number;
  scenario: number;
  art: number;
  sound: number;
  energy: number;
  maxPower?: number;
  resting?: boolean;
  salary?: number;
};

export const BALANCE_VERSION = 7;
export const STARTING_CASH = 500;
export const STARTING_FANS = 0;
export const STARTING_RESEARCH = 10;
export const STARTING_REPUTATION = 0;
export const HALL_OF_FAME_SCORE = 32;
export const COMBO_STARTING_BONUS = 2;
export const COMBO_REVIEW_BONUS = 0.75;
export const SALES_INCOME_PER_COPY = 0.0075;
export const DEBUG_RESEARCH_PER_BUG = 1;

export const STAGE_TARGETS: Record<ProductionStage, number> = {
  planning: 32,
  coding: 70,
  graphics: 55,
  sound: 45,
  debug: 1,
};

export const OFFICE_UPGRADE_COSTS: Record<2 | 3, number> = {
  2: 600,
  3: 2500,
};

export const CONTENT_BALANCE: Record<string, { cost: number; popularity: number }> = {
  "动作": { cost: 25, popularity: 1 },
  "角色扮演": { cost: 35, popularity: 1.1 },
  "模拟": { cost: 30, popularity: 1 },
  "冒险": { cost: 20, popularity: 0.9 },
  "益智": { cost: 20, popularity: 1.05 },
  "射击": { cost: 25, popularity: 0.9 },
  "竞速": { cost: 25, popularity: 0.95 },
  "桌游": { cost: 20, popularity: 0.95 },
  "格斗": { cost: 30, popularity: 1 },
  "音乐": { cost: 30, popularity: 1.05 },
  "知识问答": { cost: 20, popularity: 0.85 },
  "教育": { cost: 20, popularity: 0.85 },
  "幻想": { cost: 15, popularity: 1.1 },
  "忍者": { cost: 15, popularity: 1 },
  "侦探": { cost: 15, popularity: 0.95 },
  "小镇": { cost: 15, popularity: 1 },
  "机器人": { cost: 15, popularity: 0.95 },
  "太空": { cost: 20, popularity: 1 },
  "校园": { cost: 15, popularity: 1 },
  "历史": { cost: 15, popularity: 0.85 },
  "体育": { cost: 15, popularity: 0.95 },
  "怪物": { cost: 20, popularity: 1 },
  "海盗": { cost: 15, popularity: 1 },
  "动物": { cost: 15, popularity: 1.05 },
  "电子宠物": { cost: 15, popularity: 1.05 },
  "策略": { cost: 35, popularity: 1 },
  "经营": { cost: 35, popularity: 1 },
  "战争": { cost: 20, popularity: .95 },
  "演艺": { cost: 20, popularity: 1 },
  "机械": { cost: 20, popularity: .95 },
  "虚拟世界": { cost: 25, popularity: 1.05 },
};

export function getContentBalance(name: string) {
  return CONTENT_BALANCE[name] ?? { cost: 20, popularity: 0.9 };
}

export function getDevelopmentCost(platformCost: number, genre: string, theme: string, directionCost: number) {
  return Math.round((platformCost + getContentBalance(genre).cost + getContentBalance(theme).cost) * directionCost);
}

export function getContentPopularity(genre: string, theme: string, isGreatCombo: boolean) {
  const base = Math.sqrt(getContentBalance(genre).popularity * getContentBalance(theme).popularity);
  return base * (isGreatCombo ? 1.25 : 1);
}

export function getReleaseFatigueMultiplier(
  recentReleases: { genre?: string; theme?: string }[],
  genre: string,
  theme: string,
) {
  const repeats = recentReleases.slice(0, 4).filter((release) => release.genre === genre || release.theme === theme).length;
  return Math.max(.65, 1 - repeats * .12);
}

export function getStageSkill(member: BalanceStaff, stage: ProductionStage) {
  if (stage === "planning") return Math.max(member.scenario, member.code * 0.7);
  if (stage === "graphics") return member.art;
  if (stage === "sound") return member.sound;
  return member.code;
}

export function getStageTeamPower(staff: BalanceStaff[], stage: ProductionStage) {
  return staff.reduce((sum, member) => member.resting ? sum : sum + getStageSkill(member, stage), 0);
}

export function getEnergyModifier(staff: BalanceStaff[]) {
  const active = staff.filter((member) => !member.resting);
  if (!active.length) return 0;
  const average = active.reduce((sum, member) => sum + member.energy, 0) / (active.length * 100);
  return 0.65 + average * 0.35;
}

export function getDevelopmentGain(
  stagePower: number,
  leadSkill: number,
  speedModifier: number,
  energyModifier: number,
  randomValue: number,
) {
  return (stagePower / 14 + leadSkill / 8) * speedModifier * energyModifier * (0.88 + randomValue * 0.24);
}

export function getQualityGain(
  stagePower: number,
  leadSkill: number,
  qualityModifier: number,
  randomValue: number,
) {
  return (leadSkill / 16 + stagePower / 80) * qualityModifier * (0.82 + randomValue * 0.32);
}

export function getDebugGain(stagePower: number, energyModifier: number, randomValue: number) {
  return (stagePower / 10) * energyModifier * (0.8 + randomValue * 0.4);
}

export function getGeneralProjectGain(
  totalPower: number,
  speedModifier: number,
  energyModifier: number,
  randomValue: number,
) {
  return (totalPower / 22) * speedModifier * energyModifier * (0.85 + randomValue * 0.3);
}

export function getGeneralQualityGain(totalPower: number, qualityModifier: number) {
  return (totalPower / 105) * qualityModifier;
}

export function getConsoleInitialUsers(
  fans: number,
  totalPower: number,
  performance: number,
) {
  return Math.round((260_000 + fans * 110 + totalPower * 850) * performance);
}

export function getRepeatedUseMultiplier(uses: number, decay: number, floor: number) {
  return Math.max(floor, 1 - uses * decay);
}

export function getLeadRepeatMultiplier(isRepeat: boolean) {
  return isRepeat ? 0.82 : 1;
}

export function getReviewBase(qualities: Pick<{ fun: number; creativity: number; graphics: number; sound: number }, "fun" | "creativity" | "graphics" | "sound">) {
  return (qualities.fun + qualities.creativity + qualities.graphics + qualities.sound) / 32;
}

export function getReviewDetails(input: {
  qualities: { fun: number; creativity: number; graphics: number; sound: number };
  isGreatCombo: boolean;
  reputation: number;
  bugs: number;
  randomValues: [number, number, number, number];
}) {
  const base = getReviewBase(input.qualities);
  const combo = input.isGreatCombo ? COMBO_REVIEW_BONUS : 0;
  const bugPenalty = Math.min(4, input.bugs * .18);
  const critics = [
    { name: "妙手", focus: "创意", quality: input.qualities.creativity, styleBonus: .1 },
    { name: "铁面", focus: "画面", quality: input.qualities.graphics, styleBonus: .7 },
    { name: "玩家", focus: "趣味", quality: input.qualities.fun, styleBonus: 1.1 },
    { name: "主编", focus: "音乐", quality: input.qualities.sound, styleBonus: 1.6 },
  ];
  return critics.map((critic, index) => {
    const preference = Math.max(-.5, Math.min(.5, (critic.quality - base * 8) / 48));
    const reputationBonus = input.reputation / 45;
    const variation = input.randomValues[index] * 1.4;
    const rawScore = base + preference + combo + critic.styleBonus + reputationBonus - bugPenalty + variation;
    return {
      name: critic.name, focus: critic.focus, base, preference, comboBonus: combo,
      styleBonus: critic.styleBonus, reputationBonus, bugPenalty, variation, rawScore,
      score: Math.max(1, Math.min(10, Math.round(rawScore))),
    };
  });
}

export type ReviewDetail = ReturnType<typeof getReviewDetails>[number];

export function getReviewScores(input: Parameters<typeof getReviewDetails>[0]) {
  return getReviewDetails(input).map(item => item.score);
}

export function getFirstWeekSales(input: {
  score: number;
  hype: number;
  fans: number;
  marketUsers: number;
  contentPopularity: number;
  randomValue: number;
}) {
  const marketMultiplier = Math.max(0.7, Math.min(3.4, input.marketUsers / 520_000));
  return Math.round(
    (input.score ** 2 * 24 + input.hype * 95 + input.fans * 2.4) *
    marketMultiplier * input.contentPopularity * (0.85 + input.randomValue * 0.3),
  );
}

export function getSalesIncome(units: number) {
  return Math.round(units * SALES_INCOME_PER_COPY);
}

export function getLevelUpCost(level: number) {
  return 5 + level * 4;
}

export function getNextSalary(salary: number) {
  return Math.round(salary * 1.2);
}

export function getAnnualPayroll(staff: BalanceStaff[]) {
  return staff.reduce((sum, member) => sum + (member.salary ?? 20), 0);
}

export const CAREER_REQUIREMENTS: Record<string, string[]> = {
  "程序员": [], "编剧": [], "美术": [], "音效师": [],
  "总监": ["程序员", "编剧"], "制作人": ["美术", "音效师"],
  "硬件工程师": ["总监", "制作人"], "黑客": ["硬件工程师"],
};

export function getCareerOptionsFor(masteredRoles: string[], currentRole: string) {
  return Object.entries(CAREER_REQUIREMENTS)
    .filter(([role, required]) => role !== currentRole && required.every(item => masteredRoles.includes(item)))
    .map(([role]) => role);
}
