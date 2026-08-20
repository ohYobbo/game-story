import assert from "node:assert/strict";
import test from "node:test";

import { ADVERTISING_METHODS, PLATFORMS, TRAINING_METHODS } from "../app/game/data.ts";
import { applyGameAction } from "../app/game/engine.ts";
import {
  createGameProject,
  predictEarlyRelease,
  predictGamePlan,
  predictMarketing,
  predictStageLead,
  predictTraining,
} from "../app/game/predictions.ts";
import { createInitialGameState } from "../app/game/rules.ts";

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
