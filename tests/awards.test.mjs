import assert from "node:assert/strict";
import test from "node:test";
import { getReviewDetails, getReviewScores } from "../app/game-balance.ts";
import { AWARD_RULES, evaluateAnnualAwards, settleAnnualAwards } from "../app/game/awards.ts";
import { applyGameAction } from "../app/game/engine.ts";
import { createInitialGameState, advanceCalendar } from "../app/game/rules.ts";
import { parseSave, serializeGameState, migrateSave } from "../app/game/save.ts";
import { createGameProject, predictEarlyRelease } from "../app/game/predictions.ts";
import { DEFAULT_DIRECTION_POINTS, PLATFORMS } from "../app/game/data.ts";

const quality = (value, overrides = {}) => ({ fun: value, creativity: value, graphics: value, sound: value, bugs: 0, ...overrides });
const release = (id, overrides = {}) => ({ id, name: id, score: 38, sales: 100000, income: 750, weeks: 5, releasedYear: 1, finalQuality: quality(70), ...overrides });
const state = (overrides = {}) => ({ ...createInitialGameState(), year: 2, month: 1, week: 1, companyLevel: 2, fans: 1000, reputation: 20, ...overrides });
const winner = (record, id) => record.categories.find(c => c.category === id)?.winnerId;
const roster = () => [
  release("grand"),
  release("design", { score: 34, sales: 80000, finalQuality: quality(10, { fun: 100, creativity: 100, bugs: 2 }) }),
  release("music", { score: 32, sales: 80000, finalQuality: quality(15, { sound: 110 }) }),
  release("runner", { score: 34, sales: 80000, finalQuality: quality(55) }),
  release("worst", { score: 12, sales: 100, finalQuality: quality(10, { bugs: 20 }) }),
];

test("all five categories have independent winners and committed bounded rewards", () => {
  const before = state({ releases: roster() });
  const original = structuredClone(before);
  const result = settleAnnualAwards(before, 1);
  const record = result.state.awardHistory[0];
  for (const id of ["design", "music", "worst", "grand"]) assert.equal(winner(record, id), id);
  assert.equal(winner(record, "runnerUp"), "runner");
  assert.deepEqual(record.rewards, { cash: 4000, fans: 2300, reputation: 16, awards: 4 });
  assert.equal(result.state.cash, 4500);
  assert.equal(result.state.fans, 3300);
  assert.equal(result.state.reputation, 36);
  assert.equal(result.state.awards, 4);
  assert.equal(record.officeUnlocked, true);
  assert.equal(result.state.companyLevel, 2, "qualification does not pay for or perform the move");
  assert.deepEqual(before, original, "evaluation cannot mutate source releases");
  assert.equal(applyGameAction({ ...result.state, cash: 2500 }, { type: "expand-office", expectedLevel: 2 }).state.companyLevel, 3);
});

test("one work may win both specialties and grand prize but never runner-up too", () => {
  const result = evaluateAnnualAwards(state({ releases: [release("solo")] }), 1);
  for (const id of ["design", "music", "grand"]) assert.equal(winner(result, id), "solo");
  assert.equal(winner(result, "runnerUp"), undefined);
  assert.equal(winner(result, "worst"), undefined);
  assert.equal(result.rewards.awards, 3);
  const fallback = evaluateAnnualAwards(state({ releases: [release("runner", { score: 34, finalQuality: quality(55) })] }), 1);
  assert.equal(winner(fallback, "grand"), undefined);
  assert.equal(winner(fallback, "runnerUp"), "runner");
});

test("ties are stable by score, sales, then ID regardless of list order and RNG", () => {
  const a = release("release-a", { name: "同名" });
  const b = release("release-b", { name: "同名" });
  const first = evaluateAnnualAwards(state({ releases: [b, a] }), 1);
  assert.deepEqual(first, evaluateAnnualAwards(state({ releases: [a, b] }), 1));
  assert.equal(winner(first, "grand"), a.id);
  assert.equal(winner(first, "runnerUp"), b.id);
  const result = applyGameAction(state({ releases: [b, a] }), { type: "scheduled-event" }, () => { throw new Error("Awards must not roll dice"); });
  assert.deepEqual(result.state.awardHistory[0], first);
});

test("positive qualification is historical while worst remains independent", () => {
  const current = release("music", { score: 30, finalQuality: quality(30, { sound: 80 }) });
  const bad = roster().at(-1);
  assert.equal(winner(evaluateAnnualAwards(state({ releases: [current, bad] }), 1), "music"), undefined);
  const qualified = evaluateAnnualAwards(state({ year: 3, releases: [{ ...current, releasedYear: 2 }, { ...bad, releasedYear: 2 }, release("old", { releasedYear: 1 })] }), 2);
  assert.equal(winner(qualified, "music"), "music");
  assert.equal(winner(qualified, "worst"), "worst");
  const future = evaluateAnnualAwards(state({ releases: [current, release("future", { releasedYear: 2 })] }), 1);
  assert.equal(future.qualified, false);
});

test("category thresholds use sales and bugs, and reject quality-incomplete legacy works", () => {
  const lowSales = release("low-sales", { sales: 9999 });
  const buggy = release("buggy", { finalQuality: quality(70, { bugs: 9 }) });
  const missing = release("missing", { finalQuality: undefined });
  const partial = release("partial", { finalQuality: { fun: 90, sound: 90 } });
  const result = evaluateAnnualAwards(state({ releases: [lowSales, buggy, missing, partial, release("unknown", { releasedYear: undefined })] }), 1);
  assert.ok(result.categories.every(c => !c.winnerId));
  assert.equal(result.excluded.length, 2);
  assert.equal(result.unknownYearCount, 1);
  assert.equal(result.rewards.cash, 0);
  assert.equal(winner(evaluateAnnualAwards(state({ releases: [release("exact", { score: 36, sales: 50000, finalQuality: quality(60, { bugs: 3 }) })] }), 1), "grand"), "exact");
  for (const patch of [{ sales: 49999 }, { score: 35 }, { finalQuality: quality(59.9) }, { finalQuality: quality(60, { bugs: 3.1 }) }]) {
    assert.equal(winner(evaluateAnnualAwards(state({ releases: [release("under", patch)] }), 1), "grand"), undefined);
  }
});

test("worst loses only available fans and reputation and cannot unlock the office", () => {
  const result = settleAnnualAwards(state({ fans: 20, reputation: 3, releases: [roster().at(-1)] }), 1);
  assert.deepEqual(result.state.awardHistory[0].rewards, { cash: 0, fans: -20, reputation: -3, awards: 0 });
  assert.equal(result.state.awards, 0);
  assert.equal(result.state.awardHistory[0].officeUnlocked, false);
  assert.equal(result.state.cash, 500);
  assert.equal(result.state.fans, 0);
  assert.equal(result.state.reputation, 0);
  const capped = settleAnnualAwards(state({ reputation: 99, releases: [release("great")] }), 1);
  assert.equal(capped.state.reputation, 100);
  assert.equal(capped.state.awardHistory[0].rewards.reputation, 1);
});

test("empty years are recorded once, including after date changes and save reload", () => {
  const initial = state();
  const settled = settleAnnualAwards(initial, 1).state;
  assert.equal(settled.awardHistory.length, 1);
  assert.equal(settled.awardHistory[0].categories.length, AWARD_RULES.length);
  assert.equal(settled.cash, initial.cash);
  const restored = parseSave(JSON.stringify(serializeGameState(settled)));
  for (const patch of [{}, { month: 6, week: 3, lastEventKey: "" }]) {
    const again = { ...restored, ...patch };
    assert.equal(settleAnnualAwards(again, 1).state, again);
  }
  assert.equal(settleAnnualAwards(initial, 2).state, initial, "cannot award an unfinished year");
  assert.equal(settleAnnualAwards(initial, 0).state, initial);
});

test("December releases are included next year and ceremony does not swallow the launch event", () => {
  const december = state({ year: 1, month: 12, week: 4 });
  const project = createGameProject({ state: december, name: "年末发售", platform: PLATFORMS[0], genre: "桌游", theme: "海盗", direction: "均衡", directionPoints: DEFAULT_DIRECTION_POINTS });
  const finished = applyGameAction({ ...december, project: { ...project, ...quality(80) } }, { type: "complete-project" }, () => .5).state;
  assert.equal(applyGameAction(finished, { type: "scheduled-event" }).effects.length, 0);
  const january = { ...finished, ...advanceCalendar(finished) };
  const ceremony = applyGameAction(january, { type: "scheduled-event" });
  assert.equal(ceremony.effects[0].event.kind, "awards");
  assert.ok(ceremony.state.awardHistory[0].categories.some(c => c.nominees.some(n => n.name === "年末发售")));
  const launch = applyGameAction(ceremony.state, { type: "scheduled-event" });
  assert.match(launch.effects[0].event.headline, /迷你掌机/);
  assert.deepEqual(applyGameAction(launch.state, { type: "scheduled-event" }).effects, []);
  assert.equal(launch.state.awardHistory.length, 1);
});

test("delayed settlement and the year-20 ending keep separate durable markers", () => {
  const late = state({ month: 2, week: 3, lastEventKey: "2-2-3", releases: [release("late")] });
  assert.equal(applyGameAction(late, { type: "scheduled-event" }).state.lastAwardYear, 1);
  const twentieth = state({ year: 20, lastAwardYear: 18, releases: [release("final", { releasedYear: 19 })] });
  const award = applyGameAction(twentieth, { type: "scheduled-event" });
  assert.equal(award.effects[0].event.kind, "awards");
  const restored = parseSave(JSON.stringify(serializeGameState(award.state)));
  const ending = applyGameAction(restored, { type: "scheduled-event" });
  assert.equal(ending.effects[0].event.kind, "ending");
  assert.equal(ending.state.endingScore, award.state.cash);
});

test("annual snapshots survive growing sales and serialization without re-evaluation", () => {
  const settled = settleAnnualAwards(state({ releases: roster() }), 1).state;
  const snapshot = structuredClone(settled.awardHistory);
  const saved = serializeGameState(settled);
  saved.awardHistory[0].categories[0].nominees[0].quality.fun = 1;
  assert.deepEqual(settled.awardHistory, snapshot, "serializer must not expose mutable award snapshots");
  const restored = parseSave(JSON.stringify(serializeGameState({ ...settled, releases: settled.releases.map(r => ({ ...r, sales: r.sales * 10 })) })));
  assert.deepEqual(restored.awardHistory, JSON.parse(JSON.stringify(snapshot)));
  assert.equal(settleAnnualAwards(restored, 1).state, restored);
});

test("legacy awards retain totals and never fabricate past ceremonies or double-pay December", () => {
  for (const month of [11, 12]) {
    const saved = { ...state({ year: 6, month, awards: 3, cash: 2345, releases: roster() }), schemaVersion: 9, balanceVersion: 6 };
    const migrated = migrateSave(saved);
    assert.equal(migrated.awards, 3);
    assert.equal(migrated.cash, 2345);
    assert.equal(migrated.lastAwardYear, month === 12 ? 6 : 5);
    assert.equal(migrated.awardHistoryIncomplete, true);
    assert.deepEqual(migrated.awardHistory, []);
    assert.equal(migrated.releases[0].reviewDetails, undefined);
    assert.deepEqual(parseSave(JSON.stringify(serializeGameState(migrated))), migrated);
    if (month === 12) assert.equal(settleAnnualAwards({ ...migrated, year: 7 }, 6).state.cash, 2345);
  }
});

test("critic preferences affect actual scores and each detail reconstructs its score", () => {
  const input = { qualities: quality(40), isGreatCombo: true, reputation: 27, bugs: 3, randomValues: [.2, .4, .6, .8] };
  const details = getReviewDetails(input);
  assert.deepEqual(getReviewScores(input), details.map(d => d.score));
  for (const d of details) {
    const expected = d.base + d.preference + d.comboBonus + d.styleBonus + d.reputationBonus - d.bugPenalty + d.variation;
    assert.equal(d.rawScore, expected);
    assert.equal(d.score, Math.max(1, Math.min(10, Math.round(expected))));
    assert.equal(d.comboBonus, .75);
    assert.equal(d.bugPenalty, .54);
    assert.equal(d.reputationBonus, .6);
  }
  const art = getReviewDetails({ ...input, qualities: quality(20, { graphics: 100 }) });
  const music = getReviewDetails({ ...input, qualities: quality(20, { sound: 100 }) });
  assert.ok(art[1].score > music[1].score);
  assert.ok(music[3].score > art[3].score);
  assert.equal(getReviewDetails({ ...input, isGreatCombo: false })[0].comboBonus, 0);
  assert.ok(getReviewScores({ ...input, bugs: 100 }).every((score, index) => score < details[index].score));
});

test("release popup, saved review explanations and early-release prediction share scores", () => {
  const before = state();
  const project = createGameProject({ state: before, name: "媒体验收", platform: PLATFORMS[0], genre: "桌游", theme: "历史", direction: "均衡", directionPoints: DEFAULT_DIRECTION_POINTS });
  const ready = { ...before, project: { ...project, ...quality(45, { sound: 90, bugs: 2 }) } };
  const prediction = predictEarlyRelease(ready, ready.project);
  const result = applyGameAction(ready, { type: "complete-project" }, () => .5);
  const review = result.effects.find(e => e.type === "review").review;
  assert.deepEqual(review.scores, review.details.map(d => d.score));
  const restored = parseSave(JSON.stringify(serializeGameState(result.state)));
  assert.deepEqual(restored.releases[0].reviewDetails, review.details);
  const score = restored.releases[0].score;
  assert.ok(score >= prediction.scoreRange.min && score <= prediction.scoreRange.max);
  assert.equal(restored.releases[0].reviewDetails.reduce((sum, d) => sum + d.score, 0), score);
});
