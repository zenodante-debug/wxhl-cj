// 把工坊 Worker（TS 多文件工程）打成一个**可粘贴的单文件**——这是它在 Cloudflare 后台上线的方式。
//
//   node cloudflare/wxhl-cygf/build-bundle.mjs
//   → 产出 cloudflare/wxhl-cygf/worker.bundle.js（约 430KB）
//
// 为什么需要它：worker.ts 用了跨文件 import（`../../src/wxhl-cygf/pack` 的共享契约、
// workshop.html、page-lib.js），而 Cloudflare 后台的代码编辑器只接受**单文件**。
// 参考 wxhl-market：它的 worker.js 本来就是手写单文件，所以能直接粘贴；工坊是 TS 工程，必须先打包。
//
// 依赖 esbuild。本仓库没有装它（node_modules 里没有 esbuild），两条获取途径：
//   1) 正常网络：`npm i -D esbuild` 然后 `node_modules/.bin/esbuild`
//   2) 网络受限（本项目实测 npm registry 不通）：从 jsdelivr 取 esbuild-wasm，见文件末尾注释
//
// 打包要点：workshop.html 与 page-lib.js 必须按**文本**内联（对应 wrangler.toml 的 Text 规则）。
import { createRequire } from 'node:module';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)); // cloudflare/wxhl-cygf
const outfile = join(here, 'worker.bundle.js');

const require = createRequire(import.meta.url);
let esbuild;
let initialized = false;
try {
  esbuild = require('esbuild'); // 首选原生 esbuild
} catch {
  // 退回 esbuild-wasm（把下载好的包放在 /tmp/esb/node_modules/esbuild-wasm 或任意路径后改这里）
  const wasmPath = process.env.ESBUILD_WASM_PATH || 'C:/Users/zero/AppData/Local/Temp/esb/node_modules/esbuild-wasm';
  esbuild = createRequire(join(wasmPath, 'noop.js'))(wasmPath);
  await esbuild.initialize({});
  initialized = true;
}
if (!initialized && esbuild.initialize) await esbuild.initialize({});

await esbuild.build({
  entryPoints: [join(here, 'worker.ts')],
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  charset: 'utf8', // 中文直出，别转义成 \uXXXX
  mainFields: ['module', 'main'],
  outfile,
  plugins: [
    {
      name: 'text-assets',
      setup(build) {
        build.onLoad({ filter: /(workshop\.html|page-lib\.js)$/ }, async args => ({
          contents: await readFile(args.path, 'utf8'),
          loader: 'text',
        }));
      },
    },
  ],
  logLevel: 'warning',
});

const src = await readFile(outfile, 'utf8');
const { size } = await stat(outfile);
const checks = {
  字节数: size,
  无_require: !/require\(/.test(src),
  无_node_内置: !/["']node:/.test(src),
  含页面: src.includes('未经审核'),
  含子模块路由: src.includes('/page-lib.js'),
  含D1绑定名: src.includes('WORKSHOP_DB'),
};
console.log(checks);
if (!checks.无_require || !checks.无_node_内置 || !checks.含页面 || !checks.含子模块路由) {
  console.error('✗ 产物自检未通过，不要拿去部署');
  process.exit(1);
}
console.log('✓ 已生成', outfile);

// ———— 网络受限时怎么拿到 esbuild-wasm ————
//   mkdir -p /tmp/esb/node_modules/esbuild-wasm/{lib,bin}
//   for f in package.json wasm_exec.js wasm_exec_node.js esbuild.wasm lib/main.js lib/browser.js bin/esbuild; do
//     curl -sSL -o "/tmp/esb/node_modules/esbuild-wasm/$f" "https://cdn.jsdelivr.net/npm/esbuild-wasm@0.21.5/$f"
//   done
//   然后 ESBUILD_WASM_PATH=/tmp/esb/node_modules/esbuild-wasm node cloudflare/wxhl-cygf/build-bundle.mjs
