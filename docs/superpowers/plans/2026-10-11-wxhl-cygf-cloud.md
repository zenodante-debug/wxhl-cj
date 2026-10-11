# wxhl-cygf 云端工坊 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现云端工坊一期——`cloudflare/wxhl-cygf/` 下的注册表 Worker（TS）+ 单文件工坊页面（无构建）+ 匿名上传（管理密钥），并给宿主脚本补 `deleteWorkshopEntries` 原语与 pack 契约的显式 zod 导入。

**Architecture:** Worker 直接 import 主仓 `src/wxhl-cygf/pack/` 的 zod 契约（包格式单一真源）；工坊页面是 `workshop.html`（原生 JS），逻辑层在 `page-lib.js`（纯 JS ES module，vitest 可测、浏览器可直接 import）；宿主与页面间走既有桥协议。

**Tech Stack:** Cloudflare Worker (TypeScript) + D1 + wrangler；页面原生 JS；vitest（cloudflare 下测试为 `.test.js`）。

**Spec:** [docs/superpowers/specs/2026-10-11-wxhl-cygf-cloud-design.md](../specs/2026-10-11-wxhl-cygf-cloud-design.md)

## Global Constraints

- **禁 pnpm**：测试 `npx vitest run`，构建 `npm run build`，wrangler 用 `npx wrangler`
- 响亮失败：校验失败、密钥错误、桥超时一律给人话错误，禁静默
- **cloudflare 下的测试文件必须是 `.test.js`**（仓库 vitest include 只收 `cloudflare/**/*.test.js`）；页面逻辑层 `page-lib.js` 用**纯 JS**（浏览器直接 import，不经过构建）
- worker.ts 用 TypeScript；`vi.mock('./workshop.html', ...)` 与 `vi.mock('./page-lib.js', ...)` 在 worker.test.js 顶部拦截文本资源（vitest 不识别 wrangler 的 Text 规则）
- 页面渲染投稿内容**一律 textContent**，禁 innerHTML 拼接
- 常量逐字固定：世界书名 `无限回廊mod`；桥 channel `wxhl-workshop:worldbook`；域名 `cygf.657868.xyz`；管理密钥 32 位十六进制（`crypto.randomUUID()` 去横线）；包 id 8 位 base62
- **共享分支纪律**：另一个会话在同分支并行提交 wxhl-combat——提交一律显式圈定 `cloudflare/wxhl-cygf/`、`src/wxhl-cygf/`、`dist/wxhl-cygf/` 路径，禁 `git add -A`
- commit 格式：`feat(wxhl-cygf): ...` / `fix(wxhl-cygf): ...`
- 部署（wrangler login / d1 create / deploy）是外向操作，需用户在场配合，见 Task 6

## Review Focus

spec 未显式覆盖、最可能咬人的五类输入（每条已把测试钉进对应任务）：

1. **玩家在搜索框里输入 LIKE 通配符**（`%`、`_`、`\`）→ 预期：按字面量搜索，不当通配符 → Task 2 `likeEscape` 测试钉住
2. **管理密钥错误** → 预期：统一 403，不区分「包不存在」与「密钥不对」（不泄露包的存在性） → Task 3 测试钉住
3. **超大/超字段的包**（pack_json > 256KB、名称 > 100、条目 > 100）→ 预期：413/422 人话拒绝 → Task 3 测试钉住
4. **页面在酒馆外直接打开**（宿主脚本没装）→ 预期：`getContext` 30s 超时后显示引导文案，而不是永远转圈 → Task 4 桥客户端超时测试钉住
5. **随机包 id 撞车** → 预期：撞车重试一次再失败才报错 → Task 3 测试钉住

---

### Task 1: 宿主侧小改（pack 显式 zod 导入 + deleteWorkshopEntries 原语）

**Files:**
- Modify: `src/wxhl-cygf/pack/manifest.ts`、`src/wxhl-cygf/pack/extension.ts`、`src/wxhl-cygf/pack/build.ts`、`src/wxhl-cygf/pack/character.ts`、`src/wxhl-cygf/pack/index.ts`（各加一行 `import { z } from 'zod';`）
- Modify: `src/wxhl-cygf/actions.ts`（加 `deleteWorkshopEntries`）
- Test: `src/wxhl-cygf/__tests__/actions.test.ts`

**Interfaces:**
- Consumes: 现有 `requireString` / `matchesSource` / `MUTATING_ACTIONS` / `SourceMeta`
- Produces（云端 Task 4 依赖）: 桥动作 `deleteWorkshopEntries`，payload `{ worldbookName: string, sourceMeta: { sourceId: string, sourceType?: string } }`，返回 `{ removed: number }`

- [ ] **Step 1: Write the failing test**

在 `src/wxhl-cygf/__tests__/actions.test.ts` 的 `dispatchAction` describe 里追加：

```typescript
  it('deleteWorkshopEntries 必须走互斥队列', () => {
    expect(MUTATING_ACTIONS.has('deleteWorkshopEntries')).toBe(true);
  });

  it('deleteWorkshopEntries 按把手整包删除，返回 removed；无把手条目不动', async () => {
    const mine = { uid: 1, name: 'a', position: { order: 1 }, extra: { wxhlWorkshop: { sourceId: 'p1', sourceType: 'extension' } } };
    const other = { uid: 2, name: 'b', position: { order: 2 }, extra: { wxhlWorkshop: { sourceId: 'p2' } } };
    const manual = { uid: 3, name: 'c', position: { order: 3 } };
    const replace = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('getWorldbook', vi.fn().mockResolvedValue([mine, other, manual]));
    vi.stubGlobal('replaceWorldbook', replace);

    const result = (await dispatchAction('deleteWorkshopEntries', {
      worldbookName: '无限回廊mod',
      sourceMeta: { sourceId: 'p1' },
    })) as any;
    expect(result).toEqual({ removed: 1 });
    expect(replace).toHaveBeenCalledWith('无限回廊mod', [other, manual], { render: 'immediate' });
  });

  it('deleteWorkshopEntries 没有匹配 → 不写回，返回 removed:0', async () => {
    const replace = vi.fn();
    vi.stubGlobal('getWorldbook', vi.fn().mockResolvedValue([{ uid: 1, name: 'x', position: { order: 1 } }]));
    vi.stubGlobal('replaceWorldbook', replace);
    const result = (await dispatchAction('deleteWorkshopEntries', {
      worldbookName: '无限回廊mod',
      sourceMeta: { sourceId: 'p9' },
    })) as any;
    expect(result).toEqual({ removed: 0 });
    expect(replace).not.toHaveBeenCalled();
  });

  it('deleteWorkshopEntries 缺 sourceMeta.sourceId → 响亮报错', async () => {
    await expect(dispatchAction('deleteWorkshopEntries', { worldbookName: 'x' })).rejects.toThrow('sourceMeta.sourceId');
  });
```

（该文件顶部已有 `MUTATING_ACTIONS` 等的导入与 `afterEach` 清理，无需再改导入。）

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wxhl-cygf/__tests__/actions.test.ts`
Expected: FAIL — `未知桥接动作: deleteWorkshopEntries`

- [ ] **Step 3: Write minimal implementation**

在 `src/wxhl-cygf/actions.ts` 的 `handleAction` 里、`upsertWorkshopEntries` case 之后追加：

```typescript
    case 'deleteWorkshopEntries': {
      const name = requireString(payload, 'worldbookName');
      const sourceMeta = payload.sourceMeta as SourceMeta | undefined;
      if (!sourceMeta || typeof sourceMeta.sourceId !== 'string' || sourceMeta.sourceId === '') {
        throw new Error('deleteWorkshopEntries 缺少 sourceMeta.sourceId');
      }
      // 整包卸载：互斥队列内读全量→按把手过滤→一次性写回，避免页面自己找 uid 再删的读改写竞争
      const worldbook = await getWorldbook(name);
      const kept = worldbook.filter(entry => !matchesSource(entry, sourceMeta));
      const removed = worldbook.length - kept.length;
      if (removed > 0) await replaceWorldbook(name, kept, { render: 'immediate' });
      return { removed };
    }
```

并把 `'deleteWorkshopEntries'` 加入 `MUTATING_ACTIONS` 集合。

五个 pack 文件各在文件顶部加一行 `import { z } from 'zod';`（现有代码用的是构建期自动导入的裸 `z`；显式导入与 webpack/vitest 均兼容，且让 wrangler 的 esbuild 能打包共享契约）。

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wxhl-cygf/`
Expected: 全绿（81 个测试）

Run: `npm run build` — 成功；`dist/wxhl-cygf/index.js` 重新生成

- [ ] **Step 5: Commit + 推送宿主仓**

```bash
git add src/wxhl-cygf dist/wxhl-cygf
git commit -m "feat(wxhl-cygf): 新增 deleteWorkshopEntries 原语；pack 契约显式导入 zod 以供云端共享"
bash scripts/push-cygf.sh
```

---

### Task 2: cloudflare/wxhl-cygf 数据层（fake-d1 + worker.ts 的 db 函数）

**Files:**
- Create: `cloudflare/wxhl-cygf/fake-d1.mjs`
- Create: `cloudflare/wxhl-cygf/worker.ts`（本任务只写数据层函数与 schema，不写 fetch 路由——Task 3 加）
- Create: `cloudflare/wxhl-cygf/types.d.ts`（`declare module '*.html'`）
- Test: `cloudflare/wxhl-cygf/db.test.js`

**Interfaces:**
- Consumes: 无（本任务纯数据层）
- Produces（Task 3 依赖）:
  - `interface PackRow { id, name, type, version, author_name, author_discord, tags_json, description, pack_json, manage_hash, status, downloads, entry_count, created, updated }`（全 string，downloads/entry_count 为 number）
  - `ensureSchema(db: D1Database): Promise<void>`
  - `insertPack(db, row: PackRow): Promise<void>`
  - `getPackById(db, id: string): Promise<PackRow | null>`
  - `listPacks(db, query: ListQuery): Promise<{ rows: PackRow[]; total: number }>`；`ListQuery = { q?: string; type?: string; tag?: string; sort?: 'updated' | 'downloads'; limit: number; offset: number }`
  - `updatePackByKey(db, id, manageHash, fields): Promise<boolean>`
  - `deletePackByKey(db, id, manageHash): Promise<boolean>`
  - `bumpDownloads(db, id): Promise<void>`
  - `likeEscape(s: string): string`

- [ ] **Step 1: Write the failing test**

```javascript
// cloudflare/wxhl-cygf/db.test.js
import { describe, expect, it } from 'vitest';
import { makeFakeD1 } from './fake-d1.mjs';
import { bumpDownloads, deletePackByKey, ensureSchema, getPackById, insertPack, likeEscape, listPacks, updatePackByKey } from './worker.ts';

const row = (over = {}) => ({
  id: 'a1b2c3d4', name: '雾中列车', type: 'extension', version: '1.0.0',
  author_name: '测试作者', author_discord: '', tags_json: '["副本"]',
  description: '一列永远到不了站的列车', pack_json: '{}', manage_hash: 'h1',
  status: 'published', downloads: 0, entry_count: 2,
  created: '2026-10-11T00:00:00Z', updated: '2026-10-11T00:00:00Z',
  ...over,
});

const freshDb = async () => {
  const db = makeFakeD1();
  await ensureSchema(db);
  return db;
};

describe('likeEscape', () => {
  it('% 与 _ 与 \\ 被转义', () => {
    expect(likeEscape('100%_\\')).toBe('100\\%\\_\\\\');
  });
});

describe('数据层', () => {
  it('插入后可按 id 读回；不存在返回 null', async () => {
    const db = await freshDb();
    await insertPack(db, row());
    expect((await getPackById(db, 'a1b2c3d4'))?.name).toBe('雾中列车');
    expect(await getPackById(db, 'zzzzzzzz')).toBeNull();
  });

  it('列表：按 updated 降序 + 分页 + total', async () => {
    const db = await freshDb();
    await insertPack(db, row({ id: 'p1', name: '旧', updated: '2026-01-01' }));
    await insertPack(db, row({ id: 'p2', name: '新', updated: '2026-02-01' }));
    await insertPack(db, row({ id: 'p3', name: '中', updated: '2026-01-15' }));
    const page = await listPacks(db, { limit: 2, offset: 0 });
    expect(page.rows.map(r => r.id)).toEqual(['p2', 'p3']);
    expect(page.total).toBe(3);
    expect((await listPacks(db, { limit: 2, offset: 2 })).rows.map(r => r.id)).toEqual(['p1']);
  });

  it('列表：type 过滤与关键词搜索（名称/简介/作者）', async () => {
    const db = await freshDb();
    await insertPack(db, row({ id: 'p1', name: '雾中列车', type: 'extension' }));
    await insertPack(db, row({ id: 'p2', name: '重装堡垒', type: 'build' }));
    expect((await listPacks(db, { type: 'build', limit: 50, offset: 0 })).rows.map(r => r.id)).toEqual(['p2']);
    expect((await listPacks(db, { q: '列车', limit: 50, offset: 0 })).rows.map(r => r.id)).toEqual(['p1']);
    expect((await listPacks(db, { q: '测试作者', limit: 50, offset: 0 })).total).toBe(2);
  });

  it('搜索词里的 % 按字面量处理，不匹配一切（Review Focus #1）', async () => {
    const db = await freshDb();
    await insertPack(db, row({ id: 'p1', name: '普通名字' }));
    expect((await listPacks(db, { q: '%', limit: 50, offset: 0 })).total).toBe(0);
  });

  it('更新/删除必须带上正确的 manage_hash，否则不动数据', async () => {
    const db = await freshDb();
    await insertPack(db, row());
    expect(await updatePackByKey(db, 'a1b2c3d4', 'h2', { name: '改名' })).toBe(false);
    expect((await getPackById(db, 'a1b2c3d4'))?.name).toBe('雾中列车');
    expect(await updatePackByKey(db, 'a1b2c3d4', 'h1', { name: '改名' })).toBe(true);
    expect((await getPackById(db, 'a1b2c3d4'))?.name).toBe('改名');
    expect(await deletePackByKey(db, 'a1b2c3d4', 'h2')).toBe(false);
    expect(await deletePackByKey(db, 'a1b2c3d4', 'h1')).toBe(true);
    expect(await getPackById(db, 'a1b2c3d4')).toBeNull();
  });

  it('bumpDownloads 累加下载数', async () => {
    const db = await freshDb();
    await insertPack(db, row());
    await bumpDownloads(db, 'a1b2c3d4');
    await bumpDownloads(db, 'a1b2c3d4');
    expect((await getPackById(db, 'a1b2c3d4'))?.downloads).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run cloudflare/wxhl-cygf/db.test.js`
Expected: FAIL — worker.ts 不存在

- [ ] **Step 3: Write minimal implementation**

`cloudflare/wxhl-cygf/types.d.ts`：

```typescript
declare module '*.html' {
  const content: string;
  export default content;
}
```

`cloudflare/wxhl-cygf/worker.ts`（本任务的部分）：

```typescript
// 无限回廊 · 创意工坊 Worker（存储层：Cloudflare D1）
// 部署见同目录 README.md。包格式契约共享自 src/wxhl-cygf/pack/（单一真源，勿另写）。

export interface PackRow {
  id: string;
  name: string;
  type: string;
  version: string;
  author_name: string;
  author_discord: string;
  tags_json: string;
  description: string;
  pack_json: string;
  manage_hash: string;
  status: string;
  downloads: number;
  entry_count: number;
  created: string;
  updated: string;
}

export interface ListQuery {
  q?: string;
  type?: string;
  tag?: string;
  sort?: 'updated' | 'downloads';
  limit: number;
  offset: number;
}

/** LIKE 通配符转义：玩家输入的 % / _ / \ 按字面量处理 */
export function likeEscape(s: string): string {
  return s.replace(/[\\%_]/g, ch => `\\${ch}`);
}

export async function ensureSchema(db: D1Database): Promise<void> {
  // CREATE TABLE IF NOT EXISTS 不会改老表结构；以后加列必须显式 ALTER（market 惯例）
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS packs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        version TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_discord TEXT NOT NULL DEFAULT '',
        tags_json TEXT NOT NULL DEFAULT '[]',
        description TEXT NOT NULL DEFAULT '',
        pack_json TEXT NOT NULL,
        manage_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published',
        downloads INTEGER NOT NULL DEFAULT 0,
        entry_count INTEGER NOT NULL DEFAULT 0,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )`,
    )
    .run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_packs_type ON packs(type)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_packs_updated ON packs(updated DESC)`).run();
}

export async function insertPack(db: D1Database, row: PackRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO packs (id, name, type, version, author_name, author_discord, tags_json, description, pack_json, manage_hash, status, downloads, entry_count, created, updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 0, ?, ?, ?)`,
    )
    .bind(row.id, row.name, row.type, row.version, row.author_name, row.author_discord, row.tags_json, row.description, row.pack_json, row.manage_hash, row.entry_count, row.created, row.updated)
    .run();
}

export async function getPackById(db: D1Database, id: string): Promise<PackRow | null> {
  return (await db.prepare(`SELECT * FROM packs WHERE id = ?`).bind(id).first()) as PackRow | null;
}

export async function listPacks(db: D1Database, query: ListQuery): Promise<{ rows: PackRow[]; total: number }> {
  const where: string[] = [`status = 'published'`];
  const args: unknown[] = [];
  if (query.type) {
    where.push(`type = ?`);
    args.push(query.type);
  }
  if (query.q) {
    const pattern = `%${likeEscape(query.q)}%`;
    where.push(`(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR author_name LIKE ? ESCAPE '\\')`);
    args.push(pattern, pattern, pattern);
  }
  if (query.tag) {
    where.push(`tags_json LIKE ? ESCAPE '\\'`);
    args.push(`%"${likeEscape(query.tag)}"%`);
  }
  const whereSql = where.join(' AND ');
  const orderSql = query.sort === 'downloads' ? `ORDER BY downloads DESC` : `ORDER BY updated DESC`;
  const totalRow = (await db
    .prepare(`SELECT COUNT(*) AS total FROM packs WHERE ${whereSql}`)
    .bind(...args)
    .first()) as { total: number } | null;
  const rows = (await db
    .prepare(
      `SELECT id, name, type, version, author_name, tags_json, description, downloads, entry_count, updated FROM packs WHERE ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
    )
    .bind(...args, query.limit, query.offset)
    .all()) as { results: PackRow[] };
  return { rows: rows.results ?? [], total: totalRow?.total ?? 0 };
}

export async function updatePackByKey(
  db: D1Database,
  id: string,
  manageHash: string,
  fields: Partial<Pick<PackRow, 'name' | 'type' | 'version' | 'author_name' | 'author_discord' | 'tags_json' | 'description' | 'pack_json' | 'entry_count' | 'updated'>>,
): Promise<boolean> {
  const current = await getPackById(db, id);
  if (!current || current.manage_hash !== manageHash) return false;
  const next = { ...current, ...fields };
  const result = await db
    .prepare(
      `UPDATE packs SET name = ?, type = ?, version = ?, author_name = ?, author_discord = ?, tags_json = ?, description = ?, pack_json = ?, entry_count = ?, updated = ? WHERE id = ? AND manage_hash = ?`,
    )
    .bind(next.name, next.type, next.version, next.author_name, next.author_discord, next.tags_json, next.description, next.pack_json, next.entry_count, next.updated, id, manageHash)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function deletePackByKey(db: D1Database, id: string, manageHash: string): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM packs WHERE id = ? AND manage_hash = ?`).bind(id, manageHash).run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function bumpDownloads(db: D1Database, id: string): Promise<void> {
  await db.prepare(`UPDATE packs SET downloads = downloads + 1 WHERE id = ?`).bind(id).run();
}
```

`cloudflare/wxhl-cygf/fake-d1.mjs`（照 market 的纪律：前缀锚定、认不出的 SQL 抛错、`meta.changes` 形状）：

```javascript
// 假 D1：只实现 wxhl-cygf worker 用到的 SQL 子集（CREATE/INSERT/SELECT/UPDATE/DELETE/COUNT）
// 纪律（沿袭 wxhl-market/fake-d1.mjs）：
// - 认不出的 SQL / WHERE 一律抛错，不静默放过——worker 改了 SQL 而假件装没看见，测试会假绿
// - run() 的变更行数在 result.meta.changes，不是顶层 changes（真 D1 的形状）
// - LIKE 按 SQLite 语义：支持 % 与 _ 通配 + ESCAPE '\'

export function makeFakeD1() {
  const packs = new Map(); // id → row

  const oneLine = sql => sql.replace(/\s+/g, ' ').trim();

  function likeMatch(value, pattern) {
    // 把 LIKE 模式（ESCAPE '\'）转正则：% → .*，_ → .，\x → 字面 x
    let re = '';
    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i];
      if (ch === '\\') {
        re += pattern[i + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        i++;
      } else if (ch === '%') re += '.*';
      else if (ch === '_') re += '.';
      else re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(`^${re}$`, 's').test(String(value ?? ''));
  }

  /** 求值我们 worker 会产生的 WHERE 片段（空白已归一）。认不出就抛错。 */
  function evalWhere(row, whereSql, args) {
    let i = 0;
    const parts = [];
    let depth = 0;
    let buf = '';
    for (const ch of whereSql) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (depth === 0 && / /.test(ch) && /\s+AND\s+$/i.test(buf + ch)) {
        parts.push(buf.replace(/\s+AND$/i, ''));
        buf = '';
        continue;
      }
      buf += ch;
    }
    if (buf.trim()) parts.push(buf.trim());

    return parts.every(part => {
      part = part.trim();
      let m;
      if ((m = part.match(/^(\w+) = '([^']*)'$/))) return row[m[1]] === m[2];
      if ((m = part.match(/^(\w+) = \?$/))) return row[m[1]] === args[i++];
      if ((m = part.match(/^(\w+) LIKE \? ESCAPE '\\'$/))) return likeMatch(row[m[1]], args[i++]);
      if (part.startsWith('(') && part.endsWith(')')) {
        const inner = part.slice(1, -1);
        const conds = inner.split(/\s+OR\s+/i);
        return conds.some(cond => {
          const mm = cond.trim().match(/^(\w+) LIKE \? ESCAPE '\\'$/);
          if (!mm) throw new Error(`fakeD1 不认识这个 OR 条件: 「${cond.trim()}」`);
          return likeMatch(row[mm[1]], args[i++]);
        });
      }
      throw new Error(`fakeD1 不认识这个 WHERE 条件: 「${part}」`);
    });
  }

  function selectRows(whereSql, args) {
    return [...packs.values()].filter(row => evalWhere(row, whereSql, args));
  }

  return {
    prepare(sql) {
      const flat = oneLine(sql);
      return {
        bind(...args) {
          return {
            async run() {
              if (/^CREATE (TABLE|INDEX)/i.test(flat)) return { success: true, meta: { changes: 0 } };

              let m;
              if ((m = flat.match(/^INSERT INTO packs \([^)]*\) VALUES \(([^)]*)\)$/i))) {
                const [id, name, type, version, author_name, author_discord, tags_json, description, pack_json, manage_hash, entry_count, created, updated] = args;
                if (packs.has(id)) throw new Error(`UNIQUE constraint failed: packs.id`);
                packs.set(id, {
                  id, name, type, version, author_name, author_discord, tags_json, description, pack_json, manage_hash,
                  status: 'published', downloads: 0, entry_count, created, updated,
                });
                return { success: true, meta: { changes: 1 } };
              }

              if ((m = flat.match(/^UPDATE packs SET downloads = downloads \+ 1 WHERE id = \?$/i))) {
                const row = packs.get(args[0]);
                if (row) row.downloads += 1;
                return { success: true, meta: { changes: row ? 1 : 0 } };
              }

              if ((m = flat.match(/^UPDATE packs SET name = \?, type = \?, version = \?, author_name = \?, author_discord = \?, tags_json = \?, description = \?, pack_json = \?, entry_count = \?, updated = \? WHERE id = \? AND manage_hash = \?$/i))) {
                const [name, type, version, author_name, author_discord, tags_json, description, pack_json, entry_count, updated, id, manage_hash] = args;
                const row = packs.get(id);
                if (!row || row.manage_hash !== manage_hash) return { success: true, meta: { changes: 0 } };
                packs.set(id, { ...row, name, type, version, author_name, author_discord, tags_json, description, pack_json, entry_count, updated });
                return { success: true, meta: { changes: 1 } };
              }

              if ((m = flat.match(/^DELETE FROM packs WHERE id = \? AND manage_hash = \?$/i))) {
                const row = packs.get(args[0]);
                if (!row || row.manage_hash !== args[1]) return { success: true, meta: { changes: 0 } };
                packs.delete(args[0]);
                return { success: true, meta: { changes: 1 } };
              }

              throw new Error(`fakeD1 不认识这条 SQL（run）: 「${flat}」`);
            },
            async first() {
              let m;
              if ((m = flat.match(/^SELECT \* FROM packs WHERE id = \?$/i))) {
                return packs.get(args[0]) ?? null;
              }
              if ((m = flat.match(/^SELECT COUNT\(\*\) AS total FROM packs WHERE (.+)$/i))) {
                return { total: selectRows(m[1], args).length };
              }
              throw new Error(`fakeD1 不认识这条 SQL（first）: 「${flat}」`);
            },
            async all() {
              let m;
              if ((m = flat.match(/^SELECT [\w, ]+ FROM packs WHERE (.+?) (ORDER BY (updated|downloads) DESC) LIMIT \? OFFSET \?$/i))) {
                const whereArgs = args.slice(0, -2);
                const [limit, offset] = args.slice(-2);
                let rows = selectRows(m[1], whereArgs);
                const key = m[3];
                rows.sort((a, b) => (b[key] > a[key] ? 1 : b[key] < a[key] ? -1 : 0));
                const picked = rows.slice(offset, offset + limit).map(row => {
                  // SELECT 列表只含元数据列；照真 D1 只回这些列
                  const { id, name, type, version, author_name, tags_json, description, downloads, entry_count, updated } = row;
                  return { id, name, type, version, author_name, tags_json, description, downloads, entry_count, updated };
                });
                return { results: picked };
              }
              throw new Error(`fakeD1 不认识这条 SQL（all）: 「${flat}」`);
            },
          };
        },
        // 不带参数的调用（ensureSchema 的 CREATE）
        async run() {
          if (/^CREATE (TABLE|INDEX)/i.test(flat)) return { success: true, meta: { changes: 0 } };
          throw new Error(`fakeD1 不认识这条 SQL（无 bind run）: 「${flat}」`);
        },
      };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run cloudflare/wxhl-cygf/db.test.js`
Expected: PASS（7 个用例）

- [ ] **Step 5: Commit**

```bash
git add cloudflare/wxhl-cygf
git commit -m "feat(wxhl-cygf): 云端工坊数据层 —— D1 schema/CRUD/搜索分页 + fake-d1 替身"
```

---

### Task 3: API 层（fetch 路由 + 上传校验 + 管理密钥）

**Files:**
- Modify: `cloudflare/wxhl-cygf/worker.ts`（加路由与处理函数；文件顶部加导入）
- Test: `cloudflare/wxhl-cygf/worker.test.js`

**Interfaces:**
- Consumes: Task 2 全部 db 函数；`ContentPack` / `z`（`../../src/wxhl-cygf/pack`）
- Produces: `export default { fetch(request, env) }`；`sha256Hex(input: string): Promise<string>`；`genPackId(): string`

- [ ] **Step 1: Write the failing test**

```javascript
// cloudflare/wxhl-cygf/worker.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vitest 不识别 wrangler 的 Text 规则——把两个文本资源 mock 掉
vi.mock('./workshop.html', () => ({ default: '<!doctype html><title>stub</title>' }));
vi.mock('./page-lib.js', () => ({ default: '// stub' }));

import worker from './worker.ts';
import { makeFakeD1 } from './fake-d1.mjs';

let db;
const env = () => ({ WORKSHOP_DB: db });
beforeEach(() => {
  db = makeFakeD1();
});

const get = p => new Request('https://t.local' + p);
const postJson = (p, b, method = 'POST') =>
  new Request('https://t.local' + p, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

const validPack = () => ({
  format: 'wxhl-mod@1',
  id: '将被服务端覆写',
  name: '雾中列车',
  type: 'extension',
  version: '1.0.0',
  author: { name: '测试作者' },
  tags: ['副本'],
  description: '一列永远到不了站的列车',
  worldbookEntries: [{ name: '列车时刻表', content: '……正文……', keys: ['雾中列车'] }],
});

async function upload(pack = validPack()) {
  const res = await worker.fetch(postJson('/api/packs', pack), env());
  return { res, body: await res.json() };
}

describe('页面与静态资源', () => {
  it('GET / 返回 HTML', async () => {
    const res = await worker.fetch(get('/'), env());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('GET /page-lib.js 返回 JS', async () => {
    const res = await worker.fetch(get('/page-lib.js'), env());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('javascript');
  });

  it('未知路径 → 404 JSON', async () => {
    const res = await worker.fetch(get('/nope'), env());
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBeTruthy();
  });
});

describe('上传', () => {
  it('合法扩展包 → 201 + id + manageKey；id 被覆写为服务端生成', async () => {
    const { res, body } = await upload();
    expect(res.status).toBe(201);
    expect(body.id).toMatch(/^[0-9a-zA-Z]{8}$/);
    expect(body.id).not.toBe('将被服务端覆写');
    expect(body.manageKey).toMatch(/^[0-9a-f]{32}$/);
  });

  it('非法包 → 422 + 人话错误（绿灯条目没给关键词）', async () => {
    const bad = validPack();
    bad.worldbookEntries = [{ name: 'x', content: 'y' }];
    const { res, body } = await upload(bad);
    expect(res.status).toBe(422);
    expect(body.error).toContain('关键词');
  });

  it('缺 format / 版本号不是 x.y.z → 422', async () => {
    expect((await upload({ ...validPack(), format: 'x' })).res.status).toBe(422);
    expect((await upload({ ...validPack(), version: 'v1' })).res.status).toBe(422);
  });

  it('超长名称（>100）→ 422；条目超 100 条 → 422（Review Focus #3）', async () => {
    expect((await upload({ ...validPack(), name: 'x'.repeat(101) })).res.status).toBe(422);
    const many = validPack();
    many.worldbookEntries = Array.from({ length: 101 }, (_, i) => ({ name: `e${i}`, content: 'c', keys: ['k'] }));
    expect((await upload(many)).res.status).toBe(422);
  });

  it('非 JSON body → 400', async () => {
    const res = await worker.fetch(new Request('https://t.local/api/packs', { method: 'POST', body: 'not json' }), env());
    expect(res.status).toBe(400);
  });
});

describe('浏览', () => {
  it('列表只回元数据（不回 pack_json / manage_hash），详情回完整包', async () => {
    await upload();
    const list = await (await worker.fetch(get('/api/packs'), env())).json();
    expect(list.packs).toHaveLength(1);
    expect(list.total).toBe(1);
    expect(list.packs[0]).not.toHaveProperty('pack_json');
    expect(list.packs[0]).not.toHaveProperty('manage_hash');
    expect(list.packs[0].entryCount).toBe(1);

    const detail = await (await worker.fetch(get(`/api/packs/${list.packs[0].id}`), env())).json();
    expect(detail.pack.worldbookEntries[0].name).toBe('列车时刻表');
    expect(detail.pack.id).toBe(list.packs[0].id);
  });

  it('详情会累加下载数；列表 sort=downloads 生效', async () => {
    const a = await upload({ ...validPack(), name: 'A' });
    await upload({ ...validPack(), name: 'B' });
    await worker.fetch(get(`/api/packs/${a.body.id}`), env());
    await worker.fetch(get(`/api/packs/${a.body.id}`), env());
    const list = await (await worker.fetch(get('/api/packs?sort=downloads'), env())).json();
    expect(list.packs[0].id).toBe(a.body.id);
    expect(list.packs[0].downloads).toBe(2);
  });

  it('详情不存在 → 404', async () => {
    expect((await worker.fetch(get('/api/packs/zzzzzzzz'), env())).status).toBe(404);
  });
});

describe('更新与下架（管理密钥）', () => {
  it('密钥错误 → 403，且不区分「包不存在」与「密钥不对」（Review Focus #2）', async () => {
    const { body } = await upload();
    const resWrongKey = await worker.fetch(postJson(`/api/packs/${body.id}`, { manageKey: 'f'.repeat(32), pack: { ...validPack(), version: '1.0.1' } }, 'PUT'), env());
    const resNoPack = await worker.fetch(postJson(`/api/packs/zzzzzzzz`, { manageKey: 'f'.repeat(32), pack: validPack() }, 'PUT'), env());
    expect(resWrongKey.status).toBe(403);
    expect(resNoPack.status).toBe(403);
    expect((await resWrongKey.json()).error).toBe((await resNoPack.json()).error);
  });

  it('密钥正确 → 更新成功，详情反映新版本', async () => {
    const { body } = await upload();
    const res = await worker.fetch(
      postJson(`/api/packs/${body.id}`, { manageKey: body.manageKey, pack: { ...validPack(), version: '1.0.1', description: '新简介' } }, 'PUT'),
      env(),
    );
    expect(res.status).toBe(200);
    const detail = await (await worker.fetch(get(`/api/packs/${body.id}`), env())).json();
    expect(detail.pack.version).toBe('1.0.1');
    expect(detail.pack.description).toBe('新简介');
  });

  it('密钥正确 → 下架；之后详情 404；再删一次仍 403', async () => {
    const { body } = await upload();
    const del = await worker.fetch(postJson(`/api/packs/${body.id}`, { manageKey: body.manageKey }, 'DELETE'), env());
    expect(del.status).toBe(200);
    expect((await worker.fetch(get(`/api/packs/${body.id}`), env())).status).toBe(404);
    expect((await worker.fetch(postJson(`/api/packs/${body.id}`, { manageKey: body.manageKey }, 'DELETE'), env())).status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run cloudflare/wxhl-cygf/worker.test.js`
Expected: FAIL — `worker.fetch` 未定义

- [ ] **Step 3: Write minimal implementation**

`worker.ts` 顶部加导入（在 Task 2 的代码之前）：

```typescript
import { ContentPack } from '../../src/wxhl-cygf/pack';
import WORKSHOP_HTML from './workshop.html';
import PAGE_LIB from './page-lib.js';
```

末尾追加：

```typescript
// ==================== HTTP 层 ====================
const MAX_PACK_BYTES = 256 * 1024;
const MAX_NAME_LEN = 100;
const MAX_ENTRIES = 100;

export function genPackId(): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

function err(message: string, status: number): Response {
  return json({ error: message }, status);
}

/** 把上传体校验成合法包；返回错误消息或 null。服务端是唯一权威校验点。 */
function validatePack(pack: unknown): { ok: true; pack: any } | { ok: false; error: string } {
  const result = ContentPack.safeParse(pack);
  if (!result.success) {
    return { ok: false, error: `包格式不符合规范：${z.prettifyError(result.error)}` };
  }
  const parsed = result.data as any;
  if (parsed.name.length > MAX_NAME_LEN) return { ok: false, error: `名称过长（上限 ${MAX_NAME_LEN} 字符）` };
  if (parsed.type === 'extension' && parsed.worldbookEntries.length > MAX_ENTRIES) {
    return { ok: false, error: `条目数过多（上限 ${MAX_ENTRIES} 条）` };
  }
  return { ok: true, pack: parsed };
}

function entryCountOf(pack: any): number {
  return pack.type === 'extension' ? pack.worldbookEntries.length : 1;
}

function toRow(pack: any, id: string, manageHash: string, now: string, existing?: PackRow): PackRow {
  return {
    id,
    name: pack.name,
    type: pack.type,
    version: pack.version,
    author_name: pack.author.name,
    author_discord: pack.author.discord ?? '',
    tags_json: JSON.stringify(pack.tags ?? []),
    description: pack.description ?? '',
    pack_json: JSON.stringify(pack),
    manage_hash: manageHash,
    status: 'published',
    downloads: existing?.downloads ?? 0,
    entry_count: entryCountOf(pack),
    created: existing?.created ?? now,
    updated: now,
  };
}

function toMeta(row: PackRow) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    version: row.version,
    authorName: row.author_name,
    tags: JSON.parse(row.tags_json || '[]'),
    description: row.description,
    downloads: row.downloads,
    entryCount: row.entry_count,
    updated: row.updated,
  };
}

export default {
  async fetch(request: Request, env: { WORKSHOP_DB: D1Database }): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/' && request.method === 'GET') {
        return new Response(WORKSHOP_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
      if (url.pathname === '/page-lib.js' && request.method === 'GET') {
        return new Response(PAGE_LIB, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
      }

      await ensureSchema(env.WORKSHOP_DB);
      const db = env.WORKSHOP_DB;

      if (url.pathname === '/api/packs' && request.method === 'GET') {
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 20, 1), 50);
        const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
        const sort = url.searchParams.get('sort') === 'downloads' ? 'downloads' : 'updated';
        const { rows, total } = await listPacks(db, {
          q: url.searchParams.get('q') ?? undefined,
          type: url.searchParams.get('type') ?? undefined,
          tag: url.searchParams.get('tag') ?? undefined,
          sort,
          limit,
          offset,
        });
        return json({ packs: rows.map(toMeta), total });
      }

      const detailMatch = url.pathname.match(/^\/api\/packs\/([0-9a-zA-Z]{8})$/);
      if (detailMatch && request.method === 'GET') {
        const row = await getPackById(db, detailMatch[1]);
        if (!row || row.status !== 'published') return err('内容包不存在或已下架', 404);
        await bumpDownloads(db, row.id);
        return json({ pack: JSON.parse(row.pack_json) });
      }

      if (url.pathname === '/api/packs' && request.method === 'POST') {
        const text = await request.text();
        if (text.length > MAX_PACK_BYTES) return err(`包体过大（上限 ${MAX_PACK_BYTES / 1024}KB）`, 413);
        let body: unknown;
        try {
          body = JSON.parse(text);
        } catch {
          return err('请求体不是合法 JSON', 400);
        }
        const checked = validatePack(body);
        if (!checked.ok) return err(checked.error, 422);
        checked.pack.id = genPackId(); // id 一律服务端生成
        // id 撞车重试一次（Review Focus #5）
        if (await getPackById(db, checked.pack.id)) checked.pack.id = genPackId();
        if (await getPackById(db, checked.pack.id)) return err('服务繁忙，请重试', 503);
        const manageKey = crypto.randomUUID().replaceAll('-', '');
        const manageHash = await sha256Hex(manageKey);
        await insertPack(db, toRow(checked.pack, checked.pack.id, manageHash, new Date().toISOString()));
        return json({ id: checked.pack.id, manageKey }, 201);
      }

      if (detailMatch && request.method === 'PUT') {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return err('请求体不是合法 JSON', 400);
        }
        if (typeof body?.manageKey !== 'string' || !body.manageKey) return err('缺少 manageKey', 400);
        const checked = validatePack(body.pack);
        if (!checked.ok) return err(checked.error, 422);
        checked.pack.id = detailMatch[1];
        const manageHash = await sha256Hex(body.manageKey);
        const existing = await getPackById(db, detailMatch[1]);
        // 不区分「包不存在」与「密钥不对」，不泄露包的存在性
        if (!existing || existing.manage_hash !== manageHash) return err('内容包不存在或管理密钥不正确', 403);
        const okUpdate = await updatePackByKey(db, detailMatch[1], manageHash, toRow(checked.pack, detailMatch[1], manageHash, new Date().toISOString(), existing));
        if (!okUpdate) return err('内容包不存在或管理密钥不正确', 403);
        return json({ ok: true, id: detailMatch[1] });
      }

      if (detailMatch && request.method === 'DELETE') {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return err('请求体不是合法 JSON', 400);
        }
        if (typeof body?.manageKey !== 'string' || !body.manageKey) return err('缺少 manageKey', 400);
        const manageHash = await sha256Hex(body.manageKey);
        const okDelete = await deletePackByKey(db, detailMatch[1], manageHash);
        if (!okDelete) return err('内容包不存在或管理密钥不正确', 403);
        return json({ ok: true, id: detailMatch[1] });
      }

      return err('没有这个接口', 404);
    } catch (error) {
      console.error('[wxhl工坊] 未捕获异常:', error);
      return err(error instanceof Error ? `服务内部错误：${error.message}` : '服务内部错误', 500);
    }
  },
};
```

注意：worker.ts 顶部用到 `z.prettifyError` ——`ContentPack` 从 `../../src/wxhl-cygf/pack` 导入后，`z` 也要显式导入：把导入行写成

```typescript
import { z } from 'zod';
import { ContentPack } from '../../src/wxhl-cygf/pack';
```

（pack 各文件在 Task 1 已加显式导入，这里同样处理。）

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run cloudflare/wxhl-cygf/`
Expected: db.test.js + worker.test.js 全绿

- [ ] **Step 5: Commit**

```bash
git add cloudflare/wxhl-cygf
git commit -m "feat(wxhl-cygf): 云端工坊 API —— 列表/详情/上传/更新/下架 + 管理密钥 + 共享契约校验"
```

---

### Task 4: page-lib.js —— 页面逻辑层（桥客户端 / 条目映射 / 渲染模板 / API 封装）

**Files:**
- Create: `cloudflare/wxhl-cygf/page-lib.js`
- Test: `cloudflare/wxhl-cygf/page-lib.test.js`

**Interfaces:**
- Consumes: 宿主桥协议（spec §3）；worker API（Task 3）
- Produces（Task 5 页面依赖）:
  - `BRIDGE_CHANNEL`、`WORKSHOP_WORLDBOOK = '无限回廊mod'`
  - `createBridgeClient({ parentWindow, selfWindow, timeoutMs })` → `{ request(action, payload), destroy() }`
  - `mapExtensionEntry(entry)` → 酒馆 WorldbookEntry 形状
  - `renderBuildEntry(build): string`、`renderCharacterEntry(character): string`
  - `packToWorldbookEntries(pack): WorldbookEntry[]`
  - `sourceMetaOf(pack)` → `{ sourceId, sourceType, version, title }`
  - `computeInstalled(entries)` → `Map<sourceId, { version, count }>`
  - `api = { list(params), get(id), upload(pack), update(id, manageKey, pack), remove(id, manageKey) }`（fetch 封装）
  - `AGREEMENT_KEY`、`isAgreementAccepted(storage)`、`acceptAgreement(storage)`

纯 JS（浏览器直接 import），不写 TS 语法。

- [ ] **Step 1: Write the failing test**

```javascript
// cloudflare/wxhl-cygf/page-lib.test.js
import { describe, expect, it, vi } from 'vitest';
import {
  computeInstalled, createBridgeClient, isAgreementAccepted, mapExtensionEntry,
  packToWorldbookEntries, renderBuildEntry, renderCharacterEntry, sourceMetaOf,
} from './page-lib.js';

describe('桥客户端', () => {
  function fakeWindows() {
    const posted = [];
    const listeners = new Set();
    const parentWindow = { postMessage: vi.fn(m => posted.push(m)) };
    const selfWindow = {
      addEventListener: (_t, l) => listeners.add(l),
      removeEventListener: (_t, l) => listeners.delete(l),
    };
    const respond = (id, payload, ok = true) => {
      const data = { channel: 'wxhl-workshop:worldbook', kind: 'response', id, ok, ...(ok ? { payload } : { error: payload }) };
      listeners.forEach(l => l({ data }));
    };
    return { posted, respond, parentWindow, selfWindow };
  }

  it('request 发 request 信封，收到同 id 响应后 resolve payload', async () => {
    const w = fakeWindows();
    const bridge = createBridgeClient({ parentWindow: w.parentWindow, selfWindow: w.selfWindow });
    const promise = bridge.request('handshake');
    const sent = w.posted[0];
    expect(sent.channel).toBe('wxhl-workshop:worldbook');
    expect(sent.kind).toBe('request');
    expect(sent.action).toBe('handshake');
    w.respond(sent.id, { capabilities: {} });
    await expect(promise).resolves.toEqual({ capabilities: {} });
    bridge.destroy();
  });

  it('ok:false 的响应 → reject 带 error 人话', async () => {
    const w = fakeWindows();
    const bridge = createBridgeClient({ parentWindow: w.parentWindow, selfWindow: w.selfWindow });
    const promise = bridge.request('getEntries', { worldbookName: '无限回廊mod' });
    w.respond(w.posted[0].id, '世界书不存在', false);
    await expect(promise).rejects.toThrow('世界书不存在');
    bridge.destroy();
  });

  it('超时 → reject 带引导文案（Review Focus #4）', async () => {
    const w = fakeWindows();
    vi.useFakeTimers();
    const bridge = createBridgeClient({ parentWindow: w.parentWindow, selfWindow: w.selfWindow, timeoutMs: 100 });
    const promise = bridge.request('getContext');
    promise.catch(() => {});
    await vi.advanceTimersByTimeAsync(150);
    await expect(promise).rejects.toThrow(/超时/);
    vi.useRealTimers();
    bridge.destroy();
  });

  it('别的 channel / 别的 id 的响应被忽略', async () => {
    const w = fakeWindows();
    const bridge = createBridgeClient({ parentWindow: w.parentWindow, selfWindow: w.selfWindow });
    const promise = bridge.request('handshake');
    const wrongId = { data: { channel: 'wxhl-workshop:worldbook', kind: 'response', id: 'nobody', ok: true, payload: {} } };
    const wrongChannel = { data: { channel: 'other', kind: 'response', id: w.posted[0].id, ok: true, payload: {} } };
    // 手动触发两条无关消息后再发正确响应
    const listeners = [...(w.selfWindow as any).__proto__ ? [] : []];
    w.respond('nobody', {}); // 无人认领
    w.respond(w.posted[0].id, { ok: true });
    await expect(promise).resolves.toEqual({ ok: true });
    bridge.destroy();
  });
});

describe('条目映射', () => {
  it('绿灯条目 → selective，关键词与位置映射正确', () => {
    const entry = mapExtensionEntry({ name: '列车时刻表', content: '正文', keys: ['雾中列车'], keysSecondary: ['深夜'], position: 'at_depth', depth: 2, order: 50 });
    expect(entry.strategy.type).toBe('selective');
    expect(entry.strategy.keys).toEqual(['雾中列车']);
    expect(entry.strategy.keys_secondary).toEqual({ logic: 'and_any', keys: ['深夜'] });
    expect(entry.position).toEqual({ type: 'at_depth', role: 'system', depth: 2, order: 50 });
    expect(entry.probability).toBe(100);
  });

  it('蓝灯条目 → constant；position 默认 after_character_definition', () => {
    const entry = mapExtensionEntry({ name: '常驻', content: '正文', constant: true });
    expect(entry.strategy.type).toBe('constant');
    expect(entry.position.type).toBe('after_character_definition');
  });

  it('递归与效果字段映射', () => {
    const entry = mapExtensionEntry({ name: 'x', content: 'y', keys: ['k'], preventRecursion: true, excludeRecursion: true, sticky: 2, cooldown: 3, delay: 1 });
    expect(entry.recursion).toEqual({ prevent_incoming: true, prevent_outgoing: true, delay_until: null });
    expect(entry.effect).toEqual({ sticky: 2, cooldown: 3, delay: 1 });
  });
});

describe('渲染模板', () => {
  const build = {
    构筑名: '重装堡垒', 定位: '物理破坏配合高容错换血',
    属性基础: { STR: 10, AGI: 5, CON: 12, PER: 6 },
    天赋: { 名称: '石肤', 品质: '蓝色', 效果: { 减伤: '受击-2' } },
    血统: { 名称: '无' }, 称号: { 名称: '无' },
    职业: { 名称: '卫士', 稀有度: '蓝', 职业技能: {}, 职业特性: {} },
    通用技能: { 横扫: { 类型: '主动', 消耗: '10MP', 效果: { 说明: '横扫一片' } } },
    装备: { 主武器: { 名称: '斩首大剑', 品质: '紫色', 阶位: '二阶', 伤害骰: '2d6', 倍率: 1.5, 主属性加成: 3 }, 头部: { 名称: '无' } },
    背包建议: { 治疗药水: { 描述: '回血', 数量: 3 } },
  };

  it('构筑渲染含构筑名/定位/属性/技能/装备/背包', () => {
    const text = renderBuildEntry(build);
    expect(text).toContain('重装堡垒');
    expect(text).toContain('物理破坏配合高容错换血');
    expect(text).toContain('STR 10');
    expect(text).toContain('横扫');
    expect(text).toContain('斩首大剑');
    expect(text).toContain('治疗药水');
  });

  it('同人角色渲染在构筑基础上含外貌/背景/建议类型', () => {
    const character = { ...build, 构筑名: '雾中剑客', 外貌: '白发蒙眼', 性格: '沉默', 背景: '……', 建议类型: 'BOSS' };
    const text = renderCharacterEntry(character);
    expect(text).toContain('雾中剑客');
    expect(text).toContain('白发蒙眼');
    expect(text).toContain('BOSS');
  });
});

describe('packToWorldbookEntries / sourceMetaOf / computeInstalled', () => {
  const extPack = {
    id: 'abc12345', name: '雾中列车', type: 'extension', version: '1.0.0',
    worldbookEntries: [{ name: '时刻表', content: 'x', keys: ['列车'] }],
  };

  it('扩展包 → 每条一个酒馆条目，名字带包名前缀，extra 留空给宿主盖章', () => {
    const entries = packToWorldbookEntries(extPack);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('[回廊mod][扩展]雾中列车·时刻表');
    expect(entries[0].extra.wxhlWorkshop.sourceId).toBe('');
  });

  it('构筑包 → 单条绿灯条目，关键词为构筑名', () => {
    const pack = {
      id: 'b1', name: '重装堡垒构筑', type: 'build', version: '2.0.0',
      build: { 构筑名: '重装堡垒', 定位: '……', 属性基础: { STR: 10, AGI: 5, CON: 12, PER: 6 }, 天赋: { 名称: '无' }, 血统: { 名称: '无' }, 称号: { 名称: '无' }, 职业: { 名称: '无' }, 通用技能: {}, 装备: {}, 背包建议: {} },
    };
    const entries = packToWorldbookEntries(pack);
    expect(entries).toHaveLength(1);
    expect(entries[0].strategy.type).toBe('selective');
    expect(entries[0].strategy.keys).toEqual(['重装堡垒']);
    expect(entries[0].content).toContain('重装堡垒');
  });

  it('sourceMetaOf 带 version 与 title（宿主盖章后落进 extra，供已装版本对比）', () => {
    expect(sourceMetaOf(extPack)).toEqual({ sourceId: 'abc12345', sourceType: 'extension', version: '1.0.0', title: '雾中列车' });
  });

  it('computeInstalled 按 sourceId 聚合已装版本与条数', () => {
    const entries = [
      { extra: { wxhlWorkshop: { sourceId: 'a', version: '1.0.0' } } },
      { extra: { wxhlWorkshop: { sourceId: 'a', version: '1.0.0' } } },
      { extra: { wxhlWorkshop: { sourceId: 'b', version: '2.0.0' } } },
      { name: '手动条目' },
    ];
    const installed = computeInstalled(entries);
    expect(installed.get('a')).toEqual({ version: '1.0.0', count: 2 });
    expect(installed.get('b')).toEqual({ version: '2.0.0', count: 1 });
    expect(installed.size).toBe(2);
  });
});

describe('免责声明', () => {
  it('未同意 → false；同意后 → true', () => {
    const storage = new Map();
    const shim = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) };
    expect(isAgreementAccepted(shim)).toBe(false);
    storage.set('wxhl_cygf_agreement', '1');
    expect(isAgreementAccepted(shim)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run cloudflare/wxhl-cygf/page-lib.test.js`
Expected: FAIL — page-lib.js 不存在

- [ ] **Step 3: Write minimal implementation**

```javascript
// cloudflare/wxhl-cygf/page-lib.js
// 工坊页面的逻辑层：纯 JS ES module，浏览器直接 import，vitest 直接测。
// 桥协议与常量与宿主 src/wxhl-cygf/ 一一对应——改协议两边同步。

export const BRIDGE_CHANNEL = 'wxhl-workshop:worldbook';
export const WORKSHOP_WORLDBOOK = '无限回廊mod';
export const AGREEMENT_KEY = 'wxhl_cygf_agreement';

// ==================== 桥客户端 ====================
export function createBridgeClient({ parentWindow, selfWindow, timeoutMs = 30000 } = {}) {
  let seq = 0;
  const pending = new Map();
  const onMessage = event => {
    const d = event?.data;
    if (!d || d.channel !== BRIDGE_CHANNEL || d.kind !== 'response') return;
    const entry = pending.get(d.id);
    if (!entry) return;
    pending.delete(d.id);
    clearTimeout(entry.timer);
    if (d.ok) entry.resolve(d.payload);
    else entry.reject(new Error(d.error || '桥接调用失败'));
  };
  selfWindow.addEventListener('message', onMessage);
  return {
    request(action, payload = {}) {
      const id = `r${++seq}-${Math.random().toString(36).slice(2, 8)}`;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`桥接请求超时（${action}）：宿主脚本未响应——请确认是从酒馆内的「创意工坊」按钮打开本页面`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        parentWindow.postMessage({ channel: BRIDGE_CHANNEL, kind: 'request', id, action, payload }, '*');
      });
    },
    destroy() {
      selfWindow.removeEventListener('message', onMessage);
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(new Error('桥接已销毁'));
      }
      pending.clear();
    },
  };
}

// ==================== 条目映射（扩展包条目 → 酒馆世界书条目） ====================
const POSITION_MAP = {
  before_char: 'before_character_definition',
  after_char: 'after_character_definition',
  at_depth: 'at_depth',
};

export function mapExtensionEntry(entry) {
  return {
    name: entry.name,
    enabled: entry.enabled !== false,
    strategy: {
      type: entry.constant ? 'constant' : 'selective',
      keys: entry.keys ?? [],
      keys_secondary: { logic: 'and_any', keys: entry.keysSecondary ?? [] },
      scan_depth: 'same_as_global',
    },
    position: {
      type: POSITION_MAP[entry.position ?? 'after_char'],
      role: 'system',
      depth: entry.depth ?? 0,
      order: entry.order ?? 100,
    },
    content: entry.content,
    probability: entry.probability ?? 100,
    recursion: {
      prevent_incoming: !!entry.preventRecursion,
      prevent_outgoing: !!entry.excludeRecursion,
      delay_until: null,
    },
    effect: { sticky: entry.sticky ?? null, cooldown: entry.cooldown ?? null, delay: entry.delay ?? null },
    // sourceId 等由宿主按 sourceMeta 盖章；这里留空骨架保持形状
    extra: { wxhlWorkshop: { sourceId: '', sourceType: 'extension', version: '', title: '' } },
  };
}

const TYPE_LABEL = { extension: '扩展', build: '构筑', character: '角色' };

// ==================== 渲染模板（构筑/同人角色 → 条目正文） ====================
function renderSkills(技能表) {
  const lines = Object.entries(技能表 ?? {}).map(([名, s]) => {
    const 效果 = Object.entries(s.效果 ?? {})
      .map(([k, v]) => `${k}：${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join('；');
    return `· ${名}（${s.类型 ?? '主动'}${s.消耗 ? `，消耗 ${s.消耗}` : ''}${s.冷却 ? `，冷却 ${s.冷却}` : ''}）${效果 ? `：${效果}` : ''}`;
  });
  return lines.length ? lines.join('\n') : '无';
}

function renderEquipment(装备) {
  return Object.entries(装备 ?? {})
    .map(([槽, e]) => (e && e.名称 && e.名称 !== '无' ? `· ${槽}：${e.名称}（${e.品质 ?? '无'}·${e.阶位 ?? '无'}${e.伤害骰 && e.伤害骰 !== '无' ? `，伤害骰 ${e.伤害骰}` : ''}${e.倍率 ? `，倍率 ${e.倍率}` : ''}${e.主属性加成 ? `，主属性+${e.主属性加成}` : ''}）` : null))
    .filter(Boolean)
    .join('\n') || '无';
}

export function renderBuildEntry(build) {
  const 属性 = build.属性基础 ?? {};
  return [
    `【构筑】${build.构筑名}`,
    `定位：${build.定位}`,
    `属性加点：STR ${属性.STR ?? 5} / AGI ${属性.AGI ?? 5} / CON ${属性.CON ?? 5} / PER ${属性.PER ?? 5}`,
    build.天赋?.名称 && build.天赋.名称 !== '无' ? `天赋：${build.天赋.名称}（${build.天赋.品质 ?? ''}）${renderEffects(build.天赋.效果)}` : null,
    build.血统?.名称 && build.血统.名称 !== '无' ? `血统：${build.血统.名称}（${build.血统.品质 ?? ''}）${renderEffects(build.血统.效果)}` : null,
    build.称号?.名称 && build.称号.名称 !== '无' ? `称号：${build.称号.名称}${renderEffects(build.称号.效果)}` : null,
    build.职业?.名称 && build.职业.名称 !== '无' ? `职业：${build.职业.名称}（${build.职业.稀有度 ?? ''}）` : null,
    `通用技能：\n${renderSkills(build.通用技能)}`,
    `装备：\n${renderEquipment(build.装备)}`,
    Object.keys(build.背包建议 ?? {}).length
      ? `背包建议：\n${Object.entries(build.背包建议).map(([名, it]) => `· ${名} ×${it.数量 ?? 1}${it.描述 ? `：${it.描述}` : ''}`).join('\n')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderEffects(效果) {
  const parts = Object.entries(效果 ?? {}).map(([k, v]) => `${k}：${v}`);
  return parts.length ? `—— ${parts.join('；')}` : '';
}

export function renderCharacterEntry(character) {
  return [
    `【同人角色】${character.构筑名}（建议作为：${character.建议类型 ?? '其他契约者'}）`,
    `外貌：${character.外貌}`,
    character.性格 ? `性格：${character.性格}` : null,
    `背景：${character.背景}`,
    '',
    renderBuildEntry(character),
  ]
    .filter(x => x !== null)
    .join('\n');
}

// ==================== 包 → 条目 ====================
export function sourceMetaOf(pack) {
  return { sourceId: pack.id, sourceType: pack.type, version: pack.version, title: pack.name };
}

export function packToWorldbookEntries(pack) {
  if (pack.type === 'extension') {
    return (pack.worldbookEntries ?? []).map(entry => ({
      ...mapExtensionEntry(entry),
      name: `[回廊mod][${TYPE_LABEL[pack.type]}]${pack.name}·${entry.name}`,
    }));
  }
  const isBuild = pack.type === 'build';
  const payload = isBuild ? pack.build : pack.character;
  const name = isBuild ? payload.构筑名 : payload.构筑名;
  return [
    {
      name: `[回廊mod][${TYPE_LABEL[pack.type]}]${pack.name}`,
      enabled: true,
      strategy: { type: 'selective', keys: [name], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
      position: { type: 'after_character_definition', role: 'system', depth: 0, order: 100 },
      content: isBuild ? renderBuildEntry(payload) : renderCharacterEntry(payload),
      probability: 100,
      recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null },
      extra: { wxhlWorkshop: { sourceId: '', sourceType: pack.type, version: '', title: '' } },
    },
  ];
}

// ==================== 已装状态 ====================
export function computeInstalled(entries) {
  const map = new Map();
  for (const entry of entries ?? []) {
    const meta = entry?.extra?.wxhlWorkshop;
    if (!meta?.sourceId) continue;
    const prev = map.get(meta.sourceId) ?? { version: meta.version ?? '', count: 0 };
    map.set(meta.sourceId, { version: meta.version ?? prev.version, count: prev.count + 1 });
  }
  return map;
}

// ==================== API 封装 ====================
async function callApi(path, options) {
  const res = await fetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* 非 JSON 响应 */
  }
  if (!res.ok) throw new Error(data?.error || `请求失败（HTTP ${res.status}）`);
  return data;
}

export const api = {
  list: params => callApi(`/api/packs?${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v))}`),
  get: id => callApi(`/api/packs/${id}`),
  upload: pack => callApi('/api/packs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pack) }),
  update: (id, manageKey, pack) =>
    callApi(`/api/packs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ manageKey, pack }) }),
  remove: (id, manageKey) =>
    callApi(`/api/packs/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ manageKey }) }),
};

// ==================== 免责声明 ====================
export function isAgreementAccepted(storage) {
  try {
    return storage.getItem(AGREEMENT_KEY) === '1';
  } catch {
    return false;
  }
}

export function acceptAgreement(storage) {
  try {
    storage.setItem(AGREEMENT_KEY, '1');
  } catch {
    /* 隐私模式下写不进就算了——下次再弹一次 */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run cloudflare/wxhl-cygf/`
Expected: db / worker / page-lib 全绿

- [ ] **Step 5: Commit**

```bash
git add cloudflare/wxhl-cygf
git commit -m "feat(wxhl-cygf): 页面逻辑层 —— 桥客户端/条目映射/渲染模板/API封装/已装状态"
```

---

### Task 5: workshop.html —— 工坊页面

**Files:**
- Create: `cloudflare/wxhl-cygf/workshop.html`

**Interfaces:**
- Consumes: Task 4 的 page-lib.js 全部导出（`<script type="module">import * as W from '/page-lib.js'</script>`）
- Produces: 无（页面是终端交付物）

无 jsdom，本任务不做自动化测试——验收靠 Task 6 的 wrangler dev 人工核对清单。

- [ ] **Step 1: Write the page**

创建 `cloudflare/wxhl-cygf/workshop.html`。结构要求（完整实现，不截断）：

1. **免责声明显示层**：`#agreement` 全屏卡片，文案「内容包均由玩家自行上传、**未经审核**；安装第三方内容可能与角色卡冲突或影响游戏体验，请自行判断风险。安装前请确认你信任该内容包的作者。」+「我已了解，进入工坊」按钮。页面加载时 `W.isAgreementAccepted(localStorage)` 为真则隐藏；否则点击按钮后 `W.acceptAgreement(localStorage)` 并隐藏。
2. **顶栏**：标题「回廊创意工坊」+ 搜索框 + 类型筛选（全部/扩展包/构筑/同人角色）+ 排序（最新/最热）+「上传」按钮。
3. **桥状态条**：页面加载后 `bridge.request('getContext')`；失败则显示横幅「⚠️ 未检测到宿主脚本——请从酒馆内的『创意工坊』按钮打开本页面」，安装/卸载按钮全部禁用。
4. **列表**：卡片网格（名称、类型徽章、作者、版本、简介、下载数、更新时间）。点卡片进详情。底部「加载更多」（offset 分页）。
5. **详情弹层**：完整简介 + 条目预览（扩展包列出每条名称+正文截断；构筑/角色显示渲染后的正文预览——直接调 `W.packToWorldbookEntries(pack)` 看落地效果）+ 安装/更新/卸载按钮：
   - 已装状态：`bridge.request('getEntries', { worldbookName: W.WORKSHOP_WORLDBOOK })` → `W.computeInstalled(entries)` 看 `sourceId` 是否已装、版本是否落后
   - 安装/更新：`W.api.get(id)` 拿完整包 → `W.packToWorldbookEntries(pack)` → `bridge.request('upsertWorkshopEntries', { worldbookName: W.WORKSHOP_WORLDBOOK, sourceMeta: W.sourceMetaOf(pack), entries })` → 成功提示「已安装 N 条」
   - 卸载：`bridge.request('deleteWorkshopEntries', { worldbookName: W.WORKSHOP_WORLDBOOK, sourceMeta: { sourceId: id } })` → 提示「已移除 N 条」（`removed: 0` 时提示「没有找到该内容包的条目」）
6. **上传视图**：
   - 公共字段：名称、版本（默认 1.0.0）、作者名、Discord（选填）、标签（逗号分隔）、简介
   - 类型选择三选一。`extension` → 条目编辑器（可增删条目，每条：名称/正文/蓝灯开关/绿灯关键词（逗号分隔）/次要关键词/插入位置（角色定义前·后·指定深度）/depth/order/概率/递归两开关/sticky/cooldown/delay），下方实时拼出 pack JSON 预览；`build`/`character` → 大文本框粘贴 JSON + 说明「字段规范见包格式契约（构筑需 构筑名/定位/属性基础…；角色另需 外貌/背景）」
   - 提交前客户端轻量校验（JSON.parse、名称非空、扩展包至少一条条目且绿灯有条键）；`W.api.upload(pack)` 成功 → 弹层显示 `manageKey`，文案「这是你的管理密钥，只显示这一次，请立即保存。凭它更新或下架本包。」+「复制」按钮（`navigator.clipboard`）+ 跳详情
   - 失败 → 把服务端的人话错误原样显示
7. **逃逸纪律**：所有投稿内容（名称/简介/正文/作者名）注入 DOM 一律用 `textContent` / `document.createTextNode`；列表卡片用 `document.createElement` 拼装，禁止模板字符串拼 HTML 后 innerHTML。
8. **样式**：深色主题（背景 #0f172a 系，与宿主面板一致），响应式（最小宽度 320px），类型徽章三色系（扩展=蓝、构筑=紫、角色=金）。CSS 写在 `<style>` 里。

- [ ] **Step 2: Commit**

```bash
git add cloudflare/wxhl-cygf
git commit -m "feat(wxhl-cygf): 工坊页面 —— 浏览/详情/安装/卸载/上传/免责声明"
```

---

### Task 6: 部署配置 + 冒烟 + 收尾

**Files:**
- Create: `cloudflare/wxhl-cygf/wrangler.toml`
- Create: `cloudflare/wxhl-cygf/README.md`
- Create: `cloudflare/wxhl-cygf/smoke.mjs`

**Interfaces:**
- Consumes: Task 1-5 全部
- Produces: 部署物（需用户配合 wrangler login）

- [ ] **Step 1: wrangler.toml**

```toml
name = "wxhl-cygf"
main = "worker.ts"
compatibility_date = "2026-10-11"

# 文本资源：workshop.html 与 page-lib.js 以字符串形式打包进 worker
[[rules]]
type = "Text"
globs = ["**/*.html", "**/page-lib.js"]

# D1 免费版：500 万行读/10 万行写每天（别用 KV——market 踩过 list() 配额坑）
[[d1_databases]]
binding = "WORKSHOP_DB"
database_name = "wxhl-cygf-db"
database_id = "PENDING_CREATE"   # npx wrangler d1 create wxhl-cygf-db 后替换

# 国内直连 workers.dev 不通，必须自定义域（market 的既有教训）
routes = [{ pattern = "cygf.657868.xyz", custom_domain = true }]
```

- [ ] **Step 2: smoke.mjs**

```javascript
// 部署后冒烟：对 cygf.657868.xyz 跑全链路（列表→上传→详情→更新→删除）
// 用法：node cloudflare/wxhl-cygf/smoke.mjs [baseUrl]
const base = process.argv[2] ?? 'https://cygf.657868.xyz';

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` —— ${detail}` : ''}`);
  if (!ok) failed++;
};

const pack = {
  format: 'wxhl-mod@1',
  id: 'smoke',
  name: `冒烟测试包-${Date.now()}`,
  type: 'extension',
  version: '1.0.0',
  author: { name: 'smoke' },
  tags: ['冒烟'],
  description: '部署后冒烟，随即删除',
  worldbookEntries: [{ name: '冒烟条目', content: '冒烟正文', keys: ['冒烟'] }],
};

const home = await fetch(`${base}/`);
check('GET / 返回 HTML', home.ok && (home.headers.get('content-type') ?? '').includes('text/html'));

const emptyList = await (await fetch(`${base}/api/packs`)).json();
check('GET /api/packs 返回列表', Array.isArray(emptyList.packs) && typeof emptyList.total === 'number', `total=${emptyList.total}`);

const up = await fetch(`${base}/api/packs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pack) });
const upBody = await up.json();
check('POST /api/packs 上传', up.status === 201 && /^[0-9a-zA-Z]{8}$/.test(upBody.id ?? ''), `id=${upBody.id}`);

const detail = await (await fetch(`${base}/api/packs/${upBody.id}`)).json();
check('GET 详情', detail.pack?.name === pack.name && detail.pack?.id === upBody.id);

const list2 = await (await fetch(`${base}/api/packs?q=${encodeURIComponent(pack.name)}`)).json();
check('搜索能找到新包', list2.packs.some(p => p.id === upBody.id));

const upd = await fetch(`${base}/api/packs/${upBody.id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ manageKey: upBody.manageKey, pack: { ...pack, id: upBody.id, version: '1.0.1' } }),
});
check('PUT 更新（带密钥）', upd.status === 200);

const del = await fetch(`${base}/api/packs/${upBody.id}`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ manageKey: upBody.manageKey }),
});
check('DELETE 下架（带密钥）', del.status === 200);

const gone = await fetch(`${base}/api/packs/${upBody.id}`);
check('下架后详情 404', gone.status === 404);

console.log(failed === 0 ? '\n冒烟全绿' : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
```

- [ ] **Step 3: README.md**

照 `cloudflare/wxhl-market/README.md` 的格式写：项目一句话、数据表、接口表、部署步骤（`npx wrangler login` → `npx wrangler d1 create wxhl-cygf-db` → 填 database_id → `npx wrangler deploy` → `node smoke.mjs`）、与宿主仓的同步约定（包格式契约共享自 `src/wxhl-cygf/pack/`，桥协议常量两边一致）、管理密钥机制、一期边界（无登录/无审核/无限流，二期接 Discord 绑定密钥 + 审核队列）。

- [ ] **Step 4: 全量验证**

Run: `npx vitest run cloudflare/wxhl-cygf/ src/wxhl-cygf/` — 全绿
Run: `npm run build` — 成功
Run: `npx eslint cloudflare/wxhl-cygf/ src/wxhl-cygf/` — 无 error

- [ ] **Step 5: Commit + 推送宿主仓**

```bash
git add cloudflare/wxhl-cygf src/wxhl-cygf dist/wxhl-cygf
git commit -m "feat(wxhl-cygf): 云端工坊部署配置 + 冒烟 + README"
bash scripts/push-cygf.sh
```

- [ ] **Step 6: 部署（需用户在场）**

`npx wrangler login` 需要浏览器授权——**停下来交给用户**。用户授权后：`npx wrangler d1 create wxhl-cygf-db` → 把 database_id 填进 wrangler.toml → `npx wrangler deploy`（在 `cloudflare/wxhl-cygf/` 目录下）→ `node cloudflare/wxhl-cygf/smoke.mjs` 全绿 → 把 database_id 的填写也提交。

---

## Self-Review 记录

- **Spec 覆盖**：§2 结构→各任务文件；§3 契约→Task 1（deleteWorkshopEntries + 显式 zod）+ Task 4（桥客户端/映射/sourceMeta 带 version）；§4 数据模型→Task 2（比 spec 多 `entry_count` 列——列表要回 entryCount，避免每行解析 pack_json，spec 已隐式要求）；§5 API→Task 3；§6 页面→Task 5；§7 上传归属→Task 3；§8 测试部署→Task 6
- **Placeholder 扫描**：无 TBD/TODO；workshop.html 给的是结构要求+交互逻辑清单（DOM 代码体量大，但每项行为都有明确规定，不含"适当处理"式描述）
- **类型一致性**：`PackRow`/`ListQuery`（T2）→ worker fetch 层（T3）一致；`createBridgeClient`/`packToWorldbookEntries`/`sourceMetaOf`/`computeInstalled`（T4）→ 页面（T5）一致；宿主 `deleteWorkshopEntries` 的 payload 形状（T1）→ 页面调用（T5）一致
- **Review Focus**：5 条全部钉入（#1→T2 likeEscape 测试、#2→T3 403 同口径测试、#3→T3 超限测试、#4→T4 超时测试、#5→T3 撞车重试）
- **已知取舍**：workshop.html 无自动化测试（无 jsdom），由 Task 6 冒烟 + 人工核对兜底；`fake-d1.mjs` 与 market 的替身是**两份独立实现**（各自锚定各自的 SQL 形态，刻意不共用——market 的文件头注释记录过"两份假件漂移"的坑，其教训是"同一项目内只有一份"，跨项目各管各的）
