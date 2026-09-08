import { BALANCE_VERSION, HALL_OF_FAME_SCORE } from "../game-balance.ts";
import {
  GENRES,
  INITIAL_FAN_SEGMENTS,
  INITIAL_INVENTORY,
  INITIAL_STAFF,
  THEMES,
} from "./data.ts";
import {
  createInitialGameState,
  getSalesRank,
  normalizeStaff,
} from "./rules.ts";
import type { GameState, LegacySaveState, SaveState } from "./types";

export const SAVE_SCHEMA_VERSION = 5;
export const SAVE_STORAGE_KEY = "pixel-studio-save";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function migrateSave(value: unknown): GameState | null {
  if (!isRecord(value)) return null;
  const saved = value as LegacySaveState;
  if (
    typeof saved.year !== "number" ||
    typeof saved.month !== "number" ||
    typeof saved.week !== "number"
  ) {
    return null;
  }

  const initial = createInitialGameState();
  const legacyStaff = Array.isArray(saved.staff) ? saved.staff : INITIAL_STAFF;
  const migrateUntouchedOpening =
    (saved.balanceVersion ?? 1) < BALANCE_VERSION &&
    saved.year === 1 &&
    saved.month === 4 &&
    saved.week === 1 &&
    saved.cash === 5000 &&
    !saved.project &&
    (saved.releases?.length ?? 0) === 0 &&
    legacyStaff.length === 4;
  const staff = (migrateUntouchedOpening ? INITIAL_STAFF : legacyStaff).map(
    normalizeStaff,
  );
  const migratedProject =
    saved.project?.kind === "game" && !saved.project.stage
      ? {
          ...saved.project,
          stage: "coding" as const,
          stageProgress: saved.project.progress,
          stageTarget: saved.project.target,
          leadStaffId: staff[0]?.id,
          leadName: staff[0]?.name,
          leadSkill: staff[0]?.code ?? 10,
          elapsedWeeks: 0,
        }
      : saved.project ?? null;
  const project = migratedProject?.kind === "game"
    ? {
        ...migratedProject,
        challengeCount: migratedProject.challengeCount ?? 0,
      }
    : migratedProject;
  const releases = (saved.releases ?? []).map((item) => ({
    ...item,
    genre: item.genre ?? "角色扮演",
    theme: item.theme ?? "幻想",
    sequelEligible: item.sequelEligible ?? item.score >= HALL_OF_FAME_SCORE,
    weeklyRank:
      item.weeklyRank ?? getSalesRank(item.weeklySales ?? 0, saved.year ?? 1),
  }));
  const companyLevel =
    staff.length > 6
      ? 3
      : staff.length > 4
        ? Math.max(2, saved.companyLevel ?? 1)
        : saved.companyLevel ?? 1;

  return {
    ...initial,
    cash: migrateUntouchedOpening ? initial.cash : saved.cash ?? initial.cash,
    fans: migrateUntouchedOpening ? initial.fans : saved.fans ?? initial.fans,
    research: migrateUntouchedOpening
      ? initial.research
      : saved.research ?? initial.research,
    year: saved.year,
    month: saved.month,
    week: saved.week,
    staff,
    project,
    releases,
    companyLevel,
    awards: saved.awards ?? 0,
    ownConsole: saved.ownConsole ?? false,
    consoleUsers: saved.consoleUsers ?? 0,
    lastEventKey: saved.lastEventKey ?? "",
    fanSegments: { ...(saved.fanSegments ?? INITIAL_FAN_SEGMENTS) },
    reputation: migrateUntouchedOpening
      ? initial.reputation
      : saved.reputation ?? initial.reputation,
    genreExperience: { ...(saved.genreExperience ?? {}) },
    themeExperience: { ...(saved.themeExperience ?? {}) },
    unlockedGenres: [
      ...(migrateUntouchedOpening ? GENRES : saved.unlockedGenres ?? GENRES),
    ],
    unlockedThemes: [
      ...(migrateUntouchedOpening ? THEMES : saved.unlockedThemes ?? THEMES),
    ],
    careerManuals: saved.careerManuals ?? 0,
    endingShown: saved.endingShown ?? false,
    endingScore: saved.endingScore ?? 0,
    inventory: { ...(saved.inventory ?? INITIAL_INVENTORY) },
    merchantYear: saved.merchantYear ?? 0,
    merchantPurchases: saved.merchantPurchases ?? 0,
    industryNews:
      saved.industryNews ?? "游戏行业正在迎来新一轮主机竞争。",
    lastStageLeads: { ...(saved.lastStageLeads ?? {}) },
  };
}

export function serializeGameState(state: GameState): SaveState {
  return {
    ...state,
    staff: state.staff.map((member) => ({ ...member })),
    project: state.project ? { ...state.project } : null,
    releases: state.releases.map((release) => ({ ...release })),
    fanSegments: { ...state.fanSegments },
    genreExperience: { ...state.genreExperience },
    themeExperience: { ...state.themeExperience },
    unlockedGenres: [...state.unlockedGenres],
    unlockedThemes: [...state.unlockedThemes],
    inventory: { ...state.inventory },
    lastStageLeads: { ...state.lastStageLeads },
    schemaVersion: SAVE_SCHEMA_VERSION,
    balanceVersion: BALANCE_VERSION,
  };
}

export function parseSave(serialized: string | null): GameState | null {
  if (!serialized) return null;
  try {
    return migrateSave(JSON.parse(serialized));
  } catch {
    return null;
  }
}
