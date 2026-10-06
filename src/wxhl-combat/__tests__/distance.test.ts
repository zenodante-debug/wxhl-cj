import { describe, expect, it } from 'vitest';
import { 距离带, 射程校验 } from '../engine/distance';

describe('distance · 距离带', () => {
  it('0米 → 贴身', () => {
    expect(距离带(0)).toBe('贴身');
  });

  it('2米 → 贴身', () => {
    expect(距离带(2)).toBe('贴身');
  });

  it('3米 → 近距', () => {
    expect(距离带(3)).toBe('近距');
  });

  it('10米 → 近距', () => {
    expect(距离带(10)).toBe('近距');
  });

  it('11米 → 中距', () => {
    expect(距离带(11)).toBe('中距');
  });

  it('50米 → 中距', () => {
    expect(距离带(50)).toBe('中距');
  });

  it('51米 → 远距', () => {
    expect(距离带(51)).toBe('远距');
  });

  it('300米 → 远距', () => {
    expect(距离带(300)).toBe('远距');
  });

  it('301米 → 超远距', () => {
    expect(距离带(301)).toBe('超远距');
  });
});

describe('distance · 射程校验', () => {
  it('近战武器在贴身（0米）可以攻击', () => {
    expect(射程校验('近战', 0)).toBe(true);
  });

  it('近战武器在近距（8米）可以攻击', () => {
    expect(射程校验('近战', 8)).toBe(true);
  });

  it('近战武器在中距（11米）无法攻击', () => {
    expect(射程校验('近战', 11)).toBe(false);
  });

  it('近战武器在远距（100米）无法攻击', () => {
    expect(射程校验('近战', 100)).toBe(false);
  });

  it('步枪在中距（30米）可以攻击', () => {
    expect(射程校验('步枪', 30)).toBe(true);
  });

  it('步枪在远距（200米）可以攻击', () => {
    expect(射程校验('步枪', 200)).toBe(true);
  });

  it('狙击枪在超远距（500米）可以攻击', () => {
    expect(射程校验('狙击枪', 500)).toBe(true);
  });
});
