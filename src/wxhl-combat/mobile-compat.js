// 手机布局与触摸兼容补丁（**照抄 wxhl-003/mobile-compat.js 的做法**，只换成本项目的选择器）。
//
// 为什么需要它：`index.ts` 用 `window.parent.innerWidth/innerHeight` 给根容器定尺寸，
// 而手机浏览器的 innerHeight **包含地址栏**（且酒馆宿主可能有 transform/backdrop-filter，
// 会让 position:fixed 的包含块不再是视口）。结果是面板比可视区更高、
// **关闭按钮被顶到屏幕外**（实战反馈：手机端一打开，✕ 就在屏幕外点不到）。
//
// 两个关键手法（与 wxhl-003 完全一致）：
// 1. 一律以 `visualViewport` 为准定尺寸与位置（而不是 innerWidth/innerHeight）。
// 2. `placeAtViewport`：先按视口坐标设一次，再用 getBoundingClientRect 量出实际偏差并抵消 ——
//    对 fixed 包含块偏移免疫，无论宿主套了什么 transform 都能落准。
(() => {
  const hostWindow = window.parent;
  const hostDocument = hostWindow.document;
  const runtimeKey = '__WXHL_COMBAT_MOBILE_PATCH__';
  const ROOT_SELECTOR = '#wxhl-combat-root';
  const positionKey = 'wxhl-combat-orb-position-v1'; // 与 App.vue 的拖动持久化共用同一个键

  if (typeof hostWindow[runtimeKey] === 'function') {
    hostWindow[runtimeKey]();
  }

  const isPhone = () => {
    const coarse = hostWindow.matchMedia?.('(pointer: coarse)')?.matches;
    const noHover = hostWindow.matchMedia?.('(hover: none)')?.matches;
    const viewportWidth = hostWindow.visualViewport?.width || hostWindow.innerWidth || 9999;
    return Boolean(coarse || noHover || viewportWidth <= 768);
  };

  const getViewport = () => {
    const viewport = hostWindow.visualViewport;
    return {
      left: viewport?.offsetLeft || 0,
      top: viewport?.offsetTop || 0,
      width: viewport?.width || hostWindow.innerWidth,
      height: viewport?.height || hostWindow.innerHeight,
    };
  };

  const setImportant = (element, values) => {
    for (const [name, value] of Object.entries(values)) {
      element.style.setProperty(name, value, 'important');
    }
  };

  const clampPosition = (left, top, width, height, gap = 10) => {
    const viewport = getViewport();
    return {
      left: Math.min(Math.max(left, viewport.left + gap), viewport.left + viewport.width - width - gap),
      top: Math.min(Math.max(top, viewport.top + gap), viewport.top + viewport.height - height - gap),
    };
  };

  /**
   * 把元素定位到「视口坐标」(targetVL, targetVT)，对 fixed 包含块偏移免疫。
   * 手机端 fixed 的包含块可能不是视口（祖先 transform/filter/backdrop-filter 或 pinch-zoom），
   * 此时直接 left/top=视口坐标会跑偏（面板漂出屏幕就是这个原因）。
   * 做法：先按视口坐标设一次，再用 getBoundingClientRect（同为视口坐标）量出实际偏差并抵消。
   * 设置与校正在同一同步块内完成，中间无绘制、无闪烁。
   */
  const placeAtViewport = (el, targetVL, targetVT) => {
    setImportant(el, {
      left: `${targetVL}px`,
      top: `${targetVT}px`,
      right: 'auto',
      bottom: 'auto',
      transform: 'none',
    });
    const rect = el.getBoundingClientRect();
    const dx = targetVL - rect.left;
    const dy = targetVT - rect.top;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      setImportant(el, { left: `${targetVL + dx}px`, top: `${targetVT + dy}px` });
    }
  };

  /** 悬浮球：夹进可视视口（App.vue 自己管拖动，这里只做"跑到屏幕外就拉回来"的兜底） */
  const placeLauncher = () => {
    const root = hostDocument.querySelector(ROOT_SELECTOR);
    const button = root?.querySelector('.combat-launcher');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const viewport = getViewport();
    const 出界 =
      rect.right < viewport.left + 4 ||
      rect.left > viewport.left + viewport.width - 4 ||
      rect.bottom < viewport.top + 4 ||
      rect.top > viewport.top + viewport.height - 4;
    if (!出界) {
      // 在视野内 → 只保证可见性与触摸滚动别抢走拖动
      setImportant(button, { visibility: 'visible', opacity: '1', 'touch-action': 'none' });
      return;
    }
    const 尺寸 = { w: rect.width || 52, h: rect.height || 52 };
    let 目标 = null;
    try {
      目标 = JSON.parse(hostWindow.localStorage.getItem(positionKey));
    } catch (_) {
      /* 忽略 */
    }
    const 起点 =
      Number.isFinite(目标?.left) && Number.isFinite(目标?.top)
        ? { left: 目标.left, top: 目标.top }
        : { left: viewport.left + viewport.width - 尺寸.w - 14, top: viewport.top + viewport.height * 0.42 };
    const 位置 = clampPosition(起点.left, 起点.top, 尺寸.w, 尺寸.h);
    setImportant(button, {
      position: 'fixed',
      width: `${尺寸.w}px`,
      height: `${尺寸.h}px`,
      visibility: 'visible',
      opacity: '1',
      display: 'flex',
      'pointer-events': 'auto',
      'touch-action': 'none',
      'z-index': '2147483647',
    });
    placeAtViewport(button, 位置.left, 位置.top);
  };

  /**
   * 面板：贴满可视视口。
   * 关键是**面板本身的高度不能超过可视区** —— 顶栏（含 ✕ 关闭按钮）在面板顶部，
   * 一旦面板比可视区高，✕ 就会被顶出屏幕。所以这里强制 高度 = 可视高度 − 边距，
   * 内容由 `.shell-body` 自己滚。
   */
  const fitShell = () => {
    const root = hostDocument.querySelector(ROOT_SELECTOR);
    if (!root) return;
    const viewport = getViewport();

    // 根容器：贴满可视视口（不再用含地址栏的 innerHeight）
    setImportant(root, {
      position: 'fixed',
      inset: 'auto',
      width: `${viewport.width}px`,
      height: `${viewport.height}px`,
      padding: '0',
      'box-sizing': 'border-box',
      overflow: 'hidden',
    });
    placeAtViewport(root, viewport.left, viewport.top);

    const overlay = root.querySelector('.combat-overlay');
    if (overlay) {
      setImportant(overlay, {
        position: 'fixed',
        inset: 'auto',
        width: `${viewport.width}px`,
        height: `${viewport.height}px`,
        padding: '0',
        'box-sizing': 'border-box',
        overflow: 'hidden',
      });
      placeAtViewport(overlay, viewport.left, viewport.top);
    }

    const shell = root.querySelector('.combat-shell');
    if (shell) {
      const 边距 = 8;
      const 宽 = Math.max(240, Math.min(viewport.width - 边距 * 2, viewport.width - 边距 * 2));
      const 高 = Math.max(240, viewport.height - 边距 * 2);
      setImportant(shell, {
        position: 'fixed',
        width: `${宽}px`,
        height: `${高}px`,
        'max-width': `${宽}px`,
        'max-height': `${高}px`,
        margin: '0',
        'border-radius': '12px',
      });
      // 显式居中（不靠 flex）：overlay 的 backdrop-filter 会让 fixed 的包含块变成它而非视口
      placeAtViewport(shell, viewport.left + (viewport.width - 宽) / 2, viewport.top + 边距);
    }

    // 顶栏：不许换行把 ✕ 挤走，且各页签可横向滚
    const topbar = root.querySelector('.shell-topbar');
    if (topbar) {
      setImportant(topbar, { 'flex-wrap': 'nowrap', 'overflow-x': 'auto', 'align-items': 'center' });
    }
    const close = root.querySelector('.shell-close');
    if (close) {
      setImportant(close, {
        'flex-shrink': '0',
        'min-width': '30px',
        'min-height': '30px',
        'margin-left': 'auto',
      });
    }
  };

  const update = () => {
    if (!isPhone()) return;
    placeLauncher();
    fitShell();
  };

  const observer = new hostWindow.MutationObserver(update);
  observer.observe(hostDocument.documentElement, { childList: true, subtree: true });
  const timer = hostWindow.setInterval(update, 700);
  hostWindow.addEventListener('resize', update);
  hostWindow.visualViewport?.addEventListener('resize', update);
  hostWindow.visualViewport?.addEventListener('scroll', update);
  update();

  const cleanup = () => {
    observer.disconnect();
    hostWindow.clearInterval(timer);
    hostWindow.removeEventListener('resize', update);
    hostWindow.visualViewport?.removeEventListener('resize', update);
    hostWindow.visualViewport?.removeEventListener('scroll', update);
  };
  hostWindow[runtimeKey] = cleanup;
  window.addEventListener(
    'pagehide',
    () => {
      if (hostWindow[runtimeKey] === cleanup) {
        cleanup();
        delete hostWindow[runtimeKey];
      }
    },
    { once: true },
  );
})();
