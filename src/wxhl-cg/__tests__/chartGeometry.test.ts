import { describe, expect, it } from 'vitest';
import { chartGeometry } from '../ui/chartGeometry';

const L = (value: number, label: string, kind: 'base' | 'entry' | 'liq') => ({ value, label, kind });

describe('chartGeometry', () => {
  it('折线点数与数据一致', () => {
    const g = chartGeometry({ data: [10, 12, 11, 15], lines: [], width: 200, height: 100 });
    expect(g.polyline.split('L').length).toBe(4);
    expect(g.polyline.startsWith('M')).toBe(true);
  });

  it('单个数据点不崩（没有 L 段）', () => {
    const g = chartGeometry({ data: [100], lines: [], width: 200, height: 100 });
    expect(g.polyline.startsWith('M')).toBe(true);
    expect(g.polyline.includes('L')).toBe(false);
  });

  it('y 轴范围只按价格序列定，越界的线夹到边界、不把价格线压平', () => {
    const g = chartGeometry({
      data: [100, 101, 99, 102],
      lines: [L(1, '强平', 'liq')], // 远低于数据范围
      width: 200,
      height: 100,
    });
    expect(g.min).toBeGreaterThan(90); // 范围没被拉到 1
    expect(g.lineY[0].y).toBeLessThanOrEqual(100);
    expect(g.lineY[0].y).toBeGreaterThanOrEqual(0);
  });

  it('基准线落在对应价位：高于均值的线在上方（y 更小）', () => {
    const g = chartGeometry({
      data: [100, 100, 100],
      lines: [L(110, '开盘', 'base'), L(90, '成本', 'entry')],
      width: 200,
      height: 100,
      pad: 0,
    });
    const base = g.lineY.find(l => l.label === '开盘')!;
    const entry = g.lineY.find(l => l.label === '成本')!;
    expect(base.y).toBeLessThan(entry.y);
  });

  it('涨跌方向按首值判定：向上为 up（绿），向下为 false（红）', () => {
    expect(chartGeometry({ data: [10, 12], lines: [], width: 10, height: 10 }).up).toBe(true);
    expect(chartGeometry({ data: [10, 9], lines: [], width: 10, height: 10 }).up).toBe(false);
    expect(chartGeometry({ data: [10, 10], lines: [], width: 10, height: 10 }).up).toBe(true);
  });

  it('横坐标均匀铺满宽度', () => {
    const g = chartGeometry({ data: [1, 2, 3], lines: [], width: 100, height: 10 });
    expect(g.points.map(p => Math.round(p.x))).toEqual([0, 50, 100]);
  });
});
