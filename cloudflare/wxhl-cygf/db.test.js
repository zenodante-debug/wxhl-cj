import { describe, expect, it, vi } from 'vitest';

// worker.ts 现在也导入 wrangler Text 资源（workshop.html / page-lib.js）——vitest 不识别该规则，同样 mock 掉
vi.mock('./workshop.html', () => ({ default: '<!doctype html><title>stub</title>' }));
vi.mock('./page-lib.js', () => ({ default: '// stub' }));

import { makeFakeD1 } from './fake-d1.mjs';
import { bumpDownloads, deletePackById, deletePackByKey, ensureSchema, getPackById, insertPack, likeEscape, listPacks, resetManageKey, updatePackByKey } from './worker.ts';

const row = (over = {}) => ({
  id: 'a1b2c3d4', name: '雾中列车', type: 'extension', version: '1.0.0',
  author_name: '测试作者', author_discord: '', tags_json: '["副本"]',
  description: '一列永远到不了站的列车', pack_json: '{}', manage_hash: 'h1',
  status: 'published', downloads: 0, entry_count: 2, cover: '',
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
    // p2 显式给出不同简介：默认简介含「列车」，否则 q='列车' 会经 description 命中 p2，
    // 使「按名称命中」的断言混淆（brief 原文 fixture 与断言自相矛盾）
    await insertPack(db, row({ id: 'p2', name: '重装堡垒', type: 'build', description: '一座钢铁要塞' }));
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

  it('deletePackById / resetManageKey：管理端点专用，不看旧密钥', async () => {
    const db = await freshDb();
    await insertPack(db, row());
    expect(await resetManageKey(db, 'a1b2c3d4', 'h2')).toBe(true);
    expect((await getPackById(db, 'a1b2c3d4'))?.manage_hash).toBe('h2');
    expect(await resetManageKey(db, 'zzzzzzzz', 'h3')).toBe(false);
    expect(await deletePackById(db, 'a1b2c3d4')).toBe(true);
    expect(await deletePackById(db, 'a1b2c3d4')).toBe(false);
  });

  it('tag 过滤：只回 tags_json 含该标签的包', async () => {
    const db = await freshDb();
    await insertPack(db, row({ id: 'p1', name: '雾中列车', tags_json: '["副本"]' }));
    await insertPack(db, row({ id: 'p2', name: '重装堡垒', tags_json: '["建造"]' }));
    const page = await listPacks(db, { tag: '副本', limit: 50, offset: 0 });
    expect(page.rows.map(r => r.id)).toEqual(['p1']);
    expect(page.total).toBe(1);
  });

  it('{q, tag} 组合：q 分组短路后 tag 实参不错位（Finding 1）', async () => {
    const db = await freshDb();
    await insertPack(db, row({ id: 'p1', name: '雾中列车', tags_json: '["副本"]' }));
    await insertPack(db, row({ id: 'p2', name: '重装堡垒', tags_json: '["建造"]' }));
    const page = await listPacks(db, { q: '列车', tag: '副本', limit: 50, offset: 0 });
    expect(page.total).toBe(1);
    expect(page.rows.map(r => r.id)).toEqual(['p1']);
  });

  it('LIKE 大小写不敏感（SQLite 默认语义，Finding 2）', async () => {
    const db = await freshDb();
    await insertPack(db, row({ id: 'p1', name: 'Alpha' }));
    expect((await listPacks(db, { q: 'alpha', limit: 50, offset: 0 })).rows.map(r => r.id)).toEqual(['p1']);
  });

  it('假件：WHERE 里出现未知列名抛错（认不出的 SQL 一律抛错，Finding 3）', async () => {
    const db = await freshDb();
    await expect(db.prepare(`SELECT COUNT(*) AS total FROM packs WHERE boo = ?`).bind('x').first()).rejects.toThrow(/未知列|no such column/);
    await expect(db.prepare(`SELECT id FROM packs WHERE boo = ? ORDER BY updated DESC LIMIT ? OFFSET ?`).bind('x', 1, 0).all()).rejects.toThrow(/未知列|no such column/);
  });
});
