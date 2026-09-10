"use client";

import type { Dispatch, SetStateAction } from "react";

import { CAREER_REQUIREMENTS, OFFICE_UPGRADE_COSTS, getCareerOptionsFor, getLevelUpCost } from "../game-balance";
import { getOfficeUnlocks } from "../game/progression";
import { getPlatformMarkets, type PlatformMarket } from "../game/platforms";
import { COMBINATION_RULES } from "../game/combinations";
import {
  ADVERTISING_METHODS,
  CONSOLE_BODIES,
  CONSOLE_CPUS,
  CONSOLE_MEDIA,
  CONTRACTS,
  CONTRACT_QUALITY_LABELS,
  DIRECTION_AXES,
  DIRECTIONS,
  EVENT_ICON_INDEX,
  HIRING_METHODS,
  ROLE_UNLOCK_RULES,
  SHOP_ITEMS,
  STAGE_INFO,
  STAGE_ORDER,
  TRAINING_METHODS,
} from "../game/data";
import {
  canWaitForStageLead,
  clamp,
  formatCash,
  formatUsers,
  getKnowledgeLevel,
  getOfficeCapacity,
} from "../game/rules";
import {
  predictContract,
  predictExternalLead,
  predictItemUse,
  predictMarketing,
  predictStageLead,
  predictTraining,
  getStaffChallengeSuccessRate,
  STAFF_CHALLENGE_INVESTMENTS,
  STAFF_CHALLENGE_METRICS,
  STAFF_CHALLENGE_SUCCESS_CAP,
  type ConsolePrediction,
  type GamePlanPrediction,
} from "../game/predictions";
import type {
  DirectionKey,
  DirectionPoints,
  EventData,
  FanSegments,
  GameState,
  Inventory,
  Modal,
  ReviewData,
  ResultData,
  Staff,
  StaffChallengeInvestment,
} from "../game/types";
import { ModalShell, ResultEntries, StaffAvatar, UiIcon } from "./pixel-ui";

type GameModalsProps = {
  game: GameState;
  modal: Modal;
  setModal: Dispatch<SetStateAction<Modal>>;
  closeModal: () => void;
  announce: (message: string) => void;
  eventData: EventData | null;
  review: ReviewData | null;
  resultData: ResultData | null;
  planPrediction: GamePlanPrediction | null;
  consolePrediction: ConsolePrediction | null;
  selectedStaff: Staff | null;
  availablePlatforms: PlatformMarket[];
  sequelCandidates: GameState["releases"];
  hasHardwareEngineer: boolean;
  hardwareEngineerCount: number;
  selectedConsoleSpec: { cost: number; performance: number };
  merchantOpen: boolean;
  getMerchantPrice: (base: number, fixed?: boolean) => number;
  remainingDirectionPoints: number;
  selectedDevelopmentCost: number;
  gameName: string;
  setGameName: Dispatch<SetStateAction<string>>;
  selectedPlatform: string;
  setSelectedPlatform: Dispatch<SetStateAction<string>>;
  selectedGenre: string;
  setSelectedGenre: Dispatch<SetStateAction<string>>;
  selectedTheme: string;
  setSelectedTheme: Dispatch<SetStateAction<string>>;
  selectedDirection: string;
  setSelectedDirection: Dispatch<SetStateAction<string>>;
  selectedDirectionPoints: DirectionPoints;
  selectedSequelId: string;
  setSelectedSequelId: Dispatch<SetStateAction<string>>;
  consoleCpu: string;
  setConsoleCpu: Dispatch<SetStateAction<string>>;
  consoleMedia: string;
  setConsoleMedia: Dispatch<SetStateAction<string>>;
  consoleBody: string;
  setConsoleBody: Dispatch<SetStateAction<string>>;
  adjustDirectionPoint: (key: DirectionKey, delta: number) => void;
  startGame: () => void;
  startConsoleProject: () => void;
  assignStageLead: (member: Staff) => void;
  hireExternalLead: () => void;
  waitForStageLead: () => void;
  startContract: (contract: (typeof CONTRACTS)[number]) => void;
  levelUp: (id: number) => void;
  openTraining: (id: number) => void;
  openCareer: (id: number) => void;
  expandOffice: () => void;
  runTraining: (method: (typeof TRAINING_METHODS)[number]) => void;
  changeCareer: (role: string) => void;
  buyCareerManual: () => void;
  buyShopItem: (item: (typeof SHOP_ITEMS)[number]) => void;
  applyItem: (key: keyof Inventory) => void;
  hireWithMethod: (method: (typeof HIRING_METHODS)[number]) => void;
  advertise: (
    cost: number,
    hype: number,
    name: string,
    segment: keyof FanSegments,
  ) => void;
  attendExpo: (
    cost: number,
    gainedFans: number,
    gainedHype: number,
    label: string,
  ) => void;
  resolveStaffChallenge: (investment: StaffChallengeInvestment | "skip") => void;
};

export function GameModals({
  game,
  modal,
  setModal,
  closeModal,
  announce,
  eventData,
  review,
  resultData,
  planPrediction,
  consolePrediction,
  selectedStaff,
  availablePlatforms,
  sequelCandidates,
  hasHardwareEngineer,
  hardwareEngineerCount,
  selectedConsoleSpec,
  merchantOpen,
  getMerchantPrice,
  remainingDirectionPoints,
  selectedDevelopmentCost,
  gameName,
  setGameName,
  selectedPlatform,
  setSelectedPlatform,
  selectedGenre,
  setSelectedGenre,
  selectedTheme,
  setSelectedTheme,
  selectedDirection,
  setSelectedDirection,
  selectedDirectionPoints,
  selectedSequelId,
  setSelectedSequelId,
  consoleCpu,
  setConsoleCpu,
  consoleMedia,
  setConsoleMedia,
  consoleBody,
  setConsoleBody,
  adjustDirectionPoint,
  startGame,
  startConsoleProject,
  assignStageLead,
  hireExternalLead,
  waitForStageLead,
  startContract,
  levelUp,
  openTraining,
  openCareer,
  expandOffice,
  runTraining,
  changeCareer,
  buyCareerManual,
  buyShopItem,
  applyItem,
  hireWithMethod,
  advertise,
  attendExpo,
  resolveStaffChallenge,
}: GameModalsProps) {
  const {
    cash,
    research,
    project,
    ownConsole,
    consoleUsers,
    companyLevel,
    releases,
    unlockedGenres,
    unlockedThemes,
    genreExperience,
    themeExperience,
    staff,
    careerManuals,
    merchantYear,
    merchantPurchases,
    inventory,
    year,
    fans,
    awards,
    reputation,
    fanSegments,
    endingShown,
    endingScore,
  } = game;
  const pendingChallenge = project?.kind === "game" ? project.pendingChallenge : undefined;
  const challengeMember = pendingChallenge
    ? staff.find((member) => member.id === pendingChallenge.staffId)
    : undefined;
  const challengeMetric = pendingChallenge
    ? STAFF_CHALLENGE_METRICS[pendingChallenge.metric]
    : undefined;

  return (
    <>

        {modal === "develop" && (
          <ModalShell title="新作企划会议" onClose={closeModal}>
            {project ? (
              <div className="notice-card">当前正在制作《{project.name}》，请先完成手头项目。</div>
            ) : (
              <div className="develop-form">
                <div className={`hardware-card ${ownConsole ? "is-complete" : ""}`}>
                  <UiIcon index={21} className="hardware-icon" />
                  <span>
                    <b>{ownConsole ? "自研主机：像素盒子" : "自研主机计划"}</b>
                    <small>
                      {ownConsole
                        ? `当前用户 ${formatUsers(consoleUsers)} · 可直接选择自家平台开发`
                        : companyLevel >= 3 && releases.length >= 2
                          ? hasHardwareEngineer
                            ? "配置芯片、媒体与机型，打造自家游戏平台"
                            : "需要培养 1 名硬件工程师"
                          : "搬入大楼办公室并发售 2 款游戏后解锁"}
                    </small>
                  </span>
                  {!ownConsole && <button onClick={() => setModal("console")} disabled={companyLevel < 3 || releases.length < 2 || !hasHardwareEngineer}>配置</button>}
                </div>
                {companyLevel >= 3 && sequelCandidates.length > 0 && (
                  <label className="sequel-picker">
                    <span><b>名人堂续作</b><small>前作评分提供四项品质加成；续作跌出名人堂会终止系列</small></span>
                    <select value={selectedSequelId} onChange={(event) => {
                      const id = event.target.value;
                      const sequel = sequelCandidates.find((item) => item.id === id);
                      setSelectedSequelId(id);
                      if (sequel) {
                        setGameName(`${sequel.name} 2`);
                        setSelectedGenre(sequel.genre ?? selectedGenre);
                        setSelectedTheme(sequel.theme ?? selectedTheme);
                      }
                    }}>
                      <option value="">制作全新作品</option>
                      {sequelCandidates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.score}/40 · 第 {releases.length - releases.indexOf(item)} 部</option>)}
                    </select>
                  </label>
                )}
                <label className="field-label">游戏名称<input value={gameName} maxLength={12} onChange={(e) => setGameName(e.target.value)} /></label>
                <div className="field-label">选择平台</div>
                <div className="platform-grid">
                  {availablePlatforms.map((item) => (
                    <button key={item.name} className={selectedPlatform === item.name ? "selected" : ""} onClick={() => setSelectedPlatform(item.name)}>
                      <UiIcon index={21} className="platform-icon" />
                      <b>{item.name}</b><small>{item.phase} · 用户 {formatUsers(item.users)}</small>
                      <small>{item.weeksRemaining === null ? "长期运营" : `${item.weeksRemaining} 周后退市`}</small>
                      <em>每作开发 {formatCash(item.cost)}</em>
                      <small>{game.platformLicenses.includes(item.name) ? "已授权 · 无需再次付费" : item.name === "像素盒子" ? "自研平台 · 免授权费" : `首次授权 ${formatCash(item.licenseFee)}`}</small>
                    </button>
                  ))}
                </div>
                <details className="platform-calendar">
                  <summary>平台上市与退市日历</summary>
                  {getPlatformMarkets(game).filter(item => item.name !== "像素盒子").map(item => (
                    <p key={item.name}><b>{item.name} · {item.phase}</b><span>第 {item.debut} 年 1 月上市 · {item.retire >= 99 ? "长期运营" : `第 ${item.retire} 年末退市`}</span></p>
                  ))}
                </details>
                <div className="two-columns">
                  <label className="field-label">游戏类型<select value={selectedGenre} disabled={Boolean(selectedSequelId)} onChange={(e) => setSelectedGenre(e.target.value)}>{unlockedGenres.map((item) => <option key={item} value={item}>{item} Lv.{getKnowledgeLevel(genreExperience[item] ?? 0)}</option>)}</select></label>
                  <label className="field-label">游戏题材<select value={selectedTheme} disabled={Boolean(selectedSequelId)} onChange={(e) => setSelectedTheme(e.target.value)}>{unlockedThemes.map((item) => <option key={item} value={item}>{item} Lv.{getKnowledgeLevel(themeExperience[item] ?? 0)}</option>)}</select></label>
                </div>
                <div className={`combo-note ${planPrediction?.combinationLevel === "杰作相性" ? "great" : ""}`}>
                  组合评价：{planPrediction?.combinationLevel ?? "计算中"}
                  <small>市场流行度 {planPrediction?.popularityPercent ?? "—"}% · 近期需求保留 {planPrediction?.fatiguePercent ?? "—"}%</small>
                </div>
                <div className="field-label">开发方针</div>
                <div className="direction-row">
                  {DIRECTIONS.map((item) => <button key={item.name} className={selectedDirection === item.name ? "selected" : ""} onClick={() => setSelectedDirection(item.name)}><b>{item.name}</b><small>{item.note}</small></button>)}
                </div>
                <div className="direction-points-head">
                  <span><b>开发方向</b><small>类型 Lv.2 / Lv.5 会增加可分配点数</small></span>
                  <strong className={remainingDirectionPoints === 0 ? "is-ready" : ""}>剩余 {remainingDirectionPoints}</strong>
                </div>
                <div className="direction-points-grid">
                  {DIRECTION_AXES.map((axis) => (
                    <div className="direction-axis" key={axis.key}>
                      <span><b>{axis.label}</b><small>{axis.note}</small></span>
                      <div>
                        <button aria-label={`${axis.label}减少`} onClick={() => adjustDirectionPoint(axis.key, -1)} disabled={selectedDirectionPoints[axis.key] <= 0}>−</button>
                        <strong>{selectedDirectionPoints[axis.key]}</strong>
                        <button aria-label={`${axis.label}增加`} onClick={() => adjustDirectionPoint(axis.key, 1)} disabled={selectedDirectionPoints[axis.key] >= 10 || remainingDirectionPoints <= 0}>＋</button>
                      </div>
                    </div>
                  ))}
                </div>
                {planPrediction && (
                  <section className="prediction-panel" aria-label="企划预测摘要">
                    <div className="prediction-title"><b>企划确认摘要</b><small>64 次固定样本的观测范围，并非保证；假定已备齐开工资金，每阶段选择开工品质最高的可用内部负责人，无人可用时计入等待恢复时间；跳过员工挑战，不追加培训、宣传或道具</small></div>
                    <div className="prediction-metrics">
                      <span><small>开工总成本</small><b>{formatCash(planPrediction.cost)}</b><em>制作费 {formatCash(planPrediction.productionCost)}（含平台基础开发费 {formatCash(planPrediction.platformDevelopmentFee)}，随方针计算）＋首次授权 {formatCash(planPrediction.licenseFee)}</em></span>
                      <span><small>常规周期</small><b>{planPrediction.durationWeeks ? `${planPrediction.durationWeeks.min}–${planPrediction.durationWeeks.max} 周` : "无法估计"}</b><em>含预计除错</em></span>
                      <span><small>品质倾向</small><b>{planPrediction.qualityLevel}</b><em>{planPrediction.qualityRange ? `${planPrediction.qualityRange.min}–${planPrediction.qualityRange.max}` : "无可完成样本"}</em></span>
                      <span><small>现金 / 风险</small><b>{planPrediction.cashPressure} / {planPrediction.riskLevel}</b><em>确认前检查</em></span>
                      <span><small>平台市场 · {planPrediction.platformPhase}</small><b>{planPrediction.marketLevel} · {formatUsers(planPrediction.marketUsers)}</b><em>{planPrediction.platformWeeksRemaining === null ? "长期运营" : `${planPrediction.platformWeeksRemaining} 周后退市`}{planPrediction.marketEvent && ` · ${planPrediction.marketEvent}`}</em></span>
                      <span><small>核心受众</small><b>{planPrediction.audience}</b><em>{planPrediction.audienceChanges.join(" · ")}</em></span>
                    </div>
                    <p className="platform-terms">确认开工一次性扣除总成本，取消企划不收费。首次授权永久保留；市场用户量在开工时锁定，开发中退市仍可完成发售。推广结束不会改变已开工作品的用户量。</p>
                    <div className="prediction-factors">
                      <div><b>预期优势</b>{planPrediction.advantages.map((factor) => <span className={`is-${factor.tone}`} key={factor.text}>＋ {factor.text}</span>)}</div>
                      <div><b>主要风险</b>{planPrediction.risks.map((factor) => <span className={`is-${factor.tone}`} key={factor.text}>！ {factor.text}</span>)}</div>
                    </div>
                  </section>
                )}
                <button className="primary-button" onClick={startGame}>
                  {remainingDirectionPoints > 0 ? `分配剩余 ${remainingDirectionPoints} 点` : `通过企划 · ${formatCash(selectedDevelopmentCost)}`}
                </button>
              </div>
            )}
          </ModalShell>
        )}

        {modal === "console" && consolePrediction && (
          <ModalShell title="自研主机实验室" onClose={() => setModal("develop")}>
            <p className="modal-intro">选择 CPU、媒体与机型。规格越高，研发周期与成本越大，首发用户也越多。</p>
            <div className="console-builder">
              <label>处理器<select value={consoleCpu} onChange={(event) => setConsoleCpu(event.target.value)}>{CONSOLE_CPUS.filter((item) => (item.requiredEngineers ?? 0) <= hardwareEngineerCount).map((item) => <option key={item.name} value={item.name}>{item.name} · +{formatCash(item.cost)}</option>)}</select></label>
              <label>存储媒体<select value={consoleMedia} onChange={(event) => setConsoleMedia(event.target.value)}>{CONSOLE_MEDIA.filter((item) => (item.requiredEngineers ?? 0) <= hardwareEngineerCount).map((item) => <option key={item.name} value={item.name}>{item.name} · +{formatCash(item.cost)}</option>)}</select></label>
              <label>主机形态<select value={consoleBody} onChange={(event) => setConsoleBody(event.target.value)}>{CONSOLE_BODIES.map((item) => <option key={item.name} value={item.name}>{item.name} · +{formatCash(item.cost)}</option>)}</select></label>
              <div className="console-spec-summary">
                <span><small>综合性能</small><b>×{selectedConsoleSpec.performance.toFixed(2)}</b></span>
                <span><small>研发预算</small><b>{formatCash(selectedConsoleSpec.cost)}</b></span>
                <span><small>预计周期</small><b>{consolePrediction.durationWeeks ? `${consolePrediction.durationWeeks.min}–${consolePrediction.durationWeeks.max} 周` : "无法估计"}</b></span>
                <span><small>初期用户</small><b>{consolePrediction.userRange ? `${formatUsers(consolePrediction.userRange.min)}–${formatUsers(consolePrediction.userRange.max)}` : "无法估计"}</b></span>
                <span><small>工程门槛</small><b>{hardwareEngineerCount} 名工程师</b></span>
                <span><small>现金压力</small><b>{Math.round(consolePrediction.cashRatio * 100)}%</b></span>
              </div>
              <button className="primary-button" onClick={startConsoleProject}>确认规格 · 开始研发</button>
            </div>
          </ModalShell>
        )}

        {modal === "stage" && project?.kind === "game" && project.stage !== "debug" && (
          <ModalShell
            title={`${STAGE_INFO[project.stage ?? "planning"].label}负责人`}
            onClose={() => announce("请先选择负责人才能继续制作")}
          >
            <div className="stage-brief">
              <div className="stage-number">{STAGE_ORDER.indexOf(project.stage ?? "planning") + 1}</div>
              <div>
                <b>{STAGE_INFO[project.stage ?? "planning"].label}</b>
                <small>{STAGE_INFO[project.stage ?? "planning"].note}。负责人能力会直接影响最终品质。</small>
              </div>
            </div>
            {canWaitForStageLead(game) && (
              <div className="recovery-notice">
                <p>全体员工暂时无法负责。可等待体力恢复后重新选人；等待期间日历、销量与年度事件照常推进，制作进度和品质不变。</p>
                <button className="primary-button" onClick={waitForStageLead}>等待员工恢复体力</button>
              </div>
            )}
            <div className="lead-grid">
              {staff.map((member) => {
                const prediction = predictStageLead(game, project, member);
                return (
                  <button className={`lead-choice is-${prediction.contributionLevel}`} key={member.id} onClick={() => assignStageLead(member)} disabled={Boolean(member.resting || member.energy <= 10)}>
                    <StaffAvatar staff={member} className="mini-avatar" />
                    <span>
                      <b>{member.name}<em>{prediction.contributionLevel}</em></b>
                      <small>{member.role} · {prediction.roleFit} · 体力 {Math.round(member.energy)}%{prediction.mayRest ? " · 可能中途休息" : ""}</small>
                      <small>{member.resting || member.energy <= 10 ? "正在休息 · 暂时无法负责" : `开工进度 ${prediction.openingProgressRange.min.toFixed(1)}–${prediction.openingProgressRange.max.toFixed(1)} · 开工品质 ${prediction.openingQualityRange.min.toFixed(1)}–${prediction.openingQualityRange.max.toFixed(1)}`}</small>
                      {!member.resting && member.energy > 10 && <small>开工体力 -{prediction.openingEnergyCost.toFixed(1)} · {prediction.gapToBest > 0 ? `开工品质比最佳低 ${prediction.gapToBest.toFixed(1)}` : "团队最佳"}</small>}
                      {prediction.repeated && <small className="lead-warning">上次同阶段负责人 · 能力 -{prediction.repeatPenalty}%</small>}
                    </span>
                    <strong>{prediction.skillLabel} {prediction.effectiveSkill.toFixed(1)}</strong>
                  </button>
                );
              })}
              {(() => {
                const prediction = predictExternalLead(game, project);
                return (
                  <button className="external-lead" onClick={hireExternalLead} disabled={game.cash < prediction.cost}>
                    <UiIcon index={20} className="external-star" />
                    <span>
                      <b>邀请外聘名人<em>{prediction.contributionLevel}</em></b>
                      <small>专业外援 · 不消耗内部员工体力</small>
                      <small>开工进度 {prediction.openingProgressRange.min.toFixed(1)}–{prediction.openingProgressRange.max.toFixed(1)} · 开工品质 {prediction.openingQualityRange.min.toFixed(1)}–{prediction.openingQualityRange.max.toFixed(1)}</small>
                      {prediction.repeated && <small className="lead-warning">上次同阶段也使用外援 · 能力 -{prediction.repeatPenalty}%</small>}
                    </span>
                    <strong>{formatCash(prediction.cost)}</strong>
                  </button>
                );
              })()}
            </div>
          </ModalShell>
        )}

        {modal === "contracts" && (
          <ModalShell title="承接外包" onClose={closeModal}>
            <p className="modal-intro">没有制作新作时，可以用外包赚取资金和研究点。</p>
            <div className="list-cards">
              {CONTRACTS.map((contract) => {
                const prediction = predictContract(game, contract);
                return (
                  <button key={contract.name} onClick={() => startContract(contract)} disabled={Boolean(project) || companyLevel < contract.level}>
                    <UiIcon index={1} className="list-icon contract-icon" />
                    <span>
                      <b>{contract.name}</b>
                      <small>
                        {companyLevel < contract.level
                          ? `第 ${contract.level} 阶段办公室解锁`
                          : `限期 ${contract.deadline} 周 · ${Object.entries(contract.requirements).map(([key, value]) => `${CONTRACT_QUALITY_LABELS[key as keyof typeof CONTRACT_QUALITY_LABELS]} ${value}`).join(" · ")}`}
                      </small>
                      {companyLevel >= contract.level && <small>团队产能 {prediction.teamPower} · 达标预计 {prediction.durationWeeks ? `${prediction.durationWeeks.min}–${prediction.durationWeeks.max} 周` : "无法估计"} · 逾期风险 {prediction.risk}</small>}
                    </span>
                    <strong>{formatCash(contract.reward)}</strong>
                  </button>
                );
              })}
            </div>
          </ModalShell>
        )}

        {modal === "staff" && (
          <ModalShell title="员工管理" onClose={closeModal}>
            <div className="staff-summary">
              <span>员工 {staff.length}/{getOfficeCapacity(companyLevel)} 人 · 转职手册 {careerManuals}</span>
              <div><button onClick={() => setModal("shop")}>旅行商人{merchantOpen ? " · 到访中" : ""}</button><button onClick={() => setModal("hire")}>招聘人才</button></div>
            </div>
            <div className="staff-list">
              {staff.map((member) => (
                <article key={member.id}>
                  <StaffAvatar staff={member} className="mini-avatar" />
                  <div className="staff-info"><b>{member.name}<em>Lv.{member.level}</em></b><small>{member.role} · 年薪 {formatCash(member.salary)} · Power {member.maxPower} · 体力 {Math.round(member.energy)}%</small><small>已精通：{member.masteredRoles?.join("、") || "暂无"}</small><div><span>程 {member.code}</span><span>剧 {member.scenario}</span><span>画 {member.art}</span><span>音 {member.sound}</span></div></div>
                  <div className="staff-actions">
                    <button onClick={() => levelUp(member.id)}>升级<small>◆{getLevelUpCost(member.level)}</small></button>
                    <button onClick={() => openTraining(member.id)}>培训<small>现金</small></button>
                    <button onClick={() => openCareer(member.id)}>职业<small>路径 / 转职</small></button>
                  </div>
                </article>
              ))}
            </div>
            <details className="office-unlocks">
              <summary>办公室能力 · 当前第 {companyLevel} 阶段</summary>
              {[1, 2, 3].map(level => <div key={level}><b>第 {level} 阶段 · {level <= companyLevel ? "已开放" : "待扩建"}</b>{getOfficeUnlocks(level).map(line => <p key={line}>{line}</p>)}</div>)}
            </details>
            {companyLevel < 3 && (
              <button className="expand-button" onClick={expandOffice}>
                {companyLevel === 1
                  ? `搬入六人工坊 · ${formatCash(OFFICE_UPGRADE_COSTS[2])}`
                  : `搬入八人游戏大楼 · ${formatCash(OFFICE_UPGRADE_COSTS[3])}`}
              </button>
            )}
          </ModalShell>
        )}

        {modal === "training" && selectedStaff && (
          <ModalShell title={`培训 · ${selectedStaff.name}`} onClose={() => setModal("staff")}>
            <div className="training-hero">
              <StaffAvatar staff={selectedStaff} className="mini-avatar" />
              <span><b>{selectedStaff.role} Lv.{selectedStaff.level}</b><small>体力 {Math.round(selectedStaff.energy)}% · 正向收益重复衰减，12% 概率超级培训；负向代价固定，属性最低为 0</small></span>
            </div>
            <div className="training-list">
              {TRAINING_METHODS.map((method) => {
                const prediction = predictTraining(selectedStaff, method, unlockedThemes, companyLevel, cash);
                const statLabels = { code: "程序", scenario: "剧本", art: "画面", sound: "音乐" };
                const signed = (value: number) => `${value >= 0 ? "+" : ""}${value}`;
                return (
                  <button key={method.id} onClick={() => runTraining(method)} disabled={!!prediction.blockedReason}>
                    <UiIcon index={18} className="training-icon" />
                    <span>
                      <b>{method.name}</b>
                      <small>{method.note} · 体力 -{method.energy} · 已训练 {prediction.used} 次 · 效果 {Math.round(prediction.multiplier * 100)}%</small>
                      <small>普通培训 {prediction.gains.map((gain) => `${statLabels[gain.key]} ${signed(gain.min)}`).join(" · ")} · 超级培训 {prediction.gains.map((gain) => `${statLabels[gain.key]} ${signed(gain.max)}`).join(" · ")}</small>
                      {prediction.blockedReason && <small>{prediction.blockedReason}</small>}
                      <small className={prediction.willDiscover ? "training-discovery is-ready" : "training-discovery"}>{prediction.willDiscover ? `本次可发现“${method.unlock.name}”` : prediction.discovery}</small>
                    </span>
                    <strong>{formatCash(method.cost)}</strong>
                  </button>
                );
              })}
            </div>
          </ModalShell>
        )}

        {modal === "career" && selectedStaff && (
          <ModalShell title={`职业路径 · ${selectedStaff.name}`} onClose={() => setModal("staff")}>
            <div className="career-sheet">
              <div className="career-current">
                <StaffAvatar staff={selectedStaff} className="mini-avatar" />
                <span><b>{selectedStaff.role} Lv.{selectedStaff.level}</b><small>已精通：{selectedStaff.masteredRoles?.join("、") || "暂无"}</small></span>
                <em>手册 {careerManuals}</em>
              </div>
              <p>当前职业达到 Lv.5、满足精通前置并消耗 1 本手册才能转职。转职后从 Lv.1 开始，原有能力与内容保留。专属培训要求当前职业匹配。</p>
              <div className="career-options">
                {Object.entries(CAREER_REQUIREMENTS).map(([role, required]) => {
                  const available = getCareerOptionsFor(selectedStaff.masteredRoles ?? [], selectedStaff.role).includes(role);
                  return <button key={role} onClick={() => changeCareer(role)} disabled={!available || selectedStaff.level < 5 || careerManuals < 1}>
                    <b>{role}{role === selectedStaff.role ? " · 当前" : ""}</b>
                    <small>{required.length ? `前置精通：${required.map(item => `${item}${selectedStaff.masteredRoles?.includes(item) ? " ✓" : "（未精通）"}`).join("、")}` : "无额外精通前置"}</small>
                    {ROLE_UNLOCK_RULES.filter(rule => rule.role === role).map(rule => <small key={rule.name}>Lv.{rule.level} 解锁类型“{rule.name}”{unlockedGenres.includes(rule.name) ? " · 已解锁" : ""}</small>)}
                    {TRAINING_METHODS.filter(method => method.unlock.role === role).map(method => <small key={method.id}>{method.name}：Lv.{method.unlock.level} 发现“{method.unlock.name}” · 办公室 {method.officeLevel ?? 1}{method.requiredRole ? " · 专属培训" : ""}{unlockedThemes.includes(method.unlock.name) ? " · 已发现" : ""}</small>)}
                    {role === "硬件工程师" && <small>在岗能力：开启自研主机；实验零件仍需满足工程师人数</small>}
                    <small>{role === selectedStaff.role ? "当前职业" : !available ? "尚未满足职业前置" : selectedStaff.level < 5 ? "当前职业需达到 Lv.5" : careerManuals < 1 ? "缺少转职手册" : "可转职 · 消耗 1 本手册"}</small>
                  </button>;
                })}
              </div>
            </div>
          </ModalShell>
        )}

        {modal === "shop" && (
          <ModalShell title="旅行商人 · 南瓜商会" onClose={() => setModal("staff")}>
            <div className="merchant-banner">
              <UiIcon index={22} className="merchant-face" />
              <span><b>{merchantOpen ? "南瓜商会到访中 · 每年限购 3 件" : "每年第 5 月第 2 周到访"}</b><small>本年已购 {merchantYear === year ? merchantPurchases : 0}/3 · 道具可在宣传菜单的道具箱使用</small></span>
            </div>
            <div className="shop-grid">
              <button onClick={buyCareerManual} disabled={!merchantOpen || (merchantYear === year && merchantPurchases >= 3)}>
                <UiIcon index={16} className="shop-icon manual" /><span><b>转职手册</b><small>让 Lv.5 员工转换职业</small></span><strong>{formatCash(1400)}</strong>
              </button>
              {SHOP_ITEMS.map((item) => (
                <button key={item.key} onClick={() => buyShopItem(item)} disabled={!merchantOpen || (merchantYear === year && merchantPurchases >= 3)}>
                <UiIcon index={item.iconIndex} className="shop-icon" /><span><b>{item.name}</b><small>{item.note}</small></span><strong>{formatCash(getMerchantPrice(item.cost, item.key === "energyDrink"))}</strong>
                </button>
              ))}
            </div>
          </ModalShell>
        )}

        {modal === "items" && (
          <ModalShell title="道具箱" onClose={() => setModal("marketing")}>
            <p className="modal-intro">开发增益连续使用会衰减并消耗研究点；活力汽水可随时使用。</p>
            <div className="shop-grid inventory-grid">
              {SHOP_ITEMS.map((item) => {
                const prediction = predictItemUse(game, item.key);
                const needsProject = item.key !== "energyDrink";
                const disabled = inventory[item.key] < 1 || (needsProject && project?.kind !== "game") || research < prediction.researchCost;
                return (
                  <button key={item.key} onClick={() => applyItem(item.key)} disabled={disabled}>
                    <UiIcon index={item.iconIndex} className="shop-icon" />
                    <span>
                      <b>{item.name}</b>
                      <small>{prediction.target} {item.key === "bugSpray" ? "-" : "+"}{prediction.amount} · 研究 -{prediction.researchCost} · 效果 {Math.round(prediction.multiplier * 100)}%</small>
                      {needsProject && project?.kind !== "game" && <small className="item-warning">仅在游戏开发中生效</small>}
                    </span>
                    <strong>持有 {inventory[item.key]}</strong>
                  </button>
                );
              })}
            </div>
          </ModalShell>
        )}

        {modal === "hire" && (
          <ModalShell title="招聘人才" onClose={() => setModal("staff")}>
            <p className="modal-intro">投入更高预算会提高候选人的基础能力；签约后立即加入工作室。</p>
            <div className="hiring-list">
              {HIRING_METHODS.filter((method) => !method.level || companyLevel >= method.level).map((method) => (
                <button key={method.name} onClick={() => hireWithMethod(method)}>
                  <span className="hire-rank"><UiIcon index={17} /><small>{"★".repeat(Math.max(1, method.quality + 1))}</small></span>
                  <span><b>{method.name}</b><small>{method.note}</small></span>
                  <strong>{formatCash(method.cost)}</strong>
                </button>
              ))}
            </div>
          </ModalShell>
        )}

        {modal === "marketing" && (
          <ModalShell title="宣传推广" onClose={closeModal}>
            <div className="marketing-head">
              <p className="modal-intro">{project?.kind === "game"
                ? `正在为《${project.name}》造势 · 热度 ${project.hype}`
                : releases[0]
                  ? `继续宣传《${releases[0].name}》，可延长销售周期。`
                  : "发售第一款游戏后即可开展宣传。"}</p>
              <button onClick={() => setModal("items")}>道具箱 · {Object.values(inventory).reduce((sum, value) => sum + value, 0)}</button>
            </div>
            <div className="list-cards marketing-list">
              {ADVERTISING_METHODS.filter((item) => companyLevel >= item.level).map((item) => {
                const prediction = predictMarketing(game, item);
                const segmentLabels: Record<keyof FanSegments, string> = { kids: "儿童", teens: "青少年", adults: "成人", seniors: "银发族", male: "男性", female: "女性" };
                return (
                  <button key={item.name} onClick={() => advertise(item.cost, item.hype, item.name, item.segment)} disabled={cash < item.cost || (!project && !releases[0])}>
                    <UiIcon index={3} className="list-icon ad-icon" />
                    <span>
                      <b>{item.name}</b>
                      <small>{item.note} · 有效热度 +{prediction.effectiveHype} · {segmentLabels[item.segment]} +{prediction.segmentGain}</small>
                      <small>{prediction.target}{prediction.previousUses > 0 ? ` · 第 ${prediction.previousUses + 1} 次投放，效果 ${Math.round(prediction.multiplier * 100)}%` : " · 首次投放无衰减"}</small>
                    </span>
                    <strong>{formatCash(item.cost)}</strong>
                  </button>
                );
              })}
            </div>
          </ModalShell>
        )}

        {modal === "records" && (
          <ModalShell title="公司资料" onClose={closeModal}>
            <div className="record-hero"><b>像素工坊</b><span>经营第 {year} 年 · {getOfficeCapacity(companyLevel)} 人办公室 · 粉丝 {fans.toLocaleString()}</span></div>
            <div className="record-stats">
              <div><small>已发售</small><b>{releases.length}</b></div>
              <div><small>最高评分</small><b>{releases.length ? releases.reduce((best, item) => Math.max(best, item.score), 0) : "—"}</b></div>
              <div><small>最高销量</small><b>{releases.length ? releases.reduce((best, item) => Math.max(best, item.sales), 0).toLocaleString() : "—"}</b></div>
              <div><small>累计销量</small><b>{releases.reduce((total, item) => total + item.sales, 0).toLocaleString()}</b></div>
              <div><small>获奖次数</small><b>{awards}</b></div>
              <div><small>业界口碑</small><b>{reputation}</b></div>
            </div>
            <div className="console-record">
              <UiIcon index={21} className={`console-record-icon ${ownConsole ? "online" : ""}`} />
              <span><b>{ownConsole ? "像素盒子" : "尚未推出自研主机"}</b><small>{ownConsole ? `平台用户 ${formatUsers(consoleUsers)}` : "扩建并积累作品后可启动硬件研发"}</small></span>
            </div>
            {endingShown && <div className="ending-record"><b>20 年资产记录</b><strong>{formatCash(endingScore)}</strong><small>作品纪录见下方完整历史统计</small></div>}
            <div className="fan-segments">
              <div className="fan-title"><b>玩家人群</b><small>作品题材与宣传方式会改变各群体支持度</small></div>
              {([
                ["儿童", fanSegments.kids, "#ef9a4d"],
                ["青少年", fanSegments.teens, "#e66b58"],
                ["成人", fanSegments.adults, "#5b98c5"],
                ["银发族", fanSegments.seniors, "#8b7fbd"],
                ["男性", fanSegments.male, "#4aa7a0"],
                ["女性", fanSegments.female, "#dc78a5"],
              ] as [string, number, string][]).map(([label, value, color]) => (
                <div className="fan-row" key={label}>
                  <span>{label}</span>
                  <i><b style={{ width: `${clamp(value, 4, 100)}%`, background: color }} /></i>
                  <em>{value}</em>
                </div>
              ))}
            </div>
            <div className="knowledge-panel">
              <div><b>类型熟练度</b>{unlockedGenres.map((item) => <span key={item}>{item}<em>Lv.{getKnowledgeLevel(genreExperience[item] ?? 0)}</em></span>)}</div>
              <div><b>题材熟练度</b>{unlockedThemes.map((item) => <span key={item}>{item}<em>Lv.{getKnowledgeLevel(themeExperience[item] ?? 0)}</em></span>)}</div>
            </div>
            <div className="release-table">
              <p><b>组合发现记录</b> · 发售后揭晓相性；尝试过的旧组合需再次发售确认。</p>
              {Object.entries(game.combinationDiscoveries).map(([key, rating]) => <p key={key}>{key.replace("|", " × ")}：{rating === "tried" ? "尝试过 · 相性待确认" : COMBINATION_RULES[rating].label}</p>)}
              <p>展示最近 32 部；统计与销售保留全部作品。作品收益 = 累计销售收入 − 立项开发费，不含薪资、广告、外援、道具和挑战投入。</p>
              {game.releaseHistoryIncomplete && <p>旧记录不完整：已丢失作品无法恢复；统计仅含保留作品，缺失品质、组合及开发费显示未知。</p>}
              {releases.length ? releases.slice(0, 32).map((item) => (
                <div key={item.id}>
                  <span><b>{item.name}{item.sequelEligible ? " · 名人堂" : ""}</b><small>{item.audience ?? "受众未知"} · 发售 {item.weeks} 周</small><small>{item.genre ?? "类型未知"} × {item.theme ?? "题材未知"} · {item.combo === undefined ? "组合未知" : `${COMBINATION_RULES[item.combo].label}组合`}</small><small>{item.finalQuality ? `趣味 ${item.finalQuality.fun.toFixed(1)} / 创意 ${item.finalQuality.creativity.toFixed(1)} / 画面 ${item.finalQuality.graphics.toFixed(1)} / 音乐 ${item.finalQuality.sound.toFixed(1)} / 漏洞 ${item.finalQuality.bugs.toFixed(1)}` : "发售品质未知"}</small><small>开发费 {item.developmentCost === undefined ? "未知" : formatCash(item.developmentCost)} · 作品收益 {item.developmentCost === undefined ? "未知" : `${Math.round(item.income - item.developmentCost).toLocaleString()} 千`}</small></span>
                  <em>{item.score}/40</em>
                  <strong>{item.sales.toLocaleString()} 套<small>本周 {(item.weeklySales ?? 0).toLocaleString()} · 第 {item.weeklyRank ?? "—"} 名</small></strong>
                </div>
              )) : <p>还没有发售作品。第一部传奇正等着你！</p>}
            </div>
          </ModalShell>
        )}

        {modal === "challenge" && pendingChallenge && challengeMetric && (
          <ModalShell title="员工主动挑战" onClose={() => resolveStaffChallenge("skip")}>
            <div className="challenge-sheet">
              <div className="challenge-hero">
                {challengeMember && <StaffAvatar staff={challengeMember} className="challenge-avatar" />}
                <span>
                  <b>{challengeMember?.name ?? "原挑战员工"} 主动请缨</b>
                  <small>{challengeMember?.role ?? "员工已离开，请跳过挑战"} · {challengeMetric.label}能力 {pendingChallenge.skill}</small>
                  <p>“我有一个提升《{project?.name ?? "当前作品"}》{challengeMetric.label}的点子，请让我试试看！”</p>
                </span>
              </div>
              <div className="challenge-forecast" aria-label="挑战结果预测">
                <span><small>基础成功率</small><b>{Math.round(pendingChallenge.baseSuccessRate * 100)}%</b><em>投入后最高 {Math.round(STAFF_CHALLENGE_SUCCESS_CAP * 100)}%</em></span>
                <span><small>成功收益</small><b>{challengeMetric.label} +{pendingChallenge.gainRange.min}–{pendingChallenge.gainRange.max}</b><em>热度 +{pendingChallenge.successHype}</em></span>
                <span className="is-risk"><small>失败后果</small><b>热度 -{Math.min(project?.hype ?? 0, pendingChallenge.failureHypeLoss)}</b><em>漏洞 +{pendingChallenge.failureBugs}</em></span>
              </div>
              <div className="challenge-options">
                <button className="challenge-skip" onClick={() => resolveStaffChallenge("skip")}>
                  <span><b>跳过挑战</b><small>不投入资源，继续原计划</small></span>
                  <strong>0 成本</strong>
                </button>
                {STAFF_CHALLENGE_INVESTMENTS.map((option) => {
                  const successRate = getStaffChallengeSuccessRate(pendingChallenge, option.id);
                  const unavailable = !challengeMember || challengeMember.resting || challengeMember.energy < 30
                    ? "员工当前无法创作"
                    : cash < option.cashCost
                    ? "资金不足"
                    : research < option.researchCost
                      ? "研究点不足"
                      : `成功率 +${Math.round(successRate * 100) - Math.round(pendingChallenge.baseSuccessRate * 100)} 个百分点`;
                  return (
                    <button
                      key={option.id}
                      onClick={() => resolveStaffChallenge(option.id)}
                      disabled={!challengeMember || challengeMember.resting || challengeMember.energy < 30 || cash < option.cashCost || research < option.researchCost}
                    >
                      <span><b>{option.name}</b><small>{formatCash(option.cashCost)} · 研究 {option.researchCost}</small></span>
                      <strong>{Math.round(successRate * 100)}%<small>{unavailable}</small></strong>
                    </button>
                  );
                })}
              </div>
            </div>
          </ModalShell>
        )}

        {modal === "result" && resultData && (
          <ModalShell title={resultData.title} onClose={closeModal}>
            <div className="operation-result">
              <UiIcon index={20} className="result-badge" />
              <p>{resultData.summary}</p>
              <ResultEntries entries={resultData.entries} />
              <button className="primary-button" onClick={closeModal}>确认变化</button>
            </div>
          </ModalShell>
        )}

        {modal === "event" && eventData && (
          <ModalShell title={eventData.title} onClose={closeModal}>
            <div className={`event-sheet event-${eventData.kind}`}>
              <div className="event-stage">
                <span className="event-burst">★</span>
                <UiIcon index={EVENT_ICON_INDEX[eventData.kind]} className="event-trophy" />
                <span className="event-confetti c-a">◆</span>
                <span className="event-confetti c-b">●</span>
                <span className="event-confetti c-c">■</span>
              </div>
              <h2>{eventData.headline}</h2>
              <p>{eventData.body}</p>
              {eventData.reward && <strong className="event-reward">{eventData.reward}</strong>}
              {eventData.results && <ResultEntries entries={eventData.results} />}
              {eventData.kind === "expo" ? (
                <div className="expo-options">
                  <button onClick={() => attendExpo(0, 0, 0, "参观展会")}><b>仅参观</b><small>免费 · 了解行业动向</small></button>
                  <button onClick={() => attendExpo(150, 55, 3, "基础展位")}><b>基础展位</b><small>¥150千 · 粉丝 +55</small></button>
                  <button onClick={() => attendExpo(600, 220, 8, "玩偶展位")}><b>玩偶展位</b><small>¥600千 · 粉丝 +220</small></button>
                  <button onClick={() => attendExpo(2500, 850, 25, "明星展位")}><b>明星展位</b><small>¥2,500千 · 粉丝 +850</small></button>
                  <button onClick={() => attendExpo(7000, 2300, 60, "世界级展位")}><b>世界级展位</b><small>¥7,000千 · 粉丝 +2,300</small></button>
                </div>
              ) : (
                <button className="primary-button" onClick={closeModal}>继续经营</button>
              )}
            </div>
          </ModalShell>
        )}

        {modal === "review" && review && (
          <ModalShell title="游戏周刊 · 新作评分" onClose={closeModal}>
            <div className="review-sheet">
              <div className="review-cover"><i>NEW</i><b>{review.name}</b><small>本周焦点新作</small></div>
              <div className="review-scores">
                {review.scores.map((score, index) => <div key={index}><span>{["妙手", "铁面", "玩家", "主编"][index]}</span><b>{score}</b><small>/10</small></div>)}
              </div>
              <div className="review-total">总分 <b>{review.scores.reduce((sum, score) => sum + score, 0)}</b><span>/40</span></div>
              <div className="sales-result">
                <span>首周销量 <b>{review.sales.toLocaleString()}</b> 套</span>
                <span>首周排行 <b>第 {review.salesRank} 名</b></span>
                <span>销售收入 <b>{formatCash(review.income)}</b></span>
                <span>核心受众 <b>{review.audience}</b></span>
                <span>业界口碑 <b>{review.reputationChange >= 0 ? "+" : ""}{review.reputationChange}</b></span>
                <span>开发经验 <b>{review.growth}</b></span>
              </div>
              {review.results && <ResultEntries entries={review.results} />}
              <button className="primary-button" onClick={closeModal}>太棒了！</button>
            </div>
          </ModalShell>
        )}
    </>
  );
}
