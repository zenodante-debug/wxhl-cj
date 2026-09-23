import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  ackOrder, confirmOrder, createOrder, deliverOrder, fetchHall, fetchMine,
  type 订单, type 待领取,
} from '../api';
import { 需求单Schema, type 需求单 } from '../spec';
import { useOrderStore } from '../store';

/**
 * 订单 store 的经济守卫测试。
 *
 * 本级承担的是**钱**：订金与尾款都在客户端 spendUP/gainUP，服务器只留记录与 ACK 位。
 * 故这里钉的是四类失败模式（全部有真实经济后果）：
 *   ① 「钱不够还花出去了」—— publish/confirm 余额不足必须拒，且**零变量变动**（replaceMvuData 一次都不许调）；
 *   ② 「钱够了却没扣/扣错」—— 正常路径的扣款数；
 *   ③ 「交付了背包却不减」/「体积超限却上传了」—— 交付两面的对称性；
 *   ④ Ruling L：`claimAll` 只准照服务器的 `待领` 清单逐条 ACK。**遍历自己的订单对每项都 ACK**
 *      会把尚不存在的权益提前置位（订单还在「已接单」就 ACK 尾款 → `maker_final_ack=1`），
 *      该单真正完成时尾款**永久领不到** —— 这是连堵三轮的同类漏洞，故用「待领为空时一个 ACK 都不许发」钉死。
 *
 * 注：**`vi.mock` 的相对路径从本文件所在目录解析**。API 模块是 `'../api'`（本文件在 order/__tests__/，
 * `../` 到 order/）。写错层级会**静默注册一个不存在的模块**、store 照旧加载真模块 ——
 * 那样真实现里带 fetch 的路径会出网/抛错，测试却可能靠巧合变绿（间歇性绿）。
 * 故下面第一条用例专门断言「store 用的就是这套假实现」（对象同一性），路径一错必红。
 */
const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  fetchHall: vi.fn(),
  fetchMine: vi.fn(),
  acceptOrder: vi.fn(),
  deliverOrder: vi.fn(),
  confirmOrder: vi.fn(),
  rejectOrder: vi.fn(),
  ackOrder: vi.fn(),
}));

vi.mock('../api', () => ({ ...mocks }));

/** 假 toastr：错误/警告进 `提示`、成功进 `成功` —— 「不许假报成功」这类断言要看得到 success。 */
const 提示: string[] = [];
const 成功: string[] = [];
/** 假存档。**必须与真 MVU 同语义**：`getMvuData` 返回一份**快照**（深拷贝），
 *  `replaceMvuData` 才把工作副本**存**进去 —— 真实 MVU 也是这样一处读一处写。
 *  否则「落档失败」这类用例会失真：原地改快照也能被断言看到，等于假报入账成功。 */
let mvu: any = {};
/** 落档次数：`replaceMvuData` 的调用数就是「写了几次变量」。零变量变动 = 0。 */
let 落档次数 = 0;

const 当前UP = () => Number(mvu.stat_data.契约者.经济.UP);
const 当前背包 = () => mvu.stat_data.契约者.背包;

const 单 = (覆盖: Partial<需求单> = {}): 需求单 =>
  需求单Schema.parse({ 名称: '狼牙短剑', 成品类型: '装备', 装备子类: '武器', 品质: '金色', 阶位: 2, ...覆盖 });

const 空待领 = (): 待领取 => ({ deposit: 0, final: 0, items: [], 待领: [] });

const 造单 = (覆盖: Partial<订单> = {}): 订单 => ({
  id: 'A', poster: '甲', maker: '老狼', spec: 单(), deposit: 300, final: 700,
  status: '已接单', created: 0, updated: 0, ...覆盖,
});

/** 让 refresh() 看到指定的「我的订单 + 待领取」 */
const 备好我的 = (a: { asPoster?: 订单[]; asMaker?: 订单[]; claim?: 待领取 }) =>
  mocks.fetchMine.mockResolvedValue({ asPoster: [], asMaker: [], claim: 空待领(), ...a });

beforeEach(() => {
  提示.length = 0;
  成功.length = 0;
  落档次数 = 0;
  for (const m of Object.values(mocks)) m.mockReset();
  mvu = {
    stat_data: {
      契约者: { 头部: { 姓名: '老狼', 阶位: '一阶' }, 经济: { UP: 20000 }, 背包: {} },
    },
  };
  (globalThis as any).getVariables = () => ({});
  (globalThis as any).replaceVariables = () => {};
  (globalThis as any).getCurrentMessageId = () => -1;
  (globalThis as any).Mvu = {
    getMvuData: () => _.cloneDeep(mvu),
    replaceMvuData: async (d: any) => {
      落档次数++;
      mvu = _.cloneDeep(d);
    },
  };
  (globalThis as any).toastr = {
    error: (m: string) => 提示.push(m),
    warning: (m: string) => 提示.push(m),
    success: (m: string) => 成功.push(m),
  };
  (globalThis as any).window = { confirm: () => true };
  mocks.fetchHall.mockResolvedValue([]);
  备好我的({});
  mocks.createOrder.mockResolvedValue({ id: 'A' });
  mocks.acceptOrder.mockResolvedValue(undefined);
  mocks.deliverOrder.mockResolvedValue(undefined);
  mocks.confirmOrder.mockResolvedValue(undefined);
  mocks.rejectOrder.mockResolvedValue(undefined);
  mocks.ackOrder.mockResolvedValue({ deleted: false });
  setActivePinia(createPinia());
});

// ================================================================
// 第 0 条：mock 确实生效（路径写错 = 静默加载真模块 = 间歇性绿）
// ================================================================
describe('测试装置自检 · vi.mock 的路径必须真的拦到 store 的模块', () => {
  it('store 所在的模块解析到假实现（对象同一性；路径错则这里必红）', () => {
    expect(createOrder).toBe(mocks.createOrder);
    expect(fetchHall).toBe(mocks.fetchHall);
    expect(fetchMine).toBe(mocks.fetchMine);
    expect(deliverOrder).toBe(mocks.deliverOrder);
    expect(confirmOrder).toBe(mocks.confirmOrder);
    expect(ackOrder).toBe(mocks.ackOrder);
  });
});

// ================================================================
// ① 余额不足必须拒绝，且零变量变动
// ================================================================
describe('经济守卫 · 余额不足必须拒绝且零变量变动', () => {
  it('publish：订金超过余额 → 拒、不发请求、不落档、报得出理由', async () => {
    mvu.stat_data.契约者.经济.UP = 100;
    const s = useOrderStore();
    expect(await s.publish(单(), 300, 700)).toBe(false);
    expect(当前UP()).toBe(100); // 逐位不变
    expect(落档次数).toBe(0); // 一次都没写
    expect(mocks.createOrder).not.toHaveBeenCalled(); // 钱不够就不该建单
    expect(成功).toEqual([]);
    expect(提示[0]).toContain('UP 不足');
  });

  it('confirm：尾款超过余额 → 拒、不通知服务器、不落档（不能出现「钱不够还验收了」）', async () => {
    const s = useOrderStore();
    备好我的({ asPoster: [造单({ status: '已交付', final: 700 })] });
    await s.refresh();
    mvu.stat_data.契约者.经济.UP = 100;
    expect(await s.confirm('A')).toBe(false);
    expect(当前UP()).toBe(100);
    expect(落档次数).toBe(0);
    expect(mocks.confirmOrder).not.toHaveBeenCalled();
    expect(成功).toEqual([]);
    expect(提示[0]).toContain('尾款不足');
  });
});

// ================================================================
// ② 正常路径：钱要按数扣、请求只发一次
// ================================================================
describe('发布 · 先验余额（本地）再建单（服务器）', () => {
  it('扣款正确、createOrder 恰好一次、姓名取自存档', async () => {
    const s = useOrderStore();
    expect(await s.publish(单(), 300, 700)).toBe(true);
    expect(当前UP()).toBe(19700); // 20000 − 300
    expect(落档次数).toBe(1); // 一次落档
    expect(mocks.createOrder).toHaveBeenCalledTimes(1);
    expect(mocks.createOrder).toHaveBeenCalledWith({ poster: '老狼', spec: 单(), deposit: 300, final: 700 });
  });

  it('建单失败 → 零变量变动、不假报成功（本地没扣，故无需回滚）', async () => {
    mocks.createOrder.mockRejectedValue(new Error('HTTP 500'));
    const s = useOrderStore();
    expect(await s.publish(单(), 300, 700)).toBe(false);
    expect(当前UP()).toBe(20000);
    expect(落档次数).toBe(0);
    expect(成功).toEqual([]);
    expect(提示[0]).toContain('发布失败');
  });
});

// ================================================================
// ③ 交付：体积与背包两面必须对称
// ================================================================
describe('交付 · 从背包取出一件并上传', () => {
  it('体积超限 → 不发请求、背包一件不动、零落档', async () => {
    const 巨物名 = 'x'.repeat(5000);
    mvu.stat_data.契约者.背包 = { [巨物名]: { 名称: 巨物名, 数量: 1 } };
    const s = useOrderStore();
    expect(await s.deliver('A', 巨物名)).toBe(false);
    expect(mocks.deliverOrder).not.toHaveBeenCalled();
    expect(当前背包()[巨物名].数量).toBe(1);
    expect(落档次数).toBe(0);
    expect(提示[0]).toContain('过大');
  });

  it('正常 → 背包少一件、上传的是「一件」的快照（数量固定 1）', async () => {
    mvu.stat_data.契约者.背包 = { 狼牙短剑: { 名称: '狼牙短剑', 描述: 'd', 数量: 3 } };
    const s = useOrderStore();
    expect(await s.deliver('A', '狼牙短剑')).toBe(true);
    expect(Number(当前背包()['狼牙短剑'].数量)).toBe(2); // 只走一件，堆叠 3 → 2
    // 上传的是单件快照：**数量必须是 1**。若原样带上堆叠数 3，发单人领取时
    // `bagAdd(item, item.数量)` 会收下一整叠 —— 凭空复制 2 件。
    expect(mocks.deliverOrder).toHaveBeenCalledWith('A', '老狼', { 名称: '狼牙短剑', 描述: 'd', 数量: 1 });
    expect(落档次数).toBe(1);
    expect(成功[0]).toContain('已交付');
  });

  it('背包里没有该物品 → 拒、不发请求、零落档', async () => {
    const s = useOrderStore();
    expect(await s.deliver('A', '不存在的东西')).toBe(false);
    expect(mocks.deliverOrder).not.toHaveBeenCalled();
    expect(落档次数).toBe(0);
    expect(提示[0]).toContain('背包里没有');
  });
});

// ================================================================
// ④ 领取（Ruling L）：只准照服务器的 `待领` 清单逐条 ACK
// ================================================================
describe('claimAll · 严格照服务器的待领清单逐条 ACK（不得从订单列表反推）', () => {
  it('「待领」为空时一个 ACK 都不发 —— 哪怕订单列表里有一堆单（防遍历订单逐项 ACK）', async () => {
    // 名下有「待接单」「已接单」「已交付」三张单，此刻一项权益都还没产生
    备好我的({
      asPoster: [造单({ id: 'P', poster: '老狼', maker: null, status: '待接单', deposit: 500 })],
      asMaker: [造单({ id: 'A', status: '已接单' }), 造单({ id: 'B', status: '已交付' })],
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(mocks.ackOrder).not.toHaveBeenCalled(); // 遍历订单的实现会在这里 ACK 订金/尾款 → 必红
    expect(当前UP()).toBe(20000);
    expect(落档次数).toBe(0);
    expect(成功).toEqual([]);
  });

  it('已接单的单：只 ACK 订金（尾款此刻尚不存在，ACK 它会让尾款永久领不到）', async () => {
    备好我的({
      asMaker: [造单({ id: 'A', status: '已接单', deposit: 300, final: 700 })],
      claim: { deposit: 300, final: 0, items: [], 待领: [{ id: 'A', 项: '订金' }] },
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(mocks.ackOrder).toHaveBeenCalledTimes(1);
    expect(mocks.ackOrder).toHaveBeenCalledWith('A', '老狼', 'maker', '订金');
    expect(mocks.ackOrder).not.toHaveBeenCalledWith('A', '老狼', 'maker', '尾款');
    expect(当前UP()).toBe(20300); // 订金入账
    expect(落档次数).toBe(1);
  });

  it('多条待领逐条 ACK：side 由项唯一决定（订金/尾款→maker，成品→poster）', async () => {
    const 成品 = { 名称: '狼牙短剑', 描述: 'd', 数量: 1 };
    备好我的({
      claim: {
        deposit: 300, final: 700,
        items: [{ id: 'B', item: 成品 }],
        待领: [{ id: 'A', 项: '订金' }, { id: 'B', 项: '尾款' }, { id: 'B', 项: '成品' }],
      },
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(mocks.ackOrder.mock.calls).toEqual([
      ['A', '老狼', 'maker', '订金'],
      ['B', '老狼', 'maker', '尾款'],
      ['B', '老狼', 'poster', '成品'],
    ]);
    // 金额只认汇总（服务器由同一函数派生，两者必然一致）
    expect(当前UP()).toBe(21000); // 20000 + 300 + 700
    expect(Number(当前背包()['狼牙短剑'].数量)).toBe(1);
    expect(落档次数).toBe(1); // 资金与物品一次落档
  });

  it('入账落档失败 → 不发 ACK、不写钱、错误条留得住（回执绝不能先于入账）', async () => {
    (globalThis as any).Mvu.replaceMvuData = async () => {
      throw new Error('Mvu 写不进去');
    };
    备好我的({ claim: { deposit: 300, final: 0, items: [], 待领: [{ id: 'A', 项: '订金' }] } });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    // 回执若先于入账发出：位已置而钱没到手 → 这笔订金永久领不到（「丢失不可救」）
    expect(mocks.ackOrder).not.toHaveBeenCalled();
    expect(当前UP()).toBe(20000);
    expect(s.lastError).toContain('Mvu 写不进去'); // 随后的 refresh 不许把它抹掉
    expect(提示.some(m => m.includes('Mvu 写不进去'))).toBe(true);
  });

  it('回执失败只影响回执：本地已入账，且如实告知玩家（不静默）', async () => {
    mocks.ackOrder.mockRejectedValue(new Error('网络断了'));
    备好我的({
      claim: { deposit: 300, final: 0, items: [], 待领: [{ id: 'A', 项: '订金' }] },
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(当前UP()).toBe(20300); // 钱已入账
    expect(s.lastError).toContain('回执');
    expect(提示.some(m => m.includes('回执'))).toBe(true);
  });
});

// ================================================================
// 接单 / 退货：不碰主卡变量（只改服务器状态）
// ================================================================
describe('接单 / 退货 · 只动服务器状态', () => {
  it('accept：带姓名发请求、零落档', async () => {
    备好我的({});
    const s = useOrderStore();
    await s.refresh();
    expect(await s.accept('A')).toBe(true);
    expect(mocks.acceptOrder).toHaveBeenCalledWith('A', '老狼');
    expect(落档次数).toBe(0);
  });

  it('reject：带姓名发请求、零落档（订金不退由服务器口径决定）', async () => {
    备好我的({ asPoster: [造单({ status: '已交付' })] });
    const s = useOrderStore();
    await s.refresh();
    expect(await s.reject('A')).toBe(true);
    expect(mocks.rejectOrder).toHaveBeenCalledWith('A', '老狼');
    expect(落档次数).toBe(0);
  });
});
