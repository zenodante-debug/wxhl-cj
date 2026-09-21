<template>
  <div class="crf-page">
    <div class="crf-header">
      <button class="hdr-btn" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <span class="hdr-title">工坊</span>
      <span class="hdr-up">{{ store.playerUP }} UP</span>
      <button class="hdr-btn" @click="store.syncFromMvu()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
      </button>
    </div>

    <div class="crf-tabs">
      <button v-for="t in TABS" :key="t.key" class="crf-tab" :class="{ active: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
    </div>

    <div v-if="store.lastError" class="crf-error">{{ store.lastError }}</div>

    <!-- ============ 配方 ============ -->
    <div v-if="tab === 'recipes'" class="crf-body">
      <div v-for="r in store.allRecipes" :key="r.名称" class="crf-card" @click="pickRecipe(r)">
        <div class="cc-head">
          <span class="cc-name" :class="r.品质 === '蓝色' ? 'q-blue' : 'q-white'">{{ r.名称 }}</span>
          <span class="cc-tag">{{ r.行业 }}</span>
        </div>
        <div class="cc-line">材料：{{ r.材料.map(m => `${m.类别}×${m.数量}${m.核心 ? '(核心)' : ''}`).join(' + ') }}</div>
        <div class="cc-line">要求：{{ r.技能要求.分类 }}技能 Lv.{{ r.技能要求.等级 }}<template v-if="r.批量上限 > 1"> · 可批量×{{ r.批量上限 }}</template></div>
      </div>
    </div>

    <!-- ============ 制作 ============ -->
    <div v-if="tab === 'craft'" class="crf-body">
      <div v-if="!form.配方" class="crf-empty">先去「配方」页选一个配方</div>
      <template v-else>
        <div class="crf-card">
          <div class="cc-head"><span class="cc-name">{{ form.配方.名称 }}</span><span class="cc-tag">{{ 设施标签 }}</span></div>
          <div class="cc-line">成品类型：{{ form.配方.成品类型 }}{{ form.配方.装备子类 ? ' · ' + form.配方.装备子类 : '' }}</div>
        </div>

        <div class="crf-form">
          <label v-if="form.配方.来源 === '模板'">阶位
            <select v-model.number="form.阶位">
              <option v-for="t in 5" :key="t" :value="t">{{ t }}阶</option>
            </select>
          </label>
          <label v-if="form.配方.装备子类 === '武器'">武器类型
            <select v-model="form.子类型">
              <option v-for="w in weaponTypes" :key="w" :value="w">{{ w }}</option>
            </select>
          </label>
          <label v-if="form.配方.装备子类 === '防具'">防具类型
            <select v-model="form.子类型">
              <option v-for="s in armorTypes" :key="s" :value="s">{{ s }}</option>
            </select>
          </label>
          <label v-if="form.配方.成品类型 === '装备'">副属性
            <select v-model="form.副属性">
              <option v-for="a in ATTRS" :key="a" :value="a">{{ a }}</option>
            </select>
          </label>
          <label v-if="form.配方.批量上限 > 1">数量
            <input v-model.number="form.数量" type="number" min="1" :max="form.配方.批量上限" />
          </label>
          <label>核心材料（{{ 核心类别 }}）
            <select v-model="form.核心材料名">
              <option v-for="n in coreCandidates" :key="n" :value="n">{{ n }}（×{{ store.bag[n]?.数量 }}）</option>
            </select>
          </label>
          <div v-if="form.核心材料名" class="cc-line crf-codex">
            归类不对？直接改：
            <select :value="store.codex[form.核心材料名]?.类别 ?? '未分类'" @change="store.setCodex(form.核心材料名, { 类别: ($event.target as HTMLSelectElement).value as any })">
              <option v-for="c in CATS" :key="c" :value="c">{{ c }}</option>
            </select>
            <select :value="store.codex[form.核心材料名]?.品质 ?? '白色'" @change="store.setCodex(form.核心材料名, { 品质: ($event.target as HTMLSelectElement).value as any })">
              <option v-for="q in QUALS" :key="q" :value="q">{{ q }}</option>
            </select>
            <select :value="store.codex[form.核心材料名]?.阶位 ?? 1" @change="store.setCodex(form.核心材料名, { 阶位: Number(($event.target as HTMLSelectElement).value) })">
              <option v-for="t in 5" :key="t" :value="t">{{ t }}阶</option>
            </select>
          </div>
          <label class="crf-check"><input v-model="form.越阶材料" type="checkbox" /> 越阶高级材料代替（DC-2）</label>
          <label class="crf-check"><input v-model="form.劣质材料" type="checkbox" /> 劣质材料替代（DC+3）</label>
        </div>

        <div class="crf-dc">DC 预览：{{ dcPreview }}（D20+基础属性+技能Lv ≥ DC）</div>
        <button class="crf-go" :disabled="!form.核心材料名" @click="go">开工</button>

        <div v-if="store.lastOutcome" class="crf-result" :class="'r-' + store.lastOutcome.结果">
          <div class="cr-title">制作{{ store.lastOutcome.结果 }}</div>
          <div v-for="(s, i) in store.lastOutcome.摘要" :key="i" class="cc-line">{{ s }}</div>
          <div v-for="p in store.lastOutcome.新增" :key="p.名称" class="crf-card">
            <div class="cc-head"><span class="cc-name">{{ p.名称 }}</span><span class="cc-tag">×{{ p.数量 }}</span></div>
            <div class="cc-line">{{ p.描述 }}</div>
          </div>
          <div v-if="store.lastOutcome.HP伤害 > 0" class="crf-error">炸炉伤害：-{{ store.lastOutcome.HP伤害 }} HP</div>
        </div>
      </template>
    </div>

    <!-- ============ 材料 ============ -->
    <div v-if="tab === 'materials'" class="crf-body">
      <div class="cc-line crf-hint">自动归类有误？在这里修正，会记住到本聊天。</div>
      <div v-for="(item, name) in store.bag" :key="name" class="crf-card">
        <div class="cc-head"><span class="cc-name">{{ name }}</span><span class="cc-tag">×{{ item.数量 }}</span></div>
        <div class="cc-line">
          类别：
          <select :value="store.codex[name]?.类别 ?? '未分类'" @change="store.setCodex(String(name), { 类别: ($event.target as HTMLSelectElement).value as any })">
            <option v-for="c in CATS" :key="c" :value="c">{{ c }}</option>
          </select>
          品质：
          <select :value="store.codex[name]?.品质 ?? '白色'" @change="store.setCodex(String(name), { 品质: ($event.target as HTMLSelectElement).value as any })">
            <option v-for="q in QUALS" :key="q" :value="q">{{ q }}</option>
          </select>
          阶位：
          <select :value="store.codex[name]?.阶位 ?? 1" @change="store.setCodex(String(name), { 阶位: Number(($event.target as HTMLSelectElement).value) })">
            <option v-for="t in 5" :key="t" :value="t">{{ t }}阶</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { computeDC } from './craft';
import { WEAPON_TABLE, type ArmorSpectrum, type Attr } from './equipTables';
import { 材料类别, type 配方 } from './recipes';
import { useCraftingStore } from './store';

const emit = defineEmits<{ close: [] }>();
const store = useCraftingStore();

const TABS = [
  { key: 'recipes', label: '配方' },
  { key: 'craft', label: '制作' },
  { key: 'materials', label: '材料' },
] as const;
const tab = ref<(typeof TABS)[number]['key']>('recipes');

const ATTRS: Attr[] = ['STR', 'AGI', 'CON', 'PER'];
const CATS = [...材料类别.filter(c => c !== '任意'), '未分类'];
const QUALS = ['白色', '蓝色', '金色', '紫色'] as const;
const weaponTypes = Object.keys(WEAPON_TABLE);
const armorTypes: ArmorSpectrum[] = ['极轻', '轻装', '中装', '重装', '极重'];

const form = reactive({
  配方: null as 配方 | null,
  阶位: 1,
  子类型: '',
  副属性: 'AGI' as Attr,
  数量: 1,
  核心材料名: '',
  越阶材料: false,
  劣质材料: false,
});

const 设施标签 = computed(() => store.facilityInfo().标签);
const 核心类别 = computed(() => form.配方?.材料.find(m => m.核心)?.类别 ?? '任意');
const coreCandidates = computed(() => store.matchMaterials(核心类别.value));
const dcPreview = computed(() => {
  if (!form.配方) return '-';
  const 修正 = [
    ...(form.越阶材料 ? [{ 项: '越阶高级材料代替', 值: -2 }] : []),
    ...(form.劣质材料 ? [{ 项: '劣质材料替代', 值: 3 }] : []),
    ...(store.facilityInfo().修正 !== 0 ? [{ 项: 设施标签.value, 值: store.facilityInfo().修正 }] : []),
  ];
  return computeDC(form.配方.品质, form.阶位, 修正).最终;
});

function pickRecipe(r: 配方) {
  form.配方 = r;
  form.阶位 = r.来源 === '模板' ? 1 : r.阶位 || 1;
  form.子类型 = r.装备子类 === '武器' ? weaponTypes[2] : r.装备子类 === '防具' ? '轻装' : '';
  form.数量 = 1;
  form.核心材料名 = '';
  store.lastOutcome = null; // 换配方清掉上一次结果，避免误显
  store.syncFromMvu();
  tab.value = 'craft';
}

async function go() {
  if (!form.配方) return;
  await store.doCraft({
    配方: form.配方,
    阶位: form.阶位,
    子类型: form.子类型,
    副属性: form.副属性,
    数量: form.数量,
    核心材料名: form.核心材料名,
    越阶材料: form.越阶材料,
    劣质材料: form.劣质材料,
  });
}

onMounted(() => store.syncFromMvu());
</script>

<style scoped>
.crf-page { display: flex; flex-direction: column; height: 100%; font-size: 13px; }
.crf-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid rgba(127,127,127,.25); }
.hdr-btn { background: none; border: none; cursor: pointer; padding: 4px; }
.hdr-btn svg { width: 18px; height: 18px; }
.hdr-title { font-weight: 700; flex: 1; }
.hdr-up { font-size: 12px; opacity: .8; }
.crf-tabs { display: flex; border-bottom: 1px solid rgba(127,127,127,.25); }
.crf-tab { flex: 1; padding: 8px 0; background: none; border: none; cursor: pointer; opacity: .6; }
.crf-tab.active { opacity: 1; font-weight: 700; border-bottom: 2px solid currentColor; }
.crf-body { flex: 1; overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
.crf-card { border: 1px solid rgba(127,127,127,.3); border-radius: 8px; padding: 8px 10px; cursor: pointer; }
.cc-head { display: flex; justify-content: space-between; align-items: center; }
.cc-name { font-weight: 700; }
.q-blue { color: #4a90d9; }
.cc-tag { font-size: 11px; opacity: .7; }
.cc-line { font-size: 12px; opacity: .85; margin-top: 4px; }
.crf-form { display: flex; flex-direction: column; gap: 8px; }
.crf-form label { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; }
.crf-form select, .crf-form input { max-width: 60%; }
.crf-check { justify-content: flex-start !important; }
.crf-dc { font-size: 12px; opacity: .8; }
.crf-go { padding: 10px; border-radius: 8px; border: none; background: #b8860b; color: #fff; font-weight: 700; cursor: pointer; }
.crf-go:disabled { opacity: .4; cursor: not-allowed; }
.crf-result .cr-title { font-weight: 700; margin-bottom: 4px; }
.r-杰作 .cr-title { color: #d4a017; }
.r-大失败 .cr-title, .crf-error { color: #c0392b; }
.r-失败 .cr-title { color: #e67e22; }
.crf-empty, .crf-hint { opacity: .6; text-align: center; padding: 8px; font-size: 12px; }
.crf-codex { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.crf-codex select { max-width: 30%; }
</style>
