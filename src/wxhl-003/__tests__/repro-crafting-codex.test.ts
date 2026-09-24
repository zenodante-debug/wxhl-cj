import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useCraftingStore } from '../crafting/store';

/** 复现「材料改成火药后，候选/分配却对不上」的最小场景。
 *  其他依赖（MVU / 聊天变量 / toastr）照 store.test.ts 的最小 mock。 */
const 提示: string[] = [];
let chatVars: any = {};
let mvu: any = {};

beforeEach(() => {
  提示.length = 0;
  chatVars = {};
  mvu = {
    stat_data: {
      契约者: {
        头部: { 姓名: '老狼', 阶位: '一阶' },
        属性: { 基础: { STR: 8, AGI: 6, CON: 6, PER: 7 }, 属性修正值: { STR: 0, AGI: 0, CON: 0, PER: 2 } },
        通用技能: { 工程: { 分类: '基础', 阶位: '一阶', 等级: 3 } },
        职业: { 名称: '工程师' },
        经济: { UP: 20000 },
        背包: {},
      },
    },
  };
  (globalThis as any).getVariables = () => chatVars;
  (globalThis as any).replaceVariables = (v: any) => {
    chatVars = v;
  };
  (globalThis as any).getCurrentMessageId = () => -1;
  (globalThis as any).Mvu = {
    getMvuData: () => mvu,
    replaceMvuData: async (d: any) => {
      mvu = d;
    },
  };
  (globalThis as any).toastr = {
    error: (m: string) => 提示.push(m),
    warning: (m: string) => 提示.push(m),
    success: (m: string) => 提示.push(m),
  };
  (globalThis as any).window = { confirm: () => true };
  setActivePinia(createPinia());
});

describe('复现 · 手动改类别后火药候选/分配对不上', () => {
  it('未知粉末（启发式归不到火药）手动改成火药 → matchMaterials(火药) 应能拣到', () => {
    mvu.stat_data.契约者.背包 = { 未知粉末: { 名称: '未知粉末', 数量: 10 }, 精铁: { 名称: '精铁', 数量: 5 } };
    const s = useCraftingStore();
    s.syncFromMvu();
    // 前提：未知粉末 不含任何火药关键词，启发式归不到火药
    expect(s.matchMaterials('火药')).toEqual([]);
    // 玩家手动改成火药
    s.setCodex('未知粉末', { 类别: '火药' });
    // 现在应该能被拣到
    expect(s.codex['未知粉末']?.类别).toBe('火药');
    expect(s.matchMaterials('火药')).toContain('未知粉末');
  });

  it('手动改类别应持久化到聊天变量（锻造变量对不上的疑点）', async () => {
    mvu.stat_data.契约者.背包 = { 未知粉末: { 名称: '未知粉末', 数量: 10 } };
    const s = useCraftingStore();
    s.syncFromMvu();
    s.setCodex('未知粉末', { 类别: '火药' });
    await nextTick(); // watchEffect 默认异步刷新
    // 聊天变量里的 材料档案 应该记着这次手动归类
    const 档案 = chatVars?.wxhl003_crafting?.材料档案;
    expect(档案?.['未知粉末']?.类别).toBe('火药');
  });

  it('重建 store（模拟重载）后手动归类还在 → 候选依旧认这门类别', async () => {
    mvu.stat_data.契约者.背包 = { 未知粉末: { 名称: '未知粉末', 数量: 10 } };
    let s = useCraftingStore();
    s.syncFromMvu();
    s.setCodex('未知粉末', { 类别: '火药' });
    await nextTick();
    // 模拟重载：换 pinia、重建 store，codex 从聊天变量重读
    setActivePinia(createPinia());
    s = useCraftingStore();
    s.syncFromMvu();
    expect(s.matchMaterials('火药')).toContain('未知粉末');
  });
});
