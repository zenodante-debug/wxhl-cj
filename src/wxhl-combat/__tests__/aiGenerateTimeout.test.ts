import { describe, expect, it } from 'vitest';
import { aiGenerate } from '../store';

const 配置 = { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 5000 };

describe('aiGenerate · 超时（generateRaw 自己不提供，必须由脚本兜）', () => {
  it('请求超过 cfg.timeout 未返回 → 抛超时错，不无限等待', async () => {
    (globalThis as any).generateRaw = () => new Promise(() => {}); // 永不 resolve，模拟挂死
    const 开始 = Date.now();

    await expect(aiGenerate({ ...配置, timeout: 50 }, '你好')).rejects.toThrow(/超时/);

    // 上界算术：无 schema 时 aiGenerate 重试 3 次，每次各吃一个 50ms 超时，
    // 重试之间还各睡 2 秒 → 约 3×50 + 2×2000 ≈ 4.1 秒。
    // 这条断言的意义是**有界**（不设超时它会永远挂着），不是某个精确值。
    expect(Date.now() - 开始).toBeLessThan(8000);
  }, 15000);

  it('超时算一次失败并重试，最终抛的错误里带「超时」', async () => {
    let 次数 = 0;
    (globalThis as any).generateRaw = () => {
      次数++;
      return new Promise(() => {});
    };

    await expect(aiGenerate({ ...配置, timeout: 30 }, '你好')).rejects.toThrow(/超时/);
    expect(次数).toBe(3); // 三次尝试都被超时掐掉
  }, 15000);

  it('timeout 为 0 / 非有限数 → 不设超时（正常返回不受影响）', async () => {
    (globalThis as any).generateRaw = async () => '连接成功';
    await expect(aiGenerate({ ...配置, timeout: 0 }, '你好')).resolves.toBe('连接成功');
  });

  it('正常返回不受超时影响', async () => {
    (globalThis as any).generateRaw = async () => '连接成功';
    await expect(aiGenerate({ ...配置, timeout: 5000 }, '你好')).resolves.toBe('连接成功');
  });
});
