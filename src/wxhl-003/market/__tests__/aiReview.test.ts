import { describe, expect, it } from 'vitest';
import { buildReviewPrompt, cacheKey, reviewVerdict } from '../aiReview';

const 蓝武 = {
  名称: '制式长刀', 类型: '武器', 品质: '蓝色', 阶位: '二阶', 伤害骰: '4d8',
  效果: { 利刃: '命中后小幅流血。', 配重: '挥砍判定+1。' }, 描述: '制式武器', 数量: 1,
};
const 药剂 = { 名称: '基础治疗药剂', 描述: '恢复 30% 生命。', 数量: 5, 类型: '消耗品药剂', 阶位: '一阶' };

describe('buildReviewPrompt', () => {
  it('包含物品 JSON 与两道审核的规则关键词', () => {
    const p = buildReviewPrompt(蓝武, 'equip');
    expect(p).toContain('制式长刀');
    expect(p).toContain('规则审核');
    expect(p).toContain('红线审核');
    expect(p).toContain('政治敏感');
    expect(p).toContain('NSFW');
    expect(p).toContain('效果'); // 效果条目铁律
  });
  it('装备带数值基准表，道具说明只审效果与红线', () => {
    const equip = buildReviewPrompt(蓝武, 'equip');
    const goods = buildReviewPrompt(药剂, 'goods');
    expect(equip).toContain('常驻数值基准');
    expect(goods).not.toContain('常驻数值基准');
    expect(goods).toContain('红线审核');
  });
});

describe('reviewVerdict · 结果归一', () => {
  it('通过', () => {
    expect(reviewVerdict({ pass: true, reasons: [] })).toEqual({ pass: true, reasons: [] });
  });
  it('不通过带理由', () => {
    const v = reviewVerdict({ pass: false, reasons: ['效果数值超基准', '描述含敏感内容'] });
    expect(v.pass).toBe(false);
    expect(v.reasons).toEqual(['效果数值超基准', '描述含敏感内容']);
  });
  it('不通过但没给理由 → 兜底文案', () => {
    const v = reviewVerdict({ pass: false, reasons: [] });
    expect(v.pass).toBe(false);
    expect(v.reasons.length).toBe(1);
    expect(v.reasons[0]).toContain('未给出');
  });
  it('理由规整为字符串并去空', () => {
    const v = reviewVerdict({ pass: false, reasons: ['  ', 123, '正常理由'] });
    expect(v.reasons).toEqual(['123', '正常理由']);
  });
  it('格式垃圾 → 抛错（fail-closed 由调用方拒绝上架）', () => {
    expect(() => reviewVerdict(null)).toThrow();
    expect(() => reviewVerdict('pass')).toThrow();
    expect(() => reviewVerdict({ foo: 1 })).toThrow();
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
