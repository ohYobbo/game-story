import type { ProductionStage } from "../game-balance";
import type {
  DirectionKey,
  DirectionPoints,
  EventData,
  FanSegments,
  Inventory,
  Staff,
  WorkerBehavior,
} from "./types";

export const INITIAL_STAFF: Staff[] = [
  { id: 1, name: "林小码", role: "程序员", level: 1, code: 18, scenario: 8, art: 8, sound: 3, energy: 100, maxPower: 9, salary: 20, color: "#ef6351" },
  { id: 2, name: "阿麦", role: "编剧", level: 1, code: 3, scenario: 24, art: 3, sound: 6, energy: 100, maxPower: 8, salary: 20, color: "#43aa8b" },
];

export const PLATFORMS = [
  { name: "个人电脑", cost: 20, users: 280_000, debut: 1, retire: 99 },
  { name: "豆豆机", cost: 350, users: 740_000, debut: 1, retire: 5 },
  { name: "迷你掌机", cost: 700, users: 1_260_000, debut: 2, retire: 8 },
  { name: "星球盒", cost: 1200, users: 1_720_000, debut: 4, retire: 11 },
  { name: "幻彩 32", cost: 1800, users: 2_350_000, debut: 6, retire: 99 },
];

export const GENRES = ["桌游", "冒险", "益智", "知识问答", "教育"];
export const THEMES = ["海盗", "动物", "机器人", "历史", "忍者"];

export const DIRECTIONS = [
  { name: "均衡", note: "标准成本与进度", cost: 1, speed: 1, quality: 1, target: 1, research: 0 },
  { name: "赶工", note: "加速但品质下降", cost: 1.2, speed: 1.35, quality: .78, target: .82, research: 0 },
  { name: "重视品质", note: "较慢但品质提升", cost: 1.3, speed: .82, quality: 1.28, target: 1.2, research: 0 },
  { name: "研究优先", note: "获得更多研究点", cost: 1.5, speed: .92, quality: .96, target: 1.05, research: 14 },
  { name: "追加预算", note: "速度与品质兼顾", cost: 2, speed: 1.2, quality: 1.18, target: .9, research: 4 },
];

export const DIRECTION_AXES: { key: DirectionKey; label: string; note: string }[] = [
  { key: "cuteness", label: "可爱", note: "儿童・女性" },
  { key: "realism", label: "写实", note: "成人・男性" },
  { key: "approachability", label: "亲和", note: "大众玩家" },
  { key: "niche", label: "核心向", note: "青少年・话题" },
  { key: "simplicity", label: "简洁", note: "趣味・银发族" },
  { key: "innovation", label: "创新", note: "创意・男性" },
  { key: "gameWorld", label: "世界观", note: "创意・画面" },
  { key: "polish", label: "完成度", note: "全品质・少漏洞" },
];

export const DEFAULT_DIRECTION_POINTS: DirectionPoints = {
  cuteness: 0,
  realism: 0,
  approachability: 0,
  niche: 0,
  simplicity: 0,
  innovation: 0,
  gameWorld: 0,
  polish: 0,
};

export const GREAT_COMBOS = new Set([
  "角色扮演|幻想", "动作|忍者", "冒险|侦探", "模拟|小镇", "动作|机器人",
  "射击|太空", "竞速|体育", "音乐|校园", "格斗|怪物", "桌游|历史",
]);

export const STAGE_ORDER: ProductionStage[] = ["planning", "coding", "graphics", "sound", "debug"];
export const STAGE_INFO: Record<ProductionStage, { label: string; short: string; skill: keyof Pick<Staff, "code" | "scenario" | "art" | "sound">; note: string }> = {
  planning: { label: "企划构思", short: "企划", skill: "scenario", note: "决定作品的趣味与创意" },
  coding: { label: "程序开发", short: "程序", skill: "code", note: "搭建核心玩法并实现系统" },
  graphics: { label: "美术制作", short: "画面", skill: "art", note: "绘制角色、场景与特效" },
  sound: { label: "音乐制作", short: "音乐", skill: "sound", note: "创作配乐与音效" },
  debug: { label: "最终除错", short: "除错", skill: "code", note: "全员找出漏洞，准备发售" },
};

export type TrainingMethod = {
  id: string; name: string; note: string; cost: number; energy: number;
  gains: Partial<Pick<Staff, "code" | "scenario" | "art" | "sound">>;
  officeLevel?: number; requiredRole?: string;
  unlock: { kind: "theme"; name: string; role: string; level: number };
};

export const TRAINING_METHODS: TrainingMethod[] = [
  { id: "reading", name: "阅读资料", note: "强化剧本与创意", cost: 240, energy: 18, gains: { scenario: 4 }, unlock: { kind: "theme" as const, name: "幻想", role: "编剧", level: 2 } },
  { id: "movie", name: "电影鉴赏", note: "学习叙事与画面", cost: 520, energy: 25, gains: { scenario: 3, art: 3 }, unlock: { kind: "theme" as const, name: "太空", role: "编剧", level: 1 } },
  { id: "marathon", name: "热血马拉松", note: "磨炼程序与音效", cost: 380, energy: 30, gains: { code: 3, sound: 2 }, unlock: { kind: "theme" as const, name: "体育", role: "程序员", level: 1 } },
  { id: "pinball", name: "弹珠机特训", note: "全能力都有机会提升", cost: 950, energy: 38, gains: { code: 2, scenario: 2, art: 2, sound: 2 }, unlock: { kind: "theme" as const, name: "电子宠物", role: "程序员", level: 2 } },
  { id: "mystery", name: "推理研习", note: "分析线索与叙事", cost: 520, energy: 25, gains: { scenario: 4 }, unlock: { kind: "theme" as const, name: "侦探", role: "编剧", level: 2 } },
  { id: "town", name: "街区写生", note: "观察生活与场景", cost: 520, energy: 25, gains: { art: 4 }, unlock: { kind: "theme" as const, name: "小镇", role: "美术", level: 2 } },
  { id: "campus", name: "校园采风", note: "体验青春与旋律", cost: 520, energy: 25, gains: { sound: 4 }, unlock: { kind: "theme" as const, name: "校园", role: "音效师", level: 2 } },
  { id: "creature", name: "生物设计", note: "练习想象力与造型", cost: 700, energy: 30, gains: { art: 3, scenario: 2 }, unlock: { kind: "theme" as const, name: "怪物", role: "美术", level: 3 } },
  { id: "tactics", name: "战术沙盘", note: "专注系统与叙事，牺牲音乐练习", cost: 1100, energy: 35, officeLevel: 2, requiredRole: "总监", gains: { code: 5, scenario: 5, sound: -2 }, unlock: { kind: "theme", name: "战争", role: "总监", level: 2 } },
  { id: "production", name: "舞台统筹", note: "强化视听表现，牺牲程序练习", cost: 1100, energy: 35, officeLevel: 2, requiredRole: "制作人", gains: { art: 5, sound: 5, code: -2 }, unlock: { kind: "theme", name: "演艺", role: "制作人", level: 2 } },
  { id: "hardware", name: "电路实验", note: "深入硬件设计，牺牲叙事练习", cost: 1600, energy: 40, officeLevel: 3, requiredRole: "硬件工程师", gains: { code: 8, art: 4, scenario: -3 }, unlock: { kind: "theme", name: "机械", role: "硬件工程师", level: 2 } },
  { id: "simulation", name: "虚拟世界实验", note: "探索虚拟叙事，牺牲音乐练习", cost: 1800, energy: 40, officeLevel: 3, requiredRole: "黑客", gains: { code: 6, scenario: 6, sound: -3 }, unlock: { kind: "theme", name: "虚拟世界", role: "黑客", level: 2 } },
];

export const CONSOLE_CPUS = [
  { name: "16 位芯片", cost: 1000, power: 1 },
  { name: "32 位芯片", cost: 10_000, power: 1.35 },
  { name: "64 位芯片", cost: 50_000, power: 1.8 },
  { name: "薯片芯片", cost: 90_000, power: 2.2, requiredEngineers: 4 },
];
export const CONSOLE_MEDIA = [
  { name: "卡带", cost: 3000, power: 1 },
  { name: "CD-ROM", cost: 5000, power: 1.2 },
  { name: "DVD-ROM", cost: 15_000, power: 1.45 },
  { name: "BD-ROM", cost: 35_000, power: 1.7 },
  { name: "打孔卡", cost: 93_999, power: 2.1, requiredEngineers: 6 },
];
export const CONSOLE_BODIES = [
  { name: "家用机", cost: 6000, power: 1.1 },
  { name: "掌机", cost: 4000, power: 1 },
];

export const INITIAL_FAN_SEGMENTS: FanSegments = {
  kids: 18,
  teens: 34,
  adults: 42,
  seniors: 8,
  male: 58,
  female: 44,
};

export const INITIAL_INVENTORY: Inventory = {
  funBoost: 0,
  creativityBoost: 0,
  graphicsBoost: 0,
  soundBoost: 0,
  bugSpray: 0,
  energyDrink: 0,
};

export const SHOP_ITEMS = [
  { key: "funBoost" as const, name: "趣味提升书", note: "开发中增加趣味", cost: 620, iconIndex: 10 },
  { key: "creativityBoost" as const, name: "创意提升书", note: "开发中增加创意", cost: 620, iconIndex: 11 },
  { key: "graphicsBoost" as const, name: "画面提升书", note: "开发中增加画面", cost: 620, iconIndex: 12 },
  { key: "soundBoost" as const, name: "音乐提升书", note: "开发中增加音乐", cost: 620, iconIndex: 13 },
  { key: "bugSpray" as const, name: "漏洞喷雾", note: "立即移除部分漏洞", cost: 480, iconIndex: 14 },
  { key: "energyDrink" as const, name: "活力汽水", note: "恢复全员体力", cost: 360, iconIndex: 15 },
];

export const HIRING_METHODS = [
  { name: "员工介绍", note: "便宜，候选人能力普通", cost: 50, quality: 0 },
  { name: "游戏杂志广告", note: "稳定找到专业人才", cost: 120, quality: 1 },
  { name: "网络招聘", note: "新人到资深人士都有", cost: 550, quality: 2 },
  { name: "校园宣讲会", note: "寻找潜力出众的新人", cost: 800, quality: 3, level: 2 },
  { name: "公开选拔会", note: "高价搜罗明星人才", cost: 1800, quality: 4, level: 2 },
  { name: "全球猎头", note: "在世界范围寻找顶尖开发者", cost: 3500, quality: 5, level: 3 },
];

export const HIRING_CANDIDATES = [
  { name: "岚子", role: "程序员", code: 24, scenario: 4, art: 2, sound: 2, maxPower: 11, salary: 24, color: "#9b5de5" },
  { name: "大熊", role: "编剧", code: 7, scenario: 19, art: 2, sound: 10, maxPower: 14, salary: 30, color: "#00b4d8" },
  { name: "绘里", role: "美术", code: 7, scenario: 13, art: 22, sound: 8, maxPower: 14, salary: 35, color: "#e76f8a" },
  { name: "电波君", role: "音效师", code: 10, scenario: 9, art: 11, sound: 23, maxPower: 15, salary: 40, color: "#6d9eeb" },
  { name: "天才丸", role: "总监", code: 19, scenario: 22, art: 18, sound: 15, maxPower: 16, salary: 70, color: "#f4a261" },
];

export const ADVERTISING_METHODS = [
  { name: "游戏杂志广告", note: "面向核心玩家", cost: 30, hype: 2, segment: "adults" as const, level: 1 },
  { name: "网络广告", note: "覆盖年轻玩家", cost: 50, hype: 3, segment: "teens" as const, level: 1 },
  { name: "电台广告", note: "提升大众认知", cost: 80, hype: 5, segment: "adults" as const, level: 1 },
  { name: "试玩版派发", note: "让玩家亲自体验", cost: 150, hype: 8, segment: "teens" as const, level: 1 },
  { name: "街头乐队", note: "制造城市话题", cost: 250, hype: 12, segment: "teens" as const, level: 1 },
  { name: "电视广告", note: "覆盖家庭用户", cost: 350, hype: 16, segment: "kids" as const, level: 2 },
  { name: "动物玩偶宣传", note: "吸引儿童玩家", cost: 500, hype: 20, segment: "kids" as const, level: 2 },
  { name: "电视节目赞助", note: "获得全国关注", cost: 650, hype: 24, segment: "adults" as const, level: 2 },
  { name: "赛车赞助", note: "强化男性受众", cost: 1200, hype: 32, segment: "male" as const, level: 2 },
  { name: "卡牌大赛", note: "形成玩家社群", cost: 3300, hype: 42, segment: "teens" as const, level: 3 },
  { name: "飞艇广告", note: "全城可见", cost: 5500, hype: 55, segment: "adults" as const, level: 3 },
  { name: "月面广告", note: "世界级曝光", cost: 9900, hype: 75, segment: "male" as const, level: 3 },
];

export const CONTRACTS = [
  { name: "商店网页小游戏", target: 70, reward: 100, deadline: 9, level: 1, requirements: { fun: 6, creativity: 5 } },
  { name: "游戏说明书插画", target: 90, reward: 150, deadline: 10, level: 1, requirements: { graphics: 10, creativity: 6 } },
  { name: "动画片特效", target: 135, reward: 300, deadline: 12, level: 2, requirements: { graphics: 18, sound: 10 } },
  { name: "掌机移植外包", target: 210, reward: 600, deadline: 14, level: 2, requirements: { fun: 16, graphics: 20, sound: 14 } },
  { name: "大型游戏引擎", target: 300, reward: 1200, deadline: 13, level: 3, requirements: { fun: 20, creativity: 22, graphics: 20, sound: 16 } },
];

export const CONTRACT_QUALITY_LABELS = {
  fun: "趣味",
  creativity: "创意",
  graphics: "画面",
  sound: "音乐",
};

export const WORKER_BEHAVIORS: Record<WorkerBehavior, { label: string; iconIndex: number }> = {
  idle: { label: "等待灵感", iconIndex: 6 },
  planning: { label: "企划构思", iconIndex: 6 },
  coding: { label: "编写程序", iconIndex: 0 },
  drawing: { label: "绘制美术", iconIndex: 7 },
  mixing: { label: "制作音乐", iconIndex: 8 },
  debugging: { label: "排查漏洞", iconIndex: 9 },
  sipping: { label: "补充能量", iconIndex: 15 },
  tired: { label: "疲惫休息", iconIndex: 23 },
};

export const WORKER_BEHAVIOR_ROWS: Record<Exclude<WorkerBehavior, "sipping">, number> = {
  idle: 0,
  planning: 1,
  coding: 2,
  drawing: 3,
  mixing: 4,
  debugging: 5,
  tired: 6,
};

export const EVENT_ICON_INDEX: Record<EventData["kind"], number> = {
  payroll: 22,
  expo: 3,
  awards: 20,
  console: 21,
  market: 4,
  ending: 20,
  development: 0,
  fanmail: 23,
  office: 2,
  contract: 1,
};

export const ROLE_LEVEL_BOOSTS: Record<string, Partial<Pick<Staff, "code" | "scenario" | "art" | "sound">>> = {
  "程序员": { code: 5, scenario: 1 },
  "编剧": { scenario: 5, art: 1 },
  "美术": { art: 5, scenario: 1 },
  "音效师": { sound: 5, art: 1 },
  "总监": { code: 3, scenario: 3, art: 2 },
  "制作人": { scenario: 3, art: 2, sound: 2 },
  "硬件工程师": { code: 5, art: 2, sound: 2 },
  "黑客": { code: 5, scenario: 4, art: 4, sound: 4 },
};

export const ROLE_UNLOCK_RULES = [
  { role: "程序员", level: 4, name: "模拟" },
  { role: "编剧", level: 3, name: "动作" },
  { role: "编剧", level: 3, name: "射击" },
  { role: "编剧", level: 5, name: "角色扮演" },
  { role: "音效师", level: 3, name: "竞速" },
  { role: "总监", level: 5, name: "音乐" },
  { role: "制作人", level: 3, name: "格斗" },
  { role: "总监", level: 3, name: "策略" },
  { role: "制作人", level: 5, name: "经营" },
];
