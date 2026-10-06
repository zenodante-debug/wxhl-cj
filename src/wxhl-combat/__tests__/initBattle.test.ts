import { describe, expect, it } from 'vitest';
import { 初始化战斗状态 } from '../engine/setup';
import { 读取单位效果源, 读取战斗单位 } from '../store';
import type { 战斗单位 } from '../types';

function 造单位(id: string, AGI: number, 阶位: string): 战斗单位 {
  return {
    id, 阵营: id === '契约者' ? '我方' : '敌方', 类型: id === '契约者' ? '玩家' : '杂兵',
    属性: { 实际: { STR: 10, AGI, CON: 10, PER: 10 } }, 阶位,
    HP_当前: 100, HP_最大: 100, MP_当前: 50, MP_最大: 50,
    耐力_当前: 100, 耐力_最大: 100, 防御: 5, 闪避值: 10,
    距离: 0, 行动槽: { 主要: 0, 次要: 0, 移动: 0, 反应: 0, 免费: 999 },
    额度: 0, 冷却: {}, 护盾: 0, 架势: null, 状态: [], 濒死: null, 资源: {}, 词条: new Set(),
    技能: {},
  };
}

describe('setup · 初始化战斗状态', () => {
  it('回合从 1 开始，进行中为 true，待决为 null', () => {
    const 状态 = 初始化战斗状态([造单位('契约者', 10, '一阶'), 造单位('副本角色.骨卫兵', 10, '一阶')], 20);
    expect(状态.回合).toBe(1);
    expect(状态.进行中).toBe(true);
    expect(状态.待决).toBe(null);
    expect(状态.领域).toEqual([]);
  });

  it('先攻降序排列，且先攻表里放的是单位 id（变量路径全名）', () => {
    // 五阶 AGI=150 → 修正 1595，必胜一阶 AGI=10 → 修正 5（1d20 最多 20）
    const 状态 = 初始化战斗状态([造单位('契约者', 10, '一阶'), 造单位('副本角色.骨卫兵', 150, '五阶')], 20);
    expect(状态.先攻[0]).toBe('副本角色.骨卫兵');
    expect(状态.先攻).toHaveLength(2);
  });

  it('契约者本体距离为 0，其余单位为开场距离', () => {
    const 状态 = 初始化战斗状态([造单位('契约者', 10, '一阶'), 造单位('副本角色.骨卫兵', 10, '一阶')], 47);
    // 状态.单位 的键用短名（与 loop/enemyTactics/persistence 的既有 fixture 一致）；
    // id 字段仍是变量路径全名。见 brief 的「键的选择」段。
    expect(状态.单位['契约者'].距离).toBe(0);
    expect(状态.单位['骨卫兵'].距离).toBe(47);
    expect(状态.单位['骨卫兵'].id).toBe('副本角色.骨卫兵');
  });

  it('行动槽重置为满（免费不重置）', () => {
    const 状态 = 初始化战斗状态([造单位('契约者', 10, '一阶')], 10);
    expect(状态.单位['契约者'].行动槽).toEqual({ 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 });
  });
});

describe('store · 读取战斗单位 · 主武器', () => {
  function 挂变量(主武器: any) {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: {
          头部: { 阶位: '一阶' },
          属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } },
          衍生属性: {},
          装备: { 主武器 },
        },
      },
    });
  }

  it('读实体.装备.主武器 的 伤害骰/倍率/强化等级', async () => {
    挂变量({ 名称: '骨刃', 伤害骰: '2d8', 倍率: 1.5, 强化等级: 2 });

    const u = await 读取战斗单位('契约者');

    expect(u.主武器).toEqual({ 伤害骰: '2d8', 倍率: 1.5, 强化等级: 2 });
  });

  it('未装备（名称「无」）/ 伤害骰是「无」/ 非法骰式 → 主武器 undefined', async () => {
    挂变量({ 名称: '无', 伤害骰: '2d8', 倍率: 1, 强化等级: 0 });
    expect((await 读取战斗单位('契约者')).主武器).toBeUndefined();

    挂变量({ 名称: '骨刃', 伤害骰: '无', 倍率: 1, 强化等级: 0 });
    expect((await 读取战斗单位('契约者')).主武器).toBeUndefined();

    挂变量({ 名称: '骨刃', 伤害骰: '2x8', 倍率: 1, 强化等级: 0 });
    expect((await 读取战斗单位('契约者')).主武器).toBeUndefined();
  });
});

describe('store · 读取单位效果源', () => {
  it('把契约者本体的通用技能/职业/装备/天赋/血统拍平成一维数组', async () => {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: {
          头部: {
            天赋: { 名称: '回廊亲和', 效果: { 描述: 'x' } },
            血统: { 名称: '无' },
          },
          通用技能: {
            裂骨重击: { 类型: '主动', 行动类型: '主要行动', 关联属性: 'STR', 消耗: 'MP 10', 冷却: '2回合', 射程: '近战', 目标: '单体', 效果: { 伤害: '2d6' } },
          },
          职业: {
            职业技能: { 崩山: { 类型: '主动', 行动类型: '主要行动', 关联属性: 'STR', 效果: {} } },
            传承技能: {},
          },
          装备: {
            主武器: { 名称: '骨刃', 主属性: 'STR', 效果: { 词条: '破甲' } },
            头部: '无',
            躯干: { 名称: '无' },
          },
        },
      },
    });

    const 出 = await 读取单位效果源('契约者');
    const 名 = 出.map(x => x.名称);

    expect(名).toContain('裂骨重击');
    expect(名).toContain('崩山');
    expect(名).toContain('骨刃（主武器）');
    expect(名).toContain('回廊亲和（天赋）');
    // 「无」血统 / 空槽 / 名称为「无」的槽都被丢掉
    expect(名).not.toContain('无');
    expect(名.some(n => n.includes('血统'))).toBe(false);
    expect(名.some(n => n.includes('头部'))).toBe(false);
    expect(名.some(n => n.includes('躯干'))).toBe(false);
    // 每条都带齐翻译器吃的一维字段
    expect(出[0]).toHaveProperty('名称');
    expect(出[0]).toHaveProperty('类型');
    expect(出[0]).toHaveProperty('行动类型');
    expect(出[0]).toHaveProperty('关联属性');
    expect(出[0]).toHaveProperty('阶位');
    expect(出[0]).toHaveProperty('消耗');
    expect(出[0]).toHaveProperty('冷却');
    expect(出[0]).toHaveProperty('射程');
    expect(出[0]).toHaveProperty('目标');
    expect(出[0]).toHaveProperty('效果');
  });

  it('下钻副本角色实体，拍平其技能与装备', async () => {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: {
          副本角色: {
            骨卫兵: {
              头部: { 阶位: '二阶' },
              通用技能: { 骨爪撕裂: { 类型: '主动', 行动类型: '主要行动', 关联属性: 'STR', 射程: '近战', 目标: '单体', 效果: {} } },
              装备: { 主武器: { 名称: '骨刃', 主属性: 'STR', 效果: {} } },
            },
          },
        },
      },
    });

    const 出 = await 读取单位效果源('副本角色.骨卫兵');
    const 名 = 出.map(x => x.名称);
    expect(名).toContain('骨爪撕裂');
    expect(名).toContain('骨刃（主武器）');
  });

  it('无契约者数据 → 抛错（与读取战斗单位一致的失败语义）', async () => {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({ stat_data: {} });
    await expect(读取单位效果源('契约者')).rejects.toThrow('MVU 变量中没有契约者数据');
  });
});
