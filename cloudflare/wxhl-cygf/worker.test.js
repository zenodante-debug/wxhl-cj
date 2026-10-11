// cloudflare/wxhl-cygf/worker.test.js
import { beforeEach, describe, expect, it, vi } from 'vitest';

// vitest 不识别 wrangler 的 Text 规则——把两个文本资源 mock 掉
vi.mock('./workshop.html', () => ({ default: '<!doctype html><title>stub</title>' }));
vi.mock('./page-lib.js', () => ({ default: '// stub' }));

import worker, { insertPack } from './worker.ts';
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
  format: 'wxhl-mod@2',
  id: '将被服务端覆写',
  name: '雾中列车',
  type: 'mechanism',
  version: '1.0.0',
  author: { name: '测试作者' },
  tags: ['副本'],
  description: '一列永远到不了站的列车',
  条目: [{ name: '列车时刻表', content: '……正文……', keys: ['雾中列车'] }],
});

/** 直接落库用的行（db.test.js 同名 helper 的最小内联版）：老包@1 用例要绕过上传校验。 */
const row = (over = {}) => ({
  id: 'a1b2c3d4', name: '雾中列车', type: 'mechanism', version: '1.0.0',
  author_name: '测试作者', author_discord: '', tags_json: '["副本"]',
  description: '一列永远到不了站的列车', pack_json: '{}', manage_hash: 'h1',
  status: 'published', downloads: 0, entry_count: 2, cover: '',
  created: '2026-10-11T00:00:00Z', updated: '2026-10-11T00:00:00Z',
  ...over,
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
    bad.条目 = [{ name: 'x', content: 'y' }];
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
    many.条目 = Array.from({ length: 101 }, (_, i) => ({ name: `e${i}`, content: 'c', keys: ['k'] }));
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
    expect(detail.pack.条目[0].name).toBe('列车时刻表');
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

describe('管理端点（工坊主万能通道）', () => {
  const adminEnv = key => ({ WORKSHOP_DB: db, WORKSHOP_ADMIN_KEY: key });

  it('未配置 WORKSHOP_ADMIN_KEY → 一律 403（fail-closed，market 惯例）', async () => {
    const res = await worker.fetch(postJson('/api/admin/list', { key: 'x' }), env());
    expect(res.status).toBe(403);
  });

  it('密钥错误 → 403；正确 → list 返回元数据', async () => {
    await upload();
    expect((await worker.fetch(postJson('/api/admin/list', { key: 'wrong' }), adminEnv('s3cret'))).status).toBe(403);
    const res = await worker.fetch(postJson('/api/admin/list', { key: 's3cret' }), adminEnv('s3cret'));
    expect(res.status).toBe(200);
    expect((await res.json()).total).toBe(1);
  });

  it('admin/delete 无视管理密钥强制下架', async () => {
    const { body } = await upload();
    const res = await worker.fetch(postJson('/api/admin/delete', { key: 's3cret', ids: [body.id] }), adminEnv('s3cret'));
    expect(res.status).toBe(200);
    expect((await res.json()).deleted).toBe(1);
    expect((await worker.fetch(get(`/api/packs/${body.id}`), env())).status).toBe(404);
  });

  it('admin/reset-key 重置密钥：旧密钥失效，新密钥可用', async () => {
    const { body } = await upload();
    const reset = await worker.fetch(postJson('/api/admin/reset-key', { key: 's3cret', id: body.id }), adminEnv('s3cret'));
    expect(reset.status).toBe(200);
    const { manageKey: newKey } = await reset.json();
    expect((await worker.fetch(postJson(`/api/packs/${body.id}`, { manageKey: body.manageKey, pack: validPack() }, 'PUT'), env())).status).toBe(403);
    expect((await worker.fetch(postJson(`/api/packs/${body.id}`, { manageKey: newKey, pack: { ...validPack(), version: '1.0.1' } }, 'PUT'), env())).status).toBe(200);
  });
});

describe('cover 与五类型', () => {
  const v2 = (over = {}) => ({
    format: 'wxhl-mod@2', id: 'x', name: '雾中列车', version: '1.0.0', author: { name: 'a' },
    description: '简介', cover: 'https://x.test/c.png', tags: [], requires: {},
    type: 'mechanism', 条目: [{ name: 'n', content: 'c', keys: ['k'] }], ...over,
  });

  it('上传 @2 包 → 201，列表/详情都带 cover', async () => {
    const up = await worker.fetch(postJson('/api/packs', v2()), env());
    expect(up.status).toBe(201);
    const { id } = await up.json();
    const list = await (await worker.fetch(get('/api/packs'), env())).json();
    expect(list.packs[0]).toMatchObject({ cover: 'https://x.test/c.png', type: 'mechanism', typeLabel: '机制拓展' });
    const detail = await (await worker.fetch(get(`/api/packs/${id}`), env())).json();
    expect(detail.pack.cover).toBe('https://x.test/c.png');
  });

  it('老库里的 @1 包（pack_json 是旧格式）不炸列表，cover 回退空串（Review Focus #4）', async () => {
    await insertPack(db, { ...row(), type: 'extension', pack_json: JSON.stringify({ format: 'wxhl-mod@1', type: 'extension' }), cover: '' });
    const res = await worker.fetch(get('/api/packs'), env());
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list.packs[0].cover).toBe('');
    expect(list.packs[0].typeLabel).toBe('内容'); // 未知/旧 type 回退通用标签，不崩
  });

  it('entryCount 按新契约算：mechanism=条目数，event=事件条目+控制器', async () => {
    const upM = await upload({ ...v2(), type: 'mechanism', 条目: [{ name: 'a', content: 'c', keys: ['k'] }, { name: 'b', content: 'c', keys: ['k'] }] });
    const upE = await upload({
      ...v2(), type: 'event',
      事件条目: [{ name: '事件_p_a', content: 'c', keys: ['k'] }],
      控制器条目: { 名称: 'EJS/p控制器', 正文: '<% %>' },
    });
    const list = await (await worker.fetch(get('/api/packs'), env())).json();
    const byId = Object.fromEntries(list.packs.map(p => [p.id, p.entryCount]));
    expect(byId[upM.body.id]).toBe(2);
    expect(byId[upE.body.id]).toBe(2);
  });
});
