import { describe, expect, it, beforeEach, vi } from 'vitest';
import { 验收加分, 退货扣分, 弃单扣分 } from '../rep/score';
import { readShopName, shopBoardRows, SHOP_TOP_N, type ShopRankBoard } from '../rep/shop';
import { appendHistory, loadHistory, type 订单记录 } from '../rep/history';

describe('score · 分数变动', () => {
  it('跳过评分只 +1 保底', () => {
    expect(验收加分(null)).toBe(1);
  });
  it('给分则 1 + 评分', () => {
    expect(验收加分(0)).toBe(1);
    expect(验收加分(5)).toBe(6);
    expect(验收加分(3)).toBe(4);
  });
  it('脏输入钳制：NaN/负数/超界/小数', () => {
    expect(验收加分(NaN)).toBe(1);
    expect(验收加分(-3)).toBe(1);
    expect(验收加分(99)).toBe(6);
    expect(验收加分(4.6)).toBe(6); // 四舍五入到 5 再加 1
  });
  it('退货 −2 / 弃单 −5', () => {
    expect(退货扣分()).toBe(-2);
    expect(弃单扣分()).toBe(-5);
  });
});

describe('shop · 店铺名读取', () => {
  it("'无' / 空串 / 缺失路径都算未开店", () => {
    expect(readShopName({ 个人产业: { 当前店铺: { 名称: '无' } } })).toBe('');
    expect(readShopName({ 个人产业: { 当前店铺: { 名称: '  ' } } })).toBe('');
    expect(readShopName({ 个人产业: {} })).toBe('');
    expect(readShopName({})).toBe('');
    expect(readShopName(null)).toBe('');
  });
  it('正常店铺名原样返回（去首尾空白）', () => {
    expect(readShopName({ 个人产业: { 当前店铺: { 名称: ' 秦记铁匠铺 ' } } })).toBe('秦记铁匠铺');
  });
});

describe('shop · 榜单行展开', () => {
  const 条目 = (name: string, score: number) => ({ name, score, updated: 1 });
  it('我在榜内：无省略号，mine 标记正确', () => {
    const board: ShopRankBoard = { list: [条目('a', 9), 条目('b', 8)], total: 2, me: { rank: 2, entry: 条目('b', 8) }, near: [] };
    const rows = shopBoardRows(board);
    expect(rows.map(r => r.kind)).toEqual(['entry', 'entry']);
    expect(rows[1].kind === 'entry' && rows[1].mine).toBe(true);
  });
  it('我在榜外：省略号 + 邻居；服务器漏发我时补我自己的行', () => {
    const list = Array.from({ length: SHOP_TOP_N }, (_, i) => 条目(`铺${i}`, 100 - i));
    const board: ShopRankBoard = { list, total: 30, me: { rank: 25, entry: 条目('我', 1) }, near: [{ rank: 24, entry: 条目('前', 2) }] };
    const rows = shopBoardRows(board);
    expect(rows[SHOP_TOP_N].kind).toBe('gap');
    expect(rows.some(r => r.kind === 'entry' && r.mine && r.rank === 25)).toBe(true);
  });
});

describe('history · 本地订单记录', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, String(v)),
      removeItem: (k: string) => void mem.delete(k),
    });
  });
  const 记录 = (i: number): 订单记录 => ({ 订单id: `o${i}`, 角色: '接单人', 对方: '甲', 摘要: '剑｜装备·武器', 结果: '完成', 分数变动: null, 时间: i });

  it('空/损坏数据都读回空数组', () => {
    expect(loadHistory()).toEqual([]);
    mem.set('wxhl003_order_rep', '{不是JSON');
    expect(loadHistory()).toEqual([]);
    mem.set('wxhl003_order_rep', '{"不是数组":1}');
    expect(loadHistory()).toEqual([]);
  });
  it('追加可读回；形状残缺的历史条目被滤掉', () => {
    appendHistory(记录(1));
    mem.set('wxhl003_order_rep', JSON.stringify([...loadHistory(), { 坏: true }, 记录(2)]));
    expect(loadHistory().map(r => r.订单id)).toEqual(['o1', 'o2']);
  });
  it('容量钳制：只留最近 100 条', () => {
    for (let i = 0; i < 130; i++) appendHistory(记录(i));
    const all = loadHistory();
    expect(all.length).toBe(100);
    expect(all[0].订单id).toBe('o30');
    expect(all[99].订单id).toBe('o129');
  });
});
