import { createScriptIdDiv, teleportStyle } from '@util/script';
import App from './App.vue';
import { setReloadApp } from './reload';
import './global.css';

// 上一次挂载的清理函数：重载时先卸载再重挂，避免残留 DOM / 监听器 / teleport 样式。
let 清理上一个: (() => void) | null = null;

function mountApp() {
  // 可重入：进来先跑上一次的清理
  清理上一个?.();
  清理上一个 = null;

  const app = createApp(App).use(createPinia());

  const $app = createScriptIdDiv().attr('id', 'wxhl003-root').appendTo('body');

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

  清理上一个 = () => {
    window.removeEventListener('resize', updateSize);
    app.unmount();
    $app.remove();
    destroy();
  };

  // 供 App.vue 设置项调用（重载小手机）
  setReloadApp(mountApp);
}

// 左下角重载按钮：原生 DOM，不走 Vue —— 建在 app.mount() 之前，
// 即使 App 渲染半死也点得到。
function buildReloadButton() {
  if (document.getElementById('wxhl003-reload')) return;

  const btn = document.createElement('button');
  btn.id = 'wxhl003-reload';
  btn.type = 'button';
  btn.textContent = '↻';
  btn.title = '重载小手机（读不到变量结构时点这里）';
  Object.assign(btn.style, {
    position: 'fixed',
    left: '12px',
    bottom: '12px',
    zIndex: '2147483647',
    width: '34px',
    height: '34px',
    padding: '0',
    borderRadius: '50%',
    border: '1px solid rgba(140, 100, 40, 0.6)',
    background: '#1a130a',
    color: '#f0d080',
    fontSize: '18px',
    lineHeight: '1',
    cursor: 'pointer',
    opacity: '.45',
    transition: 'opacity .2s',
  });
  btn.addEventListener('mouseenter', () => {
    btn.style.opacity = '1';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.opacity = '.45';
  });
  btn.addEventListener('click', () => mountApp());

  document.body.appendChild(btn);
}

$(() => {
  buildReloadButton();
  mountApp();

  // pagehide 时跑清理（只注册一次）
  $(window).on('pagehide', () => {
    清理上一个?.();
    清理上一个 = null;
  });
});
