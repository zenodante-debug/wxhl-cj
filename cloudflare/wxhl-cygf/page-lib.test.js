// cloudflare/wxhl-cygf/page-lib.test.js
import { describe, expect, it, vi } from 'vitest';
import {
  computeInstalled, createBridgeClient, isAgreementAccepted, mapExtensionEntry,
  MAX_IMPORT_BYTES, packToWorldbookEntries, parseWorldbookJson,
  renderBuildEntry, renderCharacterEntry, sourceMetaOf,
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
