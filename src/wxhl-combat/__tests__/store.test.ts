import { describe, expect, it } from 'vitest';
import { 读取战斗单位 } from '../store';

// Mock 酒馆接口
(globalThis as any).waitGlobalInitialized = async () => {};
(globalThis as any).getVariables = () => ({
  stat_data: {
    契约者: {
      副本角色: {
        骨卫兵: {
          类型: '精英',
          头部: { 阶位: '二阶', 等级: 14 },
          属性: { 实际: { STR: 45, AGI: 16, CON: 30, PER: 16 } },
          衍生属性: { HP_当前: 96, HP_最大: 96 },
        },
      },
    },
  },
});

describe('store · 读取战斗单位', () => {
  it('从 MVU 变量读取副本角色', async () => {
    const 单位 = await 读取战斗单位('副本角色.骨卫兵');

    expect(单位.id).toBe('副本角色.骨卫兵');
    expect(单位.类型).toBe('精英');
    expect(单位.阵营).toBe('敌方');
  });

  it('读取不存在的单位应该抛错', async () => {
    await expect(读取战斗单位('副本角色.不存在')).rejects.toThrow('单位不存在');
  });

  it('读取三段路径（小队.成员.白露露）—— 容器路径段数可变', async () => {
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: {
          小队: {
            成员: {
              白露露: {
                类型: '小队成员',
                头部: { 阶位: '一阶', 等级: 8 },
                属性: { 实际: { STR: 12, AGI: 14, CON: 10, PER: 11 } },
                衍生属性: { HP_当前: 50, HP_最大: 50 },
              },
            },
          },
        },
      },
    });

    const 单位 = await 读取战斗单位('小队.成员.白露露');

    expect(单位.id).toBe('小队.成员.白露露');
    expect(单位.类型).toBe('小队成员');
    expect(单位.阵营).toBe('我方');
  });
});
