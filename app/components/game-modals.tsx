"use client";

import type { Dispatch, SetStateAction } from "react";

import { OFFICE_UPGRADE_COSTS } from "../game-balance";
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
  GREAT_COMBOS,
  HIRING_METHODS,
  SHOP_ITEMS,
  STAGE_INFO,
  STAGE_ORDER,
  TRAINING_METHODS,
} from "../game/data";
import {
  clamp,
  formatCash,
  formatUsers,
  getKnowledgeLevel,
  getOfficeCapacity,
} from "../game/rules";
import type {
  DirectionKey,
  DirectionPoints,
  EventData,
  FanSegments,
  GameState,
  Inventory,
  Modal,
  ReviewData,
  Staff,
} from "../game/types";
import { ModalShell, StaffAvatar, UiIcon } from "./pixel-ui";

type Platform = {
  name: string;
  cost: number;
  users: number;
  debut: number;
  retire: number;
};

type GameModalsProps = {
  game: GameState;
  modal: Modal;
  setModal: Dispatch<SetStateAction<Modal>>;
  closeModal: () => void;
  announce: (message: string) => void;
  eventData: EventData | null;
  review: ReviewData | null;
  selectedStaff: Staff | null;
  availablePlatforms: Platform[];
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
  selectedSequelName: string;
  setSelectedSequelName: Dispatch<SetStateAction<string>>;
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
  startContract: (contract: (typeof CONTRACTS)[number]) => void;
  levelUp: (id: number) => void;
  openTraining: (id: number) => void;
  openCareer: (id: number) => void;
  expandOffice: () => void;
  runTraining: (method: (typeof TRAINING_METHODS)[number]) => void;
  getCareerOptions: (member: Staff) => string[];
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
};

export function GameModals({
  game,
  modal,
  setModal,
  closeModal,
  announce,
  eventData,
  review,
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
  selectedSequelName,
  setSelectedSequelName,
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
  startContract,
  levelUp,
  openTraining,
  openCareer,
  expandOffice,
  runTraining,
  getCareerOptions,
  changeCareer,
  buyCareerManual,
  buyShopItem,
  applyItem,
  hireWithMethod,
  advertise,
  attendExpo,
}: GameModalsProps) {
  const {
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
                    <span><b>名人堂续作</b><small>继承前作四项品质；续作跌出名人堂会终止系列</small></span>
                    <select value={selectedSequelName} onChange={(event) => {
                      const name = event.target.value;
                      const sequel = sequelCandidates.find((item) => item.name === name);
                      setSelectedSequelName(name);
                      if (sequel) {
                        setGameName(`${sequel.name} 2`);
                        setSelectedGenre(sequel.genre ?? selectedGenre);
                        setSelectedTheme(sequel.theme ?? selectedTheme);
                      }
                    }}>
                      <option value="">制作全新作品</option>
                      {sequelCandidates.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.score}/40</option>)}
                    </select>
                  </label>
                )}
                <label className="field-label">游戏名称<input value={gameName} maxLength={12} onChange={(e) => setGameName(e.target.value)} /></label>
                <div className="field-label">选择平台</div>
                <div className="platform-grid">
                  {availablePlatforms.map((item) => (
                    <button key={item.name} className={selectedPlatform === item.name ? "selected" : ""} onClick={() => setSelectedPlatform(item.name)}>
                      <UiIcon index={21} className="platform-icon" />
                      <b>{item.name}</b><small>用户 {formatUsers(item.users)}</small><em>{formatCash(item.cost)}</em>
                    </button>
                  ))}
                </div>
                <div className="two-columns">
                  <label className="field-label">游戏类型<select value={selectedGenre} disabled={Boolean(selectedSequelName)} onChange={(e) => setSelectedGenre(e.target.value)}>{unlockedGenres.map((item) => <option key={item} value={item}>{item} Lv.{getKnowledgeLevel(genreExperience[item] ?? 0)}</option>)}</select></label>
                  <label className="field-label">游戏题材<select value={selectedTheme} disabled={Boolean(selectedSequelName)} onChange={(e) => setSelectedTheme(e.target.value)}>{unlockedThemes.map((item) => <option key={item} value={item}>{item} Lv.{getKnowledgeLevel(themeExperience[item] ?? 0)}</option>)}</select></label>
                </div>
                <div className={`combo-note ${GREAT_COMBOS.has(`${selectedGenre}|${selectedTheme}`) ? "great" : ""}`}>
                  组合评价：{GREAT_COMBOS.has(`${selectedGenre}|${selectedTheme}`) ? "杰作预感！" : "普通"}
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
                <button className="primary-button" onClick={startGame}>
                  {remainingDirectionPoints > 0 ? `分配剩余 ${remainingDirectionPoints} 点` : `通过企划 · ${formatCash(selectedDevelopmentCost)}`}
                </button>
              </div>
            )}
          </ModalShell>
        )}

        {modal === "console" && (
          <ModalShell title="自研主机实验室" onClose={() => setModal("develop")}>
            <p className="modal-intro">选择 CPU、媒体与机型。规格越高，研发周期与成本越大，首发用户也越多。</p>
            <div className="console-builder">
              <label>处理器<select value={consoleCpu} onChange={(event) => setConsoleCpu(event.target.value)}>{CONSOLE_CPUS.filter((item) => (item.requiredEngineers ?? 0) <= hardwareEngineerCount).map((item) => <option key={item.name} value={item.name}>{item.name} · +{formatCash(item.cost)}</option>)}</select></label>
              <label>存储媒体<select value={consoleMedia} onChange={(event) => setConsoleMedia(event.target.value)}>{CONSOLE_MEDIA.filter((item) => (item.requiredEngineers ?? 0) <= hardwareEngineerCount).map((item) => <option key={item.name} value={item.name}>{item.name} · +{formatCash(item.cost)}</option>)}</select></label>
              <label>主机形态<select value={consoleBody} onChange={(event) => setConsoleBody(event.target.value)}>{CONSOLE_BODIES.map((item) => <option key={item.name} value={item.name}>{item.name} · +{formatCash(item.cost)}</option>)}</select></label>
              <div className="console-spec-summary">
                <span><small>综合性能</small><b>×{selectedConsoleSpec.performance.toFixed(2)}</b></span>
                <span><small>研发预算</small><b>{formatCash(selectedConsoleSpec.cost)}</b></span>
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
            <div className="lead-grid">
              {staff.map((member) => {
                const skillKey = STAGE_INFO[project.stage ?? "planning"].skill;
                const skill = member[skillKey];
                return (
                  <button key={member.id} onClick={() => assignStageLead(member)}>
                    <StaffAvatar staff={member} className="mini-avatar" />
                    <span><b>{member.name}</b><small>{member.role} · 体力 {Math.round(member.energy)}% · Power {member.maxPower}</small></span>
                    <strong>{skillKey === "code" ? "程序" : skillKey === "scenario" ? "剧本" : skillKey === "art" ? "画面" : "音乐"} {skill}</strong>
                  </button>
                );
              })}
              <button className="external-lead" onClick={hireExternalLead}>
                <UiIcon index={20} className="external-star" />
                <span><b>邀请外聘名人</b><small>能力出众，不消耗员工体力</small></span>
                <strong>{formatCash(900 + STAGE_ORDER.indexOf(project.stage ?? "planning") * 350)}</strong>
              </button>
            </div>
          </ModalShell>
        )}

        {modal === "contracts" && (
          <ModalShell title="承接外包" onClose={closeModal}>
            <p className="modal-intro">没有制作新作时，可以用外包赚取资金和研究点。</p>
            <div className="list-cards">
              {CONTRACTS.map((contract) => (
                <button key={contract.name} onClick={() => startContract(contract)} disabled={Boolean(project) || companyLevel < contract.level}>
                  <UiIcon index={1} className="list-icon contract-icon" />
                  <span>
                    <b>{contract.name}</b>
                    <small>
                      {companyLevel < contract.level
                        ? `第 ${contract.level} 阶段办公室解锁`
                        : `限期 ${contract.deadline} 周 · ${Object.entries(contract.requirements).map(([key, value]) => `${CONTRACT_QUALITY_LABELS[key as keyof typeof CONTRACT_QUALITY_LABELS]} ${value}`).join(" · ")}`}
                    </small>
                  </span>
                  <strong>{formatCash(contract.reward)}</strong>
                </button>
              ))}
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
                  <div className="staff-info"><b>{member.name}<em>Lv.{member.level}</em></b><small>{member.role} · 年薪 {formatCash(member.salary)} · Power {member.maxPower} · 体力 {Math.round(member.energy)}%</small><div><span>程 {member.code}</span><span>剧 {member.scenario}</span><span>画 {member.art}</span><span>音 {member.sound}</span></div></div>
                  <div className="staff-actions">
                    <button onClick={() => levelUp(member.id)}>升级<small>◆{5 + member.level * 4}</small></button>
                    <button onClick={() => openTraining(member.id)}>培训<small>现金</small></button>
                    <button onClick={() => openCareer(member.id)}>转职<small>手册</small></button>
                  </div>
                </article>
              ))}
            </div>
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
              <span><b>{selectedStaff.role} Lv.{selectedStaff.level}</b><small>体力 {Math.round(selectedStaff.energy)}% · 重复训练效果会逐渐降低</small></span>
            </div>
            <div className="training-list">
              {TRAINING_METHODS.map((method) => {
                const used = selectedStaff.training?.[method.id] ?? 0;
                return (
                  <button key={method.id} onClick={() => runTraining(method)}>
                    <UiIcon index={18} className="training-icon" />
                    <span><b>{method.name}</b><small>{method.note} · 体力 -{method.energy} · 已训练 {used} 次</small></span>
                    <strong>{formatCash(method.cost)}</strong>
                  </button>
                );
              })}
            </div>
          </ModalShell>
        )}

        {modal === "career" && selectedStaff && (
          <ModalShell title={`转职 · ${selectedStaff.name}`} onClose={() => setModal("staff")}>
            <div className="career-sheet">
              <div className="career-current">
                <StaffAvatar staff={selectedStaff} className="mini-avatar" />
                <span><b>{selectedStaff.role} Lv.{selectedStaff.level}</b><small>已精通：{selectedStaff.masteredRoles?.join("、") || "暂无"}</small></span>
                <em>手册 {careerManuals}</em>
              </div>
              <p>转职后新职业从 Lv.1 开始，原有能力保留。精通总监与制作人可解锁硬件工程师。</p>
              <div className="career-options">
                {getCareerOptions(selectedStaff).map((role) => <button key={role} onClick={() => changeCareer(role)}><b>{role}</b><small>消耗 1 本手册</small></button>)}
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
              {SHOP_ITEMS.map((item) => (
                <button key={item.key} onClick={() => applyItem(item.key)} disabled={inventory[item.key] < 1}>
                  <UiIcon index={item.iconIndex} className="shop-icon" /><span><b>{item.name}</b><small>{item.note}</small></span><strong>持有 {inventory[item.key]}</strong>
                </button>
              ))}
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
              {ADVERTISING_METHODS.filter((item) => companyLevel >= item.level).map((item) => (
                <button key={item.name} onClick={() => advertise(item.cost, item.hype, item.name, item.segment)}>
                  <UiIcon index={3} className="list-icon ad-icon" />
                  <span><b>{item.name}</b><small>{item.note} · 热度 +{item.hype}</small></span>
                  <strong>{formatCash(item.cost)}</strong>
                </button>
              ))}
            </div>
          </ModalShell>
        )}

        {modal === "records" && (
          <ModalShell title="公司资料" onClose={closeModal}>
            <div className="record-hero"><b>像素工坊</b><span>经营第 {year} 年 · {getOfficeCapacity(companyLevel)} 人办公室 · 粉丝 {fans.toLocaleString()}</span></div>
            <div className="record-stats">
              <div><small>已发售</small><b>{releases.length}</b></div>
              <div><small>最高评分</small><b>{releases.length ? Math.max(...releases.map((item) => item.score)) : "—"}</b></div>
              <div><small>最高销量</small><b>{releases.length ? Math.max(...releases.map((item) => item.sales)).toLocaleString() : "—"}</b></div>
              <div><small>获奖次数</small><b>{awards}</b></div>
              <div><small>业界口碑</small><b>{reputation}</b></div>
            </div>
            <div className="console-record">
              <UiIcon index={21} className={`console-record-icon ${ownConsole ? "online" : ""}`} />
              <span><b>{ownConsole ? "像素盒子" : "尚未推出自研主机"}</b><small>{ownConsole ? `平台用户 ${formatUsers(consoleUsers)}` : "扩建并积累作品后可启动硬件研发"}</small></span>
            </div>
            {endingShown && <div className="ending-record"><b>20 年资产记录</b><strong>{formatCash(endingScore)}</strong><small>同时记录最高销量与最高利润作品</small></div>}
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
              {releases.length ? releases.map((item, index) => (
                <div key={`${item.name}-${index}`}>
                  <span><b>{item.name}{item.sequelEligible ? " · 名人堂" : ""}</b><small>{item.audience ?? "全年龄"} · 发售 {item.weeks} 周</small></span>
                  <em>{item.score}/40</em>
                  <strong>{item.sales.toLocaleString()} 套<small>本周 {(item.weeklySales ?? 0).toLocaleString()} · 第 {item.weeklyRank ?? "—"} 名</small></strong>
                </div>
              )) : <p>还没有发售作品。第一部传奇正等着你！</p>}
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
              <button className="primary-button" onClick={closeModal}>太棒了！</button>
            </div>
          </ModalShell>
        )}
    </>
  );
}
