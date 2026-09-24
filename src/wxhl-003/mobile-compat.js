// 手机布局、面板尺寸与触摸拖动兼容补丁。
(() => {
  const hostWindow = window.parent;
  const hostDocument = hostWindow.document;
  const runtimeKey = '__WXHL_MOBILE_LAYOUT_ONLY_PATCH__';
  const positionKey = 'wxhl-mobile-orb-position-v2';

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

  const readSavedPosition = () => {
    try {
      const value = JSON.parse(hostWindow.localStorage.getItem(positionKey));
      return Number.isFinite(value?.left) && Number.isFinite(value?.top) ? value : null;
    } catch (_) {
      return null;
    }
  };

  const savePosition = (left, top) => {
    try {
      hostWindow.localStorage.setItem(positionKey, JSON.stringify({ left, top }));
    } catch (_) {
      /* 忽略 */
    }
  };

  /** 读「手机尺寸」设置（与小手机共享 localStorage wxhl003_settings），缺省 1 */
  const readPhoneScale = () => {
    try {
      const s = JSON.parse(hostWindow.localStorage.getItem('wxhl003_settings'));
      const v = Number(s?.phoneScale);
      return Number.isFinite(v) && v > 0 ? Math.min(Math.max(v, 0.5), 2) : 1;
    } catch (_) {
      return 1;
    }
  };

  const clampPosition = (left, top, width, height) => {
    const viewport = getViewport();
    const gap = 10;
    return {
      left: Math.min(Math.max(left, viewport.left + gap), viewport.left + viewport.width - width - gap),
      top: Math.min(Math.max(top, viewport.top + gap), viewport.top + viewport.height - height - gap),
    };
  };

  /**
   * 把元素定位到「视口坐标」(targetVL, targetVT)，对 fixed 包含块偏移免疫。
   * 手机端 fixed 的包含块可能不是视口（祖先 transform/filter/backdrop-filter 或 pinch-zoom），
   * 此时直接 left/top=视口坐标会跑偏（悬浮球被顶到角落、面板漂出屏幕——bug #1/#2 的共同根因）。
   * 做法：先按视口坐标设一次，再用 getBoundingClientRect（同为视口坐标）量出实际偏差并抵消，
   * 无论包含块如何都能落准。设置与校正在同一同步块内完成，中间无绘制、无闪烁。
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

  const placeButton = button => {
    if (!isPhone() || button.dataset.wxhlTouchDragging === '1') return;
    const viewport = getViewport();
    const width = 52;
    const height = 52;
    const saved = readSavedPosition();
    const initial = saved || {
      left: viewport.left + viewport.width - width - 14,
      top: viewport.top + viewport.height * 0.42 - height / 2,
    };
    const position = clampPosition(initial.left, initial.top, width, height);
    setImportant(button, {
      position: 'fixed',
      width: `${width}px`,
      height: `${height}px`,
      visibility: 'visible',
      opacity: '1',
      display: 'flex',
      'pointer-events': 'auto',
      'touch-action': 'none',
      'z-index': '2147483647',
    });
    placeAtViewport(button, position.left, position.top);
  };

  const bindTouchDrag = button => {
    if (button.dataset.wxhlTouchDragBound === '1') return;
    button.dataset.wxhlTouchDragBound = '1';
    let drag = null;
    let suppressClickUntil = 0;

    button.addEventListener(
      'pointerdown',
      event => {
        if (!isPhone() || event.button > 0) return;
        const rect = button.getBoundingClientRect();
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
        button.dataset.wxhlTouchDragging = '1';
        // 固定在当前视口位置（自校正包含块偏移），避免拖动起点跳变
        placeAtViewport(button, rect.left, rect.top);
        try {
          button.setPointerCapture(event.pointerId);
        } catch (_) {
          /* 忽略 */
        }
      },
      { capture: true },
    );

    button.addEventListener(
      'pointermove',
      event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        if (Math.hypot(deltaX, deltaY) >= 5) drag.moved = true;
        if (!drag.moved) return;
        event.preventDefault();
        const position = clampPosition(drag.left + deltaX, drag.top + deltaY, drag.width, drag.height);
        placeAtViewport(button, position.left, position.top);
      },
      { capture: true, passive: false },
    );

    const finishDrag = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const moved = drag.moved;
      drag = null;
      delete button.dataset.wxhlTouchDragging;
      try {
        button.releasePointerCapture(event.pointerId);
      } catch (_) {
        /* 忽略 */
      }
      if (moved) {
        const rect = button.getBoundingClientRect();
        savePosition(rect.left, rect.top);
        suppressClickUntil = Date.now() + 500;
        event.preventDefault();
        placeButton(button);
      } else {
        // 干净点按（未拖动）：统一由本补丁触发打开小手机。
        // 手机端悬浮球的「拖动」与「点按打开」都归这套管 —— 不再走 Vue 那套 hasMoved 点按判定，
        // 它会被残留坐标污染而把点按误判成拖动，导致关掉面板后再也点不开（本次修复的 bug）。
        try {
          hostWindow.__WXHL_OPEN_PHONE__?.();
        } catch (_) {
          /* 忽略 */
        }
      }
    };
    button.addEventListener('pointerup', finishDrag, { capture: true });
    button.addEventListener('pointercancel', finishDrag, { capture: true });
    button.addEventListener(
      'click',
      event => {
        if (Date.now() < suppressClickUntil) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      { capture: true },
    );
  };

  const fitOpenPanel = () => {
    if (!isPhone()) return;
    const root = hostDocument.querySelector('#wxhl003-root');
    const overlay = root?.querySelector('.panel-overlay');
    if (!overlay) return;
    const viewport = getViewport();
    // 覆盖层作背板，贴满可视视口（含 URL 栏 / pinch-zoom 补偿；位置同样自校正）
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

    const frame = overlay.querySelector('.phone-frame');
    if (frame) {
      // 状态栏页（sb-open）贴满可视视口；其余页按「手机尺寸」设置取 320×640 的缩放并夹到视口内
      const isSb = frame.classList.contains('sb-open');
      const ps = readPhoneScale();
      const fw = isSb ? viewport.width - 12 : Math.max(240, Math.min(320 * ps, viewport.width - 20));
      const fh = isSb ? viewport.height - 12 : Math.max(320, Math.min(640 * ps, viewport.height - 20));
      setImportant(frame, {
        position: 'fixed',
        width: `${fw}px`,
        height: `${fh}px`,
        'max-width': `${fw}px`,
        'max-height': `${fh}px`,
        margin: '0',
        'border-radius': isSb ? '14px' : '28px',
      });
      // 显式居中（不再靠 flex）。overlay 的 backdrop-filter 会让 fixed 的包含块变成它而非视口，
      // 直接 left/top=视口坐标会跑偏——placeAtViewport 量出实际偏差自校正，掰回可视视口正中。
      placeAtViewport(frame, viewport.left + (viewport.width - fw) / 2, viewport.top + (viewport.height - fh) / 2);
    }
    const minimize = overlay.querySelector('.minimize-btn');
    if (minimize) {
      setImportant(minimize, { top: '12px', right: '12px' });
    }
  };

  const update = () => {
    if (!isPhone()) return;
    const button = hostDocument.querySelector('#wxhl003-root .float-btn');
    if (button) {
      bindTouchDrag(button);
      placeButton(button);
    }
    fitOpenPanel();
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
