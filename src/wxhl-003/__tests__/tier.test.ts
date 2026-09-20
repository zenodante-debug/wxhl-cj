import { describe, expect, it } from 'vitest';
import { 归一位阶, tierIndexOf } from '../dice';
import { tierOf } from '../workshop';
import { TIER_ORDER } from '../data';

// ================================================================
// 阶位写法归一（唯一实现处: dice.ts:归一位阶）
//
// 覆盖要求来自用户口径: 「不管是 1阶 还是一阶, 都要算」—— 且不止这两种。
// 这里逐条钉住每种写法, 并钉住**五个调用点各自的失败策略互不统一**。
// ================================================================

describe('归一位阶 · 覆盖面（每种写法逐一断言）', () => {
  /** [输入, 期望下标 0..4] */
  const 认得的: [unknown, number][] = [
    // 汉字 + 阶
    ['一阶', 0], ['二阶', 1], ['三阶', 2], ['四阶', 3], ['五阶', 4],
    // 阿拉伯 + 阶
    ['1阶', 0], ['2阶', 1], ['3阶', 2], ['4阶', 3], ['5阶', 4],
    // 裸阿拉伯
    ['1', 0], ['2', 1], ['3', 2], ['4', 3], ['5', 4],
    // 裸汉字
    ['一', 0], ['二', 1], ['三', 2], ['四', 3], ['五', 4],
    // 带「第」
    ['第一阶', 0], ['第1阶', 0], ['第三阶', 2], ['第三', 2], ['第 5 阶', 4], ['第五階', 4],
    // 全角数字（中文输入法极易打出）
    ['１阶', 0], ['３阶', 2], ['５阶', 4], ['１', 0], ['５', 4], ['４', 3],
    // 繁体「階」
    ['一階', 0], ['1階', 0], ['三階', 2], ['五階', 4],
    // 「阶位」尾巴
    ['一阶位', 0], ['二阶位', 1], ['3階位', 2],
    // 前后 / 中间空白
    [' 三阶 ', 2], ['五\n', 4], ['\t2阶\t', 1], ['一 阶', 0], ['  5  ', 4],
    // 中文大写（可选覆盖）
    ['壹阶', 0], ['贰阶', 1], ['叁阶', 2], ['肆阶', 3], ['伍阶', 4],
    ['壹', 0], ['伍', 4], ['貳階', 1], ['參阶', 2],
    // 口语「两」/ 繁体「兩」
    ['两阶', 1], ['两', 1], ['兩階', 1],
    // 数字类型（AI 偶尔把 3 写成数字而非字符串）
    [1, 0], [3, 2], [5, 4],
  ];

  it.each(认得的)('%s → %i', (输入, 期望) => {
    expect(归一位阶(输入)).toBe(期望);
  });

  it('同一阶位的各种写法归到同一个值', () => {
    const 一阶的所有写法 = ['一阶', '1阶', '一', '1', '第一阶', '第1阶', '１阶', '１', '一階', '壹阶', '壹', ' 一阶 ', 1];
    for (const 写法 of 一阶的所有写法) expect(归一位阶(写法)).toBe(0);
    const 五阶的所有写法 = ['五阶', '5阶', '五', '5', '第五阶', '第5阶', '５阶', '５', '五階', '伍阶', '伍', 5];
    for (const 写法 of 五阶的所有写法) expect(归一位阶(写法)).toBe(4);
  });
});

describe('归一位阶 · 认不出的必须返回 undefined（不许瞎猜）', () => {
  const 认不出的: unknown[] = [
    '六阶', '6', '0', '', '无', '超脱', '不在副本中',
    // 越界 / 非阶位数字
    '7', '10阶', '10', '100', '3.5', '-1',
    // 认不出的词
    '七', '十', '十一', '初阶', '中阶', '进阶', '阶', '位阶', '阶位', '未知', 'n/a',
    // 纯空白
    ' ', '  \n ',
    // 非字符串 / 非数字
    undefined, null, true, false, {}, [], ['一阶'], NaN, Infinity,
  ];

  it.each(认不出的)('%p → undefined', (输入) => {
    expect(归一位阶(输入)).toBeUndefined();
  });
});

describe('五个调用点的失败策略互不统一（刻意如此）', () => {
  const 认不出的阶位 = ['六阶', '无', '', '不在副本中', '初阶'];

  it('tierIndexOf: 未知 → -1（保持）', () => {
    for (const 阶位 of [...认不出的阶位, '超脱']) expect(tierIndexOf(阶位)).toBe(-1);
  });

  it('tierOf: 未知 → 归末尾（保持返回 TIER_ORDER.length = 6）', () => {
    for (const 阶位 of 认不出的阶位) expect(tierOf(阶位)).toBe(TIER_ORDER.length);
    expect(TIER_ORDER.length).toBe(6); // 五个阶位 + 超脱
  });

  it('tierOf: 「超脱」是 TIER_ORDER 的合法成员（下标 5）, 不跟着垃圾值一起归末尾', () => {
    // 旧行为就是 5（TIER_ORDER.indexOf）; 归一化只加宽度, 不该让超脱掉到与「六阶」并列
    expect(tierOf('超脱')).toBe(5);
    expect(tierOf('超脱')).toBeLessThan(tierOf('六阶'));
    expect(tierOf('5阶')).toBeLessThan(tierOf('超脱'));
  });

  it('tierIndexOf 与 tierOf 在认得出的写法上一致', () => {
    for (const 写法 of ['一阶', '1阶', '一', '3', '第三阶', '５阶', '三階', '伍']) {
      expect(tierIndexOf(写法)).toBe(归一位阶(写法));
      expect(tierOf(写法)).toBe(归一位阶(写法));
    }
  });
});

describe('回归钉子（修之前必须是红的）', () => {
  it('tierOf 认汉字阶位 —— tierOf(\'一阶\') === tierOf(\'1阶\')', () => {
    // 修之前: tierOf 只认 TIER_ORDER 里的「1阶」形, 汉字一律落到末位 → 6 !== 0
    expect(tierOf('一阶')).toBe(tierOf('1阶'));
    expect(tierOf('三阶')).toBe(tierOf('3阶'));
    expect(tierOf('五阶')).toBe(tierOf('5阶'));
  });

  it('tierOf 的汉字写法落在正确下标, 不再一律归末尾', () => {
    expect(tierOf('一阶')).toBe(0);
    expect(tierOf('二阶')).toBe(1);
    expect(tierOf('三阶')).toBe(2);
    expect(tierOf('四阶')).toBe(3);
    expect(tierOf('五阶')).toBe(4);
  });

  it('loadContracts 承诺的「按阶位排序」真的生效（汉字与阿拉伯不再恒等）', () => {
    const 卡 = [
      { 阶位: '五阶', 等级: 9 },
      { 阶位: '一阶', 等级: 1 },
      { 阶位: '3阶', 等级: 5 },
      { 阶位: '三阶', 等级: 7 },
      { 阶位: '超脱', 等级: 9 },
    ];
    const 排 = [...卡].sort((a, b) => {
      const t = tierOf(a.阶位) - tierOf(b.阶位);
      return t !== 0 ? t : b.等级 - a.等级;
    });
    // 「一阶」在最前（修之前它和「五阶」同为 6, 与「超脱」并列末尾）;
    // 「三阶」与「3阶」同阶, 组内按等级降序 → 7 在 5 前
    expect(排.map(c => c.阶位)).toEqual(['一阶', '三阶', '3阶', '五阶', '超脱']);
    // 同阶的两种写法真的被排到了相邻位置（修之前它们分散在末尾, 与「一阶」相邻）
    expect(tierOf('三阶')).toBe(tierOf('3阶'));
  });
});

describe('isNewbieDungeon 跟着变宽（走的是 tierIndexOf）', () => {
  it('周期 1 且阶位写成「第三」/「３阶」/「壹阶」也算一阶', async () => {
    const { isNewbieDungeon } = await import('../dice');
    expect(isNewbieDungeon(1, '一阶')).toBe(true);
    expect(isNewbieDungeon(1, '1')).toBe(true);
    expect(isNewbieDungeon(1, '壹阶')).toBe(true);
    expect(isNewbieDungeon(1, '二阶')).toBe(false);
    expect(isNewbieDungeon(1, '超脱')).toBe(false);
  });
});
