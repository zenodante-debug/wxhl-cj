// src/wxhl-cygf/index.ts
import { installBridge } from './bridge';
import { installAuthRelay } from './discord';
import { BUTTON_NAME, closePanel, togglePanel, workshopOrigin } from './panel';

declare const __WXHL_BUILD__: string; // webpack DefinePlugin 烙进产物的构建时间戳

function init() {
  // 版本横幅：排查"装的是不是最新包/装没装双份"全靠它
  console.info(`[wxhl创意工坊] 宿主脚本已加载 · 构建 ${typeof __WXHL_BUILD__ !== 'undefined' ? __WXHL_BUILD__ : '(dev)'}`);

  appendInexistentScriptButtons([{ name: BUTTON_NAME, visible: true }]);

  const teardownBridge = installBridge(workshopOrigin());
  const teardownAuth = installAuthRelay();

  eventOn(getButtonEvent(BUTTON_NAME), errorCatched(togglePanel));
  console.info(`[wxhl创意工坊] 已绑定按钮事件: ${BUTTON_NAME}`);

  $(window).off('pagehide.wxhlCygf').on('pagehide.wxhlCygf', () => {
    teardownBridge();
    teardownAuth();
    closePanel();
  });
}

$(() => {
  errorCatched(init)();
});
