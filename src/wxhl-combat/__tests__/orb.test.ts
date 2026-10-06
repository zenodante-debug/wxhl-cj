import { describe, expect, it } from 'vitest';
import { 夹取位置, 默认位置, 算作拖动, 悬浮球尺寸 } from '../engine/orb';

const 视口 = { left: 0, top: 0, width: 400, height: 800 };

describe('orb · 悬浮球定位', () => {
  it('正常坐标不被夹动', () => {
    expect(夹取位置(100, 200, 视口)).toEqual({ left: 100, top: 200 });
  });

  it('超出左/上边界 → 夹到「视口原点 + 间距」', () => {
    expect(夹取位置(-50, -50, 视口)).toEqual({ left: 10, top: 10 });
  });

  it('超出右/下边界 → 夹到「视口边缘 − 尺寸 − 间距」', () => {
    expect(夹取位置(999, 999, 视口)).toEqual({
      left: 400 - 悬浮球尺寸 - 10,
      top: 800 - 悬浮球尺寸 - 10,
    });
  });

  it('视口偏移（visualViewport offset）被算进去', () => {
    const 偏移视口 = { left: 20, top: 30, width: 300, height: 500 };
    expect(夹取位置(0, 0, 偏移视口)).toEqual({ left: 30, top: 40 });
  });

  it('视口比球还小 → 退化为左上间距处，不夹到视口外', () => {
    const 极小 = { left: 0, top: 0, width: 30, height: 30 };
    expect(夹取位置(999, 999, 极小)).toEqual({ left: 10, top: 10 });
  });

  it('默认落点贴右缘，且纵向明显低于小手机的 42%（避免两球叠在一起）', () => {
    const 默认 = 默认位置(视口);
    expect(默认.left).toBe(400 - 悬浮球尺寸 - 14);

    const 小手机默认上 = 视口.height * 0.42 - 悬浮球尺寸 / 2;
    const 间距 = 默认.top - 小手机默认上;
    // 两球同尺寸，纵向中心至少拉开一个球高才不重叠
    expect(间距).toBeGreaterThan(悬浮球尺寸);
  });

  it('拖动阈值：4px 不算、5px 算、斜向按欧氏距离', () => {
    expect(算作拖动(4, 0)).toBe(false);
    expect(算作拖动(5, 0)).toBe(true);
    expect(算作拖动(3, 3)).toBe(false); // √18 ≈ 4.24
    expect(算作拖动(4, 4)).toBe(true); // √32 ≈ 5.66
  });
});
