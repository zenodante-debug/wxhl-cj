import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  ackOrder, confirmOrder, createOrder, deliverOrder, fetchHall, fetchMine,
  type 订单, type 待领取,
} from '../api';
import { 需求单Schema, type 需求单 } from '../spec';
import { useOrderStore, 可交付候选 } from '../store';

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
 *   ⑤ Ruling M：**先回执、后入账，且只为回执成功的条目入账**。反过来的话 ACK 失败（网络抖动即可）时
 *      钱已到玩家手上而服务器仍列着该项 → 下次刷新**再发一遍**（无限刷钱）。故这里钉「ACK 失败 ⇒ 一分不入」
 *      与「部分成功只入成功的那些」；金额一律取条目自带的 `金额`，汇总数字在用例里故意写错以证明没被读。
 *   ⑥ I-1：**只为 first=true 的条目入账**（first=false 是另一标签页已入过账的重复回执，再入一次＝双发）；
 *      且**写入基取 ACK 循环后的新读值**——循环期间的存档变动（市场卖出）不得被整片覆盖。
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
  mocks.ackOrder.mockResolvedValue({ deleted: false, first: true });
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

  // Ruling N：图纸是生产资料（4,500~112,500 UP），材料候选排除它、市场禁止倒卖它，
  // 交付这道口也必须拦 —— 且拦在 store 边界，不靠每个调用点自觉。
  it('图纸 → 拒、不发请求、零落档、背包原样、报错指明「生产资料」（Ruling N）', async () => {
    mvu.stat_data.契约者.背包 = { '图纸·狼王牙刃': { 名称: '图纸·狼王牙刃', 数量: 1 } };
    const s = useOrderStore();
    expect(await s.deliver('A', '图纸·狼王牙刃')).toBe(false);
    expect(mocks.deliverOrder).not.toHaveBeenCalled(); // 请求都不许发
    expect(落档次数).toBe(0); // 一个变量都不许写
    expect(Number(当前背包()['图纸·狼王牙刃'].数量)).toBe(1); // 图纸还在背包里
    expect(成功).toEqual([]); // 不许假报成功
    expect(s.lastError).toContain('图纸');
    expect(s.lastError).toContain('生产资料');
    expect(提示.some(m => m.includes('生产资料'))).toBe(true);
  });
});

// ================================================================
// ③½ Ruling N：交付候选计算（OrderView 的 bagNames 用的就是它）——
//     图纸不进候选，普通物品进；数量为 0 的不进。
// ================================================================
describe('可交付候选 · 图纸不进交付候选（Ruling N）', () => {
  it('含普通物品、不含图纸、不含数量为 0 的', () => {
    const 背包 = {
      狼牙短剑: { 名称: '狼牙短剑', 数量: 2 },
      '图纸·狼王牙刃': { 名称: '图纸·狼王牙刃', 数量: 1 },
      精铁: { 名称: '精铁', 数量: 0 },
    };
    expect(可交付候选(背包 as any)).toEqual(['狼牙短剑']);
  });

  it('背包里没有非图纸物品 → 空候选（UI 据此显示「没有可交付的物品」）', () => {
    const 背包 = { '图纸·狼王牙刃': { 名称: '图纸·狼王牙刃', 数量: 3 } };
    expect(可交付候选(背包 as any)).toEqual([]);
  });
});

// ================================================================
// ④ 领取：Ruling L（只准照服务器的 `待领` 清单逐条 ACK）
//          + Ruling M（先回执、后入账，只为回执成功的条目入账 —— 否则 ACK 失败会重复发钱）
// ================================================================
describe('claimAll · 照待领清单逐条 ACK（Ruling L）+ 先回执后入账（Ruling M）', () => {
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
      // 汇总数字**故意写错**：Ruling M 起入账只认条目自带的 `金额`，再读 `deposit`/`final` 就是错的
      claim: { deposit: 99999, final: 99999, items: [], 待领: [{ id: 'A', 项: '订金', 金额: 300 }] },
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(mocks.ackOrder).toHaveBeenCalledTimes(1);
    expect(mocks.ackOrder).toHaveBeenCalledWith('A', '老狼', 'maker', '订金');
    expect(mocks.ackOrder).not.toHaveBeenCalledWith('A', '老狼', 'maker', '尾款');
    expect(当前UP()).toBe(20300); // 订金入账（300，而不是汇总里的 99999）
    expect(落档次数).toBe(1);
  });

  it('多条待领逐条 ACK：side 由项唯一决定（订金/尾款→maker，成品→poster）', async () => {
    const 成品 = { 名称: '狼牙短剑', 描述: 'd', 数量: 1 };
    备好我的({
      claim: {
        deposit: 99999, final: 99999, // 同上：汇总仅供显示，入账按条目金额
        items: [{ id: 'B', item: 成品 }],
        待领: [
          { id: 'A', 项: '订金', 金额: 300 },
          { id: 'B', 项: '尾款', 金额: 700 },
          { id: 'B', 项: '成品', 金额: 0 },
        ],
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
    expect(当前UP()).toBe(21000); // 20000 + 300 + 700（成品那条金额 0）
    expect(Number(当前背包()['狼牙短剑'].数量)).toBe(1); // 成品那条回执成功 → 入包
    expect(落档次数).toBe(1); // 资金与物品一次落档
  });

  it('Ruling M 核心：回执失败的条目一律不入账 —— 该条的钱不进 UP、其成品不入包', async () => {
    // A 回执成功；C（尾款的钱）与 B（成品）回执失败 —— 必须只入 A 的账
    mocks.ackOrder.mockImplementation(async (id: string) => {
      if (id === 'A') return { deleted: false, first: true };
      throw new Error('网络断了');
    });
    const 成品 = { 名称: '狼牙短剑', 描述: 'd', 数量: 1 };
    备好我的({
      claim: {
        deposit: 99999, final: 99999, // 汇总故意写错：入账只认条目金额，且只认回执成功的那些
        items: [{ id: 'B', item: 成品 }],
        待领: [
          { id: 'A', 项: '订金', 金额: 300 },
          { id: 'C', 项: '尾款', 金额: 700 },
          { id: 'B', 项: '成品', 金额: 0 },
        ],
      },
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    // 旧写法（先入账、按汇总发钱）在这里会给出 20000+99999+99999；而且 C 的 700 下次刷新还会再发一遍
    expect(当前UP()).toBe(20300); // 只有 A 的 300
    expect(当前背包()['狼牙短剑']).toBeUndefined(); // B 的成品没回执 → 不入包（否则下次刷新会再入一遍）
    expect(落档次数).toBe(1);
    expect(s.lastError).toContain('未入账');
    expect(提示.some(m => m.includes('未入账'))).toBe(true); // 玩家看得到，不静默
  });

  it('全部回执失败：一次落档都不发生，且不许报「已领取」', async () => {
    mocks.ackOrder.mockRejectedValue(new Error('网络断了'));
    备好我的({
      claim: { deposit: 0, final: 0, items: [], 待领: [{ id: 'A', 项: '订金', 金额: 300 }] },
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(当前UP()).toBe(20000);
    expect(落档次数).toBe(0);
    expect(成功).toEqual([]); // 什么都没发出去，就不许报「已领取」
    expect(提示.some(m => m.includes('回执'))).toBe(true);
  });

  it('部分成功：两单里只有回执成功的那张单入账', async () => {
    mocks.ackOrder.mockImplementation(async (id: string) => {
      if (id === 'B') throw new Error('网络断了');
      return { deleted: false, first: true };
    });
    备好我的({
      claim: {
        deposit: 0, final: 0, items: [],
        待领: [{ id: 'A', 项: '订金', 金额: 300 }, { id: 'B', 项: '尾款', 金额: 700 }],
      },
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(mocks.ackOrder).toHaveBeenCalledTimes(2); // 两条都试过
    expect(当前UP()).toBe(20300); // 只有 A 的 300 入账，B 的 700 留在服务器待领里
    expect(落档次数).toBe(1);
    expect(s.lastError).toContain('部分领取未完成');
    expect(提示.some(m => m.includes('未入账'))).toBe(true);
  });

  it('退货退回的成品（项=尾款、金额 0）：回执成功后成品入包，且一分钱都不发', async () => {
    const 退回的成品 = { 名称: '狼牙短剑', 描述: 'd', 数量: 1 };
    备好我的({
      claim: {
        deposit: 0, final: 0,
        items: [{ id: 'C', item: 退回的成品 }],
        待领: [{ id: 'C', 项: '尾款', 金额: 0 }], // 同一个位两用：已完成给钱、已取消退物
      },
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(mocks.ackOrder).toHaveBeenCalledWith('C', '老狼', 'maker', '尾款');
    expect(Number(当前背包()['狼牙短剑'].数量)).toBe(1);
    expect(当前UP()).toBe(20000); // 金额 0：退回的是物不是钱
    expect(落档次数).toBe(1);
  });

  it('条目缺少可用金额 → 一个 ACK 都不发（先校验后回执：ACK 一发即算已领，算不出钱就白丢）', async () => {
    备好我的({
      claim: { deposit: 0, final: 0, items: [], 待领: [{ id: 'A', 项: '订金' } as any] },
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(mocks.ackOrder).not.toHaveBeenCalled();
    expect(当前UP()).toBe(20000);
    expect(落档次数).toBe(0);
    expect(提示[0]).toContain('金额');
  });

  it('残余（Ruling M 已接受）：回执已送达但本地落档失败 → 大声报错、不静默', async () => {
    (globalThis as any).Mvu.replaceMvuData = async () => {
      throw new Error('Mvu 写不进去');
    };
    备好我的({ claim: { deposit: 0, final: 0, items: [], 待领: [{ id: 'A', 项: '订金', 金额: 300 }] } });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    // 回执已发（这是 Ruling M 换来的顺序，代价就是这一条残余）：服务器认为已领，本地却没入账
    expect(mocks.ackOrder).toHaveBeenCalledTimes(1);
    expect(当前UP()).toBe(20000); // 本地确实没写进去
    // 必须报得出来：既说清「回执已送达」也说清「本地入账失败」，且常驻错误条不被随后的刷新抹掉
    expect(s.lastError).toContain('本地入账失败');
    expect(s.lastError).toContain('回执已送达');
    expect(提示.some(m => m.includes('本地入账失败'))).toBe(true);
  });

  // ================================================================
  // I-1（v4a 终审）：① first 门——双开标签页共享存档、读到同一份待领清单，
  //   重复回执（first=false）不得再入账，否则两页各入一次＝双发钱/双入包；
  //   ② 写入基取循环后新读值——ACK 循环是网络往返，期间存档被市场/工坊改过的话，
  //   拿循环前的快照写回会把那段变动整片覆盖（钱物凭空蒸发/复制）。
  // ================================================================
  it('I-1 · first=false 的重复回执不入账：钱不进 UP、物不入包；first=true 照常入账', async () => {
    // 另一标签页已把 A 的订金与 B 的成品领过（服务器已置位），本页的重复 ACK 回 first:false
    mocks.ackOrder.mockImplementation(async (id: string) => ({ deleted: false, first: id === 'C' }));
    const 成品 = { 名称: '狼牙短剑', 描述: 'd', 数量: 1 };
    备好我的({
      claim: {
        deposit: 0, final: 0,
        items: [{ id: 'B', item: 成品 }],
        待领: [
          { id: 'A', 项: '订金', 金额: 300 },   // first=false：另一页已入过账
          { id: 'B', 项: '成品', 金额: 0 },     // first=false：另一页已入过包
          { id: 'C', 项: '尾款', 金额: 700 },   // first=true：本页首次
        ],
      },
    });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(当前UP()).toBe(20700);                       // 只有 C 的 700（A 的 300 不双发）
    expect(当前背包()['狼牙短剑']).toBeUndefined();      // B 的成品不入包（不双入）
    expect(落档次数).toBe(1);
    expect(成功.some(m => m.includes('700'))).toBe(true);
  });

  it('I-1 · 写入基取循环后新读值：ACK 期间存档被市场改过，那段变动不被覆盖', async () => {
    // ACK 循环的 await 期间，市场侧卖出了精铁（背包 −1 件、UP +90）。
    // 旧实现拿循环前的快照 r 整片写回 → 这笔卖出被回滚（UP 回 20300、精铁凭空回包）。
    mocks.ackOrder.mockImplementation(async () => {
      delete (mvu.stat_data.契约者.背包 as Record<string, unknown>).精铁;
      mvu.stat_data.契约者.经济.UP = 20090;
      return { deleted: false, first: true };
    });
    mvu.stat_data.契约者.背包 = { 精铁: { 名称: '精铁', 数量: 1 } };
    备好我的({ claim: { deposit: 0, final: 0, items: [], 待领: [{ id: 'A', 项: '订金', 金额: 300 }] } });
    const s = useOrderStore();
    await s.refresh();
    await s.claimAll();
    expect(当前UP()).toBe(20390);                        // 20090（新读值）+ 300，而不是 20000+300
    expect((当前背包() as Record<string, unknown>).精铁).toBeUndefined(); // 卖出的精铁没被写回背包
    expect(落档次数).toBe(1);
  });
});

// ================================================================
// 接单 / 退货：不碰主卡变量（只改服务器状态）
// ================================================================
describe('接单 / 退货 · 只动服务器状态', () => {
  it('accept：带姓名与店铺名发请求、零落档', async () => {
    // v4b 开店闸门：接单人身份是店铺，存档里得有「个人产业.当前店铺.名称」才放得行
    mvu.stat_data.契约者.个人产业 = { 当前店铺: { 名称: '老狼铁匠铺' } };
    备好我的({});
    const s = useOrderStore();
    await s.refresh();
    expect(await s.accept('A')).toBe(true);
    expect(mocks.acceptOrder).toHaveBeenCalledWith('A', '老狼', '老狼铁匠铺');
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
