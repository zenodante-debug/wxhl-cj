import { beforeEach, describe, expect, it } from 'vitest';
import { logSyslog, pushSyslog } from '../syslog';
import { canUseHubFacility, currentWorld } from '../hubGate';

/** 假存档：getMvuData 读它、replaceMvuData 写回它（同一对象，commit 回读才一致） */
let mvu: any;

beforeEach(() => {
  mvu = { stat_data: { 契约者: { 当前世界: '回廊' } } };
  (globalThis as any).getCurrentMessageId = () => -1;
  (globalThis as any).Mvu = {
    getMvuData: () => mvu,
    replaceMvuData: async (d: any) => {
      mvu = d;
    },
  };
});

describe('pushSyslog · 并入既有事务（不写库）', () => {
  it('空日志 → 追加一条，带统一前缀', () => {
    pushSyslog(mvu, '你把「圣剑」存入储藏室');
    expect(mvu.stat_data.系统日志).toEqual(['[前端面板交互：你把「圣剑」存入储藏室]']);
  });

  it('已有日志 → 追加在末尾、不动旧条目', () => {
    mvu.stat_data.系统日志 = ['[前端面板交互：旧的]'];
    pushSyslog(mvu, '新的');
    expect(mvu.stat_data.系统日志).toEqual(['[前端面板交互：旧的]', '[前端面板交互：新的]']);
  });

  it('日志字段被污染成非数组 → 当作空重新起一条', () => {
    mvu.stat_data.系统日志 = '不是数组';
    pushSyslog(mvu, 'x');
    expect(mvu.stat_data.系统日志).toEqual(['[前端面板交互：x]']);
  });
});

describe('logSyslog · 独立自读自写', () => {
  it('写进当前楼层的 系统日志', async () => {
    await logSyslog('你接取了订单');
    expect(mvu.stat_data.系统日志).toEqual(['[前端面板交互：你接取了订单]']);
  });

  it('Mvu 抛错也不抛出（只 warn）', async () => {
    (globalThis as any).Mvu = {
      getMvuData: () => {
        throw new Error('未就绪');
      },
      replaceMvuData: async () => {},
    };
    await expect(logSyslog('x')).resolves.toBeUndefined();
  });
});

describe('hubGate · 当前世界门禁', () => {
  it('回廊 / 现实 → 放行', () => {
    mvu.stat_data.契约者.当前世界 = '回廊';
    expect(canUseHubFacility()).toBe(true);
    mvu.stat_data.契约者.当前世界 = '现实';
    expect(canUseHubFacility()).toBe(true);
  });

  it('副本世界（其他任意值）→ 拦截', () => {
    mvu.stat_data.契约者.当前世界 = '幽暗密林';
    expect(canUseHubFacility()).toBe(false);
    mvu.stat_data.契约者.当前世界 = '某副本';
    expect(canUseHubFacility()).toBe(false);
  });

  it('缺字段 → 默认现实 → 放行', () => {
    delete mvu.stat_data.契约者.当前世界;
    expect(currentWorld()).toBe('现实');
    expect(canUseHubFacility()).toBe(true);
  });

  it('读不到变量 → 按现实放行（不误锁）', () => {
    (globalThis as any).Mvu = {
      getMvuData: () => {
        throw new Error('未就绪');
      },
      replaceMvuData: async () => {},
    };
    expect(currentWorld()).toBe('现实');
    expect(canUseHubFacility()).toBe(true);
  });
});
