"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { GameDashboard } from "./components/game-dashboard";
import { GameModals } from "./components/game-modals";
import {
  CONSOLE_BODIES,
  CONSOLE_CPUS,
  CONSOLE_MEDIA,
  CONTRACTS,
  DEFAULT_DIRECTION_POINTS,
  DIRECTIONS,
  GENRES,
  HIRING_METHODS,
  PLATFORMS,
  SHOP_ITEMS,
  STAGE_INFO,
  STAGE_ORDER,
  THEMES,
  TRAINING_METHODS,
} from "./game/data";
import {
  clamp,
  formatCash,
  getAvailablePlatforms,
  formatUsers,
  getKnowledgeLevel,
} from "./game/rules";
import {
  predictConsole,
  predictEarlyRelease,
  predictExternalLead,
  predictGamePlan,
} from "./game/predictions";
import { SAVE_STORAGE_KEY } from "./game/save";
import { startGamePersistence } from "./game/persistence";
import { advanceStageCreation } from "./game/stage-sequence";
import { useGameController } from "./game/use-game-controller";
import type { EngineEffect } from "./game/engine";
import type {
  DirectionKey,
  DirectionPoints,
  EventData,
  FanSegments,
  Inventory,
  Modal,
  Project,
  ResultData,
  ReviewData,
  Staff,
  StaffChallengeInvestment,
  StageCreationPhase,
  StageCreationState,
} from "./game/types";

export default function Home() {
  const {
    game,
    gameRef,
    replaceGame,
    dispatchGame,
    setCash,
    setCareerManuals,
    setInventory,
    setMerchantYear,
    setMerchantPurchases,
    setIndustryNews,
  } = useGameController();
  const {
    cash,
    year,
    month,
    week,
    staff,
    project,
    releases,
    companyLevel,
    ownConsole,
    consoleUsers,
    genreExperience,
    careerManuals,
    merchantYear,
    merchantPurchases,
  } = game;
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("欢迎回来，社长！");
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0].name);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [selectedDirection, setSelectedDirection] = useState(DIRECTIONS[0].name);
  const [selectedDirectionPoints, setSelectedDirectionPoints] = useState<DirectionPoints>(DEFAULT_DIRECTION_POINTS);
  const [gameName, setGameName] = useState("像素勇者");
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [consoleCpu, setConsoleCpu] = useState(CONSOLE_CPUS[0].name);
  const [consoleMedia, setConsoleMedia] = useState(CONSOLE_MEDIA[0].name);
  const [consoleBody, setConsoleBody] = useState(CONSOLE_BODIES[0].name);
  const [selectedSequelId, setSelectedSequelId] = useState("");
  const [review, setReview] = useState<ReviewData | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [stageCreation, setStageCreation] = useState<StageCreationState | null>(null);
  const stageCreationRef = useRef(stageCreation);
  const tickRef = useRef(0);
  const persistenceRef = useRef<ReturnType<typeof startGamePersistence> | null>(null);
  const [saveError, setSaveError] = useState("");

  const replaceStageCreation = useCallback((next: StageCreationState | null) => {
    stageCreationRef.current = next;
    setStageCreation(next);
  }, []);

  useEffect(() => {
    const persistence = startGamePersistence(
      () => window.localStorage,
      () => gameRef.current,
      replaceGame,
      setSaveError,
    );
    persistenceRef.current = persistence;
    return () => {
      persistence.dispose();
      persistenceRef.current = null;
    };
  }, [gameRef, replaceGame]);

  const persistGame = useCallback(() => persistenceRef.current?.save() ?? false, []);

  const availablePlatforms = useMemo(() => {
    return getAvailablePlatforms(year, ownConsole, consoleUsers, month, week);
  }, [year, ownConsole, consoleUsers, month, week]);

  const selectedStaff = staff.find((member) => member.id === selectedStaffId) ?? null;
  const merchantOpen = year >= 2 && month === 5 && week === 2;
  const getMerchantPrice = (base: number, fixed = false) => fixed
    ? base
    : Math.round(base * (1 + (companyLevel - 1) * .5 + (merchantYear === year ? merchantPurchases : 0) * .2));
  const sequelCandidates = releases.filter((item) => item.sequelEligible && item.genre && item.theme);
  const chartLeader = releases
    .filter((item) => (item.weeklySales ?? 0) > 0)
    .sort((a, b) => (a.weeklyRank ?? 99) - (b.weeklyRank ?? 99))[0];
  const hardwareEngineerCount = staff.filter((member) => member.role === "硬件工程师").length;
  const hasHardwareEngineer = hardwareEngineerCount > 0;
  const selectedConsoleSpec = useMemo(() => {
    const cpu = CONSOLE_CPUS.find((item) => item.name === consoleCpu) ?? CONSOLE_CPUS[0];
    const media = CONSOLE_MEDIA.find((item) => item.name === consoleMedia) ?? CONSOLE_MEDIA[0];
    const body = CONSOLE_BODIES.find((item) => item.name === consoleBody) ?? CONSOLE_BODIES[0];
    return {
      cost: cpu.cost + media.cost + body.cost,
      performance: Number(((cpu.power + media.power + body.power) / 3).toFixed(2)),
    };
  }, [consoleCpu, consoleMedia, consoleBody]);
  const selectedGenreLevel = getKnowledgeLevel(genreExperience[selectedGenre] ?? 0);
  const directionPointBudget = 8 + (selectedGenreLevel >= 2 ? 2 : 0) + (selectedGenreLevel >= 5 ? 2 : 0);
  const spentDirectionPoints = Object.values(selectedDirectionPoints).reduce((sum, value) => sum + value, 0);
  const remainingDirectionPoints = directionPointBudget - spentDirectionPoints;
  const selectedSequel = releases.find((item) => item.id === selectedSequelId && item.sequelEligible);
  const selectedGameGenre = selectedSequel?.genre ?? selectedGenre;
  const selectedGameTheme = selectedSequel?.theme ?? selectedTheme;
  const selectedPlatformData = availablePlatforms.find((item) => item.name === selectedPlatform) ?? availablePlatforms[0];
  const planPrediction = useMemo(() => modal === "develop" && selectedPlatformData
    ? predictGamePlan({
        state: game,
        name: gameName,
        platform: selectedPlatformData,
        genre: selectedGameGenre,
        theme: selectedGameTheme,
        direction: selectedDirection,
        directionPoints: selectedDirectionPoints,
        sequel: selectedSequel,
      })
    : null, [modal, game, gameName, selectedPlatformData, selectedGameGenre, selectedGameTheme, selectedDirection, selectedDirectionPoints, selectedSequel]);
  const selectedDevelopmentCost = planPrediction?.cost ?? 0;
  const consolePrediction = useMemo(
    () => modal === "console" ? predictConsole(game, selectedConsoleSpec.performance, selectedConsoleSpec.cost) : null,
    [modal, game, selectedConsoleSpec],
  );
  const earlyReleasePrediction = project?.kind === "game" && project.stage === "debug"
    ? predictEarlyRelease(game, project)
    : null;
  const activeStage = project?.kind === "game" ? (project.stage ?? "coding") : null;
  const projectPercent = project
    ? project.kind === "game"
      ? Math.min(100, Math.round((
          STAGE_ORDER.indexOf(activeStage ?? "coding") +
          clamp((project.stageProgress ?? 0) / Math.max(1, project.stageTarget ?? 1), 0, 1)
        ) / STAGE_ORDER.length * 100))
      : Math.min(100, Math.round((project.progress / project.target) * 100))
    : 0;

  useEffect(() => {
    if (!availablePlatforms.some((item) => item.name === selectedPlatform)) {
      setSelectedPlatform(availablePlatforms[0]?.name ?? "个人电脑");
    }
  }, [availablePlatforms, selectedPlatform]);

  useEffect(() => {
    setSelectedDirectionPoints(DEFAULT_DIRECTION_POINTS);
  }, [selectedGenre]);

  const announce = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const applyEngineEffects = useCallback((effects: EngineEffect[]) => {
    for (const effect of effects) {
      if (effect.type === "toast") announce(effect.message);
      if (effect.type === "pause-for-stage") {
        replaceStageCreation({ phase: "select", stage: effect.stage });
        setModal("stage");
      }
      if (effect.type === "stage-creation") {
        setModal(null);
        replaceStageCreation({ ...effect.creation, phase: "focus" });
      }
      if (effect.type === "staff-challenge") {
        setModal("challenge");
      }
      if (effect.type === "event") {
        if (effect.event.kind === "awards" || effect.event.kind === "ending") persistGame();
        setEventData(effect.event);
        setModal("event");
      }
      if (effect.type === "review") {
        persistGame();
        setReview(effect.review);
        setModal("review");
      }
      if (effect.type === "result") {
        setResultData(effect.result);
        setModal("result");
      }
    }
  }, [announce, replaceStageCreation, persistGame]);

  const saveGame = () => {
    if (persistGame()) announce("已保存到这台设备");
  };

  const restartGame = () => {
    if (!window.confirm("确定以新版数值重新开办公司吗？当前本地存档会被清除。")) return;
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
    window.location.reload();
  };

  const finishProject = (finished: Project) => {
    const result = dispatchGame({ type: "complete-project", project: finished });
    applyEngineEffects(result.effects);
  };

  useEffect(() => {
    if (modal || stageCreation) return;
    const result = dispatchGame({ type: "scheduled-event" });
    applyEngineEffects(result.effects);
    // Resolve calendar events before reopening a recovered team's lead selection.
    if (result.effects.length) return;
    const current = result.state.project;
    if (current?.kind !== "game") return;
    if (current.pendingChallenge) {
      setModal("challenge");
    } else if (current.stage !== "debug" && !current.leadName && !current.waitingForLeadRecovery) {
      replaceStageCreation({ phase: "select", stage: current.stage ?? "planning" });
      setModal("stage");
    }
  }, [year, month, week, project, modal, stageCreation, dispatchGame, applyEngineEffects, replaceStageCreation]);

  useEffect(() => {
    if (week !== 1 || modal || stageCreation) return;
    if (gameRef.current.year !== year || gameRef.current.month !== month || gameRef.current.week !== week) return;
    const chartEntry = releases
      .filter((item) => (item.weeklySales ?? 0) > 0)
      .sort((a, b) => (a.weeklyRank ?? 99) - (b.weeklyRank ?? 99))[0];
    if (chartEntry) {
      setIndustryNews(`本月销量快讯：《${chartEntry.name}》以每周 ${(chartEntry.weeklySales ?? 0).toLocaleString()} 套位列第 ${chartEntry.weeklyRank ?? "—"} 名。`);
    } else {
      const platform = availablePlatforms[availablePlatforms.length - 1];
      setIndustryNews(platform
        ? `${platform.name} · ${platform.phase} · 活跃用户 ${formatUsers(platform.users)}${platform.marketEvent ? ` · ${platform.marketEvent}` : ""}`
        : "暂无可开发平台。");
    }
  }, [year, month, week, modal, stageCreation, releases, availablePlatforms, setIndustryNews, gameRef]);

  useEffect(() => {
    if (paused || modal || stageCreation) return;
    const interval = window.setInterval(() => {
      tickRef.current += 1;
      const result = dispatchGame({
        type: "tick",
        isNewWeek: tickRef.current % 4 === 0,
        allowStaffChallenge: true,
      });
      applyEngineEffects(result.effects);
      if (result.effects.some((effect) => effect.type === "staff-challenge")) {
        persistGame();
      }
    }, 1200 / speed);
    return () => window.clearInterval(interval);
  }, [paused, modal, stageCreation, speed, dispatchGame, applyEngineEffects, persistGame]);

  const openMenu = (nextModal: Modal) => {
    setModal(nextModal);
  };

  const closeModal = () => {
    setModal(null);
  };

  const startGame = () => {
    if (!selectedPlatformData || !planPrediction) return announce("目前没有可用平台");
    if (project) return announce("当前项目完成后才能开发新作");
    if (remainingDirectionPoints > 0) return announce(`还有 ${remainingDirectionPoints} 点开发方向尚未分配`);
    if (cash < selectedDevelopmentCost) return announce("资金不足，先接一份外包吧");
    const before = gameRef.current;
    const result = dispatchGame({
      type: "start-project",
      cost: selectedDevelopmentCost,
      project: planPrediction.project,
    });
    if (result.state === before) {
      applyEngineEffects(result.effects);
      return;
    }
    persistGame();
    setSelectedSequelId("");
    setSelectedDirectionPoints(DEFAULT_DIRECTION_POINTS);
    replaceStageCreation({ phase: "select", stage: "planning" });
    setModal("stage");
    announce("企划通过，请选择负责人");
  };

  const adjustDirectionPoint = (key: DirectionKey, delta: number) => {
    setSelectedDirectionPoints((points) => {
      if (delta > 0 && Object.values(points).reduce((sum, value) => sum + value, 0) >= directionPointBudget) return points;
      return { ...points, [key]: clamp(points[key] + delta, 0, 10) };
    });
  };

  const waitForStageLead = () => {
    const result = dispatchGame({ type: "wait-for-stage-lead" });
    if (!result.state.project?.waitingForLeadRecovery) return;
    replaceStageCreation(null);
    setModal(null);
    persistGame();
    announce(paused ? "已安排休息，点击继续后等待体力恢复" : "员工正在休息，恢复后重新选择负责人");
  };

  const assignStageLead = (member: Staff) => {
    if (!project || project.kind !== "game" || project.stage === "debug") return;
    const stageInfo = STAGE_INFO[project.stage ?? "planning"];
    const skill = member[stageInfo.skill];
    const result = dispatchGame({
      type: "choose-lead",
      leadStaffId: member.id,
      leadName: member.name,
      leadSkill: skill,
    });
    applyEngineEffects(result.effects);
    if (result.effects.some((effect) => effect.type === "stage-creation")) {
      persistGame();
      announce(`${member.name} 开始${stageInfo.label}`);
    }
  };

  const hireExternalLead = () => {
    if (!project || project.kind !== "game" || project.stage === "debug") return;
    const stage = project.stage ?? "planning";
    const stageInfo = STAGE_INFO[stage];
    const prediction = predictExternalLead(game, project);
    if (cash < prediction.cost) return announce("资金不足，无法邀请外部专家");
    const result = dispatchGame({
      type: "choose-lead",
      leadName: "外聘名人",
      leadSkill: prediction.rawSkill,
      cost: prediction.cost,
    });
    applyEngineEffects(result.effects);
    if (result.effects.some((effect) => effect.type === "stage-creation")) {
      persistGame();
      announce(`外部专家开始${stageInfo.label}`);
    }
  };

  const resolveStaffChallenge = (investment: StaffChallengeInvestment | "skip") => {
    const offer = project?.kind === "game" ? project.pendingChallenge : undefined;
    if (!offer) return;
    const result = dispatchGame({
      type: "resolve-staff-challenge",
      offerId: offer.id,
      investment,
    });
    applyEngineEffects(result.effects);
    if (result.state.project?.pendingChallenge) return;
    persistGame();
    if (!result.effects.some((effect) => effect.type === "stage-creation")) {
      setModal(null);
    }
  };

  const forceRelease = () => {
    if (!project || project.kind !== "game" || project.stage !== "debug") return;
    finishProject(project);
  };

  const startConsoleProject = () => {
    if (project) return announce("当前项目完成后才能研发主机");
    if (companyLevel < 3) return announce("搬入大楼办公室后才能研发主机");
    if (!hasHardwareEngineer) return announce("团队需要 1 名硬件工程师");
    const cpu = CONSOLE_CPUS.find((item) => item.name === consoleCpu) ?? CONSOLE_CPUS[0];
    const media = CONSOLE_MEDIA.find((item) => item.name === consoleMedia) ?? CONSOLE_MEDIA[0];
    const body = CONSOLE_BODIES.find((item) => item.name === consoleBody) ?? CONSOLE_BODIES[0];
    if ((cpu.requiredEngineers ?? 0) > hardwareEngineerCount || (media.requiredEngineers ?? 0) > hardwareEngineerCount) {
      return announce("当前硬件工程师人数不足，无法制造所选实验零件");
    }
    const cost = cpu.cost + media.cost + body.cost;
    const performance = Number(((cpu.power + media.power + body.power) / 3).toFixed(2));
    if (cash < cost) return announce(`研发这套主机需要 ${formatCash(cost)}`);
    dispatchGame({
      type: "start-project",
      cost,
      project: {
        kind: "console",
        name: "像素盒子",
        platform: "硬件研发",
        genre: "自研主机",
        theme: "次世代",
        direction: "重视品质",
        progress: 0,
        target: Math.round(560 * performance),
        fun: 0,
        creativity: 0,
        graphics: 0,
        sound: 0,
        bugs: 0,
        hype: 25,
        consoleSpec: { cpu: cpu.name, media: media.name, body: body.name, performance, cost },
      },
    });
    closeModal();
    announce("硬件研发室正式开工！");
  };

  const startContract = (contract: (typeof CONTRACTS)[number]) => {
    if (project) return announce("手头已有项目");
    if (companyLevel < contract.level) return announce(`搬入第 ${contract.level} 阶段办公室后解锁`);
    dispatchGame({
      type: "start-project",
      project: {
        kind: "contract",
        name: contract.name,
        platform: "委托",
        genre: "外包",
        theme: "",
        direction: "均衡",
        progress: 0,
        target: contract.target,
        fun: 0,
        creativity: 0,
        graphics: 0,
        sound: 0,
        bugs: 0,
        hype: 0,
        reward: contract.reward,
        elapsedWeeks: 0,
        deadlineWeeks: contract.deadline,
        qualityTargets: contract.requirements,
      },
    });
    closeModal();
    announce("收到委托，开工！");
  };

  const levelUp = (id: number) => {
    const member = staff.find((item) => item.id === id);
    if (!member) return;
    const before = gameRef.current;
    const result = dispatchGame({ type: "level-up-staff", staffId: id, expectedLevel: member.level, expectedRole: member.role });
    applyEngineEffects(result.effects);
    if (result.state !== before) persistGame();
  };

  const openTraining = (id: number) => {
    setSelectedStaffId(id);
    setModal("training");
  };

  const runTraining = (method: (typeof TRAINING_METHODS)[number]) => {
    if (selectedStaffId === null) return;
    const before = gameRef.current;
    const result = dispatchGame({
      type: "train-staff",
      staffId: selectedStaffId,
      method,
    });
    applyEngineEffects(result.effects);
    if (result.state !== before) persistGame();
  };

  const buyCareerManual = () => {
    if (!merchantOpen) return announce("旅行商人每年第 5 月第 2 周到访");
    const boughtThisYear = merchantYear === year ? merchantPurchases : 0;
    if (boughtThisYear >= 3) return announce("商人今年的 3 件商品已经售罄");
    if (cash < 1400) return announce("购买手册需要 ¥1,400千");
    setCash((value) => value - 1400);
    setCareerManuals((value) => value + 1);
    setMerchantYear(year);
    setMerchantPurchases(boughtThisYear + 1);
    announce("购入 1 本转职手册");
  };

  const buyShopItem = (item: (typeof SHOP_ITEMS)[number]) => {
    if (!merchantOpen) return announce("旅行商人每年第 5 月第 2 周到访");
    const boughtThisYear = merchantYear === year ? merchantPurchases : 0;
    if (boughtThisYear >= 3) return announce("商人今年的 3 件商品已经售罄");
    const price = getMerchantPrice(item.cost, item.key === "energyDrink");
    if (cash < price) return announce("资金不足");
    setCash((value) => value - price);
    setInventory((items) => ({ ...items, [item.key]: items[item.key] + 1 }));
    setMerchantYear(year);
    setMerchantPurchases(boughtThisYear + 1);
    announce(`购入“${item.name}”`);
  };

  const applyItem = (key: keyof Inventory) => {
    const result = dispatchGame({ type: "use-item", key });
    applyEngineEffects(result.effects);
  };

  const openCareer = (id: number) => {
    const member = staff.find((item) => item.id === id);
    if (!member) return;
    setSelectedStaffId(id);
    setModal("career");
  };

  const changeCareer = (role: string) => {
    const member = staff.find((item) => item.id === selectedStaffId);
    if (!member) return;
    const result = dispatchGame({ type: "change-career", staffId: member.id, role });
    applyEngineEffects(result.effects);
    if (result.state.careerManuals === careerManuals) return;
    persistGame();
    setModal("staff");
  };

  const hireWithMethod = (method: (typeof HIRING_METHODS)[number]) => {
    const result = dispatchGame({ type: "hire-staff", method });
    applyEngineEffects(result.effects);
    if (result.state.staff.length > staff.length) setModal("staff");
  };

  const advertise = (cost: number, hype: number, name: string, segment: keyof FanSegments) => {
    const result = dispatchGame({
      type: "apply-marketing",
      cost,
      hype,
      name,
      segment,
    });
    applyEngineEffects(result.effects);
  };

  const attendExpo = (cost: number, gainedFans: number, gainedHype: number, label: string) => {
    const result = dispatchGame({ type: "attend-expo", cost, gainedFans, gainedHype, label });
    applyEngineEffects(result.effects);
    if (result.state.cash === cash && cost > 0) return;
  };

  const expandOffice = () => {
    const before = gameRef.current;
    const result = dispatchGame({ type: "expand-office", expectedLevel: companyLevel });
    applyEngineEffects(result.effects);
    if (result.state !== before) persistGame();
  };

  const advanceStageSequence = useCallback((phase: Exclude<StageCreationPhase, "select">) => {
    const current = stageCreationRef.current;
    const next = advanceStageCreation(current, phase);
    if (next === current) return;
    replaceStageCreation(next);
  }, [replaceStageCreation]);

  return (
    <main className="game-page">
      <div className="game-shell">
        {saveError && <div className="save-error" role="alert">{saveError}</div>}
        <GameDashboard
          game={game}
          modal={modal}
          paused={paused}
          speed={speed}
          toast={toast}
          projectPercent={projectPercent}
          chartLeader={chartLeader}
          earlyReleasePrediction={earlyReleasePrediction}
          onOpenMenu={openMenu}
          onForceRelease={forceRelease}
          onSave={saveGame}
          onRestart={restartGame}
          onTogglePause={() => setPaused((value) => !value)}
          onCycleSpeed={() => setSpeed((value) => value === 3 ? 1 : value + 1)}
          stageCreation={stageCreation}
          onAdvanceStageCreation={advanceStageSequence}
        />
        <GameModals
          game={game}
          modal={modal}
          setModal={setModal}
          closeModal={closeModal}
          announce={announce}
          eventData={eventData}
          review={review}
          resultData={resultData}
          planPrediction={planPrediction}
          consolePrediction={consolePrediction}
          selectedStaff={selectedStaff}
          availablePlatforms={availablePlatforms}
          sequelCandidates={sequelCandidates}
          hasHardwareEngineer={hasHardwareEngineer}
          hardwareEngineerCount={hardwareEngineerCount}
          selectedConsoleSpec={selectedConsoleSpec}
          merchantOpen={merchantOpen}
          getMerchantPrice={getMerchantPrice}
          remainingDirectionPoints={remainingDirectionPoints}
          selectedDevelopmentCost={selectedDevelopmentCost}
          gameName={gameName}
          setGameName={setGameName}
          selectedPlatform={selectedPlatform}
          setSelectedPlatform={setSelectedPlatform}
          selectedGenre={selectedGenre}
          setSelectedGenre={setSelectedGenre}
          selectedTheme={selectedTheme}
          setSelectedTheme={setSelectedTheme}
          selectedDirection={selectedDirection}
          setSelectedDirection={setSelectedDirection}
          selectedDirectionPoints={selectedDirectionPoints}
          selectedSequelId={selectedSequelId}
          setSelectedSequelId={setSelectedSequelId}
          consoleCpu={consoleCpu}
          setConsoleCpu={setConsoleCpu}
          consoleMedia={consoleMedia}
          setConsoleMedia={setConsoleMedia}
          consoleBody={consoleBody}
          setConsoleBody={setConsoleBody}
          adjustDirectionPoint={adjustDirectionPoint}
          startGame={startGame}
          startConsoleProject={startConsoleProject}
          assignStageLead={assignStageLead}
          waitForStageLead={waitForStageLead}
          hireExternalLead={hireExternalLead}
          startContract={startContract}
          levelUp={levelUp}
          openTraining={openTraining}
          openCareer={openCareer}
          expandOffice={expandOffice}
          runTraining={runTraining}
          changeCareer={changeCareer}
          buyCareerManual={buyCareerManual}
          buyShopItem={buyShopItem}
          applyItem={applyItem}
          hireWithMethod={hireWithMethod}
          advertise={advertise}
          attendExpo={attendExpo}
          resolveStaffChallenge={resolveStaffChallenge}
        />
      </div>
    </main>
  );
}
