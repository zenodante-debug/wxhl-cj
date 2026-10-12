import { describe, expect, it } from 'vitest';
import { createAccount, LOG_CAP, type LogEntry } from '../engine/types';
import { positionEquitySum, pushLog, totalPnl, visibleLogs } from '../engine/metrics';
import { netAssets } from '../engine/trading';

describe('账户指标', () => {
  it('持仓权益 = Σ(保证金 + 浮动盈亏)', () => {
    const a = createAccount();
    a.cash = 1000;
    a.positions = { TGJ: { side: 'long', qty: 1, entryPrice: 100, leverage: 1, margin: 100 } };
    a.prices['TGJ'] = 110;
    expect(positionEquitySum(a)).toBe(110);
    expect(netAssets(a)).toBe(1110);
  });
  it('总盈亏 = 净资产 − 净投入', () => {
    const a = createAccount();
    a.cash = 990;
    a.netInvested = 1000; // 存入 1000UP → 990 币（手续费 1%）
    a.positions = { TGJ: { side: 'long', qty: 1, entryPrice: 100, leverage: 1, margin: 100 } };
    a.prices['TGJ'] = 110;
    expect(totalPnl(a)).toBe(1100 - 1000);
  });
  it('空账户：持仓权益 0、总盈亏 0', () => {
    const a = createAccount();
    expect(positionEquitySum(a)).toBe(0);
    expect(totalPnl(a)).toBe(0);
  });
});

describe('交易所日报', () => {
  it('日志倒序（最新在前），界面只给最近 50 条', () => {
    const a = createAccount();
    for (let i = 0; i < 60; i++) pushLog(a, 'system', `第${i}条`);
    const v = visibleLogs(a);
    expect(v.length).toBe(50);
    expect(v[0].text).toBe('第59条');
    expect(v[49].text).toBe('第10条');
  });
  it(`存档上限 ${LOG_CAP} 条，超出丢最旧的`, () => {
    const a = createAccount();
    for (let i = 0; i < LOG_CAP + 40; i++) pushLog(a, 'system', `第${i}条`);
    expect(a.logs.length).toBe(LOG_CAP);
    expect(a.logs[a.logs.length - 1].text).toBe(`第${LOG_CAP + 39}条`);
    expect(a.logs[0].text).toBe('第40条');
  });
  it('每条带 tick / 时钟 / 类别', () => {
    const a = createAccount();
    a.tick = 7;
    pushLog(a, 'news', '某新闻');
    const e: LogEntry = a.logs[0];
    expect(e.tick).toBe(7);
    expect(e.kind).toBe('news');
    expect(e.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
