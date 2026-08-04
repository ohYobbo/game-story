import assert from "node:assert/strict";
import test from "node:test";

import {
  STAGE_TARGETS,
  getContentPopularity,
  getDebugGain,
  getDevelopmentCost,
  getDevelopmentGain,
  getEnergyModifier,
  getFirstWeekSales,
  getQualityGain,
  getReviewScores,
  getSalesIncome,
  getStageSkill,
  getStageTeamPower,
} from "../app/game-balance.ts";

const openingStaff = [
  { role: "程序员", code: 18, scenario: 8, art: 8, sound: 3, energy: 100, maxPower: 9, salary: 20, resting: false },
  { role: "编剧", code: 3, scenario: 24, art: 3, sound: 6, energy: 100, maxPower: 8, salary: 20, resting: false },
];

function randomFrom(seed) {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(1664525, value) + 1013904223) >>> 0) / 4294967296);
}

function tickEnergy(staff) {
  return staff.map((member) => {
    if (member.resting) {
      const energy = Math.min(100, member.energy + 11);
      return { ...member, energy, resting: energy < 95 };
    }
    const energy = Math.max(0, member.energy - 100 / (Math.max(8, member.maxPower) * 3.2));
    return { ...member, energy, resting: energy <= 10 };
  });
}

function simulate(seed, isGreatCombo) {
  const random = randomFrom(seed);
  let staff = openingStaff.map((member) => ({ ...member }));
  let ticks = 0;
  let bugs = 0;
  let research = 0;
  let researchProgress = 0;
  const qualities = {
    fun: 7.1 + (isGreatCombo ? 2 : 0),
    creativity: 6.25 + (isGreatCombo ? 2 : 0),
    graphics: 5.5,
    sound: 3.7,
  };

  for (const stage of ["planning", "coding", "graphics", "sound"]) {
    const lead = openingStaff.reduce((best, member) => getStageSkill(member, stage) > getStageSkill(best, stage) ? member : best);
    let progress = 0;
    while (progress < STAGE_TARGETS[stage]) {
      const stagePower = getStageTeamPower(staff, stage);
      const energyModifier = getEnergyModifier(staff);
      const activeLead = staff[openingStaff.indexOf(lead)].resting ? 0 : getStageSkill(lead, stage);
      progress += getDevelopmentGain(stagePower, activeLead, 1, energyModifier, random());
      const quality = getQualityGain(stagePower, activeLead, 1, random());
      if (stage === "planning") {
        qualities.fun += quality * .65;
        qualities.creativity += quality;
      } else if (stage === "coding") {
        qualities.fun += quality * .35;
      } else if (stage === "graphics") {
        qualities.creativity += quality * .12;
        qualities.graphics += quality * 1.05;
      } else {
        qualities.sound += quality * 1.1;
      }
      bugs += stage === "coding" ? random() * .65 : random() * .12;
      staff = tickEnergy(staff);
      ticks += 1;
    }
  }

  while (bugs > .05) {
    const nextBugs = Math.max(0, bugs - getDebugGain(getStageTeamPower(staff, "debug"), getEnergyModifier(staff), random()));
    researchProgress += (bugs - nextBugs) * 1.5;
    research += Math.floor(researchProgress);
    researchProgress -= Math.floor(researchProgress);
    bugs = nextBugs;
    staff = tickEnergy(staff);
    ticks += 1;
  }

  const scores = getReviewScores({
    qualities,
    isGreatCombo,
    reputation: 0,
    bugs: 0,
    randomValues: [random(), random(), random(), random()],
  });
  const score = scores.reduce((sum, value) => sum + value, 0);
  const contentPopularity = getContentPopularity("桌游", "海盗", isGreatCombo);
  const firstWeekSales = getFirstWeekSales({ score, hype: 3.5, fans: 0, marketUsers: 280_000, contentPopularity, randomValue: random() });
  let weeklySales = firstWeekSales;
  let remainingDemand = Math.round(firstWeekSales * (1.8 + score / 13));
  let income = getSalesIncome(firstWeekSales);
  const trend = Math.max(.72, Math.min(1.12, .68 + score / 100 + 3.5 / 180));
  while (remainingDemand > 0 && weeklySales > 0) {
    weeklySales = Math.min(remainingDemand, Math.max(0, Math.round(weeklySales * trend * .82)));
    remainingDemand -= weeklySales;
    income += getSalesIncome(weeklySales);
  }

  return {
    weeks: ticks / 4,
    score,
    research,
    profit: income - getDevelopmentCost(20, "桌游", "海盗", 1),
  };
}

const runs = 10_000;
const normal = Array.from({ length: runs }, (_, index) => simulate(index + 1, false));
const great = Array.from({ length: runs }, (_, index) => simulate(index + 100_001, true));
const average = (values, key) => values.reduce((sum, value) => sum + value[key], 0) / values.length;
const hallOfFameRate = (values) => values.filter((value) => value.score >= 32).length / values.length;

test(`opening curve averages ${average(normal, "weeks").toFixed(1)} weeks, ${average(normal, "score").toFixed(1)} review points, ${average(normal, "research").toFixed(1)} RP and ${average(normal, "profit").toFixed(0)}K profit`, () => {
  assert.ok(average(normal, "weeks") >= 20 && average(normal, "weeks") <= 50);
  assert.ok(average(normal, "score") >= 14 && average(normal, "score") <= 24);
  assert.ok(average(normal, "research") >= 8 && average(normal, "research") <= 30);
  assert.ok(average(normal, "profit") >= 50 && average(normal, "profit") <= 200);
});

test(`great-combo opening averages ${average(great, "score").toFixed(1)} points with a ${(hallOfFameRate(great) * 100).toFixed(2)}% Hall of Fame rate`, () => {
  assert.ok(hallOfFameRate(great) < .05);
  assert.ok(average(great, "score") > average(normal, "score"));
});
