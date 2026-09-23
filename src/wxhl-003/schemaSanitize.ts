// ================================================================
// 请求侧 JSON Schema 净化器
//
// zod 的 z.toJSONSchema 会输出 propertyNames/additionalProperties（z.record 产物）、
// default（prefault 产物）、minLength（min 产物）等关键字 —— 这些都不在 Gemini
// responseSchema 接受的 OpenAPI 3.0 子集里, 上游为 Gemini 的中转会直接
// 400 INVALID_ARGUMENT（实测于敌人生成, 2026-09）。
//
// 净化只作用于**发给 AI 的请求提示**; 收到回复后的校验仍走各模块自己的
// zod schema（EnemyGenResultSchema.parse 等）, 一字不动 —— 脏数据照旧进不了存档。
// ================================================================

/** 各家结构化输出普遍不接受（或 Gemini 明确拒绝）的关键字 */
const 剔除关键字 = new Set([
  '$schema',
  'default',
  'minLength',
  'maxLength',
  'pattern',
  'propertyNames',
  'patternProperties',
  'additionalProperties',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'examples',
  'title',
  'not',
  'allOf',
  'oneOf',
]);

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 把任意 zod 转换或手写的 JSON Schema 净化成「最大兼容子集」:
 * - 删除上表关键字 —— z.record 字段（propertyNames+additionalProperties）自然退化成裸 {type:'object'}
 * - anyOf 带 {type:'null'} 分支（.nullable() 产物）→ 收成非空分支
 * - 每个 object 的全部字段补进 required（Gemini 硬性要求: 所有字段必列）
 *
 * 幂等: 对已净化的 schema 再跑一遍结果不变。
 */
export function sanitizeJsonSchema(schema: Record<string, any>): Record<string, any> {
  return 净化(schema);
}

function 净化(node: any): any {
  if (Array.isArray(node)) return node.map(净化);
  if (!isPlainObject(node)) return node;

  // nullable 产物: anyOf 里混着 {type:'null'} —— 取唯一的非空分支
  if (Array.isArray(node.anyOf)) {
    const 非空分支 = node.anyOf.filter(m => !isPlainObject(m) || m.type !== 'null');
    if (非空分支.length === 1 && 非空分支.length < node.anyOf.length) {
      return 净化(非空分支[0]);
    }
  }

  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(node)) {
    if (剔除关键字.has(k)) continue;
    out[k] = 净化(v);
  }

  // Gemini 要求 properties 里出现的字段必须全部列入 required
  if (out.type === 'object' && isPlainObject(out.properties)) {
    out.required = Object.keys(out.properties);
  }
  return out;
}
