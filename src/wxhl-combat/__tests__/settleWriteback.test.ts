import { describe, expect, it } from 'vitest';
import { 写回战斗结果 } from '../store';
import type { 战斗状态 } from '../types';

describe('settleWriteback · MVU 写回', () => {
  it('只写 *_当前 与 特殊状态，不写 *_最大（铁律）', async () => {
    const 写入: any[] = [];
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).Mvu = {
      replaceMvuData: async (data: any) => { 写入.push(data); },
      getMvuData: () => ({ stat_data: { 契约者: { 衍生属性: { HP_当前: 171, HP_最大: 270 }, 状态: { 特殊状态: {} } } } }),
    };

    const 状态: 战斗状态 = {
      进行中: false, 回合: 3, 先攻: [], 领域: [],
      单位: {
        契约者: { id: '契约者', 阵营: '我方', 类型: '玩家', 属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } }, 阶位: '一阶', HP_当前: 171, HP_最大: 270, MP_当前: 50, MP_最大: 50, 耐力_当前: 100, 耐力_最大: 100, 防御: 0, 闪避值: 10, 距离: 0, 行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 }, 额度: 0, 冷却: {}, 护盾: 0, 架势: null, 状态: [{ 名: '流血', 持续: 2 }, { 名: '元素崩坏', 持续: 5, 词条: ['禁回复HP', '禁回复MP'] }], 濒死: null, 资源: {}, 词条: new Set(), 技能: {} },
      },
      待决: null,
    };

    // 模拟战斗后 HP_当前 变成 124
    await 写回战斗结果(状态, { '契约者': { HP_当前: 124 } });

    expect(写入.length).toBeGreaterThan(0);
    const 写回 = JSON.stringify(写入);
    expect(写回).toContain('HP_当前');
    // 铁律：只写 *_当前，严禁写 *_最大 —— 原有 HP_最大 必须原样保留（270），不被改写
    expect(写回).toContain('"HP_当前":124');
    expect(写回).toContain('"HP_最大":270');
    expect(写回).not.toContain('"HP_最大":124');
    // 特殊状态写回
    expect(写回).toContain('流血');
    // 规范编码器 buff转字符串：词条（引擎段）必须一并写回，不得丢失
    expect(写回).toContain('元素崩坏');
    expect(写回).toContain('禁回复HP');
    expect(写回).toContain('禁回复MP');
  });

  // ================================================================
  // 玩家实测（2026-10-11）：
  //   「特殊资源好像是虽然可以识别，但是无法使用。正常来说，特殊资源是写在特殊状态栏里的，
  //     表现在战斗里，角色详情的状态与增益里，但是之前都没有写入。
  //     比如魔网法师的【环位】、或者什么狂战士的【愤怒】资源……」
  //
  // 根因：权威 schema 里**没有 `资源` 字段**（状态Schema 只有 生命状态 + 特殊状态），
  // 而 `写回战斗结果` 只写 衍生属性.*_当前 与 状态.特殊状态 ——
  // 自定义资源（`战斗单位.资源`）**从来没进过卡面**，所以"特殊状态栏"里永远看不到它。
  // ================================================================
  it('**自定义资源也写进「特殊状态」**（schema 里没有 资源 字段，它只能住这儿）', async () => {
    const 写入: any[] = [];
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).Mvu = {
      replaceMvuData: async (data: any) => { 写入.push(data); },
      getMvuData: () => ({ stat_data: { 契约者: { 衍生属性: { HP_当前: 100 }, 状态: { 特殊状态: {} } } } }),
    };

    const 状态: 战斗状态 = {
      进行中: false, 回合: 3, 先攻: [], 领域: [],
      单位: {
        契约者: {
          id: '契约者', 阵营: '我方', 类型: '玩家', 属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } }, 阶位: '一阶',
          HP_当前: 100, HP_最大: 270, MP_当前: 50, MP_最大: 50, 耐力_当前: 100, 耐力_最大: 100,
          防御: 0, 闪避值: 10, 距离: 0, 行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 }, 额度: 0,
          冷却: {}, 护盾: 0, 架势: null, 状态: [], 濒死: null,
          资源: { 愤怒: 5, 环位: 2 },
          词条: new Set(), 技能: {},
        },
      },
      待决: null,
    };

    await 写回战斗结果(状态, { '契约者': { HP_当前: 100 } });

    const 特殊状态 = 写入[写入.length - 1].stat_data.契约者.状态.特殊状态;
    // 编码用 buffMapper 的「N层」人类段 —— 纯数字、卡面读得懂，将来接上读回路也能原样解析
    expect(特殊状态['愤怒']).toContain('5');
    expect(特殊状态['环位']).toContain('2');
  });

  it('资源与状态**同名时不互相覆盖**（状态优先 —— 战斗状态才是那一场的事实）', async () => {
    const 写入: any[] = [];
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).Mvu = {
      replaceMvuData: async (data: any) => { 写入.push(data); },
      getMvuData: () => ({ stat_data: { 契约者: { 衍生属性: {}, 状态: { 特殊状态: {} } } } }),
    };

    const 状态: 战斗状态 = {
      进行中: false, 回合: 1, 先攻: [], 领域: [],
      单位: {
        契约者: {
          id: '契约者', 阵营: '我方', 类型: '玩家', 属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } }, 阶位: '一阶',
          HP_当前: 100, HP_最大: 100, MP_当前: 0, MP_最大: 0, 耐力_当前: 0, 耐力_最大: 0,
          防御: 0, 闪避值: 0, 距离: 0, 行动槽: { 主要: 0, 次要: 0, 移动: 0, 反应: 0, 免费: 0 }, 额度: 0,
          冷却: {}, 护盾: 0, 架势: null, 状态: [{ 名: '愤怒', 持续: 3, 层数: 2 }], 濒死: null,
          资源: { 愤怒: 7 },
          词条: new Set(), 技能: {},
        },
      },
      待决: null,
    };

    await 写回战斗结果(状态, {});

    const 特殊状态 = 写入[写入.length - 1].stat_data.契约者.状态.特殊状态;
    // 状态那条带着 层数/持续/词条（引擎段的账），信息更多 —— 不能被资源的 "7层" 盖掉
    expect(特殊状态['愤怒']).toContain('持续3回合');
  });

  it('非有限值的资源直接跳过（NaN 不许跟着写进卡面）', async () => {    const 写入: any[] = [];
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).Mvu = {
      replaceMvuData: async (data: any) => { 写入.push(data); },
      getMvuData: () => ({ stat_data: { 契约者: { 衍生属性: {}, 状态: { 特殊状态: {} } } } }),
    };

    const 状态: 战斗状态 = {
      进行中: false, 回合: 1, 先攻: [], 领域: [],
      单位: {
        契约者: {
          id: '契约者', 阵营: '我方', 类型: '玩家', 属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } }, 阶位: '一阶',
          HP_当前: 1, HP_最大: 1, MP_当前: 0, MP_最大: 0, 耐力_当前: 0, 耐力_最大: 0,
          防御: 0, 闪避值: 0, 距离: 0, 行动槽: { 主要: 0, 次要: 0, 移动: 0, 反应: 0, 免费: 0 }, 额度: 0,
          冷却: {}, 护盾: 0, 架势: null, 状态: [], 濒死: null,
          资源: { 坏资源: Number.NaN, 好资源: 3 },
          词条: new Set(), 技能: {},
        },
      },
      待决: null,
    };

    await 写回战斗结果(状态, {});

    const 特殊状态 = 写入[写入.length - 1].stat_data.契约者.状态.特殊状态;
    expect(特殊状态['坏资源']).toBeUndefined();
    expect(Object.keys(特殊状态)).toEqual(['好资源']);
  });
});

// 玩家口径（2026-10-11）：「快捷物品不要放进"特殊资源"啊，特殊资源是单指那些层数、状态、
//   施法的资源等等。」—— 所以快捷物品**既不能显示在「资源:」那一行，也不能被写进
//   卡面的「特殊状态栏」**（那是特殊资源的地盘）。它有自己的写回路径：背包。
describe('快捷物品不许混进「特殊状态」', () => {
  it('`单位.快捷物品` 不会被写进 状态.特殊状态', async () => {
    const 写入: any[] = [];
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).Mvu = {
      replaceMvuData: async (data: any) => { 写入.push(data); },
      getMvuData: () => ({ stat_data: { 契约者: { 衍生属性: {}, 状态: { 特殊状态: {} } } } }),
    };

    const 状态: 战斗状态 = {
      进行中: false, 回合: 1, 先攻: [], 领域: [],
      单位: {
        契约者: {
          id: '契约者', 阵营: '我方', 类型: '玩家', 属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } }, 阶位: '一阶',
          HP_当前: 100, HP_最大: 100, MP_当前: 0, MP_最大: 0, 耐力_当前: 0, 耐力_最大: 0,
          防御: 0, 闪避值: 0, 距离: 0, 行动槽: { 主要: 0, 次要: 0, 移动: 0, 反应: 0, 免费: 0 }, 额度: 0,
          冷却: {}, 护盾: 0, 架势: null, 状态: [], 濒死: null, 资源: {}, 快捷物品: { 绷带: 3 },
          词条: new Set(), 技能: {},
        },
      },
      待决: null,
    };

    await 写回战斗结果(状态, {});

    const 回 = JSON.stringify(写入[写入.length - 1]);
    expect(回).not.toContain('绷带');
  });
});
