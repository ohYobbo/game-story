import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DIRECTION_POINTS, PLATFORMS } from "../app/game/data.ts";
import { applyGameAction } from "../app/game/engine.ts";
import { seededRandom, simulateProject } from "../app/game/forecast.ts";
import { createGameProject } from "../app/game/predictions.ts";
import { createInitialGameState } from "../app/game/rules.ts";

function opening(seed, theme, policy) {
  const initial = createInitialGameState();
  const random = seededRandom(seed);
  const project = createGameProject({ state: initial, name: "开局回归", platform: PLATFORMS[0], genre: "桌游", theme, direction: "均衡", directionPoints: { ...DEFAULT_DIRECTION_POINTS, polish: 8 } });
  const result = simulateProject(initial, project, random, policy === "off" ? "skip" : policy, policy !== "off");
  if (result.blocked) return result;
  let state = result.state;
  // Observe 100 weeks of product income, excluding payroll and optional operations.
  // Integer rounding can keep a 1-2 copy tail alive beyond this observation window.
  for (let tick = 0; tick < 400 && state.releases.some(release => release.weeklySales > 0); tick += 1) {
    state = applyGameAction(state, { type: "tick", isNewWeek: (tick + 1) % 4 === 0, allowStaffChallenge: false }, random).state;
  }
  return { ...result, score: result.review.scores.reduce((sum, value) => sum + value, 0), research: state.research - initial.research, profit: state.cash - initial.cash };
}

const runs = (theme, policy) => Array.from({ length: 256 }, (_, index) => opening(index + 1, theme, policy));
const average = (values, key) => values.reduce((sum, value) => sum + value[key], 0) / values.length;
const normal = runs("海盗", "off");
const great = runs("历史", "off");

test("current-engine ordinary opening meets the original research and product-return targets", (t) => {
  assert.ok(normal.every(run => !run.blocked && run.challenges === 0));
  assert.ok(average(normal, "weeks") >= 20 && average(normal, "weeks") <= 50);
  assert.ok(average(normal, "score") >= 14 && average(normal, "score") <= 24);
  for (const values of [normal, Array.from({ length: 256 }, (_, index) => opening(index + 10001, "海盗", "off"))]) {
    assert.ok(values.every(run => !run.blocked));
    assert.ok(average(values, "research") >= 8 && average(values, "research") <= 30);
    assert.ok(average(values, "profit") >= 50 && average(values, "profit") <= 200);
    t.diagnostic(JSON.stringify(Object.fromEntries(["weeks", "score", "research", "profit"].map(key => [key, average(values, key)]))));
  }
});

test("the real great combination improves reviews without making the opening a guaranteed Hall of Fame", () => {
  assert.ok(great.every(run => !run.blocked));
  assert.ok(average(great, "score") > average(normal, "score"));
  assert.ok(great.filter(run => run.score >= 32).length / great.length < .05);
});

for (const policy of ["skip", "steady"]) {
  test("challenge-enabled opening with " + policy + " recovers previously stranded teams and completes every seed", (t) => {
    const values = runs("海盗", policy);
    const completed = values.filter(run => !run.blocked);
    assert.equal(completed.length, 256);
    assert.equal(completed.filter(run => run.recoveryWeeks > 0).length, 4);
    assert.ok(completed.every(run => run.challenges <= 2 && run.challenges >= 1));
    assert.ok(average(completed, "weeks") >= 20 && average(completed, "weeks") <= 50);
    assert.ok(average(completed, "research") >= 8 && average(completed, "research") <= 30);
    assert.ok(average(completed, "profit") >= 50 && average(completed, "profit") <= 200);
    t.diagnostic(JSON.stringify(Object.fromEntries(["weeks", "score", "research", "profit"].map(key => [key, average(completed, key)]))));
  });
}
