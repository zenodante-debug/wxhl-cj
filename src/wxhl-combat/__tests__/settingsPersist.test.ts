import { describe, expect, it, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSettingsStore, 读设置, 设置存储键 } from '../settingsStore';

// ================================================================
// 玩家实测：「设置完却没有写入」 —— 填好了、测试通过（那读的是 pinia 内存值），
// 开战却报「API 未配置」（那读的是**真的存下来的那份**）。
//
// 根因形态：写回是一个 `watchEffect` 里的 fire-and-forget，失败只会被 Vue 丢进 console
// —— 界面上完全看不出来，用户以为存上了。
//
// 修法：**显式保存 + 写后回读校验**，失败必须让界面看得见：
//   `store.保存()` → 返回 { 成功, 原因 }；不一致或抛错都算失败（附原因）。
//
// ⚠️ 2026-10-11 改存储位置（plan §22.1）：从**脚本变量**搬到 **localStorage**
//（`wxhl-combat_settings`，与小手机的 `wxhl003_settings` 隔离）——
// 脚本变量跟着脚本走，换卡/换聊天就没了（玩家报的「每次刷新酒馆后就要重填 API」）。
// 所以这个文件里的"存储"由假脚本变量表换成了假 localStorage。
// ================================================================

/** 假 localStorage（顺便能断言"到底写了哪个键"） */
function 装假存储(初始: Record<string, string> = {}) {
  const 表 = new Map(Object.entries(初始));
  (globalThis as any).localStorage = {
    getItem: (k: string) => (表.has(k) ? 表.get(k)! : null),
    setItem: (k: string, v: string) => void 表.set(k, v),
    removeItem: (k: string) => void 表.delete(k),
  };
  return {
    读: (k = 设置存储键) => (表.has(k) ? 表.get(k)! : null),
    写: (v: Record<string, any>, k = 设置存储键) => void 表.set(k, JSON.stringify(v)),
  };
}

beforeEach(() => {
  delete (globalThis as any).getVariables;
  delete (globalThis as any).getScriptId;
  setActivePinia(createPinia());
});

describe('设置写入 · 显式保存 + 写后回读校验', () => {
  it('保存成功 → 值真的进了 localStorage（自己的键）', () => {
    const 假 = 装假存储();
    const store = useSettingsStore();

    store.settings.快路.url = 'https://api.example/v1';
    store.settings.快路.apiKey = 'sk-1';
    const r = store.保存();

    expect(r.成功).toBe(true);
    const 存 = JSON.parse(假.读()!);
    expect(存.快路.url).toBe('https://api.example/v1');
    expect(存.快路.apiKey).toBe('sk-1');
  });

  it('**写不进去 → 报告失败并带原因**（以前这里静默，界面照旧显示已配置）', () => {
    const store = useSettingsStore();
    // 模拟"写不进去"：setItem 空操作（隐私模式丢写就长这样）
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
    store.settings.快路.url = 'https://api.example/v1';

    const r = store.保存();

    expect(r.成功).toBe(false);
    expect(r.原因).toBeTruthy();
  });

  it('localStorage 抛错 → 也报告失败（不把异常丢给 Vue 的全局处理）', () => {
    装假存储();
    const store = useSettingsStore();
    (globalThis as any).localStorage = {
      getItem: () => null,
      setItem: () => { throw new Error('本地存储只读'); },
    };

    const r = store.保存();

    expect(r.成功).toBe(false);
    expect(r.原因).toContain('本地存储只读');
  });

  it('保存后 读设置() 能读回同样的值（两条路一致 —— 这就是玩家报的那个断点）', () => {
    装假存储();
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
    const store = useSettingsStore();
    (globalThis as any).localStorage = { getItem: () => null, setItem: () => {} };
    store.保存();

    expect(store.保存状态?.成功).toBe(false);
  });

  it('没有 watchEffect 的隐式写入：只改内存不调保存 → 存储原样不动', () => {
    const 假 = 装假存储();
    const store = useSettingsStore();
    store.settings.快路.url = 'https://api.example/v1';

    // 注意：这里**不调** 保存()
    expect(假.读()).toBeNull();
  });
});
