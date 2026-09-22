import type { RankBoard, RankPayload } from './rank';

/** 与自由市场共用同一个 Worker（排行榜段见 cloudflare/wxhl-market/worker.js） */
export const RANK_API = 'https://market.657868.xyz';

/** 非 2xx 时 throw Error(响应文本)；Worker 400 的响应体就是拒绝原因 */
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(RANK_API + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body: unknown): Promise<T> =>
  req<T>(path, { method: 'POST', body: JSON.stringify(body) });

/** 上传我的等级。服务器回传上传后的名次与总人数，省一次往返 */
export function submitRank(p: RankPayload): Promise<{ rank: number; total: number }> {
  return post('/rank/submit', p);
}

/** 前 20 名 + 总人数 + 我的名次；我在 20 名外时另带前后邻居。name 为空则只拿榜单 */
export function fetchRankTop(name: string): Promise<RankBoard> {
  return req(`/rank/top?name=${encodeURIComponent(name)}`);
}
