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
    // 关键：必须过一遍 JSON 序列化边界 —— 真实场景里脚本变量就是 JSON 存的。
    // 直接按引用存的话，写侧漏掉 Set→数组 转换测试也照样绿（Set 存引用还是 Set）。
    (globalThis as any).replaceVariables = (v: any) => { 存的 = v?.战斗 ? JSON.parse(JSON.stringify(v.战斗)) : null; };

    const 原 = 造状态();
    await 写战斗状态(原);
    const 读回 = await 读战斗状态();

    expect(读回).not.toBe(null);
    expect(读回!.回合).toBe(3);
    expect(读回!.单位['契约者'].资源['保存']).toBe(12);
    expect(读回!.单位['契约者'].词条 instanceof Set).toBe(true);
    expect(读回!.单位['契约者'].词条.has('不可被常规攻击命中')).toBe(true);
    // 落盘的是数组，不是 Set（Set 经 JSON 会变 {}）
    expect(Array.isArray(存的.单位['契约者'].词条)).toBe(true);
  });

  it('写入 null → 清除战斗键，但保留同 scope 的设置键', async () => {
    let 写入的: any = null;
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 战斗: { 进行中: true }, 快路: { url: 'u' }, 强路: { url: 's' } });
    (globalThis as any).replaceVariables = (v: any) => { 写入的 = v; };

    await 写战斗状态(null);
    // 战斗键被真删掉（不是写成 undefined 靠 JSON 丢弃）
    expect(写入的 && '战斗' in 写入的).toBe(false);
    // 同 scope 的设置键必须活着（裁决 R2）
    expect(写入的?.快路?.url).toBe('u');
    expect(写入的?.强路?.url).toBe('s');
  });
});
