import type { ProductionStage, ReviewDetail } from "../game-balance";
import type { CombinationDiscovery, CombinationRating } from "./combinations";

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

export type ResultTone = "positive" | "negative" | "neutral";

export type ResultEntry = {
  category: "resource" | "quality" | "risk";
  label: string;
  value: string;
  tone: ResultTone;
  detail?: string;
};

export type ResultData = {
  title: string;
  summary: string;
  entries: ResultEntry[];
};

export type StaffChallengeMetric = "fun" | "creativity" | "graphics" | "sound";
export type StaffChallengeInvestment = "steady" | "full";

export type StaffChallengeOffer = {
  id: string;
  staffId: number;
  metric: StaffChallengeMetric;
  visualStage: Exclude<ProductionStage, "debug">;
  skill: number;
  baseSuccessRate: number;
  gainRange: { min: number; max: number };
  successHype: number;
  failureHypeLoss: number;
  failureBugs: number;
};

export type StageCreationPhase = "select" | "focus" | "create" | "result" | "resume";

export type StageCreationData = {
  stage: Exclude<ProductionStage, "debug">;
  kind?: "challenge";
  leadStaffId?: number;
  leadName: string;
  external: boolean;
  repeated: boolean;
  roleFit: string;
  skillLabel: string;
  effectiveSkill: number;
  result: ResultData;
};

export type StageCreationState =
  | { phase: "select"; stage: Exclude<ProductionStage, "debug"> }
  | (StageCreationData & { phase: Exclude<StageCreationPhase, "select"> });

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
  platformDevelopmentFee?: number;
  licenseFee?: number;
  productionCost?: number;
  stage?: ProductionStage;
  stageProgress?: number;
  stageTarget?: number;
  leadStaffId?: number;
  leadName?: string;
  waitingForLeadRecovery?: boolean;
  leadSkill?: number;
  debugTarget?: number;
  elapsedWeeks?: number;
  consoleSpec?: ConsoleSpec;
  sequelOf?: string;
  sequelOfId?: string;
  combination?: CombinationRating;
  itemUses?: number;
  eventCount?: number;
  challengeCount?: number;
  pendingChallenge?: StaffChallengeOffer;
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
  id: string;
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
  sequelOfId?: string;
  finalQuality?: Pick<Project, "fun" | "creativity" | "graphics" | "sound" | "bugs">;
  combo?: CombinationRating;
  reviewDetails?: ReviewDetail[];
};

export type AwardCategory = "design" | "music" | "worst" | "runnerUp" | "grand";
export type AwardNominee = {
  releaseId: string;
  name: string;
  metric: number;
  score: number;
  sales: number;
  quality: NonNullable<Release["finalQuality"]>;
};
export type AnnualAwards = {
  year: number;
  qualified: boolean;
  categories: { category: AwardCategory; nominees: AwardNominee[]; winnerId?: string }[];
  excluded: { name: string; releaseId: string; reason: string }[];
  unknownYearCount: number;
  rewards: { cash: number; fans: number; reputation: number; awards: number };
  officeUnlocked: boolean;
};

export type Inventory = {
  funBoost: number;
  creativityBoost: number;
  graphicsBoost: number;
  soundBoost: number;
  bugSpray: number;
  energyDrink: number;
};

export type EndingReport = {
  settledAt: { year: number; month: number; week: number } | null;
  cash: number;
  // Null for legacy endings: current business data cannot reconstruct past results.
  performance: {
    releaseCount: number;
    totalSales: number;
    averageScore: number | null;
    bestSeller: { id: string; name: string; sales: number } | null;
    bestProfit: { id: string; name: string; profit: number } | null;
    unknownCostCount: number;
    releaseHistoryIncomplete: boolean;
    awards: number;
    awardCounts: Record<AwardCategory, number>;
    awardHistoryIncomplete: boolean;
    ownConsole: boolean;
    consoleUsers: number;
    consoleReleaseCount: number;
    consoleSoftwareSales: number;
  } | null;
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
  nextReleaseNumber: number;
  releaseHistoryIncomplete: boolean;
  combinationDiscoveries: Record<string, CombinationDiscovery>;
  platformLicenses: string[];
  companyLevel: number;
  awards: number;
  awardHistory: AnnualAwards[];
  lastAwardYear: number;
  awardHistoryIncomplete: boolean;
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
  endingReport: EndingReport | null;
  inventory: Inventory;
  merchantYear: number;
  merchantPurchases: number;
  industryNews: string;
  lastStageLeads: Partial<Record<ProductionStage, number | "external">>;
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
  results?: ResultEntry[];
};

export type ReviewData = {
  name: string;
  scores: number[];
  details?: ReviewDetail[];
  sales: number;
  income: number;
  audience: string;
  reputationChange: number;
  growth: string;
  salesRank: number;
  results?: ResultEntry[];
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
  | "result"
  | "stage"
  | "challenge"
  | null;

export type RandomSource = () => number;
