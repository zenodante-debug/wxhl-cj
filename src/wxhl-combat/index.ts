import { createScriptIdDiv, teleportStyle } from '@util/script';
import App from './App.vue';

declare const __WXHL_BUILD__: string; // webpack DefinePlugin 烙进产物的构建时间戳

$(() => {
  // 版本横幅：加载即打印。排查"装的是不是最新包 / 是不是装了双份脚本"全靠它 —
  // 若是旧脚本（或装了两份），这里会看到旧时间戳 / 打两次。
  console.log(`[wxhl-combat] 战斗引擎已加载 · 构建 ${typeof __WXHL_BUILD__ !== 'undefined' ? __WXHL_BUILD__ : '(dev)'}`);

  const app = createApp(App).use(createPinia());

  const $app = createScriptIdDiv()
    .attr('id', 'wxhl-combat-root')
    .appendTo('body');

  // 根节点：固定铺满视口、不吃酒馆页面布局、**层级拉到最大**。
  //
  // 三件事都必须做，否则手机端会出现"悬浮球被美化正则/楼层盖住，点都点不了"：
  // 1. `position: fixed` + 铺满：否则它是酒馆 body 里的一个普通块（body 常常是 flex），
  //    既会挤压酒馆布局，又让里面的 `position: fixed` 子元素受祖先层叠上下文牵连。
  // 2. `z-index: 2147483647`（int32 上限）：美化正则/状态栏模板很爱用这个值，
  //    我们只要低一位（2147483645）就会被它们盖住。拉满后同级靠 DOM 顺序决胜 —— 我们是后挂载的。
  // 3. `pointer-events: none`：根节点不吃点击（酒馆页面照常能用），
  //    交互元素自己开 `pointer-events: auto`（悬浮球/面板本来就有）。
  $app.css({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2147483647,
    pointerEvents: 'none',
  });

  // 修复脚本iframe隐藏时尺寸为0 → 覆盖层始终使用酒馆主页面尺寸。
  // **优先用 visualViewport**：手机浏览器的 innerHeight 包含地址栏，
  // 用它定尺寸会让面板比可视区更高、把顶栏的关闭按钮顶出屏幕
  // （手机端补丁 mobile-compat.js 还会再兜一层，这里是第一道）。
  const updateSize = () => {
    const vv = (window.parent as any).visualViewport;
    const w = Math.round(vv?.width || window.parent.innerWidth || document.documentElement.clientWidth);
    const h = Math.round(vv?.height || window.parent.innerHeight || document.documentElement.clientHeight);
    // 外层已铺满视口；这里只需让**内层**也是可视视口大小
    $app.css({ width: w, height: h });
  };
  updateSize();
  window.addEventListener('resize', updateSize);

  const { destroy } = teleportStyle();

  app.mount($app[0]);

  $(window).on('pagehide', () => {
    window.removeEventListener('resize', updateSize);
    app.unmount();
    $app.remove();
    destroy();
  });
});
