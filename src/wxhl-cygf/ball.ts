// src/wxhl-cygf/ball.ts
// 悬浮球 —— **照抄 wxhl-003 小手机的 mobile-compat.js**（同一套行为、同一批坑）。
//
// 为什么必须抄这套：手机端 `position: fixed` 的**包含块可能不是视口**
// （祖先带 transform / filter / backdrop-filter，或页面处于 pinch-zoom），
// 直接 left/top = 视口坐标会跑偏 —— 小手机记的 bug #1/#2 就是这个（球被顶到角落/看不见）。
// 它的解法：先按视口坐标设一次，再用 `getBoundingClientRect()`（恒为视口坐标）量出实际偏差并抵消；
// 再配 MutationObserver + 700ms 轮询 + visualViewport 的 resize/scroll 持续校正。
// 此外手机端还要用 `visualViewport.offsetLeft/offsetTop` 补偿地址栏与缩放。
import { PANEL_ID, togglePanel } from './panel';

export const BALL_ID = 'wxhl-cygf-ball';
export const BALL_SIZE = 52;
/** 与视口边缘留的间距（mobile-compat 的 gap = 10） */
const VIEWPORT_GAP = 10;
/** 拖动判定：位移超过 5px 算拖动（mobile-compat 用 Math.hypot(dx,dy) >= 5） */
const DRAG_THRESHOLD = 5;
/** 位置存档键（存在**酒馆主窗口**的 localStorage，与 mobile-compat 同样取法） */
const POSITION_KEY = 'wxhl-cygf-orb-position-v1';
/** 挂在酒馆主窗口上的运行时键：热重载时用它找到并拆掉上一实例 */
const RUNTIME_KEY = '__WXHL_CYGF_ORB__';

export interface Viewport {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function shouldTreatAsClick(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) < DRAG_THRESHOLD;
}

/**
 * 按**可视视口**夹取坐标（含 visualViewport 的 offsetLeft/offsetTop）。
 * 视口比球还小时退到「视口原点 + 间距」，不产生跑到视口外的坐标。
 */
export function clampBallPosition(
  left: number,
  top: number,
  viewport: Viewport,
  size = BALL_SIZE,
): { left: number; top: number } {
  const minLeft = viewport.left + VIEWPORT_GAP;
  const minTop = viewport.top + VIEWPORT_GAP;
  const maxLeft = viewport.left + viewport.width - size - VIEWPORT_GAP;
  const maxTop = viewport.top + viewport.height - size - VIEWPORT_GAP;
  return {
    left: maxLeft < minLeft ? minLeft : Math.min(Math.max(left, minLeft), maxLeft),
    top: maxTop < minTop ? minTop : Math.min(Math.max(top, minTop), maxTop),
  };
}

/** 默认落点：贴右缘、纵向 42% 高度（照 mobile-compat —— 避开手机底部输入框与键盘） */
export function defaultBallPosition(viewport: Viewport, size = BALL_SIZE): { left: number; top: number } {
  return {
    left: viewport.left + viewport.width - size - 14,
    top: Math.round(viewport.top + viewport.height * 0.42 - size / 2),
  };
}

/** 校验存档：坏 JSON / 缺字段 / 非数字 / 负坐标一律 null（回退默认落点） */
export function parseStoredPosition(raw: string | null | undefined): { left: number; top: number } | null {
  if (typeof raw !== 'string' || raw === '') return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const { left, top } = value as { left?: unknown; top?: unknown };
    if (typeof left !== 'number' || typeof top !== 'number') return null;
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
    if (left < 0 || top < 0) return null;
    return { left, top };
  } catch {
    return null;
  }
}

// ==================== 以下是 DOM 部分（无 jsdom，靠真机/浏览器验证） ====================

type HostWindow = Window & {
  visualViewport?: VisualViewport | null;
  __WXHL_CYGF_ORB__?: () => void;
};

function hasDom(): boolean {
  try {
    return Boolean((window.parent ?? window).document);
  } catch {
    return false;
  }
}

function hostWindowOf(): HostWindow {
  return (window.parent ?? window) as unknown as HostWindow;
}

function hostDocumentOf(): Document {
  return hostWindowOf().document;
}

/** 手机布局判定（与 mobile-compat / App.vue 同口径） */
function isPhone(): boolean {
  try {
    const w = hostWindowOf();
    const coarse = w.matchMedia?.('(pointer: coarse)')?.matches;
    const noHover = w.matchMedia?.('(hover: none)')?.matches;
    const viewportWidth = w.visualViewport?.width || w.innerWidth || 9999;
    return Boolean(coarse || noHover || viewportWidth <= 768);
  } catch {
    return false;
  }
}

function getViewport(): Viewport {
  const w = hostWindowOf();
  const vv = w.visualViewport;
  return {
    left: vv?.offsetLeft || 0,
    top: vv?.offsetTop || 0,
    width: vv?.width || w.innerWidth || 400,
    height: vv?.height || w.innerHeight || 800,
  };
}

function setImportant(element: HTMLElement, values: Record<string, string>): void {
  for (const [name, value] of Object.entries(values)) {
    element.style.setProperty(name, value, 'important');
  }
}

function readSavedPosition(): { left: number; top: number } | null {
  try {
    return parseStoredPosition(hostWindowOf().localStorage.getItem(POSITION_KEY));
  } catch {
    return null;
  }
}

function savePosition(left: number, top: number): void {
  try {
    hostWindowOf().localStorage.setItem(POSITION_KEY, JSON.stringify({ left, top }));
  } catch {
    // 隐私模式等写不进去就算了，下次回默认落点
  }
}

/**
 * 把元素定位到「视口坐标」，对 fixed 包含块偏移免疫（**这行是手机端能看见球的关键**）。
 * 先设一次 → 用 getBoundingClientRect 量偏差 → 抵消。设置与校正在同一同步块内完成，不闪。
 */
function placeAtViewport(el: HTMLElement, targetLeft: number, targetTop: number): void {
  setImportant(el, {
    left: `${targetLeft}px`,
    top: `${targetTop}px`,
    right: 'auto',
    bottom: 'auto',
    transform: 'none',
  });
  const rect = el.getBoundingClientRect();
  const dx = targetLeft - rect.left;
  const dy = targetTop - rect.top;
  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
    setImportant(el, { left: `${targetLeft + dx}px`, top: `${targetTop + dy}px` });
  }
}

function placeBall(el: HTMLElement, dragging: boolean): void {
  if (dragging) return;
  const viewport = getViewport();
  const saved = readSavedPosition();
  const initial = saved ?? defaultBallPosition(viewport, BALL_SIZE);
  const position = clampBallPosition(initial.left, initial.top, viewport, BALL_SIZE);
  setImportant(el, {
    position: 'fixed',
    width: `${BALL_SIZE}px`,
    height: `${BALL_SIZE}px`,
    visibility: 'visible',
    opacity: '1',
    display: 'flex',
    'pointer-events': 'auto',
    'touch-action': 'none',
    'z-index': '2147483647', // 拉满：手机端酒馆楼层/美化正则很爱用超大 z-index
    'align-items': 'center',
    'justify-content': 'center',
    'font-size': '24px',
    'line-height': '1',
    cursor: 'grab',
    'user-select': 'none',
    'border-radius': '50%',
    background: 'linear-gradient(160deg,#1e293b,#0f172a)',
    color: '#93c5fd',
    border: '1px solid rgba(147,197,253,.35)',
    'box-shadow': '0 6px 18px rgba(0,0,0,.45)',
  });
  placeAtViewport(el, position.left, position.top);
}

/** 工坊面板打开时把球藏起来（球在最大 z-index，否则会浮在面板上面碍事） */
function syncPanelVisibility(el: HTMLElement): void {
  let open: boolean;
  try {
    open = Boolean(hostDocumentOf().getElementById(PANEL_ID));
  } catch {
    open = false;
  }
  setImportant(el, { visibility: open ? 'hidden' : 'visible' });
}

function bindPointerDrag(el: HTMLElement): void {
  let drag: {
    pointerId: number;
    startX: number;
    startY: number;
    left: number;
    top: number;
    width: number;
    height: number;
    moved: boolean;
  } | null = null;
  let suppressClickUntil = 0;

  el.addEventListener(
    'pointerdown',
    event => {
      if (event.button > 0) return;
      const rect = el.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        moved: false,
      };
      el.dataset.wxhlDragging = '1';
      // 固定在当前视口位置（自校正包含块偏移），避免拖动起点跳变
      placeAtViewport(el, rect.left, rect.top);
      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        // 不支持指针捕获也能拖，只是手指滑出球外会断
      }
    },
    { capture: true },
  );

  el.addEventListener(
    'pointermove',
    event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      if (!shouldTreatAsClick(deltaX, deltaY)) drag.moved = true;
      if (!drag.moved) return;
      event.preventDefault();
      const position = clampBallPosition(drag.left + deltaX, drag.top + deltaY, getViewport(), BALL_SIZE);
      placeAtViewport(el, position.left, position.top);
    },
    { capture: true, passive: false },
  );

  const finishDrag = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const moved = drag.moved;
    drag = null;
    delete el.dataset.wxhlDragging;
    try {
      el.releasePointerCapture(event.pointerId);
    } catch {
      // 没捕获过就不用释放
    }
    if (moved) {
      const rect = el.getBoundingClientRect();
      savePosition(rect.left, rect.top);
      suppressClickUntil = Date.now() + 500;
      event.preventDefault();
    } else {
      // 干净点按（未拖动）→ 开关工坊面板
      togglePanel();
    }
  };
  el.addEventListener('pointerup', finishDrag, { capture: true });
  el.addEventListener('pointercancel', finishDrag, { capture: true });

  // 拖动后的残留 click 会穿透成"点按"，照 mobile-compat 的做法吞掉
  el.addEventListener(
    'click',
    event => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
}

/**
 * 装载悬浮球。重复装载先拆上一实例（脚本热重载不触发 pagehide）。
 * 返回拆卸函数。
 */
export function installBall(): () => void {
  if (!hasDom()) {
    console.warn('[wxhl创意工坊] 当前环境没有宿主页面 DOM，跳过悬浮球');
    return () => {};
  }
  const host = hostWindowOf();
  if (typeof host[RUNTIME_KEY] === 'function') host[RUNTIME_KEY]!();

  const doc = hostDocumentOf();
  doc.getElementById(BALL_ID)?.remove();

  const el = doc.createElement('div');
  el.id = BALL_ID;
  el.title = '打开创意工坊';
  el.textContent = '🧩'; // textContent，禁 innerHTML
  (doc.body || doc.documentElement).appendChild(el);

  bindPointerDrag(el);

  const update = () => {
    placeBall(el, el.dataset.wxhlDragging === '1');
    syncPanelVisibility(el);
  };

  // 照 mobile-compat：酒馆 DOM 会重绘、可视视口会随地址栏/缩放变化，所以持续校正
  const MutationObserverCtor = (host.MutationObserver ?? MutationObserver) as typeof MutationObserver;
  const observer = new MutationObserverCtor(update);
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  const syncTimer = host.setInterval(update, 700);
  host.addEventListener('resize', update);
  host.visualViewport?.addEventListener('resize', update);
  host.visualViewport?.addEventListener('scroll', update);
  update();

  const teardown = () => {
    observer.disconnect();
    host.clearInterval(syncTimer);
    host.removeEventListener('resize', update);
    host.visualViewport?.removeEventListener('resize', update);
    host.visualViewport?.removeEventListener('scroll', update);
    el.remove();
    if (host[RUNTIME_KEY] === teardown) delete host[RUNTIME_KEY];
  };
  host[RUNTIME_KEY] = teardown;

  console.info(`[wxhl创意工坊] 悬浮球已就位（点按开工坊，可拖动；手机布局=${isPhone() ? '是' : '否'}）`);
  return teardown;
}
