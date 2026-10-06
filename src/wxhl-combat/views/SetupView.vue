<template>
  <div class="setup-view">
    <div v-if="loading" class="hint">读取实体名单中…</div>
    <div v-else-if="名单.length === 0" class="hint">
      当前无可参战实体（MVU 变量里没有契约者/小队成员/副本角色）
    </div>

    <template v-else>
      <div class="row header">
        <span>参战</span><span>名称</span><span>类型</span><span>阶位</span><span>HP</span><span>阵营</span>
      </div>
      <div v-for="u in 名单" :key="u.id" class="row">
        <input type="checkbox" v-model="选中[u.id]" />
        <span>{{ u.名称 }}</span>
        <span class="dim">{{ u.类型 }}</span>
        <span class="dim">{{ u.阶位 }}</span>
        <span class="dim">{{ u.HP_当前 }}/{{ u.HP_最大 }}</span>
        <select v-model="阵营[u.id]" :disabled="!选中[u.id]">
          <option value="我方">我方</option>
          <option value="敌方">敌方</option>
          <option value="待定">不参战</option>
        </select>
      </div>

      <div class="distance-row">
        <label>开场距离
          <select v-model="开场模式">
            <option v-for="o in 开场距离选项()" :key="o.名" :value="o.名">{{ o.名 }}（{{ o.范围[0] }}~{{ o.范围[1] }}米）</option>
          </select>
        </label>
        <span class="dim">实际距离开战时掷骰</span>
      </div>

      <button class="start-btn" :disabled="开战单位数 === 0" @click="开战">
        开战（{{ 开战单位数 }} 个单位）
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { 读取可参战单位, type 可参战单位 } from '../store';
import { 开场距离选项 } from '../engine/setup';

const emit = defineEmits<{ (e: '开战', 选择: { id: string; 阵营: '我方' | '敌方' }[], 开场模式: string): void }>();

const loading = ref(true);
const 名单 = ref<可参战单位[]>([]);
const 选中 = ref<Record<string, boolean>>({});
const 阵营 = ref<Record<string, '我方' | '敌方' | '待定'>>({});
const 开场模式 = ref('对峙/室内');

onMounted(async () => {
  try {
    名单.value = await 读取可参战单位();
    for (const u of 名单.value) {
      选中.value[u.id] = u.默认阵营 !== '待定';
      阵营.value[u.id] = u.默认阵营;
    }
  } finally {
    loading.value = false;
  }
});

const 开战单位数 = computed(
  () => 名单.value.filter(u => 选中.value[u.id] && 阵营.value[u.id] !== '待定').length,
);

function 开战() {
  const 选择 = 名单.value
    .filter(u => 选中.value[u.id] && 阵营.value[u.id] !== '待定')
    .map(u => ({ id: u.id, 阵营: 阵营.value[u.id] as '我方' | '敌方' }));
  emit('开战', 选择, 开场模式.value);
}
</script>

<style scoped lang="scss">
.setup-view { color: #ddd; }
.hint { color: #888; padding: 24px; text-align: center; }
.row {
  display: grid;
  grid-template-columns: 40px 1.5fr 1fr 0.8fr 0.8fr 0.9fr;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid #222;
}
.row.header { color: #888; font-size: 12px; border-bottom-color: #333; }
.dim { color: #999; font-size: 13px; }
.distance-row { margin: 16px 0; display: flex; align-items: center; gap: 12px; }
.start-btn {
  padding: 10px 20px;
  background: #2a4a2a;
  border: 1px solid #3a6a3a;
  border-radius: 8px;
  color: #dfd;
  cursor: pointer;
  font-size: 15px;

  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
select, input[type='checkbox'] { accent-color: #4a7; }
</style>
