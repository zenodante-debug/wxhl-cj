import { Settings } from './settings';

export const useSettingsStore = defineStore('wxhl-combat-settings', () => {
  const scriptId = getScriptId();
  const settings = ref(Settings.parse(getVariables({ type: 'script', script_id: scriptId })));

  watchEffect(() => {
    replaceVariables(klona(settings.value), { type: 'script', script_id: scriptId });
  });

  return { settings };
});

export function get快路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.快路;
}

export function get强路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.强路;
}
