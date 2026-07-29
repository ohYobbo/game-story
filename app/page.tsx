"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Staff = {
  id: number;
  name: string;
  role: string;
  level: number;
  code: number;
  art: number;
  sound: number;
  energy: number;
  color: string;
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
};

type Release = {
  name: string;
  score: number;
  sales: number;
  income: number;
  weeks: number;
  releasedYear?: number;
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
};

type EventData = {
  kind: "payroll" | "expo" | "awards" | "console" | "market";
  title: string;
  headline: string;
  body: string;
  reward?: string;
};

type Modal = "develop" | "contracts" | "staff" | "marketing" | "records" | "review" | "event" | null;

const INITIAL_STAFF: Staff[] = [
  { id: 1, name: "林小码", role: "程序员", level: 1, code: 18, art: 7, sound: 4, energy: 100, color: "#ef6351" },
  { id: 2, name: "阿麦", role: "策划", level: 1, code: 8, art: 15, sound: 7, energy: 100, color: "#43aa8b" },
  { id: 3, name: "桃子", role: "美术", level: 1, code: 5, art: 21, sound: 6, energy: 100, color: "#577590" },
  { id: 4, name: "小音", role: "音乐人", level: 1, code: 4, art: 8, sound: 20, energy: 100, color: "#f8961e" },
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
const DIRECTIONS = [
  { name: "均衡", note: "稳妥推进" },
  { name: "重视品质", note: "慢工出细活" },
  { name: "赶工", note: "快速但易出错" },
];
const GREAT_COMBOS = new Set(["角色扮演|幻想", "动作|忍者", "冒险|侦探", "模拟|小镇", "动作|机器人"]);

const contracts = [
  { name: "商店网页小游戏", target: 115, reward: 850, note: "限期 9 周" },
  { name: "动画片特效", target: 185, reward: 1450, note: "限期 12 周" },
  { name: "掌机移植外包", target: 260, reward: 2350, note: "限期 14 周" },
];

const formatCash = (value: number) => `¥${Math.max(0, Math.round(value)).toLocaleString()}千`;
const formatUsers = (value: number) => value >= 10_000 ? `${Math.round(value / 10_000)}万` : value.toLocaleString();
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

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
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("欢迎回来，社长！");
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0].name);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [selectedDirection, setSelectedDirection] = useState(DIRECTIONS[0].name);
  const [gameName, setGameName] = useState("像素勇者");
  const [review, setReview] = useState<{ name: string; scores: number[]; sales: number; income: number } | null>(null);
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
    setStaff(saved.staff);
    setProject(saved.project);
    setReleases(saved.releases);
    setCompanyLevel(saved.companyLevel);
    setAwards(saved.awards ?? 0);
    setOwnConsole(saved.ownConsole ?? false);
    setConsoleUsers(saved.consoleUsers ?? 0);
    setLastEventKey(saved.lastEventKey ?? "");
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
  const projectPercent = project ? Math.min(100, Math.round((project.progress / project.target) * 100)) : 0;

  useEffect(() => {
    if (!availablePlatforms.some((item) => item.name === selectedPlatform)) {
      setSelectedPlatform(availablePlatforms[0]?.name ?? "个人电脑");
    }
  }, [availablePlatforms, selectedPlatform]);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const saveGame = () => {
    const state: SaveState = {
      cash, fans, research, year, month, week, staff, project, releases, companyLevel,
      awards, ownConsole, consoleUsers, lastEventKey,
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
      const initialUsers = Math.round(260_000 + fans * 110 + totalPower * 850);
      setOwnConsole(true);
      setConsoleUsers(initialUsers);
      setFans((value) => value + 600);
      setResearch((value) => value + 35);
      setProject(null);
      setEventData({
        kind: "console",
        title: "自研主机发布会",
        headline: "像素盒子 正式发售！",
        body: "从芯片到手柄都由团队亲手打造。今后开发新作时，可以选择自家平台并免除高额授权费。",
        reward: `首批用户 ${formatUsers(initialUsers)} 人 · 粉丝 +600`,
      });
      setModal("event");
      return;
    }

    const combo = GREAT_COMBOS.has(`${finished.genre}|${finished.theme}`) ? 2 : 0;
    const base = (finished.fun + finished.creativity + finished.graphics + finished.sound) / 48;
    const scores = [0.2, 0.7, 1.1, 1.6].map((bonus) => clamp(Math.round(base + combo + bonus + Math.random() * 1.4), 2, 10));
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const marketMultiplier = clamp((finished.marketUsers ?? 280_000) / 520_000, 0.7, 3.4);
    const sales = Math.round((totalScore ** 2 * 38 + finished.hype * 120 + fans * 4) * marketMultiplier * (0.85 + Math.random() * 0.3));
    const income = Math.round(sales * 0.018);
    setCash((value) => value + income);
    setFans((value) => value + Math.round(sales / 160));
    setResearch((value) => value + 7 + Math.round(totalScore / 8));
    setReleases((items) => [{ name: finished.name, score: totalScore, sales, income, weeks: 0, releasedYear: year }, ...items].slice(0, 12));
    if (finished.platform === "像素盒子") {
      setConsoleUsers((value) => value + Math.round(sales * 0.18));
    }
    setProject(null);
    setReview({ name: finished.name, scores, sales, income });
    setModal("review");
  };

  useEffect(() => {
    if (modal) return;
    const eventKey = `${year}-${month}-${week}`;
    if (lastEventKey === eventKey) return;

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
  }, [year, month, week, lastEventKey, releases, staff, companyLevel, modal]);

  useEffect(() => {
    if (paused || modal) return;
    const interval = window.setInterval(() => {
      tickRef.current += 1;
      if (tickRef.current % 4 === 0) advanceCalendar();
      setStaff((members) =>
        members.map((member) => ({
          ...member,
          energy: clamp(member.energy + (project ? -1.6 : 4), 25, 100),
        })),
      );
      setReleases((items) =>
        items.map((item) => ({ ...item, weeks: item.weeks + 1 })),
      );

      if (project) {
        const directionModifier = project.direction === "赶工" ? 1.35 : project.direction === "重视品质" ? 0.82 : 1;
        const energyModifier = staff.reduce((sum, member) => sum + member.energy, 0) / (staff.length * 100);
        const gain = (totalPower / 22) * directionModifier * energyModifier * (0.85 + Math.random() * 0.3);
        const qualityGain = (totalPower / 105) * (project.direction === "重视品质" ? 1.35 : 1);
        setProject((current) => {
          if (!current) return null;
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
      } else if (tickRef.current % 4 === 0) {
        setStaff((members) => members.map((member) => ({ ...member, energy: clamp(member.energy + 10, 0, 100) })));
      }
    }, 1200 / speed);
    return () => window.clearInterval(interval);
  }, [paused, modal, speed, project, staff, totalPower, fans]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const state: SaveState = {
        cash, fans, research, year, month, week, staff, project, releases, companyLevel,
        awards, ownConsole, consoleUsers, lastEventKey,
      };
      window.localStorage.setItem("pixel-studio-save", JSON.stringify(state));
    }, 8000);
    return () => window.clearInterval(timer);
  }, [cash, fans, research, year, month, week, staff, project, releases, companyLevel, awards, ownConsole, consoleUsers, lastEventKey]);

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
    const comboBoost = GREAT_COMBOS.has(`${selectedGenre}|${selectedTheme}`) ? 5 : 0;
    setCash((value) => value - platform.cost);
    setProject({
      kind: "game",
      name: gameName.trim() || "无名游戏",
      platform: selectedPlatform,
      genre: selectedGenre,
      theme: selectedTheme,
      direction: selectedDirection,
      progress: 0,
      target: selectedDirection === "重视品质" ? 330 : selectedDirection === "赶工" ? 210 : 270,
      fun: 6 + comboBoost,
      creativity: 5 + comboBoost,
      graphics: 4,
      sound: 3,
      bugs: 0,
      hype: 2,
      marketUsers: platform.users,
    });
    closeModal();
    announce("企划通过！全员开始制作");
  };

  const startConsoleProject = () => {
    if (project) return announce("当前项目完成后才能研发主机");
    if (companyLevel < 2 || releases.length < 2) return announce("扩建办公室并发售 2 款游戏后解锁");
    if (cash < 12_000) return announce("研发主机需要 ¥12,000千");
    setCash((value) => value - 12_000);
    setProject({
      kind: "console",
      name: "像素盒子",
      platform: "硬件研发",
      genre: "自研主机",
      theme: "次世代",
      direction: "重视品质",
      progress: 0,
      target: 860,
      fun: 0,
      creativity: 0,
      graphics: 0,
      sound: 0,
      bugs: 0,
      hype: 25,
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

  const train = (id: number) => {
    if (research < 5) return announce("研究点不足");
    setResearch((value) => value - 5);
    setStaff((members) =>
      members.map((member) =>
        member.id === id
          ? { ...member, level: member.level + 1, code: member.code + 3, art: member.art + 3, sound: member.sound + 3 }
          : member,
      ),
    );
    announce("培训成功，能力提升！");
  };

  const promote = (id: number) => {
    const member = staff.find((item) => item.id === id);
    if (!member) return;
    if (member.level < 3) return announce("员工达到 Lv.3 后才能转职");
    if (research < 12) return announce("转职需要 12 点研究");
    const careerPath: Record<string, { role: string; code: number; art: number; sound: number }> = {
      "程序员": { role: "高级程序员", code: 8, art: 2, sound: 1 },
      "高级程序员": { role: "技术总监", code: 12, art: 4, sound: 3 },
      "策划": { role: "编剧", code: 2, art: 8, sound: 2 },
      "编剧": { role: "制作人", code: 5, art: 10, sound: 4 },
      "美术": { role: "原画师", code: 1, art: 9, sound: 2 },
      "原画师": { role: "美术总监", code: 3, art: 13, sound: 3 },
      "音乐人": { role: "作曲家", code: 1, art: 2, sound: 9 },
      "作曲家": { role: "音乐总监", code: 3, art: 4, sound: 13 },
      "制作人": { role: "总监", code: 7, art: 7, sound: 7 },
    };
    const next = careerPath[member.role];
    if (!next) return announce("该员工已经达到职业顶点");
    setResearch((value) => value - 12);
    setStaff((members) => members.map((item) => item.id === id ? {
      ...item,
      role: next.role,
      level: 1,
      code: item.code + next.code,
      art: item.art + next.art,
      sound: item.sound + next.sound,
    } : item));
    announce(`${member.name} 转职为 ${next.role}！`);
  };

  const hire = () => {
    const cost = 1300 + staff.length * 250;
    if (companyLevel === 1 && staff.length >= 6) return announce("当前办公室最多容纳 6 人");
    if (cash < cost) return announce("资金不足");
    const id = Math.max(0, ...staff.map((member) => member.id)) + 1;
    const candidates = [
      { name: "岚子", role: "程序员", code: 24, art: 8, sound: 5, color: "#9b5de5" },
      { name: "大熊", role: "制作人", code: 14, art: 16, sound: 13, color: "#00b4d8" },
    ];
    const candidate = candidates[staff.length % candidates.length];
    setCash((value) => value - cost);
    setStaff((members) => [...members, { id, ...candidate, level: 1, energy: 100 }]);
    announce(`${candidate.name} 加入了工作室`);
  };

  const advertise = (cost: number, hype: number, name: string) => {
    if (!project || project.kind !== "game") return announce("正在开发游戏时才能宣传");
    if (cash < cost) return announce("资金不足");
    setCash((value) => value - cost);
    setProject((current) => current ? { ...current, hype: current.hype + hype } : current);
    setFans((value) => value + Math.round(hype * 2.5));
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
                      ? `${project.platform} / ${project.genre} × ${project.theme}`
                      : project.kind === "console" ? "秘密硬件研发计划" : "承接外包项目"}
                  </small>
                  <strong>{project.name}</strong>
                </div>
                <span className="percent">{projectPercent}%</span>
              </div>
              <div className="progress-track"><i style={{ width: `${projectPercent}%` }} /></div>
              {project.kind === "game" ? (
                <div className="quality-grid">
                  <span><i className="q-fun">F</i>趣味 <b>{Math.round(project.fun)}</b></span>
                  <span><i className="q-idea">I</i>创意 <b>{Math.round(project.creativity)}</b></span>
                  <span><i className="q-art">G</i>画面 <b>{Math.round(project.graphics)}</b></span>
                  <span><i className="q-snd">S</i>音乐 <b>{Math.round(project.sound)}</b></span>
                  <span><i className="q-bug">!</i>漏洞 <b>{Math.round(project.bugs)}</b></span>
                </div>
              ) : project.kind === "console" ? (
                <div className="console-progress">
                  <span><b>CPU</b>{Math.round(projectPercent * .8)}</span>
                  <span><b>画面</b>{Math.round(projectPercent * .72)}</span>
                  <span><b>声音</b>{Math.round(projectPercent * .64)}</span>
                  <em>研发投入 {formatCash(12_000)}</em>
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
                          ? "投入 ¥12,000千，打造属于工作室的游戏平台"
                          : "扩建办公室并发售 2 款游戏后解锁"}
                    </small>
                  </span>
                  {!ownConsole && <button onClick={startConsoleProject} disabled={companyLevel < 2 || releases.length < 2}>研发</button>}
                </div>
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
                  <label className="field-label">游戏类型<select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}>{GENRES.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="field-label">游戏题材<select value={selectedTheme} onChange={(e) => setSelectedTheme(e.target.value)}>{THEMES.map((item) => <option key={item}>{item}</option>)}</select></label>
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
            <div className="staff-summary"><span>员工 {staff.length}/{companyLevel === 1 ? 6 : 8} 人</span><button onClick={hire}>招聘人才</button></div>
            <div className="staff-list">
              {staff.map((member) => (
                <article key={member.id}>
                  <div className="mini-avatar" style={{ "--shirt": member.color } as React.CSSProperties}><i /></div>
                  <div className="staff-info"><b>{member.name}<em>Lv.{member.level}</em></b><small>{member.role} · 体力 {Math.round(member.energy)}%</small><div><span>程 {member.code}</span><span>画 {member.art}</span><span>音 {member.sound}</span></div></div>
                  <div className="staff-actions">
                    <button onClick={() => train(member.id)}>培训<small>◆5</small></button>
                    <button onClick={() => promote(member.id)}>转职<small>◆12</small></button>
                  </div>
                </article>
              ))}
            </div>
            {companyLevel === 1 && <button className="expand-button" onClick={expandOffice}>扩建办公室 · {formatCash(7000)}</button>}
          </ModalShell>
        )}

        {modal === "marketing" && (
          <ModalShell title="宣传推广" onClose={closeModal}>
            <p className="modal-intro">{project?.kind === "game" ? `正在为《${project.name}》造势 · 热度 ${project.hype}` : "开发新作时可进行宣传。"}</p>
            <div className="list-cards marketing-list">
              {[
                { name: "街头传单", note: "小幅增加热度", cost: 220, hype: 4, icon: "P" },
                { name: "游戏杂志广告", note: "覆盖核心玩家", cost: 850, hype: 12, icon: "M" },
                { name: "电视黄金广告", note: "引发全民讨论", cost: 2600, hype: 32, icon: "TV" },
              ].map((item) => (
                <button key={item.name} onClick={() => advertise(item.cost, item.hype, item.name)}>
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
            </div>
            <div className="console-record">
              <span className={`console-dot ${ownConsole ? "online" : ""}`} />
              <span><b>{ownConsole ? "像素盒子" : "尚未推出自研主机"}</b><small>{ownConsole ? `平台用户 ${formatUsers(consoleUsers)}` : "扩建并积累作品后可启动硬件研发"}</small></span>
            </div>
            <div className="release-table">
              {releases.length ? releases.map((item, index) => (
                <div key={`${item.name}-${index}`}><span><b>{item.name}</b><small>发售 {item.weeks} 周</small></span><em>{item.score}/40</em><strong>{item.sales.toLocaleString()} 套</strong></div>
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
              <div className="sales-result"><span>首周销量 <b>{review.sales.toLocaleString()}</b> 套</span><span>销售收入 <b>{formatCash(review.income)}</b></span></div>
              <button className="primary-button" onClick={closeModal}>太棒了！</button>
            </div>
          </ModalShell>
        )}
      </div>
    </main>
  );
}
