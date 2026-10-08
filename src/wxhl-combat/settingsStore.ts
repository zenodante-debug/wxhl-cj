import { Settings } from './settings';

/** 直接读脚本变量里的设置（不经过 pinia，供 store.ts 等非组件场景使用） */
export function 读设置(): Settings {
  return Settings.parse(getVariables({ type: 'script', script_id: getScriptId() }));
}

export interface 保存结果 {
  成功: boolean;
  原因?: string;
}

export const useSettingsStore = defineStore('wxhl-combat-settings', () => {
  const scriptId = getScriptId();
  const settings = ref(读设置());
  /** 最近一次保存的结果 —— 界面据此提示「没存进去」（以前失败只在 console 里，玩家看不见） */
  const 保存状态 = ref<保存结果 | null>(null);

  /**
   * **显式保存**：读-合并-写-回读校验。
   *
   * 为什么不是 `watchEffect` 里的 fire-and-forget：玩家实测「设置完却没有写入脚本变量」——
   * 填好了、测试通过（那读的是本 pinia 的内存值），开战却报「API 未配置」（那读的是脚本变量）。
   * 隐式写在失败时只会被 Vue 丢进 console，**界面上完全看不出来**。
   * 所以：改成用户改动时显式调用，写完**回读对账**，对不上就如实报失败。
   *
   * 合并写：`replaceVariables` 是整体替换，直接覆盖会抹掉同 scope 的其它键
   * （翻译缓存 / 战斗状态就是存这里的）。
   */
  function 保存(): 保存结果 {
    const 结果 = 尝试保存();
    保存状态.value = 结果;
    if (!结果.成功) console.warn('[wxhl-combat] 设置保存失败：', 结果.原因);
    return 结果;
  }

  function 尝试保存(): 保存结果 {
    const 快照 = klona(settings.value) as Settings;
    for (let 次 = 0; 次 < 2; 次++) {
      try {
        const 现有 = (getVariables({ type: 'script', script_id: scriptId }) ?? {}) as Record<string, any>;
        replaceVariables({ ...现有, ...快照 }, { type: 'script', script_id: scriptId });

        // 回读对账：写进去了才算数（酒馆侧拒绝写入 / 表被别处覆盖都能在这一步看出来）
        const 回读 = (getVariables({ type: 'script', script_id: scriptId }) ?? {}) as Record<string, any>;
        if (回读.快路?.url === 快照.快路.url && 回读.快路?.apiKey === 快照.快路.apiKey) {
          return { 成功: true };
        }
      } catch (e: any) {
        if (次 === 1) return { 成功: false, 原因: `写入脚本变量失败：${e?.message ?? e}` };
        continue; // 再试一次（极少数情况下第一次写入会被别的写入覆盖）
      }
    }
    return { 成功: false, 原因: '写入脚本变量后回读不一致（变量表没接住这次写入）' };
  }

  return { settings, 保存, 保存状态 };
});

export function get快路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.快路;
}

export function get强路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.强路;
}
