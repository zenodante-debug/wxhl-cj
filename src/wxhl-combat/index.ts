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

  // 修复脚本iframe隐藏时尺寸为0 → 覆盖层始终使用酒馆主页面尺寸
  const updateSize = () => {
    const w = window.parent.innerWidth || document.documentElement.clientWidth;
    const h = window.parent.innerHeight || document.documentElement.clientHeight;
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
