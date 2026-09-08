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

test("current-engine opening baseline: 45.85 weeks, 20.80 review, 40.74 RP, 202.56K product profit", () => {
  assert.ok(normal.every(run => !run.blocked && run.challenges === 0));
  assert.ok(average(normal, "weeks") >= 20 && average(normal, "weeks") <= 50);
  assert.ok(average(normal, "score") >= 14 && average(normal, "score") <= 24);
  // Characterization of the actual engine, NOT acceptance of the old 8-30 RP / 50-200K targets.
  // The unresolved balance decision and the reason for replacing the old simulator are in ROADMAP.md.
  assert.equal(average(normal, "research"), 40.73828125);
  assert.equal(average(normal, "profit"), 202.55859375);
});

test("the real great combination improves reviews without making the opening a guaranteed Hall of Fame", () => {
  assert.ok(great.every(run => !run.blocked));
  assert.ok(average(great, "score") > average(normal, "score"));
  assert.ok(great.filter(run => run.score >= 32).length / great.length < .05);
});

for (const policy of ["skip", "steady"]) {
  test("challenge-enabled opening with " + policy + " records both completed and unavailable-lead runs", () => {
    const values = runs("海盗", policy);
    const completed = values.filter(run => !run.blocked);
    assert.equal(completed.length, 252);
    assert.ok(completed.every(run => run.challenges <= 2 && run.challenges >= 1));
    assert.ok(average(completed, "weeks") >= 20 && average(completed, "weeks") <= 50);
    for (const blocked of values.filter(run => run.blocked)) {
      assert.ok(blocked.state.project);
      assert.ok(blocked.state.staff.every(member => member.resting || member.energy <= 10));
    }
  });
}
