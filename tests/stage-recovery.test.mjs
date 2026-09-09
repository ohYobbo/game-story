import assert from "node:assert/strict";
import test from "node:test";
import { applyGameAction } from "../app/game/engine.ts";
import { createGameProject } from "../app/game/predictions.ts";
import { DEFAULT_DIRECTION_POINTS, PLATFORMS } from "../app/game/data.ts";
import { createInitialGameState } from "../app/game/rules.ts";
import { migrateSave, parseSave, serializeGameState } from "../app/game/save.ts";

function stranded(overrides = {}) {
  const initial = createInitialGameState();
  return {
    ...initial, cash: 0,
    staff: initial.staff.map(member => ({ ...member, energy: 5, resting: true })),
    project: createGameProject({ state: initial, name: "恢复回归", platform: PLATFORMS[0], genre: "桌游", theme: "海盗", direction: "均衡", directionPoints: { ...DEFAULT_DIRECTION_POINTS, polish: 8 } }),
    ...overrides,
  };
}

test("a cashless team can wait, recover and select a lead without free production", () => {
  const initial = stranded();
  const noRandom = () => { throw new Error("waiting must not consume randomness"); };
  let state = applyGameAction(initial, { type: "wait-for-stage-lead" }, noRandom).state;
  assert.equal(state.project.waitingForLeadRecovery, true);
  assert.deepEqual(state.staff, initial.staff);
  for (let tick = 1; tick <= 9; tick += 1) {
    state = applyGameAction(state, { type: "tick", isNewWeek: tick % 4 === 0, allowStaffChallenge: true }, noRandom).state;
    assert.deepEqual(
      { ...state.project, waitingForLeadRecovery: undefined, elapsedWeeks: 0 },
      { ...initial.project, waitingForLeadRecovery: undefined },
    );
    assert.equal(state.cash, 0);
    assert.equal(state.research, initial.research);
  }
  assert.equal(state.week, initial.week + 2);
  assert.equal(state.project.elapsedWeeks, 2);
  assert.equal(state.project.waitingForLeadRecovery, undefined);
  assert.ok(state.staff.every(member => !member.resting && member.energy === 100));
  const member = state.staff[1];
  const result = applyGameAction(state, { type: "choose-lead", leadStaffId: member.id, leadName: member.name, leadSkill: member.scenario }, () => .5);
  assert.ok(result.effects.some(effect => effect.type === "stage-creation"));
  assert.ok(result.state.project.stageProgress > initial.project.stageProgress);
});

test("waiting is idempotent and cannot bypass an active lead or an available employee", () => {
  const initial = stranded();
  const waiting = applyGameAction(initial, { type: "wait-for-stage-lead" }).state;
  assert.strictEqual(applyGameAction(waiting, { type: "wait-for-stage-lead" }).state, waiting);
  for (const state of [
    { ...initial, staff: createInitialGameState().staff },
    { ...initial, staff: [] },
    { ...initial, project: null },
    { ...initial, project: { ...initial.project, leadName: "现任负责人", leadSkill: 20 } },
    { ...initial, project: { ...initial.project, kind: "contract" } },
    { ...initial, project: { ...initial.project, stage: "debug" } },
  ]) assert.strictEqual(applyGameAction(state, { type: "wait-for-stage-lead" }).state, state);
});

test("waiting survives save reload and resumes without restarting recovery", () => {
  let state = applyGameAction(stranded(), { type: "wait-for-stage-lead" }).state;
  for (let tick = 1; tick <= 4; tick += 1) state = applyGameAction(state, { type: "tick", isNewWeek: tick === 4 }).state;
  const restored = parseSave(JSON.stringify(serializeGameState(state)));
  assert.equal(restored.project.waitingForLeadRecovery, true);
  assert.deepEqual(restored.staff, state.staff);
  assert.deepEqual(
    JSON.parse(JSON.stringify(applyGameAction(restored, { type: "tick", isNewWeek: false }).state)),
    JSON.parse(JSON.stringify(applyGameAction(state, { type: "tick", isNewWeek: false }).state)),
  );
  const legacy = serializeGameState(stranded());
  legacy.schemaVersion = 5;
  delete legacy.project.waitingForLeadRecovery;
  assert.equal(parseSave(JSON.stringify(legacy)).project.waitingForLeadRecovery, undefined);
});

test("waiting advances annual payroll once and still requires a lead after the event", () => {
  let state = applyGameAction(stranded({ year: 2, month: 2, week: 4, cash: 100 }), { type: "wait-for-stage-lead" }).state;
  for (let tick = 1; tick <= 4; tick += 1) state = applyGameAction(state, { type: "tick", isNewWeek: tick === 4 }).state;
  assert.equal(state.month, 3);
  assert.equal(state.week, 1);
  const paid = applyGameAction(state, { type: "scheduled-event" });
  assert.equal(paid.effects[0].event.kind, "payroll");
  assert.equal(paid.state.cash, 60);
  assert.equal(paid.state.project.waitingForLeadRecovery, true);
  const restored = parseSave(JSON.stringify(serializeGameState(paid.state)));
  assert.deepEqual(applyGameAction(restored, { type: "scheduled-event" }).effects, []);
  assert.equal(restored.cash, 60);
});

test("existing releases keep earning sales during recovery without advancing the new project", () => {
  const previous = stranded();
  const finished = { ...previous.project, fun: 25, creativity: 25, graphics: 25, sound: 25 };
  const released = applyGameAction({ ...previous, project: finished }, { type: "complete-project" }, () => .5).state;
  let state = applyGameAction(stranded({ releases: released.releases }), { type: "wait-for-stage-lead" }).state;
  const sales = state.releases[0].sales;
  const progress = state.project.progress;
  state = applyGameAction(state, { type: "tick", isNewWeek: true }).state;
  assert.ok(state.releases[0].sales > sales);
  assert.ok(state.cash > 0);
  assert.equal(state.project.progress, progress);
  assert.equal(state.project.waitingForLeadRecovery, true);
});

test("migration clears invalid recovery flags without mutating the supplied save", () => {
  for (const patch of [{ stage: "debug" }, { leadName: "负责人", leadSkill: 20 }, { kind: "console" }, { pendingChallenge: { id: "existing" } }]) {
    const saved = serializeGameState(stranded());
    saved.project = { ...saved.project, ...patch, waitingForLeadRecovery: true };
    const before = structuredClone(saved);
    const restored = migrateSave(saved);
    assert.equal(restored.project.waitingForLeadRecovery, undefined);
    assert.deepEqual(saved, before);
  }
});
