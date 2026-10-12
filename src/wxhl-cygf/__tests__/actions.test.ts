import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyAsPlayer, composeAppearance, dispatchAction, ensureWorkshopWorldbook, entityFromBuild, MUTATING_ACTIONS, queued, resetQueueForTest, WORKSHOP_WORLDBOOK_NAME } from '../actions';

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

  it('deleteWorkshopEntries 必须走互斥队列', () => {
    expect(MUTATING_ACTIONS.has('deleteWorkshopEntries')).toBe(true);
  });

  it('deleteWorkshopEntries 按把手整包删除，返回 removed；无把手条目不动', async () => {
    const mine = { uid: 1, name: 'a', position: { order: 1 }, extra: { wxhlWorkshop: { sourceId: 'p1', sourceType: 'extension' } } };
    const other = { uid: 2, name: 'b', position: { order: 2 }, extra: { wxhlWorkshop: { sourceId: 'p2' } } };
    const manual = { uid: 3, name: 'c', position: { order: 3 } };
    const replace = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('getWorldbook', vi.fn().mockResolvedValue([mine, other, manual]));
    vi.stubGlobal('replaceWorldbook', replace);

    const result = (await dispatchAction('deleteWorkshopEntries', {
      worldbookName: '无限回廊mod',
      sourceMeta: { sourceId: 'p1' },
    })) as any;
    expect(result).toEqual({ removed: 1 });
    expect(replace).toHaveBeenCalledWith('无限回廊mod', [other, manual], { render: 'immediate' });
  });

  it('deleteWorkshopEntries 没有匹配 → 不写回，返回 removed:0', async () => {
    const replace = vi.fn();
    vi.stubGlobal('getWorldbook', vi.fn().mockResolvedValue([{ uid: 1, name: 'x', position: { order: 1 } }]));
    vi.stubGlobal('replaceWorldbook', replace);
    const result = (await dispatchAction('deleteWorkshopEntries', {
      worldbookName: '无限回廊mod',
      sourceMeta: { sourceId: 'p9' },
    })) as any;
    expect(result).toEqual({ removed: 0 });
    expect(replace).not.toHaveBeenCalled();
  });

  it('deleteWorkshopEntries 缺 sourceMeta.sourceId → 响亮报错', async () => {
    await expect(dispatchAction('deleteWorkshopEntries', { worldbookName: 'x' })).rejects.toThrow('sourceMeta.sourceId');
  });

  it('readContractor 是只读动作，不进互斥队列', () => {
    expect(MUTATING_ACTIONS.has('readContractor')).toBe(false);
  });

  it('readContractor 只回构筑白名单字段，并重算 属性.实际', async () => {
    const 契约者 = {
      头部: { 等级: 7, 阶位: '二阶', 天赋: { 名称: '石肤' } },
      属性: { 基础: { STR: 10, AGI: 5, CON: 12, PER: 6 }, 加成: { STR: 1, AGI: 2, CON: 0, PER: 1 }, 自定义加成: { STR: 0, AGI: 0, CON: 3, PER: 0 } },
      职业: { 名称: '卫士', 职业简介: '前排' },
      通用技能: {}, 装备: {}, 衍生属性: {},
      // 下面这些**必须不出现**在返回体里（Review Focus #1）
      经济: { UP: 9999 }, 背包: { 好东西: { 数量: 3 } }, 人际关系: { 某人: {} }, 副本经历: {}, 论坛档案: {}, 小队: {}, 其他契约者: {}, 副本角色: {},
    };
    vi.stubGlobal('getVariables', vi.fn().mockReturnValue({ stat_data: { 契约者 } }));
    vi.stubGlobal('getLastMessageId', vi.fn().mockReturnValue(12));

    const result = (await dispatchAction('readContractor', {})) as any;
    const c = result.契约者;
    expect(Object.keys(c).sort()).toEqual(['头部', '属性', '衍生属性', '职业', '通用技能', '装备'].sort());
    expect(c.属性.实际).toEqual({ STR: 11, AGI: 7, CON: 15, PER: 7 }); // 基础+加成+自定义（Review Focus #3）
    expect(c).not.toHaveProperty('经济');
    expect(JSON.stringify(c)).not.toContain('UP');
  });

  it('readContractor 读不到契约者 → 响亮报错', async () => {
    vi.stubGlobal('getVariables', vi.fn().mockReturnValue({ stat_data: {} }));
    vi.stubGlobal('getLastMessageId', vi.fn().mockReturnValue(3));
    await expect(dispatchAction('readContractor', {})).rejects.toThrow(/契约者/);
  });
});

describe('applyBuild · 装到不同位置（2026-10-12）', () => {
  const build = {
    构筑名: '两面宿傩', 定位: 'PER_STR 战地法师', 等级: 75, 阶位: '四阶',
    属性基础: { STR: 50, AGI: 50, CON: 50, PER: 60 },
    天赋: { 名称: '生得术式：捌' }, 血统: { 名称: '受肉受体' }, 称号: { 名称: '诅咒之王' },
    职业: { 名称: '十种影法术', 职业简介: 'shadow' }, 通用技能: {}, 主要装备: { 主武器: { 名称: '无' } },
  };

  it('entityFromBuild：属性.实际 重算、类型落位、好感度归零', () => {
    const e = entityFromBuild(build, 'BOSS', '白发黑纹');
    expect(e.类型).toBe('BOSS');
    expect(e.外貌).toBe('白发黑纹');
    expect(e.构筑).toBe('PER_STR 战地法师');
    expect(e.好感度).toBe(0);
    expect(e.头部.等级).toBe(75);
    expect(e.头部.称号.当前称号.名称).toBe('诅咒之王');
    expect(e.属性.实际).toEqual({ STR: 50, AGI: 50, CON: 50, PER: 60 });
  });

  it('applyAsPlayer：只覆盖构筑字段，玩家进度（经济/背包/人际关系）原样保留', () => {
    const 契约者 = {
      头部: { 姓名: '我', 等级: 3, 阶位: '一阶' },
      属性: { 基础: { STR: 5, AGI: 6, CON: 7, PER: 8 }, 加成: { STR: 1, AGI: 0, CON: 0, PER: 0 } },
      经济: { UP: 12345 }, 背包: { 好东西: { 数量: 3 } }, 人际关系: { 某人: { 关系: '朋友' } },
      职业: { 名称: '旧职业' }, 小队: { 成员: { 老队友: {} } },
    };
    const 写入 = applyAsPlayer(契约者, build);
    expect(写入).toContain('头部');
    expect(契约者.头部.等级).toBe(75);
    expect(契约者.头部.姓名).toBe('我'); // 保留
    expect(契约者.属性.基础.PER).toBe(60);
    expect(契约者.属性.实际.STR).toBe(51); // 基础 + 保留的加成
    expect(契约者.职业.名称).toBe('十种影法术');
    expect(契约者.经济.UP).toBe(12345); // 进度没被碰
    expect(契约者.背包.好东西.数量).toBe(3);
    expect(契约者.人际关系.某人.关系).toBe('朋友');
    expect(契约者.小队.成员.老队友).toBeDefined();
  });

  it('applyBuild 进互斥队列', () => {
    expect(MUTATING_ACTIONS.has('applyBuild')).toBe(true);
  });

  it('composeAppearance：三段按序分行，只拼非空段', () => {
    expect(composeAppearance({ 外观: { 外貌: '白发', 衣着: '黑袍', 装备幻化: '剑气' } })).toBe('外貌：白发\n衣着：黑袍\n装备幻化：剑气');
    const 部分 = composeAppearance({ 外观: { 外貌: '银发', 衣着: '', 装备幻化: '' } });
    expect(部分).toBe('外貌：银发');
    expect(部分).not.toContain('衣着：');
    expect(部分).not.toContain('装备幻化：');
  });

  it('composeAppearance：兼容 build.外观 / 旧字段 外貌 / 外观额外', () => {
    expect(composeAppearance({ build: { 外观: { 衣着: '披风' } } })).toBe('衣着：披风');
    expect(composeAppearance({ 外貌: '旧样式一段' })).toBe('外貌：旧样式一段');
    expect(composeAppearance({ 外观额外: { 装备幻化: '剑发微光' } })).toBe('装备幻化：剑发微光');
  });

  it('外观全空 → entityFromBuild 落成「无」', () => {
    const 空 = composeAppearance({ 外观: {} });
    expect(空).toBe('');
    expect(entityFromBuild(build, 'BOSS', 空).外貌).toBe('无');
    // 有值时拼好的整段直接落进实体 外貌
    expect(entityFromBuild(build, 'BOSS', composeAppearance({ 外观: { 外貌: '白发', 衣着: '黑袍' } })).外貌).toBe('外貌：白发\n衣着：黑袍');
  });

  it('target 非法 / 缺名字 → 响亮报错', async () => {
    await expect(dispatchAction('applyBuild', { target: '乱写', name: 'x' })).rejects.toThrow(/target/);
    await expect(dispatchAction('applyBuild', { target: '队友' })).rejects.toThrow(/名字/);
  });
});
