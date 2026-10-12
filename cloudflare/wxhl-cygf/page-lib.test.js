// cloudflare/wxhl-cygf/page-lib.test.js
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  api, applyMvuCommands, computeInstalled, coverOrPlaceholder, createBridgeClient, deriveAttributeDirection, isAgreementAccepted, mapExtensionEntry,
  MAX_IMPORT_BYTES, packToWorldbookEntries, parseBuildJson, parseWorldbookJson,
  renderBuildEntry, renderPersonaEntry, sourceMetaOf,
} from './page-lib.js';

describe('桥客户端', () => {
  function fakeWindows() {
    const posted = [];
    const listeners = new Set();
    const parentWindow = { postMessage: vi.fn(m => posted.push(m)) };
    // 线上真实来源：宿主脚本跑在酒馆页面的**兄弟 iframe** 里，回包的 sender 是它，
    // 而不是本页面的 window.parent —— 夹具必须照这个来，否则会像 2026-10-11 那样
    // 把「页面永远收不到回包」的 bug 测成绿的。
    const scriptFrame = { postMessage: vi.fn(), name: 'wxhl-cygf-host-script-iframe' };
    const selfWindow = {
      addEventListener: (_t, l) => listeners.add(l),
      removeEventListener: (_t, l) => listeners.delete(l),
    };
    const respond = (id, payload, ok = true) => {
      const data = { channel: 'wxhl-workshop:worldbook', kind: 'response', id, ok, ...(ok ? { payload } : { error: payload }) };
      listeners.forEach(l => l({ data, source: scriptFrame }));
    };
    /** 用别的 channel 发一条同 id 的响应 */
    const respondChannel = (channel, id, payload) => {
      listeners.forEach(l => l({ data: { channel, kind: 'response', id, ok: true, payload }, source: scriptFrame }));
    };
    /** 原样灌任意消息体；source 默认为**宿主脚本的 iframe**（线上真实来源），可传自定义来源 */
    const respondRaw = (data, source = scriptFrame) => listeners.forEach(l => l({ data, source }));
    return { posted, respond, respondChannel, respondRaw, parentWindow, selfWindow, scriptFrame };
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
    const sentId = w.posted[0].id;
    // 先灌三条无关消息：别的 id、别的 channel、以及一条非响应消息
    w.respond('nobody', { ignored: true });
    w.respondChannel('other', sentId, { ignored: true });
    w.respondRaw({ channel: 'wxhl-workshop:worldbook', kind: 'request', id: sentId, action: 'x' });
    let settled = false;
    promise.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false); // 三条无关消息都没能结算这个请求
    w.respond(sentId, { ok: true });
    await expect(promise).resolves.toEqual({ ok: true });
    bridge.destroy();
  });

  it('回包来自宿主脚本 iframe（兄弟 frame，而非 parentWindow）也必须被采信 —— 2026-10-11 回归', async () => {
    const w = fakeWindows();
    const bridge = createBridgeClient({ parentWindow: w.parentWindow, selfWindow: w.selfWindow });
    const promise = bridge.request('getContext');
    const sentId = w.posted[0].id;
    // 关键：source 是脚本 iframe，不是 parentWindow
    expect(w.scriptFrame).not.toBe(w.parentWindow);
    w.respondRaw({ channel: 'wxhl-workshop:worldbook', kind: 'response', id: sentId, ok: true, payload: { worldbookNames: [] } }, w.scriptFrame);
    await expect(promise).resolves.toEqual({ worldbookNames: [] });
    bridge.destroy();
  });

  it('id 不匹配的响应不采信（配对唯一靠 id）', async () => {
    const w = fakeWindows();
    const bridge = createBridgeClient({ parentWindow: w.parentWindow, selfWindow: w.selfWindow });
    const promise = bridge.request('handshake');
    const sentId = w.posted[0].id;
    w.respondRaw({ channel: 'wxhl-workshop:worldbook', kind: 'response', id: 'nobody', ok: true, payload: { forged: true } });
    let settled = false;
    promise.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false); // 对不上 id → 不结算
    w.respond(sentId, { ok: true });
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
    属性分配方向: { 主属性: 'STR', 副属性: 'CON' },
    天赋: { 名称: '石肤', 品质: '蓝色', 效果: { 减伤: '受击-2' } },
    血统: { 名称: '无' }, 称号: { 名称: '无' },
    职业: { 名称: '卫士', 稀有度: '蓝', 职业技能: {}, 职业特性: {} },
    通用技能: { 横扫: { 类型: '主动', 消耗: '10MP', 效果: { 说明: '横扫一片' } } },
    主要装备: { 主武器: { 名称: '斩首大剑', 品质: '紫色', 阶位: '二阶', 伤害骰: '2d6', 倍率: 1.5, 主属性加成: 3 }, 头部: { 名称: '无' } },
    背包建议: { 治疗药水: { 描述: '回血', 数量: 3 } },
  };

  it('构筑渲染含构筑名/定位/属性方向/技能/装备/背包（只给方向不给数值）', () => {
    const text = renderBuildEntry(build);
    expect(text).toContain('重装堡垒');
    expect(text).toContain('物理破坏配合高容错换血');
    expect(text).toContain('主 STR');
    expect(text).toContain('横扫');
    expect(text).toContain('斩首大剑');
    expect(text).toContain('治疗药水');
  });
});

describe('packToWorldbookEntries / sourceMetaOf / computeInstalled', () => {
  const extPack = {
    id: 'abc12345', name: '雾中列车', type: 'mechanism', version: '1.0.0',
    条目: [{ name: '时刻表', content: 'x', keys: ['列车'] }],
  };

  it('机制拓展包 → 每条一个酒馆条目，名字带包名前缀，extra 留空给宿主盖章', () => {
    const entries = packToWorldbookEntries(extPack);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('[回廊mod][机制拓展]雾中列车·时刻表');
    expect(entries[0].extra.wxhlWorkshop.sourceId).toBe('');
  });

  it('构筑包 → 单条绿灯条目，关键词为构筑名', () => {
    const pack = {
      id: 'b1', name: '重装堡垒构筑', type: 'build', version: '2.0.0',
      build: { 构筑名: '重装堡垒', 定位: '……', 属性分配方向: { 主属性: 'STR', 副属性: '无' }, 天赋: { 名称: '无' }, 血统: { 名称: '无' }, 称号: { 名称: '无' }, 职业: { 名称: '无' }, 通用技能: {}, 主要装备: {}, 背包建议: {} },
    };
    const entries = packToWorldbookEntries(pack);
    expect(entries).toHaveLength(1);
    expect(entries[0].strategy.type).toBe('selective');
    expect(entries[0].strategy.keys).toEqual(['重装堡垒']);
    expect(entries[0].content).toContain('重装堡垒');
  });

  it('sourceMetaOf 带 version 与 title（宿主盖章后落进 extra，供已装版本对比）', () => {
    expect(sourceMetaOf(extPack)).toEqual({ sourceId: 'abc12345', sourceType: 'mechanism', version: '1.0.0', title: '雾中列车' });
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

describe('世界书 JSON 导入器', () => {
  const book = (entries, extra = {}) => JSON.stringify({ name: '我的世界书', entries: Object.fromEntries(entries.map((e, i) => [String(i), e])), ...extra });
  const native = (over = {}) => ({ uid: 1, key: ['雾'], keysecondary: [], comment: '时刻表', content: '正文\n第二行', constant: false, disable: false, selective: true, position: 1, depth: 4, order: 100, probability: 100, useProbability: true, ...over });

  it('原生世界书 → 映射成工坊条目（保留正文换行/EJS、关键词、位置、递归）', () => {
    const r = parseWorldbookJson(book([native({ preventRecursion: true, sticky: 2 })]), '我的世界书.json');
    expect(r.name).toBe('我的世界书');
    expect(r.entries[0]).toMatchObject({
      name: '时刻表', content: '正文\n第二行', enabled: true, constant: false,
      keys: ['雾'], position: 'after_char', order: 100, preventRecursion: true, sticky: 2, cooldown: null,
    });
    expect(r.summary).toEqual({ total: 1, disabled: 0, generatedNames: 0 });
  });

  it('位置 0/1/4 分别映射；其他位置整次拒绝并点名', () => {
    expect(parseWorldbookJson(book([native({ position: 0 })]), 'x.json').entries[0].position).toBe('before_char');
    expect(parseWorldbookJson(book([native({ position: 4, depth: 2 })]), 'x.json').entries[0].position).toBe('at_depth');
    expect(() => parseWorldbookJson(book([native({ position: 2 })]), 'x.json')).toThrow(/插入位置/);
  });

  it('高级设置整次拒绝并点名（Review Focus #2）', () => {
    expect(() => parseWorldbookJson(book([native({ vectorized: true })]), 'x.json')).toThrow(/vectorized/);
    expect(() => parseWorldbookJson(book([native({ scanDepth: 2 })]), 'x.json')).toThrow(/scanDepth/);
    expect(() => parseWorldbookJson(book([native({ group: 'g' })]), 'x.json')).toThrow(/group/);
    // 整次拒绝：一条坏的，另一条好的也不能偷偷进去
    expect(() => parseWorldbookJson(book([native({ comment: '好条目' }), native({ vectorized: true })]), 'x.json')).toThrow(/尚未导入|不能保留/);
  });

  it('绿灯没有主关键词 → 拒绝（服务器也不接受）', () => {
    expect(() => parseWorldbookJson(book([native({ key: [] })]), 'x.json')).toThrow(/主关键词/);
  });

  it('禁用条目也照原样带来；未命名条目自动生成名字并计数', () => {
    const r = parseWorldbookJson(book([native({ disable: true, comment: '' })]), 'x.json');
    expect(r.entries[0].enabled).toBe(false);
    expect(r.entries[0].name).toBe('条目 1');
    expect(r.summary.generatedNames).toBe(1);
    expect(r.summary.disabled).toBe(1);
  });

  it('坏输入：非 JSON / 无 entries / 全局设置 / 巨大文件 → 人话报错', () => {
    expect(() => parseWorldbookJson('{oops', 'x.json')).toThrow(/JSON/);
    expect(() => parseWorldbookJson(JSON.stringify({ name: 'x' }), 'x.json')).toThrow(/entries/);
    expect(() => parseWorldbookJson(book([native()], { token_budget: 100 }), 'x.json')).toThrow(/全局设置/);
    expect(() => parseWorldbookJson('x'.repeat(MAX_IMPORT_BYTES + 1), 'x.json')).toThrow(/过大/);
  });

  it('selective=false 时丢弃次要关键词；保留正则与逗号', () => {
    const r = parseWorldbookJson(book([native({ selective: false, keysecondary: ['b'], key: ['/雾.*车/', 'a,b'] })]), 'x.json');
    expect(r.entries[0].keys).toEqual(['/雾.*车/', 'a,b']);
    expect(r.entries[0].keysSecondary).toEqual([]);
  });
});

describe('五类包 → 世界书条目', () => {
  const manifest = { format: 'wxhl-mod@2', id: 'p1', name: '雾中列车', version: '1.0.0', author: { name: 'a' }, description: 'd', cover: '', tags: [], requires: {} };

  it('mechanism → 逐条映射，名字加 包名 前缀', () => {
    const entries = packToWorldbookEntries({ ...manifest, type: 'mechanism', 条目: [{ name: '时刻表', content: 'x', keys: ['列车'] }] });
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('[回廊mod][机制拓展]雾中列车·时刻表');
    expect(entries[0].strategy.type).toBe('selective');
  });

  it('event → 条目原样（保留 事件_ 名）+ 控制器条目', () => {
    const entries = packToWorldbookEntries({
      ...manifest, type: 'event',
      事件条目: [{ name: '事件_雾中列车_开演', content: 'x', keys: ['开演'] }],
      控制器条目: { 名称: 'EJS/雾中列车控制器', 正文: '<% %>' },
    });
    expect(entries.map(e => e.name)).toEqual(['事件_雾中列车_开演', 'EJS/雾中列车控制器']);
    expect(entries[1].content).toBe('<% %>');
    expect(entries[1].strategy.type).toBe('constant'); // 控制器必须常驻才跑得到
  });

  it('dungeon → 1 条副本条目 + 额外条目', () => {
    const entries = packToWorldbookEntries({
      ...manifest, type: 'dungeon',
      副本名称: '雾中列车', 副本类型: '和平', 基准等级: 3, 时间限制: '三天',
      背景设定: 'bg', 地图与区域: 'map', 敌人配置: 'foe',
      主线任务: { 名称: '活着下车', 说明: 'm', 奖励: 'r' }, 支线任务: [], 世界事件: [], 隐藏任务: [], 成就: [],
      GM指导: 'gm', 额外条目: [{ name: '列车员', content: 'npc', keys: ['列车员'] }],
    });
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('[回廊mod][副本]雾中列车');
    expect(entries[0].strategy.keys).toEqual(['雾中列车']);
    expect(entries[0].content).toContain('GM 指导');
    expect(entries[0].content).toContain('活着下车');
    expect(entries[1].name).toBe('[回廊mod][副本]雾中列车·列车员');
  });

  it('build → 单条，正文含属性方向与主要装备（不含具体数值）', () => {
    const text = renderBuildEntry({ 构筑名: '重装堡垒', 定位: '换血', 属性分配方向: { 主属性: 'STR', 副属性: 'CON' }, 职业: { 名称: '卫士' }, 主要装备: { 主武器: { 名称: '斩首大剑' } } });
    expect(text).toContain('重装堡垒');
    expect(text).toContain('主 STR');
    expect(text).toContain('斩首大剑');
  });

  it('persona → 单条，含五要素；有构筑方向时带上', () => {
    const text = renderPersonaEntry({ 角色名: '雾中剑客', 性格: '沉默', 爱好: ['擦剑'], 厌恶: ['吵'], 背景故事: 'bg', 构筑方向: '高闪避流血' });
    expect(text).toContain('雾中剑客');
    expect(text).toContain('擦剑');
    expect(text).toContain('高闪避流血');
  });

  it('persona 外观三件套：含三项正文有三段；只写有的行；全空无「外观」节', () => {
    const 全有 = renderPersonaEntry({ 角色名: '雾中剑客', 背景故事: 'bg', 外观: { 外貌: '银白长发', 衣着: '玄色长风衣', 装备幻化: '佩剑泛微光' } });
    expect(全有).toContain('外貌：银白长发');
    expect(全有).toContain('衣着：玄色长风衣');
    expect(全有).toContain('装备幻化：佩剑泛微光');

    const 部分 = renderPersonaEntry({ 角色名: '雾中剑客', 背景故事: 'bg', 外观: { 外貌: '短发', 衣着: '', 装备幻化: '' } });
    expect(部分).toContain('外貌：短发');
    expect(部分).not.toContain('衣着：');
    expect(部分).not.toContain('装备幻化：');

    const 全空 = renderPersonaEntry({ 角色名: '雾中剑客', 背景故事: 'bg', 外观: { 外貌: '', 衣着: '', 装备幻化: '' } });
    expect(全空).not.toContain('外观');
    // 完全没有 外观 字段也不能炸
    expect(renderPersonaEntry({ 角色名: '雾中剑客', 背景故事: 'bg' })).not.toContain('外观');
  });

  it('coverOrPlaceholder：空串与非法都回退到内置占位图（不产生破图）', () => {
    expect(coverOrPlaceholder('https://x.test/a.png')).toBe('https://x.test/a.png');
    expect(coverOrPlaceholder('')).toMatch(/^data:image\/svg\+xml/);
    expect(coverOrPlaceholder('javascript:alert(1)')).toMatch(/^data:image\/svg\+xml/);
  });
});

describe('api · 管理端点与错误状态码', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('adminList / adminDelete / adminResetKey 都 POST 到 /api/admin/*，键与参数在请求体里', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (path, options) => {
      calls.push({ path, options });
      return { ok: true, status: 200, json: async () => ({ ok: true, rows: [] }) };
    }));
    await api.adminList('K');
    await api.adminDelete('K', ['a', 'b']);
    await api.adminResetKey('K', 'a');
    expect(calls.map(c => c.path)).toEqual(['/api/admin/list', '/api/admin/delete', '/api/admin/reset-key']);
    expect(calls.every(c => c.options.method === 'POST')).toBe(true);
    expect(JSON.parse(calls[0].options.body)).toEqual({ key: 'K' });
    expect(JSON.parse(calls[1].options.body)).toEqual({ key: 'K', ids: ['a', 'b'] });
    expect(JSON.parse(calls[2].options.body)).toEqual({ key: 'K', id: 'a' });
  });

  it('非 2xx → 抛服务端 error 原文，并带上 status（页面靠 403 决定清掉记住的密钥）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 403, json: async () => ({ error: '管理密钥不正确或未配置' }) })));
    await expect(api.adminList('bad')).rejects.toMatchObject({ message: '管理密钥不正确或未配置', status: 403 });
  });

  it('非 JSON 响应体 → 回退到通用文案，status 仍然是服务端状态码', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => { throw new Error('not json'); } })));
    await expect(api.adminList('x')).rejects.toMatchObject({ message: '请求失败（HTTP 500）', status: 500 });
  });
});

describe('parseBuildJson · 粘贴变量捕捉构筑', () => {
  const 契约者 = {
    头部: { 等级: 7, 阶位: '二阶', 天赋: { 名称: '石肤', 品质: '蓝色' }, 血统: { 名称: '无' }, 称号: { 名称: '无' } },
    属性: { 基础: { STR: 12, AGI: 6, CON: 14, PER: 8 }, 加成: { STR: 1, AGI: 1, CON: 1, PER: 1 } },
    职业: { 名称: '卫士', 稀有度: '蓝色', 职业简介: '前排' },
    通用技能: { 横扫: { 类型: '主动' } }, 装备: { 主武器: { 名称: '斩首大剑' } },
  };

  it('吃 {stat_data:{契约者}}：等级/阶位/四维/职业/技能/装备都进得来', () => {
    const build = parseBuildJson(JSON.stringify({ stat_data: { 契约者 } }));
    expect(build.等级).toBe(7);
    expect(build.阶位).toBe('二阶');
    expect(build.属性基础.STR).toBe(12);
    expect(build.职业.名称).toBe('卫士');
    expect(build.通用技能.横扫.类型).toBe('主动');
    expect(build.主要装备.主武器.名称).toBe('斩首大剑');
    expect(build.构筑名).toBe('卫士');
  });

  it('也吃 {契约者:{…}} 与裸契约者子树', () => {
    expect(parseBuildJson(JSON.stringify({ 契约者 })).等级).toBe(7);
    expect(parseBuildJson(JSON.stringify(契约者)).等级).toBe(7);
  });

  it('本身就是构筑载荷时直接采用', () => {
    const build = parseBuildJson(JSON.stringify({ 构筑名: '重装堡垒', 定位: '换血', 等级: 3 }));
    expect(build.构筑名).toBe('重装堡垒');
    expect(build.等级).toBe(3);
  });

  it('无法识别 → 响亮报错', () => {
    expect(() => parseBuildJson('{oops')).toThrow(/JSON/);
    expect(() => parseBuildJson(JSON.stringify({ 随便: 1 }))).toThrow(/构筑|契约者/);
    expect(() => parseBuildJson(JSON.stringify({ stat_data: { 契约者: { 经济: { UP: 1 } } } }))).toThrow(/构筑|契约者/);
  });

  it('由四维数值推导属性分配方向（最大为主、次大为副）', () => {
    expect(deriveAttributeDirection({ STR: 12, AGI: 6, CON: 14, PER: 8 })).toEqual({ 主属性: 'CON', 副属性: 'STR' });
    expect(deriveAttributeDirection({ STR: 5, AGI: 5, CON: 5, PER: 5 })).toEqual({ 主属性: 'STR', 副属性: 'AGI' });
    expect(deriveAttributeDirection(null)).toEqual({ 主属性: 'STR', 副属性: '无' });
  });
});

describe('parseBuildJson · MVU 指令数组（用户实际粘贴的形状）', () => {
  const 指令 = JSON.stringify([
    { op: 'insert', path: '/契约者/副本角色/两面宿傩（伏黑惠）', value: {
      外貌: '白发黑纹', 类型: '隐藏BOSS（固有角色）', 构筑: 'PER_STR (战地法师): 极高法术效能配合近战压制。',
      头部: { 等级: 75, 阶位: '四阶', 称号: { 当前称号: { 名称: '诅咒之王' }, '备用称号（只记录不生效）': {} } },
      属性: { 基础: { STR: 50, AGI: 50, CON: 50, PER: 60 } },
      职业: { 名称: '十种影法术', 稀有度: '银色', 转职阶段: '二转', 主属性加成: { 属性: 'PER', 值: 15 }, 职业技能: {}, 转职树: { 名称: '十种影法术' } },
      通用技能: {}, 装备: { 主武器: { 名称: '无' } },
    } },
  ]);

  it('取 path 末段当名字、构筑字段当定位、等级/阶位/四维都进得来', () => {
    const build = parseBuildJson(指令);
    expect(build.构筑名).toBe('两面宿傩（伏黑惠）');
    expect(build.定位).toContain('战地法师');
    expect(build.等级).toBe(75);
    expect(build.阶位).toBe('四阶');
    expect(build.属性基础.PER).toBe(60);
    expect(build.属性分配方向).toEqual({ 主属性: 'PER', 副属性: 'STR' });
    expect(build.职业.名称).toBe('十种影法术');
  });

  it('称号读 当前称号（新卡片结构）', () => {
    expect(parseBuildJson(指令).称号.名称).toBe('诅咒之王');
  });

  it('指令数组里没有可用 value / value 不像构筑 → 响亮报错', () => {
    expect(() => parseBuildJson(JSON.stringify([{ op: 'delete', path: '/x' }]))).toThrow(/value/);
    expect(() => parseBuildJson(JSON.stringify([{ op: 'insert', path: '/x', value: { 经济: { UP: 1 } } }]))).toThrow(/头部|属性|职业|构筑/);
  });
});

describe('parseBuildJson · 逐字段 replace 指令（用户 2026-10-12 粘贴的形态）', () => {
  const 五条悟 = JSON.stringify([
    { op: 'replace', path: '/契约者/头部/姓名', value: '五条悟' },
    { op: 'replace', path: '/契约者/头部/天赋', value: { 名称: '无下限咒术', 品质: '白色' } },
    { op: 'replace', path: '/契约者/属性/基础', value: { STR: 5, AGI: 8, CON: 5, PER: 12 } },
    { op: 'replace', path: '/契约者/职业/名称', value: '咒术师' },
    { op: 'replace', path: '/契约者/职业/职业简介', value: '依托六眼与无下限术式的特化职业' },
    { op: 'insert', path: '/契约者/特殊资源/血统', value: { 咒力: { 当前: 100, 上限: 100 } } },
  ]);

  it('回放合并后能解析：名字取头部.姓名、四维/职业都进来', () => {
    const build = parseBuildJson(五条悟);
    expect(build.构筑名).toBe('五条悟');
    expect(build.定位).toContain('六眼');
    expect(build.属性基础).toEqual({ STR: 5, AGI: 8, CON: 5, PER: 12 });
    expect(build.属性分配方向).toEqual({ 主属性: 'PER', 副属性: 'AGI' });
    expect(build.职业.名称).toBe('咒术师');
    expect(build.天赋.名称).toBe('无下限咒术');
  });

  it('applyMvuCommands：delete 能删掉键', () => {
    const 合并 = applyMvuCommands([
      { op: 'replace', path: '/a/b', value: 1 },
      { op: 'replace', path: '/a/c', value: 2 },
      { op: 'delete', path: '/a/b' },
    ]);
    expect(合并).toEqual({ a: { c: 2 } });
  });

  it('既没有可回放的构筑字段、也没有整实体 insert → 响亮报错', () => {
    expect(() => parseBuildJson(JSON.stringify([{ op: 'replace', path: '/契约者/经济/UP', value: 1 }]))).toThrow(/构筑字段/);
  });
});

describe('parseBuildJson · 认字段（不依赖输入形状）', () => {
  it('平铺形态：等级/四维/职业直接挂在顶上也能认', () => {
    const build = parseBuildJson(JSON.stringify({
      姓名: '测试者', 等级: 7, 阶位: '二阶',
      STR: 12, AGI: 6, CON: 14, PER: 8,
      职业: { 名称: '卫士', 职业简介: '前排' }, 天赋: { 名称: '石肤' },
    }));
    expect(build.构筑名).toBe('测试者');
    expect(build.等级).toBe(7);
    expect(build.属性基础).toEqual({ STR: 12, AGI: 6, CON: 14, PER: 8 });
    expect(build.属性分配方向).toEqual({ 主属性: 'CON', 副属性: 'STR' });
    expect(build.职业.名称).toBe('卫士');
  });

  it('深层包装 + 多个实体：取认出的字段最多的那个', () => {
    const 薄 = { 属性: { 基础: { STR: 1, AGI: 1, CON: 1, PER: 1 } } };
    const 全 = {
      头部: { 姓名: '本体', 等级: 9, 阶位: '三阶' },
      属性: { 基础: { STR: 20, AGI: 20, CON: 20, PER: 20 } },
      职业: { 名称: '咒术师' }, 通用技能: {}, 装备: {},
    };
    const build = parseBuildJson(JSON.stringify({ a: { b: { deep: 薄 } }, c: { d: 全 } }));
    expect(build.构筑名).toBe('本体');
    expect(build.等级).toBe(9);
    expect(build.属性基础.STR).toBe(20);
  });
});
