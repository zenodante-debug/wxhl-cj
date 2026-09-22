import { describe, expect, it } from 'vitest';
import { sanitizeCompletion, sanitizeDesign, type DesignTarget } from '../blueprintAI';
import type { 图纸数据, 配方 } from '../recipes';

const 目标: DesignTarget = {
  名称: '狼王牙刃', 成品类型: '装备', 子类: '短剑', 品质: '金色', 阶位: 3,
  核心材料: '深渊魔狼王的牙', 行业: '锻造',
};

/** AI 返回的原始 JSON（模拟） */
function rawAI(patch: Record<string, unknown> = {}) {
  return {
    名称: '狼王牙刃', 品质: '金色', 阶位: 3, 行业: '锻造', 成品类型: '装备', 装备子类: '武器',
    装备基础: '短剑', 描述: '以魔狼之牙锻造的利刃',
    材料: [{ 类别: '怪物素材', 数量: 1, 核心: true }, { 类别: '金属', 数量: 2, 核心: false }],
    效果: [{ 类型: '触发', 描述: '撕咬：命中时附加流血', 伤害百分比: 12, 触发条件: '命中时', 消耗: '每场3次' }],
    ...patch,
  };
}

describe('sanitizeDesign · AI 结果硬校验', () => {
  it('合法输入 → 生成完整图纸数据', () => {
    const r = sanitizeDesign(rawAI(), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.名称).toBe('狼王牙刃');
    expect(r.数据.配方.品质).toBe('金色');
    expect(r.数据.配方.技能要求).toEqual({ 分类: '高级', 等级: 1 }); // 金=高级Lv.1
    expect(r.数据.制作者).toBe('AI');
    expect(r.数据.补全).toBe(false);
  });
  it('超限数值被钳回并记录', () => {
    const r = sanitizeDesign(rawAI({ 效果: [{ 类型: '常驻', 描述: '锋锐', 伤害百分比: 99 }] }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.效果[0].伤害百分比).toBe(27);
    expect(r.clamped.length).toBe(1);
  });
  it('违禁效果 → 拒绝并给理由', () => {
    const r = sanitizeDesign(rawAI({ 效果: [{ 类型: '常驻', 描述: '获得永久无敌' }] }), 目标);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('违禁');
  });
  it('银色品质 → 拒绝（世界书不可制作）', () => {
    const r = sanitizeDesign(rawAI({ 品质: '银色' }), 目标);
    expect(r.ok).toBe(false);
  });
  it('品质/成品类型/阶位与目标不符 → 强制回到目标值', () => {
    const r = sanitizeDesign(rawAI({ 品质: '紫色', 阶位: 5, 成品类型: '消耗品' }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.品质).toBe('金色');
    expect(r.数据.配方.阶位).toBe(3);
    expect(r.数据.配方.成品类型).toBe('装备'); // 目标说装备，AI 说消耗品 → 以目标为准
    expect(r.数据.配方.装备子类).toBe('武器');
  });
  it('被子强制回目标值的字段同时进 clamped（成功路径只回传 clamped）', () => {
    const r = sanitizeDesign(rawAI({ 品质: '紫色', 阶位: 5 }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.clamped.join()).toContain('品质被强制回到目标值');
    expect(r.clamped.join()).toContain('阶位被强制回到目标值');
  });
  it('AI 的描述写入 配方.描述（风味文案有落点）', () => {
    const r = sanitizeDesign(rawAI(), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.描述).toBe('以魔狼之牙锻造的利刃');
  });
  it('AI 未给描述 → 落空串（不报错）', () => {
    const r = sanitizeDesign(rawAI({ 描述: undefined }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.描述).toBe('');
  });
  it('缺材料 → 拒绝', () => {
    const r = sanitizeDesign(rawAI({ 材料: [] }), 目标);
    expect(r.ok).toBe(false);
  });
  it('紫色 = 高级技能 Lv.5', () => {
    const r = sanitizeDesign(rawAI({ 品质: '紫色' }), { ...目标, 品质: '紫色' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.技能要求).toEqual({ 分类: '高级', 等级: 5 });
  });
  // 白/蓝不在图纸体系内（只有金/紫能生成图纸），但补全路径会走到，映射必须写对：
  // 一律给「高级 Lv.5」会让一张白图纸比金图纸还难做
  const 技能要求用例: [DesignTarget['品质'], '基础' | '高级', number][] = [
    ['白色', '基础', 1],
    ['蓝色', '基础', 3],
    ['金色', '高级', 1],
    ['紫色', '高级', 5],
  ];
  it.each(技能要求用例)('技能要求映射：%s → %s Lv.%i', (品质, 分类, 等级) => {
    const r = sanitizeDesign(rawAI({ 品质 }), { ...目标, 品质 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.技能要求).toEqual({ 分类, 等级 });
  });
});

// 装备基础必须落在真实数值表里：AI 编造的武器名/光谱会流进 buildEquip 产出坏物品
describe('sanitizeDesign · 装备基础参照校验', () => {
  it('子类=法杖（WEAPON_TABLE 键）→ 装备子类「武器」，装备基础原样保留', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 子类: '法杖' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('武器');
    expect(r.数据.配方.装备基础).toBe('法杖');
  });
  it('子类=魔杖（WEAPON_TABLE 键）→ 装备子类「武器」（旧三元会误判为防具）', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 子类: '魔杖' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('武器');
  });
  it('子类=重装（防具光谱）→ 装备子类「防具」', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 子类: '重装' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('防具');
    expect(r.数据.配方.装备基础).toBe('重装');
  });
  it('子类=极轻（防具光谱）→ 装备子类「防具」', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 子类: '极轻' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('防具');
  });
  it('子类=不存在的武器 → 拒绝并给理由', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 子类: '不存在的武器' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('未知的装备基础');
  });
  it('消耗品 → 装备基础与装备子类一律为空串（AI 编造的基础被丢弃）', () => {
    const r = sanitizeDesign(rawAI({ 装备基础: '不存在的武器' }), { ...目标, 成品类型: '消耗品', 子类: '' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备基础).toBe('');
    expect(r.数据.配方.装备子类).toBe('');
  });
});

// 契约：对任何输入都返回 ok:false + 理由，绝不抛错（两个异步入口的 try/catch 只兜 AI 调用）
describe('sanitizeDesign · no-throw 契约', () => {
  /** 调用并断言不抛；返回值用于继续断言 */
  function 不抛(fn: () => ReturnType<typeof sanitizeDesign>) {
    let out: ReturnType<typeof sanitizeDesign> | undefined;
    expect(() => {
      out = fn();
    }).not.toThrow();
    return out!;
  }

  it('AI 编造材料类别 → 拒绝（不抛 ZodError），理由指名该字段', () => {
    const r = 不抛(() => sanitizeDesign(rawAI({ 材料: [{ 类别: '禁忌素材', 数量: 1, 核心: true }] }), 目标));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons.join()).toContain('材料');
    expect(r.reasons.join()).toContain('禁忌素材');
  });
  it('AI 编造效果类型 → 拒绝（不抛 ZodError），理由指名该字段', () => {
    const r = 不抛(() => sanitizeDesign(rawAI({ 效果: [{ 类型: '爆发', 描述: '强力一击' }] }), 目标));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons.join()).toContain('效果');
  });
  it('材料项不是对象 → 不抛错，按「任意」类目兜底', () => {
    const r = 不抛(() => sanitizeDesign(rawAI({ 材料: ['精铁'] }), 目标));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.材料).toEqual([{ 类别: '任意', 数量: 1, 核心: false }]);
  });
  it('效果不是数组 → 当作无效果，照常成功', () => {
    const r = 不抛(() => sanitizeDesign(rawAI({ 效果: '撕咬' }), 目标));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.效果).toEqual([]);
  });
  it('阶位 0 → 拒绝（EFFECT_CAP[0] 是零哨兵行，不拦住会把数值静默钳成 0）', () => {
    const r = 不抛(() => sanitizeDesign(rawAI(), { ...目标, 阶位: 0 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('非法阶位');
  });
  it('阶位越界（6）→ 拒绝', () => {
    const r = 不抛(() => sanitizeDesign(rawAI(), { ...目标, 阶位: 6 }));
    expect(r.ok).toBe(false);
  });
});

// 补全路径：AI 结果必须与「现有」做 base 优先合并（Task 3 裁决），
// 整份替换配方会让一次补全抹掉玩家已有的合法内容
describe('sanitizeCompletion · 补全（base 优先合流，绝不覆盖既有合法值）', () => {
  /** 现有图纸夹具：以合法图纸为底，再覆写想测的字段 */
  function 现有图纸(patch: Partial<配方> = {}): 图纸数据 {
    const r = sanitizeDesign(rawAI(), 目标);
    if (!r.ok) throw new Error('测试夹具构造失败');
    return {
      ...r.数据,
      制作者: '玩家',
      补全: false,
      配方: { ...r.数据.配方, 描述: '玩家写的风味', ...patch },
    };
  }

  it('AI 描述为空 → 保留玩家已有描述，不清空', () => {
    const r = sanitizeCompletion(rawAI({ 描述: undefined }), 现有图纸(), 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.描述).toBe('玩家写的风味');
  });
  it('现有描述为空时 → 采用 AI 的描述', () => {
    const r = sanitizeCompletion(rawAI(), 现有图纸({ 描述: '' }), 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.描述).toBe('以魔狼之牙锻造的利刃');
  });
  it('现有合法品质=金色 不被 AI 的紫色 改写', () => {
    const r = sanitizeCompletion(rawAI({ 品质: '紫色' }), 现有图纸({ 品质: '金色' }), 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.品质).toBe('金色');
  });
  it('白色图纸补全后仍是白色（不被 AI 或映射升格）', () => {
    const r = sanitizeCompletion(rawAI({ 品质: '金色' }), 现有图纸({ 品质: '白色' }), 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.品质).toBe('白色');
  });
  it('现有材料为空 → 用 AI 的材料补齐', () => {
    const r = sanitizeCompletion(rawAI(), 现有图纸({ 材料: [] }), 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.材料.length).toBe(2);
  });
  it('名称不可被 AI 改写（配方库去重键）', () => {
    const r = sanitizeCompletion(rawAI({ 名称: 'AI乱改' }), 现有图纸(), 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.名称).toBe('狼王牙刃');
  });
  it('补全恒为 true', () => {
    const r = sanitizeCompletion(rawAI(), 现有图纸(), 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.补全).toBe(true);
    expect(现有图纸().补全).toBe(false);
  });
  it('硬校验不过 → 原样拒绝，不产出合并结果', () => {
    const r = sanitizeCompletion(rawAI({ 效果: [{ 类型: '常驻', 描述: '获得永久无敌' }] }), 现有图纸(), 3);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('违禁');
  });
  it('阶位非法 → 原样拒绝（守卫在补全路径同样生效）', () => {
    const r = sanitizeCompletion(rawAI(), 现有图纸(), 0);
    expect(r.ok).toBe(false);
  });
});
