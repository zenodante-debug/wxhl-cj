import { describe, expect, it, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore, 读设置 } from '../settingsStore';

// ================================================================
// 玩家实测：「设置完却没有写入脚本变量」 —— 填好了、测试通过（那读的是 pinia 内存值），
// 开战却报「API 未配置」（那读的是**脚本变量**）。
//
// 根因形态：写回是一个 `watchEffect` 里的 fire-and-forget `replaceVariables`，
// 失败只会被 Vue 丢进 console —— 界面上完全看不出来，用户以为存上了。
//
// 修法：**显式保存 + 写后回读校验**，失败必须让界面看得见：
//   `store.保存()` → 返回 { 成功, 原因 }；不一致或抛错都算失败（附原因）。
// ================================================================

/** 假脚本变量表（getVariables / replaceVariables / getScriptId 三个全局） */
function 装假变量表() {
  let 表: Record<string, any> = {};
  (globalThis as any).getScriptId = () => 'script-1';
  (globalThis as any).getVariables = () => JSON.parse(JSON.stringify(表));
  (globalThis as any).replaceVariables = (v: Record<string, any>) => {
    表 = JSON.parse(JSON.stringify(v));
  };
  return {
    读表: () => 表,
    写表: (v: Record<string, any>) => {
      表 = v;
    },
    /** 模拟"写不进去"：replaceVariables 变成空操作（酒馆侧拒绝/抛错都长这样） */
    让写入失效: () => {
      (globalThis as any).replaceVariables = () => {};
    },
  };
}

beforeEach(() => setActivePinia(createPinia()));

describe('设置写入 · 显式保存 + 写后回读校验', () => {
  it('保存成功 → 值真的进了脚本变量表，且**其它键（翻译缓存/战斗）不被抹掉**', () => {
    const 假 = 装假变量表();
    假.写表({ 翻译缓存: { 条目: { x: 1 } }, 战斗: { 进行中: true } });
    const store = useSettingsStore();

    store.settings.快路.url = 'https://api.example/v1';
    store.settings.快路.apiKey = 'sk-1';
    const r = store.保存();

    expect(r.成功).toBe(true);
    const 表 = 假.读表();
    expect(表.快路.url).toBe('https://api.example/v1');
    expect(表.快路.apiKey).toBe('sk-1');
    expect(表.翻译缓存).toEqual({ 条目: { x: 1 } }); // 合并写，不抹别的键
    expect(表.战斗).toEqual({ 进行中: true });
  });

  it('**写不进去 → 报告失败并带原因**（以前这里静默，界面照旧显示已配置）', () => {
    const 假 = 装假变量表();
    const store = useSettingsStore();
    store.settings.快路.url = 'https://api.example/v1';
    假.让写入失效();

    const r = store.保存();

    expect(r.成功).toBe(false);
    expect(r.原因).toBeTruthy();
  });

  it('replaceVariables 抛错 → 也报告失败（不把异常丢给 Vue 的全局处理）', () => {
    装假变量表();
    const store = useSettingsStore();
    (globalThis as any).replaceVariables = () => {
      throw new Error('变量表只读');
    };

    const r = store.保存();

    expect(r.成功).toBe(false);
    expect(r.原因).toContain('变量表只读');
  });

  it('保存后 读设置() 能读回同样的值（两条路一致 —— 这就是玩家报的那个断点）', () => {
    装假变量表();
    const store = useSettingsStore();
    store.settings.快路.url = 'https://api.example/v1';
    store.settings.快路.apiKey = 'sk-2';
    store.settings.意图模式 = '随机';
    store.保存();

    const 回读 = 读设置();

    expect(回读.快路.url).toBe('https://api.example/v1');
    expect(回读.快路.apiKey).toBe('sk-2');
    expect(回读.意图模式).toBe('随机');
  });

  it('保存状态存进 store（界面据此显示「未保存」提示）', () => {
    const 假 = 装假变量表();
    const store = useSettingsStore();
    假.让写入失效();
    store.保存();

    expect(store.保存状态?.成功).toBe(false);
  });

  it('没有 watchEffect 的隐式写入：只改内存不调保存 → 变量表原样不动', () => {
    const 假 = 装假变量表();
    const store = useSettingsStore();
    store.settings.快路.url = 'https://api.example/v1';

    // 注意：这里**不调** 保存()
    expect(假.读表().快路?.url ?? '').toBe('');
  });
});
