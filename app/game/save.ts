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
import { combinationKey } from "./combinations.ts";

export const SAVE_SCHEMA_VERSION = 11;
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
    (saved.balanceVersion ?? 1) < 2 &&
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
    : migratedProject ? { ...migratedProject } : null;
  if (project && (project.waitingForLeadRecovery !== true || project.kind !== "game" ||
    project.stage === "debug" || project.leadName || project.pendingChallenge || !staff.length)) {
    delete project.waitingForLeadRecovery;
  }
  const usedIds = new Set((saved.releases ?? []).map(item => item.id).filter(Boolean));
  let nextReleaseNumber = Math.max(1, Math.floor(saved.nextReleaseNumber ?? 1));
  for (const id of usedIds) {
    const match = /^release-(\d+)$/.exec(id);
    if (match) nextReleaseNumber = Math.max(nextReleaseNumber, Number(match[1]) + 1);
  }
  const allocateId = () => {
    while (usedIds.has(`release-${nextReleaseNumber}`)) nextReleaseNumber += 1;
    const id = `release-${nextReleaseNumber++}`;
    usedIds.add(id);
    return id;
  };
  const seenIds = new Set<string>();
  const releases = (saved.releases ?? []).map((item) => {
    const id = item.id && !seenIds.has(item.id) ? item.id : allocateId();
    seenIds.add(id);
    return {
      ...item,
      id,
      sequelEligible: item.sequelEligible ?? item.score >= HALL_OF_FAME_SCORE,
      weeklyRank:
        item.weeklyRank ?? getSalesRank(item.weeklySales ?? 0, saved.year ?? 1),
    };
  });
  // Old in-flight sequels used a name. Ambiguous names must not consume either predecessor.
  if (project?.sequelOf && !project.sequelOfId) {
    const matches = releases.filter(item => item.name === project.sequelOf);
    if (matches.length === 1) project.sequelOfId = matches[0].id;
  }
  const companyLevel =
    staff.length > 6
      ? 3
      : staff.length > 4
        ? Math.max(2, saved.companyLevel ?? 1)
        : saved.companyLevel ?? 1;

  const combinationDiscoveries = { ...(saved.combinationDiscoveries ?? {}) };
  for (const release of releases) {
    if (release.genre && release.theme) {
      const key = combinationKey(release.genre, release.theme);
      combinationDiscoveries[key] ??= "tried";
    }
  }
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
    nextReleaseNumber,
    combinationDiscoveries,
    platformLicenses: [...new Set([
      ...(Array.isArray(saved.platformLicenses) ? saved.platformLicenses.filter(name => typeof name === "string") : []),
      ...((saved.schemaVersion ?? 0) < 9 ? [
        ...releases.map(item => item.platform),
        project?.kind === "game" ? project.platform : undefined,
      ].filter((name): name is string => Boolean(name)) : []),
    ])],
    releaseHistoryIncomplete: saved.releaseHistoryIncomplete ?? (releases.length > 0 && (saved.schemaVersion ?? 0) < 7),
    companyLevel,
    awards: saved.awards ?? 0,
    awardHistory: structuredClone(saved.awardHistory ?? []),
    // Legacy December saves may already include that year's old ceremony rewards.
    // Preserve totals and conservatively skip unverifiable past ceremonies.
    lastAwardYear: (saved.schemaVersion ?? 0) < 10
      ? Math.max(0, saved.year - (saved.month === 12 ? 0 : 1))
      : saved.lastAwardYear ?? 0,
    awardHistoryIncomplete: saved.awardHistoryIncomplete || ((saved.schemaVersion ?? 0) < 10 && (saved.year > 1 || saved.month === 12 || (saved.awards ?? 0) > 0)),
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
    endingReport: saved.endingReport ? structuredClone(saved.endingReport)
      : saved.endingShown ? { settledAt: null, cash: saved.endingScore ?? 0, performance: null } : null,
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
    combinationDiscoveries: { ...state.combinationDiscoveries },
    platformLicenses: [...state.platformLicenses],
    awardHistory: structuredClone(state.awardHistory),
    endingReport: structuredClone(state.endingReport),
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
