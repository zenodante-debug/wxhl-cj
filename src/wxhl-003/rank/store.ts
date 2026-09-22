import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchRankTop, submitRank } from './api';
import { TOP_N, boardRows, rankText, readRankSnapshot, type RankBoard, type RankPayload } from './rank';

// ================================================================
// 无限回廊 · 玩家排行榜 store
//
// 这个功能**只读存档、不回写**任何变量（名次留在 app 里看，不碰剧情用的
// `契约者.排行榜.当前排名`）。排序与名次展示全在客户端算，不烧 AI token。
// MVU 楼层探测照 market/store.ts 的惯例。
// ================================================================

/** 楼层探测：全局脚本 iframe 无楼层上下文时回退最新楼层（与 store.ts 一致） */
function messageId(): number | 'latest' {
  try {
    const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
    if (mid && mid !== -1) return mid;
  } catch (_) {}
  return 'latest';
}

/** 读 stat_data.契约者；读不到返回 null */
function readContractor(): any | null {
  try {
    const mvu = Mvu.getMvuData({ type: 'message', message_id: messageId() });
    return _.get(mvu, ['stat_data', '契约者']) ?? null;
  } catch (_) {
    return null;
  }
}

const errText = (e: any): string => String(e?.message ?? e ?? '未知错误');

export const useRankStore = defineStore('wxhl003-rank', () => {
  const board = ref<RankBoard>({ list: [], total: 0, me: null, near: [] });
  const loading = ref(false);
  const submitting = ref(false);
  const lastError = ref('');
  /** 上次上传成功的结果，用来给玩家一句「已上传：第 N 名」 */
  const lastUploaded = ref<{ rank: number; total: number } | null>(null);

  /** 我的上传字段；没读到就是 null */
  const mySnapshot = ref<RankPayload | null>(null);
  /** 读不到上传字段的原因（UI 据此给不同文案） */
  const blockReason = ref<'' | 'no-name' | 'too-low'>('');

  /** 重读存档。只读，不写任何变量 */
  function refreshSnapshot() {
    const r = readRankSnapshot(readContractor());
    if (r.ok) {
      mySnapshot.value = r.payload;
      blockReason.value = '';
    } else {
      mySnapshot.value = null;
      blockReason.value = r.reason;
    }
    return r;
  }

  /** 榜单展示行（前 TOP_N 名 + 我在 20 名外时的省略号与前后邻居） */
  const rows = computed(() => boardRows(board.value));
  /** 我的名次文案 */
  const myRankText = computed(() => rankText(board.value.me?.rank ?? 0, board.value.total));
  /** 我在榜上（只有上传过才可能为真） */
  const onBoard = computed(() => board.value.me !== null);

  async function refresh() {
    loading.value = true;
    lastError.value = '';
    try {
      const snap = refreshSnapshot();
      board.value = await fetchRankTop(snap.ok ? snap.payload.name : '');
    } catch (e) {
      lastError.value = '榜单读取失败：' + errText(e);
    } finally {
      loading.value = false;
    }
  }

  async function submit() {
    const snap = refreshSnapshot();
    if (!snap.ok) {
      lastError.value =
        snap.reason === 'no-name' ? '还没读到契约者姓名，无法上传' : `Lv.${snap.lv} 未达参与门槛`;
      return;
    }
    submitting.value = true;
    lastError.value = '';
    try {
      lastUploaded.value = await submitRank(snap.payload);
      await refresh();
    } catch (e) {
      lastError.value = '上传失败：' + errText(e);
    } finally {
      submitting.value = false;
    }
  }

  return {
    TOP_N,
    board,
    rows,
    loading,
    submitting,
    lastError,
    lastUploaded,
    mySnapshot,
    blockReason,
    myRankText,
    onBoard,
    refresh,
    submit,
  };
});
