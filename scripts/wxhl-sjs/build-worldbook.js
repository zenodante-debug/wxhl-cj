/**
 * 生成《无限回廊》世界书：把火影忍者路线文档中的 27 个事件条目写入世界书。
 *
 * 源文件：
 *   src/wxhl-sjs/无限回廊9.9版.json
 *   src/wxhl-sjs/事件_火影忍者路线.txt
 * 输出：
 *   src/wxhl-sjs/无限回廊9.10版.json
 *
 * 条目设置对齐世界书内既有「事件_*」条目：
 *   关闭（disable=true）、蓝灯（constant=true）、无关键词（key=[]）、
 *   插入位置 before_char（position=0）、深度 depth=4。
 * 事件正文逐字取自文档中 <事件_xxx>…</事件_xxx> 整块（含标签）。
 */
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../../src/wxhl-sjs');
const srcJson = path.join(dir, '无限回廊9.9版.json');
const srcTxt = path.join(dir, '事件_火影忍者路线.txt');
const outJson = path.join(dir, '无限回廊9.10版.json');

function parseEventBlocks(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const lines = text.split(/\r?\n/);
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^<([^<>/][^<>]*)>\s*$/);
    if (!m) continue;
    const name = m[1];
    const close = `</${name}>`;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() !== close) j++;
    if (j >= lines.length) throw new Error(`条目 <${name}> 未闭合（第 ${i + 1} 行）`);
    blocks.push({ name, content: lines.slice(i, j + 1).join('\n') });
    i = j;
  }
  return blocks;
}

const worldbook = JSON.parse(fs.readFileSync(srcJson, 'utf8'));
const blocks = parseEventBlocks(fs.readFileSync(srcTxt, 'utf8'));

if (blocks.length !== 27) throw new Error(`预期 27 个事件条目，实际解析到 ${blocks.length} 个`);
const names = blocks.map(b => b.name);
if (new Set(names).size !== names.length) throw new Error('文档中存在重名事件条目');
for (const b of blocks) {
  if (!b.name.startsWith('事件_')) throw new Error(`条目名不符合事件命名：${b.name}`);
  if (!b.content.startsWith(`<${b.name}>`) || !b.content.endsWith(`</${b.name}>`)) {
    throw new Error(`条目正文标签不完整：${b.name}`);
  }
}

const entries = worldbook.entries;
const originalEntryCount = Object.keys(entries).length;
const existingComments = new Set(Object.values(entries).map(e => e.comment));
const collisions = names.filter(n => existingComments.has(n));
if (collisions.length) throw new Error(`世界书中已存在同名条目：${collisions.join('、')}`);

// 以世界书内既有关闭状态的蓝灯事件条目为模板
const template = structuredClone(entries['37']);
const nextUid = Math.max(...Object.keys(entries).map(Number)) + 1;
const nextDisplayIndex = Math.max(...Object.values(entries).map(e => e.displayIndex)) + 1;
const baseOrder = 330; // 位于 <事件设定> (300) 与 </事件设定> (400) 之间

blocks.forEach((block, i) => {
  const uid = nextUid + i;
  const displayIndex = nextDisplayIndex + i;
  const entry = structuredClone(template);
  entry.key = [];
  entry.keysecondary = [];
  entry.comment = block.name;
  entry.content = block.content;
  entry.constant = true;   // 蓝灯
  entry.disable = true;    // 默认关闭
  entry.selective = true;
  entry.order = baseOrder + i;
  entry.depth = 4;
  entry.uid = uid;
  entry.displayIndex = displayIndex;
  entry.extensions.display_index = displayIndex;
  entry.extensions.depth = 4;
  entries[String(uid)] = entry;
});

fs.writeFileSync(outJson, JSON.stringify(worldbook, null, 2) + '\n', 'utf8');

// 落盘核验：重新读取输出文件，逐条比对正文与设置
const out = JSON.parse(fs.readFileSync(outJson, 'utf8'));
const byComment = new Map(Object.values(out.entries).map(e => [e.comment, e]));
for (const block of blocks) {
  const e = byComment.get(block.name);
  if (!e) throw new Error(`输出缺少条目：${block.name}`);
  if (e.content !== block.content) throw new Error(`正文不一致：${block.name}`);
  if (e.disable !== true || e.constant !== true || e.key.length !== 0 || e.depth !== 4) {
    throw new Error(`设置不符合预期：${block.name}`);
  }
}
if (Object.keys(out.entries).length !== originalEntryCount + blocks.length) {
  throw new Error('条目总数异常');
}

console.log(`完成：写入 ${blocks.length} 个事件条目`);
console.log(`世界书条目：${originalEntryCount} -> ${Object.keys(out.entries).length}`);
console.log(`uid：${nextUid} ~ ${nextUid + blocks.length - 1}`);
console.log(`displayIndex：${nextDisplayIndex} ~ ${nextDisplayIndex + blocks.length - 1}`);
console.log(`输出：${outJson}`);
