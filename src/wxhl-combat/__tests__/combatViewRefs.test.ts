import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse, compileScript } from 'vue/compiler-sfc';
import { ref } from 'vue';

// ================================================================
// 回归测试（2026-10-10）：**点开战 → `开战前上下文 is not defined`**
//
// 根因：`CombatView.vue` 的脚本里用了 `开战前上下文.value`（5 处）与 `开场模式.value`，
// 但**没人声明** —— 两个 `ref` 的声明行在写代码时漏掉了。
// `.vue` 文件没有类型检查（没有 vue-tsc），所以这种错**编译通过、运行时才炸**。
//
// 为什么现有的防线没抓到：
// - `viewScriptScope` 只查"**中文函数调用**没声明"，不查"变量名没声明"（`开战前上下文` 是属性访问，不是调用）；
// - `renderViews` 挂载的是 BattleView/SetupView…，**不挂 CombatView**（它引了 store.ts，要酒馆接口）。
//
// 这里把 CombatView 的脚本**编译出来**，然后把 `持久化附加` 那段中文函数抠出来真跑一遍：
// 没声明的名字会在调用的那一刻抛 ReferenceError —— 和玩家在酒馆里看到的一模一样。
// ================================================================

const 源 = readFileSync(path.resolve(import.meta.dirname, '../views/CombatView.vue'), 'utf8');
const { descriptor } = parse(源, { filename: 'CombatView.vue' });
const 编译后 = compileScript(descriptor, { id: 'CombatView.vue' }).content;

/** 把编译产物里某个中文函数抠出来（`const 名 = …;` / `function 名(…)`） */
function 抠函数(名: string): string {
  // compileScript 会把 script setup 里的顶层 `function X()` 照原样留下
  const 正则 = new RegExp(`(?:export\\s+)?(?:async\\s+)?function ${名}\\([\\s\\S]*?\\n\\}`, 'm');
  const 匹配 = 正则.exec(编译后);
  if (!匹配) throw new Error(`编译产物里没有函数「${名}」（结构变了？本测试需要跟着改）`);
  return 匹配[0];
}

describe('CombatView · 点开战不该 ReferenceError（2026-10-10 回归）', () => {
  it('持久化附加：四个 ref 都被声明过（缺了哪个跑这函数都会炸）', () => {
    // compileScript（dev 模式）**保留** TS 标注，顶层声明长成 `const 名 = ref<…>(…)`。
    // 断言用**正则**而不是 `.includes('ref(')` —— 中文里 `.includes` 的字符串拼接在这一步出过幺蛾子，
    // 名字本身要在场、同一行里还得真的在调 `ref(`（否则只是注释里提了一嘴）。
    for (const 名 of ['本战意图模式', '日志', '开战前上下文', '开场模式']) {
      const 命中 = new RegExp(`^\\s*const ${名}\\s*=\\s*ref[<(']`).test(编译后) ||
        new RegExp(`^\\s*const ${名}\\s*=\\s*ref`, 'm').test(编译后);
      expect(
        命中,
        `「${名}」在编译产物里没有被声明 —— 脚本里引用它的地方会在点开战时抛 ReferenceError`,
      ).toBe(true);
    }
  });

  it('真跑一遍持久化附加：四个值都拿得到（不给 ReferenceError 留门）', () => {
    const 码 = `
      const 本战意图模式 = ${'ref'}('ai');
      const 日志 = ${'ref'}(['a']);
      const 开战前上下文 = ${'ref'}('正文');
      const 开场模式 = ${'ref'}('对峙');
      ${抠函数('持久化附加')}
      return 持久化附加();
    `;
    const r = new Function('ref', 码)(ref);

    expect(r.意图模式).toBe('ai');
    expect(r.日志).toEqual(['a']);
    expect(r.开战前上下文).toBe('正文');
    expect(r.开场模式).toBe('对峙');
  });

  it('**反向钉子**：把声明抠掉，这函数就该炸（证明测试不是空转）', () => {
    const 码 = `
      const 本战意图模式 = ${'ref'}('ai');
      const 日志 = ${'ref'}([]);
      // 开战前上下文 故意不声明 —— 2026-10-10 的 bug 现场就是这个形状
      const 开场模式 = ${'ref'}('对峙');
      ${抠函数('持久化附加')}
      return 持久化附加();
    `;
    expect(() => new Function('ref', 码)(ref)).toThrow(/is not defined/);
  });
});
