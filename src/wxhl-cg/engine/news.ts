// ================================================================
// 回廊交易所 · 新闻系统：标题情绪与实际冲击分离（25% 概率反向）——
// 照搬杀跌尖塔"新闻不一定准"。池子取材自 docs/reference/spire-stocks-strings.txt
//（尖塔 mod 全量新闻），改写为回廊势力版。
// 扩充规则：每只股 ≥3 条，好坏掺半；扩充时只加 NEWS_POOL 条目，不改逻辑。
// ================================================================
import type { ActiveNews, ExchangeAccount } from './types';
import { stockOf } from './stocks';
import type { Rng } from './market';

export interface NewsTemplate {
  stock: string;
  sentiment: 'good' | 'bad';
  text: string;
}

export const NEWS_POOL: NewsTemplate[] = [
  // —— 特管局后勤 TGJ（极低波动）——
  { stock: 'TGJ', sentiment: 'good', text: '特管局公布上季度装备采购清单，后勤供应商订单排到下赛季' },
  { stock: 'TGJ', sentiment: 'bad', text: '特管局审计组进驻后勤处，三名采购员被带走问话' },
  { stock: 'TGJ', sentiment: 'good', text: '一阶区治安整治见效，特管局后勤被评为「最省心供应商」' },
  // —— OETA 安保 ——
  { stock: 'OETA', sentiment: 'good', text: 'OETA 签下三个副本入口的独家安保合同' },
  { stock: 'OETA', sentiment: 'bad', text: 'OETA 外勤小队在高阶副本全灭，赔付金创纪录' },
  { stock: 'OETA', sentiment: 'good', text: 'OETA 年度训练通过率创新高，合作佣金随之上调' },
  // —— 零号局情报 LHJ ——
  { stock: 'LHJ', sentiment: 'good', text: '零号局出售的情报准确率蝉联第一，买家复购率大涨' },
  { stock: 'LHJ', sentiment: 'bad', text: '零号局一份绝密情报被证伪，客户要求退款并索赔' },
  { stock: 'LHJ', sentiment: 'bad', text: '零号局行事风格过于冷酷引发争议，多个势力暂停合作' },
  // —— EJSSA 竞技 EJS ——
  { stock: 'EJS', sentiment: 'good', text: 'EJSSA 排位赛收视率破纪录，转播权竞价翻倍' },
  { stock: 'EJS', sentiment: 'bad', text: 'EJSSA 选手被曝使用违禁强化，联盟紧急调查' },
  { stock: 'EJS', sentiment: 'good', text: 'EJSSA 宣布新增二阶赛区，门票预售秒空' },
  // —— 非盟商会 FM ——
  { stock: 'FM', sentiment: 'good', text: '非盟商会打通两条新商路，通货吞吐量翻倍' },
  { stock: 'FM', sentiment: 'bad', text: '非盟商会一支商队在野区被劫，损失未公开' },
  { stock: 'FM', sentiment: 'good', text: '非盟商会下调过路费，中小契约者纷纷改道捧场' },
  // —— 泛联控股 PLH ——
  { stock: 'PLH', sentiment: 'good', text: '泛东亚联合体推出跨区结算凭证，兑换量超预期' },
  { stock: 'PLH', sentiment: 'bad', text: '泛联内部成员国就分摊比例谈崩，联合项目停摆' },
  { stock: 'PLH', sentiment: 'good', text: '泛联控股基建基金获批，多个安全区扩建在即' },
  // —— 圣辉教会 SJH ——
  { stock: 'SJH', sentiment: 'good', text: '神圣教会在一阶区公开招募信徒，捐赠收入激增' },
  { stock: 'SJH', sentiment: 'bad', text: '教会圣水被检出只是普通泉水，信徒要求退捐' },
  { stock: 'SJH', sentiment: 'good', text: '圣女亲自为远征队祝福，教会威望达新赛季高点' },
  // —— 方舟集团 FZJT ——
  { stock: 'FZJT', sentiment: 'good', text: '方舟集团黑市渠道扩容，外勤药水销量翻番' },
  { stock: 'FZJT', sentiment: 'bad', text: '方舟集团情报贩子价目表外泄，被指长期溢价宰客' },
  { stock: 'FZJT', sentiment: 'good', text: '方舟集团收购两家破产工坊，产能版图再扩张' },
  // —— 瑞辰基金会 RCJJ ——
  { stock: 'RCJJ', sentiment: 'good', text: '瑞辰基金会人体强化实验体数据异常优异，投资圈沸腾' },
  { stock: 'RCJJ', sentiment: 'bad', text: '瑞辰基金会的资助合同被曝暗藏陷阱，多名契约者联名控诉' },
  { stock: 'RCJJ', sentiment: 'bad', text: '瑞辰实验室发生泄漏事故，周边安全区紧急疏散' },
  // —— 恶魔旅团黑产 EML ——
  { stock: 'EML', sentiment: 'good', text: '恶魔旅团保护费从 30% 涨到 50%，「营收」再创佳绩' },
  { stock: 'EML', sentiment: 'bad', text: '特管局专项整治恶魔旅团，三个收保护费小队被端' },
  { stock: 'EML', sentiment: 'good', text: '恶魔旅团一阶分队队长放话要复仇，黑产关注度飙升' },
];

const NEWS_CHANCE = 0.25; // 冷却归零后每跳抽中概率
const NEWS_TTL = 3; // 冲击生效跳数
const FLIP_CHANCE = 0.25; // 实际方向与标题相反的概率

export function maybeRollNews(acct: ExchangeAccount, rng: Rng): void {
  if (acct.news) return;
  if (acct.newsCooldown > 0) {
    acct.newsCooldown--;
    return;
  }
  if (rng() >= NEWS_CHANCE) return;
  const t = NEWS_POOL[Math.floor(rng() * NEWS_POOL.length)];
  const sigma = stockOf(t.stock).sigma;
  const magnitude = (1 + rng() * 2) * sigma;
  const sign = t.sentiment === 'good' ? 1 : -1;
  const flipped = rng() < FLIP_CHANCE;
  const news: ActiveNews = {
    stock: t.stock,
    text: t.text,
    sentiment: t.sentiment,
    impact: (flipped ? -sign : sign) * magnitude,
    ttl: NEWS_TTL,
  };
  acct.news = news;
  acct.newsCooldown = 3 + Math.floor(rng() * 4); // 3–6 跳
}
