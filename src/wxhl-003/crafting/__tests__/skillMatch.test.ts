// ================================================================
// Task 6：制造系技能解析（四级回退）+ 分类校验
//
// 背景：v2 的判定是 `通用技能[行业名]` 精确匹配 —— 技能叫「锻造术」就查不到；
// 且只校验 `等级`、**不校验 `分类`**（金图纸要求「高级技能 Lv.1」，基础系 Lv.9 也能过）。
// 本文件是纯函数测试：skillMatch.ts 零酒馆依赖（不碰 MVU/聊天变量/toastr），
// 故不需要任何 vi.mock —— 也就没有「vi.mock 相对路径数错层」那类静默失效的坑。
// ================================================================
import { describe, expect, it } from 'vitest';
import { checkSkill, resolveSkill, type 技能命中 } from '../skillMatch';

describe('resolveSkill · 多级回退', () => {
  it('映射表优先', () => {
    const 技能 = { 铸造: { 分类: '高级', 等级: 3 }, 锻造: { 分类: '基础', 等级: 1 } };
    const hit = resolveSkill(技能, '锻造', { 锻造: ['铸造'] });
    expect(hit?.技能名).toBe('铸造');
    expect(hit?.依据).toBe('映射表');
  });

  it('精确名次之', () => {
    const hit = resolveSkill({ 锻造: { 分类: '基础', 等级: 2 } }, '锻造');
    expect(hit?.技能名).toBe('锻造');
    expect(hit?.依据).toBe('精确名');
  });

  it('模糊名：包含行业名即命中', () => {
    const hit = resolveSkill({ 高级锻造术: { 分类: '高级', 等级: 2 } }, '锻造');
    expect(hit?.技能名).toBe('高级锻造术');
    expect(hit?.依据).toBe('模糊名');
  });

  it('效果文本：效果里提到行业名也算', () => {
    const hit = resolveSkill({ 铁匠之心: { 分类: '基础', 等级: 1, 效果: { 锻造精通: '提升锻造成功率' } } }, '锻造');
    expect(hit?.技能名).toBe('铁匠之心');
    expect(hit?.依据).toBe('效果文本');
  });

  it('全不中 → null', () => {
    expect(resolveSkill({ 剑术: { 分类: '基础', 等级: 5 } }, '锻造')).toBeNull();
  });
});

describe('resolveSkill · 回退链的细节', () => {
  const 铸造 = { 分类: '高级', 等级: 3 };

  it('映射表里靠前的名字不在身上时，先试下一个，再谈回退', () => {
    const hit = resolveSkill({ 铸造 }, '锻造', { 锻造: ['不存在的技能', '铸造', '锻造'] });
    expect(hit?.技能名).toBe('铸造');
    expect(hit?.依据).toBe('映射表');
  });

  it('映射表整表都落空 → 静默回退到精确名（不是报错，也不是直接 null）', () => {
    const hit = resolveSkill({ 锻造: { 分类: '基础', 等级: 1 } }, '锻造', { 锻造: ['铸造'] });
    expect(hit?.技能名).toBe('锻造');
    expect(hit?.依据).toBe('精确名');
  });

  it('映射表数据坏掉（非数组/整表缺失）不炸：按无映射表处理', () => {
    // 聊天变量由 AI/GM 直接写，形状不受本仓库约束 —— 值写成字符串/对象都从 UI 不可达但可达于变量编辑
    expect(resolveSkill({ 锻造: { 分类: '基础', 等级: 1 } }, '锻造', { 锻造: '铸造' as any })?.依据).toBe('精确名');
    expect(resolveSkill({ 锻造: { 分类: '基础', 等级: 1 } }, '锻造', {} as any)?.依据).toBe('精确名');
  });

  it('映射表里的名字走 hasOwn：原型上的键（toString 等）不算命中', () => {
    const hit = resolveSkill({ 铸造 }, '锻造', { 锻造: ['toString', '铸造'] });
    expect(hit?.技能名).toBe('铸造');
  });

  it('精确名压过模糊名（同行业名与含行业名的技能并存时，取精确的那个）', () => {
    const hit = resolveSkill({ 高级锻造术: { 分类: '高级', 等级: 9 }, 锻造: { 分类: '基础', 等级: 1 } }, '锻造');
    expect(hit?.技能名).toBe('锻造');
    expect(hit?.依据).toBe('精确名');
  });

  it('模糊名压过效果文本（哪怕效果文本那条排在前面）', () => {
    const hit = resolveSkill({
      铁匠之心: { 分类: '基础', 等级: 1, 效果: { 锻造精通: '提升锻造成功率' } },
      锻造术: { 分类: '基础', 等级: 2 },
    }, '锻造');
    expect(hit?.技能名).toBe('锻造术');
    expect(hit?.依据).toBe('模糊名');
  });

  it('效果文本：key 与 value 任一命中即可（value 命中时 key 无关）', () => {
    const hit = resolveSkill({ 铁匠之心: { 分类: '基础', 等级: 1, 效果: { 精通: '提升锻造成功率' } } }, '锻造');
    expect(hit?.技能名).toBe('铁匠之心');
    expect(hit?.依据).toBe('效果文本');
  });

  it('效果里的非字符串值（数字/嵌套对象）不会被当成文本命中，也不炸', () => {
    // 值不是字符串就跳过：把嵌套对象 stringify 进来会把「恰好含行业名」的任意结构误判成技能命中
    expect(resolveSkill({ 剑术: { 分类: '基础', 等级: 5, 效果: { 连击: { 锻造: 3 } } } }, '锻造')).toBeNull();
  });

  it('通用技能空/缺失/null → null（不抛错）', () => {
    expect(resolveSkill({}, '锻造')).toBeNull();
    expect(resolveSkill(undefined as any, '锻造')).toBeNull();
    expect(resolveSkill(null as any, '锻造')).toBeNull();
  });

  it('返回的 技能 就是身上那条技能数据本身（引用同一对象）', () => {
    const 技能 = { 分类: '高级', 等级: 3 };
    expect(resolveSkill({ 铸造: 技能 }, '锻造', { 锻造: ['铸造'] })?.技能).toBe(技能);
  });
});

describe('checkSkill · 分类与等级', () => {
  const 命中 = (分类: string, 等级: number, 依据: any = '精确名'): 技能命中 =>
    ({ 技能名: 'x', 技能: { 分类, 等级 }, 依据 });

  it('金图纸要高级：基础系不通过', () => {
    expect(checkSkill(命中('基础', 9), { 分类: '高级', 等级: 1 })[0]).toContain('高级');
  });

  it('高级可代基础', () => {
    expect(checkSkill(命中('高级', 3), { 分类: '基础', 等级: 3 })).toEqual([]);
  });

  it('等级不足报错', () => {
    expect(checkSkill(命中('基础', 1), { 分类: '基础', 等级: 3 })[0]).toContain('Lv');
  });

  it('未命中报错', () => {
    expect(checkSkill(null, { 分类: '基础', 等级: 1 })[0]).toContain('未掌握');
  });

  it('等级刚好达标（===）通过：边界是「不足才报错」', () => {
    expect(checkSkill(命中('基础', 3), { 分类: '基础', 等级: 3 })).toEqual([]);
  });

  it('高级要求 + 高级命中 + 等级刚好 → 通过', () => {
    expect(checkSkill(命中('高级', 1), { 分类: '高级', 等级: 1 })).toEqual([]);
  });

  it('高级要求 + 基础命中 + 等级也够 → 只报分类一条（不是两条）', () => {
    const errs = checkSkill(命中('基础', 9), { 分类: '高级', 等级: 1 });
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('基础');
  });

  it('报错文案带上「需要 Lv.X / 当前 Lv.Y」，玩家知道差多少', () => {
    expect(checkSkill(命中('基础', 1), { 分类: '基础', 等级: 3 })[0]).toContain('Lv.3');
    expect(checkSkill(命中('基础', 1), { 分类: '基础', 等级: 3 })[0]).toContain('Lv.1');
  });

  it('未命中时给出行业名（由调用方喂入）便于定位是哪个行业没掌握', () => {
    expect(checkSkill(null, { 分类: '高级', 等级: 1 }, '锻造')[0]).toBe('未掌握生活技能「锻造」');
  });

  it('分类既非基础也非高级（卡面自造）→ 两种要求都过不了（fail-closed）', () => {
    expect(checkSkill(命中('大师', 9), { 分类: '基础', 等级: 1 })).toHaveLength(1);
    expect(checkSkill(命中('大师', 9), { 分类: '高级', 等级: 1 })).toHaveLength(1);
  });

  // 主卡 schema 原文：`z.union([z.enum(['基础','高级','银色']), z.string()]).prefault('基础')`
  // ——「银色」是合法分类，且在这个世界观里**严格高于高级**。旧判定只认 基础/高级 两档，
  // 银色两个分支都不满足 → 银色玩家连白色配方都做不了（工坊核心功能整体失效）。
  it('银色高于高级：要求「高级」的金图纸通过', () => {
    expect(checkSkill(命中('银色', 1), { 分类: '高级', 等级: 1 })).toEqual([]);
  });

  it('银色高于高级：要求「基础」的白/蓝配方同样通过（银色不该被误拦）', () => {
    expect(checkSkill(命中('银色', 3), { 分类: '基础', 等级: 3 })).toEqual([]);
  });

  it('银色也要过等级闸门（高于高级不等于免检等级）', () => {
    expect(checkSkill(命中('银色', 2), { 分类: '高级', 等级: 5 })[0]).toContain('Lv.5');
  });

  it('技能等级字段缺失 → 按 Lv.1 处理（与 assembleMaker 的 `Number(sk.等级 ?? 1)` 同口径）', () => {
    expect(checkSkill({ 技能名: 'x', 技能: { 分类: '基础' }, 依据: '精确名' }, { 分类: '基础', 等级: 1 })).toEqual([]);
    expect(checkSkill({ 技能名: 'x', 技能: { 分类: '基础' }, 依据: '精确名' }, { 分类: '基础', 等级: 3 })[0]).toContain('Lv');
  });
});
