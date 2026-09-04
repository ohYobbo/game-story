import assert from "node:assert/strict";
import test from "node:test";

import { STAGE_INFO } from "../app/game/data.ts";
import { applyGameAction } from "../app/game/engine.ts";
import { predictStageLead } from "../app/game/predictions.ts";
import { createInitialGameState, getStageTarget } from "../app/game/rules.ts";
import { advanceStageCreation } from "../app/game/stage-sequence.ts";

const stageCases = [
  ["planning", "编剧", "scenario", "creativity"],
  ["coding", "程序员", "code", "fun"],
  ["graphics", "美术", "art", "graphics"],
  ["sound", "音效师", "sound", "sound"],
];

function projectFor(stage) {
  return {
    kind: "game",
    name: `阶段演出-${stage}`,
    platform: "个人电脑",
    genre: "桌游",
    theme: "海盗",
    direction: "均衡",
    progress: 0,
    target: 270,
    fun: 6,
    creativity: 5,
    graphics: 4,
    sound: 3,
    bugs: 0,
    hype: 2,
    stage,
    stageProgress: 0,
    stageTarget: getStageTarget(stage, "均衡"),
    elapsedWeeks: 0,
  };
}

function leadFor(role, skill) {
  return {
    ...createInitialGameState().staff[0],
    id: 91,
    name: `${role}负责人`,
    role,
    code: 8,
    scenario: 8,
    art: 8,
    sound: 8,
    [skill]: 28,
    energy: 82,
    maxPower: 12,
    resting: false,
  };
}

test("all four internal stage leads commit opening output before animation", () => {
  for (const [stage, role, skill, highlightedMetric] of stageCases) {
    const lead = leadFor(role, skill);
    const initial = {
      ...createInitialGameState(),
      staff: [lead],
      project: projectFor(stage),
    };
    const result = applyGameAction(initial, {
      type: "choose-lead",
      leadStaffId: lead.id,
      leadName: lead.name,
      leadSkill: lead[skill],
    }, () => .5);
    const creation = result.effects.find((effect) => effect.type === "stage-creation")?.creation;

    assert.ok(creation, `${stage} should start a creation sequence`);
    assert.equal(creation.stage, stage);
    assert.equal(creation.external, false);
    assert.equal(creation.roleFit, "职业适配");
    assert.ok(result.state.project.stageProgress > initial.project.stageProgress);
    assert.ok(result.state.project[highlightedMetric] > initial.project[highlightedMetric]);
    assert.ok(result.state.staff[0].energy < lead.energy);
    assert.match(creation.result.entries[0].value, /^\+\d+\.\d$/);
    assert.equal(creation.result.entries.at(-1).label, `${lead.name}体力`);

    const duplicate = applyGameAction(result.state, {
      type: "choose-lead",
      leadStaffId: lead.id,
      leadName: lead.name,
      leadSkill: lead[skill],
    }, () => .99);
    assert.strictEqual(duplicate.state, result.state);
    assert.deepEqual(duplicate.effects, []);
  }
});

test("external lead pays once, preserves staff energy, and reports repeat decay", () => {
  const initial = {
    ...createInitialGameState(),
    cash: 500,
    project: projectFor("graphics"),
    lastStageLeads: { graphics: "external" },
  };
  const beforeEnergy = initial.staff.map((member) => member.energy);
  const result = applyGameAction(initial, {
    type: "choose-lead",
    leadName: "外聘名人",
    leadSkill: 34,
    cost: 55,
  }, () => .5);
  const creation = result.effects.find((effect) => effect.type === "stage-creation")?.creation;

  assert.ok(creation);
  assert.equal(creation.external, true);
  assert.equal(creation.repeated, true);
  assert.equal(result.state.cash, 445);
  assert.deepEqual(result.state.staff.map((member) => member.energy), beforeEnergy);
  assert.ok(creation.result.entries.some((entry) => entry.label === "外聘费用" && entry.value === "-¥55千"));
  assert.ok(creation.result.entries.some((entry) => entry.label === "重复负责"));
});

test("repeat decay lowers both previewed and committed opening output", () => {
  const lead = leadFor("编剧", "scenario");
  const project = projectFor("planning");
  const fresh = { ...createInitialGameState(), staff: [lead], project };
  const repeated = { ...fresh, lastStageLeads: { planning: lead.id } };
  const freshPrediction = predictStageLead(fresh, project, lead);
  const repeatedPrediction = predictStageLead(repeated, project, lead);
  const action = {
    type: "choose-lead",
    leadStaffId: lead.id,
    leadName: lead.name,
    leadSkill: lead.scenario,
  };
  const freshResult = applyGameAction(fresh, action, () => .5);
  const repeatedResult = applyGameAction(repeated, action, () => .5);

  assert.ok(repeatedPrediction.openingProgressRange.max < freshPrediction.openingProgressRange.max);
  assert.ok(repeatedPrediction.openingQualityRange.max < freshPrediction.openingQualityRange.max);
  assert.ok(repeatedResult.state.project.stageProgress < freshResult.state.project.stageProgress);
  assert.ok(repeatedResult.state.project.creativity < freshResult.state.project.creativity);
});

test("resting staff and unaffordable experts cannot start an animation", () => {
  const tiredLead = { ...leadFor("程序员", "code"), energy: 10, resting: true };
  const project = projectFor("coding");
  const tiredResult = applyGameAction(
    { ...createInitialGameState(), staff: [tiredLead], project },
    {
      type: "choose-lead",
      leadStaffId: tiredLead.id,
      leadName: tiredLead.name,
      leadSkill: tiredLead.code,
    },
  );
  assert.equal(tiredResult.state.project.leadName, undefined);
  assert.equal(tiredResult.effects[0].type, "toast");

  const expertResult = applyGameAction(
    { ...createInitialGameState(), cash: 1, project },
    { type: "choose-lead", leadName: "外聘名人", leadSkill: 40, cost: 55 },
  );
  assert.equal(expertResult.state.cash, 1);
  assert.equal(expertResult.state.project.leadName, undefined);
  assert.equal(expertResult.effects[0].type, "toast");
});

test("creation state advances once through focus, create, result, and resume", () => {
  const data = {
    stage: "planning",
    leadStaffId: 91,
    leadName: "负责人",
    external: false,
    repeated: false,
    roleFit: "职业适配",
    skillLabel: STAGE_INFO.planning.short,
    effectiveSkill: 28,
    result: { title: "成果", summary: "已提交", entries: [] },
  };
  const select = { phase: "select", stage: "planning" };
  assert.strictEqual(advanceStageCreation(select, "focus"), select);

  const focus = { ...data, phase: "focus" };
  const create = advanceStageCreation(focus, "focus");
  assert.equal(create.phase, "create");
  assert.strictEqual(advanceStageCreation(create, "focus"), create);
  const result = advanceStageCreation(create, "create");
  assert.equal(result.phase, "result");
  const resume = advanceStageCreation(result, "result");
  assert.equal(resume.phase, "resume");
  assert.equal(advanceStageCreation(resume, "resume"), null);
});
