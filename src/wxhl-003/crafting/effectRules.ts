// ================================================================
// 世界书《装备效果强度限制》移植：常驻数值基准 + 触发/消耗倍率 + 违禁项
// 设计填补（世界书未列明，可调常量）：
//   - 触发/消耗类统一取常驻上限的 2 倍（世界书原文为 1.5~2 倍区间）
//   - 缺触发条件或缺消耗的触发/消耗类 → 降级为常驻并按常驻上限钳制
// 实现注记（与任务书给定的正则有一处不同，理由见下）：
//   - 「无条件即死」判定改为整串负向先行断言：原式 `即死(?!.*(条件|…))`
//     只向 即死 之后看，而条件通常写在 即死 之前（如「生命低于15%时即死」），
//     会把合法条目误判为违禁。现改为「全串无任何条件/消耗字样」才算无条件。
//   - 违禁扫描同时覆盖 描述 / 触发条件 / 消耗 三处文本，避免条件写在
//     触发条件字段时被误杀；不放宽判定，只是把条件出处认全。
// ================================================================

export type EffectKind = '常驻' | '触发' | '消耗';

export interface EffectEntry {
  类型: EffectKind;
  描述: string;
  命中闪避?: number;
  伤害百分比?: number;
  属性加成?: number;
  触发条件?: string;
  消耗?: string;
}

export interface EffectCapRow {
  命中闪避: readonly [number, number];
  伤害百分比: readonly [number, number];
  属性加成: number;
}

/** 下标 = 阶位（0 不用）：世界书《装备效果强度限制》常驻类数值基准 */
export const EFFECT_CAP: readonly EffectCapRow[] = [
  { 命中闪避: [0, 0], 伤害百分比: [0, 0], 属性加成: 0 },
  { 命中闪避: [3, 6], 伤害百分比: [7, 13], 属性加成: 1 },
  { 命中闪避: [5, 10], 伤害百分比: [10, 20], 属性加成: 2 },
  { 命中闪避: [7, 13], 伤害百分比: [13, 27], 属性加成: 3 },
  { 命中闪避: [8, 17], 伤害百分比: [17, 33], 属性加成: 4 },
  { 命中闪避: [10, 20], 伤害百分比: [20, 40], 属性加成: 6 },
];

const TRIGGER_MULT = 2; // 触发/消耗类上限倍率（设计填补）

/** 该阶位该类型的效果数值上限（取区间最大值，再乘类型倍率） */
export function descaleCap(阶位: number, 类型: EffectKind): { 命中闪避: number; 伤害百分比: number; 属性加成: number } {
  const row = EFFECT_CAP[阶位];
  if (!row) throw new Error(`未知阶位：${阶位}`);
  const m = 类型 === '常驻' ? 1 : TRIGGER_MULT;
  return {
    命中闪避: row.命中闪避[1] * m,
    伤害百分比: row.伤害百分比[1] * m,
    属性加成: row.属性加成 * m,
  };
}

/** 单条效果钳制：超上限回钳；触发/消耗类缺条件或缺消耗 → 降级为常驻 */
export function clampEffect(entry: EffectEntry, 阶位: number): { entry: EffectEntry; clamped: string[] } {
  const clamped: string[] = [];
  const e: EffectEntry = { ...entry };

  if ((e.类型 === '触发' || e.类型 === '消耗') && (!e.触发条件 || !e.消耗)) {
    clamped.push(`「${e.描述}」缺少${!e.触发条件 ? '触发条件' : '消耗'}，已降级为常驻类`);
    e.类型 = '常驻';
  }

  const cap = descaleCap(阶位, e.类型);
  const 钳 = (字段: '命中闪避' | '伤害百分比' | '属性加成') => {
    const v = e[字段];
    if (typeof v !== 'number' || !Number.isFinite(v)) return;
    if (v > cap[字段]) {
      clamped.push(`「${e.描述}」${字段} ${v} 超出${阶位}阶${e.类型}类上限，已钳至 ${cap[字段]}`);
      e[字段] = cap[字段];
    }
  };
  钳('命中闪避');
  钳('伤害百分比');
  钳('属性加成');
  return { entry: e, clamped };
}

/** 违禁项：命中即整体拒绝（不钳制） */
export const FORBIDDEN_PATTERNS: readonly { 名: string; test: RegExp }[] = [
  // 全串没有任何「条件/消耗」字样却出现 即死/秒杀 → 无条件即死
  { 名: '无条件即死', test: /^(?![\s\S]*(?:(?<!无)条件|消耗|每场|低于|概率|几率))[\s\S]*(?:即死|秒杀)/ },
  // 全串没有任何「回合/次数/消耗/持续」字样却出现 无敌 → 永久无敌
  { 名: '永久无敌', test: /^(?![\s\S]*(?:回合|次数|消耗|持续))[\s\S]*(?:永久|无限|绝对)?[\s\S]*无敌/ },
  { 名: '无限资源/锁血', test: /无限(资源|弹药|MP|HP)|锁血|血量锁定/ },
  { 名: '无条件必中核心弱点', test: /^(?![\s\S]*(?:条件|消耗|每场|概率|几率))[\s\S]*必中[\s\S]*(?:核心|弱点|要害)/ },
];

/** 违禁扫描覆盖的文本：描述 + 触发条件 + 消耗 */
function 扫描文本(e: EffectEntry): string {
  return [e.描述, e.触发条件, e.消耗].filter(Boolean).join(' ');
}

/** 校验一组效果：条数 ≤2、无违禁项、逐条钳制；返回钳制后的效果列表 */
export function checkEffects(
  效果: EffectEntry[],
  阶位: number,
): { ok: boolean; reasons: string[]; 效果: EffectEntry[]; clamped: string[] } {
  const reasons: string[] = [];
  if (效果.length > 2) {
    reasons.push(`效果条目 ${效果.length} 条，超出世界书上限 2 条`);
  }
  for (const e of 效果) {
    const text = 扫描文本(e);
    for (const p of FORBIDDEN_PATTERNS) {
      if (p.test.test(text)) reasons.push(`「${e.描述}」命中违禁项：${p.名}`);
    }
  }
  if (reasons.length > 0) return { ok: false, reasons, 效果, clamped: [] };

  const clamped: string[] = [];
  const out = 效果.map(e => {
    const r = clampEffect(e, 阶位);
    clamped.push(...r.clamped);
    return r.entry;
  });
  return { ok: true, reasons: [], 效果: out, clamped };
}
