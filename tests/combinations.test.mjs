import assert from "node:assert/strict";
import test from "node:test";
import { CONTENT_BALANCE, getReleaseFatigueMultiplier } from "../app/game-balance.ts";
import { COMBINATION_RULES, getCombination } from "../app/game/combinations.ts";
import { GENRES, GREAT_COMBOS, ROLE_UNLOCK_RULES, TRAINING_METHODS, PLATFORMS, DEFAULT_DIRECTION_POINTS } from "../app/game/data.ts";
import { applyGameAction } from "../app/game/engine.ts";
import { createInitialGameState } from "../app/game/rules.ts";
import { createGameProject, predictGamePlan } from "../app/game/predictions.ts";
import { parseSave, serializeGameState, migrateSave } from "../app/game/save.ts";

const input = (state = createInitialGameState(), genre = "桌游", theme = "历史") => ({ state, genre, theme, name: "组合验收", platform: PLATFORMS[0], direction: "均衡", directionPoints: DEFAULT_DIRECTION_POINTS });
const restore = state => parseSave(JSON.stringify(serializeGameState(state)));

test("all existing content is reachable through initial, career or actual training unlock paths", () => {
  const genres = [...GENRES, ...ROLE_UNLOCK_RULES.map(rule => rule.name)];
  let state = { ...createInitialGameState(), cash: 100000 };
  for (const method of TRAINING_METHODS) {
    const member = { ...state.staff[0], role: method.unlock.role, level: method.unlock.level, energy: 100 };
    state = applyGameAction({ ...state, staff: [member] }, { type: "train-staff", staffId: member.id, method }, () => .5).state;
    assert.ok(state.unlockedThemes.includes(method.unlock.name));
  }
  const themes = state.unlockedThemes;
  assert.deepEqual(new Set([...genres, ...themes]), new Set(Object.keys(CONTENT_BALANCE)));
  for (const genre of genres) for (const theme of themes) assert.ok(getCombination(genre, theme).rating in COMBINATION_RULES);
  for (const key of GREAT_COMBOS) {
    const [genre, theme] = key.split("|");
    assert.ok(genres.includes(genre) && themes.includes(theme));
    assert.equal(getCombination(genre, theme).rating, "great");
  }
});

test("five affinity tiers affect starting quality, hype and demand independently of popularity and fatigue", () => {
  const cases = [["桌游", "历史", "great"], ["益智", "机器人", "good"], ["桌游", "海盗", "normal"], ["教育", "海盗", "awkward"], ["知识问答", "海盗", "poor"]];
  const sales = [];
  for (const [genre, theme, rating] of cases) {
    const project = createGameProject(input(undefined, genre, theme));
    const rule = COMBINATION_RULES[rating];
    assert.equal(project.combination, rating);
    assert.equal(project.fun, 6 + rule.quality);
    assert.equal(project.creativity, 5 + rule.quality);
    assert.equal(project.hype, 2 + rule.hype);
    assert.equal(project.contentPopularity, Math.sqrt(CONTENT_BALANCE[genre].popularity * CONTENT_BALANCE[theme].popularity) * rule.demand);
    const finished = applyGameAction({ ...createInitialGameState(), project }, { type: "complete-project" }, () => .5).state;
    sales.push(finished.releases[0].sales);
    assert.equal(finished.combinationDiscoveries[`${genre}|${theme}`], rating);
  }
  assert.ok(sales.every((value, index) => index === 0 || value < sales[index - 1]));
  const state = { ...createInitialGameState(), combinationDiscoveries: { "桌游|历史": "great" }, releases: Array.from({ length: 4 }, () => ({ genre: "桌游", theme: "历史" })) };
  const forecast = predictGamePlan(input(state));
  assert.equal(forecast.combinationLevel, "杰作相性");
  assert.equal(forecast.fatiguePercent, 65);
  assert.equal(forecast.popularityPercent, 90);
  assert.equal(getReleaseFatigueMultiplier([{ genre: "冒险", theme: "动物" }, { genre: "益智", theme: "机器人" }, { genre: "教育", theme: "忍者" }, { genre: "音乐", theme: "校园" }, ...state.releases], "桌游", "历史"), 1);
});

test("discovery happens on release, persists, and removes the unknown prediction label", () => {
  const state = createInitialGameState();
  const forecast = predictGamePlan(input(state));
  assert.match(forecast.combinationLevel, /未发现/);
  assert.ok(forecast.advantages.every(item => !item.text.includes("杰作")));
  assert.ok(forecast.durationWeeks && forecast.qualityRange && forecast.cost > 0);
  const project = createGameProject(input(state));
  const started = applyGameAction(state, { type: "start-project", project, cost: project.developmentCost }).state;
  assert.deepEqual(started.combinationDiscoveries, {});
  const released = applyGameAction(started, { type: "complete-project" }, () => .5);
  const restored = restore(released.state);
  assert.equal(restored.combinationDiscoveries["桌游|历史"], "great");
  assert.equal(restored.releases[0].combo, "great");
  assert.equal(predictGamePlan(input(restored)).combinationLevel, "杰作相性");
  assert.ok(released.effects[0].review.results.some(entry => entry.label === "组合相性" && entry.value === "杰作"));
});

test("legacy history only proves an attempt, and old projects keep their already-applied balance", () => {
  const base = createInitialGameState();
  const project = { ...createGameProject(input(base, "教育", "海盗")), combination: undefined, fun: 6, creativity: 5, hype: 2, contentPopularity: .92 };
  const raw = { ...serializeGameState(base), schemaVersion: 7, project, releases: [{ id: "release-1", name: "旧作", genre: "教育", theme: "海盗", combo: "normal", score: 20, sales: 100, income: 1, weeks: 1 }] };
  delete raw.combinationDiscoveries;
  const migrated = migrateSave(raw);
  assert.deepEqual(migrated.project, { ...project, challengeCount: 0 });
  assert.equal(migrated.combinationDiscoveries["教育|海盗"], "tried");
  const finished = applyGameAction(migrated, { type: "complete-project" }, () => .5).state;
  assert.equal(finished.releases[0].combo, "normal");
  assert.equal(finished.combinationDiscoveries["教育|海盗"], "tried");
  const next = createGameProject(input(finished, "教育", "海盗"));
  assert.equal(next.combination, "awkward");
  assert.equal(next.fun, 5); // One prior release grants experience but not a level yet.
  assert.equal(restore(finished).combinationDiscoveries["教育|海盗"], "tried");
});
