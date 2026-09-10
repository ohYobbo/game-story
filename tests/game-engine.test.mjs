import assert from "node:assert/strict";
import test from "node:test";

import { STAGE_INFO } from "../app/game/data.ts";
import { applyGameAction } from "../app/game/engine.ts";
import {
  createInitialGameState,
  formatCash,
  getAvailablePlatforms,
  getStageTarget,
} from "../app/game/rules.ts";

function randomFrom(seed) {
  let value = seed >>> 0;
  return () =>
    ((value =
      (Math.imul(1664525, value) + 1013904223) >>> 0) / 4294967296);
}

function gameProject(overrides = {}) {
  return {
    kind: "game",
    name: "引擎测试作",
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
    marketUsers: 280_000,
    stage: "planning",
    stageProgress: 0,
    stageTarget: getStageTarget("planning", "均衡"),
    elapsedWeeks: 0,
    itemUses: 0,
    eventCount: 0,
    debugResearch: 0,
    developmentCost: 55,
    ...overrides,
  };
}

function playCompleteGame(seed) {
  const random = randomFrom(seed);
  let state = createInitialGameState();
  state = applyGameAction(
    state,
    { type: "start-project", project: gameProject(), cost: 55 },
    random,
  ).state;
  const stages = [];
  let review = null;

  for (let tick = 0; tick < 2_000 && !review; tick += 1) {
    if (
      state.project?.kind === "game" &&
      state.project.stage !== "debug" &&
      !state.project.leadName
    ) {
      const stage = state.project.stage ?? "planning";
      const skill = STAGE_INFO[stage].skill;
      const lead = [...state.staff].sort((a, b) => b[skill] - a[skill])[0];
      state = applyGameAction(
        state,
        {
          type: "choose-lead",
          leadStaffId: lead.id,
          leadName: lead.name,
          leadSkill: lead[skill],
        },
        random,
      ).state;
    }
    const result = applyGameAction(
      state,
      { type: "tick", isNewWeek: (tick + 1) % 4 === 0 },
      random,
    );
    state = result.state;
    if (result.effects.some((effect) => effect.type === "pause-for-stage")) {
      stages.push(state.project?.stage);
    }
    review = result.effects.find((effect) => effect.type === "review")?.review ?? null;
  }

  assert.ok(review, "the complete production flow should release a game");
  return { state, review, stages };
}

test("a fixed random seed drives the complete five-stage flow deterministically", () => {
  const first = playCompleteGame(42);
  const second = playCompleteGame(42);
  assert.deepEqual(first, second);
  assert.deepEqual(first.stages, ["coding", "graphics", "sound"]);
  assert.equal(first.state.project, null);
  assert.equal(first.state.releases[0].name, "引擎测试作");
});

test("contracts have stable success and timeout branches", () => {
  const initial = createInitialGameState();
  const successProject = {
    ...gameProject(),
    kind: "contract",
    name: "短委托",
    platform: "委托",
    genre: "外包",
    theme: "",
    target: 1,
    reward: 100,
    deadlineWeeks: 9,
    qualityTargets: {},
  };
  let result = applyGameAction(
    { ...initial, project: successProject },
    { type: "tick", isNewWeek: false },
    () => .5,
  );
  assert.equal(result.state.project, null);
  assert.equal(result.state.cash, initial.cash + 100);
  assert.equal(result.effects[0].type, "event");

  const timeoutProject = {
    ...successProject,
    name: "超时委托",
    target: 1_000_000,
    deadlineWeeks: 1,
    qualityTargets: { graphics: 9999 },
  };
  result = applyGameAction(
    { ...initial, reputation: 10, project: timeoutProject },
    { type: "tick", isNewWeek: true },
    () => .5,
  );
  assert.equal(result.state.project, null);
  assert.equal(result.state.reputation, 5);
  assert.match(result.effects[0].event.headline, /取消/);
});

test("platform debut, retirement and owned-console availability are pure", () => {
  assert.deepEqual(
    getAvailablePlatforms(1, false, 0).map((item) => item.name),
    ["个人电脑", "豆豆机"],
  );
  assert.ok(!getAvailablePlatforms(6, false, 0).some((item) => item.name === "豆豆机"));
  assert.equal(
    getAvailablePlatforms(6, true, 900_000).find((item) => item.name === "像素盒子")?.users,
    900_000,
  );
});

test("scheduled events cover payroll, expo, awards and the twenty-year ending", () => {
  const initial = createInitialGameState();
  let result = applyGameAction(
    { ...initial, month: 3, week: 1 },
    { type: "scheduled-event" },
    () => 0,
  );
  assert.equal(result.state.cash, 460);
  assert.equal(result.effects[0].event.kind, "payroll");

  result = applyGameAction(
    { ...initial, companyLevel: 2, month: 7, week: 1 },
    { type: "scheduled-event" },
    () => 0,
  );
  assert.equal(result.effects[0].event.kind, "expo");

  result = applyGameAction(
    {
      ...initial,
      month: 12,
      week: 1,
      releases: [{ name: "大奖作", score: 40, sales: 1, income: 1, weeks: 1, releasedYear: 1 }],
    },
    { type: "scheduled-event" },
    () => 0,
  );
  assert.equal(result.state.awards, 1);
  assert.equal(result.state.cash, 2500);

  result = applyGameAction(
    { ...initial, year: 20 },
    { type: "scheduled-event" },
    () => 0,
  );
  assert.equal(result.state.endingShown, true);
  assert.equal(result.effects[0].event.kind, "ending");
});

test("marketing, items and career changes preserve their edge rules", () => {
  let state = {
    ...createInitialGameState(),
    cash: 5_000,
    research: 30,
    project: gameProject({ hype: 0 }),
    inventory: {
      funBoost: 2,
      creativityBoost: 0,
      graphicsBoost: 0,
      soundBoost: 0,
      bugSpray: 0,
      energyDrink: 0,
    },
  };
  state = applyGameAction(
    state,
    { type: "apply-marketing", name: "网络广告", cost: 50, hype: 8, segment: "teens" },
    () => .5,
  ).state;
  assert.equal(state.project.hype, 8);
  state = applyGameAction(
    state,
    { type: "apply-marketing", name: "网络广告", cost: 50, hype: 8, segment: "teens" },
    () => .5,
  ).state;
  assert.equal(state.project.hype, 14);

  const firstFun = state.project.fun;
  state = applyGameAction(state, { type: "use-item", key: "funBoost" }, () => .5).state;
  const firstGain = state.project.fun - firstFun;
  const secondFun = state.project.fun;
  state = applyGameAction(state, { type: "use-item", key: "funBoost" }, () => .5).state;
  assert.ok(firstGain > state.project.fun - secondFun);

  state = { ...state, careerManuals: 1, staff: state.staff.map(member => member.id === 1 ? { ...member, level: 5, masteredRoles: ["总监", "制作人"] } : member) };
  const result = applyGameAction(
    state,
    { type: "change-career", staffId: 1, role: "硬件工程师" },
    () => .5,
  );
  assert.equal(result.state.careerManuals, 0);
  assert.equal(result.state.staff[0].role, "硬件工程师");
});

test("unified result entries report committed state deltas", () => {
  const initial = {
    ...createInitialGameState(),
    cash: 5_000,
    project: gameProject({ hype: 0, bugs: 4 }),
    inventory: {
      funBoost: 0,
      creativityBoost: 0,
      graphicsBoost: 0,
      soundBoost: 0,
      bugSpray: 1,
      energyDrink: 0,
    },
  };
  let result = applyGameAction(initial, {
    type: "apply-marketing",
    name: "网络广告",
    cost: 50,
    hype: 8,
    segment: "teens",
  });
  let feedback = result.effects.find((effect) => effect.type === "result").result;
  assert.equal(feedback.entries.find((entry) => entry.label === "资金").value, `-${formatCash(initial.cash - result.state.cash)}`);
  assert.equal(feedback.entries.find((entry) => entry.label === "作品热度").value, `+${result.state.project.hype - initial.project.hype}`);

  result = applyGameAction(initial, { type: "use-item", key: "bugSpray" });
  feedback = result.effects.find((effect) => effect.type === "result").result;
  assert.equal(feedback.entries.find((entry) => entry.label === "漏洞").value, `-${initial.project.bugs - result.state.project.bugs}`);

  const contract = { ...gameProject(), kind: "contract", reward: 100 };
  result = applyGameAction(
    { ...initial, reputation: 100, project: contract },
    { type: "complete-project", project: contract },
  );
  const event = result.effects.find((effect) => effect.type === "event").event;
  assert.equal(event.results.find((entry) => entry.label === "业界口碑").value, "+0");
  assert.equal(result.state.reputation, 100);
});

test("a sequel completion consumes the predecessor slot and can enter the Hall of Fame", () => {
  const predecessor = {
    id: "legacy-1",
    name: "前作",
    score: 36,
    sales: 100_000,
    income: 800,
    weeks: 10,
    genre: "桌游",
    theme: "海盗",
    sequelEligible: true,
  };
  const project = gameProject({
    name: "前作 2",
    sequelOfId: "legacy-1",
    fun: 90,
    creativity: 90,
    graphics: 90,
    sound: 90,
    bugs: 0,
  });
  const result = applyGameAction(
    { ...createInitialGameState(), releases: [predecessor], project },
    { type: "complete-project", project },
    () => .5,
  );
  assert.equal(result.state.releases[0].sequelEligible, true);
  assert.equal(result.state.releases[1].sequelEligible, false);
});
