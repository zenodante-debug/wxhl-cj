<template>
  <div class="rank-page">
    <div class="rank-header">
      <button class="hdr-btn" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span class="hdr-title">玩家排行榜</span>
      <span class="hdr-total">{{ store.board.total }} 人在榜</span>
      <button class="hdr-btn" :disabled="store.loading" @click="store.refresh()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: store.loading }">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>
    </div>

    <!-- 我 -->
    <div class="my-card" :class="{ off: !store.mySnapshot }">
      <template v-if="store.mySnapshot">
        <div class="my-head">
          <span class="my-rank" :class="{ on: store.onBoard }">{{ store.myRankText }}</span>
          <span class="my-lv">Lv.{{ store.mySnapshot.lv }}</span>
        </div>
        <div class="my-body">
          <span class="my-name">{{ store.mySnapshot.name }}</span>
          <span v-if="store.mySnapshot.title && store.mySnapshot.title !== '无'" class="my-title">{{
            store.mySnapshot.title
          }}</span>
          <span v-if="store.mySnapshot.job && store.mySnapshot.job !== '无'" class="my-job">{{
            store.mySnapshot.job
          }}</span>
        </div>
      </template>
      <div v-else class="my-head">
        <span class="my-rank">{{ store.blockReason === 'too-low' ? '尚未达标' : '未读到契约者' }}</span>
      </div>
    </div>

    <div v-if="store.lastError" class="rank-error">{{ store.lastError }}</div>

    <div class="rank-body">
      <div class="rank-cols">
        <span class="c-rank">#</span>
        <span>契约者</span>
        <span class="c-lv">Lv</span>
      </div>

      <template v-for="(row, i) in store.rows" :key="i">
        <div v-if="row.kind === 'gap'" class="rank-gap">⋯</div>
        <div v-else class="rank-row" :class="{ mine: row.mine, top3: row.rank <= 3 }">
          <span class="c-rank">{{ row.rank }}</span>
          <div class="c-main">
            <div class="c-line1">
              <span class="c-name">{{ row.entry.name }}</span>
              <span v-if="row.entry.title && row.entry.title !== '无'" class="c-title">{{ row.entry.title }}</span>
            </div>
            <div v-if="row.entry.job && row.entry.job !== '无'" class="c-line2">{{ row.entry.job }}</div>
          </div>
          <span class="c-lv">{{ row.entry.lv }}</span>
        </div>
      </template>

      <div v-if="!store.rows.length && !store.loading" class="rank-empty">榜上还没有人，你可以是第一个</div>
      <div v-else-if="!store.rows.length" class="rank-empty">读取中…</div>
    </div>

    <div class="rank-footer">
      <button class="up-btn" :disabled="!store.mySnapshot || store.submitting" @click="store.submit()">
        {{ store.submitting ? '上传中…' : '上传我的等级' }}
      </button>
      <div class="up-hint">{{ hint }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { MIN_LV } from './rank';
import { useRankStore } from './store';

const emit = defineEmits<{ close: [] }>();
const store = useRankStore();

/** 底部提示：把「为什么不能上传」和「上传成功了没」说清楚 */
const hint = computed(() => {
  if (store.blockReason === 'no-name') return '还没读到契约者姓名 —— 先在状态栏里给自己起个名字';
  if (store.blockReason === 'too-low') return `Lv.${MIN_LV} 起才能参与排行，先去升几级`;
  const up = store.lastUploaded;
  if (up) return `已上传：第 ${up.rank} 名 · 共 ${up.total} 人`;
  return '只上传称号 / 姓名 / 职业 / 等级；同名会顶掉旧的（换新存档也走这条）';
});

onMounted(() => store.refresh());
</script>

<style lang="scss" scoped>
.spinning {
  animation: rank-spin 1s linear infinite;
}
@keyframes rank-spin {
  to {
    transform: rotate(360deg);
  }
}

.rank-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: linear-gradient(180deg, #1a1410, #100c09);
}
.rank-header {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 44px;
  flex-shrink: 0;
  background: rgba(30, 20, 14, 0.95);
  border-bottom: 1px solid rgba(80, 40, 20, 0.35);
}
.hdr-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--amber-d, #b08a4f);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  &:disabled {
    opacity: 0.5;
  }
  svg {
    width: 20px;
    height: 20px;
  }
}
.hdr-title {
  flex: 1;
  text-align: center;
  color: var(--amber, #d4a862);
  font-size: 15px;
  letter-spacing: 1px;
}
.hdr-total {
  color: #8a7355;
  font-size: 11px;
  flex-shrink: 0;
  min-width: 56px;
  text-align: right;
}

/* ---- 我的卡片 ---- */
.my-card {
  flex-shrink: 0;
  margin: 10px 12px 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(60, 40, 22, 0.5);
  border: 1px solid rgba(140, 100, 50, 0.35);
  &.off {
    background: rgba(40, 32, 24, 0.5);
    border-color: rgba(90, 70, 50, 0.3);
  }
}
.my-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.my-rank {
  color: #9a8a6a;
  font-size: 13px;
  &.on {
    color: var(--amber, #d4a862);
    font-weight: 600;
  }
}
.my-lv {
  color: var(--amber-d, #b08a4f);
  font-size: 12px;
}
.my-body {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 6px;
  min-width: 0;
}
/* 不省略、允许换行：长称号/职业在窄屏也完整可见 */
.my-title {
  color: #c8a468;
  font-size: 12px;
  word-break: break-word;
}
.my-name {
  color: #e8dcc8;
  font-size: 14px;
  font-weight: 600;
  word-break: break-word;
}
.my-job {
  color: #8a9a8a;
  font-size: 11px;
  word-break: break-word;
}

.rank-error {
  flex-shrink: 0;
  margin: 8px 12px 0;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(120, 40, 30, 0.35);
  color: #e8a090;
  font-size: 12px;
}

/* ---- 榜单 ---- */
.rank-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin-top: 10px;
  padding: 0 12px 8px;
}
.rank-cols,
.rank-row {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;
}
.rank-cols {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 6px 8px;
  background: #17110d;
  color: #7a6448;
  font-size: 11px;
  border-bottom: 1px solid rgba(80, 40, 20, 0.3);
}
.rank-row {
  padding: 7px 8px;
  border-bottom: 1px solid rgba(60, 40, 22, 0.3);
  font-size: 12px;
  color: #b8a88e;
  &.top3 .c-rank {
    color: #e8c060;
    font-weight: 700;
  }
  &.mine {
    background: rgba(120, 80, 30, 0.28);
    border-left: 2px solid var(--amber, #d4a862);
    color: #eadcc0;
  }
}
.c-rank {
  color: #8a7355;
  text-align: center;
}
/* 两行式：第一行 姓名 + 称号，第二行 职业；长文本换行完整显示（不再截断成「…」） */
.c-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.c-line1 {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
}
.c-line2 {
  font-size: 11px;
  color: #8a9a8a;
  word-break: break-word;
}
.c-name {
  color: #e0d4bc;
  font-size: 13px;
  font-weight: 600;
  word-break: break-word;
}
.c-title {
  color: #c8a468;
  font-size: 11px;
  word-break: break-word;
}
.c-lv {
  color: var(--amber-d, #b08a4f);
  text-align: right;
}
.rank-gap {
  text-align: center;
  color: #6a5844;
  padding: 4px 0;
  letter-spacing: 4px;
}
.rank-empty {
  text-align: center;
  color: #6a5844;
  font-size: 12px;
  padding: 28px 0;
}

/* ---- 底部上传 ---- */
.rank-footer {
  flex-shrink: 0;
  padding: 8px 12px 10px;
  border-top: 1px solid rgba(80, 40, 20, 0.35);
  background: rgba(24, 17, 12, 0.9);
}
.up-btn {
  width: 100%;
  height: 36px;
  border: 1px solid rgba(160, 120, 60, 0.5);
  border-radius: 6px;
  background: rgba(90, 62, 28, 0.7);
  color: var(--amber, #d4a862);
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}
.up-hint {
  margin-top: 6px;
  color: #7a6448;
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
}
</style>
