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
      listeners.forEach(l => l({ data, source: parentWindow }));
    };
    /** 用别的 channel 发一条同 id 的响应 */
    const respondChannel = (channel, id, payload) => {
      listeners.forEach(l => l({ data: { channel, kind: 'response', id, ok: true, payload }, source: parentWindow }));
    };
    /** 原样灌任意消息体；source 默认父窗口，可传自定义来源（伪造回包测试） */
    const respondRaw = (data, source = parentWindow) => listeners.forEach(l => l({ data, source }));
    return { posted, respond, respondChannel, respondRaw, parentWindow, selfWindow };
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

  it('来自非 parentWindow 的、id 与 channel 都正确的响应被忽略（防伪造回包）', async () => {
    const w = fakeWindows();
    const bridge = createBridgeClient({ parentWindow: w.parentWindow, selfWindow: w.selfWindow });
    const promise = bridge.request('handshake');
    const sentId = w.posted[0].id;
    // 另开一个窗口当「别的脚本」，回一条 id/channel 全对的响应
    const foreign = { postMessage: vi.fn() };
    w.respondRaw({ channel: 'wxhl-workshop:worldbook', kind: 'response', id: sentId, ok: true, payload: { forged: true } }, foreign);
    let settled = false;
    promise.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false); // 伪造回包没被采信，请求仍未结算
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
