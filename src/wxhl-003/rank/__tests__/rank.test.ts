import { describe, expect, it } from 'vitest';
import {
  MIN_LV,
  TOP_N,
  boardRows,
  rankText,
  readRankSnapshot,
  type RankBoard,
  type RankEntry,
} from '../rank';

// ================================================================
// 玩家排行榜 · 纯逻辑（排序与名次展示全在客户端脚本算，不烧 AI token）
// ================================================================

/** 真实存档风格的最小快照：称号在 头部.称号.当前称号.名称，职业在 职业.名称 */
function 契约者(over: any = {}) {
  return {
    头部: {
      姓名: '林千尺',
      等级: 27,
      称号: { 当前称号: { 名称: '「无距之刃」', 效果: {} } },
    },
    职业: { 名称: '次元行者', 稀有度: '紫色' },
    ...over,
  };
}

describe('readRankSnapshot · 从存档快照取上传字段', () => {
  it('正常读取姓名 / 等级 / 称号 / 职业', () => {
    const r = readRankSnapshot(契约者());
    expect(r.ok).toBe(true);
    expect(r.ok && r.payload).toEqual({
      name: '林千尺',
      lv: 27,
      title: '「无距之刃」',
      job: '次元行者',
    });
  });

  it('称号为「无」→ 归一成「无称号」', () => {
    const r = readRankSnapshot(契约者({ 头部: { 姓名: '张三', 等级: 20, 称号: { 当前称号: { 名称: '无' } } } }));
    expect(r.ok && r.payload.title).toBe('无称号');
  });

  it('职业为「无」→ 归一成「无职业」', () => {
    const r = readRankSnapshot(契约者({ 职业: { 名称: '无' } }));
    expect(r.ok && r.payload.job).toBe('无职业');
  });

  it('等级取整（12.7 → 12）', () => {
    const r = readRankSnapshot(契约者({ 头部: { 姓名: '张三', 等级: 12.7, 称号: { 当前称号: { 名称: '无' } } } }));
    expect(r.ok && r.payload.lv).toBe(12);
  });

  it('Lv.9 不够门槛 → too-low', () => {
    const r = readRankSnapshot(契约者({ 头部: { 姓名: '张三', 等级: MIN_LV - 1, 称号: { 当前称号: { 名称: '无' } } } }));
    expect(r).toEqual({ ok: false, reason: 'too-low', lv: MIN_LV - 1 });
  });

  it('恰好 Lv.10 可以参与', () => {
    const r = readRankSnapshot(契约者({ 头部: { 姓名: '张三', 等级: MIN_LV, 称号: { 当前称号: { 名称: '无' } } } }));
    expect(r.ok).toBe(true);
  });

  it('等级无上限（超脱后的 Lv.99999 照样能参与）', () => {
    const r = readRankSnapshot(契约者({ 头部: { 姓名: '超脱者', 等级: 99999, 称号: { 当前称号: { 名称: '无' } } } }));
    expect(r.ok && r.payload.lv).toBe(99999);
  });

  it('等级非数字 → 按不够门槛处理，不上传', () => {
    const r = readRankSnapshot(契约者({ 头部: { 姓名: '张三', 等级: '未知', 称号: { 当前称号: { 名称: '无' } } } }));
    expect(r.ok).toBe(false);
  });

  it('姓名为空 → no-name（等级再高也不上传）', () => {
    const r = readRankSnapshot(契约者({ 头部: { 姓名: '', 等级: 50, 称号: { 当前称号: { 名称: '无' } } } }));
    expect(r).toEqual({ ok: false, reason: 'no-name', lv: 50 });
  });

  it('存档整个缺失 → no-name，不抛错', () => {
    expect(readRankSnapshot(undefined).ok).toBe(false);
    expect(readRankSnapshot(null).ok).toBe(false);
    expect(readRankSnapshot({}).ok).toBe(false);
  });

  it('称号/职业结构缺失 → 用「无称号」「无职业」兜底，不影响上传', () => {
    const r = readRankSnapshot({ 头部: { 姓名: '张三', 等级: 30 }, 职业: {} });
    expect(r.ok).toBe(true);
    expect(r.ok && r.payload.title).toBe('无称号');
    expect(r.ok && r.payload.job).toBe('无职业');
  });
});

describe('rankText · 名次文案', () => {
  it('上榜 → 第 N 名 · 共 M 人', () => {
    expect(rankText(3, 128)).toBe('第 3 名 · 共 128 人');
  });
  it('没上传过（rank 为 0）→ 未上榜', () => {
    expect(rankText(0, 128)).toBe('未上榜');
  });
  it('空榜（total 为 0）→ 未上榜', () => {
    expect(rankText(0, 0)).toBe('未上榜');
  });
});

function 条目(name: string, lv: number, updated = 0): RankEntry {
  return { name, lv, title: '无称号', job: '无职业', updated };
}

/** 造一个「前 TOP_N 名」的榜，等级从 100 递减 */
function 满榜(over: Partial<RankBoard> = {}): RankBoard {
  const list = Array.from({ length: TOP_N }, (_, i) => 条目('玩家' + (i + 1), 100 - i, i));
  return { list, total: TOP_N, me: null, near: [], ...over };
}

describe('boardRows · 榜单展示模型', () => {
  it('榜上不足 TOP_N 人 → 只出这么多行，名次连续', () => {
    const rows = boardRows({
      list: [条目('甲', 30, 1), 条目('乙', 20, 2)],
      total: 2,
      me: null,
      near: [],
    });
    expect(rows.map(r => (r.kind === 'entry' ? r.rank : 'gap'))).toEqual([1, 2]);
  });

  it('我在前 TOP_N 内 → 高亮我那一行，没有 gap', () => {
    const board = 满榜({
      me: { rank: 3, entry: 条目('我', 97, 2) },
      list: 满榜().list.map((e, i) => (i === 2 ? 条目('我', 97, 2) : e)),
    });
    const rows = boardRows(board);
    expect(rows.some(r => r.kind === 'gap')).toBe(false);
    const mine = rows.filter(r => r.kind === 'entry' && r.mine);
    expect(mine).toHaveLength(1);
    expect(mine[0].kind === 'entry' && mine[0].rank).toBe(3);
  });

  it(`我第 ${TOP_N + 1} 名 → 前 ${TOP_N} 名 + gap + 邻居（#21/#22，#20 不重复出现）`, () => {
    const board = 满榜({
      total: 40,
      me: { rank: TOP_N + 1, entry: 条目('我', 80, 99) },
      near: [
        { rank: TOP_N + 1, entry: 条目('我', 80, 99) },
        { rank: TOP_N + 2, entry: 条目('下一个', 79, 98) },
      ],
    });
    const rows = boardRows(board);
    const ranks = rows.map(r => (r.kind === 'entry' ? r.rank : 'gap'));
    expect(ranks).toEqual([...Array.from({ length: TOP_N }, (_, i) => i + 1), 'gap', TOP_N + 1, TOP_N + 2]);
    // #20 只在榜单区出现一次
    expect(ranks.filter(r => r === TOP_N)).toHaveLength(1);
    expect(rows.filter(r => r.kind === 'entry' && r.mine).map(r => r.rank)).toEqual([TOP_N + 1]);
  });

  it('我是最后一名 → 邻居只有前一名 + 我，没有后一名', () => {
    const board = 满榜({
      total: 22,
      me: { rank: 22, entry: 条目('我', 50, 99) },
      near: [
        { rank: 21, entry: 条目('前一名', 51, 98) },
        { rank: 22, entry: 条目('我', 50, 99) },
      ],
    });
    const rows = boardRows(board);
    const tail = rows.slice(-3).map(r => (r.kind === 'entry' ? r.rank : 'gap'));
    expect(tail).toEqual(['gap', 21, 22]);
    expect(rows.at(-1)?.kind === 'entry' && rows.at(-1)?.mine).toBe(true);
  });

  it('服务器没回邻居但我在 TOP_N 外 → 至少把「我」那一行补上，不能让我看不见自己', () => {
    const board = 满榜({ total: 40, me: { rank: 33, entry: 条目('我', 60, 99) }, near: [] });
    const rows = boardRows(board);
    expect(rows.at(-1)).toMatchObject({ kind: 'entry', rank: 33, mine: true });
  });

  it('空榜 → 零行，不抛错', () => {
    expect(boardRows({ list: [], total: 0, me: null, near: [] })).toEqual([]);
  });
});
