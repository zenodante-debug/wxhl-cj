// 重载入口：index.ts 挂载后注册，App.vue 的设置项调用。
// 用模块级函数而非全局变量，免得污染 window。
let _reload: (() => void) | null = null;
export function setReloadApp(fn: () => void) {
  _reload = fn;
}
export function reloadApp() {
  _reload?.();
}
