import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { 布局分布 } from '../engine/viewModel';

// ================================================================
// 玩家反馈 2：「战斗界面，一维地图的角色分布还是有问题，最好增加一个向上的纵轴，
// 这样，就不会所有角色都挤在一起了」
//
// 现状：同一距离的组内上下叠 20px；但**距离相近**的两组（比如 5 米和 6 米）
// 横向挨得近，纵向的堆叠又都是从底边起 —— 横竖两向都挤成一团。
// 修法：加"车道"（纵轴）—— 横向会撞上的两组错开到不同车道，纵向从上到下铺开。
// ================================================================

const 单位 = (键: string, 距离: number, id = `副本角色.${键}`) => ({ 键, id, 距离 });

/** 线性的 距离→左%（测试用） */
const 线性 = (d: number) => d * 10;

describe('一维地图 · 纵轴车道（布局分布）', () => {
  it('距离相近的两组 → 错开成两条车道（这就是"纵轴"）', () => {
    const r = 布局分布([单位('骨卫兵', 5), 单位('异蜂', 6)], 线性);

    expect(r.点.find(p => p.键 === '骨卫兵')!.车道).toBe(0);
    expect(r.点.find(p => p.键 === '异蜂')!.车道).toBe(1);
    expect(r.车道数).toBe(2);
  });

  it('距离够远的组 → 共用一条车道（不浪费高度）', () => {
    const r = 布局分布([单位('骨卫兵', 0), 单位('异蜂', 30)], 线性);

    expect(r.点.every(p => p.车道 === 0)).toBe(true);
    expect(r.车道数).toBe(1);
  });

  it('同一距离的多人 → 同一车道内按层叠（不打散）', () => {
    const r = 布局分布([单位('骨卫兵', 10), 单位('异蜂', 10), 单位('石像鬼', 10)], 线性);

    expect(new Set(r.点.map(p => p.车道)).size).toBe(1);
    expect(r.点.map(p => p.层).sort()).toEqual([0, 1, 2]);
  });

  it('混合：近-近-远 → 车道 0、1、0', () => {
    const r = 布局分布([单位('甲', 5), 单位('乙', 6), 单位('丙', 30)], 线性);
    const 车道 = (键: string) => r.点.find(p => p.键 === 键)!.车道;

    expect(车道('甲')).toBe(0);
    expect(车道('乙')).toBe(1);
    expect(车道('丙')).toBe(0);
  });

  it('纵向高度按"车道 × 车道高 + 组内层数 × 层高"排（不会回到挤一起）', () => {
    const r = 布局分布([单位('甲', 5), 单位('乙', 6), 单位('丙', 6)], 线性);
    const 乙 = r.点.find(p => p.键 === '乙')!;
    const 丙 = r.点.find(p => p.键 === '丙')!;

    expect(乙.车道).toBe(丙.车道); // 同距离一组
    expect(乙.层).not.toBe(丙.层); // 组内上下错开
  });

  it('空战场 → 空布局，不崩', () => {
    const r = 布局分布([], 线性);

    expect(r.点).toEqual([]);
    expect(r.车道数).toBe(1);
  });
});

describe('一维地图 · 纵轴接线（源码守卫）', () => {
  const 战斗页 = fs.readFileSync(path.resolve(import.meta.dirname, '../views/BattleView.vue'), 'utf8');

  it('标记的位置同时由"车道"与"层"决定（纵轴真的接上了）', () => {
    expect(战斗页).toContain('布局分布');
    expect(战斗页).toMatch(/车道[\s\S]{0,40}层/);
  });

  it('决斗场地面有车道格线（纵轴看得见）', () => {
    expect(战斗页).toContain('lane-grid');
  });
});
