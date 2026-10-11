export const BUTTON_NAME = '创意工坊';
export const PANEL_ID = 'wxhl-cygf-panel';
export const DEFAULT_WORKSHOP_URL = 'https://cygf.657868.xyz';
export const URL_OVERRIDE_KEY = 'wxhl_cygf_workshop_url';

const TOGGLE_DEBOUNCE_MS = 150;
let _lastToggleAt = 0;
let _escHandler: ((event: KeyboardEvent) => void) | null = null;

/** 工坊页面地址：脚本变量可覆盖；仅接受无凭据的 https 地址，其余回退默认 */
export function resolveWorkshopUrl(): string {
  try {
    if (typeof getVariables === 'function' && typeof getScriptId === 'function') {
      const override = getVariables({ type: 'script', script_id: getScriptId() })?.[URL_OVERRIDE_KEY];
      if (typeof override === 'string' && override !== '') {
        // 用 URL 解析而不是正则：正则既挡不住 https://x" onmouseover=… 这类破坏 HTML 属性的值，
        // 也挡不住 https://cygf.657868.xyz@evil.com 这类实际指向他域的 userinfo 地址（会污染桥接白名单）
        const url = new URL(override);
        if (url.protocol === 'https:' && url.username === '' && url.password === '') return url.href;
        console.warn(`[wxhl创意工坊] 忽略非法的工坊地址覆盖值: ${override}`);
      }
    }
  } catch {
    // 读脚本变量失败或 URL 解析失败不该炸面板，用默认地址
  }
  return DEFAULT_WORKSHOP_URL;
}

export function workshopOrigin(): string {
  return new URL(resolveWorkshopUrl()).origin;
}

export function shouldTogglePanel(now: number, lastToggle: number): boolean {
  return now - lastToggle >= TOGGLE_DEBOUNCE_MS;
}

function buildPanelHtml(): string {
  return `
    <div id="${PANEL_ID}" style="position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(8,10,18,.72);">
      <iframe class="wxhl-cygf-frame" src="${resolveWorkshopUrl()}"
        style="width:min(1180px,96vw);height:min(820px,92vh);border:none;border-radius:14px;background:#0f172a;box-shadow:0 12px 48px rgba(0,0,0,.5);"
        referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-read; clipboard-write"></iframe>
      <div class="wxhl-cygf-close" title="关闭工坊（也可点击遮罩空白处，或按 ESC）"
        style="position:fixed;top:14px;right:14px;width:46px;height:46px;border-radius:50%;background:rgba(25,18,14,.8);color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;">✕</div>
    </div>`;
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
  const $panel = $(buildPanelHtml()).appendTo('body');
  // 三重关闭：✕ 按钮 / 点击遮罩空白 / ESC（范例二验证过的做法）
  $panel.find('.wxhl-cygf-close').on('click', event => {
    event.stopPropagation();
    closePanel();
  });
  $panel.on('click', event => {
    if (event.target === $panel[0]) closePanel();
  });
  _escHandler = onEsc;
  window.parent.addEventListener('keydown', _escHandler);
  console.info('[wxhl创意工坊] 面板已打开:', resolveWorkshopUrl());
}

/** 关面板不依赖闭包：直接查 DOM 移除，兼容脚本重载/重复实例（范例二的教训） */
export function closePanel(): void {
  $(`#${PANEL_ID}`).remove();
  if (_escHandler) {
    window.parent.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }
}
