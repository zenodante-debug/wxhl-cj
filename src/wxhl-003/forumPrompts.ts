import {
  BUILD_MECHANICS,
  CAREER_SYSTEM_RULES,
  CORE_WORLD,
  DUNGEON_GENERATION_RULES,
  FORUM_SECTION_PROMPTS,
  MODULE_TABLES,
  PERSONA_MATRIX,
  TIEBA_STYLE,
  TRADE_MECHANICS,
} from './data';

// ================================================================
// 论坛提示词组装（纯函数, 零酒馆依赖, 便于单测）
// 分层: 分区专属体裁(FORUM_SECTION_PROMPTS) + 共用贴吧风格(TIEBA_STYLE)
//       + 共用人格要求(PERSONA_MATRIX) + 该分区的专属参考 + 上下文
// ================================================================

export type ForumSectionKey = 'complaints' | 'intel' | 'dungeon' | 'build' | 'trade';

/** JSON 输出格式说明（全分区一致） */
const OUTPUT_FORMAT =
  '【输出格式】返回一个 JSON 对象, 包含 threads 数组, 每个元素有 ' +
  'title / preview / author / hotComment / hotAuthor / hotLikes 字段。' +
  'title 是帖子标题, preview 是正文开头两三百字, author 是楼主昵称, ' +
  'hotComment 是最热评论, hotAuthor 是热评作者昵称, hotLikes 是热评点赞数(数字)。' +
  '不要输出 markdown 代码块, 不要任何解释文字。';

/** 按分区挑出该分区该读的参考 */
function referencesFor(sectionKey: ForumSectionKey): string {
  switch (sectionKey) {
    case 'complaints':
      return [CORE_WORLD, MODULE_TABLES].join('\n\n');
    case 'intel':
      return CORE_WORLD;
    case 'dungeon':
      return [CORE_WORLD, MODULE_TABLES, DUNGEON_GENERATION_RULES].join('\n\n');
    case 'build':
      return [CORE_WORLD, CAREER_SYSTEM_RULES, BUILD_MECHANICS].join('\n\n');
    case 'trade':
      return [CORE_WORLD, TRADE_MECHANICS].join('\n\n');
  }
}

/** 分区刷新：生成 8 条分区帖子 */
export function buildRefreshPrompt(
  sectionKey: ForumSectionKey,
  worldbookText: string,
  influenceContext: string,
): string {
  const 体裁 = FORUM_SECTION_PROMPTS[sectionKey] ?? '';
  const 世界书 = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  const 影响 = influenceContext ? '\n' + influenceContext : '';
  return `${体裁}

${PERSONA_MATRIX}

${TIEBA_STYLE}

${OUTPUT_FORMAT}
要求生成 8 条帖子。

【参考设定】
${referencesFor(sectionKey)}
${世界书}${影响}`;
}

/** 帖子详情：把预览扩写成完整帖 + 4~6 条评论 */
export function buildThreadDetailPrompt(
  sectionKey: ForumSectionKey,
  thread: { title: string; preview: string; author: string; replies: number },
  worldbookText: string,
): string {
  const 世界书 = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `你在补全无限回廊论坛「${sectionKey}」分区的一个帖子。

【帖子信息】
标题: ${thread.title}
预览: ${thread.preview}
楼主昵称: ${thread.author}
已有回复数: ${thread.replies}

【体裁要求 —— 必须与所在分区一致】
${FORUM_SECTION_PROMPTS[sectionKey] ?? ''}

【人格要求】
楼主的人格必须与昵称「${thread.author}」给人的印象一致, 全帖保持同一人格与语气, 不要中途变形。

${TIEBA_STYLE}

【任务要求】
1. fullContent: 帖子的完整正文（300~600 字）。要像真人发的帖, 不要工整分段、不要小标题。
2. comments: 4~6 条评论。每条 1~2 条子回复。评论者的昵称与人格要各不相同, 且要有人抬杠、有人玩梗、有人认真回复。评论内容要针对帖子本身, 不要泛泛而谈。
只返回 JSON: { "fullContent": "…", "comments": [ { "author": "…", "content": "…", "replies": [ { "author": "…", "content": "…" } ] } ] }
不要 markdown 代码块, 不要解释文字。${世界书}

【参考设定】
${referencesFor(sectionKey)}`;
}

/** 追加回复：以帖内已出现的其他契约者身份回帖 */
export function buildRepliesPrompt(
  sectionKey: ForumSectionKey,
  thread: { title: string },
  context: string,
  worldbookText: string,
): string {
  const 世界书 = worldbookText ? '\n【世界观参考】\n' + worldbookText : '';
  return `无限回廊论坛「${sectionKey}」分区的帖子「${thread.title}」当前讨论:

${context}

【任务要求】
有契约者刚发表了新回复（上面最后一条）。请以**帖子里已经出现过的其他契约者**的身份,
生成 2~3 条回应。要求:
- **不要扮演楼主**, 也不要扮演刚回复的那位。
- 只使用上面讨论中**已出现的昵称**, 并延续各自原有的人格与语气。
- 回应要针对上面的讨论内容, 可以有抬杠、补充、玩梗、站队。
只返回 JSON: { "replies": [ { "author": "…", "content": "…" } ] }
不要 markdown 代码块, 不要解释文字。${世界书}`;
}
