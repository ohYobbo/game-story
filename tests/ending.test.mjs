import assert from "node:assert/strict";
import test from "node:test";
import { createEndingReport } from "../app/game/ending.ts";
import { applyGameAction } from "../app/game/engine.ts";
import { advanceCalendar, createInitialGameState } from "../app/game/rules.ts";
import { migrateSave, parseSave, serializeGameState } from "../app/game/save.ts";

const state = (patch = {}) => ({ ...createInitialGameState(), year: 20, month: 1, week: 1, lastAwardYear: 19, ...patch });
const release = (id, patch = {}) => ({ id, name: id, score: 30, sales: 100, income: 20, developmentCost: 30, weeks: 1, releasedYear: 19, ...patch });
const settle = s => applyGameAction(s, { type: "scheduled-event" });
const roundTrip = s => parseSave(JSON.stringify(serializeGameState(s)));

test("empty ending has zero totals, no invented rankings, and an explicit date", () => {
  const input = state({ cash: 123.6 });
  const result = settle(input);
  assert.equal(result.effects[0].event.kind, "ending");
  assert.equal(result.state.endingScore, 124);
  const report = result.state.endingReport;
  assert.deepEqual(report.settledAt, { year: 20, month: 1, week: 1 });
  assert.equal(report.performance.releaseCount, 0);
  assert.equal(report.performance.totalSales, 0);
  assert.equal(report.performance.averageScore, null);
  assert.equal(report.performance.bestSeller, null);
  assert.equal(report.performance.bestProfit, null);
  assert.equal(report.performance.ownConsole, false);
  assert.equal(input.endingReport, null);
});

test("all retained releases contribute, ties are stable, and unknown costs cannot win", () => {
  const releases = Array.from({ length: 40 }, (_, i) => release(`release-${i}`, { score: 20 }));
  releases[39] = release("first", { sales: 5000, income: 230, developmentCost: 30, score: 40 });
  releases[38] = release("unknown", { income: 999999, developmentCost: undefined });
  const p = createEndingReport(state({ releases })).performance;
  assert.equal(p.releaseCount, 40);
  assert.equal(p.totalSales, 8900);
  assert.equal(p.averageScore, (38 * 20 + 40 + 30) / 40);
  assert.deepEqual(p.bestSeller, { id: "first", name: "first", sales: 5000 });
  assert.deepEqual(p.bestProfit, { id: "first", name: "first", profit: 200 });
  assert.equal(p.unknownCostCount, 1);
  const ties = [release("b"), release("a")];
  for (const ordered of [ties, [...ties].reverse()]) {
    const tied = createEndingReport(state({ releases: ordered })).performance;
    assert.equal(tied.bestSeller.id, "a");
    assert.deepEqual(tied.bestProfit, { id: "a", name: "a", profit: -10 });
  }
});

test("year boundary settles final awards before the report and preserves same-day events", () => {
  const december = state({ year: 19, month: 12, week: 4, lastAwardYear: 18, cash: 500,
    releases: [release("final", { score: 40, sales: 100000, finalQuality: { fun: 80, creativity: 80, graphics: 80, sound: 80, bugs: 0 } })] });
  assert.equal(settle(december).state.endingReport, null);
  const january = { ...december, ...advanceCalendar(december) };
  const awards = settle(january);
  assert.equal(awards.effects[0].event.kind, "awards");
  const ending = settle(roundTrip(awards.state));
  assert.equal(ending.effects[0].event.kind, "ending");
  assert.equal(ending.state.endingReport.cash, 3500);
  assert.equal(ending.state.endingReport.performance.awards, 3);
  assert.deepEqual(ending.state.endingReport.performance.awardCounts, { design: 1, music: 1, worst: 0, runnerUp: 0, grand: 1 });
  assert.equal(settle(ending.state).effects.some(e => e.event?.kind === "ending"), false);
  const march = settle(state({ month: 3, lastEventKey: "" }));
  assert.equal(settle(march.state).effects[0].event.kind, "payroll");
  assert.equal(settle(state({ lastEventKey: "20-1-1" })).effects[0].event.kind, "ending");
});

test("continuing business and reload never rewrite any frozen report field", () => {
  const settled = settle(state({ cash: 2000, ownConsole: true, consoleUsers: 12345,
    releases: [release("console", { platform: "像素盒子", weeklySales: 100, remainingDemand: 1000 })] })).state;
  const snapshot = structuredClone(settled.endingReport);
  assert.equal(snapshot.performance.consoleReleaseCount, 1);
  assert.equal(snapshot.performance.consoleSoftwareSales, 100);
  assert.equal(snapshot.performance.consoleUsers, 12345);
  let continued = applyGameAction(settled, { type: "tick", isNewWeek: true }, () => .5).state;
  assert.ok(continued.releases[0].sales > 100);
  continued = { ...continued, year: 21, lastAwardYear: 20, cash: 99999, awards: 99, consoleUsers: 99999,
    releases: [release("new", { sales: 99999 }), ...continued.releases] };
  const restored = roundTrip(continued);
  assert.deepEqual(restored.endingReport, snapshot);
  assert.equal(settle(restored).effects.some(e => e.event?.kind === "ending"), false);
  assert.deepEqual(settle(restored).state.endingReport, snapshot);
  const saved = serializeGameState(restored);
  saved.endingReport.performance.bestSeller.sales = 0;
  assert.deepEqual(restored.endingReport, snapshot);
  const migrated = migrateSave(serializeGameState(restored));
  migrated.endingReport.performance.awardCounts.design = 999;
  assert.deepEqual(restored.endingReport, snapshot);
});

test("legacy completed endings preserve only historic cash and cannot fabricate a report", () => {
  const old = { ...state({ year: 25, endingShown: true, endingScore: 456, cash: 99999, awards: 12,
    releases: [release("later")], ownConsole: true, consoleUsers: 99999 }), schemaVersion: 10 };
  delete old.endingReport;
  const copy = structuredClone(old);
  const migrated = migrateSave(old);
  assert.deepEqual(old, copy);
  assert.deepEqual(migrated.endingReport, { settledAt: null, cash: 456, performance: null });
  const next = settle(migrated);
  assert.equal(next.effects.some(e => e.event?.kind === "ending"), false);
  assert.deepEqual(roundTrip(next.state).endingReport, migrated.endingReport);
});

test("late uncompleted saves record the actual date and preserve incomplete history flags", () => {
  const old = { ...state({ year: 23, month: 7, week: 3, lastAwardYear: 22, releaseHistoryIncomplete: true,
    awardHistoryIncomplete: true, awards: 5, releases: [release("old", { developmentCost: undefined })] }), schemaVersion: 10 };
  const result = settle(migrateSave(old));
  assert.deepEqual(result.state.endingReport.settledAt, { year: 23, month: 7, week: 3 });
  const p = result.state.endingReport.performance;
  assert.equal(p.releaseHistoryIncomplete, true);
  assert.equal(p.awardHistoryIncomplete, true);
  assert.equal(p.awards, 5);
  assert.equal(p.bestProfit, null);
  assert.equal(p.unknownCostCount, 1);
  assert.deepEqual(roundTrip(result.state).endingReport, result.state.endingReport);
});
