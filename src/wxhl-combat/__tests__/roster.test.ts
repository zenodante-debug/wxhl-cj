import { describe, expect, it } from 'vitest';
import { 读取可参战单位, 读取战斗单位 } from '../store';

describe('roster · 可参战单位列表', () => {
  it('MVU 有数据 → 展开四类容器', async () => {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: {
          头部: { 姓名: '青空黎', 阶位: '二阶', 等级: 25 },
          衍生属性: { HP_当前: 171, HP_最大: 270 },
          小队: { 成员: { 白露露: { 类型: '小队成员', 头部: { 阶位: '一阶', 等级: 8 }, 衍生属性: { HP_当前: 50, HP_最大: 50 } } } },
          其他契约者: {},
          副本角色: { 骨卫兵: { 类型: '精英', 头部: { 阶位: '二阶', 等级: 14 }, 衍生属性: { HP_当前: 96, HP_最大: 96 } } },
        },
      },
    });

    const 列表 = await 读取可参战单位();
    const 按id = Object.fromEntries(列表.map(u => [u.id, u]));

    expect(按id['契约者'].名称).toBe('青空黎');
    expect(按id['契约者'].默认阵营).toBe('我方');
    expect(按id['小队.成员.白露露'].默认阵营).toBe('我方');
    expect(按id['副本角色.骨卫兵'].默认阵营).toBe('敌方');
  });

  it('MVU 无契约者数据 → 空数组，不抛错（Review Focus 1）', async () => {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({ stat_data: {} });

    const 列表 = await 读取可参战单位();
    expect(列表).toEqual([]);
  });
});

describe('roster · 读取战斗单位（面板要读全）', () => {
  function 装MVU() {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: {
          头部: { 姓名: '青空黎', 阶位: '二阶' },
          属性: { 实际: { STR: 25, AGI: 20, CON: 20, PER: 15 } },
          // 衍生属性：防御/闪避/移动距离都是**含额外加成的总值**（卡片前端代算落盘）
          衍生属性: {
            HP_当前: 171, HP_最大: 270, MP_当前: 30, MP_最大: 40,
            耐力_当前: 200, 耐力_最大: 200,
            防御: 12, 闪避值: 18, 移动距离: 45,
          },
        },
      },
    });
  }

  it('显示名 = 头部.姓名（不是「契约者」占位）', async () => {
    装MVU();
    const u = await 读取战斗单位('契约者');
    expect(u.名称).toBe('青空黎');
  });

  it('防御 / 闪避值 / 移动距离 直接读衍生属性的总值（含额外加成，不要自己再加）', async () => {
    装MVU();
    const u = await 读取战斗单位('契约者');

    expect(u.防御).toBe(12);
    expect(u.闪避值).toBe(18);
    expect(u.移动距离).toBe(45);
    expect(u.属性.实际).toEqual({ STR: 25, AGI: 20, CON: 20, PER: 15 });
  });

  it('卡里的移动距离还没代算（=0）→ 按公式现算（5 + AGI修正）', async () => {
    装MVU();
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: {
          头部: { 姓名: '青空黎', 阶位: '一阶' },
          属性: { 实际: { STR: 5, AGI: 5, CON: 5, PER: 5 } },
          衍生属性: { HP_当前: 10, HP_最大: 10, 移动距离: 0 },
        },
      },
    });

    const u = await 读取战斗单位('契约者');
    expect(u.移动距离).toBe(5); // 5 + AGI修正(5,一阶)=5+0
  });

  it('姓名是空的 → 退回 id 末段', async () => {
    装MVU();
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: { 头部: { 阶位: '一阶' }, 副本角色: { 骨卫兵: { 类型: '精英', 头部: { 阶位: '二阶' }, 衍生属性: { HP_当前: 1, HP_最大: 1 } } } },
      },
    });

    const u = await 读取战斗单位('副本角色.骨卫兵', '敌方');
    expect(u.名称).toBe('骨卫兵');
  });
});
