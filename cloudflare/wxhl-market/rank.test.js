import { describe, expect, it } from 'vitest';
import { fakeD1 } from './fake-d1.js';
import worker from './worker.js';

// ================================================================
// 玩家排行榜 · Worker 端点
//
// 排序 / 名次 / LIMIT OFFSET 的语义已用真 SQLite（node:sqlite）核对过，
// 假 D1 编码的就是那套已验证的行为（D1 本身就是 SQLite）。
//
// 规则：按等级排名（资格分每赛季清零，不用它）；唯一键是契约者姓名，
//       同名后来者顶掉先前者；Lv.10 起才能参与，等级无上限。
// ================================================================

const env = (extra = {}) => ({ MARKET_DB: fakeD1(), ...extra });
const post = (path, body) =>
  new Request('https://test.local' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const get = path => new Request('https://test.local' + path);

const ADMIN = 'test-admin-key';
const adminEnv = () => env({ RANK_ADMIN_KEY: ADMIN });

/** 直接按 Worker 用的那条 UPSERT 落一行，用于摆出确定的 updated（端点写入的是 Date.now()） */
const SEED_SQL = `INSERT INTO ranks (name, lv, title, job, updated) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(name) DO UPDATE SET lv=excluded.lv, title=excluded.title, job=excluded.job, updated=excluded.updated`;
function seed(e, name, lv, updated, title = '无称号', job = '无职业') {
  return e.MARKET_DB.prepare(SEED_SQL).bind(name, lv, title, job, updated).run();
}

/** 摆 22 个人：等级从 120 递减，updated 递增 —— 名次 1..22 完全确定 */
async function seedBoard(e, n = 22) {
  for (let i = 0; i < n; i++) await seed(e, '契约者' + String(i + 1).padStart(2, '0'), 120 - i, 1000 + i);
}

const 合法 = { name: '林千尺', lv: 27, title: '「无距之刃」', job: '次元行者' };

describe('POST /rank/submit · 上传', () => {
  it('首次上传 → 回名次与总人数', async () => {
    const e = env();
    const res = await worker.fetch(post('/rank/submit', 合法), e);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rank: 1, total: 1 });
  });

  it('同名后来的顶掉先前的（换新存档，等级更低也照样覆盖）', async () => {
    const e = env();
    await worker.fetch(post('/rank/submit', { ...合法, lv: 40, title: '旧称号' }), e);
    const res = await worker.fetch(post('/rank/submit', { ...合法, lv: 20, title: '新称号' }), e);
    expect(res.status).toBe(200);
    const { list, total } = await (await worker.fetch(get('/rank/top'), e)).json();
    expect(total).toBe(1);
    expect(list).toHaveLength(1);
    expect(list[0].lv).toBe(20);
    expect(list[0].title).toBe('新称号');
  });

  it('顶掉之后名次跟着重算（Lv.27 的第 4 → 换成 Lv.121 直接第 1）', async () => {
    const e = env();
    await seedBoard(e, 3); // 等级 120 / 119 / 118
    expect((await (await worker.fetch(post('/rank/submit', 合法), e)).json()).rank).toBe(4);
    const res = await worker.fetch(post('/rank/submit', { ...合法, lv: 121 }), e);
    expect((await res.json()).rank).toBe(1);
    const { total } = await (await worker.fetch(get('/rank/top'), e)).json();
    expect(total).toBe(4); // 同名顶掉，不是新增一行
  });

  it('同等级时新传的排在老传的后面（名次如实反映上传先后）', async () => {
    const e = env();
    await seedBoard(e, 3); // 契约者02 = Lv.119，updated=1001
    const res = await worker.fetch(post('/rank/submit', { ...合法, lv: 119 }), e);
    expect((await res.json()).rank).toBe(3); // 等级与契约者02相同，但传得晚 → 排在它后面
  });

  it('等级无上限：Lv.99999 照样能上榜', async () => {
    const e = env();
    const res = await worker.fetch(post('/rank/submit', { ...合法, lv: 99999 }), e);
    expect(res.status).toBe(200);
    expect((await res.json()).rank).toBe(1);
  });

  it('低于 Lv.10 被拒（Lv.1 不上榜）', async () => {
    const e = env();
    const res = await worker.fetch(post('/rank/submit', { ...合法, lv: 9 }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('Lv.10');
  });

  it('等级非整数被拒', async () => {
    const e = env();
    expect((await worker.fetch(post('/rank/submit', { ...合法, lv: 12.5 }), e)).status).toBe(400);
    expect((await worker.fetch(post('/rank/submit', { ...合法, lv: 'LV27' }), e)).status).toBe(400);
    expect((await worker.fetch(post('/rank/submit', { ...合法, lv: null }), e)).status).toBe(400);
  });

  it('姓名为空 / 缺失 / 超长被拒', async () => {
    const e = env();
    expect((await worker.fetch(post('/rank/submit', { ...合法, name: '' }), e)).status).toBe(400);
    expect((await worker.fetch(post('/rank/submit', { ...合法, name: undefined }), e)).status).toBe(400);
    expect((await worker.fetch(post('/rank/submit', { ...合法, name: '甲'.repeat(25) }), e)).status).toBe(400);
    expect((await worker.fetch(post('/rank/submit', { ...合法, name: '甲'.repeat(24) }), e)).status).toBe(200);
  });

  it('称号 / 职业超长被拒', async () => {
    const e = env();
    expect((await worker.fetch(post('/rank/submit', { ...合法, title: '称'.repeat(33) }), e)).status).toBe(400);
    expect((await worker.fetch(post('/rank/submit', { ...合法, job: '职'.repeat(33) }), e)).status).toBe(400);
  });

  it('称号 / 职业可缺省（服务器补「无称号」「无职业」）', async () => {
    const e = env();
    const res = await worker.fetch(post('/rank/submit', { name: '无称号者', lv: 15 }), e);
    expect(res.status).toBe(200);
    const { list } = await (await worker.fetch(get('/rank/top'), e)).json();
    expect(list[0].title).toBe('无称号');
    expect(list[0].job).toBe('无职业');
  });
});

describe('GET /rank/top · 榜单', () => {
  it('空榜 → 三样都是空的', async () => {
    const e = env();
    expect(await (await worker.fetch(get('/rank/top'), e)).json()).toEqual({
      list: [],
      total: 0,
      me: null,
      near: [],
    });
  });

  it('不足 TOP_N 人就出全部，名次按等级降序', async () => {
    const e = env();
    await seedBoard(e, 3);
    const { list, total } = await (await worker.fetch(get('/rank/top'), e)).json();
    expect(total).toBe(3);
    expect(list.map(r => r.name)).toEqual(['契约者01', '契约者02', '契约者03']);
  });

  it('同等级 → 先上传的在前', async () => {
    const e = env();
    await seed(e, '后传的', 50, 2000);
    await seed(e, '先传的', 50, 1000);
    const { list } = await (await worker.fetch(get('/rank/top'), e)).json();
    expect(list.map(r => r.name)).toEqual(['先传的', '后传的']);
  });

  it('一次只出 TOP_N 条，但 total 是全服总人数', async () => {
    const e = env();
    await seedBoard(e, 25);
    const { list, total } = await (await worker.fetch(get('/rank/top'), e)).json();
    expect(list).toHaveLength(20);
    expect(total).toBe(25);
  });

  it('我在前 20 → me.rank 正确，且不下发 near', async () => {
    const e = env();
    await seedBoard(e, 25);
    const { me, near } = await (
      await worker.fetch(get('/rank/top?name=' + encodeURIComponent('契约者05')), e)
    ).json();
    expect(me.rank).toBe(5);
    expect(me.entry.lv).toBe(116);
    expect(near).toEqual([]);
  });

  it('我第 21 名 → near 只给 #21 / #22，#20 不重复下发', async () => {
    const e = env();
    await seedBoard(e, 25);
    const { me, near } = await (
      await worker.fetch(get('/rank/top?name=' + encodeURIComponent('契约者21')), e)
    ).json();
    expect(me.rank).toBe(21);
    expect(near.map(n => n.rank)).toEqual([21, 22]);
    expect(near.map(n => n.entry.name)).toEqual(['契约者21', '契约者22']);
  });

  it('我是最后一名 → near 只有前一名和我', async () => {
    const e = env();
    await seedBoard(e, 23);
    const { me, near } = await (
      await worker.fetch(get('/rank/top?name=' + encodeURIComponent('契约者23')), e)
    ).json();
    expect(me.rank).toBe(23);
    expect(near.map(n => n.rank)).toEqual([22, 23]);
  });

  it('刚好第 21 名（前一名还是 #20，已被榜单区覆盖）→ 只给 #21 / #22', async () => {
    const e = env();
    await seedBoard(e, 22);
    const { near } = await (
      await worker.fetch(get('/rank/top?name=' + encodeURIComponent('契约者21')), e)
    ).json();
    expect(near.map(n => n.rank)).toEqual([21, 22]);
  });

  it('没上传过的人查榜 → me 为 null，榜单照常返回', async () => {
    const e = env();
    await seedBoard(e, 3);
    const { me, list, total } = await (
      await worker.fetch(get('/rank/top?name=' + encodeURIComponent('查无此人')), e)
    ).json();
    expect(me).toBeNull();
    expect(list).toHaveLength(3);
    expect(total).toBe(3);
  });
});

describe('排行榜管理端点 · 运营清理', () => {
  it('密钥不对 / 没带 → 403', async () => {
    const e = adminEnv();
    await seedBoard(e, 2);
    expect((await worker.fetch(post('/rank/admin/list', { key: '错的' }), e)).status).toBe(403);
    expect((await worker.fetch(post('/rank/admin/list', {}), e)).status).toBe(403);
    expect((await worker.fetch(post('/rank/admin/delete', { key: '错的', names: ['契约者01'] }), e)).status).toBe(403);
  });

  it('Worker 没配 RANK_ADMIN_KEY 时一律 403（不能因为没配就放行）', async () => {
    const e = env(); // 不设 RANK_ADMIN_KEY
    await seedBoard(e, 2);
    expect((await worker.fetch(post('/rank/admin/list', { key: ADMIN }), e)).status).toBe(403);
    expect((await worker.fetch(post('/rank/admin/clear', { key: ADMIN, confirm: 'CLEAR' }), e)).status).toBe(403);
  });

  it('list 能看到全表并分页', async () => {
    const e = adminEnv();
    await seedBoard(e, 25);
    const p1 = await (await worker.fetch(post('/rank/admin/list', { key: ADMIN }), e)).json();
    expect(p1.total).toBe(25);
    expect(p1.rows).toHaveLength(20);
    const p2 = await (await worker.fetch(post('/rank/admin/list', { key: ADMIN, offset: 20 }), e)).json();
    expect(p2.rows).toHaveLength(5);
    expect(p1.rows[0].name).toBe('契约者01');
  });

  it('delete 定向删（可一次删多个）', async () => {
    const e = adminEnv();
    await seedBoard(e, 5);
    const res = await worker.fetch(post('/rank/admin/delete', { key: ADMIN, names: ['契约者01', '契约者03'] }), e);
    expect(await res.json()).toEqual({ deleted: 2 });
    const { total } = await (await worker.fetch(get('/rank/top'), e)).json();
    expect(total).toBe(3);
  });

  it('purge 不给任何条件 → 拒绝（避免手滑清库）', async () => {
    const e = adminEnv();
    await seedBoard(e, 5);
    const res = await worker.fetch(post('/rank/admin/purge', { key: ADMIN }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('条件');
  });

  it('purge by before → 只删久未更新的', async () => {
    const e = adminEnv();
    await seed(e, '老古董', 10, 1000);
    await seed(e, '新鲜人', 20, 9000);
    expect(await (await worker.fetch(post('/rank/admin/purge', { key: ADMIN, before: 5000 }), e)).json()).toEqual({
      deleted: 1,
    });
    const { list } = await (await worker.fetch(get('/rank/top'), e)).json();
    expect(list.map(r => r.name)).toEqual(['新鲜人']);
  });

  it('purge by belowLv → 删掉等级太低的一批', async () => {
    const e = adminEnv();
    await seedBoard(e, 5); // Lv.120~116
    await seed(e, '躺平哥', 12, 1000);
    expect(await (await worker.fetch(post('/rank/admin/purge', { key: ADMIN, belowLv: 100 }), e)).json()).toEqual({
      deleted: 1,
    });
    const { total } = await (await worker.fetch(get('/rank/top'), e)).json();
    expect(total).toBe(5);
  });

  it('clear 必须字面确认 CLEAR', async () => {
    const e = adminEnv();
    await seedBoard(e, 5);
    expect((await worker.fetch(post('/rank/admin/clear', { key: ADMIN, confirm: 'clear' }), e)).status).toBe(400);
    expect((await worker.fetch(post('/rank/admin/clear', { key: ADMIN }), e)).status).toBe(400);
    expect(await (await worker.fetch(post('/rank/admin/clear', { key: ADMIN, confirm: 'CLEAR' }), e)).json()).toEqual({
      deleted: 5,
    });
    const { total } = await (await worker.fetch(get('/rank/top'), e)).json();
    expect(total).toBe(0);
  });

  it('管理端点不泄露密钥（响应里不回显 key）', async () => {
    const e = adminEnv();
    const res = await worker.fetch(post('/rank/admin/list', { key: ADMIN }), e);
    expect(await res.text()).not.toContain(ADMIN);
  });
});

describe('市场不受影响', () => {
  it('同一套 rank 端点和市场端点共存，各自 404 兜底照旧', async () => {
    const e = env();
    expect((await worker.fetch(get('/rank/nope'), e)).status).toBe(404);
    expect((await worker.fetch(get('/nope'), e)).status).toBe(404);
    const market = await (await worker.fetch(get('/market/listings'), e)).json();
    expect(market).toEqual({ listings: [] });
  });
});
