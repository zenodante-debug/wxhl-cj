import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchAction, ensureWorkshopWorldbook, MUTATING_ACTIONS, queued, resetQueueForTest, WORKSHOP_WORLDBOOK_NAME } from '../actions';

afterEach(() => {
  vi.unstubAllGlobals();
  resetQueueForTest();
});

describe('queued · 互斥队列', () => {
  it('写操作串行执行，不交错', async () => {
    const order: string[] = [];
    const slow = (tag: string) => queued(async () => {
      await new Promise(r => setTimeout(r, 10));
      order.push(tag);
    });
    await Promise.all([slow('a'), slow('b'), slow('c')]);
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('前序失败不阻塞后续', async () => {
    const results = await Promise.allSettled([
      queued(async () => { throw new Error('炸了'); }),
      queued(async () => 'ok'),
    ]);
    expect(results[0].status).toBe('rejected');
    expect(results[1]).toEqual({ status: 'fulfilled', value: 'ok' });
  });
});

describe('ensureWorkshopWorldbook · 世界书兜底（Review Focus #3）', () => {
  it('世界书不存在 → 创建并绑定为角色卡附加世界书', async () => {
    const rebind = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('getWorldbookNames', vi.fn().mockReturnValue(['主卡世界书']));
    vi.stubGlobal('createWorldbook', vi.fn().mockResolvedValue(true));
    vi.stubGlobal('getCharWorldbookNames', vi.fn().mockReturnValue({ primary: '主卡世界书', additional: [] }));
    vi.stubGlobal('rebindCharWorldbooks', rebind);

    const result = await ensureWorkshopWorldbook();
    expect(result).toEqual({ created: true, bound: true });
    expect(rebind).toHaveBeenCalledWith('current', { primary: '主卡世界书', additional: [WORKSHOP_WORLDBOOK_NAME] });
  });

  it('已存在且已绑定 → 幂等不动', async () => {
    const create = vi.fn();
    const rebind = vi.fn();
    vi.stubGlobal('getWorldbookNames', vi.fn().mockReturnValue([WORKSHOP_WORLDBOOK_NAME]));
    vi.stubGlobal('createWorldbook', create);
    vi.stubGlobal('getCharWorldbookNames', vi.fn().mockReturnValue({ primary: '主卡世界书', additional: [WORKSHOP_WORLDBOOK_NAME] }));
    vi.stubGlobal('rebindCharWorldbooks', rebind);

    expect(await ensureWorkshopWorldbook()).toEqual({ created: false, bound: false });
    expect(create).not.toHaveBeenCalled();
    expect(rebind).not.toHaveBeenCalled();
  });

  it('存在但主卡没绑过任何世界书（primary 为 null）→ 正常挂上附加', async () => {
    const rebind = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('getWorldbookNames', vi.fn().mockReturnValue([WORKSHOP_WORLDBOOK_NAME]));
    vi.stubGlobal('getCharWorldbookNames', vi.fn().mockReturnValue({ primary: null, additional: [] }));
    vi.stubGlobal('rebindCharWorldbooks', rebind);

    expect(await ensureWorkshopWorldbook()).toEqual({ created: false, bound: true });
    expect(rebind).toHaveBeenCalledWith('current', { primary: null, additional: [WORKSHOP_WORLDBOOK_NAME] });
  });
});

describe('dispatchAction · 动作分发', () => {
  it('handshake 上报能力清单', async () => {
    const result = (await dispatchAction('handshake', {})) as any;
    expect(result.workshopWorldbook).toBe(WORKSHOP_WORLDBOOK_NAME);
    expect(result.capabilities).toHaveProperty('getWorldbook');
  });

  it('getContext 顺带 ensure 并返回世界书概况', async () => {
    vi.stubGlobal('getWorldbookNames', vi.fn().mockReturnValue([WORKSHOP_WORLDBOOK_NAME]));
    vi.stubGlobal('getCharWorldbookNames', vi.fn().mockReturnValue({ primary: '主卡', additional: [WORKSHOP_WORLDBOOK_NAME] }));
    const result = (await dispatchAction('getContext', {})) as any;
    expect(result.workshopWorldbook).toBe(WORKSHOP_WORLDBOOK_NAME);
    expect(result.ensured).toEqual({ created: false, bound: false });
  });

  it('upsertWorkshopEntries：读全量→宿主补把手→纯逻辑→replaceWorldbook 写回', async () => {
    const entry = { uid: 1, name: '旧', position: { order: 1 }, extra: { wxhlWorkshop: { sourceId: 'p', sourceType: 'mod' } } };
    const replace = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('getWorldbookNames', vi.fn().mockReturnValue([]));
    vi.stubGlobal('getWorldbook', vi.fn().mockResolvedValue([entry]));
    vi.stubGlobal('replaceWorldbook', replace);
    const sourceMeta = { sourceId: 'p', sourceType: 'mod' };
    const newEntry = { uid: 0, name: '新', position: { order: 1 }, extra: { wxhlWorkshop: { sourceId: 'p' } } };

    const result = (await dispatchAction('upsertWorkshopEntries', {
      worldbookName: '无限回廊mod', sourceMeta, entries: [newEntry],
    })) as any;
    expect(result).toEqual({ total: 1, installed: 1 });
    // 宿主以 sourceMeta 为准盖章：原把手保留、sourceType 并入（不再是原样条目）
    expect(replace).toHaveBeenCalledWith('无限回廊mod', [
      { ...newEntry, extra: { wxhlWorkshop: { sourceId: 'p', sourceType: 'mod' } } },
    ], { render: 'immediate' });
  });

  it('upsertWorkshopEntries 给缺把手的条目盖章', async () => {
    const replace = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('getWorldbook', vi.fn().mockResolvedValue([]));
    vi.stubGlobal('replaceWorldbook', replace);
    const sourceMeta = { sourceId: 'pack-1' };
    const bare = { uid: 0, name: '新', position: { order: 1 } }; // 云端漏打 extra

    await dispatchAction('upsertWorkshopEntries', { worldbookName: '无限回廊mod', sourceMeta, entries: [bare] });
    const written = replace.mock.calls[0][1] as WorldbookEntry[];
    expect(written[0].extra?.wxhlWorkshop?.sourceId).toBe('pack-1');
  });

  it('updateEntry 未匹配 uid → 响亮报错', async () => {
    vi.stubGlobal('getWorldbook', vi.fn().mockResolvedValue([
      { uid: 1, name: '甲', position: { order: 1 } },
      { uid: 2, name: '乙', position: { order: 2 } },
    ]));
    const update = vi.fn();
    vi.stubGlobal('updateWorldbookWith', update);

    await expect(dispatchAction('updateEntry', { worldbookName: 'x', uid: 999, nextEntry: {} }))
      .rejects.toThrow(/未找到 uid/);
    expect(update).not.toHaveBeenCalled();
  });

  it('updateEntry 命中 uid → 更新并返回 updated', async () => {
    const existing = { uid: 1, name: '甲', position: { order: 1 }, content: '旧' };
    vi.stubGlobal('getWorldbook', vi.fn().mockResolvedValue([existing]));
    let applied: WorldbookEntry[] | null = null;
    vi.stubGlobal('updateWorldbookWith', vi.fn(async (_name: string, updater: (entries: WorldbookEntry[]) => WorldbookEntry[]) => {
      applied = updater([{ uid: 1, name: '甲', position: { order: 1 }, content: '旧' }]);
    }));

    const result = await dispatchAction('updateEntry', { worldbookName: 'x', uid: 1, nextEntry: { content: '新' } });
    expect(result).toEqual({ updated: true });
    expect(applied).toEqual([{ uid: 1, name: '甲', position: { order: 1 }, content: '新' }]);
  });

  it('deleteEntries 空 uids → 响亮报错', async () => {
    const del = vi.fn();
    vi.stubGlobal('deleteWorldbookEntries', del);

    await expect(dispatchAction('deleteEntries', { worldbookName: 'x', uids: [] }))
      .rejects.toThrow(/缺少 uids/);
    expect(del).not.toHaveBeenCalled();
  });

  it('handshake 上报宿主版本', async () => {
    const result = (await dispatchAction('handshake', {})) as any;
    expect(result).toHaveProperty('hostVersion');
  });

  it('upsertWorkshopEntries 缺 sourceMeta.sourceId → 响亮报错', async () => {
    await expect(dispatchAction('upsertWorkshopEntries', { worldbookName: 'x', entries: [] })).rejects.toThrow('sourceMeta.sourceId');
  });

  it('缺 worldbookName 的读动作 → 响亮报错', async () => {
    await expect(dispatchAction('getEntries', {})).rejects.toThrow('worldbookName');
  });

  it('未知动作 → 响亮报错', async () => {
    await expect(dispatchAction('hack-the-planet', {})).rejects.toThrow('未知桥接动作');
  });

  it('getContext 含 ensure 写操作 → 必须走互斥队列', () => {
    expect(MUTATING_ACTIONS.has('getContext')).toBe(true);
  });
});
