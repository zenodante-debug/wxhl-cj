import { describe, expect, it } from 'vitest';
import { NOTICE_ITEMS, loadNoticeSeen } from '../notice';

// 约定文案：与 notice.ts 一字不差，防止被无意改动
const EXPECTED = [
  '自由市场为线上云端市场，是和其他真人玩家共同的市场，请自觉维护市场，不要往市场里倒垃圾，白色钥匙什么的，一经发现封号处理',
  '工坊也联通了线上云端订单页面，可以发布你想要别人帮你制作的物品的订单，真人生活系玩家看到了会接取制作',
  '创意工坊在另外一个悬浮窗里，请确保酒馆助手内的脚本已开启',
  '论坛、攻略、职业规划，仅供参考，不会影响正文，如果想要对正文产生影响，建议复制进故事神喻插件，让故事神喻引导',
];

describe('新玩家须知 · 文案', () => {
  it('恰好 4 条', () => {
    expect(NOTICE_ITEMS).toHaveLength(4);
  });

  it('逐字等于约定文案（顺序一致）', () => {
    expect(NOTICE_ITEMS).toEqual(EXPECTED);
  });
});

describe('新玩家须知 · 已读标记', () => {
  it('localStorage 不可用时 loadNoticeSeen() 不抛异常，且返回 true（宁可不弹）', () => {
    const had = 'localStorage' in globalThis;
    const orig = (globalThis as any).localStorage;
    try {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('no localStorage');
        },
      });
      expect(() => loadNoticeSeen()).not.toThrow();
      expect(loadNoticeSeen()).toBe(true);
    } finally {
      if (had) {
        Object.defineProperty(globalThis, 'localStorage', {
          configurable: true,
          writable: true,
          value: orig,
        });
      } else {
        Reflect.deleteProperty(globalThis, 'localStorage');
      }
    }
  });
});
