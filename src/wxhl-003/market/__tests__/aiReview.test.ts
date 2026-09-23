import { describe, expect, it } from 'vitest';
import { buildReviewPrompt, cacheKey, reviewVerdict, reviewVerdicts } from '../aiReview';

const 蓝武 = {
  名称: '制式长刀', 类型: '武器', 品质: '蓝色', 阶位: '二阶', 伤害骰: '4d8',
  效果: { 利刃: '命中后小幅流血。', 配重: '挥砍判定+1。' }, 描述: '制式武器', 数量: 1,
};
const 药剂 = { 名称: '基础治疗药剂', 描述: '恢复 30% 生命。', 数量: 5, 类型: '消耗品药剂', 阶位: '一阶' };

describe('buildReviewPrompt', () => {
  it('单件：包含物品与两道审核的规则关键词 + 真实阶位判定要求', () => {
    const p = buildReviewPrompt([{ item: 蓝武, kind: 'equip', nominalIdx: 1 }]);
    expect(p).toContain('制式长刀');
    expect(p).toContain('规则审核');
    expect(p).toContain('红线审核');
    expect(p).toContain('政治敏感');
    expect(p).toContain('NSFW');
    expect(p).toContain('常驻数值基准'); // 装备口径
    expect(p).toContain('真实阶位');
    expect(p).toContain('超脱');
    expect(p).toContain('共 1 件');
    expect(p).toContain('名义二阶');
  });

  it('多件：一次审多件，列出全部物品并要求逐件结论', () => {
    const p = buildReviewPrompt([
      { item: 蓝武, kind: 'equip', nominalIdx: 1 },
      { item: 药剂, kind: 'goods', nominalIdx: 0 },
    ]);
    expect(p).toContain('共 2 件');
    expect(p).toContain('制式长刀');
    expect(p).toContain('基础治疗药剂');
    expect(p).toContain('—1—');
    expect(p).toContain('—2—');
    expect(p).toContain('results');
  });

  it('标注口径决定规则段：全标道具时不出现装备数值基准', () => {
    const goods = buildReviewPrompt([{ item: 药剂, kind: 'goods', nominalIdx: 0 }]);
    expect(goods).not.toContain('常驻数值基准');
    expect(goods).toContain('红线审核');
  });

  it('混批时两段规则都给（逐件标注在清单里体现）', () => {
    const p = buildReviewPrompt([
      { item: 药剂, kind: 'goods', nominalIdx: 0 },
      { item: 蓝武, kind: 'equip', nominalIdx: 1 },
    ]);
    expect(p).toContain('常驻数值基准');
    expect(p).toContain('装备');
    expect(p).toContain('道具');
  });
});

describe('reviewVerdict · 单件归一（含真实阶位）', () => {
  it('合规：realTier 解析为下标', () => {
    expect(reviewVerdict({ pass: true, reasons: [], realTier: '二阶', opPoints: [] })).toEqual({
      pass: true, reasons: [], realIdx: 1, opPoints: [],
    });
  });
  it('超模：realTier=超脱 + 超模点', () => {
    const v = reviewVerdict({ pass: true, reasons: [], realTier: '超脱', opPoints: ['无限资源倒转'] });
    expect(v.pass).toBe(true);
    expect(v.realIdx).toBe(5);
    expect(v.opPoints).toEqual(['无限资源倒转']);
  });
  it('不通过带理由 / 不通过无理由兜底', () => {
    const v = reviewVerdict({ pass: false, reasons: ['描述含敏感内容'], realTier: '一阶', opPoints: [] });
    expect(v.pass).toBe(false);
    expect(v.reasons).toEqual(['描述含敏感内容']);
    const noReason = reviewVerdict({ pass: false, reasons: [], realTier: '一阶', opPoints: [] });
    expect(noReason.reasons[0]).toContain('未给出');
  });
  it('realTier 无法识别 → realIdx=null（由调用方回退名义阶位）', () => {
    expect(reviewVerdict({ pass: true, reasons: [], realTier: '???', opPoints: [] }).realIdx).toBeNull();
    expect(reviewVerdict({ pass: true, reasons: [], opPoints: [] }).realIdx).toBeNull();
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
        { 名称: '制式长刀', pass: true, reasons: [], realTier: '二阶', opPoints: [] },
        { 名称: '基础治疗药剂', pass: false, reasons: ['描述含敏感内容'], realTier: '一阶', opPoints: [] },
      ] },
      ['制式长刀', '基础治疗药剂'],
    );
    expect(m.get('制式长刀')!.pass).toBe(true);
    expect(m.get('基础治疗药剂')!.pass).toBe(false);
    expect(m.get('基础治疗药剂')!.reasons).toEqual(['描述含敏感内容']);
  });

  it('接受裸数组', () => {
    const m = reviewVerdicts([{ 名称: 'A', pass: true, reasons: [], realTier: '一阶', opPoints: [] }], ['A']);
    expect(m.get('A')!.pass).toBe(true);
  });

  it('有物品没被审到 → 抛错（绝不放行未审物品）', () => {
    expect(() =>
      reviewVerdicts({ results: [{ 名称: '制式长刀', pass: true, reasons: [], realTier: '二阶', opPoints: [] }] }, ['制式长刀', '漏审的刀']),
    ).toThrow(/漏审的刀/);
  });

  it('results 缺失/非数组 → 抛错', () => {
    expect(() => reviewVerdicts({ nope: 1 }, ['A'])).toThrow();
    expect(() => reviewVerdicts(null, ['A'])).toThrow();
  });

  it('单行格式异常按缺失处理（触发缺失检查）', () => {
    expect(() =>
      reviewVerdicts({ results: [{ 名称: 'A', pass: 'yes', reasons: [], realTier: '一阶', opPoints: [] }] }, ['A']),
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
