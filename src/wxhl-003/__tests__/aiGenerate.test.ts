import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aiGenerate } from '../store';

/**
 * aiGenerate 的 schema 净化（方案 B）与 400 降级（方案 C）:
 * - B: 发出去的 json_schema 必须先经 sanitizeJsonSchema 净化
 * - C: API 以 400/参数类错误拒收 schema 时, 自动去掉 json_schema 降级重试
 * generateRaw 是酒馆助手注入的全局函数, 这里换成内存桩并按调用捕获。
 */
describe('aiGenerate · schema 净化与 400 降级', () => {
  const cfg = { url: 'https://api.example.com', apiKey: 'k', model: 'test-model', timeout: 30000, maxRetries: 3 };
  /** 模拟 zod 转换产物: 带 $schema/minLength/propertyNames/additionalProperties/default, required 不全 */
  const 脏schema = {
    name: 'test_gen',
    value: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        名称: { type: 'string', minLength: 1 },
        天赋: { type: 'object', propertyNames: { type: 'string' }, additionalProperties: {}, default: {} },
      },
      required: ['名称'],
    } as Record<string, any>,
  };

  const 桩键 = ['generateRaw'] as const;
  let 原值: Record<string, unknown> = {};
  let 调用记录: any[] = [];

  beforeEach(() => {
    原值 = {};
    for (const k of 桩键) 原值[k] = (globalThis as any)[k];
    调用记录 = [];
  });

  // 桩是本文件私有的, 用完必须还原（同 settlementStore.test.ts 的约定）
  afterEach(() => {
    for (const k of 桩键) {
      if (原值[k] === undefined) delete (globalThis as any)[k];
      else (globalThis as any)[k] = 原值[k];
    }
  });

  it('发出的 json_schema 是净化后的（禁字删除, required 补全）', async () => {
    (globalThis as any).generateRaw = async (config: any) => {
      调用记录.push(config);
      return '{"名称":"甲","天赋":{}}';
    };
    await aiGenerate(cfg, '生成', 脏schema);
    expect(调用记录.length).toBe(1);
    const 发出的 = 调用记录[0].json_schema.value;
    expect(发出的.$schema).toBeUndefined();
    expect(发出的.properties.名称).toEqual({ type: 'string' });
    expect(发出的.properties.天赋).toEqual({ type: 'object' });
    expect(发出的.required).toEqual(['名称', '天赋']);
  });

  it('API 400 拒收 schema → 自动降级为无 schema 重试并成功', async () => {
    (globalThis as any).generateRaw = async (config: any) => {
      调用记录.push(config);
      if (config.json_schema) {
        // 现场报错的关键特征: Bad Request / 400 / INVALID_ARGUMENT
        throw new Error(
          'Chat completion request error: Bad Request {"error":{"message":"upstream status 400 INVALID_ARGUMENT","type":"invalid_request_error"}}',
        );
      }
      return '{"名称":"甲"}';
    };
    const out = await aiGenerate(cfg, '生成', 脏schema);
    expect(out).toBe('{"名称":"甲"}');
    expect(调用记录.length).toBe(2);
    expect(调用记录[0].json_schema).toBeDefined();
    expect(调用记录[1].json_schema).toBeUndefined();
  });

  it('非 400 类错误不触发降级, 三次尝试都携带 schema', async () => {
    (globalThis as any).generateRaw = async (config: any) => {
      调用记录.push(config);
      throw new Error('Request timeout after 30000ms');
    };
    await expect(aiGenerate(cfg, '生成', 脏schema)).rejects.toThrow('Request timeout');
    expect(调用记录.length).toBe(3); // 现状: 带 schema 的 API 错误照旧跑满三次尝试
    expect(调用记录.every(c => c.json_schema)).toBe(true);
  });
});
