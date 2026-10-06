import { describe, expect, it } from 'vitest';
import { 读战斗状态, 写战斗状态 } from '../store';
import type { 战斗状态 } from '../types';

function 造状态(): 战斗状态 {
  return {
    进行中: true, 回合: 3, 先攻: ['契约者'], 领域: [],
    单位: { 契约者: { id: '契约者', 阵营: '我方', 类型: '玩家', 属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } }, 阶位: '一阶', HP_当前: 100, HP_最大: 100, MP_当前: 50, MP_最大: 50, 耐力_当前: 100, 耐力_最大: 100, 防御: 0, 闪避值: 10, 距离: 0, 行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 }, 额度: 45, 冷却: {}, 护盾: 10, 架势: null, 状态: [], 濒死: null, 资源: { 保存: 12 }, 词条: new Set(['不可被常规攻击命中']) } },
    待决: null,
  };
}

describe('persistence · 战斗状态持久化', () => {
  it('写入后能读回（词条 Set ↔ 数组互转）', async () => {
    let 存的: any = null;
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => (存的 ? { 战斗: 存的 } : {});
    (globalThis as any).replaceVariables = (v: any) => { 存的 = v?.战斗 ?? null; };

    const 原 = 造状态();
    await 写战斗状态(原);
    const 读回 = await 读战斗状态();

    expect(读回).not.toBe(null);
    expect(读回!.回合).toBe(3);
    expect(读回!.单位['契约者'].资源['保存']).toBe(12);
    expect(读回!.单位['契约者'].词条 instanceof Set).toBe(true);
    expect(读回!.单位['契约者'].词条.has('不可被常规攻击命中')).toBe(true);
  });

  it('写入 null → 清除', async () => {
    let 存的: any = { 进行中: true };
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 战斗: 存的 });
    (globalThis as any).replaceVariables = () => { 存的 = null; };

    await 写战斗状态(null);
    const 读回 = await 读战斗状态();
    expect(读回).toBe(null);
  });
});
