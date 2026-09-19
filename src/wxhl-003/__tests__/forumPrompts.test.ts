import { describe, expect, it } from 'vitest';
import { buildRefreshPrompt, buildRepliesPrompt, buildThreadDetailPrompt } from '../forumPrompts';

const 分区 = ['complaints', 'intel', 'dungeon', 'build', 'trade'] as const;

describe('buildRefreshPrompt 的注入矩阵', () => {
  it('5 个分区都拿到回廊核心机制与贴吧风格与人格要求', () => {
    for (const s of 分区) {
      const p = buildRefreshPrompt(s, '', '');
      expect(p).toContain('无限回廊核心机制');
      expect(p).toContain('贴吧风格');
      expect(p).toContain('人格多样性');
    }
  });

  it('只有吐槽区与副本经历区拿到副本模块词表', () => {
    expect(buildRefreshPrompt('complaints', '', '')).toContain('副本模块词表');
    expect(buildRefreshPrompt('dungeon', '', '')).toContain('副本模块词表');
    for (const s of ['intel', 'build', 'trade'] as const) {
      expect(buildRefreshPrompt(s, '', '')).not.toContain('副本模块词表');
    }
  });

  it('只有副本经历区拿到副本生成规则全文与奖励规范', () => {
    expect(buildRefreshPrompt('dungeon', '', '')).toContain('副本生成');
    expect(buildRefreshPrompt('dungeon', '', '')).toContain('副本成就奖励梯度');
    for (const s of ['complaints', 'intel', 'build', 'trade'] as const) {
      expect(buildRefreshPrompt(s, '', '')).not.toContain('副本成就奖励梯度');
    }
  });

  it('只有构筑区拿到职业系统规则与属性装备机制', () => {
    expect(buildRefreshPrompt('build', '', '')).toContain('属性与装备机制');
    for (const s of ['complaints', 'intel', 'dungeon', 'trade'] as const) {
      expect(buildRefreshPrompt(s, '', '')).not.toContain('属性与装备机制');
    }
  });

  it('只有交易区拿到交易与经济机制', () => {
    expect(buildRefreshPrompt('trade', '', '')).toContain('交易与经济机制');
    for (const s of ['complaints', 'intel', 'dungeon', 'build'] as const) {
      expect(buildRefreshPrompt(s, '', '')).not.toContain('交易与经济机制');
    }
  });

  it('只有吐槽区与情报区拿到势力基础资料', () => {
    expect(buildRefreshPrompt('complaints', '', '')).toContain('现实势力_海外官方与企业');
    expect(buildRefreshPrompt('complaints', '', '')).toContain('势力详情_神圣教会');
    expect(buildRefreshPrompt('intel', '', '')).toContain('现实势力_海外官方与企业');
    expect(buildRefreshPrompt('intel', '', '')).toContain('势力详情_神圣教会');
    for (const s of ['dungeon', 'build', 'trade'] as const) {
      expect(buildRefreshPrompt(s, '', '')).not.toContain('现实势力_海外官方与企业');
      expect(buildRefreshPrompt(s, '', '')).not.toContain('势力详情_神圣教会');
    }
  });

  it('只有情报区拿到排行榜完整名单', () => {
    const p = buildRefreshPrompt('intel', '', '');
    expect(p).toContain('「天榜之首·执剑镇国」');
    expect(p).toContain('[「天榜之首·执剑镇国」]燕琉璃 Lv.100');
    expect(p).toContain('[「人榜之首·无距之刃」]林千尺 Lv.20');
    for (const s of ['complaints', 'dungeon', 'build', 'trade'] as const) {
      expect(buildRefreshPrompt(s, '', '')).not.toContain('「天榜之首·执剑镇国」');
    }
  });

  it('注入世界书与影响事件上下文', () => {
    const p = buildRefreshPrompt('trade', '世界书内容ABC', '最近圈内大事XYZ');
    expect(p).toContain('世界书内容ABC');
    expect(p).toContain('最近圈内大事XYZ');
  });

  it('要求返回 threads JSON', () => {
    expect(buildRefreshPrompt('intel', '', '')).toContain('threads');
    expect(buildRefreshPrompt('intel', '', '')).toContain('hotComment');
  });

  it('分区之间的体裁定位互不相同', () => {
    const 定位 = 分区.map(s => buildRefreshPrompt(s, '', ''));
    for (let i = 0; i < 定位.length; i++) {
      for (let j = i + 1; j < 定位.length; j++) {
        expect(定位[i]).not.toBe(定位[j]);
      }
    }
  });
});

describe('buildThreadDetailPrompt', () => {
  it('带上分区体裁与楼主人格要求', () => {
    const p = buildThreadDetailPrompt('trade', { title: '出把破刀', preview: '急出', author: '卖刀的老哥', replies: 12 }, '');
    expect(p).toContain('出把破刀');
    expect(p).toContain('卖刀的老哥');
    expect(p).toContain('交易');
    expect(p).toContain('人格');
  });
});

describe('buildRepliesPrompt', () => {
  it('要求复用帖内已出现的昵称、不扮演楼主', () => {
    const p = buildRepliesPrompt('dungeon', { title: '我在生化危机里活了三天' }, '[#1 楼主]: 事情是这样的', '');
    expect(p).toContain('我在生化危机里活了三天');
    expect(p).toContain('不要扮演楼主');
  });
});
