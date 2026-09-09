import { COMBO_STARTING_BONUS, getContentPopularity } from "../game-balance.ts";
import { GREAT_COMBOS } from "./data.ts";

export const COMBINATION_RULES = {
  great: { label: "杰作", quality: COMBO_STARTING_BONUS, hype: 2, demand: 1.25 },
  good: { label: "良好", quality: 1, hype: 1, demand: 1.1 },
  normal: { label: "普通", quality: 0, hype: 0, demand: 1 },
  awkward: { label: "微妙", quality: -1, hype: -1, demand: .9 },
  poor: { label: "糟糕", quality: -2, hype: -2, demand: .8 },
} as const;
export type CombinationRating = keyof typeof COMBINATION_RULES;
export type CombinationDiscovery = CombinationRating | "tried";

const RATINGS: Record<string, CombinationRating> = {
  "益智|机器人": "good", "教育|动物": "good", "知识问答|历史": "good", "冒险|海盗": "good",
  "音乐|机器人": "awkward", "桌游|太空": "awkward", "教育|海盗": "awkward",
  "教育|怪物": "poor", "知识问答|海盗": "poor", "竞速|侦探": "poor",
};

export const combinationKey = (genre: string, theme: string) => `${genre}|${theme}`;

export function getCombination(genre: string, theme: string) {
  const key = combinationKey(genre, theme);
  const rating = GREAT_COMBOS.has(key) ? "great" : RATINGS[key] ?? "normal";
  return { rating, ...COMBINATION_RULES[rating] };
}

export function getCombinationPopularity(genre: string, theme: string) {
  return getContentPopularity(genre, theme, false) * getCombination(genre, theme).demand;
}
