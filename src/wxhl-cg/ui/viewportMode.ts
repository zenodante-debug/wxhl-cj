// ================================================================
// 回廊交易所 · 窗口形态判定（终审 I2）。
// 判据必须看**宿主窗口**（酒馆页面）而不是脚本 iframe 自己的视口：
// iframe 尺寸是被 index.ts 的 updateSize() 事后设置的，在此之前可能为 0，
// 用 iframe 内的 CSS 媒体查询会在桌面端误判成手机。
// 与状态栏手机端判据同源（src/wxhl-003/mobile-compat.js:12-17）：粗指针 / 无 hover / 宽 ≤768。
// ================================================================

export type ViewportMode = 'phone' | 'compact' | 'wide';

export interface HostLike {
  matchMedia?: (q: string) => { matches: boolean };
  visualViewport?: { width?: number };
  innerWidth?: number;
}

export const PHONE_MAX_WIDTH = 768;
export const COMPACT_MAX_WIDTH = 900;

export function viewportMode(host: HostLike): ViewportMode {
  const coarse = host.matchMedia?.('(pointer: coarse)')?.matches;
  const noHover = host.matchMedia?.('(hover: none)')?.matches;
  const vw = host.visualViewport?.width || host.innerWidth || 9999;
  if (coarse || noHover || vw <= PHONE_MAX_WIDTH) return 'phone';
  if (vw <= COMPACT_MAX_WIDTH) return 'compact';
  return 'wide';
}
