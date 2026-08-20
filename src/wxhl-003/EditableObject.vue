<script setup lang="ts">
// 自递归组件需显式命名，供模板中的 <EditableObject> 自我引用
defineOptions({ name: 'EditableObject' })
const props = defineProps<{ value: any }>()
const emit = defineEmits<{ (e: 'update:value', v: any): void }>()
const local = ref(klona(props.value ?? {}))
watch(() => props.value, v => { local.value = klona(v ?? {}) })
watch(local, v => emit('update:value', klona(v)), { deep: true })
function isObj(v: any) { return v && typeof v === 'object' && !Array.isArray(v) }
function isNum(v: any) { return typeof v === 'number' }
function set(path: string[], val: any) {
  const o = local.value
  let cur = o
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]]
  cur[path[path.length - 1]] = val
}
</script>

<template>
  <div class="editable-object">
    <template v-for="(v, k) in local" :key="String(k)">
      <div v-if="isObj(v)" class="eo-block">
        <div class="eo-key">{{ k }}</div>
        <EditableObject :value="v" @update:value="set([String(k)], $event)"/>
      </div>
      <div v-else-if="isNum(v)" class="eo-row">
        <span class="eo-label">{{ k }}</span>
        <input type="number" class="eo-input num" :value="v" @input="set([String(k)], Number(($event.target as HTMLInputElement).value))"/>
      </div>
      <div v-else class="eo-row">
        <span class="eo-label">{{ k }}</span>
        <textarea v-if="String(v).length > 30" class="eo-input" :value="v" @input="set([String(k)], ($event.target as HTMLInputElement).value)"></textarea>
        <input v-else class="eo-input" :value="v" @input="set([String(k)], ($event.target as HTMLInputElement).value)"/>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.editable-object{display:flex;flex-direction:column;gap:2px;padding:4px 0}
.eo-block{border:1px solid rgba(80,40,20,0.25);border-radius:6px;padding:4px 6px;margin:2px 0;background:rgba(16,12,8,0.3)}
.eo-key{font-size:10px;color:var(--amber);letter-spacing:1px;margin-bottom:2px}
.eo-row{display:flex;align-items:center;gap:6px;padding:2px 0;font-size:11px}
.eo-label{flex-shrink:0;color:var(--chalk-d);min-width:40px}
.eo-input{flex:1;background:rgba(16,12,8,0.8);border:1px solid rgba(80,40,20,0.4);border-radius:4px;color:var(--chalk);font-size:11px;padding:4px 6px;outline:none;font-family:inherit}
.eo-input.num{max-width:80px}
</style>
