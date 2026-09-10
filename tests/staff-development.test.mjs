import assert from "node:assert/strict";
import test from "node:test";
import { applyGameAction } from "../app/game/engine.ts";
import { createInitialGameState } from "../app/game/rules.ts";
import { TRAINING_METHODS } from "../app/game/data.ts";
import { getOfficeUnlocks } from "../app/game/progression.ts";
import { predictTraining } from "../app/game/operations.ts";
import { migrateSave, serializeGameState, parseSave } from "../app/game/save.ts";

const advanced = TRAINING_METHODS.filter(method => method.officeLevel > 1);
const fixture = method => {
  const state = createInitialGameState();
  return { ...state, companyLevel: method.officeLevel, cash: 10000, staff: [{ ...state.staff[0], role: method.requiredRole, level: 2, code: 10, scenario: 10, art: 10, sound: 10 }] };
};
const train = (state, method, roll = .5) => applyGameAction(state, { type: "train-staff", staffId: state.staff[0].id, method }, () => roll);
const preview = (state, method) => predictTraining(state.staff[0], method, state.unlockedThemes, state.companyLevel, state.cash);
const reload = state => parseSave(JSON.stringify(serializeGameState(state)));

test("office and current-role training gates match previews and reject without rolling or charging", () => {
  for (const method of advanced) {
    const base = fixture(method);
    for (const state of [
      { ...base, companyLevel: method.officeLevel - 1 },
      { ...base, staff: [{ ...base.staff[0], role: "程序员", masteredRoles: [method.requiredRole] }] },
      { ...base, cash: method.cost - 1 },
      { ...base, staff: [{ ...base.staff[0], energy: method.energy - 1 }] },
    ]) {
      const predicted = preview(state, method);
      assert.ok(predicted.blockedReason);
      assert.equal(predicted.willDiscover, false);
      const result = applyGameAction(state, { type: "train-staff", staffId: 1, method }, () => { throw Error("Blocked training must not roll"); });
      assert.strictEqual(result.state, state);
      assert.equal(result.effects[0].message, predicted.blockedReason);
    }
    const tampered = { ...method, officeLevel: 1, cost: 0, requiredRole: undefined };
    const locked = { ...base, companyLevel: 1 };
    assert.strictEqual(train(locked, tampered).state, locked);
  }
});

test("signed training deltas, super outcomes, decay and stat floor agree with the committed result", () => {
  for (const method of advanced) for (const used of [0, 2, 20]) for (const roll of [.5, 0]) for (const stat of [10, 1, 0]) {
    let state = fixture(method);
    state = { ...state, cash: method.cost, staff: [{ ...state.staff[0], code: stat, scenario: stat, art: stat, sound: stat, energy: method.energy, training: { [method.id]: used } }] };
    const before = structuredClone(state);
    const predicted = preview(state, method);
    assert.equal(predicted.blockedReason, null);
    const result = train(state, method, roll);
    const member = result.state.staff[0];
    assert.equal(result.state.cash, 0);
    assert.equal(member.energy, 0);
    assert.equal(member.training[method.id], used + 1);
    for (const gain of predicted.gains) {
      const delta = roll === 0 ? gain.max : gain.min;
      assert.equal(member[gain.key] - stat, delta);
      assert.ok(member[gain.key] >= 0);
      if (method.gains[gain.key] < 0) assert.equal(delta, 0 - Math.min(stat, -method.gains[gain.key]));
      const labels = { code: "程序", scenario: "剧本", art: "画面", sound: "音乐" };
      const entry = result.effects[0].result.entries.find(item => item.label === labels[gain.key]);
      assert.equal(entry.value, `${delta >= 0 ? "+" : ""}${delta}`);
      assert.equal(entry.tone, delta < 0 ? "negative" : delta > 0 ? "positive" : "neutral");
    }
    assert.deepEqual(state, before);
    assert.deepEqual(reload(result.state), result.state);
  }
  const method = advanced[0];
  assert.deepEqual(preview(fixture(method), method).gains, [{ key: "code", min: 5, max: 15 }, { key: "scenario", min: 5, max: 15 }, { key: "sound", min: -2, max: -2 }]);
});

test("new training discovers content only at the required level and does not duplicate it", () => {
  for (const method of advanced) {
    const base = fixture(method);
    const junior = { ...base, staff: [{ ...base.staff[0], level: 1 }] };
    assert.ok(!train(junior, method).state.unlockedThemes.includes(method.unlock.name));
    const first = train(base, method).state;
    assert.ok(first.unlockedThemes.includes(method.unlock.name));
    assert.match(preview(first, method).discovery, /已发现/);
    const next = train({ ...first, staff: [{ ...first.staff[0], energy: 100 }] }, method).state;
    assert.equal(next.unlockedThemes.filter(name => name === method.unlock.name).length, 1);
  }
});

test("each office move opens two exclusive trainings and its result lists actual capabilities", () => {
  for (const level of [2, 3]) {
    const methods = advanced.filter(method => method.officeLevel === level);
    assert.equal(methods.length, 2);
    let state = { ...fixture(methods[0]), companyLevel: level - 1, year: 10, releases: [{ id: "release-1", name: "首作", score: 20, sales: 1, income: 1, weeks: 1 }] };
    const result = applyGameAction(state, { type: "expand-office", expectedLevel: level - 1 });
    state = result.state;
    assert.equal(state.companyLevel, level);
    for (const method of methods) {
      assert.ok(result.effects[0].event.body.includes(method.name));
      const member = { ...state.staff[0], role: method.requiredRole };
      assert.equal(preview({ ...state, staff: [member] }, method).blockedReason, null);
    }
    for (const line of getOfficeUnlocks(level)) assert.ok(result.effects[0].event.body.includes(line));
    assert.ok(!result.effects[0].event.body.includes("硬件实验室"));
  }
});

test("all eight careers can be reached through real level-ups and career actions", () => {
  let state = { ...createInitialGameState(), research: 10000, careerManuals: 7 };
  for (const nextRole of ["编剧", "总监", "美术", "音效师", "制作人", "硬件工程师", "黑客"]) {
    while (state.staff[0].level < 5) {
      const member = state.staff[0];
      state = applyGameAction(state, { type: "level-up-staff", staffId: member.id, expectedLevel: member.level, expectedRole: member.role }).state;
    }
    const before = state.staff[0];
    assert.ok(before.masteredRoles.includes(before.role));
    state = applyGameAction(state, { type: "change-career", staffId: before.id, role: nextRole }).state;
    assert.equal(state.staff[0].role, nextRole);
    assert.equal(state.staff[0].level, 1);
    assert.ok(state.staff[0].code >= before.code);
    assert.deepEqual(state.staff[0].masteredRoles, before.masteredRoles);
    assert.deepEqual(reload(state), state);
  }
  assert.equal(state.careerManuals, 0);
  assert.ok(state.unlockedGenres.includes("策略"));
  assert.ok(state.unlockedGenres.includes("经营"));
  assert.ok(state.unlockedGenres.includes("音乐"));
});

test("career actions reject missing prerequisites, level, manual and duplicate requests", () => {
  const initial = createInitialGameState();
  const valid = { ...initial, careerManuals: 2, staff: [{ ...initial.staff[0], level: 5, masteredRoles: ["程序员", "编剧"] }] };
  const action = { type: "change-career", staffId: 1, role: "总监" };
  for (const state of [
    { ...valid, careerManuals: 0 },
    { ...valid, staff: [{ ...valid.staff[0], level: 4 }] },
    { ...valid, staff: [{ ...valid.staff[0], masteredRoles: ["程序员"] }] },
  ]) assert.strictEqual(applyGameAction(state, action).state, state);
  for (const role of ["程序员", "不存在的职业", "黑客"]) assert.strictEqual(applyGameAction(valid, { ...action, role }).state, valid);
  const changed = applyGameAction(valid, action).state;
  assert.equal(changed.careerManuals, 1);
  assert.strictEqual(applyGameAction(changed, action).state, changed);
});

test("balance 4 saves retain careers, trained stats and discovered content without relocking old training", () => {
  const state = { ...createInitialGameState(), cash: 50000, unlockedGenres: ["策略", "音乐"], unlockedThemes: ["战争", "校园"], staff: [{ ...createInitialGameState().staff[0], role: "黑客", masteredRoles: ["硬件工程师"], training: { reading: 4, simulation: 2 } }] };
  const old = { ...serializeGameState(state), balanceVersion: 4 };
  const restored = migrateSave(old);
  assert.deepEqual(restored, state);
  assert.equal(TRAINING_METHODS.filter(method => !method.officeLevel).length, 8);
  for (const method of TRAINING_METHODS.filter(method => !method.officeLevel)) assert.equal(preview(restored, method).blockedReason, null);
  assert.ok(!restored.unlockedThemes.includes("虚拟世界"));
});
