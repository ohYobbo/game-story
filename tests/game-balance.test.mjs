import assert from "node:assert/strict";
import test from "node:test";

import {
  HALL_OF_FAME_SCORE,
  STARTING_CASH,
  STARTING_FANS,
  STARTING_REPUTATION,
  STARTING_RESEARCH,
  getAnnualPayroll,
  getCareerOptionsFor,
  getContentPopularity,
  getDevelopmentCost,
  getFirstWeekSales,
  getNextSalary,
  getReviewScores,
  getReleaseFatigueMultiplier,
  getStageTeamPower,
} from "../app/game-balance.ts";

const openingStaff = [
  { role: "程序员", code: 18, scenario: 8, art: 8, sound: 3, energy: 100, maxPower: 9, salary: 20 },
  { role: "编剧", code: 3, scenario: 24, art: 3, sound: 6, energy: 100, maxPower: 8, salary: 20 },
];

test("opening economy matches the intended early-game baseline", () => {
  assert.equal(STARTING_CASH, 500);
  assert.equal(STARTING_FANS, 0);
  assert.equal(STARTING_RESEARCH, 10);
  assert.equal(STARTING_REPUTATION, 0);
  assert.equal(getAnnualPayroll(openingStaff), 40);
  assert.equal(getDevelopmentCost(20, "益智", "幻想", 1), 55);
});

test("stage power values the relevant discipline instead of a global stat sum", () => {
  assert.equal(getStageTeamPower(openingStaff, "coding"), 21);
  assert.equal(getStageTeamPower(openingStaff, "graphics"), 11);
  assert.equal(getStageTeamPower(openingStaff, "sound"), 9);
  assert.equal(getStageTeamPower(openingStaff, "planning"), 36.6);
  assert.equal(getStageTeamPower([{ ...openingStaff[0], resting: true }, openingStaff[1]], "coding"), 3);
});

test("a strong opening game does not become Hall of Fame solely from a great combo", () => {
  const qualities = { fun: 22, creativity: 20, graphics: 26, sound: 22 };
  const normal = getReviewScores({ qualities, isGreatCombo: false, reputation: 0, bugs: 0, randomValues: [.5, .5, .5, .5] });
  const great = getReviewScores({ qualities, isGreatCombo: true, reputation: 0, bugs: 0, randomValues: [.5, .5, .5, .5] });
  assert.equal(normal.reduce((sum, score) => sum + score, 0), 18);
  assert.equal(great.reduce((sum, score) => sum + score, 0), 20);
  assert.ok(great.reduce((sum, score) => sum + score, 0) < HALL_OF_FAME_SCORE);
});

test("an experienced studio can still reach award and Hall of Fame scores", () => {
  const scores = getReviewScores({
    qualities: { fun: 70, creativity: 70, graphics: 70, sound: 70 },
    isGreatCombo: true,
    reputation: 40,
    bugs: 0,
    randomValues: [.5, .5, .5, .5],
  });
  assert.ok(scores.reduce((sum, score) => sum + score, 0) >= 36);
});

test("content popularity affects sales without replacing the critic score", () => {
  const normalPopularity = getContentPopularity("益智", "幻想", false);
  const greatPopularity = getContentPopularity("益智", "幻想", true);
  assert.ok(greatPopularity > normalPopularity);
  assert.equal(getFirstWeekSales({ score: 18, hype: 3.5, fans: 0, marketUsers: 280_000, contentPopularity: 1, randomValue: .5 }), 5676);
});

test("repeated genres or themes reduce demand without collapsing it", () => {
  const releases = [
    { genre: "益智", theme: "动物" },
    { genre: "益智", theme: "海盗" },
    { genre: "冒险", theme: "动物" },
    { genre: "益智", theme: "动物" },
  ];
  assert.equal(getReleaseFatigueMultiplier(releases, "益智", "动物"), .65);
  assert.equal(getReleaseFatigueMultiplier(releases, "教育", "历史"), 1);
});

test("salary compounds by twenty percent on every level up", () => {
  assert.equal(getNextSalary(20), 24);
  assert.equal(getNextSalary(getNextSalary(20)), 29);
});

test("advanced careers use the original paired prerequisites", () => {
  assert.ok(getCareerOptionsFor(["程序员", "编剧"], "程序员").includes("总监"));
  assert.ok(!getCareerOptionsFor(["程序员", "编剧"], "程序员").includes("制作人"));
  assert.ok(getCareerOptionsFor(["美术", "音效师"], "美术").includes("制作人"));
  assert.ok(getCareerOptionsFor(["总监", "制作人"], "总监").includes("硬件工程师"));
  assert.ok(getCareerOptionsFor(["硬件工程师"], "程序员").includes("黑客"));
});
