import { type ForumThread, type ForumPost, INITIAL_THREADS, RANK_BOARDS, type CareerPlan, type CareerRoadmap, type PlanType, type DungeonStrategy, type Faction, type DungeonMode, CAREER_SYSTEM_RULES, WORLD_SUMMARY } from './data'
import { WORKSHOP_WORLDBOOK_NAME, PvPSaveSchema, type WorkshopCard, type PvPSave } from './data'
import { extractContractSave, buildIntroPrompt, tierOf, generateDefaultAppearance, buildBattleIntroMessage } from './workshop'

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

// 玩家影响事件筛选
const INFLUENCE_SCHEMA = {
  name: 'player_influence', value: {
    type:'object', properties:{ events:{ type:'array', items:{ type:'object', properties:{
      event:{type:'string'},        // 事件一句话描述
      impact:{type:'string'},       // 影响力评估
      section:{type:'string'},      // 建议影响的论坛分区
      nickname:{type:'string'},     // 其他契约者对该玩家的称呼/称号
    }, required:['event','impact','section'] } } },
    required:['events']
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
  const influenceEvents = ref<{event:string,impact:string,section:string,nickname?:string}[]>([])
  const influenceAnalyzing = ref(false)
  const influenceError = ref('')

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

  // ---- 读取玩家变量 ----
  function readPlayerData(): string {
    try {
      let vars: any = {}
      try { const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1; if (mid && mid !== -1) vars = getVariables?.({ type:'message', message_id:mid }) ?? {} } catch (_) {}
      if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type:'message', message_id:-1 }) ?? {} } catch (_) {} }
      if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type:'chat' }) ?? {} } catch (_) {} }
      const character = vars?.stat_data?.契约者
      if (!character) return ''

      const parts: string[] = []
      const h = character?.头部
      if (h?.姓名) parts.push('契约者: ' + h.姓名)
      if (h?.等级) parts.push('等级: Lv.' + h.等级)
      if (h?.阶位) parts.push('阶位: ' + h.阶位)
      if (h?.所属势力) parts.push('势力: ' + h.所属势力)
      if (character?.职业?.名称) parts.push('职业: ' + character.职业.名称 + (character.职业.稀有度 ? '('+character.职业.稀有度+')' : ''))
      if (character?.属性) parts.push('属性: ' + JSON.stringify(character.属性))
      if (character?.称号) parts.push('称号: ' + JSON.stringify(character.称号))
      return parts.join('\n')
    } catch (_) { return '' }
  }

  // ---- 读取最近聊天记录 ----
  function readRecentChat(count = 20): string {
    try {
      if (typeof getChatMessages !== 'function') return ''
      const msgs = getChatMessages(-count)
      if (!msgs || msgs.length === 0) return ''
      const lines = msgs.map(m => {
        const role = m.role === 'user' ? '玩家' : (m.role === 'system' ? '系统' : m.name || 'AI')
        const text = (m.message || '').replace(/<[^>]*>/g, '').slice(0, 500)
        return '[' + role + ']: ' + text
      })
      return lines.join('\n')
    } catch (_) { return '' }
  }

  // ---- 提取玩家影响事件 ----
  async function extractInfluence() {
    const cfg = getActiveCfg(settings)
    if (!cfg.url || !cfg.apiKey) { influenceError.value = '请先在设置中配置API'; return }
    influenceAnalyzing.value = true; influenceError.value = ''
    try {
      const playerData = readPlayerData()
      const chat = readRecentChat(20)
      const wb = await getWorldbookContent()
      const prompt = `你是无限回廊论坛的情报分析师。契约者最近在回廊中经历了一些事件，你需要判断哪些事件值得在论坛上被其他契约者讨论。

【玩家当前状态】
${playerData || '（未检测到）'}

【最近剧情记录】
${chat || '（未检测到）'}

【世界观参考】
${wb || WORLD_SUMMARY}

【判断标准】
- 只提取"够格上论坛"的事件：重大战绩/惨败、影响势力格局、稀有掉落、隐藏任务突破、晋升阶位、获得稀有职业、出名或丢人的事迹等
- 排除日常琐事：买了个普通装备、吃了顿饭、普通对话、日常练级等鸡毛蒜皮的事
- 如果最近没有值得讨论的事件，返回空数组 events

【任务要求】
返回JSON，events数组，每个元素包含：
- event: 事件一句话描述（第三人称，站在其他契约者视角）
- impact: 影响力评估（大/中/小 + 一句话理由）
- section: 最适合讨论该事件的分区（complaints/intel/dungeon/build/trade 之一）
- nickname: 其他契约者可能因此给该玩家起的称呼或称号（可选）`
      const raw = await aiGenerate(cfg, prompt, INFLUENCE_SCHEMA)
      const data = extractJSON(raw)
      const events: any[] = Array.isArray(data) ? data : (data.events || [])
      influenceEvents.value = events.filter(e => e && e.event && e.section)
    } catch (e: any) { influenceError.value = e.message || '分析失败' }
    finally { influenceAnalyzing.value = false }
  }

  function clearInfluence() { influenceEvents.value = []; influenceError.value = '' }

  // ---- Section refresh ----
  const secNames: Record<string,string> = {
    complaints:'契约者吐槽区', intel:'势力情报分享区', dungeon:'副本经历分享区', build:'构筑分享区', trade:'装备道具交易区',
  }

  const MODULE_SUMMARY = WORLD_SUMMARY

  function buildRefreshPrompt(sectionKey: string, worldbookText: string): string {
    const worldCtx = worldbookText || ''
    // 玩家影响注入
    let influenceCtx = ''
    if (influenceEvents.value.length > 0) {
      const relevant = influenceEvents.value.filter(e => !e.section || e.section === sectionKey)
      if (relevant.length > 0) {
        influenceCtx = '\n【最近圈内大事】\n' + relevant.map(e => '- ' + e.event + (e.impact ? '（影响力：' + e.impact + '）' : '') + (e.nickname ? '——契约者被称作「' + e.nickname + '」' : '')).join('\n') + '\n请让生成的帖子自然地讨论这些事件，可以有部分帖子围绕这些大事展开。'
      }
    }

    const prompts: Record<string, string> = {
      complaints: '你是无限回廊论坛「契约者吐槽区」的活跃用户。以不同契约者口吻生成8条吐槽帖。\n必须遵守：每条帖子涉及不同的主模块或副模块，8条覆盖至少6个不同模块。吐槽要有具体场景：被投进【赛博朋克】+【绝症倒计时】差点嗑药嗑死、在【洪荒神话】+【全员禁魔】被凡人追着砍。也可吐槽势力、CR系统、队友。语气真实接地气，像论坛骂街，严禁重复。作者昵称要有创意。\n\n输出格式说明：返回一个JSON对象，包含threads数组，每个元素有title/preview/author/hotComment/hotAuthor/hotLikes字段。\n\n世界观参考：' + worldCtx + '\n' + WORLD_SUMMARY + influenceCtx,

      intel: '你是无限回廊论坛「势力情报分享区」的资深分析员。以不同契约者口吻生成8条情报帖。\n必须遵守：每条分析不同的势力动态、模块策略或系统机制。情报要有具体数据。可分析特定模块组合的最优策略。语气理性客观，热评要有质疑或补充。\n\n输出格式说明：返回一个JSON对象，包含threads数组，每个元素有title/preview/author/hotComment/hotAuthor/hotLikes字段。\n\n世界观参考：' + worldCtx + '\n' + WORLD_SUMMARY + influenceCtx,

      dungeon: '你是无限回廊论坛「副本经历分享区」的闯关者。以不同契约者口吻生成8条副本经历帖。\n必须遵守：每条帖子=一个具体副本经历，8条覆盖至少6个不同主模块。必须包含：副本来源(具体作品名)、主模块类型、副模块、副本类型、具体战斗/解谜过程、奖励收获。经历要有戏剧性。严禁重复相同副本来源。语气像亲身经历。\n\n输出格式说明：返回一个JSON对象，包含threads数组，每个元素有title/preview/author/hotComment/hotAuthor/hotLikes字段。\n\n世界观参考：' + worldCtx + '\n' + WORLD_SUMMARY + influenceCtx,

      build: '你是无限回廊论坛「构筑分享区」的配装研究者。以不同契约者口吻生成8条构筑帖。\n必须遵守：每条讨论针对特定模块类型的构筑方案。必须包含属性分配/推荐职业/核心装备/适合模块类型/实战测试数据。覆盖不同流派。数据要具体，流派间要有争论，热评要有反驳。\n\n输出格式说明：返回一个JSON对象，包含threads数组，每个元素有title/preview/author/hotComment/hotAuthor/hotLikes字段。\n\n世界观参考：' + worldCtx + '\n' + WORLD_SUMMARY + influenceCtx,

      trade: '你是无限回廊论坛「装备道具交易区」的买卖双方。以不同契约者口吻生成8条交易帖。\n必须遵守：一半出售一半求购。物品要具体且来源明确。必须包含物品名称+品质+属性加成+来源副本+价格(UP币)。评论要有砍价竞价。语气真实。\n\n输出格式说明：返回一个JSON对象，包含threads数组，每个元素有title/preview/author/hotComment/hotAuthor/hotLikes字段。\n\n世界观参考：' + worldCtx + '\n' + WORLD_SUMMARY + influenceCtx,
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

  // ---- 玩家发帖 ----
  function createThread(sectionKey: string, title: string, content: string) {
    const now = Date.now()
    const d = new Date(now)
    const time = d.getMonth()+1+'月'+d.getDate()+'日 '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')
    const thread: ForumThread = {
      id: now,
      section: sectionKey,
      title: title.trim(),
      preview: content.trim().slice(0, 80),
      author: '我',
      replies: 0,
      time,
      hotComment: '', hotAuthor: '', hotLikes: 0,
      posts: [{ id: now+1, floor: 1, author: '我', time, content: content.trim(), depth: 0 }],
    }
    // 插入到该分区列表顶部
    threads.value = [thread, ...threads.value]
    return thread
  }

  function init() { loadWorldbookList() }

  return {
    settings, activeSection, threads, rankIndex, playerRank, rankRefreshing,
    refreshing, generating, replying, lastError,
    testing, testResult, models, loadingModels, allWorldbookNames, worldbookLoaded,
    influenceEvents, influenceAnalyzing, influenceError,
    init, loadWorldbookList, fetchModels, testConnection,
    refreshSection, refreshRankings, generateThreadDetail, generateReplies, getWorldbookContent,
    extractInfluence, clearInfluence, createThread,
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

const RD_SK = 'wxhl003_career_roadmaps'

function loadRoadmaps(): CareerRoadmap[] {
  try {
    const r = localStorage.getItem(RD_SK)
    if (r) return JSON.parse(r)
  } catch (_) {}
  return []
}

function saveRoadmaps(roadmaps: CareerRoadmap[]) {
  try { localStorage.setItem(RD_SK, JSON.stringify(roadmaps)) } catch (_) {}
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
// 修改方案 Prompt
// ================================================================
function buildModifyPlanPrompt(plan: CareerPlan, feedback: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : ''
  return `你是无限回廊的职业规划AI。契约者对已生成的融合职业方案提出了修改意见，请根据意见重新生成方案框架。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【当前方案框架】
- 融合职业名称: ${plan.name}
- 稀有度: ${plan.rarity}
- 核心定位: ${plan.coreConcept}
- 主职业: ${plan.mainJob.name}（${plan.mainJob.rarity}）— ${plan.mainJob.attributeTendency}
- 副职业: ${plan.subJob.name}（${plan.subJob.rarity}）— 来自《${plan.subJob.world}》
- 主职业转职: ${plan.mainJob.classTree}
- 副职业转职: ${plan.subJob.classTree}
- 相性: ${plan.affinity.result} — ${plan.affinity.reasons}
- 一转: ${plan.evolution.firstClass}
- 二转: ${plan.evolution.secondClass}
- 三转: ${plan.evolution.thirdClass}

【修改意见】
${feedback}

【任务要求】
根据修改意见，重新设计方案框架。保留修改意见认可的部分，只改动需要调整的地方。必须返回完整的方案框架JSON（所有字段）。`
}

function buildModifyRoadmapPrompt(roadmap: CareerRoadmap, feedback: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : ''
  return `你是无限回廊的职业规划AI。契约者对已生成的生涯规划提出了修改意见，请根据意见重新生成规划框架。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【当前规划框架】
- 路线标题: ${roadmap.title}
- 当前状况: ${roadmap.currentState}
- 推荐方向: ${roadmap.recommendedDirection}
- 目标世界: ${roadmap.targetWorlds.join('、')}
- 融合建议: ${roadmap.fusionAdvice}
- 转职路线: ${roadmap.evolutionPath}

【修改意见】
${feedback}

【任务要求】
根据修改意见，重新生成生涯规划框架。保留修改意见认可的部分，只改动需要调整的地方。必须返回完整的规划框架JSON（所有字段）。`
}

// ================================================================
// 生涯规划 JSON Schemas & Prompts
// ================================================================
const ROADMAP_V1_SCHEMA = {
  name: 'career_roadmap_v1',
  value: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      currentState: { type: 'string' },
      recommendedDirection: { type: 'string' },
      targetWorlds: { type: 'array', items: { type: 'string' } },
      fusionAdvice: { type: 'string' },
      evolutionPath: { type: 'string' },
    },
    required: ['title', 'currentState', 'recommendedDirection', 'targetWorlds', 'fusionAdvice', 'evolutionPath'],
  },
}

const ROADMAP_V2_SCHEMA = {
  name: 'career_roadmap_v2',
  value: {
    type: 'object',
    properties: {
      stepPlan: { type: 'array', items: { type: 'string' } },
      skillAdvice: { type: 'string' },
      equipmentAdvice: { type: 'string' },
      risks: { type: 'string' },
    },
    required: ['stepPlan', 'skillAdvice', 'equipmentAdvice', 'risks'],
  },
}

function buildRoadmapV1Prompt(keywords: string, playerCareer: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : ''
  return `你是无限回廊的职业规划AI。契约者希望基于自己当前的职业状况，制定一份职业生涯规划。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【契约者当前职业状况】
${playerCareer || '（未检测到当前职业数据）'}

【契约者期望的发展方向】
${keywords}

【任务要求】
根据契约者当前职业状况和期望方向，生成职业生涯规划框架：

1. title: 路线标题，如"剑士→暗杀特化发展路线"
2. currentState: 分析当前职业的优势和不足
3. recommendedDirection: 推荐发展方向（具体说明理由）
4. targetWorlds: 建议进入的副本世界列表（至少2-3个），并简要说明每个世界的目标
5. fusionAdvice: 是否建议进行职业融合，如果建议则推荐具体的目标融合职业
6. evolutionPath: 推荐的转职路线（考虑主副职业的转职路径）`
}

function buildRoadmapV2Prompt(roadmap: CareerRoadmap, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : ''
  return `你是无限回廊的职业规划AI。你已为契约者制定了职业生涯规划框架，现在需要补充具体执行细节。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【已确认的规划框架】
- 路线标题: ${roadmap.title}
- 当前状况: ${roadmap.currentState}
- 推荐方向: ${roadmap.recommendedDirection}
- 目标世界: ${roadmap.targetWorlds.join('、')}
- 融合建议: ${roadmap.fusionAdvice}
- 转职路线: ${roadmap.evolutionPath}

【任务要求】
请在以上框架的基础上，生成以下具体细节：

1. stepPlan: 分步执行计划（每一步具体要做什么，从当前状态到达成目标）
2. skillAdvice: 技能构筑建议。生成3-5个具有联动效果的示例技能组合，每个技能说明其构筑定位和与其他技能的联动方式。格式示例：
\`\`\`
核心技能【暗影突刺】：瞬移至目标背后造成暴击 → 触发被动【暗杀者本能】：背刺后3秒内下次攻击必暴击 → 衔接【连环刺】：连续3次攻击每次递增20%伤害 → 收尾【消失】：击杀后进入潜行重置循环
\`\`\`
3. equipmentAdvice: 装备构筑建议。按部位给出关键词方向的装备建议，并说明组合成的构筑效果。格式示例：
\`\`\`
躯体 — 【潜行】【轻装】
头部 — 【夜视】【感知】
...
组合效果：潜行入场→背刺暴击→击杀刷新→消失→重复
\`\`\`
4. risks: 风险提示和执行注意事项`
}

// ================================================================
// 读取玩家职业数据
// ================================================================
function readPlayerCareer(): string {
  try {
    let vars: any = {}
    try {
      const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1
      if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {}
    } catch (_) {}
    if (!vars?.stat_data?.契约者) {
      try { vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {} } catch (_) {}
    }
    if (!vars?.stat_data?.契约者) {
      try { vars = getVariables?.({ type: 'chat' }) ?? {} } catch (_) {}
    }
    const character = vars?.stat_data?.契约者
    if (!character) return '（未找到角色数据）'

    const career = character?.职业
    if (!career) return '（角色当前未持有职业）'

    // 提取关键职业字段
    const parts: string[] = []
    if (career.名称) parts.push('职业名称: ' + career.名称)
    if (career.稀有度) parts.push('稀有度: ' + career.稀有度)
    if (career.转职阶段) parts.push('转职阶段: ' + career.转职阶段)
    if (career.职业等级) parts.push('职业等级: Lv.' + career.职业等级)
    if (career.主属性加成) parts.push('主属性加成: ' + JSON.stringify(career.主属性加成))
    if (career.副属性加成) parts.push('副属性加成: ' + JSON.stringify(career.副属性加成))
    if (career.职业技能 && Object.keys(career.职业技能).length > 0) parts.push('职业技能: ' + JSON.stringify(career.职业技能))
    if (career.职业特性 && Object.keys(career.职业特性).length > 0) parts.push('职业特性: ' + JSON.stringify(career.职业特性))
    if (career.传承技能 && Object.keys(career.传承技能).length > 0) parts.push('传承技能: ' + JSON.stringify(career.传承技能))
    if (career.转职树) parts.push('转职树: ' + JSON.stringify(career.转职树))

    // 同时也读取角色基础信息
    if (character?.头部) {
      const h = character.头部
      if (h.姓名) parts.push('契约者: ' + h.姓名)
      if (h.等级) parts.push('等级: Lv.' + h.等级)
      if (h.阶位) parts.push('阶位: ' + h.阶位)
      if (h.所属势力) parts.push('势力: ' + h.所属势力)
    }

    return parts.join('\n')
  } catch (_) {
    return '（读取职业数据时出错）'
  }
}

// ================================================================
// PINIA STORE: useCareerStore
// ================================================================
export const useCareerStore = defineStore('career', () => {
  const plans = ref<CareerPlan[]>(loadCareerPlans())
  const roadmaps = ref<CareerRoadmap[]>(loadRoadmaps())
  const activePlanType = ref<PlanType>('fusion')
  const generatingV1 = ref(false)
  const generatingV2 = ref(false)
  const lastError = ref('')

  // 自动同步 localStorage
  watchEffect(() => saveCareerPlans(plans.value))
  watchEffect(() => saveRoadmaps(roadmaps.value))

  function getForumStore() {
    return useForumStore()
  }

  // ============ 融合方案 ============

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

  /** 修改 V1 方案（根据反馈重新生成框架） */
  async function modifyPlan(id: number, feedback: string) {
    if (generatingV1.value) return
    const idx = plans.value.findIndex(p => p.id === id)
    if (idx < 0) return

    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generatingV1.value = true
    lastError.value = ''
    try {
      const plan = plans.value[idx]
      const wb = await forumStore.getWorldbookContent()
      const prompt = buildModifyPlanPrompt(plan, feedback, wb)
      const raw = await aiGenerate(cfg, prompt, CAREER_V1_SCHEMA)
      const data = extractJSON(raw)

      // 原地替换 V1 字段
      const latestIdx = plans.value.findIndex(p => p.id === id)
      if (latestIdx < 0) return
      plans.value[latestIdx] = {
        ...plans.value[latestIdx],
        name: data.name || plans.value[latestIdx].name,
        rarity: data.rarity || plans.value[latestIdx].rarity,
        coreConcept: data.coreConcept || plans.value[latestIdx].coreConcept,
        mainJob: data.mainJob || plans.value[latestIdx].mainJob,
        subJob: data.subJob || plans.value[latestIdx].subJob,
        affinity: data.affinity || plans.value[latestIdx].affinity,
        evolution: data.evolution || plans.value[latestIdx].evolution,
      }
    } catch (e: any) {
      lastError.value = e.message || '修改失败'
    } finally {
      generatingV1.value = false
    }
  }

  async function confirmPlan(id: number) {
    if (generatingV2.value) return
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

      const latestIdx = plans.value.findIndex(p => p.id === id)
      if (latestIdx < 0) return
      plans.value[latestIdx] = {
        ...plans.value[latestIdx],
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

  function deletePlan(id: number) {
    plans.value = plans.value.filter(p => p.id !== id)
  }

  // ============ 生涯规划 ============

  async function createRoadmap(keywords: string) {
    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    const career = readPlayerCareer()
    generatingV1.value = true
    lastError.value = ''
    try {
      const wb = await forumStore.getWorldbookContent()
      const prompt = buildRoadmapV1Prompt(keywords, career, wb)
      const raw = await aiGenerate(cfg, prompt, ROADMAP_V1_SCHEMA)
      const data = extractJSON(raw)

      const now = new Date()
      const ts = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0')

      const maxId = roadmaps.value.reduce((m, r) => Math.max(m, r.id), 0)
      const roadmap: CareerRoadmap = {
        id: maxId + 1,
        createdAt: ts,
        keywords,
        phase: 'v1',
        planType: 'roadmap',
        title: data.title || '未命名路线',
        currentState: data.currentState || '',
        recommendedDirection: data.recommendedDirection || '',
        targetWorlds: Array.isArray(data.targetWorlds) ? data.targetWorlds : [],
        fusionAdvice: data.fusionAdvice || '',
        evolutionPath: data.evolutionPath || '',
      }
      roadmaps.value.unshift(roadmap)
    } catch (e: any) {
      lastError.value = e.message || '生成失败'
    } finally {
      generatingV1.value = false
    }
  }

  async function confirmRoadmap(id: number) {
    if (generatingV2.value) return
    const idx = roadmaps.value.findIndex(r => r.id === id)
    if (idx < 0) return

    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generatingV2.value = true
    lastError.value = ''
    try {
      const roadmap = roadmaps.value[idx]
      const wb = await forumStore.getWorldbookContent()
      const prompt = buildRoadmapV2Prompt(roadmap, wb)
      const raw = await aiGenerate(cfg, prompt, ROADMAP_V2_SCHEMA)
      const data = extractJSON(raw)

      const latestIdx = roadmaps.value.findIndex(r => r.id === id)
      if (latestIdx < 0) return
      roadmaps.value[latestIdx] = {
        ...roadmaps.value[latestIdx],
        phase: 'complete',
        stepPlan: Array.isArray(data.stepPlan) ? data.stepPlan : [],
        skillAdvice: data.skillAdvice || '',
        equipmentAdvice: data.equipmentAdvice || '',
        risks: data.risks || '',
      }
    } catch (e: any) {
      lastError.value = e.message || '生成细节失败'
    } finally {
      generatingV2.value = false
    }
  }

  async function modifyRoadmap(id: number, feedback: string) {
    if (generatingV1.value) return
    const idx = roadmaps.value.findIndex(r => r.id === id)
    if (idx < 0) return

    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generatingV1.value = true
    lastError.value = ''
    try {
      const roadmap = roadmaps.value[idx]
      const wb = await forumStore.getWorldbookContent()
      const prompt = buildModifyRoadmapPrompt(roadmap, feedback, wb)
      const raw = await aiGenerate(cfg, prompt, ROADMAP_V1_SCHEMA)
      const data = extractJSON(raw)

      const latestIdx = roadmaps.value.findIndex(r => r.id === id)
      if (latestIdx < 0) return
      roadmaps.value[latestIdx] = {
        ...roadmaps.value[latestIdx],
        title: data.title || roadmaps.value[latestIdx].title,
        currentState: data.currentState || roadmaps.value[latestIdx].currentState,
        recommendedDirection: data.recommendedDirection || roadmaps.value[latestIdx].recommendedDirection,
        targetWorlds: Array.isArray(data.targetWorlds) ? data.targetWorlds : roadmaps.value[latestIdx].targetWorlds,
        fusionAdvice: data.fusionAdvice || roadmaps.value[latestIdx].fusionAdvice,
        evolutionPath: data.evolutionPath || roadmaps.value[latestIdx].evolutionPath,
      }
    } catch (e: any) {
      lastError.value = e.message || '修改失败'
    } finally {
      generatingV1.value = false
    }
  }

  function deleteRoadmap(id: number) {
    roadmaps.value = roadmaps.value.filter(r => r.id !== id)
  }

  return {
    plans, roadmaps, activePlanType, generatingV1, generatingV2, lastError,
    createPlan, modifyPlan, confirmPlan, deletePlan,
    createRoadmap, modifyRoadmap, confirmRoadmap, deleteRoadmap,
  }
})

// ================================================================
// 副本攻略
// ================================================================
const DG_SK = 'wxhl003_dungeon_strategies'

function loadDungeons(): DungeonStrategy[] {
  try {
    const r = localStorage.getItem(DG_SK)
    if (r) return JSON.parse(r)
  } catch (_) {}
  return []
}

function saveDungeons(dungeons: DungeonStrategy[]) {
  try { localStorage.setItem(DG_SK, JSON.stringify(dungeons)) } catch (_) {}
}

const DUNGEON_V1_SCHEMA = {
  name: 'dungeon_strategy_v1',
  value: {
    type: 'object',
    properties: {
      dungeonName: { type: 'string' },
      routeOverview: { type: 'string' },
      questExecution: { type: 'string' },
      achievementPlan: { type: 'string' },
      hiddenQuestStrategy: { type: 'string' },
    },
    required: ['dungeonName', 'routeOverview', 'questExecution', 'achievementPlan', 'hiddenQuestStrategy'],
  },
}

const DUNGEON_V2_SCHEMA = {
  name: 'dungeon_strategy_v2',
  value: {
    type: 'object',
    properties: {
      stepPlan: { type: 'array', items: { type: 'string' } },
      combatAdvice: { type: 'string' },
      resourceAdvice: { type: 'string' },
      risks: { type: 'string' },
    },
    required: ['stepPlan', 'combatAdvice', 'resourceAdvice', 'risks'],
  },
}

function buildModeDesc(mode: DungeonMode): string {
  switch (mode) {
    case 'goal': return '以契约者输入的目标为首要目标，围绕它规划整趟副本'
    case 'speedrun': return '速通：最快通关主线和支线'
    case 'perfect': return '完美通关：完成主线、支线、隐藏任务和全部成就'
    case 'deep': return '深度挖掘：挖掘隐藏力量、道具，面对隐藏BOSS，主动介入世界事件'
    case 'fun': return '搞耍：乐子人玩法，怎么有趣怎么来'
  }
}

function buildDungeonV1Prompt(faction: Faction, mode: DungeonMode, playerGoal: string, statData: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : ''
  const goalCtx = mode === 'goal' ? `\n【契约者的目标】\n${playerGoal}\n` : ''
  return `你是无限回廊的副本攻略AI。请为契约者生成一份针对当前副本的完整攻略路线。

${worldCtx}

【副本与玩家数据】
${statData || '（未读取到数据）'}
${goalCtx}
【阵营偏向】
${faction}

【攻略模式】
${buildModeDesc(mode)}

【任务要求】
通读副本数据（含主线任务、支线任务、成就、隐藏任务线索）和玩家状态（职业、等级、技能、装备、属性），生成一份攻略框架：

1. dungeonName: 副本名称
2. routeOverview: 路线总览。一句话概括这条路线怎么走，能达成哪些目标
3. questExecution: 主线与支线任务执行计划。按照副本里的实际任务安排先后顺序，标注关键点
4. achievementPlan: 成就达成方案。副本里的成就逐个说明达成条件和方法
5. hiddenQuestStrategy: 隐藏任务攻略。副本开局会给一条隐藏任务的线索，结合这条线索推测隐藏任务的触发方式并给出执行方案`
}

function buildDungeonV2Prompt(dungeon: DungeonStrategy, statData: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : ''
  return `你是无限回廊的副本攻略AI。你已为契约者生成了副本攻略框架，现在需要补充具体执行细节。

${worldCtx}

【副本与玩家数据】
${statData || '（未读取到数据）'}

【已确认的攻略框架】
- 副本名称: ${dungeon.dungeonName}
- 阵营偏向: ${dungeon.faction}
- 路线总览: ${dungeon.routeOverview}
- 主线支线执行: ${dungeon.questExecution}
- 成就方案: ${dungeon.achievementPlan}
- 隐藏任务: ${dungeon.hiddenQuestStrategy}

【任务要求】
在框架基础上生成具体执行细节：

1. stepPlan: 分步执行路线。从副本开局到结束，每一步具体做什么，覆盖主线、支线、成就、隐藏任务
2. combatAdvice: 针对玩家当前职业和技能的战斗建议。针对副本中的关键战斗，说明怎么利用现有技能、装备、特性应对
3. resourceAdvice: 资源与道具优先级建议。副本中可能获得或消耗的道具、消耗品，哪些值得保留/使用
4. risks: 风险提示与翻车预案。这条路线容易翻车的环节，以及对应的应对预案`
}

function readPlayerData(): string {
  try {
    let vars: any = {}
    try {
      const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1
      if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {}
    } catch (_) {}
    if (!vars?.stat_data) {
      try { vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {} } catch (_) {}
    }
    if (!vars?.stat_data) {
      try { vars = getVariables?.({ type: 'chat' }) ?? {} } catch (_) {}
    }
    const stat = vars?.stat_data
    if (!stat) return '（未找到角色数据）'
    return JSON.stringify(stat)
  } catch (_) {
    return '（读取角色数据时出错）'
  }
}

export const useDungeonStore = defineStore('dungeon', () => {
  const dungeons = ref<DungeonStrategy[]>(loadDungeons())
  const generatingV1 = ref(false)
  const generatingV2 = ref(false)
  const lastError = ref('')

  watchEffect(() => saveDungeons(dungeons.value))

  function getForumStore() {
    return useForumStore()
  }

  /** 第一轮生成：攻略框架 */
  async function createDungeon(faction: Faction, mode: DungeonMode, playerGoal: string) {
    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generatingV1.value = true
    lastError.value = ''
    try {
      const wb = await forumStore.getWorldbookContent()
      const statData = readPlayerData()
      const prompt = buildDungeonV1Prompt(faction, mode, playerGoal, statData, wb)
      const raw = await aiGenerate(cfg, prompt, DUNGEON_V1_SCHEMA)
      const data = extractJSON(raw)

      const now = new Date()
      const ts = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0')

      const maxId = dungeons.value.reduce((m, d) => Math.max(m, d.id), 0)
      const dungeon: DungeonStrategy = {
        id: maxId + 1,
        createdAt: ts,
        phase: 'v1',
        faction,
        mode,
        playerGoal,
        dungeonName: data.dungeonName || '未命名副本',
        routeOverview: data.routeOverview || '',
        questExecution: data.questExecution || '',
        achievementPlan: data.achievementPlan || '',
        hiddenQuestStrategy: data.hiddenQuestStrategy || '',
      }
      dungeons.value.unshift(dungeon)
    } catch (e: any) {
      lastError.value = e.message || '生成失败'
    } finally {
      generatingV1.value = false
    }
  }

  /** 修改 V1（按反馈重新生成） */
  async function modifyDungeon(id: number, feedback: string) {
    if (generatingV1.value) return
    const idx = dungeons.value.findIndex(d => d.id === id)
    if (idx < 0) return

    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generatingV1.value = true
    lastError.value = ''
    try {
      const dungeon = dungeons.value[idx]
      const wb = await forumStore.getWorldbookContent()
      const statData = readPlayerData()
      const prompt = `你是无限回廊的副本攻略AI。契约者对已生成的副本攻略提出了修改意见，请根据意见重新生成攻略框架。

【副本与玩家数据】
${statData}

${wb ? '\n【世界观参考】\n' + wb : ''}

【当前攻略框架】
- 副本名称: ${dungeon.dungeonName}
- 阵营偏向: ${dungeon.faction}
- 路线总览: ${dungeon.routeOverview}
- 主线支线执行: ${dungeon.questExecution}
- 成就方案: ${dungeon.achievementPlan}
- 隐藏任务: ${dungeon.hiddenQuestStrategy}

【修改意见】
${feedback}

【任务要求】
根据修改意见重新生成完整攻略框架（所有字段）。保留修改意见认可的部分，只改动需要调整的地方。`
      const raw = await aiGenerate(cfg, prompt, DUNGEON_V1_SCHEMA)
      const data = extractJSON(raw)

      const latestIdx = dungeons.value.findIndex(d => d.id === id)
      if (latestIdx < 0) return
      dungeons.value[latestIdx] = {
        ...dungeons.value[latestIdx],
        dungeonName: data.dungeonName || dungeons.value[latestIdx].dungeonName,
        routeOverview: data.routeOverview || dungeons.value[latestIdx].routeOverview,
        questExecution: data.questExecution || dungeons.value[latestIdx].questExecution,
        achievementPlan: data.achievementPlan || dungeons.value[latestIdx].achievementPlan,
        hiddenQuestStrategy: data.hiddenQuestStrategy || dungeons.value[latestIdx].hiddenQuestStrategy,
      }
    } catch (e: any) {
      lastError.value = e.message || '修改失败'
    } finally {
      generatingV1.value = false
    }
  }

  /** 重roll：用原条件重新生成 V1 */
  async function rerollDungeon(id: number) {
    if (generatingV1.value) return
    const idx = dungeons.value.findIndex(d => d.id === id)
    if (idx < 0) return
    const dungeon = dungeons.value[idx]
    await createDungeon(dungeon.faction, dungeon.mode, dungeon.playerGoal)
  }

  /** 第二轮生成：细节 */
  async function confirmDungeon(id: number) {
    if (generatingV2.value) return
    const idx = dungeons.value.findIndex(d => d.id === id)
    if (idx < 0) return

    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generatingV2.value = true
    lastError.value = ''
    try {
      const dungeon = dungeons.value[idx]
      const wb = await forumStore.getWorldbookContent()
      const statData = readPlayerData()
      const prompt = buildDungeonV2Prompt(dungeon, statData, wb)
      const raw = await aiGenerate(cfg, prompt, DUNGEON_V2_SCHEMA)
      const data = extractJSON(raw)

      const latestIdx = dungeons.value.findIndex(d => d.id === id)
      if (latestIdx < 0) return
      dungeons.value[latestIdx] = {
        ...dungeons.value[latestIdx],
        phase: 'complete',
        stepPlan: Array.isArray(data.stepPlan) ? data.stepPlan : [],
        combatAdvice: data.combatAdvice || '',
        resourceAdvice: data.resourceAdvice || '',
        risks: data.risks || '',
      }
    } catch (e: any) {
      lastError.value = e.message || '生成细节失败'
    } finally {
      generatingV2.value = false
    }
  }

  function deleteDungeon(id: number) {
    dungeons.value = dungeons.value.filter(d => d.id !== id)
  }

  return {
    dungeons, generatingV1, generatingV2, lastError,
    createDungeon, modifyDungeon, rerollDungeon, confirmDungeon, deleteDungeon,
  }
})

// ================================================================
// PvP 竞技场 · 创意工坊
// ================================================================

export const useWorkshopStore = defineStore('workshop', () => {
  const contracts = ref<WorkshopCard[]>([])
  const loadingContracts = ref(false)
  const worldbookError = ref('')
  const mySave = ref<PvPSave | null>(null)
  const extracting = ref(false)
  const aiIntroEnabled = ref(true)
  const introGenerating = ref(false)

  /** 读世界书「契约者角色库」→ 解析为卡片列表（按阶位分组、组内等级降序） */
  async function loadContracts() {
    loadingContracts.value = true
    worldbookError.value = ''
    try {
      // 注意：条目 enabled 字段不影响读取——契约者库条目按设计均为 enabled:false（不进 AI 上下文），但 getWorldbook 会返回全部条目
      const entries = await getWorldbook(WORKSHOP_WORLDBOOK_NAME)
      const cards: WorkshopCard[] = []
      let bad = 0
      for (const e of entries) {
        try {
          const save = PvPSaveSchema.parse(JSON.parse(e.content))
          const h = save.契约者.头部
          const 职 = save.契约者.职业
          cards.push({
            name: h.姓名 || e.name || '未知契约者',
            阶位: h.阶位 || '一阶',
            等级: h.等级 || 1,
            军衔: h.军衔 || '列兵',
            职业: 职.名称 || '无',
            简介: save.简介 || '',
            上传者: save.上传者 || '',
            外貌: save.外貌 || '',
            save,
          })
        } catch (_) { bad++ }
      }
      if (bad > 0) toastr.warning(`契约者角色库有 ${bad} 条条目损坏，已跳过`)
      contracts.value = cards.sort((a, b) => {
        const t = tierOf(a.阶位) - tierOf(b.阶位)
        return t !== 0 ? t : b.等级 - a.等级
      })
    } catch (e: any) {
      // 读取失败：保留空库并透出真实错误（世界书不存在 / API / 权限等），避免误判为「契约者角色库为空」
      contracts.value = []
      worldbookError.value = e?.message || '读取世界书失败'
    } finally { loadingContracts.value = false }
  }

  /** 读取当前玩家契约者 → 摘六字段为我的构筑 */
  async function extractMySave(): Promise<boolean> {
    extracting.value = true
    try {
      let vars: any = {}
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1
        if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {}
      } catch (_) {}
      if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {} } catch (_) {} }
      if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type: 'chat' }) ?? {} } catch (_) {} }
      const character = vars?.stat_data?.契约者
      if (!character) { toastr.warning('未检测到玩家契约者数据'); return false }
      // extractContractSave 返回顶层六字段 {头部,...}，需包进 {契约者:{...}} 才能被 PvPSaveSchema 解析
      const save = PvPSaveSchema.parse({ 契约者: extractContractSave(character) })
      mySave.value = save
      return true
    } catch (e: any) {
      toastr.error('提取构筑失败: ' + (e?.message || e))
      return false
    } finally { extracting.value = false }
  }

  /** AI 生成一句话简介写入 mySave.简介 */
  async function generateIntro() {
    const save = mySave.value
    if (!save) return
    const forumStore = useForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { toastr.warning('请先在终端设置中配置 API'); return }
    introGenerating.value = true
    try {
      const raw = await aiGenerate(cfg, buildIntroPrompt(save))
      save.简介 = (typeof raw === 'string' ? raw : (raw as any).content || '').trim().slice(0, 60)
    } catch (e: any) {
      toastr.error('生成简介失败: ' + (e?.message || e))
    } finally { introGenerating.value = false }
  }

  /** 校验后下载存档为 .json 文件 */
  function downloadMySave() {
    if (!mySave.value) return
    try {
      const validated = PvPSaveSchema.parse(mySave.value)
      const blob = new Blob([JSON.stringify(validated, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (validated.契约者.头部.姓名 || '契约者') + '_构筑存档.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toastr.success('构筑存档已下载')
    } catch (e: any) {
      toastr.error('存档校验失败: ' + (e?.message || e))
    }
  }

  // ---- 作者收录 ----
  const authorDraft = ref('')
  const previewSave = ref<PvPSave | null>(null)
  const authorError = ref('')

  function previewPaste(text: string) {
    authorDraft.value = text
    authorError.value = ''
    previewSave.value = null
    try {
      previewSave.value = PvPSaveSchema.parse(JSON.parse(text))
    } catch (e: any) {
      authorError.value = '存档 JSON 解析失败: ' + (e?.message || e)
    }
  }

  async function writeToWorldbook(): Promise<boolean> {
    if (!previewSave.value) { authorError.value = '请先校验存档'; return false }
    try {
      const save = previewSave.value
      const name = save.契约者.头部.姓名 || '未命名契约者'
      await createWorldbookEntries(WORKSHOP_WORLDBOOK_NAME, [{
        name,
        enabled: false,
        content: JSON.stringify(save),
      }])
      toastr.success('已收录契约者「' + name + '」')
      previewSave.value = null
      authorDraft.value = ''
      await loadContracts()
      return true
    } catch (e: any) {
      authorError.value = '写入世界书失败: ' + (e?.message || e)
      return false
    }
  }

  async function removeContract(name: string) {
    try {
      await deleteWorldbookEntries(WORKSHOP_WORLDBOOK_NAME, entry => entry.name === name)
      toastr.success('已移除契约者「' + name + '」')
      await loadContracts()
    } catch (e: any) {
      toastr.error('移除失败: ' + (e?.message || e))
    }
  }

  // ---- 发起对战 ----
  async function startBattle(card: WorkshopCard): Promise<boolean> {
    try {
      await waitGlobalInitialized('Mvu')
      const enemy = {
        外貌: card.外貌 || generateDefaultAppearance(card.save.契约者.装备),
        头部: card.save.契约者.头部,
        属性: card.save.契约者.属性,
        衍生属性: card.save.契约者.衍生属性,
        职业: card.save.契约者.职业,
        通用技能: card.save.契约者.通用技能,
        装备: card.save.契约者.装备,
      }
      // 用当前楼层（与 readPlayerData 探测模式一致；脚本环境 getCurrentMessageId 可用）
      const message_id = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : 'latest'
      const mvu = Mvu.getMvuData({ type: 'message', message_id })
      // 数组路径：每个元素都是字面量 key，名字含「.」（如 J.K.罗琳）不会被 lodash 当作层级分隔，且只写这一条路径（不清空不覆盖）
      _.set(mvu, ['stat_data', '契约者', '当前敌人', card.name], enemy)
      await Mvu.replaceMvuData(mvu, { type: 'message', message_id })
      await createChatMessages([{ role: 'assistant', message: buildBattleIntroMessage(card) }])
      toastr.success('对战开始！对手已写入')
      return true
    } catch (e: any) {
      toastr.error('发起对战失败: ' + (e?.message || e))
      return false
    }
  }

  return {
    contracts, loadingContracts, worldbookError, mySave, extracting,
    aiIntroEnabled, introGenerating,
    loadContracts, extractMySave, generateIntro, downloadMySave,
    authorDraft, previewSave, authorError,
    previewPaste, writeToWorldbook, removeContract, startBattle,
  }
})
