"use client";

import { useCallback, useMemo, useRef, useState, type SetStateAction } from "react";

import { applyGameAction, type EngineResult, type GameAction } from "./engine";
import { createInitialGameState } from "./rules";
import type { GameState, RandomSource } from "./types";

type FieldSetter<Key extends keyof GameState> = (
  value: SetStateAction<GameState[Key]>,
) => void;

function resolveUpdate<Value>(current: Value, update: SetStateAction<Value>) {
  return typeof update === "function"
    ? (update as (value: Value) => Value)(current)
    : update;
}

/**
 * Keeps the permanent simulation state behind one commit boundary while exposing
 * field setters during the gradual page migration.
 */
export function useGameController() {
  const [game, setGame] = useState<GameState>(createInitialGameState);
  const gameRef = useRef(game);

  const replaceGame = useCallback((next: GameState) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  const setField = useCallback(
    <Key extends keyof GameState>(key: Key): FieldSetter<Key> =>
      (update) => {
        const current = gameRef.current;
        const next = {
          ...current,
          [key]: resolveUpdate(current[key], update),
        };
        replaceGame(next);
      },
    [replaceGame],
  );

  const dispatchGame = useCallback(
    (action: GameAction, random: RandomSource = Math.random): EngineResult => {
      const result = applyGameAction(gameRef.current, action, random);
      replaceGame(result.state);
      return result;
    },
    [replaceGame],
  );

  const setters = useMemo(() => ({
    setCash: setField("cash"),
    setFans: setField("fans"),
    setResearch: setField("research"),
    setYear: setField("year"),
    setMonth: setField("month"),
    setWeek: setField("week"),
    setStaff: setField("staff"),
    setProject: setField("project"),
    setReleases: setField("releases"),
    setCompanyLevel: setField("companyLevel"),
    setAwards: setField("awards"),
    setOwnConsole: setField("ownConsole"),
    setConsoleUsers: setField("consoleUsers"),
    setLastEventKey: setField("lastEventKey"),
    setFanSegments: setField("fanSegments"),
    setReputation: setField("reputation"),
    setGenreExperience: setField("genreExperience"),
    setThemeExperience: setField("themeExperience"),
    setUnlockedGenres: setField("unlockedGenres"),
    setUnlockedThemes: setField("unlockedThemes"),
    setCareerManuals: setField("careerManuals"),
    setEndingShown: setField("endingShown"),
    setEndingScore: setField("endingScore"),
    setInventory: setField("inventory"),
    setMerchantYear: setField("merchantYear"),
    setMerchantPurchases: setField("merchantPurchases"),
    setIndustryNews: setField("industryNews"),
  }), [setField]);

  return {
    game,
    gameRef,
    replaceGame,
    dispatchGame,
    ...setters,
  };
}
