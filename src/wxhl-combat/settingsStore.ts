import { Settings } from './settings';

/** 只打印一次的诊断标记（读设置 会被频繁调用，不能每次都刷屏） */
let 已报过未配置 = false;

/** 直接读脚本变量里的设置（不经过 pinia，供 store.ts 等非组件场景使用） */
export function 读设置(): Settings {
  const 表 = getVariables({ type: 'script', script_id: getScriptId() }) as any;
  const s = Settings.parse(表);
  // 读出来是空的时候留一条诊断：设置页绑的是 pinia（内存），跟这里读的**脚本变量是两条路** ——
  // 「设置里填好了、测试通过，开战却说未配置」就说明写回没落到这张表上。
  if (!已报过未配置 && (!s.快路?.url || !s.快路?.apiKey)) {
    已报过未配置 = true;
    console.warn('[wxhl-combat][诊断] 读设置：快路未配置', {
      script_id: getScriptId(),
      变量表的键: Object.keys(表 ?? {}),
      快路: s.快路,
    });
  }
  return s;
}

/**
 * 诊断：把「脚本变量这条链路」的现状一次性打出来（设置页「诊断」按钮用）。
 *
 * 判定点：**带 script_id 读** vs **不带 script_id 读** 是否一致 —— 不一致就说明
 * `getScriptId()` 指的表跟脚本实际绑定的表不是同一张（设置写进了没人读的那张）。
 */
export function 诊断设置读写(): void {
  const 结果: Record<string, unknown> = {};
  try {
    结果.scriptId = getScriptId();
  } catch (e: any) {
    结果.getScriptId = `抛错：${e?.message ?? e}`;
  }
  try {
    const 带id = getVariables({ type: 'script', script_id: getScriptId() }) as any;
    结果.带script_id的键 = Object.keys(带id ?? {});
    结果.带script_id的快路 = 带id?.快路;
  } catch (e: any) {
    结果.带script_id读 = `抛错：${e?.message ?? e}`;
  }
  try {
    const 不带id = getVariables({ type: 'script' }) as any;
    结果.不带script_id的键 = Object.keys(不带id ?? {});
    结果.不带script_id的快路 = 不带id?.快路;
  } catch (e: any) {
    结果.不带script_id读 = `抛错：${e?.message ?? e}`;
  }
  try {
    replaceVariables({ ...((getVariables({ type: 'script' }) ?? {}) as any), __诊断探针: Date.now() }, { type: 'script' });
    结果.不带script_id写 = '成功';
  } catch (e: any) {
    结果.不带script_id写 = `抛错：${e?.message ?? e}`;
  }
  console.log('[wxhl-combat][诊断] 设置变量读写', 结果);
}

export const useSettingsStore = defineStore('wxhl-combat-settings', () => {
  const scriptId = getScriptId();
  const settings = ref(读设置());

  watchEffect(() => {
    try {
      // 合并写回：replaceVariables 是整体替换，直接覆盖会抹掉同 scope 的其它键（如 Task 11 的「战斗」状态）
      const 现有 = getVariables({ type: 'script', script_id: scriptId }) as any;
      replaceVariables({ ...现有, ...klona(settings.value) }, { type: 'script', script_id: scriptId });
    } catch (e: any) {
      // 诊断：写回抛错时设置页仍然显示正常（它绑的是 pinia 内存值），
      // 所以这里必须留痕 —— 否则「填了、测了、开战还说没配置」无从查起。
      console.warn('[wxhl-combat][诊断] 设置写回失败', { script_id: scriptId, 错误: e?.message ?? e });
      throw e;
    }
  });

  return { settings };
});

export function get快路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.快路;
}

export function get强路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.强路;
}
