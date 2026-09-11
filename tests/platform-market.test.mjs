import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DIRECTION_POINTS, DIRECTIONS, PLATFORMS } from "../app/game/data.ts";
import { applyGameAction } from "../app/game/engine.ts";
import { getPlatformMarkets, getPlatformQuote } from "../app/game/platforms.ts";
import { createGameProject, predictGamePlan, predictEarlyRelease } from "../app/game/predictions.ts";
import { advanceCalendar, createInitialGameState, getAvailablePlatforms } from "../app/game/rules.ts";
import { migrateSave, parseSave, serializeGameState } from "../app/game/save.ts";

const initial = (overrides = {}) => ({ ...createInitialGameState(), cash: 10000, lastAwardYear: (overrides.year ?? 1) - 1, ...overrides });
const market = (state, name = "豆豆机") => getPlatformMarkets(state).find(p => p.name === name);
const input = (state, name = "个人电脑", direction = "均衡") => ({
  state, name: "平台验收", platform: market(state, name), genre: "桌游", theme: "海盗",
  direction, directionPoints: DEFAULT_DIRECTION_POINTS,
});
const start = (state, project = createGameProject(input(state))) => applyGameAction(state, { type: "start-project", project, cost: 0 });

test("first license is paid once; a later work and restored save retain it", () => {
  const state = initial();
  const prediction = predictGamePlan(input(state));
  assert.equal(prediction.cost, 55);
  assert.equal(prediction.productionCost, 45);
  assert.equal(prediction.licenseFee, 10);
  const started = start(state, prediction.project).state;
  assert.equal(state.cash - started.cash, prediction.cost);
  assert.deepEqual(started.project, prediction.project);
  assert.deepEqual(started.platformLicenses, ["个人电脑"]);
  assert.equal(start(started).state, started, "duplicate start cannot charge or replace the project");
  const released = applyGameAction(started, { type: "complete-project" }, () => .5).state;
  const restored = parseSave(JSON.stringify(serializeGameState(released)));
  assert.deepEqual(restored.platformLicenses, ["个人电脑"]);
  const next = predictGamePlan(input(restored));
  assert.equal(next.licenseFee, 0);
  assert.equal(next.cost, 45);
  assert.equal(restored.cash - start(restored, next.project).state.cash, next.cost);
  assert.equal(released.releases[0].developmentCost, 55, "profit accounting includes first license");
});

test("preview and cancellation are pure, insufficient cash cannot grant a license", () => {
  const state = initial({ cash: 54 });
  const before = structuredClone(state);
  const prediction = predictGamePlan(input(state));
  assert.deepEqual(state, before);
  assert.equal(prediction.cashPressure, "无法开工");
  const rejected = start(state, prediction.project);
  assert.equal(rejected.state, state);
  assert.match(rejected.effects[0].message, /资金不足/);
  const exact = { ...state, cash: 55 };
  assert.equal(start(exact).state.cash, 0);
  const licensed = initial({ cash: 44, platformLicenses: ["个人电脑"] });
  assert.equal(start(licensed).state, licensed);
});

test("all platforms and directions use the same confirmation and authoritative start quote", () => {
  for (const p of PLATFORMS) for (const direction of DIRECTIONS) {
    for (const authorized of [false, true]) {
      const state = initial({ year: p.debut, month: 4, platformLicenses: authorized ? [p.name] : [] });
      const project = createGameProject(input(state, p.name, direction.name));
      const quote = getPlatformQuote(state, project);
      assert.equal(project.developmentCost, quote.productionCost + quote.licenseFee);
      const actual = start(state, { ...project, developmentCost: 0, marketUsers: 1 }).state;
      assert.equal(state.cash - actual.cash, quote.total, "caller-supplied cost cannot bypass fees");
      assert.equal(actual.project.marketUsers, quote.platform.users);
      assert.equal(actual.project.licenseFee, authorized ? 0 : p.licenseFee, "direction never multiplies license fee");
    }
  }
});

test("calendar crosses exact launch and retirement boundaries", () => {
  const before = initial({ year: 1, month: 12, week: 4 });
  const launch = { ...before, ...advanceCalendar(before) };
  assert.equal(market(before, "迷你掌机").phase, "未上市");
  assert.equal(market(launch, "迷你掌机").phase, "上市");
  const launchedProject = createGameProject(input(launch, "迷你掌机"));
  assert.equal(start(before, launchedProject).state, before);
  assert.ok(start(launch, launchedProject).state.project);
  const last = initial({ year: 5, month: 12, week: 4 });
  const retired = { ...last, ...advanceCalendar(last) };
  const lastProject = createGameProject(input(last, "豆豆机"));
  assert.equal(market(last).weeksRemaining, 1);
  assert.equal(market(retired).phase, "退市");
  assert.equal(market(retired).users, 0);
  assert.equal(start(retired, lastProject).state, retired);
  assert.ok(!getAvailablePlatforms(6, false, 0).some(p => p.name === "豆豆机"));
  const ceremony = applyGameAction(launch, { type: "scheduled-event" });
  assert.equal(ceremony.effects[0].event.kind, "awards");
  assert.equal(applyGameAction(ceremony.state, { type: "scheduled-event" }).effects[0].event.headline, "新主机“迷你掌机”上市！");
});

test("launch, growth, maturity and decline change market size and prices", () => {
  const launch = market(initial({ month: 1 }));
  const growth = market(initial({ year: 2, month: 1 }));
  const mature = market(initial({ year: 3, month: 4 }));
  const decline = market(initial({ year: 5, month: 12, week: 4 }));
  assert.deepEqual([launch.phase, growth.phase, mature.phase, decline.phase], ["上市", "成长期", "成熟期", "衰退期"]);
  assert.ok(launch.users < growth.users && growth.users < mature.users);
  assert.ok(decline.users < mature.users && decline.cost < mature.cost && decline.licenseFee < mature.licenseFee);
  const early = initial({ year: 3, month: 4 });
  const late = initial({ year: 5, month: 12, week: 4 });
  const first = createGameProject(input(early, "豆豆机"));
  const last = createGameProject(input(late, "豆豆机"));
  assert.ok(last.developmentCost < first.developmentCost);
  const sales = (state, project) => applyGameAction({ ...state, project: { ...project, fun: 40, creativity: 40, graphics: 40, sound: 40 } }, { type: "complete-project" }, () => .5).state.releases[0].sales;
  assert.ok(sales(late, last) < sales(early, first), "discount buys a genuinely smaller sales market");
  const risk = predictGamePlan(input(late, "豆豆机"));
  assert.ok(risk.risks.some(item => item.text.includes("1 周后退市")));
  assert.ok(risk.risks.some(item => item.text.includes("跨过退市日")));
});

test("annual campaign affects real users for eight weeks and survives reload without stacking", () => {
  const june = initial({ year: 9, month: 6, week: 1 });
  const promoted = market(june, "幻彩 32");
  const normal = market({ ...june, month: 8 }, "幻彩 32");
  assert.equal(promoted.users, Math.round(normal.users * 1.15));
  assert.ok(market({ ...june, month: 7, week: 4 }, "幻彩 32").marketEvent);
  assert.equal(normal.marketEvent, null);
  const event = applyGameAction(june, { type: "scheduled-event" });
  assert.match(event.effects[0].event.body, /15%/);
  const restored = parseSave(JSON.stringify(serializeGameState(event.state)));
  assert.deepEqual(market(restored, "幻彩 32"), promoted);
  assert.deepEqual(applyGameAction(restored, { type: "scheduled-event" }).effects, []);
  const started = start(june, createGameProject(input(june, "幻彩 32"))).state;
  assert.equal(started.project.marketUsers, promoted.users);
  const august = { ...started, month: 8 };
  const result = applyGameAction(august, { type: "complete-project" }, () => .5);
  assert.ok(result.state.releases[0].sales > 0);
  assert.equal(august.project.marketUsers, promoted.users);
});

test("in-flight retirement preserves locked users and release prediction", () => {
  const lastWeek = initial({ year: 5, month: 12, week: 4 });
  const started = start(lastWeek, createGameProject(input(lastWeek, "豆豆机"))).state;
  const nextYear = { ...started, ...advanceCalendar(started) };
  const restored = parseSave(JSON.stringify(serializeGameState(nextYear)));
  assert.equal(restored.project.marketUsers, market(lastWeek).users);
  const prediction = predictEarlyRelease(restored, restored.project);
  const result = applyGameAction(restored, { type: "complete-project" }, () => .5);
  assert.equal(result.state.project, null);
  assert.equal(result.state.releases[0].platform, "豆豆机");
  assert.ok(result.state.releases[0].sales >= prediction.salesRange.min && result.state.releases[0].sales <= prediction.salesRange.max);
  const warning = applyGameAction(initial({ year: 5, month: 10, week: 1 }), { type: "scheduled-event" });
  assert.equal(warning.effects[0].event.title, "平台退市预告");
});

test("own console has no platform or license fee and locks its actual market", () => {
  const state = initial({ ownConsole: true, consoleUsers: 900000 });
  const project = createGameProject(input(state, "像素盒子"));
  assert.equal(project.platformDevelopmentFee, 0);
  assert.equal(project.licenseFee, 0);
  assert.equal(project.developmentCost, 35);
  const started = start(state, project).state;
  assert.equal(started.project.marketUsers, 900000);
  assert.equal(state.cash - started.cash, 35);
  assert.equal(start({ ...state, ownConsole: false }, project).state.project, null);
  assert.equal(market({ ...state, consoleUsers: 0 }, "像素盒子").users, 220000);
});

test("legacy migration backfills only known retained game platforms without charging or inventing costs", () => {
  const base = initial();
  const legacy = {
    ...base, schemaVersion: 8, platformLicenses: undefined,
    releases: [
      { id: "release-1", name: "旧作", platform: "豆豆机", score: 20, sales: 100, income: 10, weeks: 1 },
      { id: "release-2", name: "未知平台", score: 20, sales: 100, income: 10, weeks: 1 },
    ],
    project: { ...createGameProject(input(base)), developmentCost: 123, marketUsers: 456789 },
  };
  const migrated = migrateSave(legacy);
  assert.deepEqual(migrated.platformLicenses, ["豆豆机", "个人电脑"]);
  assert.equal(migrated.cash, base.cash);
  assert.equal(migrated.project.developmentCost, 123);
  assert.equal(migrated.project.marketUsers, 456789);
  assert.equal(migrated.releases[0].developmentCost, undefined);
  assert.equal(getPlatformQuote(migrated, migrated.project).licenseFee, 0);
  assert.deepEqual(parseSave(JSON.stringify(serializeGameState(migrated))), JSON.parse(JSON.stringify(migrated)));
  const contract = migrateSave({ ...legacy, releases: [], project: { ...legacy.project, kind: "contract", platform: "委托" } });
  assert.deepEqual(contract.platformLicenses, []);
  assert.deepEqual(migrateSave({ ...legacy, project: null, releases: [] }).platformLicenses, []);
});
