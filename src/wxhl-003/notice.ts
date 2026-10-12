// 新玩家须知：文案与「已读」标记。
// 标记只存本机浏览器（wxhl003_ 前缀），与储藏室/设置同一约定。
export const NOTICE_ITEMS: string[] = [
  '自由市场为线上云端市场，是和其他真人玩家共同的市场，请自觉维护市场，不要往市场里倒垃圾，白色钥匙什么的，一经发现封号处理',
  '工坊也联通了线上云端订单页面，可以发布你想要别人帮你制作的物品的订单，真人生活系玩家看到了会接取制作',
  '创意工坊在另外一个悬浮窗里，请确保酒馆助手内的脚本已开启',
  '论坛、攻略、职业规划，仅供参考，不会影响正文，如果想要对正文产生影响，建议复制进故事神喻插件，让故事神喻引导',
];
const KEY = 'wxhl003_notice_seen';
export function loadNoticeSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch (_) {
    return true;
  }
}
export function saveNoticeSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch (_) {
    /* 忽略 */
  }
}
