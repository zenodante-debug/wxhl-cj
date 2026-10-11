// 无限回廊 · 创意工坊 Worker（存储层：Cloudflare D1）
// 部署见同目录 README.md。包格式契约共享自 src/wxhl-cygf/pack/（单一真源，勿另写）。
import { z } from 'zod';
import { ContentPack } from '../../src/wxhl-cygf/pack';
import WORKSHOP_HTML from './workshop.html';
import PAGE_LIB from './page-lib.js';

// isolate 记忆化：spec 要求「首次请求自动建表」，DDL 每请求跑一遍会白烧三次 D1 往返（也计入免费版写配额）。
// 失败即重置，下次请求重试；模块顶层只声明变量、不在导入时建表。
let schemaReady: Promise<void> | null = null;

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

/** listPacks 的投影行：只含 SELECT 列出的元数据（无 manage_hash / pack_json 等敏感或大字段） */
export interface PackListRow {
  id: string;
  name: string;
  type: string;
  version: string;
  author_name: string;
  tags_json: string;
  description: string;
  downloads: number;
  entry_count: number;
  updated: string;
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

export async function listPacks(db: D1Database, query: ListQuery): Promise<{ rows: PackListRow[]; total: number }> {
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
    .all()) as { results: PackListRow[] };
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

/** 管理端点专用：无视密钥按 id 删除 */
export async function deletePackById(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM packs WHERE id = ?`).bind(id).run();
  return (result.meta?.changes ?? 0) > 0;
}

/** 管理端点专用：重置管理密钥（玩家丢密钥时工坊主找回） */
export async function resetManageKey(db: D1Database, id: string, newHash: string): Promise<boolean> {
  const result = await db.prepare(`UPDATE packs SET manage_hash = ?, updated = ? WHERE id = ?`).bind(newHash, new Date().toISOString(), id).run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function bumpDownloads(db: D1Database, id: string): Promise<void> {
  await db.prepare(`UPDATE packs SET downloads = downloads + 1 WHERE id = ?`).bind(id).run();
}

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

// listPacks 现在只回 10 列元数据投影（PackListRow），toMeta 只读这些列
function toMeta(row: PackListRow) {
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
  async fetch(request: Request, env: { WORKSHOP_DB: D1Database; WORKSHOP_ADMIN_KEY?: string }): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/' && request.method === 'GET') {
        return new Response(WORKSHOP_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
      if (url.pathname === '/page-lib.js' && request.method === 'GET') {
        return new Response(PAGE_LIB, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
      }

      schemaReady ??= ensureSchema(env.WORKSHOP_DB).catch(e => {
        schemaReady = null; // 建表失败 → 清掉缓存的 rejected promise，下次请求重试
        throw e;
      });
      await schemaReady;
      const db = env.WORKSHOP_DB;

      // 管理端点（/api/admin/*）：Worker secret WORKSHOP_ADMIN_KEY；没配就一律 403（fail-closed，market 惯例）
      if (url.pathname.startsWith('/api/admin/')) {
        if (request.method !== 'POST') return err('管理端点只接受 POST', 405);
        let body: any;
        try {
          body = await request.json();
        } catch {
          return err('请求体不是合法 JSON', 400);
        }
        const adminKey = env.WORKSHOP_ADMIN_KEY;
        if (!adminKey || body?.key !== adminKey) return err('管理密钥不正确或未配置', 403);

        if (url.pathname === '/api/admin/list') {
          const { rows, total } = await listPacks(db, { limit: 200, offset: 0 });
          return json({ total, rows: rows.map(toMeta) });
        }
        if (url.pathname === '/api/admin/delete') {
          const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
          if (ids.length === 0) return err('缺少 ids', 400);
          let deleted = 0;
          for (const id of ids) {
            if (await deletePackById(db, id)) deleted++;
          }
          return json({ ok: true, deleted });
        }
        if (url.pathname === '/api/admin/reset-key') {
          if (typeof body.id !== 'string' || !body.id) return err('缺少 id', 400);
          const manageKey = crypto.randomUUID().replaceAll('-', '');
          const manageHash = await sha256Hex(manageKey);
          if (!(await resetManageKey(db, body.id, manageHash))) return err('内容包不存在', 404);
          return json({ ok: true, id: body.id, manageKey });
        }
        return err('没有这个管理端点', 404);
      }

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
