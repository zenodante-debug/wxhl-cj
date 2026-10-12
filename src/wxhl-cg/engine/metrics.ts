// ================================================================
// 回廊交易所 · 账户指标与交易所日报（纯函数）。
// ================================================================
import { LOG_CAP, round2, type ExchangeAccount, type LogEntry, type LogKind } from './types';
import { netAssets, positionEquity } from './trading';

/** 持仓权益 = Σ(保证金 + 浮动盈亏) */
export function positionEquitySum(acct: ExchangeAccount): number {
  let sum = 0;
  for (const [code, pos] of Object.entries(acct.positions)) {
    sum += positionEquity(pos, acct.prices[code] ?? pos.entryPrice);
  }
  return round2(sum);
}

/** 总盈亏 = 净资产 − 净投入（净投入已含兑换手续费，所以这是"我到底赚没赚"） */
export function totalPnl(acct: ExchangeAccount): number {
  return round2(netAssets(acct) - acct.netInvested);
}

/** 写一条日报：新闻 / 交易 / 系统混排，超出存档上限丢最旧的 */
export function pushLog(acct: ExchangeAccount, kind: LogKind, text: string): void {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  acct.logs.push({ tick: acct.tick, time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`, kind, text });
  if (acct.logs.length > LOG_CAP) acct.logs.splice(0, acct.logs.length - LOG_CAP);
}

/** 界面显示的最近 50 条，最新在前 */
export function visibleLogs(acct: ExchangeAccount): LogEntry[] {
  return acct.logs.slice(-50).reverse();
}
