import { describe, expect, it } from 'vitest';
import { 读取可参战单位 } from '../store';

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
