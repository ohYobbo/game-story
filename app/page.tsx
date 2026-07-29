"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Staff = {
  id: number;
  name: string;
  role: string;
  level: number;
  code: number;
  scenario: number;
  art: number;
  sound: number;
  energy: number;
  color: string;
  training?: Record<string, number>;
  masteredRoles?: string[];
};

type ProductionStage = "planning" | "coding" | "graphics" | "sound" | "debug";

type FanSegments = {
  kids: number;
  teens: number;
  adults: number;
  seniors: number;
  male: number;
  female: number;
};

type Project = {
  kind: "game" | "contract" | "console";
  name: string;
  platform: string;
  genre: string;
  theme: string;
  direction: string;
  progress: number;
  target: number;
  fun: number;
  creativity: number;
  graphics: number;
  sound: number;
  bugs: number;
  hype: number;
  reward?: number;
  marketUsers?: number;
  stage?: ProductionStage;
  stageProgress?: number;
  stageTarget?: number;
  leadStaffId?: number;
  leadName?: string;
  leadSkill?: number;
  debugTarget?: number;
  elapsedWeeks?: number;
  consoleSpec?: ConsoleSpec;
  sequelOf?: string;
  itemUses?: number;
};

type ConsoleSpec = {
  cpu: string;
  media: string;
  body: string;
  performance: number;
  cost: number;
};

type Release = {
  name: string;
  score: number;
  sales: number;
  income: number;
  weeks: number;
  releasedYear?: number;
  platform?: string;
  weeklySales?: number;
  remainingDemand?: number;
  trend?: number;
  audience?: string;
  genre?: string;
  theme?: string;
  sequelEligible?: boolean;
};

type Inventory = {
  funBoost: number;
  creativityBoost: number;
  graphicsBoost: number;
  soundBoost: number;
  bugSpray: number;
  energyDrink: number;
};

type SaveState = {
  cash: number;
  fans: number;
  research: number;
  year: number;
  month: number;
  week: number;
  staff: Staff[];
  project: Project | null;
  releases: Release[];
  companyLevel: number;
  awards?: number;
  ownConsole?: boolean;
  consoleUsers?: number;
  lastEventKey?: string;
  fanSegments?: FanSegments;
  reputation?: number;
  genreExperience?: Record<string, number>;
  themeExperience?: Record<string, number>;
  unlockedGenres?: string[];
  unlockedThemes?: string[];
  careerManuals?: number;
  endingShown?: boolean;
  endingScore?: number;
  inventory?: Inventory;
  merchantYear?: number;
  merchantPurchases?: number;
};

type EventData = {
  kind: "payroll" | "expo" | "awards" | "console" | "market" | "ending";
  title: string;
  headline: string;
  body: string;
  reward?: string;
};

type Modal = "develop" | "contracts" | "staff" | "training" | "career" | "console" | "shop" | "items" | "hire" | "marketing" | "records" | "review" | "event" | "stage" | null;

const INITIAL_STAFF: Staff[] = [
  { id: 1, name: "林小码", role: "程序员", level: 1, code: 18, scenario: 8, art: 7, sound: 4, energy: 100, color: "#ef6351" },
  { id: 2, name: "阿麦", role: "编剧", level: 1, code: 8, scenario: 18, art: 10, sound: 7, energy: 100, color: "#43aa8b" },
  { id: 3, name: "桃子", role: "美术", level: 1, code: 5, scenario: 9, art: 21, sound: 6, energy: 100, color: "#577590" },
  { id: 4, name: "小音", role: "音效师", level: 1, code: 4, scenario: 6, art: 8, sound: 20, energy: 100, color: "#f8961e" },
];

const PLATFORMS = [
  { name: "个人电脑", cost: 300, users: 280_000, debut: 1, retire: 99, tone: "#91c46c" },
  { name: "豆豆机", cost: 650, users: 740_000, debut: 1, retire: 5, tone: "#efca55" },
  { name: "迷你掌机", cost: 1100, users: 1_260_000, debut: 2, retire: 8, tone: "#71add1" },
  { name: "星球盒", cost: 1750, users: 1_720_000, debut: 4, retire: 11, tone: "#a68ad4" },
  { name: "幻彩 32", cost: 2400, users: 2_350_000, debut: 6, retire: 99, tone: "#e67c5c" },
];
const GENRES = ["动作", "角色扮演", "模拟", "冒险", "益智"];
const THEMES = ["幻想", "忍者", "侦探", "小镇", "机器人"];
const EXTRA_GENRES = ["射击", "竞速", "桌游", "格斗", "音乐"];
const EXTRA_THEMES = ["太空", "校园", "历史", "体育", "怪物"];
const DIRECTIONS = [
  { name: "均衡", note: "稳妥推进" },
  { name: "重视品质", note: "慢工出细活" },
  { name: "赶工", note: "快速但易出错" },
];
const GREAT_COMBOS = new Set([
  "角色扮演|幻想", "动作|忍者", "冒险|侦探", "模拟|小镇", "动作|机器人",
  "射击|太空", "竞速|体育", "音乐|校园", "格斗|怪物", "桌游|历史",
]);

const STAGE_ORDER: ProductionStage[] = ["planning", "coding", "graphics", "sound", "debug"];
const STAGE_INFO: Record<ProductionStage, { label: string; short: string; skill: keyof Pick<Staff, "code" | "scenario" | "art" | "sound">; note: string }> = {
  planning: { label: "企划构思", short: "企划", skill: "scenario", note: "决定作品的趣味与创意" },
  coding: { label: "程序开发", short: "程序", skill: "code", note: "搭建核心玩法并实现系统" },
  graphics: { label: "美术制作", short: "画面", skill: "art", note: "绘制角色、场景与特效" },
  sound: { label: "音乐制作", short: "音乐", skill: "sound", note: "创作配乐与音效" },
  debug: { label: "最终除错", short: "除错", skill: "code", note: "全员找出漏洞，准备发售" },
};

const TRAINING_METHODS = [
  { id: "reading", name: "阅读资料", note: "强化剧本与创意", cost: 240, energy: 18, gains: { scenario: 4 }, unlock: { kind: "theme" as const, name: "历史" } },
  { id: "movie", name: "电影鉴赏", note: "学习叙事与画面", cost: 520, energy: 25, gains: { scenario: 3, art: 3 }, unlock: { kind: "theme" as const, name: "太空" } },
  { id: "marathon", name: "热血马拉松", note: "磨炼程序与音效", cost: 380, energy: 30, gains: { code: 3, sound: 2 }, unlock: { kind: "theme" as const, name: "体育" } },
  { id: "pinball", name: "弹珠机特训", note: "全能力都有机会提升", cost: 950, energy: 38, gains: { code: 2, scenario: 2, art: 2, sound: 2 }, unlock: { kind: "genre" as const, name: "桌游" } },
];

const CONSOLE_CPUS = [
  { name: "8 位芯片", cost: 0, power: 1 },
  { name: "16 位芯片", cost: 2500, power: 1.35 },
  { name: "光速芯片", cost: 6000, power: 1.8 },
];
const CONSOLE_MEDIA = [
  { name: "卡带", cost: 0, power: 1 },
  { name: "光盘", cost: 1800, power: 1.25 },
  { name: "晶体盘", cost: 4500, power: 1.55 },
];
const CONSOLE_BODIES = [
  { name: "家用机", cost: 0, power: 1 },
  { name: "掌机", cost: 2800, power: 1.2 },
  { name: "混合机", cost: 6500, power: 1.55 },
];

const INITIAL_FAN_SEGMENTS: FanSegments = {
  kids: 18,
  teens: 34,
  adults: 42,
  seniors: 8,
  male: 58,
  female: 44,
};

const INITIAL_INVENTORY: Inventory = {
  funBoost: 0,
  creativityBoost: 0,
  graphicsBoost: 0,
  soundBoost: 0,
  bugSpray: 0,
  energyDrink: 0,
};

const SHOP_ITEMS = [
  { key: "funBoost" as const, name: "趣味提升书", note: "开发中增加趣味", cost: 620, icon: "F" },
  { key: "creativityBoost" as const, name: "创意提升书", note: "开发中增加创意", cost: 620, icon: "I" },
  { key: "graphicsBoost" as const, name: "画面提升书", note: "开发中增加画面", cost: 620, icon: "G" },
  { key: "soundBoost" as const, name: "音乐提升书", note: "开发中增加音乐", cost: 620, icon: "S" },
  { key: "bugSpray" as const, name: "漏洞喷雾", note: "立即移除部分漏洞", cost: 480, icon: "!" },
  { key: "energyDrink" as const, name: "活力汽水", note: "恢复全员体力", cost: 360, icon: "E" },
];

const HIRING_METHODS = [
  { name: "员工介绍", note: "便宜，候选人能力普通", cost: 350, quality: 0 },
  { name: "游戏杂志广告", note: "稳定找到专业人才", cost: 900, quality: 1 },
  { name: "网络招聘", note: "新人到资深人士都有", cost: 1900, quality: 2 },
  { name: "校园宣讲会", note: "寻找潜力出众的新人", cost: 2800, quality: 3, level: 2 },
  { name: "公开选拔会", note: "高价搜罗明星人才", cost: 4800, quality: 4, level: 2 },
];

const contracts = [
  { name: "商店网页小游戏", target: 115, reward: 850, note: "限期 9 周" },
  { name: "动画片特效", target: 185, reward: 1450, note: "限期 12 周" },
  { name: "掌机移植外包", target: 260, reward: 2350, note: "限期 14 周" },
];

const formatCash = (value: number) => `¥${Math.max(0, Math.round(value)).toLocaleString()}千`;
const formatUsers = (value: number) => value >= 10_000 ? `${Math.round(value / 10_000)}万` : value.toLocaleString();
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const getKnowledgeLevel = (experience = 0) => clamp(1 + Math.floor(experience / 2), 1, 5);

function normalizeStaff(member: Staff): Staff {
  const roleMap: Record<string, string> = {
    "策划": "编剧",
    "高级程序员": "程序员",
    "技术总监": "程序员",
    "原画师": "美术",
    "美术总监": "美术",
    "音乐人": "音效师",
    "作曲家": "音效师",
    "音乐总监": "音效师",
  };
  return {
    ...member,
    role: roleMap[member.role] ?? member.role,
    scenario: member.scenario ?? Math.max(5, Math.round(member.art * .8)),
    training: member.training ?? {},
    masteredRoles: member.masteredRoles ?? (member.level >= 5 ? [roleMap[member.role] ?? member.role] : []),
  };
}

function getAudience(genre: string, theme: string): { label: string; gains: Partial<FanSegments> } {
  if (genre === "动作" || theme === "忍者" || theme === "机器人") {
    return { label: "青少年・男性", gains: { teens: 10, male: 9, kids: 3 } };
  }
  if (genre === "角色扮演" || theme === "幻想") {
    return { label: "青少年・全年龄", gains: { teens: 8, adults: 6, male: 5, female: 5 } };
  }
  if (genre === "模拟" || theme === "小镇") {
    return { label: "成人・女性", gains: { adults: 10, female: 9, seniors: 3 } };
  }
  if (genre === "冒险" || theme === "侦探") {
    return { label: "成人・女性", gains: { adults: 9, female: 7, teens: 4 } };
  }
  return { label: "家庭・全年龄", gains: { kids: 6, seniors: 7, female: 5, male: 3 } };
}

function getStageTarget(stage: ProductionStage, direction: string): number {
  const targets: Record<ProductionStage, number> = {
    planning: 58,
    coding: 108,
    graphics: 82,
    sound: 68,
    debug: 1,
  };
  const modifier = direction === "重视品质" ? 1.2 : direction === "赶工" ? .82 : 1;
  return Math.round(targets[stage] * modifier);
}

function loadSave(): SaveState | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem("pixel-studio-save");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function PixelPerson({ staff, working }: { staff: Staff; working: boolean }) {
  return (
    <div className={`worker ${working ? "is-working" : ""}`} aria-label={`${staff.name}，${staff.role}`}>
      <div className="work-puff">{working ? `+${Math.max(1, Math.round((staff.code + staff.art + staff.sound) / 16))}` : "Z"}</div>
      <div className="person">
        <i className="hair" />
        <i className="face" />
        <i className="body" style={{ "--shirt": staff.color } as React.CSSProperties} />
        <i className="arm" />
      </div>
      <div className="chair" />
      <div className="desk">
        <i className="monitor" />
        <i className="keyboard" />
        <i className="mug" />
      </div>
      <span className="name-tag">{staff.name}</span>
    </div>
  );
}

function WindowView() {
  return (
    <div className="office-window" aria-hidden="true">
      <div className="sky">
        <i className="cloud c1" />
        <i className="cloud c2" />
        <i className="sun" />
      </div>
      <div className="city">
        <i /><i /><i /><i /><i />
      </div>
      <div className="window-bar" />
    </div>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="pixel-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-title">
          <span>{title}</span>
          <button className="close-button" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

export default function Home() {
  const [cash, setCash] = useState(5000);
  const [fans, setFans] = useState(120);
  const [research, setResearch] = useState(10);
  const [year, setYear] = useState(1);
  const [month, setMonth] = useState(4);
  const [week, setWeek] = useState(1);
  const [staff, setStaff] = useState<Staff[]>(INITIAL_STAFF);
  const [project, setProject] = useState<Project | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [companyLevel, setCompanyLevel] = useState(1);
  const [awards, setAwards] = useState(0);
  const [ownConsole, setOwnConsole] = useState(false);
  const [consoleUsers, setConsoleUsers] = useState(0);
  const [lastEventKey, setLastEventKey] = useState("");
  const [fanSegments, setFanSegments] = useState<FanSegments>(INITIAL_FAN_SEGMENTS);
  const [reputation, setReputation] = useState(10);
  const [genreExperience, setGenreExperience] = useState<Record<string, number>>({});
  const [themeExperience, setThemeExperience] = useState<Record<string, number>>({});
  const [unlockedGenres, setUnlockedGenres] = useState<string[]>(GENRES);
  const [unlockedThemes, setUnlockedThemes] = useState<string[]>(THEMES);
  const [careerManuals, setCareerManuals] = useState(0);
  const [endingShown, setEndingShown] = useState(false);
  const [endingScore, setEndingScore] = useState(0);
  const [inventory, setInventory] = useState<Inventory>(INITIAL_INVENTORY);
  const [merchantYear, setMerchantYear] = useState(0);
  const [merchantPurchases, setMerchantPurchases] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("欢迎回来，社长！");
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0].name);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [selectedDirection, setSelectedDirection] = useState(DIRECTIONS[0].name);
  const [gameName, setGameName] = useState("像素勇者");
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [consoleCpu, setConsoleCpu] = useState(CONSOLE_CPUS[0].name);
  const [consoleMedia, setConsoleMedia] = useState(CONSOLE_MEDIA[0].name);
  const [consoleBody, setConsoleBody] = useState(CONSOLE_BODIES[0].name);
  const [selectedSequelName, setSelectedSequelName] = useState("");
  const [review, setReview] = useState<{
    name: string;
    scores: number[];
    sales: number;
    income: number;
    audience: string;
    reputationChange: number;
    growth: string;
  } | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    const saved = loadSave();
    if (!saved) return;
    setCash(saved.cash);
    setFans(saved.fans);
    setResearch(saved.research);
    setYear(saved.year);
    setMonth(saved.month);
    setWeek(saved.week);
    const migratedStaff = (saved.staff ?? INITIAL_STAFF).map(normalizeStaff);
    setStaff(migratedStaff);
    const migratedProject = saved.project?.kind === "game" && !saved.project.stage
      ? {
          ...saved.project,
          stage: "coding" as ProductionStage,
          stageProgress: saved.project.progress,
          stageTarget: saved.project.target,
          leadStaffId: migratedStaff[0]?.id,
          leadName: migratedStaff[0]?.name,
          leadSkill: migratedStaff[0]?.code ?? 10,
          elapsedWeeks: 0,
        }
      : saved.project;
    setProject(migratedProject);
    setReleases((saved.releases ?? []).map((item) => ({
      ...item,
      genre: item.genre ?? "角色扮演",
      theme: item.theme ?? "幻想",
      sequelEligible: item.sequelEligible ?? item.score >= 32,
    })));
    setCompanyLevel(saved.companyLevel);
    setAwards(saved.awards ?? 0);
    setOwnConsole(saved.ownConsole ?? false);
    setConsoleUsers(saved.consoleUsers ?? 0);
    setLastEventKey(saved.lastEventKey ?? "");
    setFanSegments(saved.fanSegments ?? INITIAL_FAN_SEGMENTS);
    setReputation(saved.reputation ?? 10);
    setGenreExperience(saved.genreExperience ?? {});
    setThemeExperience(saved.themeExperience ?? {});
    setUnlockedGenres(saved.unlockedGenres ?? GENRES);
    setUnlockedThemes(saved.unlockedThemes ?? THEMES);
    setCareerManuals(saved.careerManuals ?? 0);
    setEndingShown(saved.endingShown ?? false);
    setEndingScore(saved.endingScore ?? 0);
    setInventory(saved.inventory ?? INITIAL_INVENTORY);
    setMerchantYear(saved.merchantYear ?? 0);
    setMerchantPurchases(saved.merchantPurchases ?? 0);
  }, []);

  const availablePlatforms = useMemo(() => {
    const market = PLATFORMS.filter((item) => year >= item.debut && year <= item.retire);
    if (ownConsole) {
      market.push({
        name: "像素盒子",
        cost: 180,
        users: Math.max(220_000, consoleUsers),
        debut: year,
        retire: 99,
        tone: "#f07355",
      });
    }
    return market;
  }, [year, ownConsole, consoleUsers]);

  const totalPower = useMemo(
    () => staff.reduce((sum, member) => sum + member.code + member.art + member.sound, 0),
    [staff],
  );
  const selectedStaff = staff.find((member) => member.id === selectedStaffId) ?? null;
  const sequelCandidates = releases.filter((item) => item.sequelEligible && item.genre && item.theme);
  const hasHardwareEngineer = staff.some((member) => member.role === "硬件工程师" || member.role === "黑客");
  const selectedConsoleSpec = useMemo(() => {
    const cpu = CONSOLE_CPUS.find((item) => item.name === consoleCpu) ?? CONSOLE_CPUS[0];
    const media = CONSOLE_MEDIA.find((item) => item.name === consoleMedia) ?? CONSOLE_MEDIA[0];
    const body = CONSOLE_BODIES.find((item) => item.name === consoleBody) ?? CONSOLE_BODIES[0];
    return {
      cost: 6000 + cpu.cost + media.cost + body.cost,
      performance: Number(((cpu.power + media.power + body.power) / 3).toFixed(2)),
    };
  }, [consoleCpu, consoleMedia, consoleBody]);
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
    if (project?.kind === "game" && project.stage !== "debug" && !project.leadName && !modal) {
      setPaused(true);
      setModal("stage");
    }
  }, [project, modal]);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const saveGame = () => {
    const state: SaveState = {
      cash, fans, research, year, month, week, staff, project, releases, companyLevel,
      awards, ownConsole, consoleUsers, lastEventKey, fanSegments, reputation,
      genreExperience, themeExperience, unlockedGenres, unlockedThemes, careerManuals,
      endingShown, endingScore, inventory, merchantYear, merchantPurchases,
    };
    window.localStorage.setItem("pixel-studio-save", JSON.stringify(state));
    announce("已保存到这台设备");
  };

  const advanceCalendar = () => {
    setWeek((oldWeek) => {
      if (oldWeek < 4) return oldWeek + 1;
      setMonth((oldMonth) => {
        if (oldMonth < 12) return oldMonth + 1;
        setYear((oldYear) => oldYear + 1);
        return 1;
      });
      return 1;
    });
  };

  const finishProject = (finished: Project) => {
    if (finished.kind === "contract") {
      const reward = finished.reward ?? 600;
      setCash((value) => value + reward);
      setResearch((value) => value + 4);
      setProject(null);
      announce(`外包完成！获得 ${formatCash(reward)}`);
      return;
    }

    if (finished.kind === "console") {
      const hardwarePower = finished.consoleSpec?.performance ?? 1;
      const initialUsers = Math.round((260_000 + fans * 110 + totalPower * 850) * hardwarePower);
      setOwnConsole(true);
      setConsoleUsers(initialUsers);
      setFans((value) => value + 600);
      setResearch((value) => value + 35);
      setProject(null);
      setEventData({
        kind: "console",
        title: "自研主机发布会",
        headline: "像素盒子 正式发售！",
        body: `${finished.consoleSpec?.cpu ?? "定制芯片"}、${finished.consoleSpec?.media ?? "专用媒体"}与${finished.consoleSpec?.body ?? "家用机身"}顺利量产。今后开发新作时，可以选择自家平台并免除高额授权费。`,
        reward: `首批用户 ${formatUsers(initialUsers)} 人 · 粉丝 +600`,
      });
      setModal("event");
      return;
    }

    const combo = GREAT_COMBOS.has(`${finished.genre}|${finished.theme}`) ? 2 : 0;
    const bugPenalty = Math.min(3.5, finished.bugs * .14);
    const base = (finished.fun + finished.creativity + finished.graphics + finished.sound) / 48;
    const scores = [0.2, 0.7, 1.1, 1.6].map((bonus) =>
      clamp(Math.round(base + combo + bonus + reputation / 45 - bugPenalty + Math.random() * 1.4), 1, 10),
    );
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const marketMultiplier = clamp((finished.marketUsers ?? 280_000) / 520_000, 0.7, 3.4);
    const sales = Math.round((totalScore ** 2 * 24 + finished.hype * 95 + fans * 2.4) * marketMultiplier * (0.85 + Math.random() * 0.3));
    const income = Math.round(sales * 0.018);
    const audience = getAudience(finished.genre, finished.theme);
    const oldGenreLevel = getKnowledgeLevel(genreExperience[finished.genre] ?? 0);
    const oldThemeLevel = getKnowledgeLevel(themeExperience[finished.theme] ?? 0);
    const nextGenreExperience = (genreExperience[finished.genre] ?? 0) + 1;
    const nextThemeExperience = (themeExperience[finished.theme] ?? 0) + 1;
    const nextGenreLevel = getKnowledgeLevel(nextGenreExperience);
    const nextThemeLevel = getKnowledgeLevel(nextThemeExperience);
    setGenreExperience((values) => ({ ...values, [finished.genre]: (values[finished.genre] ?? 0) + 1 }));
    setThemeExperience((values) => ({ ...values, [finished.theme]: (values[finished.theme] ?? 0) + 1 }));
    const reputationChange = totalScore >= 34 ? 8 : totalScore >= 28 ? 4 : totalScore >= 22 ? 1 : -4;
    const fanGrowth = Math.max(4, Math.round(sales / 220));
    const audienceScale = clamp(totalScore / 28, .6, 1.6);
    setCash((value) => value + income);
    setFans((value) => value + fanGrowth);
    setFanSegments((segments) => {
      const next = { ...segments };
      for (const [key, value] of Object.entries(audience.gains) as [keyof FanSegments, number][]) {
        next[key] += Math.max(1, Math.round(value * audienceScale));
      }
      return next;
    });
    setReputation((value) => clamp(value + reputationChange, 0, 100));
    setResearch((value) => value + 7 + Math.round(totalScore / 8));
    setReleases((items) => {
      const prior = items.map((item) => item.name === finished.sequelOf ? { ...item, sequelEligible: false } : item);
      return [{
        name: finished.name,
        score: totalScore,
        sales,
        income,
        weeks: 0,
        releasedYear: year,
        platform: finished.platform,
        weeklySales: sales,
        remainingDemand: Math.round(sales * (1.8 + totalScore / 13)),
        trend: clamp(.68 + totalScore / 100 + finished.hype / 180, .72, 1.12),
        audience: audience.label,
        genre: finished.genre,
        theme: finished.theme,
        sequelEligible: totalScore >= 32,
      }, ...prior].slice(0, 12);
    });
    if (finished.platform === "像素盒子") {
      setConsoleUsers((value) => value + Math.round(sales * 0.18));
    }
    setProject(null);
    const growth = `${finished.genre} Lv.${nextGenreLevel} · ${finished.theme} Lv.${nextThemeLevel}${
      nextGenreLevel > oldGenreLevel || nextThemeLevel > oldThemeLevel ? "  熟练度提升！" : ""
    }`;
    setReview({ name: finished.name, scores, sales, income, audience: audience.label, reputationChange, growth });
    setModal("review");
  };

  useEffect(() => {
    if (modal) return;
    const eventKey = `${year}-${month}-${week}`;
    if (lastEventKey === eventKey) return;

    if (year >= 20 && !endingShown) {
      const millionSellers = releases.filter((item) => item.sales >= 1_000_000).length;
      const score = Math.round(
        cash / 90 + fans / 18 + reputation * 35 + awards * 900 +
        millionSellers * 1500 + (ownConsole ? 2200 : 0),
      );
      setEndingScore(score);
      setEndingShown(true);
      setLastEventKey(eventKey);
      setEventData({
        kind: "ending",
        title: "20 年经营报告",
        headline: score >= 12_000 ? "传奇工作室诞生！" : score >= 7_000 ? "跻身一流开发商！" : "故事仍会继续",
        body: `二十年的作品、员工与玩家共同写成了这份成绩。百万销量作品 ${millionSellers} 款，获奖 ${awards} 次，业界口碑 ${reputation}。结算后仍可继续经营。`,
        reward: `最终经营分数 ${score.toLocaleString()} 分`,
      });
      setModal("event");
      return;
    }

    if (month === 3 && week === 1) {
      const payroll = staff.reduce((sum, member) => sum + 110 + member.level * 85, 0);
      setCash((value) => Math.max(0, value - payroll));
      setLastEventKey(eventKey);
      setEventData({
        kind: "payroll",
        title: "年度结算",
        headline: "大家辛苦了一年！",
        body: "三月是发放年度薪资的月份。能力越强、职级越高，团队的年度薪资也会随之增长。",
        reward: `已支付员工薪资 ${formatCash(payroll)}`,
      });
      setModal("event");
      return;
    }

    if (month === 7 && week === 1 && companyLevel >= 2) {
      setLastEventKey(eventKey);
      setEventData({
        kind: "expo",
        title: "像素游戏博览会",
        headline: "年度展会今天开幕！",
        body: "选择展位规模，让更多玩家认识工作室。正在开发的作品也会同时获得热度。",
      });
      setModal("event");
      return;
    }

    if (month === 6 && week === 1) {
      const debut = PLATFORMS.find((item) => item.debut === year && item.debut > 1);
      if (debut) {
        setLastEventKey(eventKey);
        setEventData({
          kind: "market",
          title: "游戏行业快讯",
          headline: `新主机“${debut.name}”上市！`,
          body: "新平台正在迅速吸引玩家。授权费用不低，但庞大的用户市场可能带来惊人的销量。",
          reward: `首发用户 ${formatUsers(debut.users)} · 开发授权 ${formatCash(debut.cost)}`,
        });
        setModal("event");
        return;
      }
    }

    if (month === 12 && week === 1) {
      const candidates = releases.filter((item) => item.releasedYear === year);
      const best = [...candidates].sort((a, b) => b.score - a.score)[0];
      let headline = "今年没有作品入围";
      let body = "来年继续磨练团队，冲击游戏行业的最高荣誉吧。";
      let reward = "无奖金";
      let prize = 0;
      let newFans = 0;

      if (best && best.score >= 36) {
        headline = `《${best.name}》荣获年度最佳！`;
        body = "全场评审起立鼓掌，工作室的名字响彻整个游戏行业。";
        reward = "奖金 ¥4,000千 · 粉丝 +1,200";
        prize = 4000;
        newFans = 1200;
        setAwards((value) => value + 1);
      } else if (best && best.score >= 32) {
        headline = `《${best.name}》荣获优秀设计奖！`;
        body = "独到的创意与完成度得到了评审们的一致肯定。";
        reward = "奖金 ¥2,000千 · 粉丝 +600";
        prize = 2000;
        newFans = 600;
        setAwards((value) => value + 1);
      } else if (best && best.score >= 28) {
        headline = `《${best.name}》获得评审特别奖`;
        body = "虽然与大奖擦肩而过，但作品已经给玩家留下了深刻印象。";
        reward = "奖金 ¥800千 · 粉丝 +250";
        prize = 800;
        newFans = 250;
      }

      setCash((value) => value + prize);
      setFans((value) => value + newFans);
      setLastEventKey(eventKey);
      setEventData({ kind: "awards", title: "全球游戏大奖", headline, body, reward });
      setModal("event");
    }
  }, [year, month, week, lastEventKey, releases, staff, companyLevel, modal, endingShown, cash, fans, awards, ownConsole, reputation]);

  useEffect(() => {
    if (paused || modal) return;
    const interval = window.setInterval(() => {
      tickRef.current += 1;
      const isNewWeek = tickRef.current % 4 === 0;
      if (isNewWeek) {
        advanceCalendar();
        let weeklyIncome = 0;
        let weeklyFans = 0;
        let ownPlatformSales = 0;
        const nextReleases = releases.map((item) => {
          const currentWeekly = item.weeklySales ?? 0;
          const remaining = item.remainingDemand ?? 0;
          const nextWeekly = Math.min(
            remaining,
            Math.max(0, Math.round(currentWeekly * (item.trend ?? .78) * .82)),
          );
          const income = Math.round(nextWeekly * .018);
          weeklyIncome += income;
          weeklyFans += Math.round(nextWeekly / 6500);
          if (item.platform === "像素盒子") ownPlatformSales += nextWeekly;
          return {
            ...item,
            sales: item.sales + nextWeekly,
            income: item.income + income,
            weeks: item.weeks + 1,
            weeklySales: nextWeekly,
            remainingDemand: Math.max(0, remaining - nextWeekly),
          };
        });
        setReleases(nextReleases);
        if (weeklyIncome) setCash((value) => value + weeklyIncome);
        if (weeklyFans) setFans((value) => value + weeklyFans);
        if (ownPlatformSales) setConsoleUsers((value) => value + Math.round(ownPlatformSales * .025));
      }
      setStaff((members) =>
        members.map((member) => ({
          ...member,
          energy: clamp(member.energy + (project ? -1.6 : 4), 25, 100),
        })),
      );

      if (project) {
        const directionModifier = project.direction === "赶工" ? 1.35 : project.direction === "重视品质" ? 0.82 : 1;
        const energyModifier = staff.reduce((sum, member) => sum + member.energy, 0) / (staff.length * 100);
        setProject((current) => {
          if (!current) return null;
          if (current.kind === "game") {
            const stage = current.stage ?? "coding";
            if (stage === "debug") {
              const debugGain = (totalPower / 90) * energyModifier * (0.8 + Math.random() * .35);
              const bugs = Math.max(0, current.bugs - debugGain);
              const next = {
                ...current,
                bugs,
                stageProgress: Math.min(current.stageTarget ?? 1, (current.stageProgress ?? 0) + debugGain),
                elapsedWeeks: (current.elapsedWeeks ?? 0) + (isNewWeek ? 1 : 0),
              };
              if (bugs <= 0.05) {
                window.setTimeout(() => finishProject({ ...next, bugs: 0 }), 80);
                return { ...next, bugs: 0 };
              }
              return next;
            }

            if (!current.leadName || !current.leadSkill) return current;
            const leadSkill = current.leadSkill;
            const gain = (totalPower / 42 + leadSkill / 6) * directionModifier * energyModifier * (0.82 + Math.random() * .36);
            const qualityModifier = current.direction === "重视品质" ? 1.28 : current.direction === "赶工" ? .78 : 1;
            const qualityGain = (leadSkill / 24 + totalPower / 360) * qualityModifier * (0.8 + Math.random() * .35);
            const next = {
              ...current,
              progress: current.progress + gain,
              stageProgress: (current.stageProgress ?? 0) + gain,
              elapsedWeeks: (current.elapsedWeeks ?? 0) + (isNewWeek ? 1 : 0),
              fun: current.fun + (stage === "planning" ? qualityGain * .75 : stage === "coding" ? qualityGain * .45 : 0),
              creativity: current.creativity + (stage === "planning" ? qualityGain : stage === "graphics" ? qualityGain * .22 : 0),
              graphics: current.graphics + (stage === "graphics" ? qualityGain * 1.15 : 0),
              sound: current.sound + (stage === "sound" ? qualityGain * 1.2 : 0),
              bugs: current.bugs + (stage === "coding"
                ? (current.direction === "赶工" ? Math.random() * 1.8 : Math.random() * 1.25)
                : Math.random() * .18),
            };
            if ((next.stageProgress ?? 0) >= (next.stageTarget ?? 1)) {
              const stageIndex = STAGE_ORDER.indexOf(stage);
              const nextStage = STAGE_ORDER[stageIndex + 1] ?? "debug";
              if (nextStage === "debug") {
                const debugTarget = Math.max(1, next.bugs);
                window.setTimeout(() => announce("制作完成，进入最终除错！"), 0);
                return {
                  ...next,
                  stage: "debug",
                  stageProgress: 0,
                  stageTarget: debugTarget,
                  debugTarget,
                  leadStaffId: undefined,
                  leadName: "全体员工",
                  leadSkill: totalPower,
                };
              }
              window.setTimeout(() => {
                setPaused(true);
                setModal("stage");
              }, 80);
              return {
                ...next,
                stage: nextStage,
                stageProgress: 0,
                stageTarget: getStageTarget(nextStage, next.direction),
                leadStaffId: undefined,
                leadName: undefined,
                leadSkill: undefined,
              };
            }
            return next;
          }

          const gain = (totalPower / 22) * directionModifier * energyModifier * (0.85 + Math.random() * 0.3);
          const qualityGain = (totalPower / 105) * (current.direction === "重视品质" ? 1.35 : 1);
          const next = {
            ...current,
            progress: current.progress + gain,
            fun: current.fun + qualityGain * (0.8 + Math.random()),
            creativity: current.creativity + qualityGain * (0.7 + Math.random()),
            graphics: current.graphics + qualityGain * (0.65 + Math.random()),
            sound: current.sound + qualityGain * (0.55 + Math.random()),
            bugs: current.bugs + (current.direction === "赶工" ? Math.random() * 0.8 : Math.random() * 0.35),
          };
          if (next.progress >= next.target) {
            window.setTimeout(() => finishProject(next), 80);
            return { ...next, progress: next.target };
          }
          return next;
        });
        if (tickRef.current % 3 === 0) setResearch((value) => value + 1);
      } else if (isNewWeek) {
        setStaff((members) => members.map((member) => ({ ...member, energy: clamp(member.energy + 10, 0, 100) })));
      }
    }, 1200 / speed);
    return () => window.clearInterval(interval);
  }, [paused, modal, speed, project, staff, totalPower, fans, releases]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const state: SaveState = {
        cash, fans, research, year, month, week, staff, project, releases, companyLevel,
        awards, ownConsole, consoleUsers, lastEventKey, fanSegments, reputation,
        genreExperience, themeExperience, unlockedGenres, unlockedThemes, careerManuals,
        endingShown, endingScore, inventory, merchantYear, merchantPurchases,
      };
      window.localStorage.setItem("pixel-studio-save", JSON.stringify(state));
    }, 8000);
    return () => window.clearInterval(timer);
  }, [cash, fans, research, year, month, week, staff, project, releases, companyLevel, awards, ownConsole, consoleUsers, lastEventKey, fanSegments, reputation, genreExperience, themeExperience, unlockedGenres, unlockedThemes, careerManuals, endingShown, endingScore, inventory, merchantYear, merchantPurchases]);

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
    if (cash < platform.cost) return announce("资金不足，先接一份外包吧");
    const sequel = releases.find((item) => item.name === selectedSequelName && item.sequelEligible);
    const gameGenre = sequel?.genre ?? selectedGenre;
    const gameTheme = sequel?.theme ?? selectedTheme;
    const comboBoost = GREAT_COMBOS.has(`${gameGenre}|${gameTheme}`) ? 5 : 0;
    const sequelBoost = sequel ? 7 + Math.floor(sequel.score / 8) : 0;
    const masteryBoost = getKnowledgeLevel(genreExperience[gameGenre] ?? 0) + getKnowledgeLevel(themeExperience[gameTheme] ?? 0) - 2;
    setCash((value) => value - platform.cost);
    setProject({
      kind: "game",
      name: gameName.trim() || "无名游戏",
      platform: selectedPlatform,
      genre: gameGenre,
      theme: gameTheme,
      direction: selectedDirection,
      progress: 0,
      target: selectedDirection === "重视品质" ? 330 : selectedDirection === "赶工" ? 210 : 270,
      fun: 6 + comboBoost + masteryBoost + sequelBoost,
      creativity: 5 + comboBoost + masteryBoost + sequelBoost,
      graphics: 4 + Math.floor(masteryBoost / 2) + sequelBoost,
      sound: 3 + Math.floor(masteryBoost / 2) + sequelBoost,
      bugs: 0,
      hype: 2,
      marketUsers: platform.users,
      stage: "planning",
      stageProgress: 0,
      stageTarget: getStageTarget("planning", selectedDirection),
      elapsedWeeks: 0,
      sequelOf: sequel?.name,
      itemUses: 0,
    });
    setSelectedSequelName("");
    setModal("stage");
    setPaused(true);
    announce("企划通过，请选择负责人");
  };

  const assignStageLead = (member: Staff) => {
    if (!project || project.kind !== "game" || project.stage === "debug") return;
    const stageInfo = STAGE_INFO[project.stage ?? "planning"];
    const skill = member[stageInfo.skill];
    setProject((current) => current ? {
      ...current,
      leadStaffId: member.id,
      leadName: member.name,
      leadSkill: skill,
    } : current);
    closeModal();
    announce(`${member.name} 负责${stageInfo.label}`);
  };

  const hireExternalLead = () => {
    if (!project || project.kind !== "game" || project.stage === "debug") return;
    const stage = project.stage ?? "planning";
    const stageInfo = STAGE_INFO[stage];
    const bestInternal = Math.max(...staff.map((member) => member[stageInfo.skill]));
    const cost = 900 + STAGE_ORDER.indexOf(stage) * 350;
    if (cash < cost) return announce("资金不足，无法邀请外部专家");
    setCash((value) => value - cost);
    setProject((current) => current ? {
      ...current,
      leadStaffId: undefined,
      leadName: "外聘名人",
      leadSkill: bestInternal + 14,
    } : current);
    closeModal();
    announce(`外部专家加入${stageInfo.label}`);
  };

  const forceRelease = () => {
    if (!project || project.kind !== "game" || project.stage !== "debug") return;
    finishProject(project);
  };

  const startConsoleProject = () => {
    if (project) return announce("当前项目完成后才能研发主机");
    if (companyLevel < 2 || releases.length < 2) return announce("扩建办公室并发售 2 款游戏后解锁");
    if (!hasHardwareEngineer) return announce("团队需要 1 名硬件工程师");
    const cpu = CONSOLE_CPUS.find((item) => item.name === consoleCpu) ?? CONSOLE_CPUS[0];
    const media = CONSOLE_MEDIA.find((item) => item.name === consoleMedia) ?? CONSOLE_MEDIA[0];
    const body = CONSOLE_BODIES.find((item) => item.name === consoleBody) ?? CONSOLE_BODIES[0];
    const cost = 6000 + cpu.cost + media.cost + body.cost;
    const performance = Number(((cpu.power + media.power + body.power) / 3).toFixed(2));
    if (cash < cost) return announce(`研发这套主机需要 ${formatCash(cost)}`);
    setCash((value) => value - cost);
    setProject({
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
    });
    closeModal();
    announce("硬件研发室正式开工！");
  };

  const startContract = (contract: (typeof contracts)[number]) => {
    if (project) return announce("手头已有项目");
    setProject({
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
    });
    closeModal();
    announce("收到委托，开工！");
  };

  const levelUp = (id: number) => {
    const member = staff.find((item) => item.id === id);
    if (!member) return;
    if (member.level >= 5) return announce("该职业已达到 Lv.5，可以使用转职手册");
    const cost = 5 + member.level * 4;
    if (research < cost) return announce(`升级需要 ${cost} 点研究`);
    const roleBoost: Record<string, Partial<Pick<Staff, "code" | "scenario" | "art" | "sound">>> = {
      "程序员": { code: 5, scenario: 1 },
      "编剧": { scenario: 5, art: 1 },
      "美术": { art: 5, scenario: 1 },
      "音效师": { sound: 5, art: 1 },
      "总监": { code: 3, scenario: 3, art: 2 },
      "制作人": { scenario: 3, art: 2, sound: 2 },
      "硬件工程师": { code: 5, art: 2, sound: 2 },
      "黑客": { code: 5, scenario: 4, art: 4, sound: 4 },
    };
    const boosts = roleBoost[member.role] ?? { code: 2, scenario: 2, art: 2, sound: 2 };
    const nextLevel = member.level + 1;
    setResearch((value) => value - cost);
    setStaff((members) => members.map((item) => item.id === id ? {
      ...item,
      level: nextLevel,
      code: item.code + (boosts.code ?? 0),
      scenario: item.scenario + (boosts.scenario ?? 0),
      art: item.art + (boosts.art ?? 0),
      sound: item.sound + (boosts.sound ?? 0),
      masteredRoles: nextLevel === 5
        ? Array.from(new Set([...(item.masteredRoles ?? []), item.role]))
        : item.masteredRoles,
    } : item));

    const unlockByRole: Record<string, string> = {
      "程序员": "射击",
      "编剧": "校园",
      "美术": "竞速",
      "音效师": "音乐",
      "总监": "格斗",
      "制作人": "怪物",
    };
    const unlock = nextLevel >= 3 ? unlockByRole[member.role] : undefined;
    if (unlock && EXTRA_GENRES.includes(unlock) && !unlockedGenres.includes(unlock)) {
      setUnlockedGenres((items) => [...items, unlock]);
      announce(`${member.name} 升至 Lv.${nextLevel}，解锁类型“${unlock}”！`);
    } else if (unlock && EXTRA_THEMES.includes(unlock) && !unlockedThemes.includes(unlock)) {
      setUnlockedThemes((items) => [...items, unlock]);
      announce(`${member.name} 升至 Lv.${nextLevel}，解锁题材“${unlock}”！`);
    } else {
      announce(`${member.name} 升至 Lv.${nextLevel}，能力提升！`);
    }
  };

  const openTraining = (id: number) => {
    setSelectedStaffId(id);
    setModal("training");
  };

  const runTraining = (method: (typeof TRAINING_METHODS)[number]) => {
    const member = staff.find((item) => item.id === selectedStaffId);
    if (!member) return;
    if (cash < method.cost) return announce("培训资金不足");
    if (member.energy < method.energy) return announce("体力不足，先让员工休息");
    const used = member.training?.[method.id] ?? 0;
    const diminishing = Math.max(.2, 1 - used * .18);
    const superTraining = Math.random() < .12;
    const multiplier = diminishing * (superTraining ? 3 : 1);
    setCash((value) => value - method.cost);
    setStaff((members) => members.map((item) => item.id === member.id ? {
      ...item,
      code: item.code + Math.max(0, Math.round((method.gains.code ?? 0) * multiplier)),
      scenario: item.scenario + Math.max(0, Math.round((method.gains.scenario ?? 0) * multiplier)),
      art: item.art + Math.max(0, Math.round((method.gains.art ?? 0) * multiplier)),
      sound: item.sound + Math.max(0, Math.round((method.gains.sound ?? 0) * multiplier)),
      energy: clamp(item.energy - method.energy, 0, 100),
      training: { ...(item.training ?? {}), [method.id]: used + 1 },
    } : item));
    if (method.unlock.kind === "genre" && !unlockedGenres.includes(method.unlock.name)) {
      setUnlockedGenres((items) => [...items, method.unlock.name]);
      announce(`培训成功，发现新类型“${method.unlock.name}”！`);
    } else if (method.unlock.kind === "theme" && !unlockedThemes.includes(method.unlock.name)) {
      setUnlockedThemes((items) => [...items, method.unlock.name]);
      announce(`培训成功，发现新题材“${method.unlock.name}”！`);
    } else {
      announce(superTraining ? "超级培训成功！能力大幅提升" : used >= 3 ? "已经很熟练，本次提升有限" : "培训成功，能力提升！");
    }
  };

  const buyCareerManual = () => {
    if (year < 2) return announce("旅行商人会在第 2 年带来转职手册");
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
    if (year < 2) return announce("旅行商人会在第 2 年到访");
    const boughtThisYear = merchantYear === year ? merchantPurchases : 0;
    if (boughtThisYear >= 3) return announce("商人今年的 3 件商品已经售罄");
    if (cash < item.cost) return announce("资金不足");
    setCash((value) => value - item.cost);
    setInventory((items) => ({ ...items, [item.key]: items[item.key] + 1 }));
    setMerchantYear(year);
    setMerchantPurchases(boughtThisYear + 1);
    announce(`购入“${item.name}”`);
  };

  const useItem = (key: keyof Inventory) => {
    if (inventory[key] < 1) return announce("库存不足");
    if (key === "energyDrink") {
      setInventory((items) => ({ ...items, [key]: items[key] - 1 }));
      setStaff((members) => members.map((member) => ({ ...member, energy: clamp(member.energy + 42, 0, 100) })));
      announce("全员恢复体力！");
      return;
    }
    if (!project || project.kind !== "game") return announce("开发游戏时才能使用这个道具");
    const researchCost = 4 + (project.itemUses ?? 0) * 2;
    if (research < researchCost) return announce(`使用需要 ${researchCost} 点研究`);
    const multiplier = 1 / (1 + (project.itemUses ?? 0) * .7);
    setResearch((value) => value - researchCost);
    setInventory((items) => ({ ...items, [key]: items[key] - 1 }));
    setProject((current) => {
      if (!current || current.kind !== "game") return current;
      const amount = Math.max(3, Math.round(10 * multiplier));
      return {
        ...current,
        fun: current.fun + (key === "funBoost" ? amount : 0),
        creativity: current.creativity + (key === "creativityBoost" ? amount : 0),
        graphics: current.graphics + (key === "graphicsBoost" ? amount : 0),
        sound: current.sound + (key === "soundBoost" ? amount : 0),
        bugs: key === "bugSpray" ? Math.max(0, current.bugs - Math.max(6, amount)) : current.bugs,
        itemUses: (current.itemUses ?? 0) + 1,
      };
    });
    announce((project.itemUses ?? 0) > 0 ? "道具生效，但连续使用效果有所降低" : "道具效果显著！");
  };

  const getCareerOptions = (member: Staff) => {
    const mastered = new Set(member.masteredRoles ?? []);
    const options = ["程序员", "编剧", "美术", "音效师"];
    if (mastered.size >= 2) options.push("总监", "制作人");
    if (mastered.has("总监") && mastered.has("制作人")) options.push("硬件工程师");
    if (mastered.size >= 7) options.push("黑客");
    return options.filter((role) => role !== member.role);
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
    if (!member || careerManuals < 1) return;
    setCareerManuals((value) => value - 1);
    setStaff((members) => members.map((item) => item.id === member.id ? {
      ...item,
      role,
      level: 1,
      code: item.code + (role === "程序员" || role === "硬件工程师" || role === "黑客" ? 4 : 1),
      scenario: item.scenario + (role === "编剧" || role === "总监" || role === "制作人" || role === "黑客" ? 4 : 1),
      art: item.art + (role === "美术" || role === "总监" || role === "黑客" ? 4 : 1),
      sound: item.sound + (role === "音效师" || role === "制作人" || role === "黑客" ? 4 : 1),
    } : item));
    setModal("staff");
    announce(`${member.name} 转职为 ${role}！`);
  };

  const hireWithMethod = (method: (typeof HIRING_METHODS)[number]) => {
    if (companyLevel === 1 && staff.length >= 6) return announce("当前办公室最多容纳 6 人");
    if (staff.length >= 8) return announce("办公室已经满员");
    if (cash < method.cost) return announce("资金不足");
    const id = Math.max(0, ...staff.map((member) => member.id)) + 1;
    const candidates = [
      { name: "岚子", role: "程序员", code: 19, scenario: 9, art: 8, sound: 5, color: "#9b5de5" },
      { name: "大熊", role: "制作人", code: 13, scenario: 18, art: 15, sound: 12, color: "#00b4d8" },
      { name: "绘里", role: "美术", code: 7, scenario: 13, art: 22, sound: 8, color: "#e76f8a" },
      { name: "电波君", role: "音效师", code: 10, scenario: 9, art: 11, sound: 23, color: "#6d9eeb" },
      { name: "天才丸", role: "总监", code: 19, scenario: 22, art: 18, sound: 15, color: "#f4a261" },
    ];
    const candidatePoolSize = Math.min(candidates.length, 2 + method.quality);
    const candidate = candidates[(staff.length + year) % candidatePoolSize];
    const bonus = method.quality * 3 + Math.floor(Math.random() * (method.quality + 2));
    setCash((value) => value - method.cost);
    setStaff((members) => [...members, {
      id,
      ...candidate,
      code: candidate.code + bonus,
      scenario: candidate.scenario + bonus,
      art: candidate.art + bonus,
      sound: candidate.sound + bonus,
      level: 1,
      energy: 100,
      training: {},
      masteredRoles: [],
    }]);
    setModal("staff");
    announce(`${candidate.name} 加入了工作室`);
  };

  const advertise = (cost: number, hype: number, name: string, segment: keyof FanSegments) => {
    if (!project || project.kind !== "game") return announce("正在开发游戏时才能宣传");
    if (cash < cost) return announce("资金不足");
    setCash((value) => value - cost);
    setProject((current) => current ? { ...current, hype: current.hype + hype } : current);
    setFans((value) => value + Math.round(hype * 2.5));
    setFanSegments((segments) => ({ ...segments, [segment]: segments[segment] + Math.max(1, Math.round(hype / 2)) }));
    announce(`${name} 引发了话题！`);
  };

  const attendExpo = (cost: number, gainedFans: number, gainedHype: number, label: string) => {
    if (cash < cost) return announce("资金不足，无法布置这个展位");
    setCash((value) => value - cost);
    setFans((value) => value + gainedFans);
    if (project?.kind === "game") {
      setProject((current) => current ? { ...current, hype: current.hype + gainedHype } : current);
    }
    closeModal();
    announce(`${label}大获成功！粉丝 +${gainedFans}`);
  };

  const expandOffice = () => {
    if (cash < 7000) return announce("扩建需要 ¥7,000千");
    setCash((value) => value - 7000);
    setCompanyLevel(2);
    closeModal();
    announce("新办公室启用！可招聘 8 名员工");
  };

  return (
    <main className="game-page">
      <div className="game-shell">
        <header className="top-hud">
          <div className="studio-brand">
            <span className="brand-mark">P</span>
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

        <section className="office" aria-label="像素工作室办公室">
          <WindowView />
          <div className="wall-logo">PIXEL<br /><b>STUDIO</b></div>
          <div className="wall-clock"><i /></div>
          <div className="plant p-left"><i /><b /></div>
          <div className="plant p-right"><i /><b /></div>
          <div className="cabinet"><i /><i /><i /></div>
          <div className="water-cooler"><i /><b /></div>
          <div className="office-floor" />
          <div className={`workers count-${staff.length}`}>
            {staff.map((member) => <PixelPerson key={member.id} staff={member} working={Boolean(project)} />)}
          </div>
          {!project && (
            <div className="secretary-tip">
              <i className="secretary-face" />
              <span>社长，接下来要做什么？</span>
            </div>
          )}
          <div className="floating-stats">
            <span>♥ 粉丝 {fans.toLocaleString()}</span>
            <span>◆ 研究 {research}</span>
          </div>
        </section>

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
                    <span><i className="q-fun">F</i>趣味 <b>{Math.round(project.fun)}</b></span>
                    <span><i className="q-idea">I</i>创意 <b>{Math.round(project.creativity)}</b></span>
                    <span><i className="q-art">G</i>画面 <b>{Math.round(project.graphics)}</b></span>
                    <span><i className="q-snd">S</i>音乐 <b>{Math.round(project.sound)}</b></span>
                    <span><i className="q-bug">!</i>漏洞 <b>{Math.round(project.bugs)}</b></span>
                  </div>
                  {project.stage === "debug" && (
                    <div className="debug-strip">
                      <span>全员除错中 · 剩余 {Math.ceil(project.bugs)} 个漏洞</span>
                      <button onClick={forceRelease}>带漏洞发售</button>
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
                <div className="contract-progress">完成委托可获得 <b>{formatCash(project.reward ?? 0)}</b> 与研究点</div>
              )}
            </>
          ) : (
            <div className="idle-project">
              <div className="idle-icon">!</div>
              <div><strong>当前没有项目</strong><small>点击“开发”制作你的下一款游戏</small></div>
              <button onClick={() => openMenu("develop")}>开始企划</button>
            </div>
          )}
        </section>

        <nav className="bottom-menu" aria-label="经营菜单">
          <button onClick={() => openMenu("develop")}><i>✦</i><span>开发</span></button>
          <button onClick={() => openMenu("contracts")}><i>▤</i><span>外包</span></button>
          <button onClick={() => openMenu("staff")}><i>♟</i><span>员工</span></button>
          <button onClick={() => openMenu("marketing")}><i>◆</i><span>宣传</span></button>
          <button onClick={() => openMenu("records")}><i>▦</i><span>资料</span></button>
        </nav>

        <div className="utility-row">
          <button onClick={saveGame}>保存</button>
          <button onClick={() => setPaused((value) => !value)}>{paused ? "继续" : "暂停"}</button>
          <button onClick={() => setSpeed((value) => value === 3 ? 1 : value + 1)}>速度 ×{speed}</button>
        </div>

        {toast && <div className="toast" role="status">{toast}</div>}
        {paused && !modal && <div className="pause-badge">游戏暂停</div>}

        {modal === "develop" && (
          <ModalShell title="新作企划会议" onClose={closeModal}>
            {project ? (
              <div className="notice-card">当前正在制作《{project.name}》，请先完成手头项目。</div>
            ) : (
              <div className="develop-form">
                <div className={`hardware-card ${ownConsole ? "is-complete" : ""}`}>
                  <span className="hardware-icon"><i /><b /></span>
                  <span>
                    <b>{ownConsole ? "自研主机：像素盒子" : "自研主机计划"}</b>
                    <small>
                      {ownConsole
                        ? `当前用户 ${formatUsers(consoleUsers)} · 可直接选择自家平台开发`
                        : companyLevel >= 2 && releases.length >= 2
                          ? hasHardwareEngineer
                            ? "配置芯片、媒体与机型，打造自家游戏平台"
                            : "需要培养 1 名硬件工程师"
                          : "扩建办公室并发售 2 款游戏后解锁"}
                    </small>
                  </span>
                  {!ownConsole && <button onClick={() => setModal("console")} disabled={companyLevel < 2 || releases.length < 2 || !hasHardwareEngineer}>配置</button>}
                </div>
                {companyLevel >= 2 && sequelCandidates.length > 0 && (
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
                      <i style={{ "--platform": item.tone } as React.CSSProperties} />
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
                <button className="primary-button" onClick={startGame}>通过企划 · 开始制作</button>
              </div>
            )}
          </ModalShell>
        )}

        {modal === "console" && (
          <ModalShell title="自研主机实验室" onClose={() => setModal("develop")}>
            <p className="modal-intro">选择 CPU、媒体与机型。规格越高，研发周期与成本越大，首发用户也越多。</p>
            <div className="console-builder">
              <label>处理器<select value={consoleCpu} onChange={(event) => setConsoleCpu(event.target.value)}>{CONSOLE_CPUS.map((item) => <option key={item.name} value={item.name}>{item.name} · +{formatCash(item.cost)}</option>)}</select></label>
              <label>存储媒体<select value={consoleMedia} onChange={(event) => setConsoleMedia(event.target.value)}>{CONSOLE_MEDIA.map((item) => <option key={item.name} value={item.name}>{item.name} · +{formatCash(item.cost)}</option>)}</select></label>
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
                    <span className="mini-avatar" style={{ "--shirt": member.color } as React.CSSProperties}><i /></span>
                    <span><b>{member.name}</b><small>{member.role} · 体力 {Math.round(member.energy)}%</small></span>
                    <strong>{skillKey === "code" ? "程序" : skillKey === "scenario" ? "剧本" : skillKey === "art" ? "画面" : "音乐"} {skill}</strong>
                  </button>
                );
              })}
              <button className="external-lead" onClick={hireExternalLead}>
                <span className="external-star">★</span>
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
              {contracts.map((contract) => (
                <button key={contract.name} onClick={() => startContract(contract)} disabled={Boolean(project)}>
                  <span className="list-icon contract-icon">W</span>
                  <span><b>{contract.name}</b><small>{contract.note} · 难度 {Math.round(contract.target / 60)}</small></span>
                  <strong>{formatCash(contract.reward)}</strong>
                </button>
              ))}
            </div>
          </ModalShell>
        )}

        {modal === "staff" && (
          <ModalShell title="员工管理" onClose={closeModal}>
            <div className="staff-summary">
              <span>员工 {staff.length}/{companyLevel === 1 ? 6 : 8} 人 · 转职手册 {careerManuals}</span>
              <div><button onClick={() => setModal("shop")}>旅行商人</button><button onClick={() => setModal("hire")}>招聘人才</button></div>
            </div>
            <div className="staff-list">
              {staff.map((member) => (
                <article key={member.id}>
                  <div className="mini-avatar" style={{ "--shirt": member.color } as React.CSSProperties}><i /></div>
                  <div className="staff-info"><b>{member.name}<em>Lv.{member.level}</em></b><small>{member.role} · 体力 {Math.round(member.energy)}%</small><div><span>程 {member.code}</span><span>剧 {member.scenario}</span><span>画 {member.art}</span><span>音 {member.sound}</span></div></div>
                  <div className="staff-actions">
                    <button onClick={() => levelUp(member.id)}>升级<small>◆{5 + member.level * 4}</small></button>
                    <button onClick={() => openTraining(member.id)}>培训<small>现金</small></button>
                    <button onClick={() => openCareer(member.id)}>转职<small>手册</small></button>
                  </div>
                </article>
              ))}
            </div>
            {companyLevel === 1 && <button className="expand-button" onClick={expandOffice}>扩建办公室 · {formatCash(7000)}</button>}
          </ModalShell>
        )}

        {modal === "training" && selectedStaff && (
          <ModalShell title={`培训 · ${selectedStaff.name}`} onClose={() => setModal("staff")}>
            <div className="training-hero">
              <span className="mini-avatar" style={{ "--shirt": selectedStaff.color } as React.CSSProperties}><i /></span>
              <span><b>{selectedStaff.role} Lv.{selectedStaff.level}</b><small>体力 {Math.round(selectedStaff.energy)}% · 重复训练效果会逐渐降低</small></span>
            </div>
            <div className="training-list">
              {TRAINING_METHODS.map((method) => {
                const used = selectedStaff.training?.[method.id] ?? 0;
                return (
                  <button key={method.id} onClick={() => runTraining(method)}>
                    <span className="training-icon">{method.id === "reading" ? "B" : method.id === "movie" ? "F" : method.id === "marathon" ? "R" : "P"}</span>
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
                <span className="mini-avatar" style={{ "--shirt": selectedStaff.color } as React.CSSProperties}><i /></span>
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
              <span className="merchant-face">P</span>
              <span><b>{year < 2 ? "第 2 年再来吧！" : "每年限购 3 件商品"}</b><small>本年已购 {merchantYear === year ? merchantPurchases : 0}/3 · 道具可在宣传菜单的道具箱使用</small></span>
            </div>
            <div className="shop-grid">
              <button onClick={buyCareerManual} disabled={year < 2 || (merchantYear === year && merchantPurchases >= 3)}>
                <span className="shop-icon manual">C</span><span><b>转职手册</b><small>让 Lv.5 员工转换职业</small></span><strong>{formatCash(1400)}</strong>
              </button>
              {SHOP_ITEMS.map((item) => (
                <button key={item.key} onClick={() => buyShopItem(item)} disabled={year < 2 || (merchantYear === year && merchantPurchases >= 3)}>
                  <span className="shop-icon">{item.icon}</span><span><b>{item.name}</b><small>{item.note}</small></span><strong>{formatCash(item.cost)}</strong>
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
                <button key={item.key} onClick={() => useItem(item.key)} disabled={inventory[item.key] < 1}>
                  <span className="shop-icon">{item.icon}</span><span><b>{item.name}</b><small>{item.note}</small></span><strong>持有 {inventory[item.key]}</strong>
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
                  <span className="hire-rank">{"★".repeat(Math.max(1, method.quality + 1))}</span>
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
              <p className="modal-intro">{project?.kind === "game" ? `正在为《${project.name}》造势 · 热度 ${project.hype}` : "开发新作时可进行宣传。"}</p>
              <button onClick={() => setModal("items")}>道具箱 · {Object.values(inventory).reduce((sum, value) => sum + value, 0)}</button>
            </div>
            <div className="list-cards marketing-list">
              {[
                { name: "街头传单", note: "吸引年轻玩家", cost: 220, hype: 4, icon: "P", segment: "teens" as const },
                { name: "游戏杂志广告", note: "覆盖成人核心玩家", cost: 850, hype: 12, icon: "M", segment: "adults" as const },
                { name: "电视黄金广告", note: "打入家庭与儿童市场", cost: 2600, hype: 32, icon: "TV", segment: "kids" as const },
              ].map((item) => (
                <button key={item.name} onClick={() => advertise(item.cost, item.hype, item.name, item.segment)}>
                  <span className="list-icon ad-icon">{item.icon}</span>
                  <span><b>{item.name}</b><small>{item.note} · 热度 +{item.hype}</small></span>
                  <strong>{formatCash(item.cost)}</strong>
                </button>
              ))}
            </div>
          </ModalShell>
        )}

        {modal === "records" && (
          <ModalShell title="公司资料" onClose={closeModal}>
            <div className="record-hero"><b>像素工坊</b><span>经营第 {year} 年 · 粉丝 {fans.toLocaleString()}</span></div>
            <div className="record-stats">
              <div><small>已发售</small><b>{releases.length}</b></div>
              <div><small>最高评分</small><b>{releases.length ? Math.max(...releases.map((item) => item.score)) : "—"}</b></div>
              <div><small>最高销量</small><b>{releases.length ? Math.max(...releases.map((item) => item.sales)).toLocaleString() : "—"}</b></div>
              <div><small>获奖次数</small><b>{awards}</b></div>
              <div><small>业界口碑</small><b>{reputation}</b></div>
            </div>
            <div className="console-record">
              <span className={`console-dot ${ownConsole ? "online" : ""}`} />
              <span><b>{ownConsole ? "像素盒子" : "尚未推出自研主机"}</b><small>{ownConsole ? `平台用户 ${formatUsers(consoleUsers)}` : "扩建并积累作品后可启动硬件研发"}</small></span>
            </div>
            {endingShown && <div className="ending-record"><b>20 年经营分数</b><strong>{endingScore.toLocaleString()}</strong><small>结算后仍可继续挑战更高纪录</small></div>}
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
                  <strong>{item.sales.toLocaleString()} 套<small>本周 {(item.weeklySales ?? 0).toLocaleString()}</small></strong>
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
                <div className="event-trophy"><i /><b /></div>
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
                  <button onClick={() => attendExpo(600, 220, 8, "标准展位")}><b>标准展位</b><small>¥600千 · 粉丝 +220</small></button>
                  <button onClick={() => attendExpo(2500, 850, 25, "明星展位")}><b>明星展位</b><small>¥2,500千 · 粉丝 +850</small></button>
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
                <span>销售收入 <b>{formatCash(review.income)}</b></span>
                <span>核心受众 <b>{review.audience}</b></span>
                <span>业界口碑 <b>{review.reputationChange >= 0 ? "+" : ""}{review.reputationChange}</b></span>
                <span>开发经验 <b>{review.growth}</b></span>
              </div>
              <button className="primary-button" onClick={closeModal}>太棒了！</button>
            </div>
          </ModalShell>
        )}
      </div>
    </main>
  );
}
