<template>
  <div class="settings-view">
    <h3>战斗 API 配置</h3>
    <p class="hint">
      技能翻译与敌方意图走「快路」（高频，建议用快模型）；收尾正文走「强路」（要文笔）。两路可共用同一 URL/Key，只改模型名。
    </p>

    <section class="api-block">
      <h4>战斗演出（决斗场美术）</h4>
      <label class="field field-inline">
        <input v-model="store.settings.演出" type="checkbox" @change="保存()" />
        <span>开启演出（飘字 / 攻击轨迹 / 变身全屏 / 打断裂纹 / 环境火光）</span>
      </label>
      <span class="sub-hint">
        关掉时演出层**完全不渲染**（零成本，最省性能）；系统开启「减弱动态效果」时一律等同关闭。
      </span>
    </section>

    <section class="api-block">
      <h4>敌方意图怎么产生</h4>
      <label class="field">
        <span>模式</span>
        <select v-model="store.settings.意图模式" @change="保存()">
          <option value="ai">AI 生成（每回合 1 次调用，会读面板做战术决策）</option>
          <option value="随机">掷骰子抽（**不调 AI**：按行动类型列选项，1dN 抽一个）</option>
        </select>
        <span class="sub-hint">
          「掷骰子抽」按每个行动类型（主要/次要）列出该单位能做的事（技能 + 基础武器攻击），
          掷骰决定用哪个：比如主要行动有三个选项就 1d3。选这个模式后，敌方意图**不再消耗 AI 额度**。
        </span>
      </label>
    </section>

    <!-- 保存状态：设置改动会**立即写入脚本变量并回读对账**（开战读的就是那份）。
         没存进去必须让人看见 —— 以前失败只在 console 里，界面照旧显示已配置。 -->
    <div v-if="store.保存状态 && !store.保存状态.成功" class="save-alert">
      设置**没有存进脚本变量**：{{ store.保存状态.原因 }} —— 开战会读不到，请再改一次或重载酒馆
    </div>
    <div v-else-if="已保存提示" class="save-ok">设置已保存</div>

    <section v-for="路 in 路列表" :key="路" class="api-block">
      <h4>{{ 路 === '快路' ? '快路（意图 / 翻译，高频）' : '强路（收尾正文，文笔）' }}</h4>

      <label class="field">
        <span>API URL</span>
        <input v-model="store.settings[路].url" type="text" placeholder="如 https://api.openai.com/v1/chat/completions" @change="保存()" />
      </label>

      <label class="field">
        <span>API Key</span>
        <input v-model="store.settings[路].apiKey" type="password" placeholder="sk-…" @change="保存()" />
      </label>

      <div class="field">
        <span>模型</span>
        <div class="model-row">
          <input
            v-model="store.settings[路].model"
            type="text"
            placeholder="模型名（可点右侧按钮拉取后选）"
            :list="`模型候选-${路}`"
            @change="保存()"
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
        <input v-model.number="store.settings[路].timeout" type="number" min="0" step="1000" @change="保存()" />
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

    <section class="api-block">
      <h4>翻译缓存</h4>
      <p class="sub-hint">
        技能/装备的翻译结果存在脚本变量里**跨战斗复用**：同样的效果只翻一次，全部命中时一次 AI 都不调。
        缓存按**内容**（不是名字）认 —— 技能升级、换装备、删技能会自动重翻，不需要手动清。
      </p>
      <div class="actions">
        <span class="result">当前缓存 {{ 缓存条目数 }} 条</span>
        <button class="copy-btn" :disabled="缓存条目数 === 0" @click="清缓存">
          清空缓存（下次开战重翻）
        </button>
        <span class="result" :class="缓存结果类别">{{ 缓存结果 }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useSettingsStore } from '../settingsStore';
import { 拉取模型, 测试连接, 翻译缓存条目数, 清空翻译缓存 } from '../store';

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
      if (!cfg.model) {
        cfg.model = list[0];
        保存(); // 顺手选的模型也要落盘
      }
    }
  } catch (e: any) {
    态.结果 = `拉取失败：${e?.message ?? e}`;
    态.结果类别 = 'err';
  } finally {
    态.拉取中 = false;
  }
}

/** 「设置已保存」的一闪提示（成功时不打扰，但失败必须显眼 —— 见模板里的 save-alert） */
const 已保存提示 = ref(false);
let 提示计时: ReturnType<typeof setTimeout> | undefined;
function 保存(): void {
  const r = store.保存();
  已保存提示.value = r.成功;
  clearTimeout(提示计时);
  提示计时 = setTimeout(() => (已保存提示.value = false), 2000);
}

async function 测试(路: 路名) {  const 态 = 界面[路];
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

// ==================== 翻译缓存 ====================

const 缓存条目数 = ref(0);
const 缓存结果 = ref('');
const 缓存结果类别 = ref<'' | 'ok' | 'err'>('');

onMounted(() => {
  try {
    缓存条目数.value = 翻译缓存条目数();
  } catch {
    // 变量还没就绪（脚本刚装/未初始化）→ 显示 0 即可，不必报错
  }
});

async function 清缓存() {
  try {
    await 清空翻译缓存();
    缓存条目数.value = 翻译缓存条目数();
    缓存结果.value = '已清空，下次开战会重新翻译全部效果';
    缓存结果类别.value = 'ok';
  } catch (e: any) {
    缓存结果.value = `清空失败：${e?.message ?? e}`;
    缓存结果类别.value = 'err';
  }
}
</script>

<style scoped lang="scss">
@use '../theme.scss' as t;

.settings-view {
  color: var(--cb-chalk-dim);
  font-family: var(--cb-font-body);

  h3 {
    margin: 0 0 8px;
    color: var(--cb-amber);
    font-family: var(--cb-font-display);
    letter-spacing: 2px;
  }

  .hint {
    color: var(--cb-dim);
    font-size: 13px;
    margin-bottom: 16px;
    line-height: 1.6;
  }
}

.api-block {
  @include t.cb-stone(14px);
  margin-bottom: 14px;

  h4 {
    margin: 0 0 12px;
    color: var(--cb-amber-dim);
    font-family: var(--cb-font-display);
    font-weight: 700;
    letter-spacing: 1px;
  }
}

.field {
  display: block;
  font-size: 13px;
  color: var(--cb-dim);
  margin-bottom: 10px;

  &.field-inline {
    display: flex;
    align-items: center;
    gap: 8px;

    input[type='checkbox'] {
      width: auto;
      accent-color: var(--cb-amber);
    }
  }

  > span {
    display: block;
    margin-bottom: 4px;
  }

  input,
  select {
    @include t.cb-plaque;
    width: 100%;
    padding: 7px 10px;
    font-size: 13px;
    outline: none;

    &:focus {
      border-color: var(--cb-mana);
    }
  }
}

.save-alert {
  @include t.cb-stone(10px 14px);
  margin-bottom: 12px;
  border-color: var(--cb-blood-wet);
  color: var(--cb-blood-wet);
  font-size: 13px;
  line-height: 1.6;
}

.save-ok {
  margin-bottom: 12px;
  color: var(--cb-copper);
  font-size: 12px;
  letter-spacing: 1px;
}

.sub-hint {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--cb-dim);
}

.model-row {
  display: flex;
  gap: 6px;

  input {
    flex: 1;
  }
}

.icon-btn {
  flex-shrink: 0;
  width: 34px;
  @include t.cb-plaque;
  font-size: 15px;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
}

.spinning {
  display: inline-block;
  animation: spin 1s linear infinite;
}

/* 测试连接 / 复制 / 缓存操作 */
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.test-btn {
  @include t.cb-plaque;
  padding: 6px 14px;
  border-color: rgba(90, 125, 168, 0.6);
  color: var(--cb-mana);

  &:disabled {
    opacity: 0.4;
  }
}

.copy-btn {
  @include t.cb-plaque;
  padding: 6px 12px;

  &:disabled {
    opacity: 0.4;
  }
}

.result {
  font-size: 12px;
  color: var(--cb-dim);

  &.ok {
    color: var(--cb-copper);
  }
  &.err {
    color: var(--cb-blood-wet);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
