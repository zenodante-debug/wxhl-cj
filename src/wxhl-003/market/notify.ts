// ================================================================
// 无由回廊 · 小手机内部通知（自由市场用）
// 用户要求：审核结果/超模提醒在「小手机内部」展示，不用酒馆弹窗（toastr）。
// 会话内 ref + localStorage 持久化（跨刷新保留，上限 50 条）。
// ================================================================

import { ref } from 'vue';

export interface MarketNotice {
  id: string;
  ts: number;
  title: string;
  body: string;
  read: boolean;
}

const KEY = 'wxhl003_market_notifs';
const MAX = 50;

function load(): MarketNotice[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.slice(0, MAX);
    }
  } catch (_) {}
  return [];
}

function save(list: MarketNotice[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch (_) {}
}

const notices = ref<MarketNotice[]>(load());

export function useMarketNotices() {
  function add(title: string, body: string): void {
    notices.value = [
      { id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), title, body, read: false },
      ...notices.value,
    ].slice(0, MAX);
    save(notices.value);
  }
  function unreadCount(): number {
    return notices.value.filter(n => !n.read).length;
  }
  function markAllRead(): void {
    notices.value = notices.value.map(n => ({ ...n, read: true }));
    save(notices.value);
  }
  return { notices, add, unreadCount, markAllRead };
}
