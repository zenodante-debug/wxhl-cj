import { describe, expect, it } from 'vitest';
import { BALL_SIZE, clampBallPosition, defaultBallPosition, parseStoredPosition, shouldTreatAsClick } from '../ball';

const vp = (width = 400, height = 800, left = 0, top = 0) => ({ left, top, width, height });

describe('shouldTreatAsClick · 拖动与点按判定（口径同 mobile-compat 的 hypot>=5）', () => {
  it('位移在阈值内算点按', () => {
    expect(shouldTreatAsClick(0, 0)).toBe(true);
    expect(shouldTreatAsClick(3, -2)).toBe(true);
    expect(shouldTreatAsClick(3, 3)).toBe(true); // hypot≈4.24 < 5
  });

  it('位移达到阈值算拖动', () => {
    expect(shouldTreatAsClick(5, 0)).toBe(false);
    expect(shouldTreatAsClick(0, -9)).toBe(false);
    expect(shouldTreatAsClick(4, 4)).toBe(false); // hypot≈5.66 ≥ 5
  });
});

describe('clampBallPosition · 按可视视口夹取（含 visualViewport 的 offsetLeft/offsetTop）', () => {
  it('越界到左上被夹到 视口原点+间距', () => {
    expect(clampBallPosition(-20, -50, vp(400, 800))).toEqual({ left: 10, top: 10 });
  });

  it('越界到右下被夹到视口内（留出球尺寸与间距）', () => {
    expect(clampBallPosition(9999, 9999, vp(400, 800))).toEqual({ left: 400 - BALL_SIZE - 10, top: 800 - BALL_SIZE - 10 });
  });

  it('visualViewport 有偏移时（pinch-zoom / 地址栏）夹取跟着偏移走', () => {
    // 视口从 (30, 60) 开始，宽高 300×500
    const viewport = vp(300, 500, 30, 60);
    expect(clampBallPosition(0, 0, viewport)).toEqual({ left: 40, top: 70 }); // 30+10 / 60+10
    expect(clampBallPosition(9999, 9999, viewport)).toEqual({ left: 30 + 300 - BALL_SIZE - 10, top: 60 + 500 - BALL_SIZE - 10 });
  });

  it('本来就在视口内则原样返回', () => {
    expect(clampBallPosition(100, 200, vp(400, 800))).toEqual({ left: 100, top: 200 });
  });

  it('视口比球还小时夹到视口原点+间距（不产生小于该值的坐标）', () => {
    const viewport = vp(30, 30, 0, 0);
    const pos = clampBallPosition(50, 50, viewport);
    expect(pos.left).toBe(10);
  });
});

describe('defaultBallPosition · 默认落点（照小手机：贴右缘、纵向 42% 高度）', () => {
  it('右侧、纵向 42% 处，避开底部输入框', () => {
    const viewport = vp(400, 800);
    const pos = defaultBallPosition(viewport);
    expect(pos.left).toBe(400 - BALL_SIZE - 14);
    expect(pos.top).toBe(Math.round(800 * 0.42 - BALL_SIZE / 2));
    expect(pos.top + BALL_SIZE).toBeLessThan(800 - 300); // 明显在视口上半区，不压输入框
  });

  it('带视口偏移时默认点同样偏移', () => {
    const pos = defaultBallPosition(vp(300, 500, 30, 60));
    expect(pos.left).toBe(30 + 300 - BALL_SIZE - 14);
    expect(pos.top).toBe(Math.round(60 + 500 * 0.42 - BALL_SIZE / 2));
  });
});

describe('parseStoredPosition · 存档校验（坏值回退默认，别把球弄丢）', () => {
  it('合法存档读出坐标', () => {
    expect(parseStoredPosition('{"left":12,"top":34}')).toEqual({ left: 12, top: 34 });
  });

  it.each([
    ['null', null],
    ['空串', ''],
    ['坏 JSON', '{oops'],
    ['不是对象', '42'],
    ['缺字段', '{"left":12}'],
    ['负坐标', '{"left":-5,"top":10}'],
    ['非数字', '{"left":"12","top":34}'],
    ['NaN 值', '{"left":null,"top":34}'],
  ])('非法存档（%s）→ null', (_label, raw) => {
    expect(parseStoredPosition(raw as string | null)).toBeNull();
  });
});
