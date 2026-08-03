import { type ForumThread, type ForumPost, INITIAL_THREADS, RANK_BOARDS, type CareerPlan, CAREER_SYSTEM_RULES, WORLD_SUMMARY } from './data'

const SK = 'wxhl003_settings'

export interface ApiConfig {
  url: string; apiKey: string; model: string; timeout: number; maxRetries: number
}

export interface Settings {
  apiMode: 'single' | 'multi'
  primary: ApiConfig; secondary: ApiConfig
  selectedWorldbooks: string[]
  wallpaper: string
}

function defApi(): ApiConfig { return { url:'', apiKey:'', model:'', timeout:30000, maxRetries:3 } }

function load(): Settings {
  try {
    const r = localStorage.getItem(SK)
    if (r) {
      const p = JSON.parse(r)
      return {
        apiMode: p.apiMode||'single',
        primary: { ...defApi(), ...p.primary },
        secondary: { ...defApi(), ...p.secondary },
        selectedWorldbooks: p.selectedWorldbooks||[],
        wallpaper: p.wallpaper||'',
      }
    }
  } catch (_) {}
  return { apiMode:'single', primary:defApi(), secondary:defApi(), selectedWorldbooks:[], wallpaper:'' }
}

function save(s: Settings) { try { localStorage.setItem(SK, JSON.stringify(s)) } catch (_) {} }

function getActiveCfg(s: Settings): ApiConfig {
  return (s.apiMode==='multi' && s.secondary.url) ? s.secondary : s.primary
}

// ================================================================
// JSON Schema 定义
// ================================================================
const THREAD_LIST_SCHEMA = {
  name: 'forum_threads', value: {
    type:'object', properties:{ threads:{ type:'array', items:{ type:'object', properties:{
      title:{type:'string'},preview:{type:'string'},author:{type:'string'},
      hotComment:{type:'string'},hotAuthor:{type:'string'},hotLikes:{type:'number'}
    }, required:['title','preview','author','hotComment','hotAuthor','hotLikes'] } } },
    required:['threads']
  }
}

const THREAD_DETAIL_SCHEMA = {
  name: 'thread_detail', value: {
    type:'object', properties:{
      fullContent:{type:'string'},
      comments:{ type:'array', items:{ type:'object', properties:{
        author:{type:'string'},content:{type:'string'},
        replies:{ type:'array', items:{ type:'object', properties:{author:{type:'string'},content:{type:'string'}}, required:['author','content'] } }
      }, required:['author','content'] } }
    }, required:['fullContent','comments']
  }
}

const REPLY_LIST_SCHEMA = {
  name: 'thread_replies', value: {
    type:'object', properties:{ replies:{ type:'array', items:{ type:'object', properties:{author:{type:'string'},content:{type:'string'}}, required:['author','content'] } } },
    required:['replies']
  }
}

// ================================================================
// JSON 提取：支持直接、markdown 代码块、裸 JSON
// ================================================================
function extractJSON(text: string): any {
  try { return JSON.parse(text.trim()) } catch (_) {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) { try { return JSON.parse(fence[1].trim()) } catch (_) {} }
  const first = text.search(/[\{\[]/)
  if (first >= 0) {
    const chars = [...text.slice(first)]; let d=0, inS=false, esc=false, end=-1
    for (let i=0;i<chars.length;i++) {
      const ch=chars[i]
      if(esc){esc=false;continue}
      if(ch==='\\'){esc=true;continue}
      if(ch==='"'){inS=!inS;continue}
      if(inS)continue
      if(ch==='{'||ch==='[')d++; else if(ch==='}'||ch===']'){d--;if(d===0){end=i;break}}
    }
    if(end>0){ try { return JSON.parse(text.slice(first,first+end+1)) } catch (_) {} }
  }
  throw new Error('AI 回复中未找到有效 JSON，原始回复: ' + text.slice(0, 300))
}

// ================================================================
// AI 生成（内置 JSON 验证 + 格式重试）
// ================================================================
async function aiGenerate(cfg: ApiConfig, userInput: string, jsonSchema?: {name:string,value:Record<string,any>}): Promise<string> {
  if (!cfg.url || !cfg.apiKey) throw new Error('API 未配置')
  if (typeof generateRaw !== 'function') throw new Error('generateRaw 不可用')

  // 如果要求JSON，prompt前缀加死命令
  let prompt = userInput
  if (jsonSchema) {
    prompt = `【死命令】你只能返回一个合法的 JSON，不能包含任何 markdown、标题、解释性文字。直接输出 JSON。\n\n${userInput}`
  }

  let lastErr = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.info('[wxhl003] 第'+(attempt+1)+'次调用 model:', cfg.model)
      const config: any = {
        user_input: prompt,
        custom_api: { apiurl: cfg.url, key: cfg.apiKey, model: cfg.model },
        ordered_prompts: ['user_input'],
        should_silence: true,
        max_chat_history: 0,
      }
      if (jsonSchema) config.json_schema = { name: jsonSchema.name, strict: true, value: jsonSchema.value }

      const result = await generateRaw(config)
      const text = typeof result === 'string' ? result : (result as any).content || ''
      console.info('[wxhl003] 返回长度:', text.length)

      // 无JSON要求，直接返回
      if (!jsonSchema) return text

      // 有JSON要求：验证格式
      try {
        extractJSON(text)
        return text
      } catch (_) {
        console.warn('[wxhl003] JSON格式错误，重试...')
        if (attempt < 2) {
          // 越来越严厉的指令
          const warnings = [
            '【第一次警告】上次返回不是合法JSON。这次必须只输出JSON，不要任何其他内容。',
            '【最后一次警告】绝对只输出 {} 或 [] 包裹的 JSON。不要 markdown。不要解释。不要标题。只要 JSON。',
          ]
          prompt = warnings[attempt] + '\n\n' + userInput
          await new Promise(r => setTimeout(r, 1500))
          continue
        }
        throw new Error('AI 连续3次返回了非 JSON 格式。可能此 API 不支持 json_schema。原始回复: ' + text.slice(0, 300))
      }
    } catch (e: any) {
      lastErr = e.message || String(e)
      if (attempt < 2 && !jsonSchema) { await new Promise(r => setTimeout(r, 2000)); continue }
    }
  }
  throw new Error(lastErr || '生成失败')
}

// ================================================================
// PINIA STORE
// ================================================================
export const useForumStore = defineStore('forum', () => {
  const settings = reactive<Settings>(load())
  watchEffect(() => save({ ...settings }))

  const activeSection = ref('complaints')
  const threads = ref<ForumThread[]>([...INITIAL_THREADS])
  const rankIndex = ref(0)
  const playerRank = ref<{rank:number,name:string,lv:string,team:string}|null>(null)
  const rankRefreshing = ref(false)
  const refreshing = ref(false)
  const generating = ref(false)
  const replying = ref(false)
  const lastError = ref('')
  const testing = ref(false)
  const testResult = ref('')
  const models = ref<string[]>([])
  const loadingModels = ref(false)
  const allWorldbookNames = ref<string[]>([])
  const worldbookLoaded = ref(false)

  // ---- Models & Test ----
  async function fetchModels(cfg: ApiConfig) {
    if (!cfg.url || !cfg.apiKey) { testResult.value = '请先填写 API URL 和 Key'; return }
    if (typeof getModelList !== 'function') { testResult.value = 'getModelList 不可用'; return }
    loadingModels.value = true
    try {
      const list = await getModelList({ apiurl: cfg.url, key: cfg.apiKey })
      models.value = list.length > 0 ? list : (cfg.model ? [cfg.model] : [])
      testResult.value = '成功获取 ' + models.value.length + ' 个模型'
    } catch (e: any) {
      if (cfg.model) models.value = [cfg.model]
      testResult.value = '(使用手动输入的模型名) ' + (e.message||e)
    } finally { loadingModels.value = false }
  }

  async function testConnection(cfg: ApiConfig) {
    if (!cfg.url || !cfg.apiKey) { testResult.value = '请先填写 API URL 和 Key'; return }
    testing.value = true; testResult.value = ''
    try {
      const content = await aiGenerate(cfg, '请回复"连接成功"这四个字，不要任何其他内容。')
      testResult.value = '连接成功 -> "' + content.slice(0, 80) + '"'
    } catch (e: any) { testResult.value = '失败: ' + (e.message||e) }
    finally { testing.value = false }
  }

  // ---- World book ----
  function loadWorldbookList() {
    try { allWorldbookNames.value = getWorldbookNames?.() ?? []; worldbookLoaded.value = true }
    catch (_) { allWorldbookNames.value = [] }
  }

  async function getWorldbookContent(): Promise<string> {
    const sel = settings.selectedWorldbooks
    if (sel.length === 0) return ''
    const parts: string[] = []
    for (const name of sel) {
      try {
        const entries = await getWorldbook(name)
        if (entries && entries.length > 0) {
          const text = entries.filter(e => e.enabled !== false).map(e => e.content).filter(Boolean).join('\n\n')
          if (text) parts.push('【' + name + '】\n' + text)
        }
      } catch (_) {}
    }
    return parts.join('\n\n')
  }

  // ---- Section refresh ----
  const secNames: Record<string,string> = {
    complaints:'契约者吐槽区', intel:'势力情报分享区', dungeon:'副本经历分享区', build:'构筑分享区', trade:'装备道具交易区',
  }

  const MODULE_SUMMARY = WORLD_SUMMARY

  function buildRefreshPrompt(sectionKey: string, worldbookText: string): string {
    const worldCtx = worldbookText || ''

    const prompts: Record<string, string> = {
      complaints: '你是无限回廊论坛「契约者吐槽区」的活跃用户。以不同契约者口吻生成8条吐槽帖。\n必须遵守：每条帖子涉及不同的主模块或副模块，8条覆盖至少6个不同模块。吐槽要有具体场景：被投进【赛博朋克】+【绝症倒计时】差点嗑药嗑死、在【洪荒神话】+【全员禁魔】被凡人追着砍。也可吐槽势力、CR系统、队友。语气真实接地气，像论坛骂街，严禁重复。作者昵称要有创意。\n\n输出格式说明：返回一个JSON对象，包含threads数组，每个元素有title/preview/author/hotComment/hotAuthor/hotLikes字段。\n\n世界观参考：' + worldCtx + '\n' + WORLD_SUMMARY,

      intel: '你是无限回廊论坛「势力情报分享区」的资深分析员。以不同契约者口吻生成8条情报帖。\n必须遵守：每条分析不同的势力动态、模块策略或系统机制。情报要有具体数据。可分析特定模块组合的最优策略。语气理性客观，热评要有质疑或补充。\n\n输出格式说明：返回一个JSON对象，包含threads数组，每个元素有title/preview/author/hotComment/hotAuthor/hotLikes字段。\n\n世界观参考：' + worldCtx + '\n' + WORLD_SUMMARY,

      dungeon: '你是无限回廊论坛「副本经历分享区」的闯关者。以不同契约者口吻生成8条副本经历帖。\n必须遵守：每条帖子=一个具体副本经历，8条覆盖至少6个不同主模块。必须包含：副本来源(具体作品名)、主模块类型、副模块、副本类型、具体战斗/解谜过程、奖励收获。经历要有戏剧性。严禁重复相同副本来源。语气像亲身经历。\n\n输出格式说明：返回一个JSON对象，包含threads数组，每个元素有title/preview/author/hotComment/hotAuthor/hotLikes字段。\n\n世界观参考：' + worldCtx + '\n' + WORLD_SUMMARY,

      build: '你是无限回廊论坛「构筑分享区」的配装研究者。以不同契约者口吻生成8条构筑帖。\n必须遵守：每条讨论针对特定模块类型的构筑方案。必须包含属性分配/推荐职业/核心装备/适合模块类型/实战测试数据。覆盖不同流派。数据要具体，流派间要有争论，热评要有反驳。\n\n输出格式说明：返回一个JSON对象，包含threads数组，每个元素有title/preview/author/hotComment/hotAuthor/hotLikes字段。\n\n世界观参考：' + worldCtx + '\n' + WORLD_SUMMARY,

      trade: '你是无限回廊论坛「装备道具交易区」的买卖双方。以不同契约者口吻生成8条交易帖。\n必须遵守：一半出售一半求购。物品要具体且来源明确。必须包含物品名称+品质+属性加成+来源副本+价格(UP币)。评论要有砍价竞价。语气真实。\n\n输出格式说明：返回一个JSON对象，包含threads数组，每个元素有title/preview/author/hotComment/hotAuthor/hotLikes字段。\n\n世界观参考：' + worldCtx + '\n' + WORLD_SUMMARY,
    }
    return prompts[sectionKey] || ''
  }

  async function refreshSection(sectionKey: string) {
    const cfg = getActiveCfg(settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value='请先在设置中配置API'; return }
    refreshing.value = true; lastError.value = ''
    try {
      const wb = await getWorldbookContent()
      const prompt = buildRefreshPrompt(sectionKey, wb)
      const raw = await aiGenerate(cfg, prompt, THREAD_LIST_SCHEMA)
      const data = extractJSON(raw)
      const posts: any[] = Array.isArray(data) ? data : (data.threads || [])
      if (posts.length===0) throw new Error('生成的帖子为空')
      threads.value = threads.value.filter(t=>t.section!==sectionKey)
      const maxId = Math.max(...threads.value.map(t=>t.id), 0)
      threads.value.push(...posts.map((p,i)=>({
        id:maxId+i+1, section:sectionKey,
        title:p.title||'无标题', preview:p.preview||'', author:p.author||'匿名',
        replies:Math.floor(Math.random()*80)+10, time:'刚刚',
        hotComment:p.hotComment||'', hotAuthor:p.hotAuthor||'匿名', hotLikes:p.hotLikes||0,
      })))
    } catch(e:any) { lastError.value = e.message||'刷新失败' }
    finally { refreshing.value = false }
  }

  async function generateThreadDetail(thread: ForumThread) {
    const cfg = getActiveCfg(settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value='请先在设置中配置API'; return }
    generating.value = true; lastError.value = ''
    try {
      const wb = await getWorldbookContent()
      const raw = await aiGenerate(cfg, '无限回廊论坛「'+(secNames[thread.section]||'论坛')+'」帖子：标题：'+thread.title+' 预览：'+thread.preview+' 发帖人：'+thread.author+' 已有'+thread.replies+'条回复。请生成完整帖子和评论。要求：fullContent详细300-600字、comments生成4-6条、每条最多1-2条子回复、昵称内容符合世界观'+(wb?'\n世界观：\n'+wb:''), THREAD_DETAIL_SCHEMA)
      const data = extractJSON(raw)
      const posts: ForumPost[] = []
      let floor = 1
      const now = Date.now()
      const ts = (off=0) => { const d=new Date(now-off*60000); return (d.getMonth()+1)+'月'+d.getDate()+'日 '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') }
      posts.push({ id:now, floor:floor++, author:thread.author, time:ts(0), content:data.fullContent||thread.preview, depth:0 })
      for (const c of (data.comments||[])) {
        posts.push({ id:now+floor, floor:floor++, author:c.author||'匿名', time:ts(3*floor), content:c.content||'', depth:1 })
        for (const r of (c.replies||[])) {
          posts.push({ id:now+floor, floor:floor++, author:r.author||'匿名', time:ts(3*floor), content:r.content||'', depth:2 })
        }
      }
      thread.posts = posts; thread.replies = posts.length - 1
    } catch(e:any) { lastError.value = e.message||'生成失败' }
    finally { generating.value = false }
  }

  async function generateReplies(thread: ForumThread) {
    const cfg = getActiveCfg(settings)
    if (!cfg.url || !cfg.apiKey || !thread.posts || thread.posts.length===0) return
    replying.value = true; lastError.value = ''
    try {
      const context = thread.posts.map(p => '[#'+p.floor+' '+p.author+(p.depth&&p.depth>0?'(回复)':'(楼主)')+']: '+p.content.slice(0,300)).join('\n')
      const wb = await getWorldbookContent()
      const raw = await aiGenerate(cfg, '无限回廊帖子「'+thread.title+'」当前讨论：\n'+context+'\n\n有契约者刚发表了新回复（上面最后一条）。请以帖子里已出现的其他契约者身份（不要扮演楼主和刚回复的那位），生成2-3条回应。只使用上面讨论中已出现的昵称、语气符合角色'+(wb?'\n世界观：\n'+wb:''), REPLY_LIST_SCHEMA)
      const data = extractJSON(raw)
      const replies: any[] = Array.isArray(data) ? data : (data.replies || [])
      const now = Date.now()
      const ts = (off=0) => { const d=new Date(now-off*60000); return (d.getMonth()+1)+'月'+d.getDate()+'日 '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') }
      let floor = thread.posts.length + 1
      for (const r of replies) {
        thread.posts!.push({ id:now+floor, floor:floor++, author:r.author||'匿名', time:ts(2*floor), content:r.content||'', depth:1 })
      }
      thread.replies = thread.posts.length - 1
    } catch(_) {}
    finally { replying.value = false }
  }

  // ---- 排行榜刷新 ----
  function refreshRankings() {
    rankRefreshing.value = true
    try {
      let vars: any = {}
      try { const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1; if (mid && mid !== -1) vars = getVariables?.({ type:'message', message_id:mid }) ?? {} } catch (_) {}
      if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type:'message', message_id:-1 }) ?? {} } catch (_) {} }
      if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type:'chat' }) ?? {} } catch (_) {} }
      let pd: any = vars?.stat_data?.契约者
      if (!pd && vars?.stat_data) { for (const k of Object.keys(vars.stat_data)) { const v=vars.stat_data[k]; if(v&&typeof v==='object'&&(v.头部||v.姓名||v.等级)){pd=v;break} } }
      if (!pd) { playerRank.value=null; lastError.value='未找到角色数据'; return }
      const name = pd?.头部?.姓名 || pd?.姓名 || ''
      const lv = Number(pd?.头部?.等级 || pd?.等级 || 0)
      const team = pd?.头部?.所属势力 || pd?.所属势力 || pd?.势力 || '独立散人'
      if (!name||lv<=0) { playerRank.value=null; lastError.value='未找到角色名或等级'; return }
      let tier=0; if(lv<=20)tier=0;else if(lv<=40)tier=1;else if(lv<=60)tier=2;else if(lv<=80)tier=3;else tier=4
      const board = RANK_BOARDS[tier]; let insertRank=board.items.length
      for(let i=0;i<board.items.length;i++){if(lv>=Number(board.items[i].lv)){insertRank=i;break}}
      if(insertRank<10){playerRank.value={rank:insertRank+1,name:'「'+name+'」',lv:String(lv),team};rankIndex.value=tier;lastError.value=''}
      else{playerRank.value=null;lastError.value='当前等级 Lv'+lv+' 未进入'+board.key+'前十'}
    }catch(e:any){playerRank.value=null}
    finally{rankRefreshing.value=false}
  }

  function init() { loadWorldbookList() }

  return {
    settings, activeSection, threads, rankIndex, playerRank, rankRefreshing,
    refreshing, generating, replying, lastError,
    testing, testResult, models, loadingModels, allWorldbookNames, worldbookLoaded,
    init, loadWorldbookList, fetchModels, testConnection,
    refreshSection, refreshRankings, generateThreadDetail, generateReplies, getWorldbookContent,
  }
})

// ================================================================
// 职业规划 Store
// ================================================================

const CP_SK = 'wxhl003_career_plans'

function loadCareerPlans(): CareerPlan[] {
  try {
    const r = localStorage.getItem(CP_SK)
    if (r) return JSON.parse(r)
  } catch (_) {}
  return []
}

function saveCareerPlans(plans: CareerPlan[]) {
  try { localStorage.setItem(CP_SK, JSON.stringify(plans)) } catch (_) {}
}

// ============ JSON Schema: 第一轮 ============
const CAREER_V1_SCHEMA = {
  name: 'career_plan_v1',
  value: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      rarity: { type: 'string' },
      coreConcept: { type: 'string' },
      mainJob: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          rarity: { type: 'string' },
          acquisition: { type: 'string' },
          classTree: { type: 'string' },
          attributeTendency: { type: 'string' },
        },
        required: ['name', 'rarity', 'acquisition', 'classTree', 'attributeTendency'],
      },
      subJob: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          rarity: { type: 'string' },
          world: { type: 'string' },
          acquisition: { type: 'string' },
          classTree: { type: 'string' },
          attributeTendency: { type: 'string' },
        },
        required: ['name', 'rarity', 'world', 'acquisition', 'classTree', 'attributeTendency'],
      },
      affinity: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          reasons: { type: 'string' },
        },
        required: ['result', 'reasons'],
      },
      evolution: {
        type: 'object',
        properties: {
          firstClass: { type: 'string' },
          secondClass: { type: 'string' },
          thirdClass: { type: 'string' },
        },
        required: ['firstClass', 'secondClass', 'thirdClass'],
      },
    },
    required: ['name', 'rarity', 'coreConcept', 'mainJob', 'subJob', 'affinity', 'evolution'],
  },
}

// ============ JSON Schema: 第二轮 ============
const CAREER_V2_SCHEMA = {
  name: 'career_plan_v2',
  value: {
    type: 'object',
    properties: {
      mainSkillTree: { type: 'string' },
      subSkillTree: { type: 'string' },
      mainPassives: { type: 'string' },
      subPassives: { type: 'string' },
      combinedAttributes: { type: 'string' },
      equipmentFit: { type: 'string' },
      stepGuide: { type: 'array', items: { type: 'string' } },
      risks: { type: 'string' },
    },
    required: ['mainSkillTree', 'subSkillTree', 'mainPassives', 'subPassives', 'combinedAttributes', 'equipmentFit', 'stepGuide', 'risks'],
  },
}

// ============ 生成 Prompt 构建 ============
function buildCareerV1Prompt(keywords: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : ''
  return `你是无限回廊的职业规划AI。请根据以下规则，为契约者设计一个融合职业方案。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【世界观模块摘要】
${WORLD_SUMMARY}

【契约者的想法】
${keywords}

【任务要求】
请根据契约者输入的关键词或混乱想法，理解其意图并梳理出清晰的方向，然后设计一个融合职业方案。方案必须包含以下所有字段：

1. **name**: 融合职业名称（如"写轮眼刺客"、"恶魔猎手·炎拳"、"风遁剑圣"等），要体现主副职业融合的特色
2. **rarity**: 主职业稀有度（白色/蓝色/金色/紫色/银色），并提供稀有度判定理由
3. **coreConcept**: 一句话核心定位，概括这个融合职业的战斗风格和核心特色
4. **mainJob**: 回廊原生主职业
   - name: 职业名称
   - rarity: 稀有度
   - acquisition: 获取方式和大致花费UP
   - classTree: 完整转职路线（从基础到三转的每个分支名称和核心能力）
   - attributeTendency: 属性倾向（如"主STR副CON"）
5. **subJob**: 副本副职业
   - name: 职业名称
   - rarity: 稀有度，并给出稀有度判定依据
   - world: 来自哪个副本世界（具体作品名）
   - acquisition: 在该世界中如何获取（具体步骤和条件）
   - classTree: 转职路线（最高到二转）
   - attributeTendency: 属性倾向
6. **affinity**: 相性分析
   - result: 判定结果（必须是"高相性"）
   - reasons: 详细判定理由（属性重叠度、战斗方式契合度、主题逻辑）
7. **evolution**: 进化路线图
   - firstClass: 一转的名称、达成条件、核心变化
   - secondClass: 二转的名称、达成条件、核心变化
   - thirdClass: 三转的名称、达成条件、核心变化（副职业二转后停止进化）`
}

function buildCareerV2Prompt(plan: CareerPlan, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : ''
  return `你是无限回廊的职业规划AI。你已经为契约者设计了一个融合职业方案的框架，现在需要补充方案的具体细节。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【已确认的职业方案框架】
- 融合职业名称: ${plan.name}
- 稀有度: ${plan.rarity}
- 核心定位: ${plan.coreConcept}
- 主职业: ${plan.mainJob.name}（${plan.mainJob.rarity}）— 属性倾向: ${plan.mainJob.attributeTendency}
- 主职业转职: ${plan.mainJob.classTree}
- 副职业: ${plan.subJob.name}（${plan.subJob.rarity}）— 来自《${plan.subJob.world}》— 属性倾向: ${plan.subJob.attributeTendency}
- 副职业转职: ${plan.subJob.classTree}
- 相性: ${plan.affinity.result} — ${plan.affinity.reasons}
- 一转: ${plan.evolution.firstClass}
- 二转: ${plan.evolution.secondClass}
- 三转: ${plan.evolution.thirdClass}

【任务要求】
请在以上框架的基础上，生成以下具体细节（每个字段都要详细填充）：

1. **mainSkillTree**: 主职业技能树。从Lv.1到Lv.9，奇数级各解锁什么技能，技能名称+简要效果。稀有度越高技能越丰富。
2. **subSkillTree**: 副职业保留的3个核心技能。技能名称+效果，说明为何选中这3个作为核心。随副职业转职，这3个技能如何升级进化。
3. **mainPassives**: 主职业偶数级（Lv.2/4/6/8/10）获得的被动特性，每个特性的名称和效果。
4. **subPassives**: 副职业偶数级获得的被动特性。
5. **combinedAttributes**: 融合后属性加成合计值。主职业完整+副职业减半（向下取整）。按Lv.1~3/4~6/7~9/10四个阶段展示主副属性数值变化。
6. **equipmentFit**: 装备适性建议。适合哪些类型的装备，可能触发隐藏词条的装备类型。
7. **stepGuide**: 分步获取指南。从零开始的完整步骤，每一步具体要做什么：
   - Step 1: 在回廊做什么准备
   - Step 2: 获取主职业书
   - Step 3: 进入副本世界获取副本职业
   - Step 4: 进行融合
   - 后续步骤: 练级转职的方向建议
8. **risks**: 风险提示。必须包含：融合终身仅一次不可逆、PEXP升级阈值翻倍、转职考核难度翻倍，以及该具体方案的特殊风险。`
}

// ================================================================
// PINIA STORE: useCareerStore
// ================================================================
export const useCareerStore = defineStore('career', () => {
  const plans = ref<CareerPlan[]>(loadCareerPlans())
  const generatingV1 = ref(false)
  const generatingV2 = ref(false)
  const lastError = ref('')

  // 自动同步 localStorage
  watchEffect(() => saveCareerPlans(plans.value))

  // 引用论坛 store 的 getWorldbookContent（复用世界书选择）
  function getForumStore() {
    // useForumStore 在同一文件中定义，可直接调用
    return useForumStore()
  }

  /** 第一轮生成：框架 */
  async function createPlan(keywords: string) {
    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generatingV1.value = true
    lastError.value = ''
    try {
      const wb = await forumStore.getWorldbookContent()
      const prompt = buildCareerV1Prompt(keywords, wb)
      const raw = await aiGenerate(cfg, prompt, CAREER_V1_SCHEMA)
      const data = extractJSON(raw)

      const now = new Date()
      const ts = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0')

      const maxId = plans.value.reduce((m, p) => Math.max(m, p.id), 0)
      const plan: CareerPlan = {
        id: maxId + 1,
        createdAt: ts,
        keywords,
        phase: 'v1',
        name: data.name || '未命名',
        rarity: data.rarity || '白色',
        coreConcept: data.coreConcept || '',
        mainJob: data.mainJob || { name: '', rarity: '', acquisition: '', classTree: '', attributeTendency: '' },
        subJob: data.subJob || { name: '', rarity: '', world: '', acquisition: '', classTree: '', attributeTendency: '' },
        affinity: data.affinity || { result: '', reasons: '' },
        evolution: data.evolution || { firstClass: '', secondClass: '', thirdClass: '' },
      }
      plans.value.unshift(plan)
    } catch (e: any) {
      lastError.value = e.message || '生成失败'
    } finally {
      generatingV1.value = false
    }
  }

  /** 第二轮生成：细节 */
  async function confirmPlan(id: number) {
    const idx = plans.value.findIndex(p => p.id === id)
    if (idx < 0) return

    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generatingV2.value = true
    lastError.value = ''
    try {
      const plan = plans.value[idx]
      const wb = await forumStore.getWorldbookContent()
      const prompt = buildCareerV2Prompt(plan, wb)
      const raw = await aiGenerate(cfg, prompt, CAREER_V2_SCHEMA)
      const data = extractJSON(raw)

      plans.value[idx] = {
        ...plan,
        phase: 'complete',
        mainSkillTree: data.mainSkillTree || '',
        subSkillTree: data.subSkillTree || '',
        mainPassives: data.mainPassives || '',
        subPassives: data.subPassives || '',
        combinedAttributes: data.combinedAttributes || '',
        equipmentFit: data.equipmentFit || '',
        stepGuide: Array.isArray(data.stepGuide) ? data.stepGuide : [],
        risks: data.risks || '',
      }
    } catch (e: any) {
      lastError.value = e.message || '生成细节失败'
    } finally {
      generatingV2.value = false
    }
  }

  /** 删除方案 */
  function deletePlan(id: number) {
    plans.value = plans.value.filter(p => p.id !== id)
  }

  return {
    plans, generatingV1, generatingV2, lastError,
    createPlan, confirmPlan, deletePlan,
  }
})
