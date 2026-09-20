<template>
  <div class="api-fields">
    <input v-model="cfg.url" type="text" class="af-input" placeholder="API URL (如 https://api.openai.com/v1/chat/completions)"/>
    <input v-model="cfg.apiKey" type="password" class="af-input" placeholder="API Key"/>
    <div class="af-model-row">
      <input v-model="cfg.model" type="text" class="af-input af-model" placeholder="模型名" list="model-list"/>
      <datalist id="model-list">
        <option v-for="m in models" :key="m" :value="m"/>
      </datalist>
      <button class="af-fetch-btn" @click="$emit('fetchModels')" :disabled="loading" title="获取模型列表">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{spinning:loading}"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      </button>
    </div>
    <div class="af-row">
      <label class="af-label">超时(ms)</label>
      <input v-model.number="cfg.timeout" type="number" class="af-input-sm"/>
    </div>
    <div class="af-row">
      <label class="af-label">最大重试</label>
      <input v-model.number="cfg.maxRetries" type="number" class="af-input-sm" min="0" max="10"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiConfig } from './store'

defineProps<{ cfg: ApiConfig; models?: string[]; loading?: boolean }>()
defineEmits<{ fetchModels: [] }>()
</script>

<style lang="scss" scoped>
.api-fields { display:flex; flex-direction:column; gap:6px; }
.af-input { padding:8px 10px; background:rgba(16,12,8,0.7); border:1px solid rgba(80,40,20,0.35); border-radius:6px; color:#ddd5c8; font-size:11px; outline:none;
  &::placeholder { color:rgba(160,144,128,0.4); }
  &:focus { border-color:rgba(180,40,40,0.5); }
}
.af-model-row { display:flex; gap:4px; }
.af-model { flex:1; }
.af-fetch-btn { display:flex; align-items:center; justify-content:center; width:32px; border:1px solid rgba(80,120,160,0.4); background:rgba(60,100,140,0.2); color:#90c0e0; border-radius:6px; cursor:pointer; flex-shrink:0;
  &:hover { background:rgba(60,100,140,0.35); }
  &:disabled { opacity:0.4; cursor:default; }
}
.af-row { display:flex; align-items:center; gap:8px; }
.af-label { font-size:10px; color:#a09080; width:56px; text-align:right; }
.af-input-sm { flex:1; padding:6px 8px; background:rgba(16,12,8,0.7); border:1px solid rgba(80,40,20,0.35); border-radius:6px; color:#ddd5c8; font-size:11px; outline:none; width:80px;
  &:focus { border-color:rgba(180,40,40,0.5); }
}
.spinning { animation:spin 1s linear infinite; }
@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
</style>
