import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Settings, 默认设置 } from '../settings';
import { 演出应该开 } from '../engine/showToggle';

// ================================================================
// 决斗场美术 · Task 6：演出开关
//
// 玩家裁决：「重演出，加可关闭」—— 设置里一个开关，关掉演出层**不渲染**（零成本），
// 系统级 prefers-reduced-motion 一律等同关闭。
// ================================================================

const 根 = path.resolve(import.meta.dirname, '..');
const 读 = (f: string) => fs.readFileSync(path.join(根, f), 'utf8');

describe('演出开关 · 设置项', () => {
  it('Settings 里有「演出」，默认开（重演出是玩家要的方向，关闭是选择权）', () => {
    expect(默认设置.演出).toBe(true);
    expect(Settings.parse({}).演出).toBe(true);
    expect(Settings.parse({ 演出: false }).演出).toBe(false);
  });

  it('老存档没有这项 → 按默认开（向后兼容）', () => {
    expect(Settings.parse({ 意图模式: '随机' }).演出).toBe(true);
  });
});

describe('演出开关 · 判定（纯函数）', () => {
  it('设置关 → 不开；设置开且系统没要求减弱 → 开', () => {
    expect(演出应该开(false, false)).toBe(false);
    expect(演出应该开(true, false)).toBe(true);
  });

  it('系统要求减弱动效（prefers-reduced-motion）→ 一律等同关闭', () => {
    expect(演出应该开(true, true)).toBe(false);
    expect(演出应该开(false, true)).toBe(false);
  });
});

describe('演出开关 · 接线（源码守卫）', () => {
  it('设置页有「战斗演出」开关', () => {
    expect(读('views/SettingsView.vue')).toContain('演出');
    expect(读('views/SettingsView.vue')).toContain('store.settings.演出');
  });

  it('演出层只在开关打开时渲染（关掉 = 零成本，连 DOM 都没有）', () => {
    const 战斗页 = 读('views/BattleView.vue');
    expect(战斗页).toMatch(/v-if="演出开"[^>]*>\s*$|<ShowLayer[^>]*v-if="演出开"/m);
  });
});
