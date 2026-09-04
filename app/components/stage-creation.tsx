"use client";

import { useEffect, useRef, useState, type AnimationEvent } from "react";

import { STAGE_INFO } from "../game/data";
import type { Staff, StageCreationPhase, StageCreationState, WorkerBehavior } from "../game/types";
import { PixelPerson, ResultEntries, UiIcon } from "./pixel-ui";

const STAGE_VISUALS: Record<
  StageCreationState["stage"],
  { behavior: WorkerBehavior; action: string; detail: string; marks: string[] }
> = {
  planning: {
    behavior: "planning",
    action: "整理资料，写下企划核心",
    detail: "纸张、铅笔与灵感灯泡同步闪现",
    marks: ["▤", "✎", "!"],
  },
  coding: {
    behavior: "coding",
    action: "快速敲击键盘，搭建玩法系统",
    detail: "终端方块与代码脉冲持续推进",
    marks: ["▰", "{ }", "0101"],
  },
  graphics: {
    behavior: "drawing",
    action: "挥动画笔，绘制角色与场景",
    detail: "画板、笔刷与像素色块逐层组合",
    marks: ["▧", "╱", "▦"],
  },
  sound: {
    behavior: "mixing",
    action: "调整键盘与混音台的节拍",
    detail: "音符、波形与节拍灯仅作视觉演出",
    marks: ["♪", "≋", "♫"],
  },
};

const FALLBACK_DELAYS: Record<Exclude<StageCreationPhase, "select">, number> = {
  focus: 1_200,
  create: 2_400,
  result: 8_000,
  resume: 800,
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function StageCreationOverlay({
  creation,
  staff,
  onAdvance,
}: {
  creation: StageCreationState;
  staff: Staff[];
  onAdvance: (phase: Exclude<StageCreationPhase, "select">) => void;
}) {
  const reducedMotion = useReducedMotion();
  const resultButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (creation.phase === "select") return;
    if (creation.phase === "result") resultButtonRef.current?.focus();
    const delay = reducedMotion && creation.phase !== "result"
      ? creation.phase === "focus" ? 180 : 40
      : FALLBACK_DELAYS[creation.phase];
    const timer = window.setTimeout(() => onAdvance(creation.phase), delay);
    return () => window.clearTimeout(timer);
  }, [creation.phase, onAdvance, reducedMotion]);

  if (creation.phase === "select") return null;

  const stage = STAGE_INFO[creation.stage];
  const visual = STAGE_VISUALS[creation.stage];
  const actor = creation.leadStaffId
    ? staff.find((member) => member.id === creation.leadStaffId)
    : undefined;
  const title = creation.phase === "focus"
    ? `聚焦 ${creation.leadName}`
    : creation.phase === "create"
      ? `${stage.label}进行中`
      : creation.phase === "resume"
        ? `${stage.short}阶段开始推进`
        : creation.result.title;

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || reducedMotion || creation.phase === "result") return;
    onAdvance(creation.phase);
  };

  return (
    <div
      className={`stage-creation-backdrop phase-${creation.phase} stage-${creation.stage} ${reducedMotion ? "is-reduced" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${stage.label}创作演出`}
    >
      <section className="stage-creation-panel">
        <div className="stage-sequence-marker" onAnimationEnd={handleAnimationEnd}>
          <header className="stage-creation-heading">
            <span>PHASE {stage.short}</span>
            <h2>{title}</h2>
            {creation.phase !== "result" && (
              <p>{creation.leadName} · {creation.roleFit} · {creation.skillLabel} {creation.effectiveSkill.toFixed(1)}</p>
            )}
          </header>

          {creation.phase !== "result" ? (
            <div className="stage-creation-scene">
              {creation.external ? (
                <div className="external-expert-card">
                  <i className="expert-flash" aria-hidden="true" />
                  <UiIcon index={20} />
                  <b>{creation.leadName}</b>
                  <small>一次性专业创作</small>
                </div>
              ) : actor ? (
                <div className="stage-creation-actor">
                  <PixelPerson staff={actor} behavior={visual.behavior} />
                </div>
              ) : null}
              <div className="stage-creation-props" aria-hidden="true">
                {visual.marks.map((mark, index) => <i key={`${mark}-${index}`}>{mark}</i>)}
              </div>
              <div className="stage-action-copy">
                <b>{visual.action}</b>
                <small>{visual.detail}</small>
                {creation.repeated && <em>上次同阶段负责人 · 本次产出已衰减</em>}
              </div>
            </div>
          ) : (
            <div className="stage-creation-result">
              <p>{creation.result.summary}</p>
              <ResultEntries entries={creation.result.entries} />
              <button ref={resultButtonRef} className="primary-button" onClick={() => onAdvance("result")}>
                确认成果 · 开始推进
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
