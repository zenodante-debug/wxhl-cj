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

  const clampPosition = (left, top, width, height) => {
    const viewport = getViewport();
    const gap = 10;
    return {
      left: Math.min(Math.max(left, viewport.left + gap), viewport.left + viewport.width - width - gap),
      top: Math.min(Math.max(top, viewport.top + gap), viewport.top + viewport.height - height - gap),
    };
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
      left: `${position.left}px`,
      top: `${position.top}px`,
      right: 'auto',
      bottom: 'auto',
      width: `${width}px`,
      height: `${height}px`,
      transform: 'none',
      visibility: 'visible',
      opacity: '1',
      display: 'flex',
      'pointer-events': 'auto',
      'touch-action': 'none',
      'z-index': '2147483647',
    });
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
        setImportant(button, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          right: 'auto',
          bottom: 'auto',
          transform: 'none',
        });
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
        setImportant(button, {
          left: `${position.left}px`,
          top: `${position.top}px`,
          right: 'auto',
          bottom: 'auto',
          transform: 'none',
        });
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
      const rect = button.getBoundingClientRect();
      if (moved) {
        savePosition(rect.left, rect.top);
        suppressClickUntil = Date.now() + 500;
        event.preventDefault();
      }
      placeButton(button);
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
    setImportant(overlay, {
      position: 'fixed',
      inset: 'auto',
      left: `${viewport.left}px`,
      top: `${viewport.top}px`,
      width: `${viewport.width}px`,
      height: `${viewport.height}px`,
      padding: '10px',
      'box-sizing': 'border-box',
      'align-items': 'center',
      'justify-content': 'center',
      overflow: 'hidden',
    });
    const frame = overlay.querySelector('.phone-frame');
    if (frame) {
      // 状态栏页（sb-open）在手机端贴满可见视口；其余页保持小手机尺寸
      if (frame.classList.contains('sb-open')) {
        setImportant(frame, {
          width: `${viewport.width - 12}px`,
          height: `${viewport.height - 12}px`,
          'max-width': `${viewport.width - 12}px`,
          'max-height': `${viewport.height - 12}px`,
          'border-radius': '14px',
        });
      } else {
        setImportant(frame, {
          width: `${Math.max(280, Math.min(390, viewport.width - 20))}px`,
          height: `${Math.max(360, Math.min(640, viewport.height - 20))}px`,
          'max-width': `${Math.max(280, viewport.width - 20)}px`,
          'max-height': `${Math.max(360, viewport.height - 20)}px`,
        });
      }
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
