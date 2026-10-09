import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { aiGenerate, 重置端点拒收记忆 } from '../store';
import { 结构化输出被拒 } from '../schemaSanitize';

/**
 * aiGenerate 的 schema 净化（方案 B）与「API 不认结构化输出」降级（方案 C）:
 * - B: 发出去的 json_schema 必须先经 sanitizeJsonSchema 净化
 * - C: API 以参数类错误拒收 schema 时, 自动去掉 json_schema 降级重试
 *      （判定在 `schemaSanitize.结构化输出被拒`，**与战斗脚本共用一份**）
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
    // 「这个端点拒收过 schema」是**跨调用**的记忆（省掉每次都白撞一次）——
     // 用例之间必须清掉，否则前一条用例的降级会传染给后一条。
    重置端点拒收记忆();
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

  it('**DeepSeek 的「response_format type is unavailable」也触发降级**（早先漏了 → 连错 3 次）', async () => {
    // 实测根因（2026-10-10）：酒馆助手把 json_schema 翻成 response_format:{type:'json_schema'}，
    // DeepSeek 端点直接回「This response_format type is unavailable now」—— 不含 400、不含 invalid，
    // 老判定一个都不沾，于是带着同样的 schema 连错 3 次，最后把「模型返回不合法 JSON」这个**假原因**
    // 抛给玩家（换别的模型却好好的）。
    (globalThis as any).generateRaw = async (config: any) => {
      调用记录.push(config);
      if (config.json_schema) throw new Error('This response_format type is unavailable now');
      return '{"名称":"甲"}';
    };
    const out = await aiGenerate(cfg, '生成', 脏schema);

    expect(out).toBe('{"名称":"甲"}');
    expect(调用记录.length).toBe(2); // 只错一次就降级（不是错满 3 次）
    expect(调用记录[0].json_schema).toBeDefined();
    expect(调用记录[1].json_schema).toBeUndefined();
  });

  it('「不支持 / unsupported」这类中文与英文写法也认', () => {
    expect(结构化输出被拒('unsupported response_format')).toBe(true);
    expect(结构化输出被拒('该模型不支持结构化输出')).toBe(true);
    expect(结构化输出被拒('Bad Request: INVALID_ARGUMENT')).toBe(true);
    // 暂时性错误**不**降级（不该因为一次超时就永久丢掉 schema）
    expect(结构化输出被拒('Request timeout after 30000ms')).toBe(false);
    expect(结构化输出被拒('429 Too Many Requests')).toBe(false);
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
