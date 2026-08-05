import type { ProductionStage } from "../game-balance";

export type Staff = {
  id: number;
  name: string;
  role: string;
  level: number;
  code: number;
  scenario: number;
  art: number;
  sound: number;
  energy: number;
  maxPower: number;
  salary: number;
  resting?: boolean;
  color: string;
  training?: Record<string, number>;
  masteredRoles?: string[];
};

export type WorkerBehavior =
  | "idle"
  | "planning"
  | "coding"
  | "drawing"
  | "mixing"
  | "debugging"
  | "sipping"
  | "tired";

export type DirectionKey =
  | "cuteness"
  | "realism"
  | "approachability"
  | "niche"
  | "simplicity"
  | "innovation"
  | "gameWorld"
  | "polish";

export type DirectionPoints = Record<DirectionKey, number>;

export type FanSegments = {
  kids: number;
  teens: number;
  adults: number;
  seniors: number;
  male: number;
  female: number;
};

export type ConsoleSpec = {
  cpu: string;
  media: string;
  body: string;
  performance: number;
  cost: number;
};

export type Project = {
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
  eventCount?: number;
  directionPoints?: DirectionPoints;
  contentPopularity?: number;
  debugResearch?: number;
  advertisingUses?: Record<string, number>;
  developmentCost?: number;
  deadlineWeeks?: number;
  qualityTargets?: Partial<
    Record<"fun" | "creativity" | "graphics" | "sound", number>
  >;
};

export type Release = {
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
  weeklyRank?: number;
  fanLetterSent?: boolean;
  advertisingUses?: Record<string, number>;
  developmentCost?: number;
};

export type Inventory = {
  funBoost: number;
  creativityBoost: number;
  graphicsBoost: number;
  soundBoost: number;
  bugSpray: number;
  energyDrink: number;
};

/** Permanent simulation state. UI modals, animation and toast state never live here. */
export type GameState = {
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
  awards: number;
  ownConsole: boolean;
  consoleUsers: number;
  lastEventKey: string;
  fanSegments: FanSegments;
  reputation: number;
  genreExperience: Record<string, number>;
  themeExperience: Record<string, number>;
  unlockedGenres: string[];
  unlockedThemes: string[];
  careerManuals: number;
  endingShown: boolean;
  endingScore: number;
  inventory: Inventory;
  merchantYear: number;
  merchantPurchases: number;
  industryNews: string;
};

export type SaveState = GameState & {
  schemaVersion: number;
  balanceVersion: number;
};

export type LegacySaveState = Partial<GameState> & {
  balanceVersion?: number;
  schemaVersion?: number;
};

export type EventData = {
  kind:
    | "payroll"
    | "expo"
    | "awards"
    | "console"
    | "market"
    | "ending"
    | "development"
    | "fanmail"
    | "office"
    | "contract";
  title: string;
  headline: string;
  body: string;
  reward?: string;
};

export type ReviewData = {
  name: string;
  scores: number[];
  sales: number;
  income: number;
  audience: string;
  reputationChange: number;
  growth: string;
  salesRank: number;
};

export type Modal =
  | "develop"
  | "contracts"
  | "staff"
  | "training"
  | "career"
  | "console"
  | "shop"
  | "items"
  | "hire"
  | "marketing"
  | "records"
  | "review"
  | "event"
  | "stage"
  | null;

export type RandomSource = () => number;
