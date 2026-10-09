<template>
  <div class="battle-view">
    <!-- 决斗场石檐横幅：回合数（衬线大字）+ 先攻火把链（站着的点亮、倒下的熄灭） -->
    <div class="battle-header">
      <h3 class="round-title">第 {{ 状态.回合 }} 回合</h3>
      <div class="initiative-chain">
        <span
          v-for="id in 状态.先攻"
          :key="id"
          class="torch"
          :class="{ on: 火把亮(id), enemy: 火把阵营(id) === '敌方' }"
        >
          <span class="flame"></span>{{ 先攻名(id) }}
        </span>
      </div>
      <!-- 逃离：界面逃生口（卡在战斗里时的出路）。要再点一次确认，防误触 -->
      <button class="flee-btn" :disabled="禁用" @click="逃离点击">
        {{ 逃离确认 ? '再点一次确认逃离' : '逃离战斗' }}
      </button>
    </div>

    <!-- 决斗场地面：一维距离轴画成**地砖透视延伸线**，以玩家为原点双向延伸。
         同一距离上的多人不再互相遮挡，而是**上下堆叠**（实战反馈）。 -->
    <div class="arena-floor">
      <div class="distance-bar" :style="{ height: 距离条高度 + 'px' }">
        <!-- 演出层（决斗场美术）：飘字/轨迹/裂纹/光环，复用同一套地砖坐标。
             「战斗演出」关掉 / 系统减弱动效 → 连 DOM 都不渲染（零成本） -->
        <ShowLayer v-if="演出开" :事件="演出事件 ?? []" :坐标="演出坐标" :批次="演出批次 ?? 0" />

        <div class="axis-hint left">◀ 身后（负）</div>
        <div class="axis-hint center" :style="{ left: 原点百分比 + '%' }">玩家原点</div>
        <div class="axis-hint right">身前（正）▶</div>

        <!-- 车道格线：纵轴看得见的横线（玩家反馈：一维地图要加纵轴） -->
        <div
          v-for="i in 车道数"
          :key="'lane' + i"
          class="lane-grid"
          :style="{ bottom: i * 车道高 + 'px' }"
        ></div>

        <div
          v-for="g in 分布组"
          :key="g.左 + '-' + g.车道"
          class="marker-group"
          :style="{ left: g.左 + '%', bottom: g.车道 * 车道高 + 'px' }"
        >
          <div
            v-for="(u, i) in g.单位们"
            :key="u.id"
            class="distance-marker"
            :class="{ ally: u.阵营 === '我方', enemy: u.阵营 === '敌方', self: u.类型 === '玩家', down: u.HP_当前 <= 0 }"
            :title="`${u.id} · ${u.距离}米（${距离带(u.距离)}）`"
          >
            {{ u.名称 }} {{ u.距离 }}m
          </div>
        </div>

        <div v-if="!分组标记.length" class="axis-empty">（战场上没有单位）</div>
      </div>
    </div>

    <!-- 场地（领域）：环境/场地 buff 是真的每回合在作用于半径内的人（2026-10-09），
         所以必须看得见 —— 还剩几回合、中心在哪、里面在干什么（悬停看摘要）。 -->
    <div v-if="场地.length" class="domain-row">
      <span class="domain-label">场地</span>
      <div v-for="d in 场地" :key="d.名" class="domain-card" :title="d.摘要">
        <span class="domain-name">{{ d.名 }}</span>
        <span class="domain-meta">
          半径 {{ d.半径 }} 米 · 中心 {{ d.中心距离 }} 米 · 剩 {{ d.持续 }} 回合
        </span>
      </div>
    </div>

    <!-- 单位卡：每个角色都能展开看全套（状态/buff/装备/技能）—— 实战反馈：战斗界面看不到状态 -->
    <div class="unit-cards">
      <div
        v-for="u in 排序单位"
        :key="u.id"
        class="unit-card war-plate"
        :class="{ enemy: u.阵营 === '敌方', ally: u.阵营 === '我方', down: u.HP_当前 <= 0 }"
      >
        <div class="unit-name">
          {{ u.名称 }}
          <span v-if="u.HP_当前 <= 0" class="unit-down-tag">{{ 倒地标签(u) }}</span>
          <button class="unit-detail-btn" @click="切换角色详情(u.id)">
            {{ 展开角色.includes(u.id) ? '收起 ▴' : '详情 ▾' }}
          </button>
        </div>
        <!-- 血/蓝/铜三条液面：血条是**血色液面**（决斗场军牌），不是一行灰字 -->
        <div class="gauges">
          <div class="gauge gauge-hp" :title="`HP ${u.HP_当前}/${u.HP_最大}`">
            <div class="fill" :style="{ width: 条宽(u.HP_当前, u.HP_最大) }"></div>
          </div>
          <div class="gauge gauge-mp" :title="`MP ${u.MP_当前}/${u.MP_最大}`">
            <div class="fill" :style="{ width: 条宽(u.MP_当前, u.MP_最大) }"></div>
          </div>
          <div class="gauge gauge-sp" :title="`耐力 ${u.耐力_当前}/${u.耐力_最大}`">
            <div class="fill" :style="{ width: 条宽(u.耐力_当前, u.耐力_最大) }"></div>
          </div>
        </div>
        <div class="unit-hp mono">HP {{ u.HP_当前 }}/{{ u.HP_最大 }} · MP {{ u.MP_当前 }}/{{ u.MP_最大 }} · 耐力 {{ u.耐力_当前 }}/{{ u.耐力_最大 }}</div>
        <!-- 防御/闪避/属性 都要展示出来 —— 玩家要看得见面板才打得出决策（实战反馈：这些根本没显示） -->
        <div class="unit-stats">防御 {{ u.防御 }} · 闪避 {{ u.闪避值 }} · {{ u.阶位 }}</div>
        <div class="unit-attrs">STR {{ u.属性.实际.STR }} · AGI {{ u.属性.实际.AGI }} · CON {{ u.属性.实际.CON }} · PER {{ u.属性.实际.PER }}</div>
        <div class="unit-dist">{{ u.距离 }}米（{{ 距离带(u.距离) }}）· 额度 {{ u.额度 }}</div>
        <div class="unit-slots">主{{ u.行动槽.主要 }} 次{{ u.行动槽.次要 }} 移{{ u.行动槽.移动 }} 反{{ u.行动槽.反应 }}</div>
        <div v-if="u.状态.length" class="unit-status">状态: {{ u.状态.map(st => st.名 + (st.层数 ? `×${st.层数}` : '')).join('，') }}</div>
        <div v-if="u.护盾 > 0" class="unit-shield">护盾: {{ u.护盾 }}</div>
        <div v-if="冷却中(u)" class="unit-cd">冷却中: {{ 冷却中(u) }}</div>

        <!-- 完整详情 -->
        <div v-if="展开角色.includes(u.id)" class="unit-detail">
          <div class="ud-block">
            <div class="ud-title">武器装备</div>
            <div class="ud-line">主武器：{{ 武器文案(u.主武器) }}</div>
            <div class="ud-line">副武器：{{ 武器文案(u.副武器) }}</div>
            <div v-for="e in u.装备 ?? []" :key="e.槽 + e.名称" class="ud-line dim2">
              {{ e.槽 }}：{{ e.名称 }}<span v-if="e.摘要">（{{ e.摘要 }}）</span>
            </div>
          </div>

          <div class="ud-block">
            <div class="ud-title">状态与增益（{{ u.状态.length }}）</div>
            <div v-for="st in u.状态" :key="st.名" class="ud-line">
              {{ st.名 }}{{ st.层数 ? ` ×${st.层数}` : '' }}（剩 {{ st.持续 }} 回合）
              <span v-if="数值修正文案(st)">｜{{ 数值修正文案(st) }}</span>
              <span v-if="st.词条 && st.词条.length" class="dim2">｜词条 {{ st.词条.join('、') }}</span>
            </div>
            <div v-if="!u.状态.length" class="ud-line dim2">（无状态）</div>
            <div v-if="u.词条 && [...u.词条].length" class="ud-line">词条：{{ [...u.词条].join('、') }}</div>
            <div v-if="u.护盾 > 0" class="ud-line">护盾：{{ u.护盾 }}</div>
          </div>

          <div class="ud-block">
            <div class="ud-title">技能 / 装备效果（{{ 技能条目(u).length }}）</div>
            <div class="detail-table">
              <div class="dt-row dt-head">
                <span>名称</span><span>行动</span><span>射程</span><span>目标</span><span>消耗</span><span>冷却</span><span>倍率</span><span>规则</span>
              </div>
              <!-- 同源的几招（一个卡面条目拆出来的）挨着排，并在组首插一条标题 ——
                   玩家口径：「这个技能，两个效果…效果内部又分为好几个效果，玩家想要释放具体的效果该怎么用」 -->
              <template v-for="d in 技能条目(u)" :key="d.名">
                <div v-if="d.组首 && d.同源条数 > 1" class="dt-group">
                  同源：{{ d.母条目 }}（拆出 {{ d.同源条数 }} 招，各自独立可用）
                </div>
                <div class="dt-row">
                  <span class="dt-name" :title="d.名">{{ d.名 }}</span>
                  <span>{{ d.行动类型 }}</span>
                  <span>{{ d.射程 || '—' }}</span>
                  <span>{{ d.目标 || '—' }}</span>
                  <span>{{ d.消耗 || '—' }}</span>
                  <span>{{ d.冷却 ?? '—' }}</span>
                  <span>{{ d.倍率 }}</span>
                  <span>{{ d.规则数 ? d.规则数 + ' 条' : '—' }}</span>
                </div>
              </template>
              <div v-if="!技能条目(u).length" class="dt-empty">（没有已翻译的效果 —— 只能用基础武器攻击）</div>
            </div>
          </div>

          <!-- 效果详情：把每条规则翻成人话。玩家反馈「点技能完全不知道有什么用，
               比如一个二阶段变身技能，完全不知道能干什么」——这里就是答案。 -->
          <div class="ud-block">
            <div class="ud-title">效果详情</div>
            <div v-for="d in 技能条目(u)" :key="'eff-' + d.名" class="ud-eff">
              <div class="ud-eff-head">
                {{ d.名 }}<span class="dim2"> · {{ d.预览.头部.join(' · ') }}</span>
              </div>
              <div v-for="(行, i) in d.预览.行" :key="i" class="ud-line dim2">{{ 行 }}</div>
            </div>
            <div v-if="!技能条目(u).length" class="ud-line dim2">（无）</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 行动区：每个我方单位各自填槽 → 「执行本轮」 -->
    <div class="action-zone">
      <!-- 进度：生成敌方意图是一次几十秒的 AI 调用。没有这个，玩家看到的是一个灰按钮 +
           空白意图区，会以为界面坏了（和之前「点开战没反应」同一类） -->
      <div v-if="进度" class="progress" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <span>{{ 进度 }}</span>
      </div>

      <!-- 敌方意图（阶段 ③ 预公开）；未开战/无意图时不渲染 -->
      <div v-if="敌方意图?.length" class="intent-block">
        <div class="intent-title">敌方意图</div>
        <div v-for="(yi, i) in 敌方意图" :key="i" class="intent-row">
          <span class="intent-unit">{{ yi.单位 }}</span>
          <span class="intent-acts">{{ yi.行动.map(a => a.类型 + (a.技能 ? `（${a.技能}）` : '（基础攻击）')).join(' → ') }}</span>
        </div>
      </div>

      <!-- 我方每个单位一块（实战反馈：以前只能操作契约者，队友完全没法指挥） -->
      <div v-for="u in 我方单位" :key="u.键" class="unit-action">
        <div class="ua-head">
          <span class="ua-name">{{ u.名称 }}</span>
          <span class="ua-meta">
            HP {{ u.HP_当前 }}/{{ u.HP_最大 }} · 距 {{ u.距离 }}米 · 额度 {{ u.额度 }} · 槽 主{{ u.行动槽.主要 }} 次{{ u.行动槽.次要 }} 移{{ u.行动槽.移动 }}
          </span>
        </div>

        <div class="slot-row">
          <!-- 按**行动类型**匹配：主要行动只列主要行动技能 + 主武器攻击；次要行动同理（副武器攻击）。
               每个行动**各自带一个目标**（玩家口径：现在是所有行动都是一个目标）——
               不选就落回这个单位的「默认目标」。 -->
          <label class="slot">
            <span class="slot-label">主要</span>
            <select v-model="填写表[u.键].主要.值">
              <option value="">（不出手）</option>
              <option v-for="o in 主要选项(u)" :key="o.值" :value="o.值">{{ o.标签 }}</option>
            </select>
          </label>
          <label class="slot slot-target">
            <span class="slot-label">打谁</span>
            <select v-model="填写表[u.键].主要.目标">
              <option value="">（用默认目标）</option>
              <template v-for="g in 目标分组(u)" :key="g.组">
                <optgroup :label="g.组">
                  <option v-for="e in g.项" :key="e.键" :value="e.键">{{ e.显示 }}</option>
                </optgroup>
              </template>
            </select>
          </label>
          <label v-if="需选技能(u, 填写表[u.键].主要.值)" class="slot slot-target">
            <span class="slot-label">选哪个技能</span>
            <select v-model="填写表[u.键].主要.选择技能">
              <option value="">（先选一个）</option>
              <option v-for="c in 技能候选(u)" :key="c.值" :value="c.值">{{ c.标签 }}</option>
            </select>
          </label>
          <label class="slot">
            <span class="slot-label">次要</span>
            <select v-model="填写表[u.键].次要.值">
              <option value="">（不出手）</option>
              <option v-for="o in 次要选项(u)" :key="o.值" :value="o.值">{{ o.标签 }}</option>
            </select>
          </label>
          <label v-if="需选技能(u, 填写表[u.键].次要.值)" class="slot slot-target">
            <span class="slot-label">选哪个技能</span>
            <select v-model="填写表[u.键].次要.选择技能">
              <option value="">（先选一个）</option>
              <option v-for="c in 技能候选(u)" :key="c.值" :value="c.值">{{ c.标签 }}</option>
            </select>
          </label>
          <label class="slot slot-target">
            <span class="slot-label">对谁</span>
            <select v-model="填写表[u.键].次要.目标">
              <option value="">（用默认目标）</option>
              <template v-for="g in 目标分组(u)" :key="g.组">
                <optgroup :label="g.组">
                  <option v-for="e in g.项" :key="e.键" :value="e.键">{{ e.显示 }}</option>
                </optgroup>
              </template>
            </select>
          </label>
          <label class="slot">
            <span class="slot-label">移动（目标距离·米，可为负）</span>
            <!-- 不设 min：目标距离可以是负数（向后移动 / 撤到玩家身后）；0 或当前位置 = 原地不动，不扣槽 -->
            <input type="number" step="1" placeholder="负数=向后" v-model.number="填写表[u.键].移动" />
          </label>
          <label class="slot">
            <span class="slot-label">反应（预置）</span>
            <select v-model="填写表[u.键].反应">
              <option value="">不预置</option>
              <!-- 反应动作**只列自己学过的**（行动类型 = 反应动作的技能）——
                   以前这里是硬编码的六个名字（击溃/识破/招架/闪避/格挡/闪烁），
                   没学过也能选，选了也没有任何结算。玩家反馈：取消预设，必须自己学。 -->
              <option v-for="o in 反应选项(u)" :key="o.值" :value="o.值">{{ o.标签 }}</option>
            </select>
          </label>
          <label class="slot">
            <span class="slot-label">默认目标</span>
            <select v-model="目标表[u.键]">
              <option value="">（选择目标）</option>
              <template v-for="g in 目标分组(u)" :key="g.组">
                <optgroup :label="g.组">
                  <option v-for="e in g.项" :key="e.键" :value="e.键">{{ e.显示 }}</option>
                </optgroup>
              </template>
            </select>
          </label>
        </div>

        <!-- 免费行动：**不限次数**，想放几个放几个（世界书：免费行动不占次数）。
             每条**自带目标** —— 以前是一组复选框，根本没有目标这一栏（玩家口径）。 -->
        <div class="free-row">
          <span class="slot-label">免费行动（不限次）</span>
          <div v-for="(f, i) in 填写表[u.键].免费" :key="i" class="free-line">
            <select v-model="f.值">
              <option value="">（选择免费行动）</option>
              <option v-for="o in 免费选项(u)" :key="o.值" :value="o.值">{{ o.标签 }}</option>
            </select>
            <select v-if="需选技能(u, f.值)" v-model="f.选择技能">
              <option value="">（选哪个技能）</option>
              <option v-for="c in 技能候选(u)" :key="c.值" :value="c.值">{{ c.标签 }}</option>
            </select>
            <select v-model="f.目标">
              <option value="">（用默认目标）</option>
              <template v-for="g in 目标分组(u)" :key="g.组">
                <optgroup :label="g.组">
                  <option v-for="e in g.项" :key="e.键" :value="e.键">{{ e.显示 }}</option>
                </optgroup>
              </template>
            </select>
            <button class="ord-btn" title="删掉这条" @click="删免费(u, i)">✕</button>
          </div>
          <button class="add-free" @click="加免费(u)">＋ 添加免费行动</button>
          <span v-if="!免费选项(u).length" class="dim">（该单位没有免费行动）</span>
        </div>

        <!-- 本回合**行动顺序**：玩家反馈「我次要行动和免费行动都是上 buff，
             那总不能等我主要行动的大招放完了再上个寂寞吧？」→ 选完自己排。 -->
        <div v-if="行动条目(u).length > 1" class="order-row">
          <span class="slot-label">行动顺序（↑↓ 调）</span>
          <span v-for="(a, i) in 行动条目(u)" :key="a.键" class="order-item">
            <button class="ord-btn" :disabled="i === 0" title="上移" @click="调序(u, i, -1)">↑</button>
            <span class="ord-name">{{ a.显示 }}</span>
            <button class="ord-btn" :disabled="i === 行动条目(u).length - 1" title="下移" @click="调序(u, i, 1)">↓</button>
          </span>
        </div>

        <!-- 选中项的效果预览：玩家反馈「各个行动的选项，不知道详细效果，
             没办法直观地看出来」。选了什么，下面就摆出它到底干什么。 -->
        <div v-if="选中预览(u).length" class="preview-block">
          <div v-for="p in 选中预览(u)" :key="p.槽 + p.名" class="pv-item">
            <div class="pv-head">
              <span class="pv-slot">{{ p.槽 }}</span>
              <span class="pv-name">{{ p.名 }}</span>
              <span v-if="p.目标" class="pv-target">→ {{ 目标名(p.目标) }}</span>
              <span class="pv-meta">{{ p.预览.头部.join(' · ') }}</span>
            </div>
            <div v-for="(行, i) in p.预览.行" :key="i" class="pv-line">{{ 行 }}</div>
          </div>
        </div>
      </div>

      <div class="action-submit">
        <button class="execute-btn" :disabled="!可提交本轮 || 禁用" @click="执行本轮">
          {{ 追加模式 ? '提交追加行动' : '执行本轮' }}
        </button>
        <!-- 放弃追加：玩家不想要的额外回合不能被强制行动（代码评审 Minor #8） -->
        <button v-if="追加模式" class="ghost-btn" :disabled="禁用" @click="emit('放弃追加')">
          放弃追加回合
        </button>
        <span class="dim">
          {{
            追加模式
              ? '这是该单位的额外行动回合（槽位已重置为一整套）—— 指定行动后继续走完本轮剩下的先攻'
              : '至少给一个单位下达行动（没下命令的单位本回合不出手）'
          }}
        </span>
      </div>
    </div>

    <!-- 结算日志 -->
    <div class="battle-log">
      <div v-for="(s, i) in 日志" :key="i" class="log-entry">{{ s }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { 距离带 } from '../engine/distance';
import { 可提交, 构造行动声明, type 行动槽填写 } from '../engine/actionInput';
import { 造我方条目, 造技能展示, 造场地条目, 布局分布, 选中行动预览, 显示名, type 我方条目 } from '../engine/viewModel';
import { 需要选技能, 技能候选 } from '../engine/actionOptions';
import { 列行动选项 } from '../engine/actionOptions';
import ShowLayer from './ShowLayer.vue';
import { 演出开启 } from '../engine/showToggle';
import type { 演出事件 } from '../engine/showEvents';
import type { 敌方意图 } from '../ai/enemyTactics';
import type { 战斗状态 } from '../types';

const props = defineProps<{
  状态: 战斗状态;
  日志: string[];
  /** 敌方意图（阶段 ③ 预公开）；未开战时为空数组 */
  敌方意图?: 敌方意图[];
  /** 上层忙碌（回合编排 / 本轮结算中）→ 禁用「执行本轮」，挡异步重入 */
  禁用?: boolean;
  /** 正在忙什么（如「正在生成敌方意图（第 3 回合）…」）—— 非空时显示转圈圈 */
  进度?: string;
  /** 追加行动回合模式：只给某个单位指定行动，按钮文案与提示随之变化 */
  追加模式?: boolean;
  /** 本轮结算产生的演出事件（决斗场美术：飘字/轨迹/变身…，由 CombatView 从结算步骤提取） */
  演出事件?: 演出事件[];
  /** 演出批次号：每批 +1，ShowLayer 用它当 key 前缀整批重建节点（动画重播） */
  演出批次?: number;
}>();

const emit = defineEmits<{
  /** 每个我方单位各自的填写 + 目标；键 = 状态.单位 的键（短名） */
  (e: '执行本轮', 各单位: Record<string, { 填写: 行动槽填写; 目标: string }>): void;
  (e: '逃离战斗'): void;
  /** 追加模式下「放弃追加回合」—— 交一段空行动，继续走完剩下的先攻 */
  (e: '放弃追加'): void;
}>();

/** 逃离按钮：第一次点只是亮出确认，第二次才真正逃离（界面逃生口，防误触） */
const 逃离确认 = ref(false);
let 逃离计时: ReturnType<typeof setTimeout> | undefined;
function 逃离点击() {
  if (!逃离确认.value) {
    逃离确认.value = true;
    clearTimeout(逃离计时);
    逃离计时 = setTimeout(() => (逃离确认.value = false), 3000);
    return;
  }
  逃离确认.value = false;
  emit('逃离战斗');
}

// 距玩家排序（0 在前）—— 用变量里的姓名（头部.姓名）；老存档没有名称字段时退回 id 末段
const 排序单位 = computed(() =>
  Object.values(props.状态.单位)
    .map(u => ({ ...u, 名称: 显示名(u) }))
    .sort((a, b) => a.距离 - b.距离),
);

/**
 * 距离轴的两端。
 * **玩家是原点**（距离 0），负数是身后、正数是身前 —— 所以轴是双向的，
 * 不能像以前那样把玩家放在最左端、只往右延伸（实战反馈：开场看不到"负距离"这一侧）。
 * 两端各留一点余量，免得贴边的标记被裁掉。
 */
const 距离范围 = computed(() => {
  const 距离们 = 排序单位.value.map(u => u.距离 ?? 0);
  const 最远 = Math.max(10, ...距离们.map(Math.abs));
  return { 最小: Math.min(-10, ...距离们), 最大: Math.max(10, ...距离们), 绝对值: 最远 };
});

/** 米 → 横向百分比（玩家原点落在中间某处，而不是最左端） */
function 距离百分比(d: number): number {
  const { 最小, 最大 } = 距离范围.value;
  const 跨度 = Math.max(最大 - 最小, 1);
  return Math.min(100, Math.max(0, ((d - 最小) / 跨度) * 100));
}

/** 玩家原点（0 米）在条上的横向位置 */
const 原点百分比 = computed(() => 距离百分比(0));

/** 同一个距离上的单位**上下堆叠**（以前会完全重叠、互相遮挡） */
const 分组标记 = computed(() => {
  const 按距离 = new Map<number, typeof 排序单位.value>();
  for (const u of 排序单位.value) {
    const 距离 = u.距离 ?? 0;
    按距离.set(距离, [...(按距离.get(距离) ?? []), u]);
  }
  return [...按距离.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([距离, 单位们]) => ({ 距离, 左: 距离百分比(距离), 单位们 }));
});

/** 演出层用的坐标系：地砖横向百分比（与距离轴完全同一套）。
 *  **按状态.单位的键建**（一波两只「骨卫兵」时按显示名建会互相覆盖、锚错棋子，
 *  最终评审实锤）；显示名也写一份做回退（演出事件里两样都带）。 */
const 演出坐标 = computed<Record<string, number>>(() => {
  const 出: Record<string, number> = {};
  for (const g of 分组标记.value) {
    for (const u of g.单位们) {
      const 键 = Object.entries(props.状态.单位).find(([, x]) => x.id === u.id)?.[0];
      if (键) 出[键] = g.左;
      出[显示名(u)] = g.左;
    }
  }
  return 出;
});

/** 演出该不该渲染：设置「战斗演出」开 + 系统没要求减弱动效（engine/showToggle） */
const 演出开 = computed(演出开启);

/**
 * **纵轴布局**（玩家反馈：「一维地图增加一个向上的纵轴，就不会所有角色都挤在一起了」）。
 * 相邻组的横向间距小于棋子宽度 → 后者错开一条车道；同距离的多人仍在同一车道内按层叠。
 * 布局算法在 `engine/viewModel.布局分布`（纯函数、有测试钉死）。
 */
const 车道高 = 26; // 两条车道之间的纵向距离（px）
const 层高 = 20; // 同一车道内、同一距离上下两人的间距（px）

interface 分布组信息 {
  左: number;
  车道: number;
  单位们: typeof 排序单位.value;
}

const 分布组 = computed<分布组信息[]>(() => {
  const 布局 = 布局分布(
    排序单位.value.map(u => ({ 键: u.id, id: u.id, 距离: u.距离 ?? 0 })),
    距离百分比,
  );
  const 单位表 = new Map(排序单位.value.map(u => [u.id, u]));
  const 组 = new Map<string, 分布组信息>();
  for (const p of 布局.点) {
    const 键 = `${p.左}-${p.车道}`;
    const g = 组.get(键) ?? { 左: p.左, 车道: p.车道, 单位们: [] as typeof 排序单位.value };
    const 单位 = 单位表.get(p.id);
    if (单位) g.单位们.push(单位);
    组.set(键, g);
  }
  return [...组.values()].sort((a, b) => a.车道 - b.车道 || a.左 - b.左);
});

const 车道数 = computed(() => Math.max(1, ...分布组.value.map(g => g.车道 + 1)));

/** 纵轴加进来后，高度按「车道 × 车道高 + 最多层 × 层高」算 */
const 距离条高度 = computed(() => {
  const 最大层数 = Math.max(1, ...分布组.value.map(g => g.单位们.length));
  return Math.max(46, 20 + 车道数.value * 车道高 + (最大层数 - 1) * 层高);
});

// ==================== 我方行动区 ====================

// 条目的形状在 engine/viewModel（有测试钉死）—— **条目继承 战斗单位**，
// 所以模板里直接写 u.HP_当前 / u.行动槽.主要 就行，不要写 u.单位.xxx
// （写错这一层会在运行时抛错、把整个组件渲染成一片空白，实战踩过）。
const 我方单位 = computed<我方条目[]>(() => 造我方条目(props.状态.单位));

/** 场地（领域）面板的数据 —— 形状在 viewModel 里被测试钉死，模板只消费 */
const 场地 = computed(() => 造场地条目(props.状态.领域));

/**
 * 界面上的**一条行动填写**：下拉值 + **它自己的目标**（玩家口径 2026-10-09：
 * 「应该每个行动都增加可选目标吧，现在是所有行动都是一个目标」）。
 */
interface 界面条目 {
  值: string;
  目标: string;
  /** 本次释放**选中的技能**（`需要选技能` 的技能才有：规则里写了"选中技能"） */
  选择技能: string;
}

/** 界面上的单位填写：主要/次要**各自**带目标，免费行动是"添加一条"的列表 */
interface 界面填写 {
  主要: 界面条目;
  次要: 界面条目;
  移动?: number;
  反应: string;
  免费: 界面条目[];
}

const 空条目 = (): 界面条目 => ({ 值: '', 目标: '', 选择技能: '' });
const 空填写 = (): 界面填写 => ({ 主要: 空条目(), 次要: 空条目(), 反应: '', 免费: [] });

/** 每个我方单位各自的槽位填写；键 = 状态.单位 的键 */
const 填写表 = reactive<Record<string, 界面填写>>({});
/** 每个单位的**默认目标**：行动没自己选目标时用它（只有一种敌人时自动选中，省一步） */
const 目标表 = reactive<Record<string, string>>({});
/** 玩家调过的行动顺序（键 → 有序键列表）；没调过的单位不在这里，用默认顺序 */
const 顺序表 = reactive<Record<string, string[]>>({});

/**
 * 界面填写 → 引擎填写：空槽丢掉、**每条自带目标**；没写目标的落回这个单位的默认目标。
 * 引擎那边两种形状都认（`行动槽填写`），所以这里只做"补默认目标"这一件事。
 */
function 转引擎填写(填: 界面填写, 默认目标: string): 行动槽填写 {
  const 出: 行动槽填写 = { 反应: 填.反应, 移动: 填.移动, 目标: 默认目标 };
  const 收 = (条: 界面条目) => ({
    值: 条.值,
    目标: 条.目标,
    ...(条.选择技能 ? { 选择技能: 条.选择技能 } : {}),
  });
  if (填.主要.值.trim()) 出.主要 = 收(填.主要);
  if (填.次要.值.trim()) 出.次要 = 收(填.次要);
  const 免费 = 填.免费.filter(f => f.值.trim());
  if (免费.length) 出.免费 = 免费.map(收);
  return 出;
}

/** 我方的引擎填写（读界面填写 + 这个单位的默认目标） */
function 引擎填写(u: 我方条目): 行动槽填写 {
  return 转引擎填写(填写表[u.键] ?? 空填写(), 目标表[u.键] ?? '');
}

// 单位增删时补齐/清理填写表（Vue 3 的 reactive 对象新增键也是响应式的）
watch(
  我方单位,
  列表 => {
    const 在场上 = new Set(列表.map(x => x.键));
    for (const x of 列表) {
      if (!填写表[x.键]) 填写表[x.键] = 空填写();
      if (目标表[x.键] === undefined) 目标表[x.键] = '';
    }
    for (const 键 of Object.keys(填写表)) if (!在场上.has(键)) delete 填写表[键];
    for (const 键 of Object.keys(目标表)) if (!在场上.has(键)) delete 目标表[键];
  },
  { immediate: true, deep: false },
);

/** 敌方单位（可攻击目标） */
const 敌方单位 = computed(() =>
  Object.entries(props.状态.单位)
    .filter(([, u]) => u.阵营 === '敌方' && u.HP_当前 > 0)
    .map(([键, u]) => ({ 键, 显示: `${显示名(u)}（HP ${u.HP_当前}/${u.HP_最大} · 距 ${u.距离}米 · 防 ${u.防御} 闪 ${u.闪避值}）` })),
);

/** 支援目标（我方，含自己 —— 上 buff / 治疗都走支援行动） */
function 支援目标(自己: 我方条目) {
  return 我方单位.value
    .filter(x => x.HP_当前 > 0)
    .map(x => ({
      键: x.键,
      显示: `${x.id === 自己.id ? '自己：' : ''}${x.名称}（HP ${x.HP_当前}/${x.HP_最大}）`,
    }));
}

// 只有一个敌人时自动选中它（省一步）；目标失效则重置
watch(
  敌方单位,
  列表 => {
    const 唯一 = 列表.length === 1 ? 列表[0].键 : '';
    for (const x of 我方单位.value) {
      const 现有 = 目标表[x.键];
      const 有效 = 现有 && (列表.some(e => e.键 === 现有) || 我方单位.value.some(a => a.键 === 现有));
      if (!有效) 目标表[x.键] = 唯一;
    }
  },
  { immediate: true },
);

/**
 * 反应动作可选项：**只列该单位学过的、行动类型为「反应动作」的技能**。
 * 玩家口径：「反应动作不应该是有预设的那些反应动作，必须是技能的类型是反应动作才算上。
 * 取消预设的反应动作，必须要自己学。」→ 没学过就是空的（下拉里只剩"不预置"）。
 */
function 反应选项(u: 我方条目) {
  return 列行动选项(u, '反应动作');
}

/** 展开详情的单位 id（详情在**单位卡**上，能一次看全状态/装备/技能） */
const 展开角色 = ref<string[]>([]);
function 切换角色详情(id: string) {
  展开角色.value = 展开角色.value.includes(id)
    ? 展开角色.value.filter(k => k !== id)
    : [...展开角色.value, id];
}

/** 倒地标签：HP ≤ 0 时说明是濒死检定中 / 已稳定昏迷 / 已死亡（世界书三个阶段） */
function 倒地标签(u: 战斗单位): string {
  if (u.HP_当前 > 0) return '';
  const 失败 = u.濒死?.失败 ?? 0;
  if (失败 >= 3) return '已死亡';
  if (!u.濒死) return '已稳定（昏迷）';
  return `濒死（${u.濒死.成功}/2 成功，${失败}/3 失败）`;
}

/** 武器一句话（没有就是徒手） */
function 武器文案(w: 战斗单位['主武器']): string {
  if (!w) return '无（徒手 1d4 · ×0.5）';
  return `${w.伤害骰} · ×${w.倍率}${w.强化等级 ? ` · 强化+${w.强化等级}` : ''}`;
}

/** 状态携带的数值修正（支援 buff / 破甲这类落成状态的效果） */
function 数值修正文案(st: { 数值修正?: Record<string, number> }): string {
  const 条 = Object.entries(st.数值修正 ?? {});
  if (!条.length) return '';
  return 条.map(([k, v]) => `${k}${v >= 0 ? '+' : ''}${v}`).join('、');
}

/** 液面条宽度（0~100%，上限/当前都是脏数据时给 0） */
function 条宽(当前: number, 上限: number): string {
  if (!Number.isFinite(当前) || !Number.isFinite(上限) || 上限 <= 0) return '0%';
  return `${Math.max(0, Math.min(100, Math.round((当前 / 上限) * 100)))}%`;
}

/** 先攻火把链：id → 显示名（先攻里是单位 id，单位表的键是短名，按 id 找） */
function 先攻单位(id: string) {
  return Object.values(props.状态.单位).find(u => u.id === id);
}
function 先攻名(id: string): string {
  const u = 先攻单位(id);
  return u ? 显示名(u) : id;
}
/** 火把亮 = 还站着（HP > 0）；倒下（濒死/倒地）熄灭 */
function 火把亮(id: string): boolean {
  return (先攻单位(id)?.HP_当前 ?? 0) > 0;
}
function 火把阵营(id: string): string {
  return 先攻单位(id)?.阵营 ?? '';
}

/** 还在冷却里的技能（空串 = 没有，模板里 v-if 直接可用） */
function 冷却中(u: 战斗单位): string {
  return Object.entries(u.冷却 ?? {})
    .filter(([, 剩余]) => 剩余 > 0)
    .map(([名, 剩余]) => `${名}(${剩余})`)
    .join('、');
}

/**
 * 该单位在某个行动类型下能做什么 —— 技能按**行动消耗**归类，外加该类型的基础武器攻击。
 * 不能主动释放的（被动/光环/行动消耗「无」的装备与天赋）不会出现在这里，
 * 它们的数值效果由引擎的 `常驻修正` 直接算（玩家反馈：防具不该算行动）。
 */
function 主要选项(u: 我方条目) {
  return 列行动选项(u, '主要行动');
}
function 次要选项(u: 我方条目) {
  return 列行动选项(u, '次要行动');
}
/** 免费行动：不限次数，界面上是多选（勾几个放几个） */
function 免费选项(u: 我方条目) {
  return 列行动选项(u, '免费行动');
}

/** 技能/装备的展示条目（形状在 engine/viewModel，有测试钉死） */
function 技能条目(条目: 我方条目) {
  return 造技能展示(条目.技能);
}

/**
 * 该单位**已经选中**的行动的效果预览（主要/次要下拉 + 免费条目）。
 * 形状与逻辑在 `engine/viewModel.选中行动预览`（纯函数、有测试钉死）。
 */
function 选中预览(u: 我方条目) {
  return 选中行动预览(u, 引擎填写(u));
}

/**
 * 该单位本回合已选的行动条目（有序）。**直接吃引擎的 `构造行动声明`**——
 * "按序排 + 漏掉排最后"的合并逻辑只有引擎里那一份，界面不复刻（复刻会随引擎改动走偏，
 * 代码评审 Minor #13 点过这个隐患）。
 */
function 行动条目(u: 我方条目) {
  return 构造行动声明({ ...引擎填写(u), 行动顺序: 顺序表[u.键] }, '').条目;
}

/** ↑↓ 调序：把当前顺序固化进 顺序表（换位置只是换数组里两个元素） */
function 调序(u: 我方条目, i: number, 方向: -1 | 1) {
  const 列表 = 行动条目(u).map(x => x.键);
  const j = i + 方向;
  if (j < 0 || j >= 列表.length) return;
  [列表[i], 列表[j]] = [列表[j], 列表[i]];
  顺序表[u.键] = 列表;
}

/** 免费行动：**不限次数**，界面上是"添加一条"（每条自带目标，在行动顺序里可 ↑↓） */
function 加免费(u: 我方条目) {
  填写表[u.键]?.免费.push(空条目());
}
function 删免费(u: 我方条目, i: number) {
  填写表[u.键]?.免费.splice(i, 1);
}

/** 目标下拉的分组（敌方=攻击 / 我方=支援）—— 默认目标与每个行动的目标共用一个列表 */
function 目标分组(u: 我方条目) {
  return [
    { 组: '敌方（攻击）', 项: 敌方单位.value },
    { 组: '我方（支援：上 buff / 治疗 / 护盾）', 项: 支援目标(u) },
  ];
}

/** 目标键 → 显示名（预览里写"这条打谁"用；键认不出来就原样显示） */
function 目标名(键: string): string {
  const u = props.状态.单位[键];
  return u ? 显示名(u) : 键;
}

/**
 * 这条技能**要不要玩家再选一个「目标技能」**（连携：「取消某个可选技能的冷却」）。
 * 判据读的是规则本身（`engine/actionOptions.需要选技能`）—— 老缓存里的翻译也自动认。
 */
function 需选技能(u: 我方条目, 值: string): boolean {
  return !!值 && 需要选技能(u.技能?.[值]);
}

/**
 * 能不能点「执行本轮」：至少要有一个单位真的出手（只预置反应不算）。
 * 我方全员倒地时不会走到这里 —— CombatView 会直接把濒死检定算到底并结束战斗
 * （不再空转回合、也不再调 AI）。
 */
const 可提交本轮 = computed(() => 我方单位.value.some(x => 可提交(引擎填写(x))));

/**
 * 「执行本轮」：交出**每个单位各自的**填写与目标。
 * 不在这里清空槽位：清空要等上层真的收下了（否则结算失败时玩家的填写会凭空消失）。
 */
function 执行本轮(): void {
  if (!可提交本轮.value) return;
  const 各单位: Record<string, { 填写: 行动槽填写; 目标: string }> = {};
  for (const x of 我方单位.value) {
    // 带上玩家排好的**行动顺序**（没调过就是默认顺序，引擎自己会兜底）
    各单位[x.键] = {
      填写: { ...引擎填写(x), 行动顺序: 行动条目(x).map(a => a.键) },
      目标: 目标表[x.键] ?? '',
    };
  }
  emit('执行本轮', 各单位);
}

/** 上层结算完通知清空（避免下一回合误带上一轮的选择） */
function 清空填写() {
  for (const 键 of Object.keys(填写表)) 填写表[键] = 空填写();
  for (const 键 of Object.keys(顺序表)) delete 顺序表[键]; // 顺序也一起清（下一回合重排）
}
defineExpose({ 清空填写 });
</script>

<style scoped lang="scss">
@use '../theme.scss' as t;

.battle-view {
  color: var(--cb-chalk-dim);
  font-family: var(--cb-font-body);
}

/* ============ 决斗场石檐横幅：回合数 + 先攻火把链 ============ */
.battle-header {
  position: relative;
  margin-bottom: 12px;
  padding: 10px 14px 8px;
  background: linear-gradient(180deg, #050302 0%, #0a0705 60%, #120c08 100%);
  border: 1px solid var(--cb-border-soft);
  border-radius: 6px;
  box-shadow: 0 1px 0 rgba(100, 60, 30, 0.25);
}

.round-title {
  margin: 0 0 6px;
  color: var(--cb-amber);
  font-family: var(--cb-font-display);
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 4px;
  text-shadow: 0 0 10px rgba(232, 192, 120, 0.3);
}

/* 先攻火把链：站着的点亮（火焰摇曳），倒下的熄灭 */
.initiative-chain {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-right: 96px;
}

.torch {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--cb-dim);

  .flame {
    width: 8px;
    height: 8px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    background: radial-gradient(circle at 60% 40%, var(--cb-ember), rgba(138, 32, 32, 0.8));
    box-shadow: 0 0 8px rgba(216, 145, 74, 0.7);
    animation: cbTorchFlick 5s ease-in-out infinite;
  }

  &.on {
    color: var(--cb-chalk);
  }

  &.on.enemy .flame {
    background: radial-gradient(circle at 60% 40%, var(--cb-blood-wet), rgba(74, 16, 16, 0.9));
    box-shadow: 0 0 8px rgba(208, 80, 64, 0.7);
  }

  &:not(.on) .flame {
    background: var(--cb-border);
    box-shadow: none;
    animation: none;
  }
}

.flee-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  padding: 5px 12px;
  background: rgba(74, 16, 16, 0.35);
  border: 1px solid var(--cb-blood-wet);
  border-radius: 6px;
  color: var(--cb-blood-wet);
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background: rgba(74, 16, 16, 0.6);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

/* ============ 决斗场地面：地砖透视延伸线 ============ */
.arena-floor {
  position: relative;
  margin: 14px 0 20px;
  padding: 4px 0 0;
  /* 地砖：双向渐变的格线（以玩家原点为中心向两侧透视延伸的错觉） */
  background:
    repeating-linear-gradient(90deg, transparent 0 46px, rgba(74, 50, 38, 0.35) 46px 47px),
    linear-gradient(180deg, rgba(36, 24, 18, 0.6), rgba(18, 11, 7, 0.9));
  border: 1px solid var(--cb-border-soft);
  border-radius: 6px;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 120%, rgba(74, 16, 16, 0.25) 0%, transparent 60%);
    animation: cbBloodBreathe 6s ease-in-out infinite;
    pointer-events: none;
  }
}

.distance-bar {
  position: relative;
  height: 46px; /* 由 距离条高度 动态覆盖（同一距离人多时变高） */
  margin: 8px 10px 14px;
  border-bottom: 2px solid var(--cb-border);
}

.axis-hint {
  position: absolute;
  bottom: 2px;
  font-size: 10px;
  color: var(--cb-dim);
  pointer-events: none;

  &.left {
    left: 0;
  }
  &.center {
    transform: translateX(-50%);
    color: var(--cb-copper);
  }
  &.right {
    right: 0;
  }
}

.axis-empty {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: var(--cb-dim);
}

/* 场地（领域）：环境/场地 buff 每回合真的在作用于半径内的人，所以要看得见 */
.domain-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 0;
}

.domain-label {
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--cb-dim);
}

.domain-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 12px;
  border: 1px solid var(--cb-line);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(120, 90, 200, 0.16), rgba(0, 0, 0, 0));
  cursor: help;
}

.domain-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--cb-gold);
}

.domain-meta {
  font-size: 11px;
  color: var(--cb-dim);
}

/* 车道格线：纵轴的横线（决斗场地面上的"层"） */
.lane-grid {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed rgba(74, 50, 38, 0.45);
  pointer-events: none;
}

/* 同一距离的一组：整个组在横向定位（+ 纵向车道抬升）。
 * 组内用 **column-reverse** 排列：第一个人**贴着轴线**（x 坐标 = 距离），
 * 其余的人在他上方依次排开 —— 同 x 不重叠（玩家反馈：名字全部叠在一起）。
 * （不要再给棋子加按索引的 bottom 位移：flex 已经排开了，位移会让全部落回同一点。） */
.marker-group {
  position: absolute;
  bottom: 6px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
}

/* 棋子铭牌（决斗场上的角色标记） */
.distance-marker {
  position: relative;
  padding: 2px 8px;
  margin-top: 2px;
  border-radius: 10px;
  font-size: 12px;
  font-family: var(--cb-font-mono);
  white-space: nowrap;

  &.ally {
    background: rgba(106, 144, 112, 0.18);
    border: 1px solid var(--cb-copper);
    color: #b8d8c0;
  }
  &.enemy {
    background: rgba(74, 16, 16, 0.4);
    border: 1px solid var(--cb-blood-wet);
    color: #e0a090;
  }
  &.self {
    border-color: var(--cb-amber-dim);
    color: var(--cb-amber);
  }
  &.down {
    opacity: 0.45;
    transform: rotate(-8deg);
  }
}

/* ============ 军牌铭牌 ============ */
.unit-cards {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.war-plate {
  @include t.cb-stone(10px 12px);
  @include t.cb-rivets(6px, rgba(200, 160, 110, 0.4));
  min-width: 170px;
  flex: 1 1 170px;

  &.enemy {
    border-color: #6a3a30;
  }
  &.ally {
    border-color: #3a5a44;
  }
  &.down {
    opacity: 0.55;
    filter: saturate(0.4);
  }

  .unit-name {
    color: var(--cb-chalk);
    font-family: var(--cb-font-display);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1px;
  }
  .mono {
    color: var(--cb-blood-wet);
    font-family: var(--cb-font-mono);
    font-size: 11px;
  }
  .unit-stats {
    color: var(--cb-mana);
    font-size: 12px;
  }
  .unit-attrs {
    color: var(--cb-dim);
    font-size: 11px;
  }
  .unit-dist,
  .unit-slots {
    color: var(--cb-chalk-dim);
    font-size: 12px;
  }
  .unit-status {
    color: var(--cb-gold);
    font-size: 12px;
  }
  .unit-shield {
    color: var(--cb-shield);
    font-size: 12px;
  }
  .unit-cd {
    color: var(--cb-dim);
    font-size: 12px;
  }
}

/* 血/蓝/铜 三条液面 */
.gauges {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 6px 0 4px;
}

.gauge {
  @include t.cb-blood-gauge(t.$cb-blood-wet, t.$cb-blood);
  height: 8px;

  &.gauge-mp {
    @include t.cb-blood-gauge(t.$cb-mana, #1c2836);
  }
  &.gauge-sp {
    @include t.cb-blood-gauge(t.$cb-ember, #2e2014);
  }
}

/* ============ 行动石碑 ============ */
.action-zone {
  @include t.cb-stone(12px 14px);
  margin-bottom: 14px;
}

.progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--cb-border-soft);
  font-size: 13px;
  color: var(--cb-amber-dim);
  line-height: 1.5;
}

.spinner {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border: 2px solid var(--cb-border);
  border-top-color: var(--cb-amber);
  border-radius: 50%;
  animation: progress-spin 0.8s linear infinite;
}

@keyframes progress-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 敌方意图（羊皮纸条） */
.intent-block {
  margin-bottom: 10px;
  padding: 8px 10px;
  padding-bottom: 8px;
  border: 1px solid rgba(200, 160, 110, 0.25);
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(46, 30, 20, 0.5), rgba(26, 16, 10, 0.7));
}
.intent-title {
  color: var(--cb-blood-wet);
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
}
.intent-row {
  font-size: 12px;
  color: var(--cb-chalk-dim);
}
.intent-unit {
  color: var(--cb-blood-wet);
  margin-right: 8px;
}

/* 一个我方单位一块行动区 */
.unit-action {
  margin-bottom: 10px;
  padding: 8px 10px;
  border: 1px solid #3a5a44;
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(36, 26, 18, 0.6), rgba(26, 16, 10, 0.8));
}

.ua-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.ua-name {
  color: #b8d8c0;
  font-family: var(--cb-font-display);
  font-weight: 700;
  font-size: 13px;
}
.ua-meta {
  color: var(--cb-dim);
  font-size: 12px;
}
.ua-detail-btn {
  margin-left: auto;
  @include t.cb-plaque;
  padding: 3px 10px;
  font-size: 12px;
}

/* 效果详情表 */
.detail-table {
  margin: 0 0 10px;
  border: 1px solid var(--cb-border-soft);
  border-radius: 6px;
  overflow-x: auto;
  background: rgba(18, 11, 7, 0.6);
}
.dt-row {
  display: grid;
  grid-template-columns: minmax(140px, 2fr) repeat(4, minmax(60px, 1fr)) minmax(50px, 0.7fr) minmax(60px, 0.8fr) minmax(60px, 0.7fr);
  gap: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--cb-chalk-dim);
  border-top: 1px solid var(--cb-border-soft);

  &.dt-head {
    color: var(--cb-dim);
    border-top: none;
    background: rgba(36, 24, 18, 0.6);
  }
}
.dt-name {
  color: var(--cb-chalk);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 同源分组标题：一个卡面条目拆出来的几招挨在一起，这里是那一组的开头 */
.dt-group {
  padding: 5px 8px 3px;
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--cb-gold);
  border-top: 1px solid var(--cb-border-soft);
  background: rgba(120, 90, 200, 0.1);
}
.dt-empty {
  padding: 8px;
  font-size: 12px;
  color: var(--cb-dim);
}

.slot-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.slot {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: var(--cb-dim);
}
.slot-label {
  color: var(--cb-dim);
}
.slot select,
.slot input {
  @include t.cb-plaque;
  padding: 4px 6px;
  font-size: 13px;
  max-width: 260px;
}
.slot input[type='number'] {
  width: 90px;
}

.free-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--cb-border-soft);
  font-size: 12px;
}

.free-opt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--cb-chalk-dim);
  cursor: pointer;

  input {
    accent-color: var(--cb-amber);
  }
}

/* 免费行动：一条一条添（每条自带目标）—— 以前是一组复选框，根本没有目标那一栏 */
.free-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.free-line select {
  @include t.cb-plaque;
  padding: 4px 6px;
  font-size: 13px;
  max-width: 200px;
}
.add-free {
  @include t.cb-plaque;
  padding: 4px 10px;
  font-size: 12px;
  color: var(--cb-chalk-dim);
  cursor: pointer;
}

/* 每个行动各自的目标下拉：比技能下拉窄一点，别把一行挤爆 */
.slot-target select {
  max-width: 160px;
}

.action-submit {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--cb-border-soft);
}
.dim {
  color: var(--cb-dim);
  font-size: 12px;
}

/* 决斗场闸门（执行本轮 / 提交追加行动） */
.execute-btn {
  @include t.cb-gate;
  padding: 8px 20px;
  font-size: 13px;
  letter-spacing: 2px;
}

.ghost-btn {
  @include t.cb-plaque;
  padding: 6px 12px;
  font-size: 13px;
  margin-left: 6px;
  border-color: #5a3a34;
  color: #c8a090;

  &:not(:disabled):hover {
    background: rgba(74, 16, 16, 0.35);
    border-color: var(--cb-blood-wet);
  }
}

/* ============ 羊皮纸卷轴日志 ============ */
.battle-log {
  @include t.cb-stone(10px 12px);
  max-height: 30vh;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(46, 30, 20, 0.45), rgba(26, 16, 10, 0.65));
}
.log-entry {
  padding: 3px 0;
  font-size: 13px;
  color: var(--cb-chalk-dim);
  font-family: var(--cb-font-mono);
  border-bottom: 1px dotted rgba(74, 50, 38, 0.3);

  &:last-child {
    border-bottom: none;
  }
}

/* 行动顺序（↑↓） */
.order-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 6px 0 2px;
}
.order-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: linear-gradient(180deg, t.$cb-panel-2, t.$cb-sub);
  border: 1px solid var(--cb-border);
  border-radius: 5px;
  padding: 1px 4px;
}
.ord-name {
  font-size: 12px;
  color: var(--cb-chalk-dim);
}
.ord-btn {
  background: transparent;
  color: var(--cb-dim);
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 0 3px;
  &:disabled {
    opacity: 0.25;
    cursor: default;
  }
  &:not(:disabled):hover {
    color: var(--cb-amber);
  }
}

/* 选中项的效果预览 */
.preview-block {
  margin: 6px 0 2px;
  padding: 6px 8px;
  background: rgba(18, 11, 7, 0.6);
  border: 1px solid var(--cb-border-soft);
  border-radius: 6px;
}
.pv-item {
  margin-bottom: 4px;
}
.pv-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
}
.pv-slot {
  font-size: 11px;
  color: var(--cb-mana);
  border: 1px solid rgba(90, 125, 168, 0.5);
  border-radius: 4px;
  padding: 0 4px;
}
.pv-name {
  font-size: 13px;
  color: var(--cb-chalk);
  font-family: var(--cb-font-display);
}
/* 这条行动打谁（每个行动各自选目标之后，预览里得看得出目标） */
.pv-target {
  font-size: 12px;
  color: var(--cb-amber);
}
.pv-meta {
  font-size: 11px;
  color: var(--cb-dim);
}
.pv-line {
  font-size: 12px;
  color: var(--cb-chalk-dim);
  padding-left: 8px;
}

/* 效果详情（详情面板里的人话区） */
.ud-eff {
  margin-bottom: 6px;
}
.ud-eff-head {
  font-size: 13px;
  color: var(--cb-chalk);
  font-family: var(--cb-font-display);
}
.ud-title {
  color: var(--cb-amber-dim);
  font-size: 12px;
  letter-spacing: 2px;
  margin: 6px 0 4px;
}
.ud-line {
  font-size: 12px;
  color: var(--cb-chalk-dim);
}
.dim2 {
  color: var(--cb-dim);
}

.unit-down-tag {
  color: var(--cb-blood-wet);
  font-size: 11px;
  margin-left: 6px;
}

.unit-detail-btn {
  @include t.cb-plaque;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 11px;
}
</style>
