import { describe, expect, it } from 'vitest';
import { GOODS_BASE, 启发式归类, 配方Schema, STANDARD_GOODS_RECIPES, TEMPLATE_RECIPES } from '../recipes';

describe('启发式归类 · 材料分类词典', () => {
  it('怪物素材/草药/金属/火药', () => {
    expect(启发式归类('深渊魔狼王的牙')).toBe('怪物素材');
    expect(启发式归类('月光草')).toBe('草药');
    expect(启发式归类('精铁')).toBe('金属');
    expect(启发式归类('振金')).toBe('金属');
    expect(启发式归类('秘制火药')).toBe('火药');
  });
  it('无法归类返回未分类', () => {
    expect(启发式归类('？？？')).toBe('未分类');
  });
});

describe('内置配方合法性', () => {
  it('模板配方全部通过配方Schema', () => {
    for (const r of TEMPLATE_RECIPES) expect(() => 配方Schema.parse(r)).not.toThrow();
  });
  it('标准道具配方全部通过配方Schema', () => {
    for (const r of STANDARD_GOODS_RECIPES) expect(() => 配方Schema.parse(r)).not.toThrow();
  });
  it('行业覆盖：模板管锻造/裁缝，标准管炼金/工程/烹饪', () => {
    expect(new Set(TEMPLATE_RECIPES.map(r => r.行业))).toEqual(new Set(['锻造', '裁缝']));
    expect(new Set(STANDARD_GOODS_RECIPES.map(r => r.行业))).toEqual(new Set(['炼金', '工程', '烹饪']));
  });
  it('v1 只有白/蓝品质，且无银色', () => {
    for (const r of [...TEMPLATE_RECIPES, ...STANDARD_GOODS_RECIPES]) {
      expect(['白色', '蓝色']).toContain(r.品质);
    }
  });
  it('蓝色配方要求基础技能 Lv.3，白色 Lv.1', () => {
    for (const r of [...TEMPLATE_RECIPES, ...STANDARD_GOODS_RECIPES]) {
      expect(r.技能要求.分类).toBe('基础');
      expect(r.技能要求.等级).toBe(r.品质 === '白色' ? 1 : 3);
    }
  });
  it('标准道具配方名称与 GOODS_BASE 键一一对应', () => {
    for (const r of STANDARD_GOODS_RECIPES) {
      expect(GOODS_BASE[r.名称], r.名称).toBeDefined();
    }
  });
});
