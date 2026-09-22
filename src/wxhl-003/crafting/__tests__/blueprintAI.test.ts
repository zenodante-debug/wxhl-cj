import { describe, expect, it } from 'vitest';
import { buildDesignPrompt, sanitizeCompletion, sanitizeDesign, type DesignTarget } from '../blueprintAI';
import type { 图纸数据, 配方 } from '../recipes';

const 目标: DesignTarget = {
  成品类型: '装备', 装备子类: '武器', 种类: '短剑', 品质: '金色', 阶位: 3,
  核心材料: ['深渊魔狼王的牙'], 行业: '锻造', 设计要求: '削铁如泥的短刃', 名称: '狼王牙刃',
};

/** AI 返回的原始 JSON（模拟） */
function rawAI(patch: Record<string, unknown> = {}) {
  return {
    名称: '狼王牙刃', 品质: '金色', 阶位: 3, 行业: '锻造', 成品类型: '装备', 装备子类: '武器',
    装备基础: '短剑', 参照模板: '短剑', 道具类型: '其他', 道具固定值: 0, 关联属性: 'PER',
    描述: '以魔狼之牙锻造的利刃',
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
    const r = sanitizeDesign(rawAI({ 品质: '紫色', 阶位: 5, 成品类型: '道具' }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.品质).toBe('金色');
    expect(r.数据.配方.阶位).toBe(3);
    expect(r.数据.配方.成品类型).toBe('装备'); // 目标说装备，AI 说道具 → 以目标为准
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

// 参照模板 必须落在真实数值表里且与 装备子类 同类：
// AI 编造的模板键会流进 buildEquip 产坏物品（v2 里直接抛错），装备基础 则退化为自由文本种类名
describe('sanitizeDesign · 参照模板校验（v2.1 数值来源）', () => {
  it('武器：参照模板=法杖（WEAPON_TABLE 键）→ 采用，装备基础 存自由文本种类名', () => {
    const r = sanitizeDesign(rawAI({ 参照模板: '法杖' }), { ...目标, 种类: '浮游炮' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('武器');
    expect(r.数据.配方.参照模板).toBe('法杖');
    expect(r.数据.配方.装备基础).toBe('浮游炮');
  });
  it('武器：参照模板=魔杖（WEAPON_TABLE 键）→ 采用（旧三元会误判为防具）', () => {
    const r = sanitizeDesign(rawAI({ 参照模板: '魔杖' }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('武器');
    expect(r.数据.配方.参照模板).toBe('魔杖');
  });
  it('武器：参照模板=轻装（防具光谱）→ 拒（不同类）', () => {
    const r = sanitizeDesign(rawAI({ 参照模板: '轻装' }), 目标);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('参照模板');
  });
  it('防具：参照模板=重装（防具光谱）→ 装备子类「防具」，装备基础 存种类名', () => {
    const r = sanitizeDesign(rawAI({ 参照模板: '重装' }), { ...目标, 装备子类: '防具', 种类: '重装' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('防具');
    expect(r.数据.配方.参照模板).toBe('重装');
    expect(r.数据.配方.装备基础).toBe('重装');
  });
  it('防具：参照模板=短剑（武器键）→ 拒（不同类）', () => {
    const r = sanitizeDesign(rawAI({ 参照模板: '短剑' }), { ...目标, 装备子类: '防具' });
    expect(r.ok).toBe(false);
  });
  it('饰品：参照模板 一律清空（数值只走 attrBonus(饰品)），并留痕', () => {
    const r = sanitizeDesign(rawAI({ 参照模板: '短剑' }), { ...目标, 装备子类: '饰品', 种类: '指环' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('饰品');
    expect(r.数据.配方.参照模板).toBe('');
    expect(r.数据.配方.装备基础).toBe('指环');
    expect(r.clamped.join()).toContain('饰品');
  });
  it('参照模板=不存在的键 → 拒绝并给理由', () => {
    const r = sanitizeDesign(rawAI({ 参照模板: '不存在的武器' }), 目标);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('参照模板');
    expect(r.reasons.join()).toContain('不存在的武器');
  });
  it('装备子类为空 → 拒绝并给理由（AI/旧 UI 都拿不到可校验的数值来源）', () => {
    const r = sanitizeDesign(rawAI(), { ...目标, 装备子类: '' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('装备子类');
  });
  it('道具 → 装备基础/装备子类/参照模板 一律为空串（AI 编造的模板被丢弃）', () => {
    const r = sanitizeDesign(
      rawAI({ 装备基础: '不存在的武器', 参照模板: '不存在的武器', 道具类型: '恢复HP', 道具固定值: 30 }),
      { ...目标, 成品类型: '道具', 装备子类: '', 种类: '' },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备基础).toBe('');
    expect(r.数据.配方.装备子类).toBe('');
    expect(r.数据.配方.参照模板).toBe('');
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
  // H2：非法/异型 参照模板 必须在写入侧收口（v1 靠 setBpBase 的键校验挡，v2 会一路抛到 doCraft）
  it('参照模板 是对象/数字等异型值 → 拒绝（不抛错），绝不流进配方', () => {
    const r = 不抛(() => sanitizeDesign(rawAI({ 参照模板: { 键: '短剑' } }), 目标));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reasons.join()).toContain('参照模板');
  });
  it('参照模板 是数字 → 拒绝（不抛错）', () => {
    expect(不抛(() => sanitizeDesign(rawAI({ 参照模板: 3 }), 目标)).ok).toBe(false);
  });
  it('道具类型 是对象 → 拒绝（不抛错）', () => {
    const r = 不抛(() => sanitizeDesign(rawAI({ 道具类型: {} }), { ...目标, 成品类型: '道具', 装备子类: '' }));
    expect(r.ok).toBe(false);
  });
  it('道具固定值 是对象 → 不抛错，按 0 处理并留痕', () => {
    const r = 不抛(() => sanitizeDesign(rawAI({ 道具类型: '恢复HP', 道具固定值: {} }), { ...目标, 成品类型: '道具', 装备子类: '' }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.道具固定值).toBe(0);
    expect(r.clamped.join()).toContain('道具固定值');
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

// ---------------------------------------------------------------
// v2.1 定制：参照模板 / 自由种类 / 饰品 / 结构化道具 / 设计要求与多核心材料
// ---------------------------------------------------------------
describe('v2.1 AI 定制', () => {
  const 目标: DesignTarget = {
    成品类型: '装备', 装备子类: '武器', 种类: '浮游炮', 品质: '金色', 阶位: 1,
    核心材料: ['精铁', '兽骨'], 行业: '工程', 设计要求: '会飞的连射炮', 名称: '浮游炮',
  };
  it('装备：AI 给参照模板则采用，成品名取玩家填的名称', () => {
    const r = sanitizeDesign({ ...rawAI({ 参照模板: '突击步枪' }) }, 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.参照模板).toBe('突击步枪');
    expect(r.数据.配方.装备基础).toBe('浮游炮');
    expect(r.数据.配方.成品名).toBe('浮游炮');
  });
  it('装备：参照模板与子类不同类 → 拒', () => {
    const r = sanitizeDesign({ ...rawAI({ 参照模板: '轻装' }) }, 目标); // 轻装是防具光谱
    expect(r.ok).toBe(false);
  });
  it('装备：参照模板缺失 → 拒', () => {
    expect(sanitizeDesign({ ...rawAI({ 参照模板: '' }) }, 目标).ok).toBe(false);
  });
  it('饰品：参照模板可为空', () => {
    const t = { ...目标, 装备子类: '饰品' as const, 种类: '指环' };
    const r = sanitizeDesign({ ...rawAI({ 参照模板: '' }) }, t);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('饰品');
  });
  it('道具：类型与固定值落库，超上限被钳', () => {
    const t: DesignTarget = { ...目标, 成品类型: '道具', 装备子类: '', 种类: '', 品质: '金色' };
    const r = sanitizeDesign(rawAI({ 道具类型: '恢复HP', 道具固定值: 999, 关联属性: 'PER' }), t);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.道具类型).toBe('恢复HP');
    expect(r.数据.配方.道具固定值).toBeLessThanOrEqual(120);
    expect(r.clamped.length).toBeGreaterThan(0);
  });
  it('道具：非法类型 → 拒', () => {
    const t: DesignTarget = { ...目标, 成品类型: '道具', 装备子类: '', 种类: '' };
    expect(sanitizeDesign(rawAI({ 道具类型: '随便', 道具固定值: 10 }), t).ok).toBe(false);
  });
  it('设计要求与多核心材料进提示词', () => {
    const p = buildDesignPrompt(目标);
    expect(p).toContain('会飞的连射炮');
    expect(p).toContain('精铁');
    expect(p).toContain('兽骨');
  });

  // ---- 名称解析：玩家优先、留空则由 AI 起名 ----
  it('玩家没填名称 → 用 AI 起的名（成品名 与 配方名 同取该名）', () => {
    const r = sanitizeDesign(rawAI({ 名称: '浮游连射炮' }), { ...目标, 名称: '' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.成品名).toBe('浮游连射炮');
    expect(r.数据.配方.名称).toBe('浮游连射炮');
  });
  it('玩家填了名称 → 即使 AI 改名也以玩家为准', () => {
    const r = sanitizeDesign(rawAI({ 名称: 'AI乱起' }), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.成品名).toBe('浮游炮');
    expect(r.数据.配方.名称).toBe('浮游炮');
  });
  it('设计要求 落进配方（存档留痕）', () => {
    const r = sanitizeDesign(rawAI(), 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.设计要求).toBe('会飞的连射炮');
  });

  // ---- 道具固定值钳制：上限按品质（设计填补常量） ----
  it.each([['白色', 60], ['蓝色', 60], ['金色', 120], ['紫色', 200]] as const)(
    '道具固定值上限按品质：%s → 钳到 %i',
    (品质, 上限) => {
      const t: DesignTarget = { ...目标, 成品类型: '道具', 装备子类: '', 品质 };
      const r = sanitizeDesign(rawAI({ 品质, 道具类型: '恢复HP', 道具固定值: 9999 }), t);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.数据.配方.道具固定值).toBe(上限);
      expect(r.clamped.join()).toContain('上限');
    },
  );
  it('道具固定值 为负/非数 → 钳到 0 并留痕（不抛错）', () => {
    const t: DesignTarget = { ...目标, 成品类型: '道具', 装备子类: '', 品质: '金色' };
    const r = sanitizeDesign(rawAI({ 道具类型: '恢复MP', 道具固定值: -50 }), t);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.道具固定值).toBe(0);
    expect(r.clamped.join()).toContain('道具固定值');
  });
  it('道具：关联属性 CON 落库；非法值落回 PER 并留痕', () => {
    const t: DesignTarget = { ...目标, 成品类型: '道具', 装备子类: '', 品质: '金色' };
    const 好 = sanitizeDesign(rawAI({ 道具类型: '餐食', 道具固定值: 10, 关联属性: 'CON' }), t);
    expect(好.ok).toBe(true);
    if (!好.ok) return;
    expect(好.数据.配方.关联属性).toBe('CON');
    const 坏 = sanitizeDesign(rawAI({ 道具类型: '餐食', 道具固定值: 10, 关联属性: 'STR' }), t);
    expect(坏.ok).toBe(true);
    if (!坏.ok) return;
    expect(坏.数据.配方.关联属性).toBe('PER');
    expect(坏.clamped.join()).toContain('关联属性');
  });
  it('道具：未给关联属性 → 落 PER 且留痕（与「未给道具类型」对称，不再静默兜底）', () => {
    const t: DesignTarget = { ...目标, 成品类型: '道具', 装备子类: '', 品质: '金色' };
    const r = sanitizeDesign(rawAI({ 道具类型: '爆炸物', 道具固定值: 30, 关联属性: undefined }), t);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.关联属性).toBe('PER'); // 兜底值仍是 PER（口径不变）
    expect(r.clamped.join()).toContain('未给关联属性'); // 但缺省这件事必须留痕
  });

  // ---- 提示词：数值来源表与自由种类名都要说清楚 ----
  it('装备提示词：给出武器模板清单并说明「种类」只是风味名', () => {
    const p = buildDesignPrompt(目标);
    expect(p).toContain('突击步枪'); // WEAPON_TABLE 的键在清单里
    expect(p).toContain('参照模板');
    expect(p).toContain('浮游炮');
  });
  it('道具提示词：给出 道具类型 枚举与固定值上限', () => {
    const p = buildDesignPrompt({ ...目标, 成品类型: '道具', 装备子类: '' });
    expect(p).toContain('道具类型');
    expect(p).toContain('恢复HP');
    expect(p).toContain('120'); // 金上限
    // 爆炸物口径必须与 buildGoods 一致：固定值是**附加**固定伤害，骰数由品质决定（旧文案写的「每阶骰数基准」是反向语义）
    expect(p).toContain('附加固定伤害');
  });
});

// 补全路径（v2.1）：装备必须由 AI 重新给出同子类 参照模板；
// 现有的合法值靠 mergeBlueprintData 的 base 优先保住（所以 prompt 要求已有值原样返回）
describe('sanitizeCompletion · v2.1 数值来源', () => {
  function 现有装备(): 图纸数据 {
    const r = sanitizeDesign(rawAI({ 参照模板: '突击步枪' }), {
      成品类型: '装备', 装备子类: '武器', 种类: '浮游炮', 品质: '金色', 阶位: 1,
      核心材料: ['精铁'], 行业: '工程', 设计要求: '', 名称: '浮游炮',
    });
    if (!r.ok) throw new Error('测试夹具构造失败');
    return r.数据;
  }
  it('现有 参照模板 合法 → AI 给别的也不改写（base 优先）', () => {
    const r = sanitizeCompletion(rawAI({ 参照模板: '短剑' }), 现有装备(), 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.参照模板).toBe('突击步枪');
    expect(r.数据.配方.装备基础).toBe('浮游炮');
  });
  it('AI 给非法 参照模板 → 整份拒绝（硬校验先于合流）', () => {
    expect(sanitizeCompletion(rawAI({ 参照模板: '轻装' }), 现有装备(), 1).ok).toBe(false);
  });
  it('AI 漏给 参照模板 → 用存档值垫上照常补全（小模型漏字段不该白跑一次）', () => {
    const r = sanitizeCompletion(rawAI({ 参照模板: '' }), 现有装备(), 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.参照模板).toBe('突击步枪');
  });
  it('存档 参照模板 也为空（v2 老图纸）→ 拒（AI 必须按表挑一个）', () => {
    const 老图纸: 图纸数据 = { ...现有装备(), 配方: { ...现有装备().配方, 参照模板: '' } };
    expect(sanitizeCompletion(rawAI({ 参照模板: '' }), 老图纸, 1).ok).toBe(false);
    // AI 按表补一个 → 补全成功（老图纸的迁移路径）
    const r = sanitizeCompletion(rawAI({ 参照模板: '法杖' }), 老图纸, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.参照模板).toBe('法杖');
  });
  it('现有 成品类型=道具 → 参照模板 必须留空（AI 硬塞也被丢弃）', () => {
    const 道具数据 = sanitizeDesign(rawAI({ 道具类型: '恢复HP', 道具固定值: 30 }), {
      成品类型: '道具', 装备子类: '', 种类: '', 品质: '金色', 阶位: 1,
      核心材料: ['月光草'], 行业: '炼金', 设计要求: '', 名称: '狼血秘药',
    });
    expect(道具数据.ok).toBe(true);
    if (!道具数据.ok) return;
    const r = sanitizeCompletion(rawAI({ 参照模板: '短剑' }), 道具数据.数据, 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.参照模板).toBe('');
    expect(r.数据.配方.道具类型).toBe('恢复HP');
    expect(r.数据.配方.道具固定值).toBe(30);
  });
});
