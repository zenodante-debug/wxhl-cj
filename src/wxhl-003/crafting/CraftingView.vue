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
      <!-- AI 定制图纸：生成一张图纸物品入包（付费；「上传学习」后才进配方库） -->
      <div class="crf-card crf-design">
        <div class="cc-head">
          <span class="cc-name">AI 定制图纸</span>
          <span class="cc-tag">定价随成品/品质/阶位</span>
        </div>
        <div class="crf-form">
          <label>名称<input v-model="定制.名称" type="text" placeholder="如：狼王牙刃" /></label>
          <label>成品类型
            <select v-model="定制.成品类型">
              <option value="装备">装备</option>
              <option value="消耗品">消耗品</option>
            </select>
          </label>
          <template v-if="定制.成品类型 === '装备'">
            <label>类别
              <select v-model="定制.装备类">
                <option value="武器">武器</option>
                <option value="防具">防具</option>
              </select>
            </label>
            <label v-if="定制.装备类 === '武器'">武器类型
              <select v-model="定制.武器类">
                <option v-for="w in weaponTypes" :key="w" :value="w">{{ w }}</option>
              </select>
            </label>
            <label v-else>防具光谱
              <select v-model="定制.防具类">
                <option v-for="s in armorTypes" :key="s" :value="s">{{ s }}</option>
              </select>
            </label>
          </template>
          <label>品质
            <select v-model="定制.品质">
              <option value="金色">金色</option>
              <option value="紫色">紫色</option>
            </select>
          </label>
          <label>阶位
            <select v-model.number="定制.阶位">
              <option v-for="t in 5" :key="t" :value="t">{{ t }}阶</option>
            </select>
          </label>
          <label>核心材料<input v-model="定制.核心材料" type="text" placeholder="背包里的物品名" /></label>
          <label>行业
            <select v-model="定制.行业">
              <option v-for="h in 行业列表" :key="h" :value="h">{{ h }}</option>
            </select>
          </label>
        </div>
        <button class="crf-go" :disabled="store.designing || !定制可提交" @click="提交定制">
          {{ store.designing ? 'AI 设计中…' : 'AI 定制图纸' }}
        </button>
      </div>

      <!-- 基础配方：内置模板 + 标准货，只读（点卡片进制作页） -->
      <div class="crf-fold" @click="切换折叠('基础配方')">
        <span class="cf-arrow">{{ 展开.基础配方 ? '▾' : '▸' }}</span>
        <span class="cf-title">基础配方（{{ 基础配方.length }}）</span>
      </div>
      <div v-show="展开.基础配方" class="crf-list">
        <div v-for="r in 基础配方" :key="r.名称" class="crf-card" @click="pickRecipe(r)">
          <div class="cc-head">
            <span class="cc-name" :class="品质类[r.品质]">{{ r.名称 }}</span>
            <span class="cc-tag">{{ r.品质 }} · {{ r.行业 }}</span>
          </div>
          <div class="cc-line">材料：{{ 材料文本(r) }}</div>
          <div class="cc-line">要求：{{ r.技能要求.分类 }}技能 Lv.{{ r.技能要求.等级 }}<template v-if="r.批量上限 > 1"> · 可批量×{{ r.批量上限 }}</template></div>
        </div>
      </div>

      <!-- 我的配方：已「上传学习」的图纸配方（点卡片进制作页，删除只移除配方） -->
      <div class="crf-fold" @click="切换折叠('我的配方')">
        <span class="cf-arrow">{{ 展开.我的配方 ? '▾' : '▸' }}</span>
        <span class="cf-title">我的配方（{{ 我的配方.length }}）</span>
      </div>
      <div v-show="展开.我的配方" class="crf-list">
        <div v-if="!我的配方.length" class="crf-empty">还没有上传学习的配方——去下面「背包图纸」上传一张</div>
        <div v-for="r in 我的配方" :key="r.名称" class="crf-card" @click="pickRecipe(r)">
          <div class="cc-head">
            <span class="cc-name" :class="品质类[r.品质]">{{ r.名称 }}</span>
            <span class="cc-tag">{{ r.品质 }} · {{ r.阶位 }}阶 · {{ r.行业 }}</span>
          </div>
          <div class="cc-line">材料：{{ 材料文本(r) }}</div>
          <div v-for="(e, i) in r.效果" :key="i" class="cc-line">效果：{{ 效果文本(e) }}</div>
          <div v-if="r.描述" class="cc-line crf-desc">{{ r.描述 }}</div>
          <button class="crf-del" @click.stop="store.deleteRecipe(r.名称)">删除</button>
        </div>
      </div>

      <!-- 背包图纸：已在背包、尚未上传学习的图纸（补全 = AI 填缺料/效果） -->
      <div class="crf-fold" @click="切换折叠('背包图纸')">
        <span class="cf-arrow">{{ 展开.背包图纸 ? '▾' : '▸' }}</span>
        <span class="cf-title">背包图纸（{{ store.背包图纸.length }}）</span>
      </div>
      <div v-show="展开.背包图纸" class="crf-list">
        <div v-if="!store.背包图纸.length" class="crf-empty">背包里还没有图纸——用上方「AI 定制图纸」</div>
        <div v-for="bp in store.背包图纸" :key="bp.物品名" class="crf-card crf-bp">
          <div class="cc-head">
            <span class="cc-name" :class="品质类[bp.数据.配方.品质]">{{ bp.物品名 }}</span>
            <span class="cc-tag">{{ bp.数据.配方.品质 }} · {{ bp.数据.配方.阶位 }}阶 · {{ bp.数据.配方.行业 }}</span>
          </div>
          <div class="cc-line">配方：{{ 成品摘要(bp.数据.配方) }}</div>
          <div v-if="bp.数据.配方.描述" class="cc-line crf-desc">{{ bp.数据.配方.描述 }}</div>
          <label v-if="bp.数据.配方.成品类型 === '装备'" class="crf-bp-base">装备基础
            <select
              :value="写回暂存[bp.物品名] ?? bp.数据.配方.装备基础"
              :disabled="写回中 !== '' || store.completing"
              @change="改装备基础(bp.物品名, $event.target as HTMLSelectElement)"
            >
              <option value="" disabled>未指定（请选择）</option>
              <option v-for="o in 基础选项(bp.数据.配方.装备子类)" :key="o" :value="o">{{ o }}</option>
            </select>
          </label>
          <div v-if="装备基础提示(bp.数据.配方)" class="crf-warn">{{ 装备基础提示(bp.数据.配方) }}</div>
          <div class="crf-bp-btns">
            <button class="crf-mini" :disabled="store.completing || store.uploading || 写回中 !== ''" @click="补全(bp.物品名)">
              {{ 补全目标 === bp.物品名 ? '补全中…' : '补全词条' }}
            </button>
            <button v-if="已掌握(bp.数据.配方.名称)" class="crf-mini" disabled>已掌握</button>
            <button v-else class="crf-mini" :disabled="store.uploading || store.completing" @click="store.uploadBp(bp.物品名)">上传学习</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ 制作 ============ -->
    <div v-if="tab === 'craft'" class="crf-body">
      <div v-if="!form.配方" class="crf-empty">先去「配方」页选一个配方</div>
      <template v-else>
        <div class="crf-card">
          <div class="cc-head"><span class="cc-name">{{ form.配方.名称 }}</span><span class="cc-tag">{{ 设施标签 }}</span></div>
          <div class="cc-line">成品类型：{{ form.配方.成品类型 }}{{ form.配方.装备子类 ? ' · ' + form.配方.装备子类 : '' }}</div>
          <div v-if="form.配方.装备基础" class="cc-line">装备基础：{{ form.配方.装备基础 }}（图纸指定，无需再选）</div>
          <div v-if="form.配方.来源 === '图纸'" class="cc-line crf-owned">图纸状态：已掌握</div>
        </div>

        <div class="crf-form">
          <label v-if="form.配方.来源 === '模板'">阶位
            <select v-model.number="form.阶位">
              <option v-for="t in 5" :key="t" :value="t">{{ t }}阶</option>
            </select>
          </label>
          <label v-if="form.配方.装备子类 === '武器' && !form.配方.装备基础">武器类型
            <select v-model="form.子类型">
              <option v-for="w in weaponTypes" :key="w" :value="w">{{ w }}</option>
            </select>
          </label>
          <label v-if="form.配方.装备子类 === '防具' && !form.配方.装备基础">防具类型
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
            <button v-if="['成功', '精制', '杰作'].includes(store.lastOutcome.结果)" class="crf-sell" @click="emit('goto-market', p.名称)">上架市场</button>
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
import { WEAPON_TABLE, type ArmorSpectrum, type Attr, type Quality } from './equipTables';
import { 材料类别, 行业列表, isBlueprintName, type 配方, type 行业 } from './recipes';
import { useCraftingStore } from './store';

const emit = defineEmits<{ close: []; 'goto-market': [name: string] }>();
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

// ---------------- v2：折叠区 / AI 定制 / 背包图纸 ----------------

/** 三个折叠区的展开状态（默认都展开：v2 的新流程不能被藏在折叠里） */
const 展开 = ref<Record<string, boolean>>({ 基础配方: true, 我的配方: true, 背包图纸: true });
function 切换折叠(key: string): void {
  展开.value[key] = !展开.value[key];
}

/** 品质 → 名称配色（白/蓝沿用既有 q-blue，金/紫对齐工坊的琥珀/紫色系） */
const 品质类: Record<Quality, string> = { 白色: '', 蓝色: 'q-blue', 金色: 'q-gold', 紫色: 'q-purple' };

/** 内置配方（模板 + 标准货）：只读展示，无删除/上传 */
const 基础配方 = computed(() => store.allRecipes.filter(r => r.来源 === '模板' || r.来源 === '标准'));
/** 已上传学习的图纸配方（配方库的值即配方本身） */
const 我的配方 = computed(() => Object.values(store.配方库));

function 材料文本(r: 配方): string {
  return r.材料.map(m => `${m.类别}×${m.数量}${m.核心 ? '(核心)' : ''}`).join(' + ');
}

/** 效果摘要：与 store 的图纸确认弹窗同格式（数值 0 视为无该效果，故省略） */
function 效果文本(e: 配方['效果'][number]): string {
  const 数值 = [
    e.命中闪避 ? `命中/闪避 ${e.命中闪避 > 0 ? '+' : ''}${e.命中闪避}%` : '',
    e.伤害百分比 ? `伤害 ${e.伤害百分比 > 0 ? '+' : ''}${e.伤害百分比}%` : '',
    e.属性加成 ? `属性 ${e.属性加成 > 0 ? '+' : ''}${e.属性加成}` : '',
  ].filter(Boolean).join('，');
  return `【${e.类型}】${e.描述}${数值 ? `（${数值}）` : ''}`;
}

/** 图纸配方机械要点一行（成品类型 · 装备基础 · 材料清单），风味文案由卡片单独一行展示 */
function 成品摘要(r: 配方): string {
  const 类型 = r.成品类型 === '装备'
    ? `装备·${r.装备子类 || '?'}${r.装备基础 ? `（${r.装备基础}）` : ''}`
    : '消耗品';
  return `${类型} ｜ ${材料文本(r)}`;
}

// ---- AI 定制图纸表单（成品类型=消耗品时隐藏子类：图纸 schema 里消耗品的 装备子类/装备基础 恒为空串）----
const 定制 = reactive({
  名称: '',
  成品类型: '装备' as '装备' | '消耗品',
  装备类: '武器' as '武器' | '防具',
  武器类: weaponTypes[2],
  防具类: '轻装' as ArmorSpectrum,
  品质: '金色' as '金色' | '紫色',
  阶位: 1,
  核心材料: '',
  行业: '锻造' as 行业,
});
const 定制子类 = computed(() => (定制.装备类 === '武器' ? 定制.武器类 : 定制.防具类));
const 定制可提交 = computed(() => 定制.名称.trim() !== '' && 定制.核心材料.trim() !== '');

async function 提交定制(): Promise<void> {
  if (!定制可提交.value) {
    toastr.warning('请先填写图纸名称与核心材料');
    return;
  }
  const ok = await store.designBlueprint({
    名称: 定制.名称.trim(),
    成品类型: 定制.成品类型,
    子类: 定制.成品类型 === '装备' ? 定制子类.value : '',
    品质: 定制.品质,
    阶位: 定制.阶位,
    核心材料: 定制.核心材料.trim(),
    行业: 定制.行业,
  });
  // 成功才清名称：图纸要付费，避免连点重复买同一张；其余参数保留，方便照同一套再改
  if (ok) 定制.名称 = '';
}

/** 核心材料默认填背包第一件可当材料的物品名（图纸是生产资料，不做默认值——与 autoPick 的排除同源） */
function 定核心材料默认(): void {
  if (定制.核心材料.trim() !== '') return;
  const 首个 = Object.keys(store.bag).find(n => !isBlueprintName(n));
  if (首个) 定制.核心材料 = 首个;
}

// ---- 背包图纸：补全 / 上传学习（store 侧 completing/uploading 是全局守卫，这里只做按钮文案与置灰）----
const 补全目标 = ref('');
const 写回中 = ref('');
/** 写回在途的乐观值（物品名 → 玩家刚选的值），只活到本次写回结束。
 *  为什么需要它：Vue 对 `value` 这个 prop 是**每次 patch 都强刷**（renderer 里 `next !== prev || key === 'value'`，
 *  不参与「值没变就跳过」的优化），而 `写回中` 的置位本身就会触发一次重渲染 —— 若 `:value` 直接绑存档值，
 *  在途那次重渲染就会把玩家刚选的值刷回存档旧值（成功后再跳回来，肉眼看到「选完弹回去、过一会又跳回来」）。
 *  绑乐观值后，在途渲染写的是同一个串，runtime-dom 的 `oldValue !== newValue` 判定直接跳过赋值，闪烁即消。
 *  写回一结束就撤掉（无论成败）：成功时它与存档真值相同故无感，失败时 `:value` 自然回落存档真值，
 *  也避免条目长期留着把「别处改动的真值」遮住。 */
const 写回暂存 = ref<Record<string, string | undefined>>({});

/** 是否已掌握同名配方：用 hasOwn，图纸名由 AI 生成，`constructor` 之类会让真值判定误判 */
function 已掌握(名称: string): boolean {
  return Object.hasOwn(store.配方库, 名称);
}

/** 装备基础候选：按图纸的 装备子类 给对应表（写错会让 buildEquip 抛出，故选不出错值） */
function 基础选项(子类: string): readonly string[] {
  return 子类 === '武器' ? weaponTypes : 子类 === '防具' ? armorTypes : [];
}

/** 装备图纸的 装备基础 体检（非空且与子类同类才算合格）：不合规时补全必被拒、制作时 buildEquip 会抛错 */
function 装备基础提示(r: 配方): string {
  if (r.成品类型 !== '装备') return '';
  if (!r.装备子类) return '图纸缺少装备子类（武器/防具），无法指定装备基础';
  if (!r.装备基础) return '未指定装备基础，AI 补全会被拒绝';
  if (!基础选项(r.装备子类).includes(r.装备基础)) return `装备基础「${r.装备基础}」与子类「${r.装备子类}」不符，制作会失败`;
  return '';
}

async function 补全(物品名: string): Promise<void> {
  if (补全目标.value !== '') return; // 防连点：store 的 completing 守卫在重入时会静默返回 false
  补全目标.value = 物品名;
  try {
    await store.completeBp(物品名);
  } finally {
    补全目标.value = '';
  }
}

/** 装备基础下拉：换值即写回。落档（入参校验 / 新读背包为基底 / commit / 回读）全在
 *  store.setBpBase 里，视图只管 UI 状态与禁用——UI 不自备 MVU 管道。
 *  来由：补全（completeBlueprint）把 现有.配方.装备基础 当 DesignTarget.子类，为空或非法一律拒绝，
 *  而 AI 无权提供该字段、completeBp 也没有它的参数位，故必须先由玩家选定并落档。
 *  本函数不做手工 DOM 回退：`写回暂存` 撤掉后，:value 的强刷机制自会把控件刷回存档真值。 */
async function 改装备基础(物品名: string, el: HTMLSelectElement): Promise<void> {
  if (写回中.value !== '') return;
  const 选中 = el.value; // 先取：await 期间控件可能被别处重渲染
  写回暂存.value = { ...写回暂存.value, [物品名]: 选中 };
  写回中.value = 物品名;
  try {
    // 失败时 store 已 toastr + 写 lastError（顶部错误条会显示），视图不重复播报
    await store.setBpBase(物品名, 选中);
  } finally {
    const 下一份 = { ...写回暂存.value };
    delete 下一份[物品名];
    写回暂存.value = 下一份;
    写回中.value = '';
  }
}

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

onMounted(() => {
  store.syncFromMvu();
  定核心材料默认();
});
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
.q-gold { color: #d4a017; }
.q-purple { color: #9b59b6; }
.cc-tag { font-size: 11px; opacity: .7; }
.cc-line { font-size: 12px; opacity: .85; margin-top: 4px; }
.crf-desc { opacity: .65; font-style: italic; }
.crf-form { display: flex; flex-direction: column; gap: 8px; }
.crf-form label { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; }
.crf-form select, .crf-form input { max-width: 60%; }
.crf-check { justify-content: flex-start !important; }
.crf-dc { font-size: 12px; opacity: .8; }
.crf-go { padding: 10px; border-radius: 8px; border: none; background: #b8860b; color: #fff; font-weight: 700; cursor: pointer; }
.crf-sell { margin-top: 6px; padding: 5px 12px; border-radius: 6px; border: 1px solid #b8860b; background: none; color: #b8860b; font-size: 12px; cursor: pointer; }
.crf-go:disabled { opacity: .4; cursor: not-allowed; }
.crf-result .cr-title { font-weight: 700; margin-bottom: 4px; }
.r-杰作 .cr-title { color: #d4a017; }
.r-大失败 .cr-title, .crf-error { color: #c0392b; }
.r-失败 .cr-title { color: #e67e22; }
.crf-empty, .crf-hint { opacity: .6; text-align: center; padding: 8px; font-size: 12px; }
.crf-codex { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.crf-codex select { max-width: 30%; }
/* ---- v2：折叠区 / AI 定制 / 背包图纸 ---- */
.crf-fold { display: flex; align-items: center; gap: 6px; margin-top: 4px; padding: 6px 2px; border-bottom: 1px solid rgba(127,127,127,.25); font-weight: 700; cursor: pointer; user-select: none; }
.cf-arrow { width: 14px; color: #b8860b; }
.cf-title { flex: 1; }
.crf-list { display: flex; flex-direction: column; gap: 8px; }
.crf-design { border-color: rgba(184,134,11,.55); cursor: default; }
.crf-design .crf-go { margin-top: 8px; }
.crf-del { margin-top: 6px; padding: 5px 12px; border-radius: 6px; border: 1px solid #c0392b; background: none; color: #c0392b; font-size: 12px; cursor: pointer; }
.crf-bp { cursor: default; }
.crf-bp-base { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 6px; font-size: 12px; }
.crf-bp-base select { max-width: 55%; }
.crf-warn { margin-top: 4px; font-size: 11px; color: #e67e22; }
.crf-bp-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.crf-mini { padding: 5px 12px; border-radius: 6px; border: 1px solid #b8860b; background: none; color: #b8860b; font-size: 12px; cursor: pointer; }
.crf-mini:disabled, .crf-del:disabled { opacity: .4; cursor: not-allowed; }
.crf-owned { color: #b8860b; }
</style>
