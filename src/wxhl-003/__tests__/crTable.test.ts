import { describe, expect, it } from 'vitest';
import { CR表, CR区间, 回廊态度, 生机评估, 基准等级, 基准等级偏移, 结算倍率 } from '../crTable';

/**
 * 本次整改的正题: 旧实现用 `Math.floor(CR)` 分档（那是为补**旧表**的空洞）, 而新表是
 * **连续区间** —— floor 在 4.1~4.9 / 6.1~6.9 / 8.1~8.9 三处会落到低一档。
 * 下面每一条都按**值**断言, 且都钉住了「按区间判」这一件事。
 */
describe('CR区间 · 区间边界（逐条）', () => {
  const 态度 = (cr: number) => CR区间(cr).态度;

  it('用户给的十条边界逐条对上', () => {
    expect(态度(2.9)).toBe('漠视');
    expect(态度(3.0)).toBe('观察');
    expect(态度(4.0)).toBe('观察');
    expect(态度(4.1)).toBe('关注');
    expect(态度(6.0)).toBe('关注');
    expect(态度(6.1)).toBe('重视');
    expect(态度(8.0)).toBe('重视');
    expect(态度(8.1)).toBe('期待');
    expect(态度(9.9)).toBe('期待');
    expect(态度(10.0)).toBe('炼狱');
  });

  it('floor 会错档的三段区间内部值, 全部按新表判（4.1~4.9 / 6.1~6.9 / 8.1~8.9）', () => {
    // 旧实现: floor(4.3)=4 → 观察; floor(6.2)=6 → 关注; floor(8.4)=8 → 重视 —— 三条全错。
    // CR 变动是 ±0.5/±0.3, 4.3 / 6.2 / 8.4 这类值非常容易落到, 所以这段是本次的真 bug。
    for (const cr of [4.1, 4.3, 4.9]) expect(态度(cr)).toBe('关注');
    for (const cr of [6.1, 6.2, 6.9]) expect(态度(cr)).toBe('重视');
    for (const cr of [8.1, 8.4, 8.9]) expect(态度(cr)).toBe('期待');
  });

  it('区间下界含入（1.0 是首档, 不是表外）', () => {
    expect(态度(1.0)).toBe('漠视');
    expect(基准等级偏移(1.0)).toBe(0);
  });

  it('0.1 的整数倍（CR 的实际取值粒度）全域都能查到档, 不会抛错', () => {
    for (let i = 10; i <= 100; i++) {
      const cr = i / 10;
      expect(() => CR区间(cr)).not.toThrow();
      expect(CR表).toContain(CR区间(cr));
    }
  });
});

describe('CR区间 · 区间缝隙归下一档（保守侧）', () => {
  // 表是 [1.0,2.9] [3.0,4.0] [4.1,6.0] [6.1,8.0] [8.1,9.9] [10.0,10.0],
  // 相邻档之间有 0.1 宽的缝。CR 的实际取值是 k×0.5 + m×0.3, 即 0.1 的整数倍,
  // 所以缝里的值**不可达** —— 但行为必须定义且钉住, 否则将来 CR 算法一改就会静默错档。
  it('2.95 / 4.05 / 6.05 / 8.05 / 9.95 一律归**下一档**, 不是上一档', () => {
    expect(CR区间(2.95).态度).toBe('观察');
    expect(CR区间(4.05).态度).toBe('关注');
    expect(CR区间(6.05).态度).toBe('重视');
    expect(CR区间(8.05).态度).toBe('期待');
    expect(CR区间(9.95).态度).toBe('炼狱');
  });

  it('缝隙的偏移也跟着下一档走（不是上一档）', () => {
    expect(基准等级偏移(2.95)).toBe(2);    // 不是 0
    expect(基准等级偏移(4.05)).toBe(4);    // 不是 2
    expect(基准等级偏移(6.05)).toBe(8);    // 不是 4
    expect(基准等级偏移(8.05)).toBe(16);   // 不是 8
    expect(基准等级偏移(9.95)).toBe(32);   // 不是 16
  });
});

describe('CR区间 · 下限与稳健性（不抛错）', () => {
  it('0 / 负数 / NaN 一律归首档（漠视 = 下限）', () => {
    // NaN 单列: `NaN <= x` 恒 false, 不显式挡的话它会一路穿到**末档**（炼狱 ×15.0）——
    // 一个「读坏了的值」反而拿到最狠的倍率, 方向正好反了。
    expect(CR区间(0).态度).toBe('漠视');
    expect(CR区间(-1).态度).toBe('漠视');
    expect(CR区间(-0.5).态度).toBe('漠视');
    expect(CR区间(-Infinity).态度).toBe('漠视');
    expect(CR区间(NaN).态度).toBe('漠视');
    expect(CR区间(NaN).结算倍率).toBe(1.0);
    expect(CR区间(NaN).基准等级偏移).toBe(0);
  });

  it('超出上限的值归末档（炼狱）, 不抛错', () => {
    expect(CR区间(10.5).态度).toBe('炼狱');
    expect(CR区间(99).态度).toBe('炼狱');
    expect(CR区间(Infinity).态度).toBe('炼狱');
  });
});

describe('CR区间 · 难度列只剩基准等级偏移（用户删掉了词条与属性强化）', () => {
  it('六档偏移逐条对上', () => {
    expect(基准等级偏移(1.0)).toBe(0);
    expect(基准等级偏移(3.0)).toBe(2);
    expect(基准等级偏移(4.1)).toBe(4);
    expect(基准等级偏移(6.1)).toBe(8);
    expect(基准等级偏移(8.1)).toBe(16);
    expect(基准等级偏移(10.0)).toBe(32);
  });

  it('偏移随 CR 单调不降（没有哪一档会掉回去）', () => {
    let 上 = -Infinity;
    for (const 档 of CR表) {
      expect(档.基准等级偏移).toBeGreaterThanOrEqual(上);
      上 = 档.基准等级偏移;
    }
  });

  it('每档只有这四个口径字段, 没有词条 / 属性强化之类的残留列', () => {
    const 允许 = new Set(['下界', '上界', '态度', '生机评估', '基准等级偏移', '结算倍率']);
    for (const 档 of CR表) {
      for (const k of Object.keys(档)) expect(允许.has(k)).toBe(true);
    }
  });
});

describe('CR区间 · 结算倍率六档逐条', () => {
  it('100% / 120% / 150% / 300% / 600% / 1500%', () => {
    expect(结算倍率(1.0)).toBe(1.0);
    expect(结算倍率(2.9)).toBe(1.0);
    expect(结算倍率(3.0)).toBe(1.2);
    expect(结算倍率(4.0)).toBe(1.2);
    expect(结算倍率(4.1)).toBe(1.5);
    expect(结算倍率(6.0)).toBe(1.5);
    expect(结算倍率(6.1)).toBe(3.0);
    expect(结算倍率(8.0)).toBe(3.0);
    expect(结算倍率(8.1)).toBe(6.0);
    expect(结算倍率(9.9)).toBe(6.0);
    expect(结算倍率(10.0)).toBe(15.0);
  });

  it('倍率随 CR 单调不降', () => {
    let 上 = -Infinity;
    for (const 档 of CR表) {
      expect(档.结算倍率).toBeGreaterThanOrEqual(上);
      上 = 档.结算倍率;
    }
  });
});

describe('CR区间 · 生机评估六档逐条', () => {
  it('正常运转 / 略有风险 / 危机四伏 / 险象环生 / 九死一生 / 十死无生', () => {
    expect(生机评估(1.0)).toBe('正常运转');
    expect(生机评估(2.9)).toBe('正常运转');
    expect(生机评估(3.0)).toBe('略有风险');
    expect(生机评估(4.1)).toBe('危机四伏');
    expect(生机评估(6.1)).toBe('险象环生');
    expect(生机评估(8.1)).toBe('九死一生');
    expect(生机评估(10.0)).toBe('十死无生');
  });

  it('态度与生机评估是两个不同的口径, 不许互相顶替', () => {
    // 态度进结算（面板 ## CR态度 / 存档 头部.回廊态度）; 生机评估只进 prompt 做氛围。
    // 两列都从同一档取, 但值必须各自独立 —— 把一列写成另一列时, 这里要红。
    for (const 档 of CR表) {
      expect(档.态度).not.toBe('');
      expect(档.生机评估).not.toBe('');
      expect(档.态度).not.toBe(档.生机评估);
      expect(回廊态度(档.下界)).toBe(档.态度);
      expect(生机评估(档.下界)).toBe(档.生机评估);
    }
  });
});

describe('基准等级 · 两处调用点的唯一来源', () => {
  it('基准等级 = 玩家等级 + CR 档偏移（不是裸的玩家等级）', () => {
    expect(基准等级(11, 4.5)).toBe(15);    // 关注档 +4
    expect(基准等级(11, 1.0)).toBe(11);    // 漠视档 +0
    expect(基准等级(11, 3.0)).toBe(13);    // 观察档 +2
    expect(基准等级(11, 6.1)).toBe(19);    // 重视档 +8
    expect(基准等级(11, 8.1)).toBe(27);    // 期待档 +16
    expect(基准等级(11, 10.0)).toBe(43);   // 炼狱档 +32
    // 反退化: 三档以上都真正加了偏移, 不是「怎么写都等于玩家等级」
    expect(基准等级(11, 4.5)).not.toBe(11);
    expect(基准等级(11, 10.0)).not.toBe(11);
  });

  it('同一组输入反复调必得同一结果（同源函数本身）', () => {
    // 「同源」保证的是这一点: 只要 mapToVariables 与 buildEnemyPrompt 都调它,
    // 写进存档的基准等级与敌人按以生成的基准等级就不可能漂移。
    for (const cr of [1.0, 2.9, 3.0, 4.1, 4.3, 6.2, 8.4, 9.9, 10.0]) {
      expect(基准等级(37, cr)).toBe(基准等级(37, cr));
      expect(基准等级(37, cr)).toBe(37 + 基准等级偏移(cr));
    }
  });

  it('偏移恒为非负整数（写进存档的是等级, 不该出现小数/负数）', () => {
    for (const 档 of CR表) {
      expect(Number.isInteger(档.基准等级偏移)).toBe(true);
      expect(档.基准等级偏移).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('CR表 · 表自身的结构不变量', () => {
  it('上界严格递增、首档从 1.0 起、末档上界为 10.0', () => {
    // 不变量一旦破了, `CR区间` 的「第一个 上界 >= cr」就会静默命中错档
    expect(CR表[0].下界).toBe(1.0);
    expect(CR表[CR表.length - 1].上界).toBe(10.0);
    for (let i = 1; i < CR表.length; i++) {
      expect(CR表[i].上界).toBeGreaterThan(CR表[i - 1].上界);
      expect(CR表[i].下界).toBeGreaterThan(CR表[i - 1].上界);
    }
    expect(CR表.length).toBe(6);
  });

  it('每档的上界都能查到它自己那一档', () => {
    for (const 档 of CR表) expect(CR区间(档.上界)).toBe(档);
  });
});
