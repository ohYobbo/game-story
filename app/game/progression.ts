import { OFFICE_UPGRADE_COSTS, getLevelUpCost, getNextSalary } from "../game-balance.ts";
import { ADVERTISING_METHODS, CONTRACTS, HIRING_METHODS, ROLE_LEVEL_BOOSTS, ROLE_UNLOCK_RULES, TRAINING_METHODS } from "./data.ts";
import { formatCash, getOfficeCapacity } from "./rules.ts";
import type { GameState } from "./types";
import type { EngineResult } from "./engine";

export type ProgressionAction =
  | { type: "level-up-staff"; staffId: number; expectedLevel: number; expectedRole: string }
  | { type: "expand-office"; expectedLevel: number };

const unchanged = (state: GameState, message?: string): EngineResult => ({
  state, effects: message ? [{ type: "toast", message }] : [],
});

export function getOfficeUnlocks(level: number) {
  return [
    `培训：${TRAINING_METHODS.filter(item => (item.officeLevel ?? 1) === level).map(item => item.name).join("、")}`,
    `招聘：${HIRING_METHODS.filter(item => (item.level ?? 1) === level).map(item => item.name).join("、")}`,
    `宣传：${ADVERTISING_METHODS.filter(item => item.level === level).map(item => item.name).join("、")}`,
    `外包：${CONTRACTS.filter(item => item.level === level).map(item => item.name).join("、")}`,
  ];
}

export function levelUpStaff(state: GameState, action: Extract<ProgressionAction, { type: "level-up-staff" }>): EngineResult {
  const member = state.staff.find(item => item.id === action.staffId);
  if (!member || member.level !== action.expectedLevel || member.role !== action.expectedRole) return unchanged(state);
  if (member.level >= 5) return unchanged(state, "该职业已达到 Lv.5，可以使用转职手册");
  const cost = getLevelUpCost(member.level);
  if (state.research < cost) return unchanged(state, `升级需要 ${cost} 点研究`);
  const boosts = ROLE_LEVEL_BOOSTS[member.role] ?? { code: 2, scenario: 2, art: 2, sound: 2 };
  const nextLevel = member.level + 1;
  const unlockedNow = ROLE_UNLOCK_RULES.filter(rule => rule.role === member.role && rule.level === nextLevel);
  const newGenres = unlockedNow.filter(rule => !state.unlockedGenres.includes(rule.name)).map(rule => rule.name);
  return {
    state: {
      ...state,
      research: state.research - cost,
      staff: state.staff.map(item => item.id === member.id ? {
        ...item,
        level: nextLevel,
        code: item.code + (boosts.code ?? 0),
        scenario: item.scenario + (boosts.scenario ?? 0),
        art: item.art + (boosts.art ?? 0),
        sound: item.sound + (boosts.sound ?? 0),
        salary: getNextSalary(item.salary),
        masteredRoles: nextLevel === 5 ? Array.from(new Set([...(item.masteredRoles ?? []), item.role])) : item.masteredRoles,
      } : item),
      unlockedGenres: [...state.unlockedGenres, ...newGenres],
    },
    effects: [{ type: "toast", message: unlockedNow.length
      ? `${member.name} 升至 Lv.${nextLevel}，解锁“${unlockedNow.map(rule => rule.name).join("、")}”！`
      : `${member.name} 升至 Lv.${nextLevel}，能力提升！` }],
  };
}

export function expandOffice(state: GameState, action: Extract<ProgressionAction, { type: "expand-office" }>): EngineResult {
  if (state.companyLevel !== action.expectedLevel) return unchanged(state);
  if (state.companyLevel >= 3) return unchanged(state, "已经搬入最大的办公室");
  const nextLevel = (state.companyLevel + 1) as 2 | 3;
  const cost = OFFICE_UPGRADE_COSTS[nextLevel];
  if (nextLevel === 2 && (state.year < 4 || state.releases.length < 1 || state.cash < 1000)) {
    return unchanged(state, "第 4 年后，发售至少 1 款游戏并持有 ¥1,000千 才会收到搬迁邀请");
  }
  if (nextLevel === 3 && state.awards < 1 && state.year < 10) {
    return unchanged(state, "获得至少 1 次奖项，或经营到第 10 年后解锁大楼办公室");
  }
  if (state.cash < cost) return unchanged(state, `扩建需要 ${formatCash(cost)}`);
  return {
    state: { ...state, cash: state.cash - cost, companyLevel: nextLevel, industryNews: `像素工坊迁入第 ${nextLevel} 阶段办公室，团队规模进一步扩大。` },
    effects: [{ type: "event", event: {
      kind: "office", title: "办公室搬迁",
      headline: nextLevel === 2 ? "更宽敞的新办公室启用！" : "梦想中的游戏大楼落成！",
      body: `${getOfficeUnlocks(nextLevel).join("；")}。专属培训仍需对应职业。`,
      reward: `员工上限提升至 ${getOfficeCapacity(nextLevel)} 人`,
    } }],
  };
}
