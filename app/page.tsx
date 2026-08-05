"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  COMBO_STARTING_BONUS,
  OFFICE_UPGRADE_COSTS,
  getCareerOptionsFor,
  getContentPopularity,
  getDevelopmentCost,
  getLevelUpCost,
  getNextSalary,
} from "./game-balance";
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
  GREAT_COMBOS,
  HIRING_METHODS,
  PLATFORMS,
  ROLE_LEVEL_BOOSTS,
  ROLE_UNLOCK_RULES,
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
  getDirectionBoosts,
  getDirectionConfig,
  getKnowledgeLevel,
  getOfficeCapacity,
  getStageTarget,
} from "./game/rules";
import { parseSave, SAVE_STORAGE_KEY, serializeGameState } from "./game/save";
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
  ReviewData,
  Staff,
} from "./game/types";

export default function Home() {
  const {
    game,
    replaceGame,
    dispatchGame,
    setCash,
    setResearch,
    setStaff,
    setCompanyLevel,
    setUnlockedGenres,
    setCareerManuals,
    setInventory,
    setMerchantYear,
    setMerchantPurchases,
    setIndustryNews,
  } = useGameController();
  const {
    cash,
    research,
    year,
    month,
    week,
    staff,
    project,
    releases,
    companyLevel,
    awards,
    ownConsole,
    consoleUsers,
    genreExperience,
    themeExperience,
    unlockedGenres,
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
  const [selectedSequelName, setSelectedSequelName] = useState("");
  const [review, setReview] = useState<ReviewData | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    const saved = parseSave(window.localStorage.getItem(SAVE_STORAGE_KEY));
    if (!saved) return;
    replaceGame(saved);
  }, [replaceGame]);

  const availablePlatforms = useMemo(() => {
    return getAvailablePlatforms(year, ownConsole, consoleUsers);
  }, [year, ownConsole, consoleUsers]);

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
  const selectedDirectionConfig = getDirectionConfig(selectedDirection);
  const selectedDevelopmentCost = getDevelopmentCost(
    availablePlatforms.find((item) => item.name === selectedPlatform)?.cost ?? 0,
    selectedGenre,
    selectedTheme,
    selectedDirectionConfig.cost,
  );
  const activeStage = project?.kind === "game" ? (project.stage ?? "coding") : null;
  const projectPercent = project
    ? project.kind === "game"
      ? Math.min(100, Math.round((
          STAGE_ORDER.indexOf(activeStage ?? "coding") +
          clamp((project.stageProgress ?? 0) / Math.max(1, project.stageTarget ?? 1), 0, 1)
        ) / STAGE_ORDER.length * 100))
      : Math.min(100, Math.round((project.progress / project.target) * 100))
    : 0;

  const persistentState = game;

  useEffect(() => {
    if (!availablePlatforms.some((item) => item.name === selectedPlatform)) {
      setSelectedPlatform(availablePlatforms[0]?.name ?? "个人电脑");
    }
  }, [availablePlatforms, selectedPlatform]);

  useEffect(() => {
    setSelectedDirectionPoints(DEFAULT_DIRECTION_POINTS);
  }, [selectedGenre]);

  useEffect(() => {
    if (project?.kind === "game" && project.stage !== "debug" && !project.leadName && !modal) {
      setPaused(true);
      setModal("stage");
    }
  }, [project, modal]);

  const announce = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const applyEngineEffects = useCallback((effects: EngineEffect[]) => {
    for (const effect of effects) {
      if (effect.type === "toast") announce(effect.message);
      if (effect.type === "pause-for-stage") {
        setPaused(true);
        setModal("stage");
      }
      if (effect.type === "event") {
        setEventData(effect.event);
        setModal("event");
      }
      if (effect.type === "review") {
        setReview(effect.review);
        setModal("review");
      }
    }
  }, [announce]);

  const saveGame = () => {
    window.localStorage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify(serializeGameState(persistentState)),
    );
    announce("已保存到这台设备");
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
    if (modal) return;
    const result = dispatchGame({ type: "scheduled-event" });
    applyEngineEffects(result.effects);
  }, [year, month, week, modal, dispatchGame, applyEngineEffects]);

  useEffect(() => {
    if (week !== 1 || modal) return;
    const chartEntry = releases
      .filter((item) => (item.weeklySales ?? 0) > 0)
      .sort((a, b) => (a.weeklyRank ?? 99) - (b.weeklyRank ?? 99))[0];
    if (chartEntry) {
      setIndustryNews(`本月销量快讯：《${chartEntry.name}》以每周 ${(chartEntry.weeklySales ?? 0).toLocaleString()} 套位列第 ${chartEntry.weeklyRank ?? "—"} 名。`);
    } else {
      const platform = availablePlatforms[availablePlatforms.length - 1];
      setIndustryNews(`${platform?.name ?? "个人电脑"}市场持续升温，玩家期待下一款热门作品。`);
    }
  }, [month, week, modal, releases, availablePlatforms, setIndustryNews]);

  useEffect(() => {
    if (paused || modal) return;
    const interval = window.setInterval(() => {
      tickRef.current += 1;
      const result = dispatchGame({
        type: "tick",
        isNewWeek: tickRef.current % 4 === 0,
      });
      applyEngineEffects(result.effects);
    }, 1200 / speed);
    return () => window.clearInterval(interval);
  }, [paused, modal, speed, dispatchGame, applyEngineEffects]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      window.localStorage.setItem(
        SAVE_STORAGE_KEY,
        JSON.stringify(serializeGameState(persistentState)),
      );
    }, 8000);
    return () => window.clearInterval(timer);
  }, [persistentState]);

  const openMenu = (nextModal: Modal) => {
    setModal(nextModal);
    setPaused(true);
  };

  const closeModal = () => {
    setModal(null);
    setPaused(false);
  };

  const startGame = () => {
    const platform = availablePlatforms.find((item) => item.name === selectedPlatform) ?? availablePlatforms[0];
    if (!platform) return announce("目前没有可用平台");
    if (project) return announce("当前项目完成后才能开发新作");
    if (remainingDirectionPoints > 0) return announce(`还有 ${remainingDirectionPoints} 点开发方向尚未分配`);
    if (cash < selectedDevelopmentCost) return announce("资金不足，先接一份外包吧");
    const sequel = releases.find((item) => item.name === selectedSequelName && item.sequelEligible);
    const gameGenre = sequel?.genre ?? selectedGenre;
    const gameTheme = sequel?.theme ?? selectedTheme;
    const isGreatCombo = GREAT_COMBOS.has(`${gameGenre}|${gameTheme}`);
    const comboBoost = isGreatCombo ? COMBO_STARTING_BONUS : 0;
    const sequelBoost = sequel ? 7 + Math.floor(sequel.score / 8) : 0;
    const masteryBoost = getKnowledgeLevel(genreExperience[gameGenre] ?? 0) + getKnowledgeLevel(themeExperience[gameTheme] ?? 0) - 2;
    const directionBoosts = getDirectionBoosts(selectedDirectionPoints);
    dispatchGame({
      type: "start-project",
      cost: selectedDevelopmentCost,
      project: {
        kind: "game",
        name: gameName.trim() || "无名游戏",
        platform: selectedPlatform,
        genre: gameGenre,
        theme: gameTheme,
        direction: selectedDirection,
        progress: 0,
        target: Math.round(270 * selectedDirectionConfig.target),
        fun: 6 + comboBoost + masteryBoost + sequelBoost + directionBoosts.fun,
        creativity: 5 + comboBoost + masteryBoost + sequelBoost + directionBoosts.creativity,
        graphics: 4 + Math.floor(masteryBoost / 2) + sequelBoost + directionBoosts.graphics,
        sound: 3 + Math.floor(masteryBoost / 2) + sequelBoost + directionBoosts.sound,
        bugs: 0,
        hype: 2 + directionBoosts.hype,
        marketUsers: platform.users,
        stage: "planning",
        stageProgress: 0,
        stageTarget: getStageTarget("planning", selectedDirection),
        elapsedWeeks: 0,
        sequelOf: sequel?.name,
        itemUses: 0,
        eventCount: 0,
        directionPoints: selectedDirectionPoints,
        contentPopularity: getContentPopularity(gameGenre, gameTheme, isGreatCombo),
        debugResearch: 0,
        developmentCost: selectedDevelopmentCost,
      },
    });
    setSelectedSequelName("");
    setSelectedDirectionPoints(DEFAULT_DIRECTION_POINTS);
    setModal("stage");
    setPaused(true);
    announce("企划通过，请选择负责人");
  };

  const adjustDirectionPoint = (key: DirectionKey, delta: number) => {
    setSelectedDirectionPoints((points) => {
      if (delta > 0 && Object.values(points).reduce((sum, value) => sum + value, 0) >= directionPointBudget) return points;
      return { ...points, [key]: clamp(points[key] + delta, 0, 10) };
    });
  };

  const assignStageLead = (member: Staff) => {
    if (!project || project.kind !== "game" || project.stage === "debug") return;
    const stageInfo = STAGE_INFO[project.stage ?? "planning"];
    const skill = member[stageInfo.skill];
    dispatchGame({
      type: "choose-lead",
      leadStaffId: member.id,
      leadName: member.name,
      leadSkill: skill,
    });
    closeModal();
    announce(`${member.name} 负责${stageInfo.label}`);
  };

  const hireExternalLead = () => {
    if (!project || project.kind !== "game" || project.stage === "debug") return;
    const stage = project.stage ?? "planning";
    const stageInfo = STAGE_INFO[stage];
    const bestInternal = Math.max(...staff.map((member) => member[stageInfo.skill]));
    const stageIndex = STAGE_ORDER.indexOf(stage);
    const cost = 15 + stageIndex * 20;
    if (cash < cost) return announce("资金不足，无法邀请外部专家");
    dispatchGame({
      type: "choose-lead",
      leadName: "外聘名人",
      leadSkill: bestInternal + 6 + stageIndex * 2,
      cost,
    });
    closeModal();
    announce(`外部专家加入${stageInfo.label}`);
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
    if (member.level >= 5) return announce("该职业已达到 Lv.5，可以使用转职手册");
    const cost = getLevelUpCost(member.level);
    if (research < cost) return announce(`升级需要 ${cost} 点研究`);
    const boosts = ROLE_LEVEL_BOOSTS[member.role] ?? { code: 2, scenario: 2, art: 2, sound: 2 };
    const nextLevel = member.level + 1;
    setResearch((value) => value - cost);
    setStaff((members) => members.map((item) => item.id === id ? {
      ...item,
      level: nextLevel,
      code: item.code + (boosts.code ?? 0),
      scenario: item.scenario + (boosts.scenario ?? 0),
      art: item.art + (boosts.art ?? 0),
      sound: item.sound + (boosts.sound ?? 0),
      salary: getNextSalary(item.salary),
      masteredRoles: nextLevel === 5
        ? Array.from(new Set([...(item.masteredRoles ?? []), item.role]))
        : item.masteredRoles,
    } : item));

    const unlockedNow = ROLE_UNLOCK_RULES.filter((rule) => rule.role === member.role && rule.level === nextLevel);
    const newGenres = unlockedNow.filter((rule) => !unlockedGenres.includes(rule.name)).map((rule) => rule.name);
    if (newGenres.length) setUnlockedGenres((items) => [...items, ...newGenres]);
    announce(unlockedNow.length
      ? `${member.name} 升至 Lv.${nextLevel}，解锁“${unlockedNow.map((rule) => rule.name).join("、")}”！`
      : `${member.name} 升至 Lv.${nextLevel}，能力提升！`);
  };

  const openTraining = (id: number) => {
    setSelectedStaffId(id);
    setModal("training");
  };

  const runTraining = (method: (typeof TRAINING_METHODS)[number]) => {
    if (selectedStaffId === null) return;
    const result = dispatchGame({
      type: "train-staff",
      staffId: selectedStaffId,
      method,
    });
    applyEngineEffects(result.effects);
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

  const getCareerOptions = (member: Staff) => {
    return getCareerOptionsFor(member.masteredRoles ?? [], member.role);
  };

  const openCareer = (id: number) => {
    const member = staff.find((item) => item.id === id);
    if (!member) return;
    if (member.level < 5) return announce("当前职业达到 Lv.5 后才能转职");
    if (careerManuals < 1) return announce("需要 1 本转职手册");
    setSelectedStaffId(id);
    setModal("career");
  };

  const changeCareer = (role: string) => {
    const member = staff.find((item) => item.id === selectedStaffId);
    if (!member) return;
    const result = dispatchGame({ type: "change-career", staffId: member.id, role });
    applyEngineEffects(result.effects);
    if (result.state.careerManuals === careerManuals) return;
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
    closeModal();
  };

  const expandOffice = () => {
    if (companyLevel >= 3) return announce("已经搬入最大的办公室");
    const nextLevel = companyLevel + 1;
    const cost = OFFICE_UPGRADE_COSTS[nextLevel as 2 | 3];
    if (nextLevel === 2 && (year < 4 || releases.length < 1 || cash < 1000)) {
      return announce("第 4 年后，发售至少 1 款游戏并持有 ¥1,000千 才会收到搬迁邀请");
    }
    if (nextLevel === 3 && awards < 1 && year < 10) {
      return announce("获得至少 1 次奖项，或经营到第 10 年后解锁大楼办公室");
    }
    if (cash < cost) return announce(`扩建需要 ${formatCash(cost)}`);
    setCash((value) => value - cost);
    setCompanyLevel(nextLevel);
    setIndustryNews(`像素工坊迁入第 ${nextLevel} 阶段办公室，团队规模进一步扩大。`);
    setEventData({
      kind: "office",
      title: "办公室搬迁",
      headline: nextLevel === 2 ? "更宽敞的新办公室启用！" : "梦想中的游戏大楼落成！",
      body: nextLevel === 2
        ? "团队拥有了更多工位，也解锁了更高级的招聘与培训方式。"
        : "八个工位、专用会议区与硬件实验室全部就绪，工作室正式迈入顶级开发商行列。",
      reward: `员工上限提升至 ${getOfficeCapacity(nextLevel)} 人`,
    });
    setModal("event");
    setPaused(true);
  };

  return (
    <main className="game-page">
      <div className="game-shell">
        <GameDashboard
          game={game}
          modal={modal}
          paused={paused}
          speed={speed}
          toast={toast}
          projectPercent={projectPercent}
          chartLeader={chartLeader}
          onOpenMenu={openMenu}
          onForceRelease={forceRelease}
          onSave={saveGame}
          onRestart={restartGame}
          onTogglePause={() => setPaused((value) => !value)}
          onCycleSpeed={() => setSpeed((value) => value === 3 ? 1 : value + 1)}
        />
        <GameModals
          game={game}
          modal={modal}
          setModal={setModal}
          closeModal={closeModal}
          announce={announce}
          eventData={eventData}
          review={review}
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
          selectedSequelName={selectedSequelName}
          setSelectedSequelName={setSelectedSequelName}
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
          hireExternalLead={hireExternalLead}
          startContract={startContract}
          levelUp={levelUp}
          openTraining={openTraining}
          openCareer={openCareer}
          expandOffice={expandOffice}
          runTraining={runTraining}
          getCareerOptions={getCareerOptions}
          changeCareer={changeCareer}
          buyCareerManual={buyCareerManual}
          buyShopItem={buyShopItem}
          applyItem={applyItem}
          hireWithMethod={hireWithMethod}
          advertise={advertise}
          attendExpo={attendExpo}
        />
      </div>
    </main>
  );
}
