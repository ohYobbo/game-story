import type { ReviewDetail } from "../game-balance";
import { AWARD_ELIGIBILITY, AWARD_RULES, AWARD_TIES } from "../game/awards";
import { formatCash } from "../game/rules";
import type { GameState } from "../game/types";

const signed = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;

export function ReviewReasons({ details, open = false }: { details?: ReviewDetail[]; open?: boolean }) {
  if (!details?.length) return <small className="review-unknown">媒体评分原因未知（旧作未保存）</small>;
  return <details className="review-reasons" open={open}>
    <summary>媒体评分原因</summary>
    <p>基础为四项品质均值 ÷ 8；偏好按擅长项与平均品质的差值 ÷ 48 计算，最多加减 0.5。先合计，再四舍五入并限制为 1–10 分。下列分项显示至两位小数。</p>
    {details.map(item => <div key={item.name}>
      <b>{item.name} · 偏好{item.focus} · {item.score}/10</b>
      <span>品质基础 {item.base.toFixed(2)} · 偏好 {signed(item.preference)} · 相性 {signed(item.comboBonus)}（仅杰作加分）</span>
      <span>评审风格 {signed(item.styleBonus)} · 口碑 {signed(item.reputationBonus)} · 漏洞 −{item.bugPenalty.toFixed(2)} · 当次浮动 {signed(item.variation)}</span>
      <span>取整前 {item.rawScore.toFixed(2)} → 实际 {item.score} 分</span>
    </div>)}
  </details>;
}

export function AwardRecords({ game }: { game: GameState }) {
  return <section className="award-records" aria-label="年度奖项档案">
    <h3>年度奖项档案</h3>
    <details className="award-rules"><summary>参评资格与五项奖项规则</summary>
      <p>{AWARD_ELIGIBILITY}</p><p>{AWARD_TIES}</p>
      {AWARD_RULES.map(rule => <p key={rule.id}><b>{rule.name}</b>：{rule.criteria}。奖金 {formatCash(rule.cash)}，粉丝 {rule.fans >= 0 ? "+" : ""}{rule.fans}，口碑 {rule.reputation >= 0 ? "+" : ""}{rule.reputation}。</p>)}
    </details>
    {game.awardHistoryIncomplete && <p>旧奖项历史不完整：原获奖总数保留，过去的提名、得主和奖励明细未知，不补发。旧档若已进入12月，保守视为当年旧颁奖已处理。</p>}
    {!game.awardHistory.length && <p>暂无完整年度记录，次年开始时结算上一整年作品。</p>}
    {[...game.awardHistory].reverse().map(record => <details className="award-year" key={record.year}>
      <summary>第 {record.year} 年 · 正向奖项 {record.rewards.awards} 项 · 奖金 {formatCash(record.rewards.cash)}</summary>
      <p>{record.qualified ? "已取得正向奖项参评资格" : "尚未取得正向奖项参评资格"} · 实际粉丝 {record.rewards.fans >= 0 ? "+" : ""}{record.rewards.fans} · 口碑 {record.rewards.reputation >= 0 ? "+" : ""}{record.rewards.reputation}</p>
      {record.officeUnlocked && <p>本届解锁大楼办公室搬迁资格，仍需支付搬迁费。</p>}
      {record.categories.map(category => <div className="award-category" key={category.category}>
        <b>{AWARD_RULES.find(rule => rule.id === category.category)!.name} · {category.winnerId ? `《${category.nominees.find(n => n.releaseId === category.winnerId)!.name}》` : "空缺"}</b>
        {!category.nominees.length && <p>无符合门槛的提名作品</p>}
        {category.nominees.map(item => <p key={item.releaseId}>
          {item.releaseId === category.winnerId ? "获奖" : "提名"}：《{item.name}》 · {item.releaseId} · 评价 {item.metric.toFixed(2)}<br />
          评分 {item.score}/40 · 结算销量 {item.sales.toLocaleString()} · 趣味 {item.quality.fun.toFixed(1)} / 创意 {item.quality.creativity.toFixed(1)} / 画面 {item.quality.graphics.toFixed(1)} / 音乐 {item.quality.sound.toFixed(1)} / 漏洞 {item.quality.bugs.toFixed(1)}
        </p>)}
      </div>)}
      {record.excluded.map(item => <p key={item.releaseId}>《{item.name}》未参评：{item.reason}</p>)}
      {record.unknownYearCount > 0 && <p>另有 {record.unknownYearCount} 部旧作发售年份未知，未参评。</p>}
    </details>)}
  </section>;
}
