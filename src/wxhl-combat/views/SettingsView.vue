<template>
  <div class="settings-view">
    <h3>战斗 API 配置</h3>
    <p class="hint">技能翻译与敌方意图走「快路」；收尾正文走「强路」。两路可共用同一 url/key、只改模型名。</p>

    <section v-for="路 in (['快路', '强路'] as const)" :key="路" class="api-block">
      <h4>{{ 路 === '快路' ? '快路（意图/翻译，高频）' : '强路（收尾正文，文笔）' }}</h4>
      <label>
        URL
        <input v-model="store.settings[路].url" placeholder="https://…" />
      </label>
      <label>
        API Key
        <input v-model="store.settings[路].apiKey" type="password" placeholder="sk-…" />
      </label>
      <label>
        模型
        <input v-model="store.settings[路].model" placeholder="模型名" />
      </label>
      <button v-if="路 === '强路'" class="copy-btn" @click="复制(路)">把快路复制过来</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '../settingsStore';

const store = useSettingsStore();

function 复制(路: '快路' | '强路') {
  if (路 === '强路') {
    store.settings.强路 = { ...store.settings.快路 };
  }
}
</script>

<style scoped lang="scss">
.settings-view {
  color: #ddd;

  h3 { margin: 0 0 8px; }
  .hint { color: #888; font-size: 13px; margin-bottom: 16px; }

  .api-block {
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;

    h4 { margin: 0 0 10px; color: #bbb; }

    label {
      display: block;
      font-size: 13px;
      color: #999;
      margin-bottom: 8px;

      input {
        display: block;
        width: 100%;
        margin-top: 4px;
        padding: 7px 10px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 6px;
        color: #eee;
      }
    }

    .copy-btn {
      padding: 6px 12px;
      background: #242424;
      border: 1px solid #444;
      border-radius: 6px;
      color: #ccc;
      cursor: pointer;
    }
  }
}
</style>
