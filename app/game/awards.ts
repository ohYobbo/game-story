import { HALL_OF_FAME_SCORE } from "../game-balance.ts";
import type { AnnualAwards, AwardCategory, AwardNominee, GameState, Release } from "./types";
import type { EngineResult } from "./engine";

export const AWARD_RULES: { id: AwardCategory; name: string; cash: number; fans: number; reputation: number; criteria: string }[] = [
  { id: "design", name: "最佳设计", cash: 500, fans: 300, reputation: 4, criteria: "评分 ≥28、趣味/创意均值 ≥40、漏洞 ≤8、销量 ≥1万；设计均值 + 评分×0.5 + 销量/1万（最高10）− 漏洞×2" },
  { id: "music", name: "最佳音乐", cash: 500, fans: 300, reputation: 4, criteria: "评分 ≥28、音乐 ≥45、漏洞 ≤8、销量 ≥1万；音乐 + 评分×0.5 + 销量/1万（最高10）− 漏洞×2" },
  { id: "worst", name: "最差作品", cash: 0, fans: -100, reputation: -8, criteria: "评分 ≤16，或评分 <28 且漏洞 ≥15；(40−评分)×2 + (100−品质均值，最低0) + 漏洞×3（最多计30个）+ 滞销值（10−销量/1000，最低0）" },
  { id: "runnerUp", name: "亚军", cash: 1000, fans: 600, reputation: 6, criteria: "评分 ≥32、品质均值 ≥45、漏洞 ≤5、销量 ≥2万；品质均值 + 评分×2 + 销量/1万（最高20）− 漏洞×3；排除年度大奖得主后取首位" },
  { id: "grand", name: "年度大奖", cash: 2000, fans: 1200, reputation: 10, criteria: "评分 ≥36、品质均值 ≥60、漏洞 ≤3、销量 ≥5万；沿用综合评价，取首位" },
];

export const AWARD_ELIGIBILITY = "次年结算上一整年发售的作品，使用结算时累计销量。工作室截至参评年度须有一部评分 ≥32 的作品，才可竞争正向奖；最差作品不受该限制。缺少发售年份或完整品质的旧作不参评。";
export const AWARD_TIES = "同作可兼得设计、音乐与综合奖；大奖和亚军互斥，大奖空缺时综合候选首位可获亚军。各项取评价值最高者；同值按评分、销量降序，再按作品 ID 字符顺序升序裁定。最差作品不计入正向获奖次数，粉丝最低0、口碑限制在0–100。";

const average = (q: NonNullable<Release["finalQuality"]>) => (q.fun + q.creativity + q.graphics + q.sound) / 4;
const completeQuality = (r: Release): r is Release & { finalQuality: NonNullable<Release["finalQuality"]> } =>
  Boolean(r.finalQuality && [r.finalQuality.fun, r.finalQuality.creativity, r.finalQuality.graphics, r.finalQuality.sound, r.finalQuality.bugs, r.score, r.sales].every(Number.isFinite));

function metric(r: Release & { finalQuality: NonNullable<Release["finalQuality"]> }, category: AwardCategory): number | null {
  const q = r.finalQuality;
  const quality = average(q);
  if (category === "worst") return r.score <= 16 || (r.score < 28 && q.bugs >= 15)
    ? (40 - r.score) * 2 + Math.max(0, 100 - quality) + Math.min(30, q.bugs) * 3 + Math.max(0, 10 - r.sales / 1000) : null;
  if (category === "design" || category === "music") {
    const focus = category === "design" ? (q.fun + q.creativity) / 2 : q.sound;
    if (r.score < 28 || focus < (category === "design" ? 40 : 45) || q.bugs > 8 || r.sales < 10000) return null;
    return focus + r.score * .5 + Math.min(10, r.sales / 10000) - q.bugs * 2;
  }
  const grand = category === "grand";
  if (r.score < (grand ? 36 : 32) || quality < (grand ? 60 : 45) || q.bugs > (grand ? 3 : 5) || r.sales < (grand ? 50000 : 20000)) return null;
  return quality + r.score * 2 + Math.min(20, r.sales / 10000) - q.bugs * 3;
}

const rank = (a: AwardNominee, b: AwardNominee) => b.metric - a.metric || b.score - a.score || b.sales - a.sales ||
  (a.releaseId < b.releaseId ? -1 : a.releaseId > b.releaseId ? 1 : 0);

export function evaluateAnnualAwards(state: GameState, year: number): AnnualAwards {
  const candidates = state.releases.filter(r => r.releasedYear === year);
  const qualified = state.releases.some(r => r.releasedYear !== undefined && r.releasedYear <= year && r.score >= HALL_OF_FAME_SCORE);
  const excluded = candidates.filter(r => !completeQuality(r)).map(r => ({ releaseId: r.id, name: r.name, reason: "缺少完整发售品质或评价数据，不补造历史" }));
  const categories = AWARD_RULES.map(rule => {
    const nominees = candidates.filter(completeQuality).flatMap(r => {
      const value = qualified || rule.id === "worst" ? metric(r, rule.id) : null;
      return value === null ? [] : [{ releaseId: r.id, name: r.name, metric: value, score: r.score, sales: r.sales, quality: { ...r.finalQuality } }];
    }).sort(rank);
    return { category: rule.id, nominees, winnerId: nominees[0]?.releaseId };
  });
  const grand = categories.find(c => c.category === "grand")!.winnerId;
  const runnerUp = categories.find(c => c.category === "runnerUp")!;
  runnerUp.nominees = runnerUp.nominees.filter(n => n.releaseId !== grand);
  runnerUp.winnerId = runnerUp.nominees[0]?.releaseId;
  const rewards = { cash: 0, fans: 0, reputation: 0, awards: 0 };
  for (const category of categories) {
    if (!category.winnerId) continue;
    const rule = AWARD_RULES.find(r => r.id === category.category)!;
    rewards.cash += rule.cash;
    rewards.fans += rule.fans;
    rewards.reputation += rule.reputation;
    if (rule.id !== "worst") rewards.awards += 1;
  }
  rewards.fans = Math.max(0, state.fans + rewards.fans) - state.fans;
  rewards.reputation = Math.max(0, Math.min(100, state.reputation + rewards.reputation)) - state.reputation;
  return {
    year, qualified, categories, excluded,
    unknownYearCount: state.releases.filter(r => r.releasedYear === undefined).length,
    rewards,
    officeUnlocked: state.companyLevel === 2 && state.year < 10 && state.awards === 0 && rewards.awards > 0,
  };
}

// Separate from lastEventKey: closing the ceremony can still show the same day's launch/payroll.
export function settleAnnualAwards(state: GameState, year: number): EngineResult {
  if (year <= state.lastAwardYear || year >= state.year || year < 1) return { state, effects: [] };
  const record = evaluateAnnualAwards(state, year);
  const winners = record.categories.filter(c => c.winnerId).map(c => {
    const rule = AWARD_RULES.find(r => r.id === c.category)!;
    return `${rule.name}：《${c.nominees.find(n => n.releaseId === c.winnerId)!.name}》`;
  });
  return {
    state: {
      ...state,
      lastAwardYear: year,
      awardHistory: [...state.awardHistory, record],
      cash: state.cash + record.rewards.cash,
      fans: state.fans + record.rewards.fans,
      reputation: state.reputation + record.rewards.reputation,
      awards: state.awards + record.rewards.awards,
    },
    effects: [{ type: "event", event: {
      kind: "awards", title: `第 ${year} 年全球游戏大奖`,
      headline: winners.length ? winners.join("；") : "本年度所有奖项空缺",
      body: `${record.qualified ? "工作室已取得正向奖项参评资格。" : "尚无评分达32的作品，正向奖项未开放；最差作品仍独立评选。"}提名、评价值、结算时销量和发售品质已保存在资料页。${record.excluded.length || record.unknownYearCount ? "部分旧作品资料不全，未纳入评选。" : ""}`,
      results: [
        { category: "resource", label: "奖金", value: `+¥${record.rewards.cash.toLocaleString()}千`, tone: record.rewards.cash ? "positive" : "neutral" },
        ...(["fans", "reputation", "awards"] as const).map(key => ({
          category: "resource" as const, label: { fans: "粉丝", reputation: "口碑", awards: "正向奖项" }[key],
          value: `${record.rewards[key] >= 0 ? "+" : ""}${record.rewards[key]}`,
          tone: record.rewards[key] > 0 ? "positive" as const : record.rewards[key] < 0 ? "negative" as const : "neutral" as const,
        })),
        ...(record.officeUnlocked ? [{ category: "resource" as const, label: "大楼办公室", value: "搬迁资格已解锁", tone: "positive" as const, detail: "仍需支付搬迁费用，请到员工页办理" }] : []),
      ],
    } }],
  };
}
