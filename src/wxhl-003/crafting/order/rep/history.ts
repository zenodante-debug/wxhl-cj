// 本地订单记录 · localStorage（不进 MVU、不进正文 token，与既有 API 配置同处）
//
// 服务器只做中转、不留历史（免费档内存纪律），所以「我这店分数为什么变」只能本地记：
// 每次终局动作（验收/退货/弃单/领尾款）由当事客户端写一条。只留最近 100 条防膨胀。
// 读回一律防御式解析：数据被改坏/清过/形状残缺都不许炸，顶多当作没有记录。

const KEY = 'wxhl003_order_rep';
const MAX = 100;

export interface 订单记录 {
  订单id: string;
  角色: '发单人' | '接单人';
  对方: string;              // 发单人侧记店铺名（老订单回退玩家名）；接单人侧记发单人姓名
  摘要: string;              // 需求单摘要（名称｜成品类型·子类·品质·阶位）
  结果: '完成' | '退货' | '弃单' | '被取消';
  /** 本店因此单的分数增减；发单人侧恒 0，接单人「完成」时确切分值在发单人客户端（不可得）记 null */
  分数变动: number | null;
  时间: number;
}

/** 形状校验：缺 订单id/时间 的条目一律滤掉（历史是给人看的，残缺行没有展示价值） */
function 是合法记录(v: any): v is 订单记录 {
  return !!v && typeof v === 'object' && typeof v.订单id === 'string' && Number.isFinite(Number(v.时间));
}

export function loadHistory(): 订单记录[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter(是合法记录) : [];
  } catch (_) {
    return [];
  }
}

/** 追加一条并落盘（只留最近 MAX 条）。localStorage 不可用（隐私模式等）就静默放弃——记录不是钱 */
export function appendHistory(rec: 订单记录): void {
  try {
    const list = loadHistory();
    list.push(rec);
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch (_) {}
}
