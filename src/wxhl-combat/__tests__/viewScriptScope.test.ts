import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { parse } from 'vue/compiler-sfc';

// ================================================================
// 防具：`.vue` 的脚本作用域 —— "在 try 里声明、在 finally 里引用"
//
// 为什么要有：这会在 `finally` 里抛 ReferenceError，**紧跟其后的清理代码全部被跳过**
// （`忙碌.value = false` 就在后面）→ 界面永远卡在忙碌态。
// 实战踩过：CombatView 的 `本轮已结算` 声明在 try 块里、finally 里引用 →
// 每次点「执行本轮」都卡在「结算本轮…」转不动。
//
// `.vue` 的脚本没有任何类型检查（无 vue-tsc），所以这里用 TypeScript 编译器 API 真解析一遍。
// ================================================================

const 视图目录 = path.resolve(import.meta.dirname, '../views');

/** 取 SFC 的脚本源码（script setup 优先） */
function 取脚本(文件名: string): string {
  const 源 = fs.readFileSync(path.join(视图目录, 文件名), 'utf8');
  const { descriptor } = parse(源, { filename: 文件名 });
  return [descriptor.scriptSetup?.content, descriptor.script?.content].filter(Boolean).join('\n');
}

/** 该节点是否在某棵子树内 */
function 在内(节点: ts.Node, 子树: ts.Node): boolean {
  let 当前: ts.Node | undefined = 节点;
  while (当前) {
    if (当前 === 子树) return true;
    当前 = 当前.parent;
  }
  return false;
}

/** 源码里所有变量声明（名字 → 声明节点） */
function 收集变量声明(源: string): { 源文件: ts.SourceFile; 声明: Map<string, ts.Node[]> } {
  const 源文件 = ts.createSourceFile('v.ts', 源, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const 声明 = new Map<string, ts.Node[]>();

  const 走 = (节点: ts.Node) => {
    if (ts.isVariableDeclaration(节点) && ts.isIdentifier(节点.name)) {
      const 名 = 节点.name.text;
      声明.set(名, [...(声明.get(名) ?? []), 节点]);
    }
    ts.forEachChild(节点, 走);
  };
  走(源文件);
  return { 源文件, 声明 };
}

/** 找出「只在某个 try 块里声明、却被同一个 try 的 finally 引用」的名字 */
function 找跨作用域引用(源: string): string[] {
  const { 源文件, 声明 } = 收集变量声明(源);
  const 问题: string[] = [];

  const 走 = (节点: ts.Node) => {
    if (ts.isTryStatement(节点) && 节点.finallyBlock) {
      const try块 = 节点.tryBlock;

      // finally 里引用到的名字
      const 引用 = new Set<string>();
      const 收引用 = (n: ts.Node) => {
        if (ts.isIdentifier(n)) 引用.add(n.text);
        ts.forEachChild(n, 收引用);
      };
      收引用(节点.finallyBlock);

      for (const 名 of 引用) {
        const 全部声明 = 声明.get(名);
        if (!全部声明 || 全部声明.length === 0) continue; // 不是变量（import / 函数参数 / 外部全局）
        // 这个名字的**每一处**声明都在这一个 try 块里 → 出了 try 就是未定义
        if (全部声明.every(d => 在内(d, try块))) {
          问题.push(`${名}（在第 ${源文件.getLineAndCharacterOfPosition(节点.getStart()).line + 1} 行的 try 里声明，却在 finally 里用）`);
        }
      }
    }
    ts.forEachChild(节点, 走);
  };
  走(源文件);
  return 问题;
}

describe('views 的脚本作用域（try/finally 不能跨作用域引用）', () => {
  const 视图 = fs.readdirSync(视图目录).filter(f => f.endsWith('.vue'));

  it('至少扫到了所有视图（防"扫了个空"）', () => {
    expect(视图.length).toBeGreaterThanOrEqual(5);
  });

  for (const 文件名 of 视图) {
    it(`${文件名}：没有 try 内声明 / finally 内引用`, () => {
      // 先确认这条规则本身有效：把 for 循环换成 checkSource 的自检见下一个用例
      expect(找跨作用域引用(取脚本(文件名))).toEqual([]);
    });
  }

  it('**规则自检**：故意写一段坏码，必须被查出来（否则这条防具是假的）', () => {
    const 坏码 = `
      async function f() {
        let 进下一回合 = false;
        try {
          let 本轮已结算 = false;
          本轮已结算 = true;
        } finally {
          if (本轮已结算) 清空();
          忙碌 = false;
        }
      }
    `;
    const 问题 = 找跨作用域引用(坏码);
    expect(问题).toHaveLength(1);
    expect(问题[0]).toContain('本轮已结算');
  });

  it('规则自检：声明在 try 外面的不会被误报', () => {
    const 好码 = `
      async function f() {
        let 本轮已结算 = false;
        try { 本轮已结算 = true; } finally { if (本轮已结算) 清空(); }
      }
    `;
    expect(找跨作用域引用(好码)).toEqual([]);
  });
});
