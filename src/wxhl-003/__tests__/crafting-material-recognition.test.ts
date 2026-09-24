import { describe, expect, it } from 'vitest';
import { 启发式归类 } from '../crafting/recipes';
import { 分配核心材料 } from '../crafting/store';

describe('材料识别 · 拓宽关键词与可读报错', () => {
  it('火药成品名（AI 造出的「XX火药/XX爆炸物」）能回炉当火药材料', () => {
    expect(启发式归类('火药')).toBe('火药');
    expect(启发式归类('粗制火药')).toBe('火药');
    expect(启发式归类('高爆炸药')).toBe('火药');
    expect(启发式归类('制式爆炸物')).toBe('火药');
  });

  it('含「药」但无火药关键词的物品不会被误归成火药', () => {
    expect(启发式归类('治疗药剂')).not.toBe('火药');
    expect(启发式归类('灵草')).toBe('草药');
  });

  it('多余材料的报错要点名它属于哪类、本配方核心要哪几类', () => {
    // 需求先被「火药Item」盖住，再带一件多余的「止血草」→ 走「多余」分支
    const 查类别 = (n: string) => (n === '火药Item' ? '火药' : '草药') as any;
    const r = 分配核心材料([{ 类别: '火药', 数量: 2, 核心: true }], ['火药Item', '止血草'], 查类别, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.理由).toContain('草药'); // 点名多余材料属于哪类
      expect(r.理由).toContain('火药'); // 点名本配方核心需要哪类
      expect(r.理由).toContain('对不上');
    }
  });
});
