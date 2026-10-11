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
