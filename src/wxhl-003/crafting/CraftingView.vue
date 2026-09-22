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
          <label>成品类型
            <select v-model="定制.成品类型">
              <option value="装备">装备</option>
              <option value="道具">道具</option>
            </select>
          </label>
          <label class="crf-col">设计要求
            <textarea
              v-model="定制.设计要求"
              rows="3"
              maxlength="500"
              placeholder="想让 AI 做成什么？如「一把会飞的连射炮，打起来像下雨」。这是 AI 的主要依据，越具体越好"
            ></textarea>
          </label>
          <label>成品名称<input v-model="定制.名称" type="text" placeholder="可留空——由 AI 按设计要求起名" /></label>
          <template v-if="定制.成品类型 === '装备'">
            <label>子类
              <select v-model="定制.子类">
                <option value="武器">武器</option>
                <option value="防具">防具</option>
                <option value="饰品">饰品</option>
              </select>
            </label>
            <label>种类<input v-model="定制.种类" type="text" placeholder="自由文本，如 浮游炮 / 指环 / 玄铁长枪" /></label>
            <label v-if="定制.子类 !== '饰品'">数值参照
              <select v-model="定制.数值参照">
                <option value="">留空——由 AI 选</option>
                <option v-for="o in 模板选项(定制.子类)" :key="o" :value="o">{{ o }}</option>
              </select>
            </label>
            <div v-else class="crf-tip">饰品不走数值参照：只加主/副属性加成，数值由阶位与品质决定</div>
          </template>
          <div v-else class="crf-tip">道具没有额外字段：类型与固定值由 AI 按设计要求产出，生成后在确认框里展示</div>
          <label>品质
            <select v-model="定制.品质">
              <option value="金色">金色</option>
              <option value="紫色">紫色</option>
            </select>
          </label>
          <label>{{ 定制阶位标签 }}
            <select v-model.number="定制.阶位">
              <option v-for="t in 定制阶位上限" :key="t" :value="t">{{ t }}阶</option>
            </select>
          </label>
          <div class="crf-multi">
            <div class="cm-title">核心材料（可多选——AI 依它定材料类别与成品名）</div>
            <div v-if="!设计核心候选.length" class="crf-empty">背包里没有可当核心材料的物品</div>
            <label v-for="n in 设计核心候选" :key="n" class="crf-check">
              <input type="checkbox" :checked="定制.核心材料.includes(n)" @change="toggle定制核心(n)" />
              {{ n }}（×{{ store.bag[n]?.数量 }}）
            </label>
          </div>
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
          <div v-if="数值摘要(r)" class="cc-line">数值：{{ 数值摘要(r) }}</div>
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
          <div v-if="数值摘要(r)" class="cc-line">数值：{{ 数值摘要(r) }}</div>
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
          <label v-if="可改参照模板(bp.数据.配方)" class="crf-bp-base">数值参照
            <select
              :value="写回暂存[bp.物品名] ?? bp.数据.配方.参照模板"
              :disabled="写回中 !== '' || 丢弃中 !== '' || store.completing"
              @change="改参照模板(bp.物品名, $event.target as HTMLSelectElement)"
            >
              <option value="" disabled>未指定（请选择）</option>
              <option v-for="o in 模板选项(bp.数据.配方.装备子类)" :key="o" :value="o">{{ o }}</option>
            </select>
          </label>
          <div v-if="参照模板提示(bp.数据.配方)" class="crf-warn">{{ 参照模板提示(bp.数据.配方) }}</div>
          <div class="crf-bp-btns">
            <button class="crf-mini" :disabled="store.completing || store.uploading || 写回中 !== '' || 丢弃中 !== ''" @click="补全(bp.物品名)">
              {{ 补全目标 === bp.物品名 ? '补全中…' : '补全词条' }}
            </button>
            <button v-if="已掌握(bp.数据.配方.名称)" class="crf-mini" disabled>已掌握</button>
            <button v-else class="crf-mini" :disabled="store.uploading || store.completing || 丢弃中 !== ''" @click="store.uploadBp(bp.物品名)">上传学习</button>
            <button class="crf-mini crf-mini-dang" :disabled="store.uploading || store.completing || 写回中 !== '' || 丢弃中 !== ''" @click="丢弃(bp.物品名)">
              {{ 丢弃中 === bp.物品名 ? '丢弃中…' : '丢弃' }}
            </button>
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
          <div v-if="form.配方.成品类型 === '装备' && form.配方.装备基础" class="cc-line">种类：{{ form.配方.装备基础 }}（自由文本名，数值见下）</div>
          <div v-if="数值来源文本" class="cc-line crf-owned">{{ 数值来源文本 }}</div>
          <div v-if="form.配方.来源 === '图纸'" class="cc-line crf-owned">图纸状态：已掌握</div>
        </div>

        <div class="crf-form">
          <label v-if="form.配方.来源 === '模板'">阶位
            <select v-model.number="form.阶位">
              <option v-for="t in 5" :key="t" :value="t">{{ t }}阶</option>
            </select>
          </label>
          <label v-if="form.配方.装备子类 === '武器' && !form.配方.参照模板">武器类型
            <select v-model="form.子类型">
              <option v-for="w in weaponTypes" :key="w" :value="w">{{ w }}</option>
            </select>
          </label>
          <label v-if="form.配方.装备子类 === '防具' && !form.配方.参照模板">防具类型
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
          <div class="crf-multi">
            <div class="cm-title">核心材料（需 {{ 核心需求文本 }}，可多选）</div>
            <div v-if="!coreCandidates.length" class="crf-empty">背包里没有「{{ 核心需求文本 }}」类材料</div>
            <label v-for="n in coreCandidates" :key="n" class="crf-check">
              <input type="checkbox" :checked="form.核心材料.includes(n)" @change="toggle核心材料(n)" />
              {{ n }}（×{{ store.bag[n]?.数量 }} · {{ store.codex[n]?.类别 ?? '未分类' }}）
            </label>
            <div
              v-if="核心需求.length && form.核心材料.length"
              class="crf-tip"
              :class="核心自检.未覆盖.length || 核心自检.多余.length ? 'bad' : 'ok'"
            >
              <template v-if="核心自检.未覆盖.length">还差：{{ 核心自检.未覆盖.join('、') }}</template>
              <template v-else-if="核心自检.多余.length">这几件对不上核心需求：{{ 核心自检.多余.join('、') }}</template>
              <template v-else>核心需求已齐（按档案类别认领，归类不对可在下面改）</template>
            </div>
          </div>
          <div v-for="n in form.核心材料" :key="n" class="cc-line crf-codex">
            {{ n }} 归类不对？直接改：
            <select :value="store.codex[n]?.类别 ?? '未分类'" @change="store.setCodex(n, { 类别: ($event.target as HTMLSelectElement).value as any })">
              <option v-for="c in CATS" :key="c" :value="c">{{ c }}</option>
            </select>
            <select :value="store.codex[n]?.品质 ?? '白色'" @change="store.setCodex(n, { 品质: ($event.target as HTMLSelectElement).value as any })">
              <option v-for="q in QUALS" :key="q" :value="q">{{ q }}</option>
            </select>
            <select :value="store.codex[n]?.阶位 ?? 1" @change="store.setCodex(n, { 阶位: Number(($event.target as HTMLSelectElement).value) })">
              <option v-for="t in 5" :key="t" :value="t">{{ t }}阶</option>
            </select>
          </div>
          <label class="crf-check"><input v-model="form.越阶材料" type="checkbox" /> 越阶高级材料代替（DC-2）</label>
          <label class="crf-check"><input v-model="form.劣质材料" type="checkbox" /> 劣质材料替代（DC+3）</label>
        </div>

        <div class="crf-dc">DC 预览：{{ dcPreview }}（D20+基础属性+技能Lv ≥ DC）</div>
        <div class="crf-dc" :class="难度提示.类">{{ 难度提示.文 }}</div>
        <button class="crf-go" :disabled="核心需求.length > 0 && !form.核心材料.length" @click="go">开工</button>

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
import { computed, onMounted, reactive, ref, watchEffect } from 'vue';
import { 归一位阶 } from '../dice';
import type { DesignTarget } from './blueprintAI';
import { computeDC, 难度分档 } from './craft';
import { armorStats, attrBonus, weaponStats, WEAPON_TABLE, type ArmorSpectrum, type Attr, type Quality } from './equipTables';
import {
  INDUSTRY_ATTR, 材料类别, 行业列表, isBlueprintName,
  type MaterialCategory, type 配方, type 行业,
} from './recipes';
import { makerFor, useCraftingStore } from './store';

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
  /** 玩家选定的核心材料物品名（v2.1 多选：store 按档案类别把每件认领到配方的核心需求，扣该需求的数量） */
  核心材料: [] as string[],
  越阶材料: false,
  劣质材料: false,
});

const 设施标签 = computed(() => store.facilityInfo().标签);
/** 配方的核心材料需求（图纸可多核心：类别 + 数量）——不摊给玩家看，多选就无从下手 */
const 核心需求 = computed(() => form.配方?.材料.filter(m => m.核心) ?? []);
const 核心需求文本 = computed(() => 核心需求.value.map(m => `${m.类别}×${m.数量}`).join(' + ') || '任意');
/** 核心材料候选：按核心类别从背包里拣（多核心取并集；配方没有核心需求时按「任意」列全部） */
const coreCandidates = computed(() => {
  const 类别列表: MaterialCategory[] = 核心需求.value.map(m => m.类别);
  const 全部 = (类别列表.length ? 类别列表 : ['任意' as MaterialCategory])
    .flatMap(c => store.matchMaterials(c));
  return [...new Set(全部)];
});
/** 核心需求覆盖自检（**只读预览**，口径与 store.doCraft 的 分配核心材料 逐点一致：按档案类别认领、
 *  同类别按选择顺序、需求里的「任意」兜底、对不上任何需求的多余材料同样会被拒）——
 *  玩家在点「开工」前就能看见哪条需求还没着落，而不是点下去才被 store 拒。 */
const 核心自检 = computed(() => {
  const 待配 = [...核心需求.value];
  const 多余: string[] = [];
  for (const n of form.核心材料) {
    const 类别 = store.codex[n]?.类别;
    let i = 待配.findIndex(r => r.类别 === 类别);
    if (i === -1) i = 待配.findIndex(r => r.类别 === '任意');
    if (i === -1) 多余.push(n);
    else 待配.splice(i, 1);
  }
  return { 未覆盖: 待配.map(r => `${r.类别}×${r.数量}`), 多余 };
});
const dcPreview = computed(() => {
  if (!form.配方) return '-';
  const 修正 = [
    ...(form.越阶材料 ? [{ 项: '越阶高级材料代替', 值: -2 }] : []),
    ...(form.劣质材料 ? [{ 项: '劣质材料替代', 值: 3 }] : []),
    ...(store.facilityInfo().修正 !== 0 ? [{ 项: 设施标签.value, 值: store.facilityInfo().修正 }] : []),
  ];
  return computeDC(form.配方.品质, form.阶位, 修正).最终;
});

// ---------------- v2 收尾：开工前把难度如实摊给玩家（避免「花了 UP 买图纸才发现做不出来」）----------------

/** 玩家本次能掷出的检定值上限 = D20 满值 20 + 行业对应最高基础属性 + 技能等级。
 *  与 executeCraft 的检定值同式（属性修正值不参与检定），只是 d20 取满值；
 *  makerFor 与 facilityInfo 同形：直接读 MVU 的非响应式取用，故放在 computed 里。 */
const 检定值上限 = computed(() => {
  const r = form.配方;
  if (!r) return 0;
  const m = makerFor(r.行业);
  if (!m) return 0;
  return 20 + Math.max(...INDUSTRY_ATTR[r.行业].map(a => m.基础属性[a])) + (m.技能?.等级 ?? 0);
});

/** 难度分档（如实，不粉饰）：口径与 judgeRoll 的对齐关系全部收在 craft.ts 的 难度分档 里（纯函数，可单测），
 *  视图只负责取数、拼文案与配色。`需骰` = 成功所需的最小 d20 = DC − 上限 + 20。 */
const 难度提示 = computed(() => {
  const dc = Number(dcPreview.value);
  const 上限 = 检定值上限.value;
  if (!Number.isFinite(dc)) return { 类: '', 文: '' };
  const { 档, 需骰 } = 难度分档(上限, dc);
  const 前缀 = `检定值上限 ${上限} vs DC ${dc} —— `;
  if (档 === '必成') return { 类: 'ok', 文: `${前缀}除自然 1 外必成` };
  if (档 === '靠骰运') return { 类: 'warn', 文: `${前缀}需 d20 ≥ ${需骰}` };
  return { 类: 'bad', 文: `${前缀}掷满 d20 也不够，仅自然 20 可成（杰作）` };
});

// ---- v2.1：制作页必须摊开「成品数值从哪来」（AI 图纸的 种类 是自创名，数值其实取自 参照模板）----

/** 成功档波动说明（与 store.ts 确认框里的同一句）：防具的装备防御/闪避、饰品与装备的主/副属性加成，
 *  以及恢复类道具的恢复量，在「成功」档会被 fluctuate 到基准的 80%~100%（精制/杰作取基准，失败/大失败
 *  不产出）。伤害骰/倍率/负重、爆炸物的附加固定伤害不波动，故那几项后面不挂这句。 */
const 波动说明 = '（成功档 80%~100% 波动）';

/** 表内取武器数值：非法模板/阶位（AI·GM 直写背包的坏图纸）不抛错，返回 null 由调用方给可读文案。
 *  只判模板键不够——weaponStats 对越界阶位同样会抛（`WEAPON_TABLE[键][9]` 是 undefined），
 *  而 配方.阶位 在 schema 里没有范围校验，坏图纸能一路走到这里，抛在 computed 里就是整页崩。 */
function 武器数值(模板: string, 阶位: number, 品质: Quality) {
  try {
    return weaponStats(模板, 阶位, 品质);
  } catch (_) {
    return null;
  }
}
/** 表内取防具数值（同上：非法光谱或阶位返回 null） */
function 防具数值(光谱: string, 阶位: number, 品质: Quality) {
  try {
    return armorStats(光谱 as ArmorSpectrum, 阶位, 品质);
  } catch (_) {
    return null;
  }
}
/** 表内取饰品加成（同上：阶位/品质非法返回 null） */
function 饰品数值(阶位: number, 品质: Quality) {
  try {
    return attrBonus('饰品', 阶位, 品质);
  } catch (_) {
    return null;
  }
}

/** 「这些数字是哪来的」一行：装备看 参照模板（含按当前阶位/品质算出的具体数值）、道具看结构化字段。
 *  与 buildEquip/buildGoods 同口径：参照模板优先，为空才回落制作时选的子类型（模板/标准配方走那条路）。
 *  数值一律现算、绝不硬编码（表一改，硬编码的文案就开始骗人）；文案与 store.ts 的「数值来源行」
 *  （确认框/图纸描述）保持同口径。本行只是展示路径，取不到值就给可读文案——坏图纸该在开工时被 store 拦。 */
const 数值来源文本 = computed(() => {
  const r = form.配方;
  if (!r) return '';
  if (r.成品类型 === '道具') {
    // 恢复HP/MP 的固定值是**基准恢复量**（成功档 80%~100%）；爆炸物的固定值是附加固定伤害（不波动），
    // 其余类型只是口径标签——故这句只挂在恢复类后面，不无差别地贴给所有道具。
    const 波动 = r.道具类型 === '恢复HP' || r.道具类型 === '恢复MP' ? 波动说明 : '';
    return `道具数值：${r.道具类型}${r.道具固定值 ? ` · 固定值 ${r.道具固定值}${波动}` : ''}（吃 ${r.关联属性} 修正）`;
  }
  if (r.装备子类 === '饰品') {
    const b = 饰品数值(form.阶位, r.品质);
    return b
      ? `饰品数值：主属性加成 +${b.主} / 副属性 +${b.副}${波动说明}（无伤害骰/防御/负重）`
      : '饰品数值：只加主/副属性加成（阶位或品质非法，取不到数值）';
  }
  const 模板 = r.参照模板 || form.子类型;
  if (!模板) return '未指定数值参照——请在下面选一个武器/防具类型';
  if (r.装备子类 === '武器') {
    const w = 武器数值(模板, form.阶位, r.品质);
    return w
      ? `数值参照【${模板}】→ 伤害骰 ${w.伤害骰} / 倍率 ${w.倍率} / 负重 ${w.负重}kg`
      : `数值参照【${模板}】取不到数值（模板或阶位非法），制作会失败`;
  }
  if (r.装备子类 === '防具') {
    const a = 防具数值(模板, form.阶位, r.品质);
    // 波动说明紧跟在**会波动的那两项**（防御/闪避）后面，别让它看起来像在说负重也波动
    return a
      ? `数值参照【${模板}】→ 装备防御 ${a.装备防御} / 闪避 ${a.装备闪避}${波动说明} / 负重 ${a.负重}kg`
      : `数值参照【${模板}】取不到数值（模板或阶位非法），制作会失败`;
  }
  return '';
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

/** 成品数值要点（v2.1 的「名字与数值分家」）：装备 = 自由的种类名 + 数值来源的参照模板；
 *  道具 = AI 产出的结构化类型与固定值。制作页与配方卡共用这一行——两处都不能只显示名字，
 *  否则玩家看不出「浮游炮」的数值其实来自「突击步枪」。 */
function 数值摘要(r: 配方): string {
  if (r.成品类型 === '道具') return `${r.道具类型}${r.道具固定值 ? `·固定值 ${r.道具固定值}` : ''}`;
  const 种类 = r.装备基础 ? `种类：${r.装备基础}` : '';
  const 参照 = r.装备子类 === '饰品' ? '饰品（只加属性）' : r.参照模板 ? `数值参照：${r.参照模板}` : '';
  return [种类, 参照].filter(Boolean).join(' · ');
}

/** 图纸配方机械要点一行（成品类型 · 数值 · 材料清单），风味文案由卡片单独一行展示 */
function 成品摘要(r: 配方): string {
  const 类型 = r.成品类型 === '装备' ? `装备·${r.装备子类 || '?'}` : '道具';
  return [类型, 数值摘要(r), 材料文本(r)].filter(Boolean).join(' ｜ ');
}

// ---- AI 定制图纸表单（成品类型=道具时隐藏装备字段：图纸 schema 里道具的 装备子类/装备基础/参照模板 恒为空串）----
const 定制 = reactive({
  成品类型: '装备' as '装备' | '道具',
  /** 玩家给 AI 的成品要求（v2.1 新增）：buildDesignPrompt 把它原样写进提示词，是 AI 的主要依据 */
  设计要求: '',
  名称: '',
  子类: '武器' as '武器' | '防具' | '饰品',
  /** 自由文本种类名（如「浮游炮」）：只参与显示与命名，数值另走下面的「数值参照」 */
  种类: '',
  数值参照: '',
  品质: '金色' as '金色' | '紫色',
  阶位: 1,
  核心材料: [] as string[],
  行业: '锻造' as 行业,
});
/** 设计要求是 AI 的主输入（成品名/数值参照都可留空：前者由 AI 起名、后者留空即由 AI 挑模板），
 *  故这里要求它非空——空着提交等于让 AI 凭空造一件，提示词里只会得到「（无）」。 */
const 定制可提交 = computed(() => 定制.设计要求.trim() !== '' && 定制.核心材料.length > 0);

/** 设计表单的核心材料候选：背包里可当材料的物品，**排除图纸**——图纸是生产资料，被当核心材料烧掉不可逆
 *  （与 craft.ts 的 autoPick 排除同源）。这里不猜类别：AI 依物品名自己判断材料类别。 */
const 设计核心候选 = computed(() =>
  Object.keys(store.bag).filter(n => !isBlueprintName(n) && Number(store.bag[n]?.数量 ?? 0) > 0),
);
function toggle定制核心(name: string): void {
  const i = 定制.核心材料.indexOf(name);
  if (i === -1) 定制.核心材料.push(name);
  else 定制.核心材料.splice(i, 1);
}

/** 玩家自身阶位（1~5）：playerTier 是「一阶」这类字符串，归一位阶 返回 **0 基**下标故 +1；
 *  认不出（超脱/空/六阶…）保守取 1——与 assembleMaker 的兜底同源。 */
const 玩家阶位 = computed(() => (归一位阶(store.playerTier) ?? 0) + 1);
/** 定制阶位上限 = min(5, 自身阶位)：validateCraft 按 制作者.阶位上限 拦成品阶位，放开就会花钱
 *  买到一张自己做不出来的图纸（五阶紫 = 112,500 UP）。 */
const 定制阶位上限 = computed(() => Math.min(5, 玩家阶位.value));
const 定制阶位标签 = computed(() => (定制阶位上限.value < 5 ? `阶位（最高 ${定制阶位上限.value} 阶）` : '阶位'));
// 自身阶位刷新后（syncFromMvu）可能低于已选值：把选择夹回上限，避免下拉停在无对应选项的空值上
watchEffect(() => {
  if (定制.阶位 > 定制阶位上限.value) 定制.阶位 = 定制阶位上限.value;
});

async function 提交定制(): Promise<void> {
  if (!定制可提交.value) {
    toastr.warning('请先写设计要求（AI 的主要依据），并勾选至少一件核心材料');
    return;
  }
  // 「数值参照」是玩家给 AI 的**倾向**，不是保证：DesignTarget 没有 参照模板 字段（定制路径要 AI 自己挑、
  // 补全路径要沿用存档值，两者语义相反不能共用一个入参，见 blueprintAI），buildDesignPrompt 也只把
  // 设计要求 原样写进提示词——故这里把它并进设计要求转达，生成后玩家仍可在「背包图纸」改这一栏。
  const 数值倾向 = 定制.成品类型 === '装备' && 定制.数值参照
    ? `数值参照希望用「${定制.数值参照}」，种类名只是风味名。`
    : '';
  const 目标: DesignTarget = {
    成品类型: 定制.成品类型,
    装备子类: 定制.成品类型 === '装备' ? 定制.子类 : '',
    种类: 定制.成品类型 === '装备' ? 定制.种类.trim() : '',
    品质: 定制.品质,
    阶位: 定制.阶位,
    核心材料: [...定制.核心材料],
    行业: 定制.行业,
    设计要求: [定制.设计要求.trim(), 数值倾向].filter(Boolean).join('\n'),
    名称: 定制.名称.trim(),
  };
  const ok = await store.designBlueprint(目标);
  // 成功才清名称：图纸要付费，避免连点重复买同一张；其余参数保留，方便照同一套再改
  if (ok) 定制.名称 = '';
}

// ---- 背包图纸：补全 / 上传学习（store 侧 completing/uploading 是全局守卫，这里只做按钮文案与置灰）----
const 补全目标 = ref('');
const 写回中 = ref('');
/** 丢弃在途守卫（单飞）：与写回中同类的「上一次落档还没回来」窗口——两次丢弃都在 await 之前
 *  读同一份背包，后完成的那次会用陈旧基底把前一次的结果覆盖回去（图纸复活）。置灰同组按钮。 */
const 丢弃中 = ref('');
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

/** 数值参照候选（参照模板）：按图纸的 装备子类 给对应表（武器=9 种武器名 / 防具=5 光谱 / 饰品=无）。
 *  v2.1：这一栏承载的是**数值来源**，与自由的「种类」名是两个字段——写错会让 buildEquip 抛错或取错数值，
 *  故选不出错值。 */
function 模板选项(子类: string): readonly string[] {
  return 子类 === '武器' ? weaponTypes : 子类 === '防具' ? armorTypes : [];
}

/** 这张图纸有没有「数值参照」可改：只有武器/防具图纸有这一栏（饰品走 attrBonus、道具走结构化字段） */
function 可改参照模板(r: 配方): boolean {
  return r.成品类型 === '装备' && (r.装备子类 === '武器' || r.装备子类 === '防具');
}

/** 装备图纸的 参照模板 体检（非空且与子类同类才算合格）：不合规时补全必被拒、制作时 buildEquip 会取错数值。
 *  v2.1：体检对象从 `装备基础` 换成 `参照模板`——前者已退化为**自由文本种类名**（AI 写的「浮游炮」必然
 *  不在武器表里，拿它体检等于给每张 AI 武器图纸发一条假警报），后者才是真表键。饰品不走这一栏，故免检。 */
function 参照模板提示(r: 配方): string {
  if (r.成品类型 !== '装备') return '';
  if (r.装备子类 === '饰品') return '';
  if (!r.装备子类) return '图纸缺少装备子类（武器/防具），无法指定数值参照';
  if (!r.参照模板) return '未指定数值参照，AI 补全会被拒绝';
  if (!模板选项(r.装备子类).includes(r.参照模板)) return `数值参照「${r.参照模板}」与子类「${r.装备子类}」不符，制作会失败`;
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

/** 数值参照下拉：换值即写回。落档（入参校验 / 新读背包为基底 / commit / 回读）全在
 *  store.setBpTemplate 里，视图只管 UI 状态与禁用——UI 不自备 MVU 管道。
 *  来由：补全（completeBlueprint）要求图纸的 参照模板 已就位（AI 只负责给装备挑模板，残缺图纸得由玩家先定），
 *  而 AI 无权提供该字段、completeBp 也没有它的参数位，故必须先由玩家选定并落档。
 *  v2.1 改名：本动作写的是 `配方.参照模板`（数值来源），旧名 setBpBase 写的是 `装备基础`。
 *  本函数不做手工 DOM 回退：`写回暂存` 撤掉后，:value 的强刷机制自会把控件刷回存档真值。 */
async function 改参照模板(物品名: string, el: HTMLSelectElement): Promise<void> {
  if (写回中.value !== '') return;
  const 选中 = el.value; // 先取：await 期间控件可能被别处重渲染
  写回暂存.value = { ...写回暂存.value, [物品名]: 选中 };
  写回中.value = 物品名;
  try {
    // 失败时 store 已 toastr + 写 lastError（顶部错误条会显示），视图不重复播报
    await store.setBpTemplate(物品名, 选中);
  } finally {
    const 下一份 = { ...写回暂存.value };
    delete 下一份[物品名];
    写回暂存.value = 下一份;
    写回中.value = '';
  }
}

/** 丢弃一张背包图纸：图纸转卖属 v3、市场不收（见 MarketView 的 bagEntries），同名配方已掌握时
 *  也传不上去，没有这个出口玩家只能让它永久占位。落档全在 store.discardBp（只写背包），
 *  视图只管确认框、单飞守卫与按钮文案。 */
async function 丢弃(物品名: string): Promise<void> {
  if (丢弃中.value !== '') return;
  const 份 = Number(store.bag[物品名]?.数量 ?? 1);
  if (!window.confirm(
    `确认丢弃图纸「${物品名}」${份 > 1 ? `（${份} 张）` : ''}？\n\n丢弃后无法找回。若还想学这张图纸的配方，请改用「上传学习」。`,
  )) return;
  丢弃中.value = 物品名;
  try {
    await store.discardBp(物品名);
  } finally {
    丢弃中.value = '';
  }
}

function pickRecipe(r: 配方) {
  form.配方 = r;
  form.阶位 = r.来源 === '模板' ? 1 : r.阶位 || 1;
  form.子类型 = r.装备子类 === '武器' ? weaponTypes[2] : r.装备子类 === '防具' ? '轻装' : '';
  form.数量 = 1;
  form.核心材料 = [];
  store.lastOutcome = null; // 换配方清掉上一次结果，避免误显
  store.syncFromMvu();
  tab.value = 'craft';
}

/** 核心材料多选（v2.1）：一件件勾/取消，开工时整份交给 store 按类别认领到配方的核心需求 */
function toggle核心材料(name: string): void {
  const i = form.核心材料.indexOf(name);
  if (i === -1) form.核心材料.push(name);
  else form.核心材料.splice(i, 1);
}

async function go() {
  if (!form.配方) return;
  await store.doCraft({
    配方: form.配方,
    阶位: form.阶位,
    子类型: form.子类型,
    副属性: form.副属性,
    数量: form.数量,
    核心材料名: [...form.核心材料], // v2.1：多件（store 按类别映射到核心需求）
    越阶材料: form.越阶材料,
    劣质材料: form.劣质材料,
  });
}

onMounted(() => {
  store.syncFromMvu();
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
/* 多行文本（设计要求）：标签在上、控件占满整行，与其它 label 的左右分栏区分开 */
.crf-form label.crf-col { flex-direction: column; align-items: stretch; }
.crf-form textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 12px; resize: vertical; }
/* 核心材料多选（v2.1）：候选可能很多，限高滚动，免得把「开工」按钮挤出屏幕 */
.crf-multi { display: flex; flex-direction: column; gap: 4px; padding: 6px 8px; border: 1px solid rgba(127,127,127,.25); border-radius: 6px; font-size: 12px; max-height: 190px; overflow-y: auto; }
.cm-title { font-weight: 700; opacity: .9; }
.crf-multi input[type='checkbox'] { width: auto; max-width: none; margin: 0; }
.crf-tip { font-size: 11px; opacity: .7; }
.crf-tip.ok { color: #4a9d5f; opacity: 1; }
.crf-tip.bad { color: #e67e22; opacity: 1; }
.crf-dc { font-size: 12px; opacity: .8; }
/* 难度分档配色：必成 / 靠骰运 / 掷满也不够（分档口径见脚本里的 难度提示 注释） */
.crf-dc.ok { color: #4a9d5f; opacity: 1; }
.crf-dc.warn { color: #e67e22; opacity: 1; }
.crf-dc.bad { color: #c0392b; opacity: 1; }
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
/* 丢弃（不可逆）：沿用「删除配方」的警示红，与同组的金色操作区分开 */
.crf-mini-dang { border-color: #c0392b; color: #c0392b; }
.crf-mini:disabled, .crf-mini-dang:disabled, .crf-del:disabled { opacity: .4; cursor: not-allowed; }
.crf-owned { color: #b8860b; }
</style>
