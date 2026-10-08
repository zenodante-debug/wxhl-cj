import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { 击杀明细, 钥匙档位 } from '../ai/aftermath';

// ================================================================
// 决斗场美术 · Task 7：收尾页（凯旋 / 陨落 / 撤退 + 钥匙战利品列表）
// CombatView 的内部状态在 SSR 里驱动不到「收尾」，所以用源码守卫 + 纯函数断言。
// ================================================================

const 读 = (f: string) => fs.readFileSync(path.resolve(import.meta.dirname, '..', f), 'utf8');

describe('收尾页 · 三态横幅（源码守卫）', () => {
  const 驾驶舱 = () => 读('views/CombatView.vue');

  it('胜利 = 金漆「凯旋」，败北 = 血字「陨落」，逃离 = 灰字「撤退」', () => {
    const s = 驾驶舱();
    expect(s).toContain('settle-banner');
    expect(s).toContain('凯旋');
    expect(s).toContain('陨落');
    expect(s).toContain('撤退');
  });

  it('战利品列表：胜利时按击杀列出钥匙（五档配色）', () => {
    const s = 驾驶舱();
    expect(s).toContain('loot-list');
    expect(s).toContain('击杀明细');
    for (const 档 of ['k-white', 'k-silver', 'k-gold', 'k-diamond', 'k-blood']) {
      expect(s, `缺 ${档}`).toContain(档);
    }
  });
});

describe('收尾页 · 钥匙五档的色（纯函数）', () => {
  const 单位 = (类型: string, id = '副本角色.x'): any => ({
    id,
    名称: '某敌',
    类型,
    阵营: '敌方',
    HP_当前: 0,
  });

  it('杂兵白 / 精英白银 / BOSS黄金 / 隐藏BOSS钻石 / 契约者血腥', () => {
    expect(钥匙档位(单位('杂兵'))).toBe('白色钥匙');
    expect(钥匙档位(单位('精英'))).toBe('白银钥匙');
    expect(钥匙档位(单位('BOSS'))).toBe('黄金钥匙');
    expect(钥匙档位(单位('隐藏BOSS'))).toBe('钻石钥匙');
    expect(钥匙档位(单位('契约者', '其他契约者.林千尺'))).toBe('血腥钥匙');
  });

  it('击杀明细只列 HP 归零的敌方（活着的与我方不进战利品）', () => {
    const 状态: any = {
      单位: {
        骨卫兵: 单位('精英'),
        活口: { ...单位('杂兵'), id: '副本角色.活口', HP_当前: 10 },
        玩家: { ...单位('玩家'), id: '契约者', 阵营: '我方' },
      },
    };
    const 明细 = 击杀明细(状态);

    expect(明细).toHaveLength(1);
    expect(明细[0].钥匙).toBe('白银钥匙');
  });
});
