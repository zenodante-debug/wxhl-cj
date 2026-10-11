// src/wxhl-cygf/ball.ts
// 悬浮球：照 wxhl-003 小手机那套行为做的脚本版（可拖动 + 点按开面板）。
// 小手机是 Vue 组件 + mobile-compat.js 在手机上接管定位；工坊是脚本、没有 Vue，
// 所以这里用 jQuery 造 DOM、用 pointer 事件自己处理拖动（不碰 mobile-compat，它只认小手机的球）。
import { togglePanel } from './panel';

export const BALL_ID = 'wxhl-cygf-ball';
export const BALL_SIZE = 52;
/** 位移超过这个像素数就算「拖动」而非「点按」——照小手机 hasMoved 的口径 */
const DRAG_THRESHOLD = 4;
/** 位置存在脚本变量里（存 localStorage 在酒馆 iframe 里不一定可用；脚本变量是项目惯例） */
const POSITION_VAR_KEY = 'wxhl_cygf_ball_pos';
/** 挂在酒馆主窗口上的运行时键：热重载时用它找到并拆掉上一实例的球 */
const BALL_RUNTIME_KEY = '__wxhlCygfBallTeardown';

export function shouldTreatAsClick(dx: number, dy: number): boolean {
  return Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD;
}

/** 把球夹在视口内（视口比球还小时退回 0，不产生负坐标） */
export function clampBallPosition(
  left: number,
  top: number,
  viewportWidth: number,
  viewportHeight: number,
): { left: number; top: number } {
  const maxLeft = Math.max(0, viewportWidth - BALL_SIZE);
  const maxTop = Math.max(0, viewportHeight - BALL_SIZE);
  return {
    left: Math.min(Math.max(0, left), maxLeft),
    top: Math.min(Math.max(0, top), maxTop),
  };
}

/** 默认落点：右下角，离底留 96px 避开酒馆的输入框 */
export function defaultBallPosition(viewportWidth: number, viewportHeight: number): { left: number; top: number } {
  return { left: viewportWidth - BALL_SIZE - 16, top: viewportHeight - BALL_SIZE - 96 };
}

/** 校验存档：坏 JSON / 缺字段 / 非数字 / 负坐标一律 null（回退默认落点），别让一个坏值把球弄丢 */
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

function viewportSize(): { width: number; height: number } {
  try {
    const win = (window.parent ?? window) as Window & { visualViewport?: VisualViewport };
    const vv = win.visualViewport;
    return {
      width: Math.round(vv?.width || win.innerWidth || 400),
      height: Math.round(vv?.height || win.innerHeight || 800),
    };
  } catch {
    return { width: 400, height: 800 };
  }
}

function readSavedPosition(): { left: number; top: number } | null {
  try {
    if (typeof getVariables !== 'function' || typeof getScriptId !== 'function') return null;
    const vars = getVariables({ type: 'script', script_id: getScriptId() });
    return parseStoredPosition(vars?.[POSITION_VAR_KEY]);
  } catch {
    return null;
  }
}

function savePosition(pos: { left: number; top: number }): void {
  try {
    if (typeof getVariables !== 'function' || typeof getScriptId !== 'function') return;
    const vars = getVariables({ type: 'script', script_id: getScriptId() }) ?? {};
    vars[POSITION_VAR_KEY] = JSON.stringify(pos);
    replaceVariables(vars, { type: 'script', script_id: getScriptId() });
  } catch {
    // 存不上就算了，下次回到默认落点，不影响使用
  }
}

/** 静态样式（不含任何用户数据，无注入面）。层级在工坊面板(999980)与 toastr(999999)之下 */
function ensureStyle(): void {
  if ($(`#${BALL_ID}-style`).length) return;
  $('<style>')
    .attr('id', `${BALL_ID}-style`)
    .text(`
      #${BALL_ID}{position:fixed;width:${BALL_SIZE}px;height:${BALL_SIZE}px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;cursor:grab;user-select:none;
        touch-action:none;z-index:999970;font-size:24px;line-height:1;
        background:linear-gradient(160deg,#1e293b,#0f172a);color:#93c5fd;
        border:1px solid rgba(147,197,253,.35);box-shadow:0 6px 18px rgba(0,0,0,.45)}
      #${BALL_ID}:hover{border-color:rgba(147,197,253,.7);color:#bfdbfe}
      #${BALL_ID}.wxhl-cygf-ball-dragging{cursor:grabbing;opacity:.85}
    `)
    .appendTo('head');
}

/**
 * 装载悬浮球。重复装载会先拆掉上一实例（脚本热重载不触发 pagehide）。
 * 返回拆卸函数。
 */
export function installBall(): () => void {
  const target = (window.parent ?? window) as unknown as Record<string, unknown>;
  const previous = target[BALL_RUNTIME_KEY];
  if (typeof previous === 'function') previous();

  $(`#${BALL_ID}`).remove(); // 极端情况下（脚本被装两份）残留的旧球
  ensureStyle();

  const { width, height } = viewportSize();
  const saved = readSavedPosition() ?? defaultBallPosition(width, height);
  const initial = clampBallPosition(saved.left, saved.top, width, height);

  // 用 DOM API + textContent 装配（禁 innerHTML）：球内只有一个静态字形
  const $ball = $('<div>')
    .attr({ id: BALL_ID, title: '打开创意工坊' })
    .css({ left: `${initial.left}px`, top: `${initial.top}px` })
    .text('🧩');
  $ball.appendTo('body');
  const el = $ball[0] as HTMLElement;

  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let originLeft = initial.left;
  let originTop = initial.top;

  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    originLeft = parseFloat(el.style.left) || 0;
    originTop = parseFloat(el.style.top) || 0;
    try {
      el.setPointerCapture(event.pointerId);
    } catch {
      // 某些环境不支持指针捕获，拖动仍能工作（只是手指滑出球外会断）
    }
    $ball.addClass('wxhl-cygf-ball-dragging');
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!shouldTreatAsClick(dx, dy)) moved = true;
    const size = viewportSize();
    const pos = clampBallPosition(originLeft + dx, originTop + dy, size.width, size.height);
    $ball.css({ left: `${pos.left}px`, top: `${pos.top}px` });
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    $ball.removeClass('wxhl-cygf-ball-dragging');
    try {
      el.releasePointerCapture(event.pointerId);
    } catch {
      // 同上：没捕获过就不用释放
    }
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!moved && shouldTreatAsClick(dx, dy)) {
      togglePanel();
      return;
    }
    savePosition({ left: parseFloat(el.style.left) || 0, top: parseFloat(el.style.top) || 0 });
  };

  const onResize = () => {
    const size = viewportSize();
    const pos = clampBallPosition(parseFloat(el.style.left) || 0, parseFloat(el.style.top) || 0, size.width, size.height);
    $ball.css({ left: `${pos.left}px`, top: `${pos.top}px` });
  };

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  (window.parent ?? window).addEventListener('resize', onResize);

  const teardown = () => {
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerUp);
    (window.parent ?? window).removeEventListener('resize', onResize);
    $ball.remove();
    if (target[BALL_RUNTIME_KEY] === teardown) delete target[BALL_RUNTIME_KEY];
  };
  target[BALL_RUNTIME_KEY] = teardown;

  console.info('[wxhl创意工坊] 悬浮球已就位（点按开工坊，可拖动）');
  return teardown;
}
