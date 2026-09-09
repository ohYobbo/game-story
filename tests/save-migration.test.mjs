import assert from "node:assert/strict";
import test from "node:test";

import { BALANCE_VERSION } from "../app/game-balance.ts";
import { createInitialGameState } from "../app/game/rules.ts";
import {
  SAVE_SCHEMA_VERSION,
  migrateSave,
  parseSave,
  serializeGameState,
} from "../app/game/save.ts";

test("serialized saves contain explicit versions and no transient UI state", () => {
  const state = { ...createInitialGameState(), lastStageLeads: { planning: 1 } };
  const serialized = serializeGameState(state);
  assert.equal(serialized.schemaVersion, SAVE_SCHEMA_VERSION);
  assert.equal(serialized.balanceVersion, BALANCE_VERSION);
  assert.ok(!("modal" in serialized));
  assert.ok(!("animation" in serialized));
  assert.deepEqual(parseSave(JSON.stringify(serialized)), state);
});

test("balance v3 preserves earned resources in v2 saves instead of rerunning the original opening reset", () => {
  const initial = createInitialGameState();
  const saved = { ...serializeGameState(initial), schemaVersion: 6, balanceVersion: 2, cash: 5000, research: 41, fans: 123, staff: [...initial.staff, ...initial.staff.map(member => ({ ...member, id: member.id + 10 }))] };
  const migrated = migrateSave(saved);
  assert.equal(migrated.cash, 5000);
  assert.equal(migrated.research, 41);
  assert.equal(migrated.fans, 123);
  assert.equal(migrated.staff.length, 4);
});

test("legacy staff and stage-less game projects migrate to a resumable state", () => {
  const migrated = migrateSave({
    balanceVersion: 1,
    cash: 900,
    fans: 10,
    research: 5,
    year: 3,
    month: 2,
    week: 4,
    companyLevel: 1,
    staff: [{
      id: 9,
      name: "旧员工",
      role: "策划",
      level: 2,
      code: 3,
      art: 10,
      sound: 4,
      energy: 50,
      color: "#fff",
    }],
    project: {
      kind: "game",
      name: "旧项目",
      platform: "个人电脑",
      genre: "冒险",
      theme: "动物",
      direction: "均衡",
      progress: 12,
      target: 70,
      fun: 1,
      creativity: 1,
      graphics: 1,
      sound: 1,
      bugs: 0,
      hype: 0,
    },
    releases: [],
  });
  assert.ok(migrated);
  assert.equal(migrated.staff[0].role, "编剧");
  assert.equal(migrated.staff[0].scenario, 8);
  assert.equal(migrated.project.stage, "coding");
  assert.equal(migrated.project.stageProgress, 12);
  assert.equal(migrated.project.leadStaffId, 9);
  assert.equal(migrated.project.challengeCount, 0);
});

test("planning, production, debugging, contract and console interruptions round-trip", () => {
  const base = createInitialGameState();
  const projects = [
    {
      kind: "game",
      name: "等待负责人",
      platform: "个人电脑",
      genre: "桌游",
      theme: "海盗",
      direction: "均衡",
      progress: 0,
      target: 270,
      fun: 1,
      creativity: 1,
      graphics: 1,
      sound: 1,
      bugs: 0,
      hype: 0,
      stage: "planning",
      stageProgress: 0,
      stageTarget: 32,
    },
    {
      kind: "game",
      name: "除错中",
      platform: "个人电脑",
      genre: "桌游",
      theme: "海盗",
      direction: "均衡",
      progress: 200,
      target: 270,
      fun: 20,
      creativity: 20,
      graphics: 20,
      sound: 20,
      bugs: 8,
      hype: 5,
      stage: "debug",
      stageProgress: 2,
      stageTarget: 8,
      leadName: "全体员工",
    },
    {
      kind: "contract",
      name: "委托中",
      platform: "委托",
      genre: "外包",
      theme: "",
      direction: "均衡",
      progress: 20,
      target: 90,
      fun: 1,
      creativity: 1,
      graphics: 3,
      sound: 1,
      bugs: 0,
      hype: 0,
      deadlineWeeks: 10,
      elapsedWeeks: 3,
    },
    {
      kind: "console",
      name: "主机中",
      platform: "硬件研发",
      genre: "自研主机",
      theme: "次世代",
      direction: "重视品质",
      progress: 120,
      target: 560,
      fun: 1,
      creativity: 1,
      graphics: 1,
      sound: 1,
      bugs: 0,
      hype: 0,
    },
  ];
  for (const project of projects) {
    const state = { ...base, project };
    const expected = project.kind === "game" ? { ...project, challengeCount: 0 } : project;
    assert.deepEqual(parseSave(JSON.stringify(serializeGameState(state))).project, expected);
  }
});

test("pending staff challenges round-trip for a resumable decision", () => {
  const base = createInitialGameState();
  const pendingChallenge = {
    id: "存档挑战-1",
    staffId: 1,
    metric: "fun",
    visualStage: "coding",
    skill: 18,
    baseSuccessRate: .6,
    gainRange: { min: 6, max: 9 },
    successHype: 8,
    failureHypeLoss: 5,
    failureBugs: 5,
  };
  const state = {
    ...base,
    project: {
      kind: "game",
      name: "待决挑战",
      platform: "个人电脑",
      genre: "桌游",
      theme: "海盗",
      direction: "均衡",
      progress: 10,
      target: 270,
      fun: 6,
      creativity: 5,
      graphics: 4,
      sound: 3,
      bugs: 0,
      hype: 2,
      stage: "coding",
      stageProgress: 4,
      stageTarget: 55,
      challengeCount: 1,
      pendingChallenge,
    },
  };

  const restored = parseSave(JSON.stringify(serializeGameState(state)));
  assert.deepEqual(restored.project.pendingChallenge, pendingChallenge);
  assert.equal(restored.project.challengeCount, 1);
});

test("an interrupted event or animation restores only the committed stable state", () => {
  const raw = {
    ...serializeGameState({
      ...createInitialGameState(),
      lastEventKey: "4-12-1",
    }),
    modal: "event",
    eventData: { headline: "不应持久化" },
    animation: { phase: "result", applied: true },
  };
  const migrated = migrateSave(raw);
  assert.ok(migrated);
  assert.equal(migrated.lastEventKey, "4-12-1");
  assert.ok(!("modal" in migrated));
  assert.ok(!("animation" in migrated));
});
