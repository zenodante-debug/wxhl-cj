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
});
