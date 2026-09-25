import { describe, expect, it } from 'vitest';
import { buildEventSection, findControllers, type WorldbookEntry } from '../dungeonEvents';

const 事件 = (名: string, 正文 = '正文'): WorldbookEntry => ({ 名称: 名, 正文 });

/** 一个最小可用的假控制器: 被渲染时只是把所有 getwi 的调用记下来并拼成文本 */
const 假控制器 = (名 = 'EJS/主线事件控制器'): WorldbookEntry => ({
  名称: 名,
  正文: `<% if (typeof currentWorld === 'undefined') var currentWorld = getvar('x'); _%>\n<%- await getwi('事件_甲') %>`,
});

const 假环境 = () => ({
  prepareContext: async () => ({ getvar: () => '', getwi: async () => '' }),
  evalTemplate: async (code: string, ctx: Record<string, unknown>) => {
    // 模拟控制器行为: 调用注入进来的 getwi, 把结果拼起来
    const getwi = ctx.getwi as (n: string) => Promise<string>;
    const 出: string[] = [];
    for (const m of code.matchAll(/getwi\('([^']+)'\)/g)) 出.push(await getwi(m[1]));
    return 出.join('\n');
  },
});

describe('findControllers · 控制器识别', () => {
  it('名字以 EJS/ 开头即命中', () => {
    expect(findControllers([事件('EJS/主线事件控制器', '没有 getwi')]).map(e => e.名称))
      .toEqual(['EJS/主线事件控制器']);
  });

  it('名字没前缀但正文同时含 <% 与 getwi( 也命中', () => {
    expect(findControllers([事件('随便什么名', '<% await getwi("x") %>')]).map(e => e.名称))
      .toEqual(['随便什么名']);
  });

  it('两者都不满足 → 空数组', () => {
    expect(findControllers([事件('普通条目', '就是一段设定文本')])).toEqual([]);
    expect(findControllers([事件('只有 getwi(', 'await getwi("x")')])).toEqual([]);
  });
});

describe('buildEventSection · 只留事件条目', () => {
  it('fired 里的规则条目被丢掉, 只留 事件_ 前缀', async () => {
    const 条目表 = [
      假控制器(),
      事件('副本任务规范', '规则正文'),
      事件('事件_恶魔旅团', '恶魔旅团正文'),
      事件('事件_白焰降临', '白焰降临正文'),
    ];
    const 控制器 = {
      名称: 'EJS/主线事件控制器',
      正文: `<%- await getwi('副本任务规范') %><%- await getwi('事件_恶魔旅团') %><%- await getwi('事件_白焰降临') %>`,
    };
    const r = await buildEventSection({ 条目表: [控制器, ...条目表.slice(1)], ...假环境() });
    expect(r.触发).toEqual(['事件_恶魔旅团', '事件_白焰降临']);
    expect(r.段落).toContain('恶魔旅团正文');
    expect(r.段落).toContain('白焰降临正文');
    expect(r.段落).not.toContain('规则正文');
  });

  it('段落两端的「三条死命令」必须真的进了段落（把 + 段落尾 删掉就该红）', async () => {
    // 这三句是「事件优先级最高」这个需求的**唯一**落地物（spec §五.2 自称「三句硬话, 缺一不可」）。
    // 只断言事件正文进了段落的话, 整个 `段落尾` 被删掉都不会有测试变红。
    const r = await buildEventSection({
      条目表: [
        { 名称: 'EJS/x', 正文: `<%- await getwi('事件_甲') %>` },
        事件('事件_甲', '甲的正文'),
      ],
      ...假环境(),
    });
    expect(r.触发).toEqual(['事件_甲']);
    expect(r.段落).toContain('【三条死命令】');
    expect(r.段落).toContain('一律不生效');
    expect(r.段落).toContain('完全由事件接管');
  });

  it('段落在无事件时是空串, 且跳过原因为空（不是失败）', async () => {
    const r = await buildEventSection({ 条目表: [假控制器()], ...假环境() });
    expect(r.触发).toEqual([]);
    expect(r.段落).toBe('');
    expect(r.跳过原因).toBeUndefined();
  });
});

describe('buildEventSection · 失败一律降级不抛', () => {
  it('没有控制器 → 跳过原因非空, 不抛', async () => {
    const r = await buildEventSection({ 条目表: [事件('普通', '文本')], ...假环境() });
    expect(r.段落).toBe('');
    expect(r.跳过原因).toBeTruthy();
  });

  it('prepareContext 抛错 →同上', async () => {
    const r = await buildEventSection({
      条目表: [假控制器()],
      prepareContext: async () => { throw new Error('插件没初始化'); },
      evalTemplate: async () => '',
    });
    expect(r.段落).toBe('');
    expect(r.跳过原因).toContain('插件没初始化');
  });

  it('evalTemplate 抛错 → 同上', async () => {
    const r = await buildEventSection({
      条目表: [假控制器()],
      ...假环境(),
      evalTemplate: async () => { throw new Error('模板炸了'); },
    });
    expect(r.段落).toBe('');
    expect(r.跳过原因).toContain('模板炸了');
  });

  it('超时 → 跳过原因就是超时文案本身, **不叠**「控制器渲染失败」前缀', async () => {
    const r = await buildEventSection({
      条目表: [假控制器()],
      prepareContext: async () => ({}),
      evalTemplate: () => new Promise(() => {}),   // 永不 resolve
      超时毫秒: 30,
    });
    expect(r.段落).toBe('');
    // spec §八 把「渲染失败」与「超时」列为两行两条文案; 共用一个 catch 加前缀会渲染成
    // 「控制器渲染失败: 控制器渲染超时」那种自相矛盾的句子
    expect(r.跳过原因).toBe('控制器渲染超时');
  });

  it('prepareContext 永不 resolve → 也在超时内降级, 不把 UI 卡在「生成中...」', async () => {
    // 它是全模块唯一一条会「挂住」的失败路径: 挂在 race 之外 →
    // generate() 永不返回 → 界面永远显示「生成中...」且没有任何提示
    const r = await buildEventSection({
      条目表: [假控制器()],
      prepareContext: () => new Promise(() => {}),
      evalTemplate: async () => '',
      超时毫秒: 30,
    });
    expect(r.段落).toBe('');
    expect(r.跳过原因).toBe('控制器渲染超时');
  });
});

describe('buildEventSection · 注入契约', () => {
  it('currentWorld 被强制成「副本」', async () => {
    let 见到的: Record<string, unknown> = {};
    await buildEventSection({
      条目表: [假控制器()],
      prepareContext: async () => ({ getvar: () => '回廊' }),
      evalTemplate: async (_c, ctx) => { 见到的 = ctx; return ''; },
    });
    expect(见到的.currentWorld).toBe('副本');
  });

  it('getwi 被顶替成我们的只读版本（不是插件那个）', async () => {
    const 插件原版 = async () => '插件原版';
    let 见到的: any = null;
    await buildEventSection({
      条目表: [假控制器(), 事件('事件_甲', '甲的正文')],
      prepareContext: async () => ({ getwi: 插件原版 }),
      evalTemplate: async (code, ctx) => {
        见到的 = ctx.getwi;
        const getwi = ctx.getwi as (n: string) => Promise<string>;
        for (const m of code.matchAll(/getwi\('([^']+)'\)/g)) await getwi(m[1]);
        return '';
      },
    });
    expect(见到的).not.toBe(插件原版);
    expect(await 见到的('事件_甲')).toBe('甲的正文');
  });

  it('控制器引用了条目表里没有的名字 → 记进缺失, 不阻断', async () => {
    const r2 = await buildEventSection({
      条目表: [{ 名称: 'EJS/x', 正文: `<%- await getwi('事件_不存在') %>` }],
      ...假环境(),
    });
    expect(r2.缺失).toEqual(['事件_不存在']);
    expect(r2.段落).toBe('');   // 取不到内容 ⇒ 段落仍为空
    expect(r2.跳过原因).toBeUndefined();   // 但**不是**失败 —— 没有跳过原因
  });

  it('引用的名字都在表里 → 缺失为空', async () => {
    const r = await buildEventSection({
      条目表: [
        { 名称: 'EJS/x', 正文: `<%- await getwi('事件_甲') %>` },
        事件('事件_甲', '甲的正文'),
      ],
      ...假环境(),
    });
    expect(r.缺失).toEqual([]);
    expect(r.触发).toEqual(['事件_甲']);
  });
});
