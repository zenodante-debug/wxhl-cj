import { createScriptIdDiv, teleportStyle } from '@util/script';
import App from './App.vue';
import './global.css';

$(() => {
  const app = createApp(App).use(createPinia());

  const $app = createScriptIdDiv()
    .attr('id', 'wxhl003-root')
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
