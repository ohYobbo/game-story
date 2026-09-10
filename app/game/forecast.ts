import { applyGameAction } from "./engine.ts";
import { canWaitForStageLead, isAvailableStageLead } from "./rules.ts";
import { STAGE_INFO } from "./data.ts";
import { predictStageLead, type NumberRange } from "./operations.ts";
import type { GameState, Project, RandomSource, StaffChallengeInvestment } from "./types";

export function seededRandom(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(1664525, value) + 1013904223) >>> 0) / 4294967296);
}

// Use the production engine, including recovery, opening creation, events and debugging.
// Selection takes no game time; recovery uses the same wait action and ticks as the UI.
export function simulateProject(
  initial: GameState,
  project: Project,
  random: RandomSource,
  challengePolicy: StaffChallengeInvestment | "skip" = "skip",
  allowStaffChallenge = true,
) {
  let state = applyGameAction(initial, { type: "start-project", project, cost: project.developmentCost ?? 0 }, random).state;
  if (!state.project) return { state, finalProject: project, review: null, weeks: 0, blocked: true, challenges: 0, recoveryWeeks: 0 };
  let finalProject = project;
  let review = null;
  let challenges = 0;
  let recoveryTicks = 0;
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
    if (!current) return { state, finalProject, review, weeks: ticks / 4, blocked: false, challenges, recoveryWeeks: recoveryTicks / 4 };
    if (current.kind === "game" && current.stage !== "debug" && !current.leadName && !current.waitingForLeadRecovery) {
      const lead = state.staff.filter(isAvailableStageLead)
        .map((member) => ({ member, quality: predictStageLead(state, current, member).openingQualityRange }))
        .sort((a, b) => (b.quality.min + b.quality.max) - (a.quality.min + a.quality.max))[0]?.member;
      if (!lead && !canWaitForStageLead(state)) return { state, finalProject: current, review, weeks: ticks / 4, blocked: true, challenges, recoveryWeeks: recoveryTicks / 4 };
      if (!lead) {
        state = applyGameAction(state, { type: "wait-for-stage-lead" }, random).state;
      } else {
        state = applyGameAction(state, {
          type: "choose-lead", leadStaffId: lead.id, leadName: lead.name,
          leadSkill: lead[STAGE_INFO[current.stage ?? "planning"].skill],
        }, random).state;
      }
    }
    if (state.project?.waitingForLeadRecovery) recoveryTicks += 1;
    finalProject = state.project!;
    const result = applyGameAction(state, { type: "tick", isNewWeek: (ticks + 1) % 4 === 0, allowStaffChallenge }, random);
    state = result.state;
    review = result.effects.find((effect) => effect.type === "review")?.review ?? review;
    if (!state.project) return { state, finalProject, review, weeks: (ticks + 1) / 4, blocked: false, challenges, recoveryWeeks: recoveryTicks / 4 };
  }
  return { state, finalProject, review, weeks: 500, blocked: true, challenges, recoveryWeeks: recoveryTicks / 4 };
}

function observedRange(values: number[]): NumberRange | null {
  return values.length ? { min: Math.floor(Math.min(...values)), max: Math.ceil(Math.max(...values)) } : null;
}

export function forecastProject(state: GameState, project: Project) {
  // Fixed samples keep previews stable. These are observed ranges, not guaranteed bounds.
  // Duration assumes the displayed start budget is available; cash pressure is reported separately.
  const funded = { ...state, project: null, cash: Math.max(state.cash, project.developmentCost ?? 0) };
  const samples = Array.from({ length: 64 }, (_, index) => simulateProject(funded, project, seededRandom(index + 1)));
  const completed = samples.filter((sample) => !sample.blocked);
  return {
    sampleCount: samples.length,
    blockedRuns: samples.length - completed.length,
    recoveryRuns: samples.filter(sample => sample.recoveryWeeks > 0).length,
    durationWeeks: observedRange(completed.map((sample) => sample.weeks)),
    qualityRange: observedRange(completed.map(({ finalProject: p }) => (p.fun + p.creativity + p.graphics + p.sound) / 4)),
    userRange: observedRange(completed.map((sample) => sample.state.consoleUsers)),
  };
}
