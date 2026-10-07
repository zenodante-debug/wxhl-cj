import { describe, expect, it } from 'vitest';
import { 拉取模型, 测试连接 } from '../store';

const 配置 = (覆盖: Partial<{ url: string; apiKey: string; model: string; timeout: number }> = {}) => ({
  url: 'https://a.b',
  apiKey: 'k',
  model: 'm',
  timeout: 30000,
  ...覆盖,
});

describe('settingsApi · 拉取模型', () => {
  it('未填 URL → 抛错', async () => {
    await expect(拉取模型(配置({ url: '' }))).rejects.toThrow('请先填写 API URL');
  });

  it('getModelList 不可用 → 抛错（提示酒馆助手版本）', async () => {
    (globalThis as any).getModelList = undefined;
    await expect(拉取模型(配置())).rejects.toThrow('getModelList 不可用');
  });

  it('成功 → 原样返回列表', async () => {
    (globalThis as any).getModelList = async () => ['m1', 'm2'];
    expect(await 拉取模型(配置())).toEqual(['m1', 'm2']);
  });

  it('API 返回非数组 → 返回空数组（界面按「未返回列表」提示）', async () => {
    (globalThis as any).getModelList = async () => null;
    expect(await 拉取模型(配置())).toEqual([]);
  });

  it('apiKey 透传给 getModelList', async () => {
    let 收到: any = null;
    (globalThis as any).getModelList = async (arg: any) => {
      收到 = arg;
      return [];
    };
    await 拉取模型(配置({ url: 'https://x.y', apiKey: 'secret' }));
    expect(收到).toEqual({ apiurl: 'https://x.y', key: 'secret' });
  });
});

describe('settingsApi · 测试连接', () => {
  it('成功 → 返回 trim 后的回复', async () => {
    (globalThis as any).generateRaw = async () => '  连接成功  ';
    expect(await 测试连接(配置())).toBe('连接成功');
  });

  it('回复超长 → 截断到 80 字（避免爆版）', async () => {
    (globalThis as any).generateRaw = async () => 'x'.repeat(200);
    expect((await 测试连接(配置())).length).toBe(80);
  });

  it('API 未配置 → 抛错', async () => {
    await expect(测试连接(配置({ url: '', apiKey: '' }))).rejects.toThrow('API 未配置');
  });

  it('走的是正式调用同一条通道（aiGenerate）：generateRaw 报错会原样抛出', async () => {
    (globalThis as any).generateRaw = async () => {
      throw new Error('401 Unauthorized');
    };
    await expect(测试连接(配置())).rejects.toThrow(/401|生成失败/);
  });
});
