<template>
  <div class="settings-view">
    <h3>战斗 API 配置</h3>
    <p class="hint">
      技能翻译与敌方意图走「快路」（高频，建议用快模型）；收尾正文走「强路」（要文笔）。两路可共用同一 URL/Key，只改模型名。
    </p>

    <section v-for="路 in 路列表" :key="路" class="api-block">
      <h4>{{ 路 === '快路' ? '快路（意图 / 翻译，高频）' : '强路（收尾正文，文笔）' }}</h4>

      <label class="field">
        <span>API URL</span>
        <input v-model="store.settings[路].url" type="text" placeholder="如 https://api.openai.com/v1/chat/completions" />
      </label>

      <label class="field">
        <span>API Key</span>
        <input v-model="store.settings[路].apiKey" type="password" placeholder="sk-…" />
      </label>

      <div class="field">
        <span>模型</span>
        <div class="model-row">
          <input
            v-model="store.settings[路].model"
            type="text"
            placeholder="模型名（可点右侧按钮拉取后选）"
            :list="`模型候选-${路}`"
          />
          <datalist :id="`模型候选-${路}`">
            <option v-for="m in 界面[路].模型" :key="m" :value="m" />
          </datalist>
          <button class="icon-btn" :disabled="界面[路].拉取中" title="从该 API 拉取模型列表" @click="拉取(路)">
            <span :class="{ spinning: 界面[路].拉取中 }">↻</span>
          </button>
        </div>
      </div>

      <label class="field">
        <span>超时（毫秒）</span>
        <input v-model.number="store.settings[路].timeout" type="number" min="0" step="1000" />
        <span class="sub-hint">
          单次请求的上限。酒馆的 generateRaw 自己不提供超时，这里是脚本兜的 ——
          超时算一次失败并重试，避免一个卡住的请求让界面永远没反应。填 0 表示不限时。
        </span>
      </label>

      <div class="actions">
        <button class="test-btn" :disabled="界面[路].测试中" @click="测试(路)">
          {{ 界面[路].测试中 ? '测试中…' : '测试连接' }}
        </button>
        <button v-if="路 === '强路'" class="copy-btn" @click="复制快路">把快路复制过来</button>
        <span class="result" :class="界面[路].结果类别">{{ 界面[路].结果 }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useSettingsStore } from '../settingsStore';
import { 拉取模型, 测试连接 } from '../store';

const store = useSettingsStore();
const 路列表 = ['快路', '强路'] as const;
type 路名 = (typeof 路列表)[number];

interface 界面态 {
  模型: string[];
  拉取中: boolean;
  测试中: boolean;
  结果: string;
  结果类别: '' | 'ok' | 'err';
}

/** 每一路各自的按钮态与结果行 */
const 界面 = reactive<Record<路名, 界面态>>({
  快路: { 模型: [], 拉取中: false, 测试中: false, 结果: '', 结果类别: '' },
  强路: { 模型: [], 拉取中: false, 测试中: false, 结果: '', 结果类别: '' },
});

async function 拉取(路: 路名) {
  const 态 = 界面[路];
  const cfg = store.settings[路];
  态.拉取中 = true;
  态.结果 = '';
  态.结果类别 = '';
  try {
    const list = await 拉取模型(cfg);
    态.模型 = list;
    if (list.length === 0) {
      态.结果 = '该 API 未返回模型列表，请手动填写模型名';
      态.结果类别 = 'err';
    } else {
      态.结果 = `拉取到 ${list.length} 个模型，点模型输入框可选`;
      态.结果类别 = 'ok';
      // 还没填模型时，顺手选中第一个，省一步
      if (!cfg.model) cfg.model = list[0];
    }
  } catch (e: any) {
    态.结果 = `拉取失败：${e?.message ?? e}`;
    态.结果类别 = 'err';
  } finally {
    态.拉取中 = false;
  }
}

async function 测试(路: 路名) {
  const 态 = 界面[路];
  const cfg = store.settings[路];
  态.测试中 = true;
  态.结果 = '';
  态.结果类别 = '';
  try {
    const 回复 = await 测试连接(cfg);
    态.结果 = 回复 ? `连接成功，AI 回复：「${回复}」` : '连接成功，但 AI 回复为空';
    态.结果类别 = 'ok';
  } catch (e: any) {
    态.结果 = `连接失败：${e?.message ?? e}`;
    态.结果类别 = 'err';
  } finally {
    态.测试中 = false;
  }
}

function 复制快路() {
  store.settings.强路 = { ...store.settings.快路 };
  界面.强路.结果 = '已把快路的配置复制过来（模型名可再改）';
  界面.强路.结果类别 = 'ok';
}
</script>

<style scoped lang="scss">
.settings-view {
  color: #ddd;

  h3 {
    margin: 0 0 8px;
  }

  .hint {
    color: #888;
    font-size: 13px;
    margin-bottom: 16px;
    line-height: 1.6;
  }
}

.api-block {
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 14px;

  h4 {
    margin: 0 0 12px;
    color: #bbb;
    font-weight: 600;
  }
}

.field {
  display: block;
  font-size: 13px;
  color: #999;
  margin-bottom: 10px;

  > span {
    display: block;
    margin-bottom: 4px;
  }

  input {
    width: 100%;
    padding: 7px 10px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 6px;
    color: #eee;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: #4a6a8a;
    }
  }
}

.sub-hint {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.6;
  color: #777;
}

.model-row {  display: flex;
  gap: 6px;

  input {
    flex: 1;
  }
}

.icon-btn {
  flex-shrink: 0;
  width: 34px;
  background: #22303c;
  border: 1px solid #3a5a74;
  border-radius: 6px;
  color: #90c0e0;
  font-size: 15px;
  cursor: pointer;

  &:hover {
    background: #2b3d4c;
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

.spinning {
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.test-btn,
.copy-btn {
  padding: 7px 14px;
  background: #242424;
  border: 1px solid #444;
  border-radius: 6px;
  color: #ddd;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #333;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}

.result {
  font-size: 12px;
  color: #888;
  line-height: 1.5;

  &.ok {
    color: #7bc47f;
  }

  &.err {
    color: #e08a8a;
  }
}
</style>
