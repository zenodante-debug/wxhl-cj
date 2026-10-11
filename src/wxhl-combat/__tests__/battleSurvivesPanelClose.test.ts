import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// ================================================================
// 玩家口径（2026-10-11）：
//   「战斗过程中的 ai 调用、战斗翻译解释、应该都是能够后台进行的。我退出悬浮窗也能够进行才对。」
//
// **先查清的事实**：AI 调用本来就不会被取消 —— 全仓库没有任何取消机制，
// `generateRaw` 的 promise 会一直跑到返回。真正断掉的是**组件**：
// `App.vue` 原来用 `v-if` 挂面板与页签 ⇒ **关面板 / 切页签 = 把 CombatView 销毁**。
// 销毁之后在飞的 `await` 往**死实例的 ref** 里写（日志丢、状态错位），
// 而且新实例的「忙碌」是 false ⇒ 玩家能再点一次「开始回合」⇒ 同一个回合被跑两遍。
//
// 修法：外层覆盖层与两个页签都改成 `v-show`（`display:none`，不渲染也不吃事件），
// 实例活着 ⇒ AI 调用 / 忙碌锁 / 日志 / 战斗状态全留在原地。
//
// 这条**只能读源码断言**：SSR 渲染看不到"切页签时组件有没有被销毁"这种生命周期行为，
// 而 App.vue 本来就没法在测试里真挂载（子组件里引了 store.ts 要酒馆接口）。
// ================================================================

const 源码 = fs.readFileSync(path.resolve(import.meta.dirname, '../App.vue'), 'utf8');

/** 取某个标签的完整开标签文本（够用即可：这些标签里没有嵌套的同名标签） */
function 开标签(标签: string): string {
  const m = new RegExp(`<${标签}\\b[^>]*>`).exec(源码);
  return m ? m[0] : '';
}

/** 剥掉注释再找 —— 否则**解释这条道理的注释本身**会被断言命中（踩过） */
function 去注释(文: string): string {
  return 文
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('关面板 / 切页签**不能销毁**战斗视图（AI 调用要能后台跑完）', () => {
  it('覆盖层用 `v-show`（`v-if` 会在关面板时把整棵子树拆掉）', () => {
    const m = /<div[^>]*class="combat-overlay"[^>]*>/.exec(源码);
    expect(m, '找不到 .combat-overlay 的开标签').toBeTruthy();
    expect(m![0]).toContain('v-show');
    expect(m![0]).not.toContain('v-if');
  });

  it('CombatView 用 `v-show`（切到设置页回来，战斗与日志都还在）', () => {
    const 标签 = 开标签('CombatView');
    expect(标签).toBeTruthy();
    expect(标签).toContain('v-show');
    expect(标签).not.toContain('v-if');
  });

  it('SettingsView 同理（同一个切换动作不该拆掉任何一个）', () => {
    const 标签 = 开标签('SettingsView');
    expect(标签).toBeTruthy();
    expect(标签).toContain('v-show');
    // 以前是 `v-else`：那意味着"不在战斗页签时才存在"，切来切去两边都在重建
    expect(标签).not.toContain('v-else');
  });

  it('悬浮球照旧用 `v-if`（面板开着时它本来就该消失，而且它没有在飞的活儿）', () => {
    expect(开标签('button')).toContain('v-if');
  });
});

describe('AI 调用不该被主动取消（没有取消机制才是"后台能跑完"的前提）', () => {
  it('战斗脚本里没有 AbortController / abort / signal —— 别在组件隐藏时把请求掐了', () => {
    // 只扫这几个源码目录（`node:*` 的 shim 里没有 Dirent / path.relative，不做递归遍历；
    // 新增目录时要记得加进来）
    const 目录们 = ['..', '../engine', '../ai', '../views'].map(d => path.resolve(import.meta.dirname, d));
    const 命中: string[] = [];

    for (const 目录 of 目录们) {
      for (const 名 of fs.readdirSync(目录)) {
        if (!/\.(ts|vue)$/.test(名)) continue;
        let 文: string;
        try {
          文 = fs.readFileSync(path.join(目录, 名), 'utf8');
        } catch {
          continue; // 目录 / 读不了的文件 → 跳过
        }
        if (/AbortController|\.abort\(|signal\s*:/.test(去注释(文))) 命中.push(名);
      }
    }

    expect(命中).toEqual([]);
  });
});
