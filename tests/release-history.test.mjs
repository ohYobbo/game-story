import assert from "node:assert/strict";
import test from "node:test";
import { applyGameAction } from "../app/game/engine.ts";
import { createGameProject } from "../app/game/predictions.ts";
import { DEFAULT_DIRECTION_POINTS, PLATFORMS } from "../app/game/data.ts";
import { createInitialGameState } from "../app/game/rules.ts";
import { migrateSave, parseSave, serializeGameState } from "../app/game/save.ts";

const roundTrip = state => parseSave(JSON.stringify(serializeGameState(state)));
function finish(state, overrides = {}) {
  const project = { ...createGameProject({ state, name: "同名作品", platform: PLATFORMS[0], genre: "桌游", theme: "历史", direction: "均衡", directionPoints: DEFAULT_DIRECTION_POINTS }), fun: 90, creativity: 80, graphics: 70, sound: 60, bugs: 2, ...overrides };
  return applyGameAction({ ...state, project }, { type: "complete-project", project }, () => .5);
}

test("same-name releases have stable distinct identities and only the selected predecessor is consumed", () => {
  let state = finish(createInitialGameState()).state;
  state = roundTrip(finish(state).state);
  const selected = state.releases[1];
  const planned = createGameProject({ state, name: "续作", platform: PLATFORMS[0], genre: "桌游", theme: "历史", direction: "均衡", directionPoints: DEFAULT_DIRECTION_POINTS, sequel: selected });
  assert.equal(planned.sequelOfId, selected.id);
  const result = finish(state, { sequelOfId: planned.sequelOfId });
  assert.equal(result.state.releases[2].sequelEligible, false);
  assert.equal(result.state.releases[1].sequelEligible, true);
  assert.equal(result.state.releases[0].sequelOfId, selected.id);
  assert.equal(new Set(result.state.releases.map(item => item.id)).size, 3);
  assert.deepEqual(roundTrip(result.state), result.state);
  const duplicate = applyGameAction(result.state, { type: "complete-project" }, () => { throw Error("duplicate release"); });
  assert.strictEqual(duplicate.state, result.state);
});

test("more than 32 releases preserve totals, old records, and long-tail sales across reload", () => {
  let state = finish(createInitialGameState(), { name: "最早纪录" }).state;
  state.releases[0] = { ...state.releases[0], score: 40, sales: 1_000_000, income: 10_000, weeklySales: 1000, remainingDemand: 2000 };
  for (let index = 0; index < 39; index++) state = finish(state).state;
  state = roundTrip(state);
  assert.equal(state.releases.length, 40);
  assert.equal(new Set(state.releases.map(item => item.id)).size, 40);
  const total = state.releases.reduce((sum, item) => sum + item.sales, 0);
  const tick = applyGameAction(state, { type: "tick", isNewWeek: true }, () => .5).state;
  assert.ok(tick.releases[39].sales > 1_000_000);
  assert.ok(tick.releases.reduce((sum, item) => sum + item.sales, 0) > total);
  const ending = applyGameAction({ ...tick, year: 20, lastAwardYear: 19 }, { type: "scheduled-event" }, () => .5);
  assert.equal(ending.state.endingReport.performance.bestSeller.name, "最早纪录");
  assert.equal(ending.state.endingReport.performance.bestProfit.name, "最早纪录");
});

test("release snapshots freeze final quality, bugs, combination and known development cost", () => {
  const { state } = finish(createInitialGameState());
  const release = state.releases[0];
  assert.deepEqual(release.finalQuality, { fun: 90, creativity: 80, graphics: 70, sound: 60, bugs: 2 });
  assert.equal(release.combo, "great");
  assert.equal(release.developmentCost, 55);
  const after = applyGameAction(state, { type: "tick", isNewWeek: true }, () => .5).state;
  assert.deepEqual(roundTrip(after).releases[0].finalQuality, release.finalQuality);
});

test("legacy migration keeps unknown facts unknown and never guesses ambiguous sequel names", () => {
  const legacy = { ...createInitialGameState(), schemaVersion: 6, releases: [{ name: "旧作", score: 35, sales: 100, income: 999999, weeks: 5 }] };
  delete legacy.releaseHistoryIncomplete;
  legacy.project = { ...createGameProject({ state: legacy, name: "旧续作", platform: PLATFORMS[0], genre: "桌游", theme: "海盗", direction: "均衡", directionPoints: DEFAULT_DIRECTION_POINTS }), sequelOf: "旧作" };
  const copy = structuredClone(legacy);
  const migrated = migrateSave(legacy);
  assert.deepEqual(legacy, copy);
  assert.equal(migrated.releaseHistoryIncomplete, true);
  for (const field of ["finalQuality", "combo", "developmentCost", "genre", "theme"]) assert.equal(migrated.releases[0][field], undefined);
  assert.equal(migrated.project.sequelOfId, migrated.releases[0].id);
  assert.deepEqual(roundTrip(migrated), migrated);
  const ambiguous = migrateSave({ ...legacy, releases: [...legacy.releases, ...legacy.releases] });
  assert.equal(ambiguous.project.sequelOfId, undefined);
  const ending = applyGameAction({ ...migrated, year: 20, lastAwardYear: 19 }, { type: "scheduled-event" });
  assert.equal(ending.state.endingReport.performance.bestProfit, null);
  assert.equal(ending.state.endingReport.performance.releaseHistoryIncomplete, true);
});

test("migration allocates beyond retained IDs and prevents future collisions", () => {
  const state = finish(createInitialGameState()).state;
  state.releases[0].id = "release-100";
  state.releases.push({ ...state.releases[0] });
  const migrated = roundTrip(state);
  assert.equal(new Set(migrated.releases.map(item => item.id)).size, 2);
  const completed = finish(migrated).state;
  assert.equal(new Set(completed.releases.map(item => item.id)).size, 3);
});
