import { STAGE_TARGETS, type ProductionStage } from "../game-balance.ts";
import {
  DEFAULT_DIRECTION_POINTS,
  DIRECTIONS,
  INITIAL_FAN_SEGMENTS,
  INITIAL_INVENTORY,
  INITIAL_STAFF,
  PLATFORMS,
} from "./data.ts";
import type {
  DirectionPoints,
  FanSegments,
  GameState,
  Staff,
} from "./types";

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const formatCash = (value: number) =>
  `¥${Math.max(0, Math.round(value)).toLocaleString()}千`;

export const formatUsers = (value: number) =>
  value >= 10_000 ? `${Math.round(value / 10_000)}万` : value.toLocaleString();

export const getKnowledgeLevel = (experience = 0) =>
  clamp(1 + Math.floor(experience / 2), 1, 5);

export const getOfficeCapacity = (level: number) =>
  level >= 3 ? 8 : level === 2 ? 6 : 4;

export const getSalesRank = (weeklySales: number, currentYear: number) =>
  clamp(
    Math.round(
      42 -
        (weeklySales / Math.max(1300, 2500 + currentYear * 420)) * 18,
    ),
    1,
    50,
  );

export const getDirectionConfig = (name: string) =>
  DIRECTIONS.find((item) => item.name === name) ?? DIRECTIONS[0];

export function getDirectionBoosts(points: DirectionPoints) {
  return {
    fun:
      points.approachability * .45 +
      points.simplicity * .5 +
      points.niche * .15,
    creativity:
      points.innovation * .6 +
      points.gameWorld * .35 +
      points.niche * .3,
    graphics:
      points.cuteness * .45 +
      points.realism * .45 +
      points.polish * .4 +
      points.gameWorld * .2,
    sound:
      points.realism * .2 +
      points.polish * .35 +
      points.gameWorld * .15,
    hype:
      points.niche * .8 +
      points.cuteness * .3 +
      points.innovation * .4,
  };
}

export function normalizeStaff(member: Staff): Staff {
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
  const scenario = member.scenario ?? Math.max(5, Math.round(member.art * .8));
  const statTotal = member.code + scenario + member.art + member.sound;
  const role = roleMap[member.role] ?? member.role;
  return {
    ...member,
    role,
    scenario,
    maxPower: member.maxPower ?? clamp(8 + Math.round(statTotal / 20), 8, 30),
    salary: member.salary ?? Math.max(20, Math.round(statTotal / 2)),
    resting: member.resting ?? false,
    training: member.training ?? {},
    masteredRoles:
      member.masteredRoles ?? (member.level >= 5 ? [role] : []),
  };
}

export function getAudience(
  genre: string,
  theme: string,
): { label: string; gains: Partial<FanSegments> } {
  if (genre === "动作" || theme === "忍者" || theme === "机器人") {
    return { label: "青少年・男性", gains: { teens: 10, male: 9, kids: 3 } };
  }
  if (genre === "角色扮演" || theme === "幻想") {
    return {
      label: "青少年・全年龄",
      gains: { teens: 8, adults: 6, male: 5, female: 5 },
    };
  }
  if (genre === "模拟" || theme === "小镇") {
    return { label: "成人・女性", gains: { adults: 10, female: 9, seniors: 3 } };
  }
  if (genre === "冒险" || theme === "侦探") {
    return { label: "成人・女性", gains: { adults: 9, female: 7, teens: 4 } };
  }
  return { label: "家庭・全年龄", gains: { kids: 6, seniors: 7, female: 5, male: 3 } };
}

export function getStageTarget(stage: ProductionStage, direction: string) {
  return Math.round(STAGE_TARGETS[stage] * getDirectionConfig(direction).target);
}

export function getAvailablePlatforms(
  year: number,
  ownConsole: boolean,
  consoleUsers: number,
) {
  const market = PLATFORMS.filter(
    (item) => year >= item.debut && year <= item.retire,
  );
  return ownConsole
    ? [
        ...market,
        {
          name: "像素盒子",
          cost: 0,
          users: Math.max(220_000, consoleUsers),
          debut: year,
          retire: 99,
        },
      ]
    : market;
}

export function advanceCalendar(
  date: Pick<GameState, "year" | "month" | "week">,
): Pick<GameState, "year" | "month" | "week"> {
  if (date.week < 4) return { ...date, week: date.week + 1 };
  if (date.month < 12) return { ...date, month: date.month + 1, week: 1 };
  return { year: date.year + 1, month: 1, week: 1 };
}

export function createInitialGameState(): GameState {
  return {
    cash: 500,
    fans: 0,
    research: 10,
    year: 1,
    month: 4,
    week: 1,
    staff: INITIAL_STAFF.map((member) => normalizeStaff({ ...member })),
    project: null,
    releases: [],
    companyLevel: 1,
    awards: 0,
    ownConsole: false,
    consoleUsers: 0,
    lastEventKey: "",
    fanSegments: { ...INITIAL_FAN_SEGMENTS },
    reputation: 0,
    genreExperience: {},
    themeExperience: {},
    unlockedGenres: ["桌游", "冒险", "益智", "知识问答", "教育"],
    unlockedThemes: ["海盗", "动物", "机器人", "历史", "忍者"],
    careerManuals: 0,
    endingShown: false,
    endingScore: 0,
    inventory: { ...INITIAL_INVENTORY },
    merchantYear: 0,
    merchantPurchases: 0,
    industryNews: "小型工作室“像素工坊”正式成立！",
  };
}

export function cloneDirectionPoints(points = DEFAULT_DIRECTION_POINTS) {
  return { ...points };
}
