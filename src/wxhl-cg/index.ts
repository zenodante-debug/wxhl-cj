// ================================================================
// 回廊交易所 · 脚本入口：fixed 根节点挂 vue 面板 + initializeGlobal('WxhlCg')。
// 挂载模式照抄 wxhl-combat/index.ts（fixed 铺满 + z-index 拉满 + pointer-events:none 根节点）。
// ================================================================
import { createScriptIdDiv, teleportStyle } from '@util/script';
import ExchangePanel from './ui/ExchangePanel.vue';
import { useExchangeStore } from './store';

declare const __WXHL_BUILD__: string;

$(() => {
  console.log(`[wxhl-cg] 回廊交易所已加载 · 构建 ${typeof __WXHL_BUILD__ !== 'undefined' ? __WXHL_BUILD__ : '(dev)'}`);

  const app = createApp(ExchangePanel).use(createPinia());
  const $app = createScriptIdDiv().attr('id', 'wxhl-cg-root').appendTo('body');
  // 根节点不吃点击（酒馆页面照常能用），交互元素自己开 pointer-events（面板 .cg-panel 已开 auto）
  $app.css({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483647, pointerEvents: 'none' });

  // 修复脚本 iframe 隐藏时尺寸为 0 → 覆盖层始终使用酒馆主页面尺寸（优先 visualViewport）
  const updateSize = () => {
    const vv = (window.parent as any).visualViewport;
    const w = Math.round(vv?.width || window.parent.innerWidth || document.documentElement.clientWidth);
    const h = Math.round(vv?.height || window.parent.innerHeight || document.documentElement.clientHeight);
    $app.css({ width: w, height: h });
  };
  updateSize();
  window.addEventListener('resize', updateSize);

  const { destroy } = teleportStyle();
  app.mount($app[0]);

  const store = useExchangeStore();
  const api = {
    open: () => store.open(),
    close: () => store.close(),
    isOpen: () => store.panelOpen,
  };
  // 两条发布通道，手机侧按此顺序找：
  // 1. window.parent.WxhlCg —— 同源直连（脚本 iframe 与酒馆页面同源）
  try {
    (window.parent as any).WxhlCg = api;
  } catch (e) {
    console.warn('[wxhl-cg] 无法挂到 window.parent.WxhlCg:', e);
  }
  // 2. initializeGlobal —— 酒馆助手的全局接口共享
  try {
    initializeGlobal('WxhlCg', api);
  } catch (e) {
    console.warn('[wxhl-cg] initializeGlobal 不可用:', e);
  }
  console.info('[wxhl-cg] 交易接口已发布（window.parent.WxhlCg / initializeGlobal）');

  $(window).on('pagehide', () => {
    store.close();
    window.removeEventListener('resize', updateSize);
    app.unmount();
    $app.remove();
    destroy();
  });
});
