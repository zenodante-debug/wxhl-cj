<!-- 回廊交易所 · 右上：账户资产 + UP 兑换（四个预设按钮，不填数字） -->
<script setup lang="ts">
import { useExchangeStore } from '../store';
import { netAssets } from '../engine/trading';
import { positionEquitySum, totalPnl } from '../engine/metrics';
import { BANKRUPTCY_LINE } from '../engine/bankrupt';

const store = useExchangeStore();
const acct = computed(() => store.acct);
const equity = computed(() => positionEquitySum(acct.value));
const net = computed(() => netAssets(acct.value));
const pnl = computed(() => totalPnl(acct.value));
const lossRatio = computed(() => Math.max(0, Math.min(100, (acct.value.cumulativeLoss / BANKRUPTCY_LINE) * 100)));

const upAvail = computed(() => Math.max(0, Math.floor(store.up ?? 0)));
const cash = computed(() => Math.max(0, Math.floor(acct.value.cash)));

/** 存入：按 UP 记（100 / 1000 / 一半 / 全部），超出余额自动夹到余额 */
function depositValue(kind: number | 'half' | 'all'): number {
  const raw = kind === 'all' ? upAvail.value : kind === 'half' ? Math.floor(upAvail.value / 2) : kind;
  return Math.min(raw, upAvail.value);
}
/** 取出：按币记（100 / 1000 / 一半 / 全部），到手 = 币 × 0.99 UP */
function withdrawValue(kind: number | 'half' | 'all'): number {
  const raw = kind === 'all' ? cash.value : kind === 'half' ? Math.floor(cash.value / 2) : kind;
  return Math.min(raw, cash.value);
}

async function doDeposit(kind: number | 'half' | 'all') {
  const v = depositValue(kind);
  try {
    await store.depositUP(v);
  } catch (e: any) {
    toastr.error(e?.message ?? '存入失败');
  }
}
async function doWithdraw(kind: number | 'half' | 'all') {
  const v = withdrawValue(kind);
  try {
    await store.withdrawUP(v);
  } catch (e: any) {
    toastr.error(e?.message ?? '取出失败');
  }
}

function doRepayDebt() {
  try {
    store.repayDebt(Math.min(cash.value, acct.value.debt));
  } catch (e: any) {
    toastr.error(e?.message ?? '清偿失败');
  }
}
</script>

<template>
  <div class="cg-card">
    <div class="cg-card-title">账户资产</div>
    <div class="cg-kv">
      <span class="k">现金</span><span class="v mono">{{ acct.cash }}</span>
    </div>
    <div class="cg-kv">
      <span class="k">UP</span><span class="v mono">{{ store.up ?? '—' }}</span>
    </div>
    <div class="cg-kv">
      <span class="k">持仓权益</span><span class="v mono">{{ equity }}</span>
    </div>
    <div class="cg-kv">
      <span class="k">净投入</span><span class="v mono">{{ acct.netInvested }}</span>
    </div>
    <div class="cg-kv">
      <span class="k">总盈亏</span>
      <span class="v mono" :class="pnl >= 0 ? 'up' : 'down'">{{ pnl > 0 ? '+' : '' }}{{ pnl }}</span>
    </div>
    <div class="cg-kv">
      <span class="k">净资产</span><span class="v mono">{{ net }}</span>
    </div>
    <div class="cg-kv">
      <span class="k">破产线</span>
      <span class="v mono" :class="lossRatio >= 80 ? 'down' : ''">累计亏损 {{ acct.cumulativeLoss }} / {{ BANKRUPTCY_LINE }}</span>
    </div>
    <div class="cg-bar"><i :style="{ width: lossRatio + '%' }"></i></div>
    <div class="cg-hint">亏满 {{ BANKRUPTCY_LINE }} 就强制变卖资产抵债（只算已平仓的实亏，浮亏不算）</div>

    <div v-if="acct.debt > 0" class="cg-debt">
      <div>欠交易所 <b class="mono down">{{ acct.debt }}</b>（账户已冻结）</div>
      <button :disabled="cash < 1" @click="doRepayDebt">用现金清偿</button>
    </div>

    <div class="cg-exchange">
      <div class="cg-sub-title">存入（UP → 币，手续费 1%）</div>
      <div class="cg-presets">
        <button :disabled="depositValue(100) < 1" @click="doDeposit(100)">100UP</button>
        <button :disabled="depositValue(1000) < 1" @click="doDeposit(1000)">1000UP</button>
        <button :disabled="depositValue('half') < 1" @click="doDeposit('half')">一半</button>
        <button :disabled="depositValue('all') < 1" @click="doDeposit('all')">全部</button>
      </div>
      <div class="cg-sub-title">取出（币 → UP，手续费 1%）</div>
      <div class="cg-presets">
        <button :disabled="withdrawValue(100) < 1" @click="doWithdraw(100)">100</button>
        <button :disabled="withdrawValue(1000) < 1" @click="doWithdraw(1000)">1000</button>
        <button :disabled="withdrawValue('half') < 1" @click="doWithdraw('half')">一半</button>
        <button :disabled="withdrawValue('all') < 1" @click="doWithdraw('all')">全部</button>
      </div>
    </div>
  </div>
</template>
