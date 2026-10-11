import { Settings, 默认设置 } from './settings';

/**
 * 设置的存放键 —— **localStorage**，而且**与小手机刻意不同名**。
 *
 * 小手机存的是 `wxhl003_settings`（`src/wxhl-003/store.ts:71`）。两个脚本会同时装在同一个酒馆里、
 * 共用同一个页面的 localStorage，**只能靠不同的键来隔离** —— 玩家明确要求过这一点
 *（「战斗脚本的 api 不能和小手机的 api 保存统一位置，要做隔离」）。
 */
export const 设置存储键 = 'wxhl-combat_settings';

export interface 保存结果 {
  成功: boolean;
  原因?: string;
}

/**
 * 读设置。
 *
 * **为什么从脚本变量搬到 localStorage**（玩家实测：「为什么我每次刷新酒馆后，就需要重新填 api」）：
 * 脚本变量（`getVariables({type:'script', script_id})`）是**跟着脚本走**的 ——
 * 换角色卡 / 换聊天文件 / 重装脚本就没了。localStorage 跟着**浏览器**走，刷新页面、换聊天都还在。
 *
 * 顺序：**localStorage 优先** → 本地没有就**从脚本变量迁移一次**（老用户装过设置，
 * 不该让他们重填）→ 都没有才用默认值。
 */
export function 读设置(): Settings {
  // 1) localStorage（权威来源）
  try {
    const 原 = localStorage.getItem(设置存储键);
    if (原) return Settings.parse(JSON.parse(原));
  } catch {
    // 存的是垃圾 / 本地存储被禁 → 往下走（绝不因为读设置把整个脚本搞崩）
  }

  // 2) 一次性迁移：老位置（脚本变量）里有值就搬过来，并落盘，下次不用再搬
  try {
    const 旧 = getVariables({ type: 'script', script_id: getScriptId() });
    const 迁移 = Settings.parse(旧 ?? {});
    if (迁移.快路.url || 迁移.快路.apiKey || 迁移.强路.url || 迁移.强路.apiKey) {
      // ⚠️ 落盘**单独 try**：写不进去（本地存储被禁）不该把"已经读到的设置"一起赔进去 ——
      // 合在一个 try 里的话，setItem 一抛错就落到默认值，玩家的 API 当场蒸发。
      try {
        写本地(迁移);
      } catch {
        /* 这次没落盘也没关系：值已经读到了，下次再搬一遍 */
      }
      return 迁移;
    }
  } catch {
    // getVariables 不可用（非酒馆环境 / 测试）→ 默认值
  }

  return 默认设置;
}

/** 写 localStorage；写不进去如实抛出（由 保存设置 转成失败结果） */
function 写本地(s: Settings): void {
  localStorage.setItem(设置存储键, JSON.stringify(s));
}

/**
 * 保存设置：写 localStorage + **回读对账**。
 *
 * 为什么不静默兜底：玩家实测过「设置完却没生效」——填好了、测试通过（读的是内存值），
 * 开战却报「API 未配置」（读的是真的存下来的值）。隐式失败只会被 Vue 丢进 console，
 * **界面上完全看不出来**。所以：写不进去就如实报失败，设置页显示红字。
 *
 * **单一来源**：只在 localStorage 落盘，不再写脚本变量 —— 两边各留一份只会打架。
 *（翻译缓存 / 战斗状态仍然各用脚本变量，与设置互不影响。）
 */
export function 保存设置(s: Settings): 保存结果 {
  const 快照 = Settings.parse(s);
  try {
    写本地(快照);

    // 回读对账：真进去了才算数（隐私模式丢写、被别处覆盖都能在这一步看出来）
    const 原 = localStorage.getItem(设置存储键);
    if (!原) return { 成功: false, 原因: '写入 localStorage 后读不回来（写入被丢弃）' };
    const 回读 = Settings.parse(JSON.parse(原));
    if (回读.快路.url === 快照.快路.url && 回读.快路.apiKey === 快照.快路.apiKey) {
      return { 成功: true };
    }
    return { 成功: false, 原因: '写入 localStorage 后回读不一致（本地存储没接住这次写入）' };
  } catch (e: any) {
    return { 成功: false, 原因: `写入 localStorage 失败：${e?.message ?? e}（浏览器可能禁用了本地存储）` };
  }
}

export const useSettingsStore = defineStore('wxhl-combat-settings', () => {
  const settings = ref(读设置());
  /** 最近一次保存的结果 —— 界面据此提示「没存进去」（以前失败只在 console 里，玩家看不见） */
  const 保存状态 = ref<保存结果 | null>(null);

  /**
   * **显式保存**：用户改动时调用，写完回读对账，对不上就如实报失败。
   *（不做 `watchEffect` 里的隐式写：那种失败只会进 console，界面上看不出来。）
   */
  function 保存(): 保存结果 {
    const 结果 = 保存设置(klona(settings.value) as Settings);
    保存状态.value = 结果;
    if (!结果.成功) console.warn('[wxhl-combat] 设置保存失败：', 结果.原因);
    return 结果;
  }

  /** 从存储里重新读一遍（设置页「刷新」/ 别的标签页改过之后用） */
  function 重载(): void {
    settings.value = 读设置();
  }

  return { settings, 保存, 保存状态, 重载 };
});

export function get快路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.快路;
}

export function get强路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.强路;
}
