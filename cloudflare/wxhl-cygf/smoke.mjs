// 部署后冒烟：对 cygf.657868.xyz 跑全链路（列表→上传→详情→搜索→更新→删除）
// 用法：node cloudflare/wxhl-cygf/smoke.mjs [baseUrl]
//
// 响亮失败：任何一步不达标都会打印 ✗ 并以非零码退出。
// 上传成功的内容包一定会被删（主流程删一次，中途抛异常时 finally 兜底再删一次），
// 免得每次冒烟都在线上留垃圾。
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

const postJson = (path, body, method = 'POST') =>
  fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

let uploadedId = null;
let manageKey = null;
let deleted = false;

try {
  const home = await fetch(`${base}/`);
  check('GET / 返回 HTML', home.ok && (home.headers.get('content-type') ?? '').includes('text/html'));

  const emptyList = await (await fetch(`${base}/api/packs`)).json();
  check('GET /api/packs 返回列表', Array.isArray(emptyList.packs) && typeof emptyList.total === 'number', `total=${emptyList.total}`);

  const up = await fetch(`${base}/api/packs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pack) });
  const upBody = await up.json();
  uploadedId = /^[0-9a-zA-Z]{8}$/.test(upBody.id ?? '') ? upBody.id : null;
  manageKey = typeof upBody.manageKey === 'string' ? upBody.manageKey : null;
  check('POST /api/packs 上传', up.status === 201 && uploadedId !== null, `id=${upBody.id}`);

  const detail = await (await fetch(`${base}/api/packs/${uploadedId}`)).json();
  check('GET 详情', detail.pack?.name === pack.name && detail.pack?.id === uploadedId);

  const list2 = await (await fetch(`${base}/api/packs?q=${encodeURIComponent(pack.name)}`)).json();
  check('搜索能找到新包', Array.isArray(list2.packs) && list2.packs.some(p => p.id === uploadedId));

  const upd = await postJson(`/api/packs/${uploadedId}`, { manageKey, pack: { ...pack, id: uploadedId, version: '1.0.1' } }, 'PUT');
  check('PUT 更新（带密钥）', upd.status === 200);

  const del = await postJson(`/api/packs/${uploadedId}`, { manageKey }, 'DELETE');
  deleted = del.status === 200;
  check('DELETE 下架（带密钥）', deleted);

  const gone = await fetch(`${base}/api/packs/${uploadedId}`);
  check('下架后详情 404', gone.status === 404);
} catch (e) {
  check('冒烟未抛异常', false, e instanceof Error ? e.message : String(e));
} finally {
  // 中途失败/抛异常时兜底删除，别把冒烟包留在线上
  if (uploadedId && manageKey && !deleted) {
    try {
      const cleanup = await postJson(`/api/packs/${uploadedId}`, { manageKey }, 'DELETE');
      check('兜底删除冒烟包', cleanup.status === 200, `status=${cleanup.status}`);
    } catch (e) {
      check('兜底删除冒烟包', false, e instanceof Error ? e.message : String(e));
    }
  }
}

console.log(failed === 0 ? '\n冒烟全绿' : `\n${failed} 项失败`);
process.exit(failed === 0 ? 0 : 1);
