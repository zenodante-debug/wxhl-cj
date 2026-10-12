import { describe, expect, it } from 'vitest';
import { viewportMode, type HostLike } from '../ui/viewportMode';

function host(opts: { coarse?: boolean; noHover?: boolean; vw: number }): HostLike {
  return {
    matchMedia: (q: string) => ({
      matches: q.includes('coarse') ? !!opts.coarse : q.includes('hover') ? !!opts.noHover : false,
    }),
    visualViewport: { width: opts.vw },
    innerWidth: opts.vw,
  };
}

describe('viewportMode（终审 I2：判据必须看宿主视口，不是脚本 iframe 视口）', () => {
  it('粗指针 / 无 hover → phone（哪怕屏幕很宽）', () => {
    expect(viewportMode(host({ coarse: true, vw: 1400 }))).toBe('phone');
    expect(viewportMode(host({ noHover: true, vw: 1400 }))).toBe('phone');
  });
  it('宽度 ≤768 → phone', () => {
    expect(viewportMode(host({ vw: 768 }))).toBe('phone');
    expect(viewportMode(host({ vw: 400 }))).toBe('phone');
  });
  it('769–900 → compact（单列但不贴满）', () => {
    expect(viewportMode(host({ vw: 800 }))).toBe('compact');
  });
  it('>900 → wide（三栏）', () => {
    expect(viewportMode(host({ vw: 1400 }))).toBe('wide');
  });
  it('visualViewport 缺失时回退 innerWidth', () => {
    const h: HostLike = { matchMedia: () => ({ matches: false }), innerWidth: 500 };
    expect(viewportMode(h)).toBe('phone');
  });
});
