export const BUTTON_NAME = '创意工坊';
export const PANEL_ID = 'wxhl-cygf-panel';
export const DEFAULT_WORKSHOP_URL = 'https://cygf.657868.xyz';
export const URL_OVERRIDE_KEY = 'wxhl_cygf_workshop_url';

const TOGGLE_DEBOUNCE_MS = 150;
let _lastToggleAt = 0;
/** 挂在酒馆主窗口上的运行时键：热重载时用它找到并拆掉上一实例的 ESC 监听 */
/** 挂在酒馆主窗口上的运行时键：热重载时用它找到并拆掉上一实例的面板与全部监听 */
const PANEL_RUNTIME_KEY = '__wxhlCygfPanelTeardown';

/** 工坊页面地址：脚本变量可覆盖；仅接受无凭据、无危险字符的 https 地址，其余回退默认 */
export function resolveWorkshopUrl(): string {
  try {
    if (typeof getVariables === 'function' && typeof getScriptId === 'function') {
      const override = getVariables({ type: 'script', script_id: getScriptId() })?.[URL_OVERRIDE_KEY];
      if (typeof override === 'string' && override !== '') {
        // 用 URL 解析而不是正则：正则既挡不住 https://x"onload=… 这类破坏 HTML 属性的值，
        // 也挡不住 https://cygf.657868.xyz@evil.com 这类实际指向他域的 userinfo 地址（会污染桥接白名单）
        try {
          const url = new URL(override);
          const ok =
            url.protocol === 'https:' &&
            url.username === '' &&
            url.password === '' &&
            !/["'<>\s]/.test(url.href);
          if (ok) return url.href;
        } catch {
          // 解析失败按非法处理，落到下面的 warn
        }
        console.warn(`[wxhl创意工坊] 忽略非法的工坊地址覆盖值: ${override}`);
      }
    }
  } catch {
    // 读脚本变量失败不该炸面板，用默认地址
  }
  return DEFAULT_WORKSHOP_URL;
}

export function workshopOrigin(): string {
  return new URL(resolveWorkshopUrl()).origin;
}

export function shouldTogglePanel(now: number, lastToggle: number): boolean {
  return now - lastToggle >= TOGGLE_DEBOUNCE_MS;
}

export interface PanelViewport {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface PanelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 可视视口（含手机地址栏伸缩与 pinch-zoom 的 offset） */
export function panelViewport(host: Window = (window.parent ?? window) as Window): PanelViewport {
  const viewport = (host as unknown as { visualViewport?: VisualViewport | null }).visualViewport;
  return {
    left: Math.max(0, viewport?.offsetLeft || 0),
    top: Math.max(0, viewport?.offsetTop || 0),
    width: Math.max(1, viewport?.width || host.innerWidth || 360),
    height: Math.max(1, viewport?.height || host.innerHeight || 640),
  };
}

/**
 * 面板与 iframe 的落位：面板铺满可视视口，iframe 居中。
 * 手机（宽度 ≤600）时 iframe 铺满视口留 16px（不然在手机上只剩一条缝）；
 * 桌面时 96vw × min(820, 92vh)，上限 1180×820。
 */
export function panelRects(viewport: PanelViewport): { panel: PanelRect; frame: PanelRect } {
  const phone = viewport.width <= 600;
  const width = Math.max(1, Math.min(1180, phone ? viewport.width - 16 : viewport.width * 0.96));
  const height = Math.max(1, phone ? viewport.height - 16 : Math.min(820, viewport.height * 0.92));
  return {
    panel: { left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height },
    frame: {
      left: Math.max(0, (viewport.width - width) / 2),
      top: Math.max(0, (viewport.height - height) / 2),
      width,
      height,
    },
  };
}

/** 用 DOM API 装配面板：src/text 走属性/文本设置，不经过 HTML 解析，结构性杜绝属性逃逸 */
function buildPanel(): JQuery {
  const $panel = $('<div>').attr('id', PANEL_ID).css({
    position: 'fixed',
    inset: 'auto',
    // 必须低于 toastr 容器（z-index 999999）：遮罩若盖在 toastr 之上，
    // 面板打开期间所有提示（登录成败、弹出窗口被拦截的告警）都会被遮住看不见。
    // 999980 低于 toastr、又高于酒馆主界面，与 wxhl-003 遮罩（99998）同思路。
    zIndex: 999980,
    display: 'block',
    margin: '0',
    padding: '0',
    border: '0',
    boxSizing: 'border-box',
    overflow: 'hidden',
    // 清掉可能被酒馆/美化正则继承来的包含块破坏者（手机端错位的根因之一）
    transform: 'none',
    filter: 'none',
    background: 'rgba(8,10,18,.72)',
  });
  const $frame = $('<iframe>')
    .addClass('wxhl-cygf-frame')
    .attr({
      src: resolveWorkshopUrl(),
      title: '回廊创意工坊',
      referrerpolicy: 'strict-origin-when-cross-origin',
      allow: 'clipboard-read; clipboard-write',
    })
    .css({
      position: 'absolute',
      display: 'block',
      margin: '0',
      border: 'none',
      borderRadius: '14px',
      boxSizing: 'border-box',
      transform: 'none',
      background: '#0f172a',
      boxShadow: '0 12px 48px rgba(0,0,0,.5)',
    });
  const $close = $('<button>')
    .addClass('wxhl-cygf-close')
    .attr({ type: 'button', title: '关闭工坊（也可点击遮罩空白处，或按 ESC）', 'aria-label': '关闭创意工坊' })
    .text('✕')
    .css({
      position: 'absolute',
      top: 'max(8px, env(safe-area-inset-top))',
      right: 'max(8px, env(safe-area-inset-right))',
      zIndex: '1',
      width: '46px',
      height: '46px',
      padding: '0',
      border: '0',
      borderRadius: '50%',
      background: 'rgba(25,18,14,.8)',
      color: '#fff',
      fontSize: '20px',
      lineHeight: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      transform: 'none',
    });
  return $panel.append($frame, $close);
}

function onEsc(event: KeyboardEvent): void {
  if (event.key === 'Escape') closePanel();
}

/**
 * 打开/关闭面板（带防抖）。
 *
 * 手机端要点（照抄小手机与社区贡献版的做法，2026-10-11/12 踩过）：
 * - 挂在 `documentElement` 而不是 `body`：body 上的 transform/filter 会把 `position: fixed`
 *   的包含块从视口改成那个元素，于是面板整体错位、手机上直接看不见；
 * - 尺寸全部按 `visualViewport` 显式算（含 offsetLeft/offsetTop），并在
 *   resize / orientationchange / visualViewport 的 resize+scroll 上重排（地址栏伸缩会触发）；
 * - 支持 `popover` 的浏览器里进顶层（top layer），绕过祖先的 transform/filter。
 */
export function togglePanel(): void {
  const now = Date.now();
  if (!shouldTogglePanel(now, _lastToggleAt)) return;
  _lastToggleAt = now;

  const host = (window.parent ?? window) as Window;
  const doc = host.document;
  if (doc.getElementById(PANEL_ID)) {
    closePanel();
    return;
  }
  // 热重载不触发 pagehide：用运行时键先拆上一实例，否则每次重载后按 ESC 会叠一层关面板
  const previousCleanup = (host as unknown as Record<string, unknown>)[PANEL_RUNTIME_KEY];
  if (typeof previousCleanup === 'function') previousCleanup();

  const $panel = buildPanel();
  const $frame = $panel.find('iframe.wxhl-cygf-frame');
  const $close = $panel.find('.wxhl-cygf-close');
  const panelEl = $panel[0] as HTMLElement;
  const frameEl = $frame[0] as HTMLElement;
  const previousFocus = doc.activeElement as HTMLElement | null;
  const previousInert = doc.body?.inert ?? false;

  // 挂 documentElement（不是 body）：见上面的注释
  $(doc.documentElement).append($panel);

  const place = () => {
    if (!panelEl.isConnected) return;
    const rects = panelRects(panelViewport(host));
    Object.assign(panelEl.style, {
      left: `${rects.panel.left}px`,
      top: `${rects.panel.top}px`,
      width: `${rects.panel.width}px`,
      height: `${rects.panel.height}px`,
    });
    Object.assign(frameEl.style, {
      left: `${rects.frame.left}px`,
      top: `${rects.frame.top}px`,
      width: `${rects.frame.width}px`,
      height: `${rects.frame.height}px`,
    });
  };
  place();

  // 顶层显示（若支持）：不受祖先 transform/filter 影响；失败就退回普通定位
  if (typeof (panelEl as unknown as { showPopover?: () => void }).showPopover === 'function') {
    panelEl.setAttribute('popover', 'manual');
    try {
      (panelEl as unknown as { showPopover: () => void }).showPopover();
    } catch {
      panelEl.removeAttribute('popover');
    }
  }

  let pendingFrame = 0;
  const schedulePlace = () => {
    if (pendingFrame) return;
    pendingFrame = host.requestAnimationFrame(() => {
      pendingFrame = 0;
      place();
    });
  };

  const onCloseClick = (event: JQuery.TriggeredEvent) => {
    event.stopPropagation();
    closePanel();
  };
  const onBackdropClick = (event: JQuery.TriggeredEvent) => {
    if (event.target === panelEl) closePanel();
  };
  $close.on('click', onCloseClick);
  $panel.on('click', onBackdropClick);
  host.addEventListener('keydown', onEsc);
  host.addEventListener('resize', schedulePlace);
  host.addEventListener('orientationchange', schedulePlace);
  const visualViewport = (host as unknown as { visualViewport?: VisualViewport | null }).visualViewport;
  visualViewport?.addEventListener('resize', schedulePlace);
  visualViewport?.addEventListener('scroll', schedulePlace);

  const teardown = () => {
    if (pendingFrame) host.cancelAnimationFrame(pendingFrame);
    $close.off('click', onCloseClick);
    $panel.off('click', onBackdropClick);
    host.removeEventListener('keydown', onEsc);
    host.removeEventListener('resize', schedulePlace);
    host.removeEventListener('orientationchange', schedulePlace);
    visualViewport?.removeEventListener('resize', schedulePlace);
    visualViewport?.removeEventListener('scroll', schedulePlace);
    if ((host as unknown as Record<string, unknown>)[PANEL_RUNTIME_KEY] === teardown) {
      delete (host as unknown as Record<string, unknown>)[PANEL_RUNTIME_KEY];
    }
    try {
      if (doc.body) doc.body.inert = previousInert;
    } catch {
      // 老浏览器没有 inert，忽略
    }
    if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') {
      try {
        previousFocus.focus({ preventScroll: true });
      } catch {
        // 焦点恢复失败不影响关闭
      }
    }
  };
  (host as unknown as Record<string, unknown>)[PANEL_RUNTIME_KEY] = teardown;

  // 打开时把焦点收进面板并让背景 inert（读屏/键盘用户不会跑到后面的酒馆界面上）
  try {
    if (doc.body) doc.body.inert = true;
  } catch {
    // 忽略
  }
  try {
    ($close[0] as HTMLElement).focus({ preventScroll: true });
  } catch {
    // 忽略
  }

  console.info('[wxhl创意工坊] 面板已打开:', resolveWorkshopUrl());
}

/** 关面板不依赖闭包：直接查 DOM 移除，兼容脚本重载/重复实例（范例二的教训） */
export function closePanel(): void {
  const host = (window.parent ?? window) as Window;
  const doc = host.document;
  const panelEl = doc.getElementById(PANEL_ID);
  try {
    const popoverAware = panelEl as unknown as { matches?: (s: string) => boolean; hidePopover?: () => void };
    if (popoverAware?.matches?.(':popover-open')) popoverAware.hidePopover?.();
  } catch {
    // 不支持 popover 就忽略
  }
  panelEl?.remove();
  const teardown = (host as unknown as Record<string, unknown>)[PANEL_RUNTIME_KEY];
  if (typeof teardown === 'function') teardown();
  delete (host as unknown as Record<string, unknown>)[PANEL_RUNTIME_KEY];
}
