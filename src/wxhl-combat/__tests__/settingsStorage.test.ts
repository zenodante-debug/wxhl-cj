import { beforeEach, describe, expect, it } from 'vitest';
import { 读设置, 保存设置, 设置存储键 } from '../settingsStore';

// ================================================================
// 玩家实测：「为什么我每次刷新酒馆后，就需要重新填 api。」
//
// 病根：设置存在 `getVariables({type:'script', script_id})`（脚本变量）—— 它**跟着脚本走**，
// 换角色卡 / 换聊天文件 / 重装脚本就没了。
//
// 玩家裁定：照抄小手机的存法（`localStorage`），**但要用自己的键，和小手机隔离**。
// 小手机的键是 `wxhl003_settings`（src/wxhl-003/store.ts:71）—— 我们叫 `wxhl-combat_settings`。
// ================================================================

/** node 里没有 localStorage —— 造一个够用的假货（顺便能断言"到底写了哪个键"） */
function 造假存储(初始: Record<string, string> = {}) {
  const 表 = new Map(Object.entries(初始));
  const 写过的键: string[] = [];
  const 假 = {
    getItem: (k: string) => (表.has(k) ? 表.get(k)! : null),
    setItem: (k: string, v: string) => {
      表.set(k, v);
      写过的键.push(k);
    },
    removeItem: (k: string) => void 表.delete(k),
  };
  (globalThis as any).localStorage = 假;
  return { 表, 写过的键 };
}

describe('设置的存放位置', () => {
  beforeEach(() => {
    delete (globalThis as any).localStorage;
    delete (globalThis as any).getVariables;
    delete (globalThis as any).getScriptId;
  });

  it('**键与小手机不同名**（两个脚本同时装着也不会互相看到、更不会互相覆盖）', () => {
    expect(设置存储键).toBe('wxhl-combat_settings');
    expect(设置存储键).not.toBe('wxhl003_settings');
  });

  it('读：localStorage 里有什么就读什么（刷新页面/换聊天都还在）', () => {
    造假存储({
      [设置存储键]: JSON.stringify({ 快路: { url: 'https://a.b', apiKey: 'k', model: 'm' }, 意图模式: '随机' }),
    });

    const s = 读设置();
    expect(s.快路.url).toBe('https://a.b');
    expect(s.快路.apiKey).toBe('k');
    expect(s.意图模式).toBe('随机');
  });

  it('写：写到**自己的键**上，而且回读对得上才算成功', () => {
    const { 表, 写过的键 } = 造假存储();

    const r = 保存设置({ 快路: { url: 'https://x.y', apiKey: 'secret', model: 'm', timeout: 5000 } } as any);

    expect(r.成功).toBe(true);
    expect(写过的键).toEqual([设置存储键]);
    expect(JSON.parse(表.get(设置存储键)!).快路.apiKey).toBe('secret');
  });

  it('本地存储被禁用（隐私模式）→ **如实报失败**，不假装成功', () => {
    (globalThis as any).localStorage = {
      getItem: () => { throw new Error('SecurityError: 本地存储被禁用'); },
      setItem: () => { throw new Error('SecurityError: 本地存储被禁用'); },
    };

    const r = 保存设置({ 快路: { url: 'https://x.y', apiKey: 'k' } } as any);

    expect(r.成功).toBe(false);
    expect(r.原因).toMatch(/localStorage|本地存储/);
  });

  it('写进去却被别的东西改掉 → 回读对不上 = 失败（不谎报成功）', () => {
    (globalThis as any).localStorage = {
      getItem: () => JSON.stringify({ 快路: { url: 'https://别的', apiKey: '别的' } }),
      setItem: () => {},
    };

    const r = 保存设置({ 快路: { url: 'https://x.y', apiKey: 'k' } } as any);
    expect(r.成功).toBe(false);
  });

  // 老用户（设置以前存在脚本变量里）不该被逼着重填一次
  it('迁移：本地还没有、脚本变量里有 → **搬过来并写进本地**', () => {
    const { 表 } = 造假存储();
    (globalThis as any).getScriptId = () => 'sid';
    (globalThis as any).getVariables = () => ({
      快路: { url: 'https://老地址', apiKey: '老 key', model: '老模型', timeout: 30000 },
      翻译缓存: { 版本: 1, 条目: {} }, // 同一个变量表里的别的键，不许被当成设置
    });

    const s = 读设置();

    expect(s.快路.url).toBe('https://老地址');
    expect(表.get(设置存储键)).toContain('https://老地址'); // 搬完就落盘，下次不用再搬
  });

  it('迁移只在**本地为空**时发生：本地有值就绝不拿脚本变量盖它', () => {
    造假存储({ [设置存储键]: JSON.stringify({ 快路: { url: 'https://本地的', apiKey: 'k' } }) });
    (globalThis as any).getScriptId = () => 'sid';
    (globalThis as any).getVariables = () => ({ 快路: { url: 'https://脚本变量的', apiKey: '旧的' } });

    expect(读设置().快路.url).toBe('https://本地的');
  });

  it('本地没有、脚本变量也没有 → 默认设置（不炸）', () => {
    造假存储();
    (globalThis as any).getScriptId = () => 'sid';
    (globalThis as any).getVariables = () => ({});

    expect(读设置().快路.url).toBe('');
    expect(读设置().意图模式).toBe('ai');
  });

  it('本地存的是垃圾字符串 → 不炸，退回默认', () => {
    造假存储({ [设置存储键]: '{不是 json' });

    expect(读设置().快路.url).toBe('');
  });

  it('**保存不再写脚本变量**（单一来源，别两边各留一份会打架的）', () => {
    const { 写过的键 } = 造假存储();
    const 脚本变量写 = { 次数: 0 };
    (globalThis as any).replaceVariables = () => { 脚本变量写.次数++; };

    保存设置({ 快路: { url: 'https://x.y', apiKey: 'k' } } as any);

    expect(写过的键).toEqual([设置存储键]);
    expect(脚本变量写.次数).toBe(0);
  });
});
