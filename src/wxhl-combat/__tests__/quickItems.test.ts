import { describe, expect, it, beforeEach } from 'vitest';
import { 读取背包, 快捷物品转效果源, 写回背包消耗 } from '../store';

// ================================================================
// 快捷物品栏（plan §21）—— 玩家已裁定的三件事：
//   1. 用一次扣一个，**战斗中记账、收尾时写回背包**；
//   2. **每个我方单位各 3 个**栏位；
//   3. 下拉里列**背包里全部**物品。
//
// 权威 schema：`实体.背包 = Record<物品名, { 描述, 数量, ...catchall }>`，
// 且**每个实体各有自己的背包**（实体Schema 是统一超集）。
// ================================================================

function 挂变量(实体: any, 路径 = '契约者') {
  (globalThis as any).waitGlobalInitialized = async () => {};
  (globalThis as any).getVariables = () => ({ stat_data: { 契约者: 路径 === '契约者' ? 实体 : { [路径]: 实体 } } });
}

describe('读取背包', () => {
  beforeEach(() => {
    delete (globalThis as any).getVariables;
    delete (globalThis as any).waitGlobalInitialized;
  });

  it('拍平成 {名称, 描述, 数量} 列表（顺序不重排）', async () => {
    挂变量({
      背包: {
        绷带: { 描述: '止血用，恢复 20 HP', 数量: 99 },
        恢复药水: { 描述: '恢复 50 HP', 数量: 99 },
        'MP 恢复药剂': { 描述: '恢复 30 MP', 数量: 12 },
      },
    });

    const 出 = await 读取背包('契约者');
    expect(出.map(x => x.名称)).toEqual(['绷带', '恢复药水', 'MP 恢复药剂']);
    expect(出[0]).toMatchObject({ 名称: '绷带', 描述: '止血用，恢复 20 HP', 数量: 99 });
  });

  it('数量 ≤ 0 / 不是数字的条目丢掉（schema 也过滤，这里是第二道）', async () => {
    挂变量({
      背包: {
        有效的: { 描述: 'x', 数量: 3 },
        零个: { 描述: 'x', 数量: 0 },
        负数: { 描述: 'x', 数量: -2 },
        没数量: { 描述: 'x' },
        坏的: { 描述: 'x', 数量: '一大堆' },
      },
    });

    expect((await 读取背包('契约者')).map(x => x.名称)).toEqual(['有效的']);
  });

  it('没有背包 / 空背包 → 空数组（不炸）', async () => {
    挂变量({});
    expect(await 读取背包('契约者')).toEqual([]);

    挂变量({ 背包: {} });
    expect(await 读取背包('契约者')).toEqual([]);
  });

  it('**队友读的是队友自己的背包**（每个实体各有背包）', async () => {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: {
          背包: { 玩家的药: { 描述: 'x', 数量: 5 } },
          小队: { 成员: { 白露露: { 背包: { 她的弓: { 描述: 'y', 数量: 1 } } } } },
        },
      },
    });

    expect((await 读取背包('小队.成员.白露露')).map(x => x.名称)).toEqual(['她的弓']);
  });
});

describe('快捷物品转效果源', () => {
  it('名称加后缀、免费行动、效果带描述', () => {
    const 源 = 快捷物品转效果源({ 名称: '绷带', 描述: '止血用，恢复 20 HP', 数量: 99, 原文: { 描述: '止血用，恢复 20 HP', 数量: 99 } });

    expect(源.名称).toBe('绷带（快捷物品）');
    expect(源.行动类型).toBe('免费行动');
    expect(源.类型).toBe('物品');
    expect(源.消耗).toBe('无');
    expect(源.冷却).toBe('无');
    expect(源.射程).toBe('自身');
    expect(源.目标).toBe('自身');
    expect(JSON.stringify(源.效果)).toContain('恢复 20 HP');
  });

  it('背包条目上的额外字段（品质/类型/伤害骰这类）一并带给模型 —— 但**不带 数量**', () => {
    const 源 = 快捷物品转效果源({
      名称: '爆裂弹',
      描述: '投掷后范围爆炸',
      数量: 3,
      原文: { 描述: '投掷后范围爆炸', 数量: 3, 品质: '蓝色', 伤害骰: '2d6' },
    });

    const 效果 = JSON.stringify(源.效果);
    expect(效果).toContain('2d6');
    expect(效果).toContain('蓝色');
    expect(效果).not.toContain('数量');
  });

  it('走一遍真实链路：读取背包 → 快捷物品转效果源', async () => {
    挂变量({ 背包: { 爆裂弹: { 描述: '投掷后爆炸', 数量: 3, 伤害骰: '2d6' } } });

    const [物品] = await 读取背包('契约者');
    const 源 = 快捷物品转效果源(物品);

    expect(源.名称).toBe('爆裂弹（快捷物品）');
    expect(JSON.stringify(源.效果)).toContain('2d6');
    expect(JSON.stringify(源.效果)).not.toContain('数量');
  });
});

describe('写回背包消耗', () => {
  beforeEach(() => {
    delete (globalThis as any).Mvu;
    delete (globalThis as any).waitGlobalInitialized;
  });

  it('按扣减表改 `背包.<名>.数量`，别的字段原样保留', async () => {
    const 写入: any[] = [];
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).Mvu = {
      getMvuData: () => ({
        stat_data: {
          契约者: {
            背包: {
              绷带: { 描述: '止血用', 数量: 99 },
              药水: { 描述: '恢复', 数量: 5, 品质: '蓝色' },
            },
          },
        },
      }),
      replaceMvuData: async (d: any) => { 写入.push(d); },
    };

    await 写回背包消耗('契约者', { 绷带: 2, 药水: 3 });

    const 背包 = 写入[写入.length - 1].stat_data.契约者.背包;
    expect(背包.绷带.数量).toBe(97);
    expect(背包.绷带.描述).toBe('止血用'); // 别的字段不许动
    expect(背包.药水.数量).toBe(2);
    expect(背包.药水.品质).toBe('蓝色');
  });

  it('扣到 0 就停在 0（不许扣成负数）', async () => {
    const 写入: any[] = [];
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).Mvu = {
      getMvuData: () => ({ stat_data: { 契约者: { 背包: { 绷带: { 描述: 'x', 数量: 1 } } } } }),
      replaceMvuData: async (d: any) => { 写入.push(d); },
    };

    await 写回背包消耗('契约者', { 绷带: 5 });
    expect(写入[写入.length - 1].stat_data.契约者.背包.绷带.数量).toBe(0);
  });

  it('扣减表是空的 → 一次都不写（别白改脚本变量/变量表）', async () => {
    const 写入: any[] = [];
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).Mvu = {
      getMvuData: () => ({ stat_data: { 契约者: { 背包: {} } } }),
      replaceMvuData: async (d: any) => { 写入.push(d); },
    };

    await 写回背包消耗('契约者', {});
    expect(写入).toHaveLength(0);
  });

  it('队友的背包路径也要写对（下钻到 小队.成员.X）', async () => {
    const 写入: any[] = [];
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).Mvu = {
      getMvuData: () => ({
        stat_data: { 契约者: { 小队: { 成员: { 白露露: { 背包: { 箭: { 数量: 10 } } } } } } },
      }),
      replaceMvuData: async (d: any) => { 写入.push(d); },
    };

    await 写回背包消耗('小队.成员.白露露', { 箭: 4 });
    expect(写入[写入.length - 1].stat_data.契约者.小队.成员.白露露.背包.箭.数量).toBe(6);
  });
});
