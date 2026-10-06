import { Settings } from './settings';

/** 直接读脚本变量里的设置（不经过 pinia，供 store.ts 等非组件场景使用） */
export function 读设置(): Settings {
  return Settings.parse(getVariables({ type: 'script', script_id: getScriptId() }));
}

export const useSettingsStore = defineStore('wxhl-combat-settings', () => {
  const scriptId = getScriptId();
  const settings = ref(读设置());

  watchEffect(() => {
    // 合并写回：replaceVariables 是整体替换，直接覆盖会抹掉同 scope 的其它键（如 Task 11 的「战斗」状态）
    const 现有 = getVariables({ type: 'script', script_id: scriptId }) as any;
    replaceVariables({ ...现有, ...klona(settings.value) }, { type: 'script', script_id: scriptId });
  });

  return { settings };
});

export function get快路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.快路;
}

export function get强路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.强路;
}
