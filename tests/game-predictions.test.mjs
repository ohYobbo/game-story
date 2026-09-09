import assert from "node:assert/strict";
import test from "node:test";

import { ADVERTISING_METHODS, CONTRACTS, DIRECTIONS, PLATFORMS, TRAINING_METHODS } from "../app/game/data.ts";
import { applyGameAction } from "../app/game/engine.ts";
import {
  createGameProject,
  predictEarlyRelease,
  predictContract,
  predictConsole,
  predictGamePlan,
  predictMarketing,
  predictStageLead,
  predictTraining,
} from "../app/game/predictions.ts";
import { createInitialGameState } from "../app/game/rules.ts";

import { forecastProject, simulateProject, seededRandom } from "../app/game/forecast.ts";

function planInput(state = createInitialGameState()) {
  return {
    state,
    name: "预测测试作",
    platform: PLATFORMS[0],
    genre: "桌游",
    theme: "海盗",
    direction: "均衡",
    directionPoints: {
      cuteness: 0,
      realism: 0,
      approachability: 0,
      niche: 0,
      simplicity: 0,
      innovation: 0,
      gameWorld: 0,
      polish: 0,
    },
  };
}

test("plan prediction and project creation share the same starting formulas", () => {
  const input = planInput();
  const project = createGameProject(input);
  const prediction = predictGamePlan(input);

  assert.deepEqual(prediction.project, project);
  assert.equal(prediction.cost, project.developmentCost);
  assert.ok(prediction.durationWeeks.min <= prediction.durationWeeks.max);
  assert.ok(prediction.qualityRange.min <= prediction.qualityRange.max);
  assert.equal(prediction.advantages.length, 2);
  assert.equal(prediction.risks.length, 2);
});

test("the planning interval covers the audited 42.5-week opening instead of promising 21-29 weeks", () => {
  const input = planInput();
  input.directionPoints.polish = 8;
  const prediction = predictGamePlan(input);
  assert.ok(prediction.durationWeeks.min <= 42.5 && prediction.durationWeeks.max >= 42.5,
    `42.5 weeks must fit ${JSON.stringify(prediction.durationWeeks)}`);
});

test("the recommended lead ranks actual opening contribution, including energy and role fit", () => {
  const initial = createInitialGameState();
  const state = { ...initial, staff: [
    { ...initial.staff[0], scenario: 50, energy: 11 },
    { ...initial.staff[1], scenario: 45, energy: 100 },
  ] };
  const project = createGameProject(planInput(state));
  const tired = predictStageLead(state, project, state.staff[0]);
  const fit = predictStageLead(state, project, state.staff[1]);
  assert.equal(fit.contributionLevel, "最佳");
  assert.notEqual(tired.contributionLevel, "最佳");
  assert.ok(tired.gapToBest > 0);
  assert.equal(fit.gapToBest, 0);
});

test("stage-lead prediction contains the engine's committed tick result", () => {
  const initial = createInitialGameState();
  const project = createGameProject(planInput(initial));
  const member = initial.staff[1];
  const prediction = predictStageLead(initial, project, member);
  let state = applyGameAction(
    { ...initial, project },
    {
      type: "choose-lead",
      leadStaffId: member.id,
      leadName: member.name,
      leadSkill: member.scenario,
    },
  ).state;
  const before = state.project.stageProgress;
  state = applyGameAction(state, { type: "tick", isNewWeek: false }, () => .5).state;
  const actual = state.project.stageProgress - before;

  assert.ok(actual >= prediction.progressRange.min);
  assert.ok(actual <= prediction.progressRange.max);
});

test("repeating the same stage lead applies the displayed decay", () => {
  const initial = createInitialGameState();
  const project = createGameProject(planInput(initial));
  const member = initial.staff[1];
  const state = { ...initial, project, lastStageLeads: { planning: member.id } };
  const prediction = predictStageLead(state, project, member);
  const result = applyGameAction(state, {
    type: "choose-lead",
    leadStaffId: member.id,
    leadName: member.name,
    leadSkill: member.scenario,
  });

  assert.equal(prediction.repeated, true);
  assert.equal(result.state.project.leadSkill, prediction.effectiveSkill);
});

test("training and marketing previews equal their non-random committed changes", () => {
  const initial = { ...createInitialGameState(), cash: 5_000 };
  const member = initial.staff[0];
  const training = TRAINING_METHODS[0];
  const trainingPrediction = predictTraining(member, training, initial.unlockedThemes);
  let result = applyGameAction(
    initial,
    { type: "train-staff", staffId: member.id, method: training },
    () => .99,
  );
  const trained = result.state.staff[0];
  assert.equal(
    trained.scenario - member.scenario,
    trainingPrediction.gains.find((gain) => gain.key === "scenario").min,
  );

  const project = createGameProject(planInput(initial));
  const marketingState = { ...initial, project };
  const method = ADVERTISING_METHODS[1];
  const marketing = predictMarketing(marketingState, method);
  result = applyGameAction(marketingState, {
    type: "apply-marketing",
    name: method.name,
    cost: method.cost,
    hype: method.hype,
    segment: method.segment,
  });
  assert.equal(result.state.project.hype - project.hype, marketing.effectiveHype);
  assert.equal(result.state.fans - marketingState.fans, marketing.fanGain);
});

test("early-release score and sales ranges contain actual review results", () => {
  const initial = createInitialGameState();
  const project = {
    ...createGameProject(planInput(initial)),
    fun: 28,
    creativity: 26,
    graphics: 24,
    sound: 20,
    bugs: 8,
  };
  const prediction = predictEarlyRelease(initial, project);
  const result = applyGameAction(
    { ...initial, project },
    { type: "complete-project", project },
    () => .5,
  );
  const review = result.effects.find((effect) => effect.type === "review").review;
  const score = review.scores.reduce((sum, value) => sum + value, 0);

  assert.ok(score >= prediction.scoreRange.min && score <= prediction.scoreRange.max);
  assert.ok(review.sales >= prediction.salesRange.min && review.sales <= prediction.salesRange.max);
});

// Observed sample envelopes must cover at least 80% of independent completed holdouts.
// Blocked runs are counted separately; no interval promises completion without available leads.
test("engine forecasts cover independent seeds across directions, combinations and teams", () => {
  const base = createInitialGameState();
  for (const direction of DIRECTIONS) {
    for (const size of [2, 4, 8]) {
      const staff = Array.from({ length: size }, (_, index) => ({
        ...base.staff[index % 2], id: index + 1,
        energy: size === 4 ? 20 : 100,
      }));
      const state = { ...base, staff, lastStageLeads: size === 8 ? { planning: 2, coding: 1, graphics: 1, sound: 2 } : {} };
      const input = { ...planInput(state), direction: direction.name, theme: size === 8 ? "历史" : "海盗" };
      input.directionPoints.polish = 8;
      const project = createGameProject(input);
      const before = structuredClone(state);
      const forecast = forecastProject(state, project);
      assert.deepEqual(state, before, "preview must not mutate live state");
      const holdouts = Array.from({ length: 32 }, (_, index) => simulateProject(state, project, seededRandom(index + 10001))).filter(run => !run.blocked);
      if (!holdouts.length) { assert.ok(forecast.blockedRuns > 0); continue; }
      assert.ok(forecast.durationWeeks && forecast.qualityRange);
      const covered = holdouts.filter(run => {
        const p = run.finalProject, quality = (p.fun + p.creativity + p.graphics + p.sound) / 4;
        return run.weeks >= forecast.durationWeeks.min && run.weeks <= forecast.durationWeeks.max && quality >= forecast.qualityRange.min && quality <= forecast.qualityRange.max;
      });
      assert.ok(covered.length / holdouts.length >= .8, direction.name + "/" + size + ": " + covered.length + "/" + holdouts.length);
    }
  }
});

test("tired teams include recovery while empty teams have no misleading finite forecast", () => {
  const initial = createInitialGameState();
  const input = planInput({ ...initial, cash: 1000, staff: initial.staff.map(member => ({ ...member, resting: true, energy: 5 })) });
  input.platform = { ...input.platform, retire: initial.year };
  const prediction = predictGamePlan(input);
  assert.ok(prediction.durationWeeks);
  assert.ok(forecastProject(input.state, prediction.project).recoveryRuns > 0);
  const empty = predictGamePlan({ ...input, state: { ...input.state, staff: [] } });
  assert.equal(empty.durationWeeks, null);
  assert.equal(empty.qualityRange, null);
  const poor = predictGamePlan({ ...input, state: { ...input.state, cash: 0 } });
  for (const message of ["资金缺口", "退市", "体力偏低"]) assert.ok(poor.risks.some(risk => risk.text.includes(message)));
  const rested = { ...initial, staff: [{ ...initial.staff[0], scenario: 100, resting: true }, initial.staff[1]] };
  const project = createGameProject(planInput(rested));
  assert.equal(predictStageLead(rested, project, rested.staff[0]).contributionLevel, "休息");
  assert.equal(predictStageLead(rested, project, rested.staff[1]).contributionLevel, "最佳");
});

test("contract deadline risk and console forecasts match independent production-engine runs", () => {
  const initial = createInitialGameState();
  const state = { ...initial, staff: initial.staff.map(member => ({ ...member, energy: 20 })) };
  for (const contract of CONTRACTS) {
    const prediction = predictContract(state, contract);
    for (const seed of [2001, 2002, 2003]) {
      const project = { kind: "contract", name: contract.name, platform: "委托", genre: "外包", theme: "", direction: "均衡", progress: 0, target: contract.target, fun: 0, creativity: 0, graphics: 0, sound: 0, bugs: 0, hype: 0, reward: contract.reward, elapsedWeeks: 0, deadlineWeeks: Number.MAX_SAFE_INTEGER, qualityTargets: contract.requirements };
      const actual = simulateProject(state, project, seededRandom(seed));
      assert.ok(actual.weeks >= prediction.durationWeeks.min && actual.weeks <= prediction.durationWeeks.max);
      const timed = simulateProject(state, { ...project, deadlineWeeks: contract.deadline }, seededRandom(seed));
      assert.equal(timed.state.cash > state.cash, actual.weeks <= contract.deadline);
    }
  }
  const prediction = predictConsole(state, 1.2, 200);
  const project = { kind: "console", name: "主机", platform: "硬件研发", genre: "自研主机", theme: "次世代", direction: "重视品质", progress: 0, target: Math.round(560 * 1.2), fun: 0, creativity: 0, graphics: 0, sound: 0, bugs: 0, hype: 25, consoleSpec: { cpu: "", media: "", body: "", performance: 1.2, cost: 200 } };
  const actual = simulateProject(state, project, seededRandom(3001));
  assert.ok(actual.weeks >= prediction.durationWeeks.min && actual.weeks <= prediction.durationWeeks.max);
  assert.ok(actual.state.consoleUsers >= prediction.userRange.min && actual.state.consoleUsers <= prediction.userRange.max);
});
