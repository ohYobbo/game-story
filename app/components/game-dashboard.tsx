"use client";

import { CONTRACT_QUALITY_LABELS, STAGE_INFO, STAGE_ORDER } from "../game/data";
import { formatCash } from "../game/rules";
import type { GameState, Modal, Project, Release } from "../game/types";
import { PixelPerson, UiIcon, getWorkerBehavior } from "./pixel-ui";

type OpenMenu = (modal: Modal) => void;

export function TopHud({
  year,
  month,
  week,
  cash,
}: Pick<GameState, "year" | "month" | "week" | "cash">) {
  return (
    <header className="top-hud">
      <div className="studio-brand">
        <UiIcon index={0} className="brand-mark" />
        <div><b>像素工坊</b><small>PIXEL STUDIO</small></div>
      </div>
      <div className="date-card">
        <span>第 {year} 年</span>
        <b>{month} 月 · 第 {week} 周</b>
      </div>
      <div className="money-card">
        <small>公司资金</small>
        <strong>{formatCash(cash)}</strong>
      </div>
    </header>
  );
}

export function OfficeView({
  companyLevel,
  staff,
  project,
  fans,
  research,
}: Pick<GameState, "companyLevel" | "staff" | "project" | "fans" | "research">) {
  return (
    <section className={`office office-level-${companyLevel}`} aria-label={`像素工作室第 ${companyLevel} 阶段办公室`}>
      <div className="office-light" aria-hidden="true" />
      <div className={`workers count-${staff.length}`}>
        {staff.map((member, index) => (
          <PixelPerson key={member.id} staff={member} behavior={getWorkerBehavior(member, project, index)} />
        ))}
      </div>
      {!project && (
        <div className="secretary-tip">
          <UiIcon index={2} className="secretary-face" />
          <span>社长，接下来要做什么？</span>
        </div>
      )}
      <div className="floating-stats">
        <span><UiIcon index={23} />粉丝 {fans.toLocaleString()}</span>
        <span><UiIcon index={24} />研究 {research}</span>
      </div>
    </section>
  );
}

export function NewsStrip({
  industryNews,
  chartLeader,
}: {
  industryNews: string;
  chartLeader?: Release;
}) {
  return (
    <div className="news-strip" aria-live="polite">
      <b>NEWS</b>
      <span>{industryNews}</span>
      {chartLeader && <em>周榜 #{chartLeader.weeklyRank ?? "—"}</em>}
    </div>
  );
}

export function ProjectConsole({
  project,
  projectPercent,
  onForceRelease,
  onOpenMenu,
}: {
  project: Project | null;
  projectPercent: number;
  onForceRelease: () => void;
  onOpenMenu: OpenMenu;
}) {
  return (
    <section className="project-console" aria-live="polite">
      {project ? (
        <>
          <div className="project-heading">
            <div>
              <small>
                {project.kind === "game"
                  ? `${STAGE_INFO[project.stage ?? "coding"].label} · ${project.leadName ?? "等待负责人"}`
                  : project.kind === "console" ? "秘密硬件研发计划" : "承接外包项目"}
              </small>
              <strong>{project.name}</strong>
            </div>
            <span className="percent">{projectPercent}%</span>
          </div>
          <div className="progress-track"><i style={{ width: `${projectPercent}%` }} /></div>
          {project.kind === "game" ? (
            <>
              <div className="stage-ribbon">
                {STAGE_ORDER.map((stage, index) => {
                  const currentIndex = STAGE_ORDER.indexOf(project.stage ?? "coding");
                  return <span key={stage} className={index < currentIndex ? "done" : index === currentIndex ? "active" : ""}>{STAGE_INFO[stage].short}</span>;
                })}
              </div>
              <div className="quality-grid">
                <span><UiIcon index={5} />趣味 <b>{Math.round(project.fun)}</b></span>
                <span><UiIcon index={6} />创意 <b>{Math.round(project.creativity)}</b></span>
                <span><UiIcon index={7} />画面 <b>{Math.round(project.graphics)}</b></span>
                <span><UiIcon index={8} />音乐 <b>{Math.round(project.sound)}</b></span>
                <span><UiIcon index={9} />漏洞 <b>{Math.round(project.bugs)}</b></span>
              </div>
              {project.stage === "debug" && (
                <div className="debug-strip">
                  <span>全员除错中 · 剩余 {Math.ceil(project.bugs)} 个漏洞</span>
                  <button onClick={onForceRelease}>带漏洞发售</button>
                </div>
              )}
            </>
          ) : project.kind === "console" ? (
            <div className="console-progress">
              <span><b>CPU</b>{Math.round(projectPercent * .8)}</span>
              <span><b>画面</b>{Math.round(projectPercent * .72)}</span>
              <span><b>声音</b>{Math.round(projectPercent * .64)}</span>
              <em>{project.consoleSpec?.cpu ?? "定制芯片"} · {project.consoleSpec?.media ?? "专用媒体"} · 投入 {formatCash(project.consoleSpec?.cost ?? 12_000)}</em>
            </div>
          ) : (
            <div className="contract-progress">
              <div>
                <span>剩余期限 <b>{Math.max(0, (project.deadlineWeeks ?? 12) - (project.elapsedWeeks ?? 0))} 周</b></span>
                <em>完成后获得 {formatCash(project.reward ?? 0)} 与研究点</em>
              </div>
              <div className="contract-targets">
                {Object.entries(project.qualityTargets ?? {}).map(([key, target]) => {
                  const current = project[key as keyof Pick<Project, "fun" | "creativity" | "graphics" | "sound">] as number;
                  return (
                    <span key={key} className={current >= (target ?? 0) ? "done" : ""}>
                      {CONTRACT_QUALITY_LABELS[key as keyof typeof CONTRACT_QUALITY_LABELS]} {Math.min(Math.round(current), target ?? 0)}/{target}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="idle-project">
          <UiIcon index={0} className="idle-icon" />
          <div><strong>当前没有项目</strong><small>点击“开发”制作你的下一款游戏</small></div>
          <button onClick={() => onOpenMenu("develop")}>开始企划</button>
        </div>
      )}
    </section>
  );
}

export function BottomMenu({ modal, onOpenMenu }: { modal: Modal; onOpenMenu: OpenMenu }) {
  const staffActive = ["staff", "training", "career", "hire", "shop"].includes(modal ?? "");
  const marketingActive = ["marketing", "items"].includes(modal ?? "");
  return (
    <nav className="bottom-menu" aria-label="经营菜单">
      <button className={modal === "develop" ? "is-active" : ""} aria-pressed={modal === "develop"} onClick={() => onOpenMenu("develop")}><UiIcon index={0} /><span>开发</span></button>
      <button className={modal === "contracts" ? "is-active" : ""} aria-pressed={modal === "contracts"} onClick={() => onOpenMenu("contracts")}><UiIcon index={1} /><span>外包</span></button>
      <button className={staffActive ? "is-active" : ""} aria-pressed={staffActive} onClick={() => onOpenMenu("staff")}><UiIcon index={2} /><span>员工</span></button>
      <button className={marketingActive ? "is-active" : ""} aria-pressed={marketingActive} onClick={() => onOpenMenu("marketing")}><UiIcon index={3} /><span>宣传</span></button>
      <button className={modal === "records" ? "is-active" : ""} aria-pressed={modal === "records"} onClick={() => onOpenMenu("records")}><UiIcon index={4} /><span>资料</span></button>
    </nav>
  );
}

export function GameDashboard({
  game,
  modal,
  paused,
  speed,
  toast,
  projectPercent,
  chartLeader,
  onOpenMenu,
  onForceRelease,
  onSave,
  onRestart,
  onTogglePause,
  onCycleSpeed,
}: {
  game: GameState;
  modal: Modal;
  paused: boolean;
  speed: number;
  toast: string;
  projectPercent: number;
  chartLeader?: Release;
  onOpenMenu: OpenMenu;
  onForceRelease: () => void;
  onSave: () => void;
  onRestart: () => void;
  onTogglePause: () => void;
  onCycleSpeed: () => void;
}) {
  return (
    <>
      <TopHud year={game.year} month={game.month} week={game.week} cash={game.cash} />
      <OfficeView companyLevel={game.companyLevel} staff={game.staff} project={game.project} fans={game.fans} research={game.research} />
      <NewsStrip industryNews={game.industryNews} chartLeader={chartLeader} />
      <ProjectConsole project={game.project} projectPercent={projectPercent} onForceRelease={onForceRelease} onOpenMenu={onOpenMenu} />
      <BottomMenu modal={modal} onOpenMenu={onOpenMenu} />
      <div className="utility-row">
        <button onClick={onSave}>保存</button>
        <button onClick={onRestart}>新开公司</button>
        <button onClick={onTogglePause}>{paused ? "继续" : "暂停"}</button>
        <button onClick={onCycleSpeed}>速度 ×{speed}</button>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
      {paused && !modal && <div className="pause-badge">游戏暂停</div>}
    </>
  );
}
