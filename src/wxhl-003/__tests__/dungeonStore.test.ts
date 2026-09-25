import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { buildMatchPool, useDungeonGenStore } from '../store';

/**
 * `readPlayerBrief` 的晋升试炼判定。
 * 判定规则（spec §六.1）: `归一位阶(阶位) ∈ 0..3` 且 `等级 >= [20,40,60,80][idx]`。
 * 五阶与认不出的阶位一律不触发。
 */
describe('readPlayerBrief · 晋升试炼判定', () => {
  const 桩键 = ['getVariables', 'getCurrentMessageId'] as const;
  let 原值: Record<string, unknown> = {};

  /** 造一份只含判定所需字段的存档 */
  function 挂存档(等级: number, 阶位: string) {
    (globalThis as any).getVariables = () => ({
      stat_data: { 契约者: { 头部: { 姓名: '刘林', 等级, 阶位, CR: 3 }, 赛季信息: { 当前副本周期: 3 } } },
    });
    (globalThis as any).getCurrentMessageId = () => -1;
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    原值 = {};
    for (const k of 桩键) 原值[k] = (globalThis as any)[k];
  });
  afterEach(() => {
    for (const k of 桩键) {
      if (原值[k] === undefined) delete (globalThis as any)[k];
      else (globalThis as any)[k] = 原值[k];
    }
  });

  it.each([
    [19, '一阶', false],
    [20, '一阶', true],
    [25, '一阶', true], // 用 >=, 多给的经验不至于漏判
    [39, '二阶', false],
    [40, '二阶', true],
    [60, '三阶', true],
    [80, '四阶', true],
    [100, '五阶', false], // 五阶不在表内
    [100, '超脱者', false],
    [20, '认不出的阶位', false],
  ])('Lv.%i %s → 晋升试炼=%s', (等级, 阶位, 期望) => {
    挂存档(等级 as number, 阶位 as string);
    const s = useDungeonGenStore();
    expect(s.readPlayerBrief().player.晋升试炼).toBe(期望);
  });
});

/**
 * **CR=5 的边界**（Review Focus 第 5 条）。
 * 分界必须与 `buildMatchPool` 的 `cr <= 4` 一致 —— 字面「CR 大于五」会让 CR=5 落缝
 * （既不抓榜、又不给同人开关）。
 */
describe('buildMatchPool · CR 边界', () => {
  it('CR=4 → 自由生成, 不抓榜', () => {
    expect(buildMatchPool(4, '一阶')).toContain('不要');
    expect(buildMatchPool(4, '一阶')).not.toContain('榜单候选');
  });

  it('CR=5 → 走榜单（与 cr <= 4 的分界一致, 不落缝）', () => {
    expect(buildMatchPool(5, '一阶')).toContain('榜单候选');
  });

  it('CR=6 → 也走榜单', () => {
    expect(buildMatchPool(6, '一阶')).toContain('榜单候选');
  });
});
