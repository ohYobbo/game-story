import assert from "node:assert/strict";
import test from "node:test";

import { applyGameAction } from "../app/game/engine.ts";
import {
  getStaffChallengeSuccessRate,
  getStaffChallengeTarget,
  STAFF_CHALLENGE_SUCCESS_CAP,
} from "../app/game/predictions.ts";
import { createInitialGameState } from "../app/game/rules.ts";
import { parseSave, serializeGameState } from "../app/game/save.ts";

function randomFrom(seed) {
  let value = seed >>> 0;
  return () =>
    ((value =
      (Math.imul(1664525, value) + 1013904223) >>> 0) / 4294967296);
}

function randomSequence(values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

function gameProject(overrides = {}) {
  return {
    kind: "game",
    name: "挑战测试作",
    platform: "个人电脑",
    genre: "桌游",
    theme: "海盗",
    direction: "均衡",
    progress: 20,
    target: 270,
    fun: 10,
    creativity: 9,
    graphics: 8,
    sound: 7,
    bugs: 1,
    hype: 10,
    stage: "coding",
    stageProgress: 10,
    stageTarget: 100,
    leadStaffId: 1,
    leadName: "林小码",
    leadSkill: 18,
    elapsedWeeks: 1,
    eventCount: 0,
    challengeCount: 0,
    ...overrides,
  };
}

function triggerChallenge(overrides = {}) {
  const initial = {
    ...createInitialGameState(),
    cash: 500,
    research: 10,
    project: gameProject(overrides),
  };
  return applyGameAction(
    initial,
    { type: "tick", isNewWeek: true, allowStaffChallenge: true },
    randomSequence([.5, .5, .5, 0, 0]),
  );
}

test("qualified staff map their strongest skill to all four challenge metrics", () => {
  const base = createInitialGameState().staff[0];
  const cases = [
    ["fun", "code"],
    ["creativity", "scenario"],
    ["graphics", "art"],
    ["sound", "sound"],
  ];
  for (const [expectedMetric, skill] of cases) {
    const member = { ...base, code: 2, scenario: 2, art: 2, sound: 2, [skill]: 30 };
    assert.equal(getStaffChallengeTarget(member)[0], expectedMetric);
  }
});

test("a fixed trigger sequence creates one persisted offer and pauses further ticks", () => {
  const result = triggerChallenge();
  const effect = result.effects.find((item) => item.type === "staff-challenge");

  assert.ok(effect);
  assert.equal(result.state.project.pendingChallenge.id, effect.offer.id);
  assert.equal(result.state.project.challengeCount, 1);
  assert.equal(effect.offer.staffId, 1);
  assert.equal(effect.offer.metric, "fun");

  const pausedTick = applyGameAction(
    result.state,
    { type: "tick", isNewWeek: true, allowStaffChallenge: true },
    () => {
      throw new Error("pending challenges must not consume random values");
    },
  );
  assert.strictEqual(pausedTick.state, result.state);
  assert.deepEqual(pausedTick.effects, []);
});

test("investment previews increase success rate without exceeding the cap", () => {
  const offer = triggerChallenge().state.project.pendingChallenge;
  const steady = getStaffChallengeSuccessRate(offer, "steady");
  const full = getStaffChallengeSuccessRate(offer, "full");

  assert.ok(steady > offer.baseSuccessRate);
  assert.ok(full > steady);
  assert.ok(full <= STAFF_CHALLENGE_SUCCESS_CAP);
});

test("fixed seeds cover success and failure with committed result entries", () => {
  const successOffer = triggerChallenge().state;
  const success = applyGameAction(
    successOffer,
    {
      type: "resolve-staff-challenge",
      offerId: successOffer.project.pendingChallenge.id,
      investment: "full",
    },
    randomFrom(1),
  );
  const successCreation = success.effects.find((item) => item.type === "stage-creation")?.creation;
  assert.ok(successCreation);
  assert.equal(successCreation.kind, "challenge");
  assert.equal(success.state.cash, successOffer.cash - 75);
  assert.equal(success.state.research, successOffer.research - 5);
  assert.ok(success.state.project.fun > successOffer.project.fun);
  assert.equal(success.state.project.hype, successOffer.project.hype + 8);
  assert.equal(success.state.project.pendingChallenge, undefined);
  assert.match(successCreation.result.title, /成功/);
  assert.ok(successCreation.result.entries.some((entry) => entry.label === "趣味"));
  assert.ok(successCreation.result.entries.some((entry) => entry.label === "热度" && entry.value === "+8"));

  const duplicate = applyGameAction(
    success.state,
    {
      type: "resolve-staff-challenge",
      offerId: successOffer.project.pendingChallenge.id,
      investment: "full",
    },
    randomFrom(1),
  );
  assert.strictEqual(duplicate.state, success.state);
  assert.deepEqual(duplicate.effects, []);

  const failureOffer = triggerChallenge().state;
  const failure = applyGameAction(
    failureOffer,
    {
      type: "resolve-staff-challenge",
      offerId: failureOffer.project.pendingChallenge.id,
      investment: "full",
    },
    randomFrom(1843),
  );
  const failureCreation = failure.effects.find((item) => item.type === "stage-creation")?.creation;
  assert.ok(failureCreation);
  assert.equal(failure.state.project.hype, failureOffer.project.hype - 5);
  assert.equal(failure.state.project.bugs, failureOffer.project.bugs + 5);
  assert.match(failureCreation.result.title, /失败/);
  assert.ok(failureCreation.result.entries.some((entry) => entry.label === "漏洞"));
});

test("skip consumes no resources or randomness and unaffordable support stays pending", () => {
  const offered = triggerChallenge().state;
  const skipped = applyGameAction(
    offered,
    {
      type: "resolve-staff-challenge",
      offerId: offered.project.pendingChallenge.id,
      investment: "skip",
    },
    () => {
      throw new Error("skip must not consume random values");
    },
  );
  assert.equal(skipped.state.cash, offered.cash);
  assert.equal(skipped.state.research, offered.research);
  assert.equal(skipped.state.project.pendingChallenge, undefined);
  assert.equal(skipped.effects[0].type, "toast");

  const poor = { ...offered, cash: 0, research: 0 };
  const rejected = applyGameAction(
    poor,
    {
      type: "resolve-staff-challenge",
      offerId: poor.project.pendingChallenge.id,
      investment: "full",
    },
    randomFrom(1),
  );
  assert.strictEqual(rejected.state, poor);
  assert.equal(rejected.state.project.pendingChallenge.id, poor.project.pendingChallenge.id);
  assert.equal(rejected.effects[0].type, "toast");
});

test("challenges require explicit runtime permission and an eligible active employee", () => {
  const noPermission = applyGameAction(
    { ...createInitialGameState(), project: gameProject() },
    { type: "tick", isNewWeek: true },
    randomSequence([.5, .5, .5, 0, 0]),
  );
  assert.ok(!noPermission.effects.some((item) => item.type === "staff-challenge"));

  const tiredStaff = createInitialGameState().staff.map((member) => ({
    ...member,
    energy: 10,
    resting: true,
  }));
  const noCandidate = applyGameAction(
    { ...createInitialGameState(), staff: tiredStaff, project: gameProject() },
    { type: "tick", isNewWeek: true, allowStaffChallenge: true },
    randomSequence([.5, .5, .5, 0, .9]),
  );
  assert.ok(!noCandidate.effects.some((item) => item.type === "staff-challenge"));
  assert.equal(noCandidate.state.project.challengeCount, 0);
});

test("a restored challenge remains skippable when its employee is missing or exhausted", () => {
  const offered = triggerChallenge().state;
  const offerId = offered.project.pendingChallenge.id;
  for (const staff of [[], offered.staff.map(member => ({ ...member, energy: 20 }))]) {
    const state = { ...offered, staff };
    const supported = applyGameAction(state, { type: "resolve-staff-challenge", offerId, investment: "steady" });
    assert.strictEqual(supported.state, state);
    const skipped = applyGameAction(state, { type: "resolve-staff-challenge", offerId, investment: "skip" });
    assert.equal(skipped.state.project.pendingChallenge, undefined);
    assert.equal(skipped.state.cash, state.cash);
    assert.equal(skipped.state.research, state.research);
  }
});

test("offer frequency, debugging and near-stage-completion boundaries prevent extra challenges", () => {
  for (const overrides of [{ challengeCount: 2, elapsedWeeks: 20 }, { stage: "debug", bugs: 30 }, { stageProgress: 85, stageTarget: 100 }, { challengeCount: 1, elapsedWeeks: 2 }]) {
    const result = triggerChallenge(overrides);
    assert.ok(!result.effects.some(effect => effect.type === "staff-challenge"));
  }
  const triggered = triggerChallenge();
  assert.ok(!triggered.effects.some(effect => effect.type === "event"));
  assert.equal(triggered.state.project.eventCount, 0);
});

test("capped chances and low hype resolve exact deltas and stale offers cannot charge", () => {
  const offered = triggerChallenge().state;
  const offer = { ...offered.project.pendingChallenge, baseSuccessRate: .88 };
  const state = { ...offered, project: { ...offered.project, hype: 2, pendingChallenge: offer } };
  assert.equal(getStaffChallengeSuccessRate(offer, "steady"), .9);
  assert.equal(getStaffChallengeSuccessRate(offer, "full"), .9);
  const stale = applyGameAction(state, { type: "resolve-staff-challenge", offerId: "obsolete", investment: "full" }, () => { throw Error("stale RNG"); });
  assert.strictEqual(stale.state, state);
  const failure = applyGameAction(state, { type: "resolve-staff-challenge", offerId: offer.id, investment: "steady" }, () => .99);
  assert.equal(failure.state.project.hype, 0);
  assert.equal(failure.state.project.bugs, state.project.bugs + 5);
  const entries = failure.effects.find(effect => effect.type === "stage-creation").creation.result.entries;
  assert.ok(entries.some(entry => entry.label === "热度" && entry.value === "-2"));
  const restored = parseSave(JSON.stringify(serializeGameState(failure.state)));
  const replay = applyGameAction(restored, { type: "resolve-staff-challenge", offerId: offer.id, investment: "full" }, () => { throw Error("replay RNG"); });
  assert.strictEqual(replay.state, restored);
  assert.equal(replay.state.cash, state.cash - 30);
});
