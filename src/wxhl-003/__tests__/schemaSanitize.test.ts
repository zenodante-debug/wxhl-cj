import { describe, expect, it } from 'vitest';
import { sanitizeJsonSchema } from '../schemaSanitize';
import { EnemyGenResultSchema } from '../enemyRules';
import { DungeonGenResultSchema } from '../dungeonRules';
import { SettlementGenResultSchema } from '../settlementRules';

/**
 * sanitizeJsonSchema 的存在理由:
 * zod 的 z.toJSONSchema 会输出 propertyNames/additionalProperties（z.record 产物）、
 * default（prefault）、minLength（min）等关键字 —— 这些都不在 Gemini responseSchema
 * 接受的 OpenAPI 3.0 子集里, 上游为 Gemini 的中转会直接 400 INVALID_ARGUMENT。
 * 净化只作用于发给 AI 的请求, 回复校验仍走各模块自己的 zod schema, 一字不动。
 */

/** Gemini 不接受的 OpenAPI 关键字 —— 即净化器必须删掉的东西 */
const 禁字 = ['$schema', 'default', 'minLength', 'maxLength', 'pattern', 'propertyNames', 'additionalProperties'] as const;

/** 深度遍历, 收集禁字出现的路径 */
function 找禁字(node: unknown, path = '$'): string[] {
  if (Array.isArray(node)) return node.flatMap((v, i) => 找禁字(v, `${path}[${i}]`));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) =>
      (禁字 as readonly string[]).includes(k) ? [`${path}.${k}`] : 找禁字(v, `${path}.${k}`),
    );
  }
  return [];
}

/** 深度遍历, 断言每个 object 节点的 required 覆盖全部字段（Gemini 硬性要求） */
function 要求全required(node: unknown, path = '$'): void {
  if (Array.isArray(node)) return node.forEach((v, i) => 要求全required(v, `${path}[${i}]`));
  if (node && typeof node === 'object') {
    const n = node as Record<string, unknown>;
    if (n.type === 'object' && n.properties && typeof n.properties === 'object') {
      expect(new Set(n.required as string[]), `${path} 的 required 应覆盖全部字段`).toEqual(
        new Set(Object.keys(n.properties as object)),
      );
    }
    Object.entries(n).forEach(([k, v]) => 要求全required(v, `${path}.${k}`));
  }
}

describe('sanitizeJsonSchema · 请求侧 schema 净化', () => {
  it('敌人 schema（zod 转换, 含 8 处 z.record）净化后不含任何禁字', () => {
    const 原始 = z.toJSONSchema(EnemyGenResultSchema, { io: 'input' }) as any;
    expect(找禁字(原始).length).toBeGreaterThan(0); // 前置: 未净化前确实带禁字, 否则本测试失去意义
    const 净化后 = sanitizeJsonSchema(原始);
    expect(找禁字(净化后)).toEqual([]);
  });

  it('结算 schema（含 nullable 的 anyOf）同样净化干净', () => {
    const 原始 = z.toJSONSchema(SettlementGenResultSchema, { io: 'input' }) as any;
    expect(找禁字(原始).length).toBeGreaterThan(0);
    const 净化后 = sanitizeJsonSchema(原始);
    expect(找禁字(净化后)).toEqual([]);
  });

  it('副本 schema 同样净化干净', () => {
    const 原始 = z.toJSONSchema(DungeonGenResultSchema, { io: 'input' }) as any;
    expect(找禁字(原始).length).toBeGreaterThan(0);
    const 净化后 = sanitizeJsonSchema(原始);
    expect(找禁字(净化后)).toEqual([]);
  });

  it('净化后所有 object 的字段全部进入 required', () => {
    const 净化后 = sanitizeJsonSchema(z.toJSONSchema(EnemyGenResultSchema, { io: 'input' }) as any);
    要求全required(净化后);
  });

  it('z.record 字段（propertyNames+additionalProperties+default）退化成裸 object', () => {
    const out = sanitizeJsonSchema({
      type: 'object',
      properties: {
        天赋: { type: 'object', propertyNames: { type: 'string' }, additionalProperties: {}, default: {} },
      },
      required: ['天赋'],
    });
    expect(out.properties.天赋).toEqual({ type: 'object' });
  });

  it('nullable（anyOf 带 null 分支）取非空分支并照常补 required', () => {
    const out: any = sanitizeJsonSchema({
      anyOf: [
        { type: 'object', properties: { 名称: { type: 'string' } }, required: ['名称'] },
        { type: 'null' },
      ],
    });
    expect(out.anyOf).toBeUndefined();
    expect(out.type).toBe('object');
    expect(out.required).toEqual(['名称']);
  });

  it('保留 Gemini 支持的约束: enum/minimum/maximum/minItems/maxItems/items/description', () => {
    const out = sanitizeJsonSchema({
      type: 'object',
      properties: {
        类型: { type: 'string', enum: ['杂兵', 'BOSS'], description: '类型' },
        等级: { type: 'integer', minimum: 1, maximum: 999 },
        敌人: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
      },
      required: ['类型', '等级', '敌人'],
    });
    expect(out).toEqual({
      type: 'object',
      properties: {
        类型: { type: 'string', enum: ['杂兵', 'BOSS'], description: '类型' },
        等级: { type: 'integer', minimum: 1, maximum: 999 },
        敌人: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
      },
      required: ['类型', '等级', '敌人'],
    });
  });

  it('幂等: 已净化的 schema 再净化一遍结果不变', () => {
    const 一次 = sanitizeJsonSchema(z.toJSONSchema(EnemyGenResultSchema, { io: 'input' }) as any);
    expect(sanitizeJsonSchema(一次)).toEqual(一次);
  });
});
