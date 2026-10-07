# EJS 主线事件控制器 · 原文（用户提供，逐字）

> 2026-09-25 由用户提供（`C:\Users\zero\Downloads\ejs.txt`）。
> 用途：副本生成时判发生效的动态事件。设计见 `2026-09-25-dungeon-teammates-and-ejs-events-design.md`。
>
> **来源核对**（2026-09-25 实测）：
> - 世界书：`无限回廊8.0 血统 究极无敌极致低token版本`
> - 条目名：**`EJS/主线事件控制器`**
> - 长度：**3215 字**（与本文正文一致）
> - 它是这张卡上**唯一**含 EJS、也**唯一**含 `getwi(` 的条目
>
> **注意**：本控制器**未引用** `事件_医者仁心` —— 该条目不会被本控制器触发，原因待用户确认。

```ejs
<%
if (typeof currentWorld === 'undefined') var currentWorld = getvar('stat_data.契约者.当前世界', { defaults: '' });
if (typeof currentDomain === 'undefined') var currentDomain = getvar('stat_data.契约者.当前时间.地点', { defaults: '' });
if (typeof currentRank === 'undefined') var currentRank = getvar('stat_data.契约者.头部.阶位', { defaults: '' });
if (typeof currentCycle === 'undefined') var currentCycle = getvar('stat_data.契约者.赛季信息.当前副本周期', { defaults: 0 });
if (typeof currentSeason === 'undefined') var currentSeason = getvar('stat_data.契约者.赛季信息.当前赛季', { defaults: 0 });
if (typeof dungeonHistory === 'undefined') var dungeonHistory = getvar('stat_data.契约者.副本经历', { defaults: {} });
if (typeof dungeonHistoryCount === 'undefined') var dungeonHistoryCount = Object.keys(dungeonHistory).length;
%>

// ==================== 基础世界规则动态加载 ====================
<% if (currentWorld === '副本') { %>
<%- await getwi('副本任务规范') %>
<%- await getwi('敌人模板设计') %>
<%- await getwi('副本任务变种') %>
<%- await getwi('副本角色生成规则') %>
<% } %>

<% if (currentWorld === '现实') { %> <%- await getwi('现实世界通用规则') %> <% } %>

// 第一组：早期的特殊独立事件
<% if (currentWorld === '现实' && currentCycle === 2 && currentSeason === 21) { %>
<%- await getwi('事件_第一次接触') %>
<% } %>

<% if (currentWorld === '现实' && currentRank === '二阶') { %>
<%- await getwi('事件_赤胆剑心·现实招募') %>
<% } %>

// 第二组：回廊与副本期间的势力遭遇（拆分开，让它们可以同时触发）
<% if (currentRank === '一阶' && (currentWorld === '回廊' || currentWorld === '副本')) { %>
  <% if (currentCycle >= 3 && currentCycle <= 5) { %>
<%- await getwi('事件_恶魔旅团') %>
  <% } %>

  <% if (currentCycle === 3) { %>
<%- await getwi('事件_白焰降临') %>
  <% } %>
<% } %>

<% if (currentRank === '二阶' && currentWorld === '副本') { %>
  <% if (currentCycle === 7) { %>
<%- await getwi('事件_赤胆剑心·副本遭遇') %>
  <% } %>
<% } %>

// 第三组：固定周期的机制型事件（独立触发）
<% if (currentSeason === 21 && currentCycle === 4 && (currentWorld === '回廊' || currentWorld === '副本')) { %>
<%- await getwi('事件_回廊圣杯战争') %>
<% } %>

<% if (currentCycle === 5 || currentCycle === 10) { %>
<%- await getwi('事件_回廊淘汰赛') %>
<% } %>

<% if (currentSeason === 21 && currentCycle === 5 &&  (currentWorld === '回廊' || currentWorld === '副本')) { %>
<%- await getwi('事件_咫尺天涯') %>
<%- await getwi('事件_中期试炼_加勒比') %>
<% } %>

<% if (currentSeason === 21 && currentCycle === 10 &&  (currentWorld === '回廊' || currentWorld === '副本')) { %>
<%- await getwi('事件_终期试炼_顶上战争') %>
<% } %>

<% if (currentWorld === '回廊' && (currentCycle === 3 || currentCycle === 6 || currentCycle === 9)) { %>
<%- await getwi('事件_瓦罐商人') %>
<% } %>

<% if (currentWorld === '副本' && currentSeason === 21 && currentCycle === 8) { %>
<%- await getwi('事件_主神乱入') %>
<% } %>

// 第四组：现实世界的宏大背景（这些处于不同阶段，互相排斥，所以用 else if 连起来是对的）
<% if (currentWorld === '现实') { %>
  <% if (currentSeason === 21 && currentCycle === 6) { %>
<%- await getwi('事件_三战摩擦') %>
  <% } else if (currentSeason === 21 && currentRank === '二阶' && currentCycle >= 7 && currentCycle <= 10) { %>
<%- await getwi('事件_三战冷战') %>
  <% } else if (currentRank === '三阶') { %>
<%- await getwi('事件_三战小规模热战') %>
  <% } else if (currentRank === '四阶') { %>
<%- await getwi('事件_三战全面战争') %>
  <% } else if (currentRank === '五阶' || currentRank === '超脱者') { %>
<%- await getwi('事件_终局无限地球危机') %>
  <% } %>
<% } %>
```
