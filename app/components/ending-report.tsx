import type { EndingReport } from "../game/types";
import { formatCash } from "../game/rules";
import { AWARD_RULES } from "../game/awards";

export function EndingReportCard({ report }: { report: EndingReport }) {
  const p = report.performance;
  const date = report.settledAt;
  const late = date && (date.year > 20 || date.month > 1 || date.week > 1);
  return <section className="ending-report" aria-label="固定二十年经营报告">
    <h3>20 年经营报告 · 固定成绩</h3>
    <p>{date ? `结算于第 ${date.year} 年 ${date.month} 月第 ${date.week} 周` : "旧报告结算日期未知"}。继续经营不会改变本报告。</p>
    {late && <p>存档已越过第 20 年 1 月第 1 周，按此次实际结算日期记录，无法还原原定日期的成绩。</p>}
    <div className="record-stats">
      <div><small>现金资产</small><b>{formatCash(report.cash)}</b></div>
      <div><small>发售作品</small><b>{p ? p.releaseCount : "未知"}</b></div>
      <div><small>总销量</small><b>{p ? `${p.totalSales.toLocaleString()} 套` : "未知"}</b></div>
      <div><small>平均评分</small><b>{p ? p.averageScore === null ? "暂无作品" : `${p.averageScore.toFixed(2)}/40` : "未知"}</b></div>
      <div><small>正向奖项</small><b>{p ? p.awards : "未知"}</b></div>
    </div>
    <p>资产按结算时现金计，办公室、员工和知识不折算估值。原定结算时间为第 20 年 1 月第 1 周，先处理第 19 年奖项。</p>
    {!p ? <p>旧报告分项未知：仅保留当时现金资产，无法用当前作品、奖项或主机数据还原过去成绩。</p> : <>
      {p.releaseHistoryIncomplete && <p>旧记录不完整：作品数、销量、均分、作品排行及主机软件成绩仅统计保留作品，不能视为完整生涯总计。</p>}
      <p><b>最高销量</b>：{p.bestSeller ? `《${p.bestSeller.name}》 · ${p.bestSeller.sales.toLocaleString()} 套` : "暂无作品"}</p>
      <p><b>最高作品利润</b>：{p.bestProfit ? `《${p.bestProfit.name}》 · ${formatCash(p.bestProfit.profit)}` : p.releaseCount ? "作品收益未知（无开发费记录）" : "暂无作品"}</p>
      <p>作品利润 = 销售收入 − 立项开发费，不含薪资、广告、外援、道具和挑战投入。同值按作品 ID 字符顺序升序裁定。{p.unknownCostCount > 0 && `${p.unknownCostCount} 部作品开发费未知，未参与利润排行。`}</p>
      <h4>奖项成绩</h4>
      <p>{AWARD_RULES.map(rule => `${rule.name} ${p.awardCounts[rule.id]} 次`).join(" · ")}</p>
      <p>最差作品单列，不计入正向奖项。{p.awardHistoryIncomplete && "旧奖项历史不完整：正向总数保留，分项次数仅含已知年度档案。"}</p>
      <h4>自研主机成绩</h4>
      <p>{p.ownConsole ? `像素盒子 · 平台用户 ${p.consoleUsers.toLocaleString()} 人` : "结算时尚未推出自研主机"}</p>
      <p>自研平台作品 {p.consoleReleaseCount} 部 · 软件销量 {p.consoleSoftwareSales.toLocaleString()} 套。平台用户不等同于硬件销量；硬件收入和多代主机历史尚无记录。</p>
    </>}
  </section>;
}
