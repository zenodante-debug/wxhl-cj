// ================================================================
// 回廊交易所 · 10 只势力股票定义（spec §4），波动率从低到很高。
// ================================================================

export interface StockDef {
  code: string; // 行情代码
  name: string; // 上市名
  faction: string; // 势力
  sigma: number; // 每跳波动率（几何随机游走标准差）
  basePrice: number;
}

export const HISTORY_CAP = 60;

export const STOCKS: StockDef[] = [
  { code: 'TGJ', name: '特管局后勤', faction: '特管局', sigma: 0.004, basePrice: 100 },
  { code: 'OETA', name: 'OETA 安保', faction: 'OETA', sigma: 0.008, basePrice: 80 },
  { code: 'LHJ', name: '零号局情报', faction: '零号局', sigma: 0.012, basePrice: 60 },
  { code: 'EJS', name: 'EJSSA 竞技', faction: 'EJSSA', sigma: 0.016, basePrice: 50 },
  { code: 'FM', name: '非盟商会', faction: '非盟', sigma: 0.022, basePrice: 40 },
  { code: 'PLH', name: '泛联控股', faction: '泛东亚联合体', sigma: 0.03, basePrice: 35 },
  { code: 'SJH', name: '圣辉教会', faction: '神圣教会', sigma: 0.038, basePrice: 30 },
  { code: 'FZJT', name: '方舟集团', faction: '方舟集团', sigma: 0.05, basePrice: 25 },
  { code: 'RCJJ', name: '瑞辰基金会', faction: '瑞辰基金会', sigma: 0.065, basePrice: 20 },
  { code: 'EML', name: '恶魔旅团黑产', faction: '恶魔旅团', sigma: 0.09, basePrice: 15 },
];

export function stockOf(code: string): StockDef {
  const s = STOCKS.find(x => x.code === code);
  if (!s) throw new Error('未知股票代码: ' + code);
  return s;
}
