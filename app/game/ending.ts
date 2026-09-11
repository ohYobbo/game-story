import type { EndingReport, GameState } from "./types";

const byId = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

export function createEndingReport(state: GameState): EndingReport {
  const bestSeller = [...state.releases].sort((a, b) => b.sales - a.sales || byId(a, b))[0];
  const knownCosts = state.releases.filter(r => r.developmentCost !== undefined);
  const bestProfit = knownCosts.sort((a, b) => (b.income - b.developmentCost!) - (a.income - a.developmentCost!) || byId(a, b))[0];
  const consoleReleases = state.releases.filter(r => r.platform === "像素盒子");
  const awardCounts = { design: 0, music: 0, worst: 0, runnerUp: 0, grand: 0 };
  for (const record of state.awardHistory) {
    for (const category of record.categories) if (category.winnerId) awardCounts[category.category]++;
  }
  return {
    settledAt: { year: state.year, month: state.month, week: state.week },
    cash: Math.round(state.cash),
    performance: {
      releaseCount: state.releases.length,
      totalSales: state.releases.reduce((sum, r) => sum + r.sales, 0),
      averageScore: state.releases.length ? state.releases.reduce((sum, r) => sum + r.score, 0) / state.releases.length : null,
      bestSeller: bestSeller ? { id: bestSeller.id, name: bestSeller.name, sales: bestSeller.sales } : null,
      bestProfit: bestProfit ? { id: bestProfit.id, name: bestProfit.name, profit: bestProfit.income - bestProfit.developmentCost! } : null,
      unknownCostCount: state.releases.length - knownCosts.length,
      releaseHistoryIncomplete: state.releaseHistoryIncomplete,
      awards: state.awards,
      awardCounts,
      awardHistoryIncomplete: state.awardHistoryIncomplete,
      ownConsole: state.ownConsole,
      consoleUsers: state.consoleUsers,
      consoleReleaseCount: consoleReleases.length,
      consoleSoftwareSales: consoleReleases.reduce((sum, r) => sum + r.sales, 0),
    },
  };
}
