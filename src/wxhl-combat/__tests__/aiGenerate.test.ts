import { describe, expect, it } from 'vitest';
import { aiGenerate } from '../store';

describe('aiGenerate · 精简版', () => {
  it('API 未配置 → 抛错', async () => {
    await expect(aiGenerate({ url: '', apiKey: '', model: '', timeout: 30000 }, 'x')).rejects.toThrow('API 未配置');
  });

  it('要求 JSON 但返回非 JSON → 重试 3 次后抛带原始回复的错（Review Focus 3）', async () => {
    let 次数 = 0;
    (globalThis as any).generateRaw = async () => {
      次数++;
      return '这不是 JSON';
    };

    await expect(
      aiGenerate(
        { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 30000 },
        'x',
        { name: 't', value: { type: 'object' } },
      ),
    ).rejects.toThrow('非 JSON');
    expect(次数).toBe(3);
  });

  it('返回合法 JSON → 直接返回', async () => {
    (globalThis as any).generateRaw = async () => '{"a":1}';
    const r = await aiGenerate(
      { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 30000 },
      'x',
      { name: 't', value: { type: 'object' } },
    );
    expect(r).toBe('{"a":1}');
  });
});
