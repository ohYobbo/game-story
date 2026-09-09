import assert from "node:assert/strict";
import test from "node:test";
import { applyGameAction } from "../app/game/engine.ts";
import { createInitialGameState } from "../app/game/rules.ts";
import { ROLE_LEVEL_BOOSTS, ROLE_UNLOCK_RULES } from "../app/game/data.ts";
import { getCareerOptionsFor } from "../app/game-balance.ts";
import { serializeGameState, parseSave } from "../app/game/save.ts";

const random = () => { throw Error("Progression must not use randomness"); };
const dispatch = (state, action) => applyGameAction(state, action, random);
const levelAction = member => ({ type: "level-up-staff", staffId: member.id, expectedLevel: member.level, expectedRole: member.role });
const reload = state => parseSave(JSON.stringify(serializeGameState(state)));
const release = { id: "release-1", name: "首作", score: 20, sales: 1, income: 1, weeks: 1, sequelEligible: false, weeklyRank: 42 };

test("level-up atomically charges research, applies discipline gains, and compounds salary", () => {
  const initial = { ...createInitialGameState(), research: 22 };
  const original = structuredClone(initial);
  const first = dispatch(initial, levelAction(initial.staff[0])).state;
  assert.equal(first.research, 13);
  assert.equal(first.staff[0].level, 2);
  assert.equal(first.staff[0].salary, 24);
  assert.equal(first.staff[0].code, initial.staff[0].code + 5);
  assert.equal(first.staff[0].scenario, initial.staff[0].scenario + 1);
  assert.equal(first.staff[0].art, initial.staff[0].art);
  assert.strictEqual(first.staff[1], initial.staff[1]);
  const second = dispatch(first, levelAction(first.staff[0])).state;
  assert.equal(second.research, 0);
  assert.equal(second.staff[0].salary, 29);
  assert.equal(second.staff[0].level, 3);
  assert.deepEqual(initial, original);
  assert.deepEqual(reload(second), second);
});

test("insufficient research, max level, missing employees and stale level or role cannot mutate state", () => {
  const base = createInitialGameState();
  for (const state of [{ ...base, research: 8 }, { ...base, staff: [{ ...base.staff[0], level: 5 }] }]) {
    assert.strictEqual(dispatch(state, levelAction(state.staff[0])).state, state);
  }
  const action = levelAction(base.staff[0]);
  const advanced = dispatch(base, action).state;
  assert.strictEqual(dispatch(advanced, action).state, advanced);
  assert.strictEqual(dispatch(base, { ...action, staffId: 999 }).state, base);
  assert.strictEqual(dispatch(base, { ...action, expectedRole: "美术" }).state, base);
});

test("all career unlock rules are executed by the engine without duplicating known genres", () => {
  for (const rule of ROLE_UNLOCK_RULES) {
    for (const alreadyKnown of [false, true]) {
    const initial = createInitialGameState();
    const member = { ...initial.staff[0], role: rule.role, level: rule.level - 1 };
    const state = { ...initial, research: 100, staff: [member], unlockedGenres: [...initial.unlockedGenres, ...(alreadyKnown ? [rule.name] : [])] };
    const next = dispatch(state, levelAction(member)).state;
    for (const unlock of ROLE_UNLOCK_RULES.filter(item => item.role === rule.role && item.level === rule.level)) {
      assert.equal(next.unlockedGenres.filter(name => name === unlock.name).length, 1);
    }
    for (const [key, gain] of Object.entries(ROLE_LEVEL_BOOSTS[rule.role])) assert.equal(next.staff[0][key], member[key] + gain);
    }
  }
});

test("reaching level five records mastery once and preserves advanced career eligibility", () => {
  const initial = createInitialGameState();
  const member = { ...initial.staff[0], role: "编剧", level: 4, masteredRoles: ["程序员"] };
  const state = dispatch({ ...initial, research: 21, staff: [member] }, levelAction(member)).state;
  assert.deepEqual(state.staff[0].masteredRoles, ["程序员", "编剧"]);
  assert.ok(state.unlockedGenres.includes("角色扮演"));
  assert.ok(getCareerOptionsFor(state.staff[0].masteredRoles, state.staff[0].role).includes("总监"));
  assert.strictEqual(dispatch(state, levelAction(state.staff[0])).state, state);
});

test("first office move requires year four, a release and the 1000K invitation reserve", () => {
  const initial = { ...createInitialGameState(), year: 4, cash: 1000, releases: [release], nextReleaseNumber: 2 };
  const action = { type: "expand-office", expectedLevel: 1 };
  for (const patch of [{ year: 3 }, { releases: [] }, { cash: 999 }]) {
    const state = { ...initial, ...patch };
    assert.strictEqual(dispatch(state, action).state, state);
  }
  const original = structuredClone(initial);
  const result = dispatch(initial, action);
  assert.equal(result.state.companyLevel, 2);
  assert.equal(result.state.cash, 400);
  assert.equal(result.state.staff.length, initial.staff.length);
  assert.match(result.effects[0].event.reward, /6 人/);
  assert.match(result.state.industryNews, /第 2 阶段/);
  assert.deepEqual(reload(result.state), result.state);
  assert.deepEqual(initial, original);
  assert.strictEqual(dispatch(result.state, action).state, result.state);
});

test("top office requires awards or year ten, exact funding, and ignores repeated requests", () => {
  const base = { ...createInitialGameState(), companyLevel: 2, cash: 2500, year: 9 };
  const action = { type: "expand-office", expectedLevel: 2 };
  assert.strictEqual(dispatch(base, action).state, base);
  for (const patch of [{ awards: 1 }, { year: 10 }]) {
    const state = { ...base, ...patch };
    const poor = { ...state, cash: 2499 };
    assert.strictEqual(dispatch(poor, action).state, poor);
    const result = dispatch(state, action);
    assert.equal(result.state.cash, 0);
    assert.equal(result.state.companyLevel, 3);
    assert.match(result.effects[0].event.reward, /8 人/);
    assert.strictEqual(dispatch(result.state, action).state, result.state);
    assert.strictEqual(dispatch(result.state, { ...action, expectedLevel: 3 }).state, result.state);
  }
});
