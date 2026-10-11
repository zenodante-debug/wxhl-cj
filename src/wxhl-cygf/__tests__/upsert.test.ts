import { describe, expect, it } from 'vitest';
import { computeUpsertWorldbook, getWorkshopMeta, matchesSource } from '../actions';

const tagged = (uid: number, sourceId: string, order: number, sourceType = 'extension'): WorldbookEntry =>
  ({
    uid, name: `条目${uid}`, enabled: true,
    strategy: { type: 'constant', keys: [], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
    position: { type: 'after_character_definition', role: 'system', depth: 0, order },
    content: '', probability: 100,
    recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
    effect: { sticky: null, cooldown: null, delay: null },
    extra: { wxhlWorkshop: { sourceId, sourceType } },
  }) as WorldbookEntry;

const untagged = (uid: number, order: number): WorldbookEntry =>
  ({ ...tagged(uid, 'x', order), extra: undefined }) as WorldbookEntry;

describe('getWorkshopMeta / matchesSource · 把手识别', () => {
  it('有把手 → 返回 meta；无 extra / sourceId 为空 → null', () => {
    expect(getWorkshopMeta(tagged(1, 'pack-a', 1))?.sourceId).toBe('pack-a');
    expect(getWorkshopMeta(untagged(2, 1))).toBeNull();
    expect(getWorkshopMeta({ extra: { wxhlWorkshop: { sourceId: '' } } } as any)).toBeNull();
  });

  it('sourceId 相同且 sourceType 一致（或未给）→ 匹配', () => {
    const entry = tagged(1, 'pack-a', 1, 'build');
    expect(matchesSource(entry, { sourceId: 'pack-a' })).toBe(true);
    expect(matchesSource(entry, { sourceId: 'pack-a', sourceType: 'build' })).toBe(true);
    expect(matchesSource(entry, { sourceId: 'pack-a', sourceType: 'extension' })).toBe(false);
    expect(matchesSource(entry, { sourceId: 'pack-b' })).toBe(false);
  });
});

describe('computeUpsertWorldbook · 删旧插新', () => {
  it('删掉同 sourceId 旧条目，插入新条目；其他包不受影响', () => {
    const old = [tagged(1, 'pack-a', 1), tagged(2, 'pack-b', 2)];
    const next = computeUpsertWorldbook(old, { sourceId: 'pack-a' }, [tagged(0, 'pack-a', 1)]);
    expect(next.filter(e => getWorkshopMeta(e)?.sourceId === 'pack-a')).toHaveLength(1);
    expect(next.some(e => e.uid === 1)).toBe(false); // 旧的被删
    expect(next.some(e => e.uid === 2)).toBe(true);  // 别的包不动
  });

  it('连续两次 upsert 同一包：无重复无孤儿（Review Focus #4）', () => {
    const first = computeUpsertWorldbook([], { sourceId: 'pack-a' }, [tagged(0, 'pack-a', 1), tagged(0, 'pack-a', 2)]);
    const second = computeUpsertWorldbook(first, { sourceId: 'pack-a' }, [tagged(0, 'pack-a', 1)]);
    expect(second.filter(e => getWorkshopMeta(e)?.sourceId === 'pack-a')).toHaveLength(1);
  });

  it('无把手条目不被波及（Review Focus #2）', () => {
    const manual = untagged(9, 50);
    const next = computeUpsertWorldbook([manual], { sourceId: 'pack-a' }, [tagged(0, 'pack-a', 1)]);
    expect(next.some(e => e.uid === 9)).toBe(true);
  });

  it('云端忘了给新条目打把手：照常插入、不报错（Review Focus #1）', () => {
    const noTag = untagged(0, 1);
    const next = computeUpsertWorldbook([], { sourceId: 'pack-a' }, [noTag]);
    expect(next).toContain(noTag);
  });

  it('带把手条目按 position.order 归一化为 1..N（order 相同按名字稳定排序）', () => {
    const entries = [tagged(1, 'pack-a', 30), tagged(2, 'pack-a', 10), tagged(3, 'pack-b', 20)];
    const next = computeUpsertWorldbook(entries, { sourceId: 'pack-c' }, []);
    const managed = next.filter(e => getWorkshopMeta(e));
    expect(managed.map(e => e.position.order)).toEqual([1, 2, 3]);
    // order 10 的条目排最前
    expect(managed[0].uid).toBe(2);
    // 无把手条目不参与归一化
    const withManual = computeUpsertWorldbook([...entries, untagged(9, 999)], { sourceId: 'pack-c' }, []);
    expect(withManual.find(e => e.uid === 9)?.position.order).toBe(999);
  });
});
