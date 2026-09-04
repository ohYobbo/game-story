import type { StageCreationPhase, StageCreationState } from "./types";

const nextPhase: Record<Exclude<StageCreationPhase, "select" | "resume">, Exclude<StageCreationPhase, "select">> = {
  focus: "create",
  create: "result",
  result: "resume",
};

export function advanceStageCreation(
  current: StageCreationState | null,
  expected: Exclude<StageCreationPhase, "select">,
): StageCreationState | null {
  if (!current || current.phase !== expected) return current;
  if (current.phase === "resume") return null;
  return { ...current, phase: nextPhase[current.phase] };
}
