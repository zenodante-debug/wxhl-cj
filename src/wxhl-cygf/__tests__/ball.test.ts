import { describe, expect, it } from 'vitest';
import { BALL_SIZE, clampBallPosition, defaultBallPosition, parseStoredPosition, shouldTreatAsClick } from '../ball';

describe('shouldTreatAsClick · 拖动与点按的判定', () => {
  it('位移在阈值内算点按', () => {
    expect(shouldTreatAsClick(0, 0)).toBe(true);
    expect(shouldTreatAsClick(3, -2)).toBe(true);
    expect(shouldTreatAsClick(-4, 4)).toBe(true);
  });

  it('超过阈值算拖动（不触发打开）', () => {
    expect(shouldTreatAsClick(12, 0)).toBe(false);
    expect(shouldTreatAsClick(0, -9)).toBe(false);
    expect(shouldTreatAsClick(-30, 20)).toBe(false);
  });
});

describe('clampBallPosition · 夹在视口内', () => {
  it('越界到左上被夹回 (0,0)', () => {
    expect(clampBallPosition(-20, -50, 400, 800)).toEqual({ left: 0, top: 0 });
  });

  it('越界到右下被夹到视口内（留出球自身尺寸）', () => {
    expect(clampBallPosition(9999, 9999, 400, 800)).toEqual({ left: 400 - BALL_SIZE, top: 800 - BALL_SIZE });
  });

  it('本来就在视口内则原样返回', () => {
    expect(clampBallPosition(100, 200, 400, 800)).toEqual({ left: 100, top: 200 });
  });

  it('视口比球还小时退回 0（不出现负坐标）', () => {
    expect(clampBallPosition(50, 50, 30, 30)).toEqual({ left: 0, top: 0 });
  });
});

describe('defaultBallPosition · 默认落点', () => {
  it('右下角，且不压住底部输入框（离底 > 球高）', () => {
    const pos = defaultBallPosition(400, 800);
    expect(pos.left).toBe(400 - BALL_SIZE - 16);
    expect(pos.top).toBe(800 - BALL_SIZE - 96);
    expect(pos.top + BALL_SIZE).toBeLessThan(800 - 60);
  });
});

describe('parseStoredPosition · 存档校验', () => {
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
    ['NaN', '{"left":null,"top":34}'],
  ])('非法存档（%s）→ null（回退默认落点）', (_label, raw) => {
    expect(parseStoredPosition(raw as string | null)).toBeNull();
  });
});
