import { getDevelopmentCost } from "../game-balance.ts";
import { DIRECTIONS, PLATFORMS } from "./data.ts";
import type { GameState, Project } from "./types";

type MarketState = Pick<GameState, "year" | "month" | "week" | "ownConsole" | "consoleUsers">;
export type PlatformPhase = "未上市" | "上市" | "成长期" | "成熟期" | "衰退期" | "退市";
export type PlatformMarket = (typeof PLATFORMS)[number] & {
  phase: PlatformPhase;
  weeksRemaining: number | null;
  marketEvent: string | null;
};

// All platforms open on January 1 and retire after December's fourth week.
// June/July's annual campaign raises the newest external platform's active users by 15%.
export function getPlatformMarkets(state: MarketState): PlatformMarket[] {
  const elapsed = (state.month - 1) * 4 + state.week - 1;
  const newest = PLATFORMS.filter(p => state.year >= p.debut && state.year <= p.retire).at(-1)?.name;
  const markets = PLATFORMS.map(p => {
    const age = (state.year - p.debut) * 48 + elapsed;
    const life = (p.retire - p.debut + 1) * 48;
    const permanent = p.retire >= 99;
    const fraction = age / life;
    const phase: PlatformPhase = age < 0 ? "未上市" : !permanent && age >= life ? "退市"
      : p.name === "个人电脑" ? "成熟期" : age < 12 ? "上市"
      : permanent ? age < 144 ? "成长期" : "成熟期"
      : fraction < .4 ? "成长期" : fraction < .7 ? "成熟期" : "衰退期";
    const decline = phase === "衰退期" ? Math.min(1, (fraction - .7) / .3) : 0;
    const available = phase !== "未上市" && phase !== "退市";
    const scale = p.name === "个人电脑" ? 1 + Math.min(.5, Math.max(0, state.year - 1) * .025)
      : permanent ? .55 + .45 * Math.min(1, Math.max(0, age) / 144)
      : fraction < .4 ? .55 + .45 * Math.max(0, fraction) / .4 : 1 - decline * .65;
    const campaign = available && p.name === newest && state.month >= 6 && state.month <= 7;
    return {
      ...p,
      cost: Math.round(p.cost * (1 - decline * .5)),
      licenseFee: Math.round(p.licenseFee * (1 - decline * .5)),
      users: available ? Math.round(p.users * scale * (campaign ? 1.15 : 1)) : 0,
      phase,
      weeksRemaining: permanent ? null : Math.max(0, life - age),
      marketEvent: campaign ? "夏季推广：活跃用户 +15%，持续至 7 月末" : null,
    };
  });
  if (state.ownConsole) markets.push({
    name: "像素盒子", cost: 0, licenseFee: 0,
    users: Math.max(220_000, state.consoleUsers), debut: state.year, retire: 99,
    phase: "成熟期", weeksRemaining: null, marketEvent: null,
  });
  return markets;
}

export function getPlatformQuote(state: GameState, project: Pick<Project, "platform" | "genre" | "theme" | "direction">) {
  const platform = getPlatformMarkets(state).find(p => p.name === project.platform);
  if (!platform || platform.phase === "未上市" || platform.phase === "退市") return null;
  const licenseFee = state.platformLicenses.includes(platform.name) ? 0 : platform.licenseFee;
  const direction = DIRECTIONS.find(d => d.name === project.direction) ?? DIRECTIONS[0];
  const productionCost = getDevelopmentCost(platform.cost, project.genre, project.theme, direction.cost);
  return { platform, licenseFee, productionCost, total: productionCost + licenseFee };
}
