export const BUTTON_NAME = '创意工坊';
export const PANEL_ID = 'wxhl-cygf-panel';
export const DEFAULT_WORKSHOP_URL = 'https://cygf.657868.xyz';
export const URL_OVERRIDE_KEY = 'wxhl_cygf_workshop_url';

const TOGGLE_DEBOUNCE_MS = 150;
let _lastToggleAt = 0;
/** 挂在酒馆主窗口上的运行时键：热重载时用它找到并拆掉上一实例的 ESC 监听 */
const PANEL_ESC_RUNTIME_KEY = '__wxhlCygfPanelEscTeardown';

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

/** 用 DOM API 装配面板：src/text 走属性/文本设置，不经过 HTML 解析，结构性杜绝属性逃逸 */
function buildPanel(): JQuery {
  const $panel = $('<div>').attr('id', PANEL_ID).css({
    position: 'fixed',
    inset: '0',
    // 必须低于 toastr 容器（z-index 999999）：遮罩若盖在 toastr 之上，
    // 面板打开期间所有提示（登录成败、弹出窗口被拦截的告警）都会被遮住看不见。
    // 999980 低于 toastr、又高于酒馆主界面，与 wxhl-003 遮罩（99998）同思路。
    zIndex: 999980,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(8,10,18,.72)',
  });
  const $frame = $('<iframe>')
    .addClass('wxhl-cygf-frame')
    .attr({
      src: resolveWorkshopUrl(),
      referrerpolicy: 'strict-origin-when-cross-origin',
      allow: 'clipboard-read; clipboard-write',
    })
    .css({
      width: 'min(1180px,96vw)',
      height: 'min(820px,92vh)',
      border: 'none',
      borderRadius: '14px',
      background: '#0f172a',
      boxShadow: '0 12px 48px rgba(0,0,0,.5)',
    });
  const $close = $('<div>')
    .addClass('wxhl-cygf-close')
    .attr('title', '关闭工坊（也可点击遮罩空白处，或按 ESC）')
    .text('✕')
    .css({
      position: 'fixed',
      top: '14px',
      right: '14px',
      width: '46px',
      height: '46px',
      borderRadius: '50%',
      background: 'rgba(25,18,14,.8)',
      color: '#fff',
      fontSize: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
    });
  return $panel.append($frame, $close);
}

function onEsc(event: KeyboardEvent): void {
  if (event.key === 'Escape') closePanel();
}

/** 打开/关闭面板（带防抖）。脚本的 $ 直接作用于酒馆主页面。 */
export function togglePanel(): void {
  const now = Date.now();
  if (!shouldTogglePanel(now, _lastToggleAt)) return;
  _lastToggleAt = now;

  const $existing = $(`#${PANEL_ID}`);
  if ($existing.length > 0) {
    closePanel();
    return;
  }
  const $panel = buildPanel().appendTo('body');
  // 三重关闭：✕ 按钮 / 点击遮罩空白 / ESC（范例二验证过的做法）
  $panel.find('.wxhl-cygf-close').on('click', event => {
    event.stopPropagation();
    closePanel();
  });
  $panel.on('click', event => {
    if (event.target === $panel[0]) closePanel();
  });
  // 热重载不触发 pagehide：用运行时键先拆上一实例的 ESC 监听，否则每次重载后按 ESC 会叠一层关面板
  const parent = window.parent;
  const previous = (parent as any)[PANEL_ESC_RUNTIME_KEY];
  if (typeof previous === 'function') previous();

  parent.addEventListener('keydown', onEsc);
  const teardown = () => {
    parent.removeEventListener('keydown', onEsc);
    if ((parent as any)[PANEL_ESC_RUNTIME_KEY] === teardown) delete (parent as any)[PANEL_ESC_RUNTIME_KEY];
  };
  (parent as any)[PANEL_ESC_RUNTIME_KEY] = teardown;

  console.info('[wxhl创意工坊] 面板已打开:', resolveWorkshopUrl());
}

/** 关面板不依赖闭包：直接查 DOM 移除，兼容脚本重载/重复实例（范例二的教训） */
export function closePanel(): void {
  $(`#${PANEL_ID}`).remove();
  const parent = window.parent;
  const teardown = (parent as any)[PANEL_ESC_RUNTIME_KEY];
  if (typeof teardown === 'function') teardown();
  delete (parent as any)[PANEL_ESC_RUNTIME_KEY];
}
