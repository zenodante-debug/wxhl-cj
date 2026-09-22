import { describe, expect, it } from 'vitest';
import { buildReviewPrompt, cacheKey, reviewVerdict, reviewVerdicts } from '../aiReview';

const 蓝武 = {
  名称: '制式长刀', 类型: '武器', 品质: '蓝色', 阶位: '二阶', 伤害骰: '4d8',
  效果: { 利刃: '命中后小幅流血。', 配重: '挥砍判定+1。' }, 描述: '制式武器', 数量: 1,
};
const 药剂 = { 名称: '基础治疗药剂', 描述: '恢复 30% 生命。', 数量: 5, 类型: '消耗品药剂', 阶位: '一阶' };

describe('buildReviewPrompt', () => {
  it('单件：包含物品与两道审核的规则关键词', () => {
    const p = buildReviewPrompt([{ item: 蓝武, kind: 'equip' }]);
    expect(p).toContain('制式长刀');
    expect(p).toContain('规则审核');
    expect(p).toContain('红线审核');
    expect(p).toContain('政治敏感');
    expect(p).toContain('NSFW');
    expect(p).toContain('常驻数值基准'); // 装备口径
    expect(p).toContain('共 1 件');
  });

  it('多件：一次审多件，列出全部物品并要求逐件结论', () => {
    const p = buildReviewPrompt([
      { item: 蓝武, kind: 'equip' },
      { item: 药剂, kind: 'goods' },
    ]);
    expect(p).toContain('共 2 件');
    expect(p).toContain('制式长刀');
    expect(p).toContain('基础治疗药剂');
    expect(p).toContain('—1—');
    expect(p).toContain('—2—');
    expect(p).toContain('results');
  });

  it('标注口径决定是否附装备基准：全标道具时不出现数值基准', () => {
    const goods = buildReviewPrompt([{ item: 药剂, kind: 'goods' }]);
    expect(goods).not.toContain('常驻数值基准');
    expect(goods).toContain('红线审核');
  });

  it('混批时任一装备即附装备规则段（逐件标注在清单里体现）', () => {
    const p = buildReviewPrompt([
      { item: 药剂, kind: 'goods' },
      { item: 蓝武, kind: 'equip' },
    ]);
    expect(p).toContain('常驻数值基准');
    expect(p).toContain('（道具）');
    expect(p).toContain('（装备）');
  });
});

describe('reviewVerdict · 单件归一', () => {
  it('通过 / 不通过带理由 / 不通过无理由兜底', () => {
    expect(reviewVerdict({ pass: true, reasons: [] })).toEqual({ pass: true, reasons: [] });
    expect(reviewVerdict({ pass: false, reasons: ['效果数值超基准'] }).reasons).toEqual(['效果数值超基准']);
    const noReason = reviewVerdict({ pass: false, reasons: [] });
    expect(noReason.reasons[0]).toContain('未给出');
  });
  it('理由规整为字符串并去空', () => {
    expect(reviewVerdict({ pass: false, reasons: ['  ', 123, '正常理由'] }).reasons).toEqual(['123', '正常理由']);
  });
  it('格式垃圾 → 抛错（fail-closed）', () => {
    expect(() => reviewVerdict(null)).toThrow();
    expect(() => reviewVerdict('pass')).toThrow();
    expect(() => reviewVerdict({ foo: 1 })).toThrow();
  });
});

describe('reviewVerdicts · 批量归一', () => {
  it('按名称映射结论', () => {
    const m = reviewVerdicts(
      { results: [
        { 名称: '制式长刀', pass: true, reasons: [] },
        { 名称: '基础治疗药剂', pass: false, reasons: ['描述含敏感内容'] },
      ] },
      ['制式长刀', '基础治疗药剂'],
    );
    expect(m.get('制式长刀')!.pass).toBe(true);
    expect(m.get('基础治疗药剂')!.pass).toBe(false);
    expect(m.get('基础治疗药剂')!.reasons).toEqual(['描述含敏感内容']);
  });

  it('接受裸数组', () => {
    const m = reviewVerdicts([{ 名称: 'A', pass: true, reasons: [] }], ['A']);
    expect(m.get('A')!.pass).toBe(true);
  });

  it('有物品没被审到 → 抛错（绝不放行未审物品）', () => {
    expect(() =>
      reviewVerdicts({ results: [{ 名称: '制式长刀', pass: true, reasons: [] }] }, ['制式长刀', '漏审的刀']),
    ).toThrow(/漏审的刀/);
  });

  it('results 缺失/非数组 → 抛错', () => {
    expect(() => reviewVerdicts({ nope: 1 }, ['A'])).toThrow();
    expect(() => reviewVerdicts(null, ['A'])).toThrow();
  });

  it('单行格式异常按缺失处理（触发缺失检查）', () => {
    expect(() =>
      reviewVerdicts({ results: [{ 名称: 'A', pass: 'yes', reasons: [] }] }, ['A']),
    ).toThrow(/未覆盖/);
  });
});

describe('cacheKey · 审核缓存键', () => {
  it('数量变化不改键（改价/改数量不重审）', () => {
    expect(cacheKey({ ...蓝武, 数量: 1 })).toBe(cacheKey({ ...蓝武, 数量: 99 }));
  });
  it('内容变化改键（改描述/效果需重审）', () => {
    expect(cacheKey(蓝武)).not.toBe(cacheKey({ ...蓝武, 描述: '新描述' }));
    expect(cacheKey(蓝武)).not.toBe(cacheKey({ ...蓝武, 效果: { 新: '效果' } }));
  });
  it('字段顺序不影响键', () => {
    const a = { 名称: 'x', 描述: 'y', 数量: 1 };
    const b = { 描述: 'y', 名称: 'x', 数量: 2 };
    expect(cacheKey(a)).toBe(cacheKey(b));
  });
});
