"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { WORKER_BEHAVIORS, WORKER_BEHAVIOR_ROWS } from "../game/data";
import type { Project, ResultEntry, Staff, WorkerBehavior } from "../game/types";

const atlasPosition = (index: number, count: number) =>
  `${(index / Math.max(1, count - 1)) * 100}%`;

export function getCharacterColumn(staff: Staff) {
  if (staff.role.includes("美术")) return 1;
  if (staff.role.includes("音") || staff.role.includes("作曲")) return 2;
  if (staff.role.includes("程序") || staff.role.includes("工程")) return 0;
  return 3;
}

export function UiIcon({
  index,
  className = "",
}: {
  index: number;
  className?: string;
}) {
  const column = index % 5;
  const row = Math.floor(index / 5);
  return (
    <span
      className={`ui-icon ${className}`}
      style={
        {
          "--icon-x": atlasPosition(column, 5),
          "--icon-y": atlasPosition(row, 5),
        } as CSSProperties
      }
      aria-hidden="true"
    />
  );
}

export function StaffAvatar({
  staff,
  className = "",
}: {
  staff: Staff;
  className?: string;
}) {
  const column = getCharacterColumn(staff);
  return (
    <span
      className={`staff-sprite-avatar ${className}`}
      style={{ "--sprite-x": atlasPosition(column, 4) } as CSSProperties}
      aria-hidden="true"
    />
  );
}

export function ResultEntries({ entries }: { entries: ResultEntry[] }) {
  const iconByCategory = { resource: 22, quality: 20, risk: 23 };
  return (
    <div className="result-entries" aria-label="实际变化">
      {entries.map((entry, index) => (
        <div className={`result-entry is-${entry.tone}`} key={`${entry.label}-${index}`}>
          <UiIcon index={iconByCategory[entry.category]} />
          <span><small>{entry.label}</small><b>{entry.value}</b>{entry.detail && <em>{entry.detail}</em>}</span>
          <i aria-hidden="true">{entry.tone === "positive" ? "＋" : entry.tone === "negative" ? "−" : "·"}</i>
        </div>
      ))}
    </div>
  );
}

export function getWorkerBehavior(
  staff: Staff,
  project: Project | null,
  index: number,
): WorkerBehavior {
  if (staff.resting || staff.energy < 15) return "tired";
  if (!project) {
    return (["planning", "sipping", "idle", "idle"] as WorkerBehavior[])[
      index % 4
    ];
  }
  if (project.kind === "game" && project.stage === "debug") return "debugging";
  if (staff.role.includes("美术")) return "drawing";
  if (staff.role.includes("音") || staff.role.includes("作曲")) return "mixing";
  if (staff.role.includes("编剧") || staff.role.includes("制作人")) return "planning";
  return project.kind === "console" && index % 3 === 2 ? "debugging" : "coding";
}

export function PixelPerson({
  staff,
  behavior,
  className = "",
}: {
  staff: Staff;
  behavior: WorkerBehavior;
  className?: string;
}) {
  const action = WORKER_BEHAVIORS[behavior];
  const working = !["idle", "sipping", "tired"].includes(behavior);
  const column = getCharacterColumn(staff);
  const spriteStyle =
    behavior === "sipping"
      ? {
          "--sprite-x": atlasPosition(column % 2, 2),
          "--sprite-y": atlasPosition(Math.floor(column / 2), 2),
        }
      : {
          "--sprite-x": atlasPosition(column, 4),
          "--sprite-y": atlasPosition(WORKER_BEHAVIOR_ROWS[behavior], 7),
        };

  return (
    <div
      className={`worker behavior-${behavior} ${working ? "is-working" : "is-resting"} ${className}`}
      style={{ "--worker-delay": `${-(staff.id % 4) * .24}s` } as CSSProperties}
      aria-label={`${staff.name}，${staff.role}，正在${action.label}`}
    >
      <div className="work-puff"><UiIcon index={action.iconIndex} /></div>
      <div
        className={`person-sprite ${behavior === "sipping" ? "uses-sipping-atlas" : ""}`}
        style={spriteStyle as CSSProperties}
        aria-hidden="true"
      />
      <div className="chair" />
      <div className="desk">
        <i className="monitor" />
        <i className="keyboard" />
        <i className="mug" />
      </div>
      <span className="name-tag"><b>{staff.name}</b><small>{action.label}</small></span>
    </div>
  );
}

export function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="pixel-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-title">
          <span>{title}</span>
          <button ref={closeButtonRef} className="close-button" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
