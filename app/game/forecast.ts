import { applyGameAction } from "./engine.ts";
import { STAGE_INFO } from "./data.ts";
import { predictStageLead, type NumberRange } from "./operations.ts";
import type { GameState, Project, RandomSource, StaffChallengeInvestment } from "./types";

export function seededRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(1664525, value) + 1013904223) >>> 0) / 4294967296);
}

// Use the production engine, including recovery, opening creation, events and debugging.
// Decisions take no game time. An unavailable internal lead blocks this policy, just as in the UI.
export function simulateProject(
  initial: GameState,
  project: Project,
  random: RandomSource,
  challengePolicy: StaffChallengeInvestment | "skip" = "skip",
  allowStaffChallenge = true,
) {
  let state = applyGameAction(initial, { type: "start-project", project, cost: project.developmentCost ?? 0 }, random).state;
  let finalProject = project;
  let review = null;
  let challenges = 0;
  for (let ticks = 0; ticks < 2000; ticks += 1) {
    if (state.project?.pendingChallenge) {
      const offer = state.project.pendingChallenge;
      const resolved = applyGameAction(state, { type: "resolve-staff-challenge", offerId: offer.id, investment: challengePolicy }, random);
      state = resolved.state;
      if (state.project?.pendingChallenge) {
        state = applyGameAction(state, { type: "resolve-staff-challenge", offerId: offer.id, investment: "skip" }, random).state;
      }
      challenges += 1;
    }
    const current = state.project;
    if (!current) return { state, finalProject, review, weeks: ticks / 4, blocked: false, challenges };
    if (current.kind === "game" && current.stage !== "debug" && !current.leadName) {
      const lead = state.staff.filter((member) => !member.resting && member.energy > 10)
        .map((member) => ({ member, quality: predictStageLead(state, current, member).openingQualityRange }))
        .sort((a, b) => (b.quality.min + b.quality.max) - (a.quality.min + a.quality.max))[0]?.member;
      if (!lead) return { state, finalProject: current, review, weeks: ticks / 4, blocked: true, challenges };
      state = applyGameAction(state, {
        type: "choose-lead", leadStaffId: lead.id, leadName: lead.name,
        leadSkill: lead[STAGE_INFO[current.stage ?? "planning"].skill],
      }, random).state;
    }
    finalProject = state.project!;
    const result = applyGameAction(state, { type: "tick", isNewWeek: (ticks + 1) % 4 === 0, allowStaffChallenge }, random);
    state = result.state;
    review = result.effects.find((effect) => effect.type === "review")?.review ?? review;
    if (!state.project) return { state, finalProject, review, weeks: (ticks + 1) / 4, blocked: false, challenges };
  }
  return { state, finalProject, review, weeks: 500, blocked: true, challenges };
}

function observedRange(values: number[]): NumberRange | null {
  return values.length ? { min: Math.floor(Math.min(...values)), max: Math.ceil(Math.max(...values)) } : null;
}

export function forecastProject(state: GameState, project: Project) {
  // Fixed samples keep previews stable. These are observed ranges, not guaranteed bounds.
  const samples = Array.from({ length: 64 }, (_, index) => simulateProject(state, project, seededRandom(index + 1)));
  const completed = samples.filter((sample) => !sample.blocked);
  return {
    sampleCount: samples.length,
    blockedRuns: samples.length - completed.length,
    durationWeeks: observedRange(completed.map((sample) => sample.weeks)),
    qualityRange: observedRange(completed.map(({ finalProject: p }) => (p.fun + p.creativity + p.graphics + p.sound) / 4)),
    userRange: observedRange(completed.map((sample) => sample.state.consoleUsers)),
  };
}
