// 本仓库的 tsconfig `types` 里没有 node（也刻意不装 @types/node），但 renderViews 这条
// 渲染防具需要在测试里读写临时文件。这里只补**它用到的那几个 API**的声明，
// 不动全局 tsconfig（把 node 加进全局 types 会连带改掉 setTimeout 等一堆既有推断）。
declare module 'node:fs' {
  const fs: {
    readFileSync(路径: string, 编码: string): string;
    writeFileSync(路径: string, 内容: string): void;
    rmSync(路径: string, 选项?: { force?: boolean }): void;
  };
  export default fs;
}

declare module 'node:path' {
  const path: {
    resolve(...段: string[]): string;
    join(...段: string[]): string;
  };
  export default path;
}

interface ImportMeta {
  /** Node 20.11+ / 22 提供（vitest 运行在 ESM 下） */
  readonly dirname: string;
}

// `vue/server-renderer` 的 .d.ts 会 `import { Writable, Readable } from 'node:stream'`，
// 本仓库没有 node 类型 → 补个最小声明，免得它为了一条 import 把 tsc 基线顶高。
declare module 'node:stream' {
  export class Readable {}
  export class Writable {}
}
