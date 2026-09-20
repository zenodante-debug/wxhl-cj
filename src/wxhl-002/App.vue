<template>
  <!-- ============================================================
       FLOATING BUTTON — Hellraiser Lament Configuration Cube
       ============================================================ -->
  <div
    v-show="!expanded"
    ref="btnRef"
    class="lament-cube"
    :class="{ dragging: isDragging, 'motion-off': reduceMotion }"
    :style="btnStyle"
    @mousedown.prevent="onDragStart"
    @touchstart.prevent="onTouchStart"
  >
    <div class="cube-rings">
      <div class="cube-ring r1"></div>
      <div class="cube-ring r2"></div>
      <div class="cube-ring r3"></div>
      <div class="cube-center"></div>
    </div>
    <div class="cube-glow"></div>
  </div>

  <!-- ============================================================
       EXPANDED PANEL — Phone simulation
       ============================================================ -->
  <Transition name="panel" @after-leave="onPanelClosed">
    <div
      v-if="expanded"
      class="panel-overlay"
      :class="{ 'motion-off': reduceMotion }"
      @click.self="collapse"
    >
      <div class="phone-frame">
        <!-- Status Bar -->
        <div class="status-bar">
          <span>{{ clockTime }}</span>
          <span class="status-icons">📶 🔋 100</span>
        </div>

        <!-- Minimize Button -->
        <button class="minimize-btn" @click.stop="collapse" aria-label="最小化">
          <span></span>
        </button>

        <!-- ================================
             DESKTOP VIEW
             ================================ -->
        <div v-if="currentView === 'desktop'" class="desktop-view">
          <div class="wallpaper"></div>
          <div class="app-grid">
            <div
              v-for="app in desktopApps"
              :key="app.id"
              class="app-icon-wrap"
              @click="openApp(app)"
            >
              <div class="app-icon" :class="app.id==='forum'?'forum-highlight':''" :style="{background:app.color}">
                <span>{{ app.icon }}</span>
              </div>
              <span class="app-label">{{ app.name }}</span>
            </div>
          </div>
          <div class="dock">
            <div
              v-for="app in dockApps"
              :key="app.id"
              class="dock-app"
              @click="openApp(app)"
            >
              <div class="app-icon" :class="app.id==='forum'?'forum-highlight':''" :style="{background:app.color}">
                <span>{{ app.icon }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ================================
             FORUM — Section List
             ================================ -->
        <div v-if="currentView === 'forum'" class="forum-view">
          <div class="forum-header">
            <button class="forum-back" @click="goDesktop">←</button>
            <span class="forum-title">无限论坛</span>
            <button class="forum-action" @click="currentView='api-config'">⚙</button>
          </div>
          <div class="section-list">
            <div
              v-for="sec in sections"
              :key="sec.id"
              class="section-card"
              @click="openSection(sec)"
            >
              <span class="sec-icon">{{ sec.icon }}</span>
              <div class="sec-info">
                <div class="sec-name">{{ sec.name }}</div>
                <div class="sec-desc">
                  {{ sec.id==='leaderboard'
                    ? `[榜单|${sec.leaderboard?.name||'?'}] ${sec.leaderboard?.entries.length||0} 条上榜记录`
                    : `${sec.posts.length} 个帖子 · 最新: ${sec.posts[0]?.title||''}` }}
                </div>
              </div>
              <span class="sec-arrow">›</span>
            </div>
          </div>
        </div>

        <!-- ================================
             FORUM — Post List
             ================================ -->
        <div v-if="currentView === 'posts' && curSection && curSection.id !== 'leaderboard'" class="forum-view">
          <div class="forum-header">
            <button class="forum-back" @click="goBack">←</button>
            <span class="forum-title">{{ curSection.name }}</span>
          </div>
          <div class="post-list">
            <div class="post-list-hdr">
              <span>全部帖子</span><span class="post-count">共 {{ curSection.posts.length }} 帖</span>
            </div>
            <div v-for="(p,i) in curSection.posts" :key="i" class="post-card">
              <div class="post-title">[帖子] {{ p.title }}</div>
              <div class="post-preview">{{ p.preview }}</div>
              <div class="post-meta">
                <span class="meta-author">{{ p.author }}</span>
                <span class="meta-replies">{{ p.replies }} 回复</span>
                <span>{{ p.time }}</span>
              </div>
              <div class="hot-comment">
                <span class="hot-label">🔥 热评</span>
                <div class="hot-content">[热评] {{ p.hotComment.content }}</div>
                <div class="hot-meta">
                  <span>{{ p.hotComment.author }}</span>
                  <span class="hot-likes">👍 {{ p.hotComment.likes }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ================================
             FORUM — Leaderboard
             ================================ -->
        <div v-if="currentView === 'posts' && curSection && curSection.id === 'leaderboard'" class="forum-view">
          <div class="forum-header">
            <button class="forum-back" @click="goBack">←</button>
            <span class="forum-title">{{ curSection.name }}</span>
          </div>
          <div class="lb-panel">
            <div class="lb-banner">
              <div class="lb-name">[榜单|{{ curSection.leaderboard?.name || '' }}]</div>
              <div class="lb-sub">实时排名 · 数据每日更新</div>
            </div>
            <div class="lb-list">
              <div v-for="e in curSection.leaderboard?.entries||[]" :key="e.rank" class="lb-item">
                <div class="lb-rank">{{ e.rank }}</div>
                <div class="lb-info">
                  <div class="lb-title">[排行榜|{{ e.rank }}|{{ e.title }}|Lv.{{ e.level }}|{{ e.team }}]</div>
                  <div class="lb-detail"><span class="lb-lv">Lv.{{ e.level }}</span><span>{{ e.team }}</span></div>
                </div>
                <span class="lb-team">{{ e.team }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ================================
             API Config
             ================================ -->
        <div v-if="currentView === 'api-config'" class="forum-view">
          <div class="forum-header">
            <button class="forum-back" @click="goBack">←</button>
            <span class="forum-title">第二API配置</span>
          </div>
          <div class="api-body">
            <p class="api-hint">配置独立的API用于论坛内容生成，不会影响酒馆正文聊天。</p>
            <label>API 地址</label>
            <input v-model="apiUrl" type="text" placeholder="https://api.example.com"/>
            <label>API Key</label>
            <input v-model="apiKey" type="password" placeholder="sk-..."/>
            <label>模型</label>
            <input v-model="apiModel" type="text" placeholder="gpt-4o"/>
            <button class="api-save" @click="saveApiConfig">保存配置</button>
            <button class="api-refresh" @click="refreshForum">刷新论坛数据</button>
          </div>
        </div>

      </div><!-- /phone-frame -->
    </div><!-- /panel-overlay -->
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { forumSections, fetchForumViaSecondAPI, randomBoardName, type ForumSection } from './forumData'

/* ================================================================
   STATE
   ================================================================ */
const STORAGE_KEY = 'wxhl002_btn_pos'
const expanded = ref(false)
const currentView = ref<'desktop'|'forum'|'posts'|'api-config'>('desktop')
const viewStack = ref<Array<'desktop'|'forum'|'posts'|'api-config'>>([])
const curSection = ref<ForumSection|null>(null)
const sections = ref<ForumSection[]>(forumSections)
const reduceMotion = ref(false)
const isDragging = ref(false)
const btnBottom = ref(24)
const btnRight = ref(24)
const btnRef = ref<HTMLElement|null>(null)
const clockTime = ref('')
let clockTimer = 0

/* API config */
const apiUrl = ref('')
const apiKey = ref('')
const apiModel = ref('')

/* Desktop apps */
const desktopApps = [
  { id:'forum', name:'无限论坛', color:'linear-gradient(135deg, #2b7eed, #1e5fb4)', icon:'📋' },
  { id:'status', name:'状态面板', color:'linear-gradient(135deg, #4CAF50, #2E7D32)', icon:'📊' },
  { id:'bag', name:'背包', color:'linear-gradient(135deg, #FF9800, #E65100)', icon:'📦' },
  { id:'settings', name:'设置', color:'linear-gradient(135deg, #9C27B0, #4A148C)', icon:'⚙' },
  { id:'gallery', name:'图库', color:'linear-gradient(135deg, #607D8B, #37474F)', icon:'📷' },
  { id:'music', name:'音乐', color:'linear-gradient(135deg, #F44336, #B71C1C)', icon:'🎵' },
]
const dockApps = [desktopApps[0], desktopApps[1], desktopApps[2]]

/* ================================================================
   COMPUTED
   ================================================================ */
const btnStyle = computed(()=>({bottom:btnBottom.value+'px',right:btnRight.value+'px'}))

/* ================================================================
   DRAG LOGIC
   ================================================================ */
let dragStartX=0, dragStartY=0, dragOrigBottom=0, dragOrigRight=0, hasMoved=false
const DRAG_THRESHOLD=4

function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}

function onDragStart(e:MouseEvent){if(e.button!==0)return
  dragStartX=e.clientX;dragStartY=e.clientY;dragOrigBottom=btnBottom.value;dragOrigRight=btnRight.value;hasMoved=false
  document.addEventListener('mousemove',onDragMove);document.addEventListener('mouseup',onDragEnd)}

function onDragMove(e:MouseEvent){const dx=dragStartX-e.clientX,dy=dragStartY-e.clientY
  if(!hasMoved&&(Math.abs(dx)>DRAG_THRESHOLD||Math.abs(dy)>DRAG_THRESHOLD)){hasMoved=true;isDragging.value=true}
  if(hasMoved){const vw=window.innerWidth,vh=window.innerHeight
    btnRight.value=clamp(dragOrigRight+dx,0,vw-64);btnBottom.value=clamp(dragOrigBottom+dy,0,vh-64)}}

function onDragEnd(_e:MouseEvent){document.removeEventListener('mousemove',onDragMove);document.removeEventListener('mouseup',onDragEnd)
  isDragging.value=false
  if(hasMoved){const vw=window.innerWidth;btnRight.value=vw-btnRight.value-32<vw/2?8:clamp(vw-64-8,0,vw-64);savePosition()}
  else expand()}

function onTouchStart(e:TouchEvent){const t=e.touches[0]
  dragStartX=t.clientX;dragStartY=t.clientY;dragOrigBottom=btnBottom.value;dragOrigRight=btnRight.value;hasMoved=false
  document.addEventListener('touchmove',onTouchMove,{passive:false}as any);document.addEventListener('touchend',onTouchEnd)}

function onTouchMove(e:TouchEvent){const t=e.touches[0],dx=dragStartX-t.clientX,dy=dragStartY-t.clientY
  if(!hasMoved&&(Math.abs(dx)>DRAG_THRESHOLD||Math.abs(dy)>DRAG_THRESHOLD)){hasMoved=true;isDragging.value=true}
  if(hasMoved){e.preventDefault();const vw=window.innerWidth,vh=window.innerHeight
    btnRight.value=clamp(dragOrigRight+dx,0,vw-64);btnBottom.value=clamp(dragOrigBottom+dy,0,vh-64)}}

function onTouchEnd(_e:TouchEvent){document.removeEventListener('touchmove',onTouchMove);document.removeEventListener('touchend',onTouchEnd)
  isDragging.value=false
  if(hasMoved){const vw=window.innerWidth;btnRight.value=vw-btnRight.value-32<vw/2?8:clamp(vw-64-8,0,vw-64);savePosition()}
  else expand()}

/* ================================================================
   EXPAND / COLLAPSE
   ================================================================ */
function expand(){expanded.value=true;currentView.value='desktop';document.body.style.overflow='hidden'}
function collapse(){expanded.value=false;document.body.style.overflow=''}
function onPanelClosed(){currentView.value='desktop'}

/* ================================================================
   NAVIGATION
   ================================================================ */
function openApp(app:{id:string}){if(app.id==='forum'){viewStack.value.push('desktop');currentView.value='forum'}}
function goDesktop(){currentView.value='desktop';viewStack.value=[];curSection.value=null}

function openSection(sec:ForumSection){
  viewStack.value.push(currentView.value)
  if(sec.id==='leaderboard'&&sec.leaderboard)sec.leaderboard.name=randomBoardName()
  curSection.value=sec;currentView.value='posts'}

function goBack(){const prev=viewStack.value.pop();if(prev){currentView.value=prev;if(prev!=='posts')curSection.value=null}else goDesktop()}

/* ================================================================
   API CONFIG
   ================================================================ */
function saveApiConfig(){try{localStorage.setItem('wxhl002-api',JSON.stringify({url:apiUrl.value,key:apiKey.value,model:apiModel.value}))
  if(typeof toastr!=='undefined')toastr.success('API配置已保存')}catch(_){}}

async function refreshForum(){try{if(apiUrl.value&&apiKey.value){sections.value=await fetchForumViaSecondAPI(apiUrl.value,apiKey.value,apiModel.value)
  if(typeof toastr!=='undefined')toastr.success('论坛数据已刷新')}else{sections.value=[...forumSections]
    if(typeof toastr!=='undefined')toastr.info('已加载默认数据')}}catch(_){sections.value=[...forumSections]}}

function loadApiConfig(){try{const raw=localStorage.getItem('wxhl002-api');if(raw){const c=JSON.parse(raw)
  if(c.url)apiUrl.value=c.url;if(c.key)apiKey.value=c.key;if(c.model)apiModel.value=c.model}}catch(_){}}

/* ================================================================
   POSITION PERSISTENCE
   ================================================================ */
function savePosition(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({bottom:btnBottom.value,right:btnRight.value}))}catch(_){}}
function loadPosition(){try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const{bottom,right}=JSON.parse(raw)
  if(typeof bottom==='number'&&typeof right==='number'){btnBottom.value=clamp(bottom,0,window.innerHeight-64)
    btnRight.value=clamp(right,0,window.innerWidth-64)}}}catch(_){}}

/* ================================================================
   RESIZE / CLOCK / REDUCED MOTION
   ================================================================ */
function onResize(){btnBottom.value=clamp(btnBottom.value,0,window.innerHeight-64);btnRight.value=clamp(btnRight.value,0,window.innerWidth-64)}
function updateClock(){const d=new Date();clockTime.value=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function checkReducedMotion(){reduceMotion.value=window.matchMedia('(prefers-reduced-motion:reduce)').matches||document.documentElement.classList.contains('st-reduce-motion')}

/* ================================================================
   LIFECYCLE
   ================================================================ */
onMounted(()=>{loadPosition();loadApiConfig();checkReducedMotion();updateClock()
  clockTimer=window.setInterval(updateClock,30000);window.addEventListener('resize',onResize)
  const obs=new MutationObserver(checkReducedMotion);obs.observe(document.documentElement,{attributes:true,attributeFilter:['class']})})

onUnmounted(()=>{window.clearInterval(clockTimer);window.removeEventListener('resize',onResize)
  document.removeEventListener('mousemove',onDragMove);document.removeEventListener('mouseup',onDragEnd)
  document.removeEventListener('touchmove',onTouchMove);document.removeEventListener('touchend',onTouchEnd)})
</script>

<style lang="scss" scoped>
/* ================================================================
   FLOATING BUTTON — Hellraiser Lament Configuration
   ================================================================ */
.lament-cube{position:fixed;z-index:99999;width:64px;height:64px;border-radius:50%;
  background:radial-gradient(circle at 40% 35%,#2a2a28 0%,#0d0d0d 65%,#050505 100%);
  border:2px solid rgba(200,168,78,.12);cursor:pointer;display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 24px rgba(0,0,0,.5),inset 0 1px 0 rgba(200,168,78,.05);
  user-select:none;-webkit-user-select:none;touch-action:none;
  transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease;
  &:hover{transform:scale(1.06);border-color:rgba(200,168,78,.3);
    box-shadow:0 6px 32px rgba(0,0,0,.55),0 0 0 6px rgba(200,168,78,.12),inset 0 1px 0 rgba(200,168,78,.08)}
  &.dragging{transform:scale(1.15);cursor:grabbing;border-color:rgba(200,168,78,.5);
    box-shadow:0 8px 40px rgba(0,0,0,.6),0 0 0 8px rgba(200,168,78,.2),inset 0 1px 0 rgba(200,168,78,.1);transition:none}
  &.motion-off{transition:none!important}
}
.cube-rings{position:relative;z-index:2;width:100%;height:100%;display:flex;align-items:center;justify-content:center}
.cube-ring{position:absolute;border:1px solid;border-radius:3px;
  &.r1{width:40px;height:40px;border-color:#e0c878;opacity:.8;animation:lamentSpin 8s linear infinite}
  &.r2{width:28px;height:28px;border-color:#c8a84e;opacity:.6;transform:rotate(45deg);animation:lamentSpinRev 6s linear infinite}
  &.r3{width:16px;height:16px;border-color:#8a7030;opacity:.5;animation:lamentSpin 4s linear infinite}
}
.cube-center{position:absolute;width:4px;height:4px;background:#e0c878;border-radius:50%;
  box-shadow:0 0 6px 3px rgba(200,168,78,.6);animation:lamentPulse 2s ease-in-out infinite}
.cube-glow{position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(200,168,78,.15);animation:glowPulse 3s ease-in-out infinite;
  .lament-cube:hover &{border-color:rgba(200,168,78,.35);animation-duration:1.5s}
  .lament-cube.dragging &{border-color:rgba(200,168,78,.5);animation-duration:1s}
}

@keyframes lamentSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes lamentSpinRev{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}
@keyframes lamentPulse{0%,100%{box-shadow:0 0 6px 3px rgba(200,168,78,.4)}50%{box-shadow:0 0 12px 6px rgba(224,200,120,.8)}}
@keyframes glowPulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.8;transform:scale(1.06)}}

/* ================================================================
   PANEL OVERLAY
   ================================================================ */
.panel-overlay{position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  display:flex;align-items:center;justify-content:center;
  &.motion-off{.phone-frame{transition:none!important}}}

.panel-enter-active{transition:opacity .35s cubic-bezier(.4,0,.2,1);
  .phone-frame{transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .3s ease}}
.panel-leave-active{transition:opacity .25s ease-in;
  .phone-frame{transition:transform .3s cubic-bezier(.4,0,1,1),opacity .2s ease}}
.panel-enter-from,.panel-leave-to{opacity:0;
  .phone-frame{transform:scale(.1);opacity:0}}

/* ================================================================
   PHONE FRAME
   ================================================================ */
.phone-frame{width:320px;height:640px;border-radius:42px;background:#0f0f13;
  border:2px solid rgba(255,255,255,.1);box-shadow:0 0 0 6px #1a1a2e,0 0 0 8px rgba(255,255,255,.05),0 30px 80px rgba(0,0,0,.6);
  position:relative;overflow:hidden;display:flex;flex-direction:column}

.status-bar{display:flex;justify-content:space-between;align-items:center;padding:14px 28px 0;height:36px;font-size:12px;color:#fff;z-index:10;position:relative;pointer-events:none}
.minimize-btn{position:absolute;top:38px;right:16px;z-index:20;width:28px;height:28px;border-radius:50%;
  border:1.5px solid rgba(255,255,255,.2);background:rgba(0,0,0,.4);backdrop-filter:blur(4px);cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all .2s;
  span{display:block;width:12px;height:2px;background:rgba(255,255,255,.7);border-radius:1px}
  &:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.4)}
  &:active{transform:scale(.9)}}

/* ================================================================
   DESKTOP
   ================================================================ */
.desktop-view{flex:1;display:flex;flex-direction:column;position:relative}
.wallpaper{position:absolute;inset:0;
  background:radial-gradient(ellipse 80% 60% at 30% 20%,rgba(43,126,237,.2),transparent 60%),
    radial-gradient(ellipse 60% 50% at 70% 50%,rgba(30,95,180,.15),transparent 55%),
    linear-gradient(180deg,#0f1729 0%,#111827 40%,#0d1117 100%)}
.app-grid{position:relative;z-index:2;display:grid;grid-template-columns:repeat(3,1fr);gap:18px 8px;padding:54px 24px 0}
.app-icon-wrap{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:transform .15s;
  &:active{transform:scale(.88)}}
.app-icon{width:56px;height:56px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:24px;
  box-shadow:0 4px 12px rgba(0,0,0,.35);transition:box-shadow .2s;
  .app-icon-wrap:hover &{box-shadow:0 6px 20px rgba(0,0,0,.5)}
  &.forum-highlight{box-shadow:0 0 0 3px rgba(255,255,255,.4),0 4px 12px rgba(0,0,0,.35)}}
.app-label{font-size:10.5px;color:rgba(255,255,255,.85);text-align:center;max-width:60px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.dock{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);z-index:2;display:flex;gap:12px;
  background:rgba(255,255,255,.06);backdrop-filter:blur(12px);border-radius:22px;padding:6px 14px;border:1px solid rgba(255,255,255,.08)}
.dock-app{cursor:pointer;transition:transform .15s;
  .app-icon{width:42px;height:42px;border-radius:10px;font-size:20px}
  &:active{transform:scale(.85)}}

/* ================================================================
   FORUM (Baidu Tieba Style)
   ================================================================ */
.forum-view{flex:1;display:flex;flex-direction:column;background:#f2f4f7;position:relative;z-index:5}
.forum-header{display:flex;align-items:center;gap:8px;padding:0 12px;height:44px;background:#2b7eed;color:#fff;flex-shrink:0}
.forum-back{width:32px;height:32px;border:none;background:transparent;color:#fff;font-size:16px;cursor:pointer;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background .15s;
  &:hover{background:rgba(255,255,255,.15)}}
.forum-title{font-size:15px;font-weight:600;flex:1}
.forum-action{width:32px;height:32px;border:none;background:rgba(255,255,255,.15);color:#fff;font-size:14px;cursor:pointer;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background .15s;
  &:hover{background:rgba(255,255,255,.25)}}

.section-list{flex:1;overflow-y:auto;padding:6px 0;&::-webkit-scrollbar{width:3px}&::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:3px}}
.section-card{display:flex;align-items:center;gap:10px;padding:14px 14px;background:#fff;border-bottom:1px solid #e8e8ee;cursor:pointer;transition:background .1s;
  &:hover{background:#f7f8fb}&:active{background:#eef0f6}}
.sec-icon{font-size:1.8rem;width:40px;text-align:center;flex-shrink:0}
.sec-info{flex:1;min-width:0}
.sec-name{font-size:14px;font-weight:600;color:#1a1a2e}
.sec-desc{font-size:11px;color:#8a8a9a;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sec-arrow{color:#8a8a9a;font-size:16px}

.post-list{flex:1;overflow-y:auto;&::-webkit-scrollbar{width:3px}&::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:3px}}
.post-list-hdr{display:flex;align-items:center;padding:10px 14px;background:#fff;border-bottom:1px solid #e8e8ee;position:sticky;top:0;z-index:2;font-size:14px;font-weight:700;color:#1a1a2e}
.post-count{font-size:11px;color:#8a8a9a;margin-left:8px;font-weight:400}
.post-card{background:#fff;padding:14px 14px 8px;border-bottom:1px solid #e8e8ee;cursor:pointer;transition:background .1s;
  &:active{background:#f5f6f9}}
.post-title{font-size:13px;font-weight:600;color:#1a1a2e;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.post-preview{font-size:11px;color:#8a8a9a;line-height:1.5;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.post-meta{display:flex;align-items:center;gap:10px;margin-top:6px;font-size:10.5px;color:#8a8a9a}
.meta-author{color:#2b7eed}.meta-replies{color:#ff6b35}

.hot-comment{margin-top:8px;padding:8px 10px;background:#f7f8fb;border-radius:8px;border-left:3px solid #ff6b35;font-size:11px}
.hot-label{color:#ff6b35;font-weight:700;font-size:10px;margin-right:4px}
.hot-content{color:#1a1a2e;line-height:1.5}
.hot-meta{display:flex;align-items:center;gap:8px;margin-top:3px;font-size:10px;color:#8a8a9a}
.hot-likes{color:#ff6b35;font-weight:600}

/* Leaderboard */
.lb-panel{flex:1;overflow-y:auto}
.lb-banner{background:linear-gradient(135deg,#1a1a2e,#2d1b4e);padding:20px 14px;text-align:center;color:#fff}
.lb-name{font-size:1.2rem;font-weight:900;letter-spacing:3px;color:#e0c878;text-shadow:0 0 20px rgba(200,168,78,.4)}
.lb-sub{font-size:10px;color:rgba(255,255,255,.5);margin-top:4px}
.lb-list{padding:6px 0}
.lb-item{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-bottom:1px solid #e8e8ee}
.lb-rank{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;flex-shrink:0;
  .lb-item:nth-child(1) &,.lb-item:nth-child(2) &,.lb-item:nth-child(3) &{background:linear-gradient(135deg,#f5af19,#f12711);box-shadow:0 2px 8px rgba(245,175,25,.3)}
  .lb-item:nth-child(n+4) &{background:#8a8a9a}}
.lb-info{flex:1;min-width:0}
.lb-title{font-size:12px;font-weight:700;color:#1a1a2e}
.lb-detail{font-size:10px;color:#8a8a9a;margin-top:2px;display:flex;gap:8px}
.lb-lv{font-weight:600;color:#2b7eed}
.lb-team{color:#8a8a9a;font-size:10px;text-align:right;flex-shrink:0}

/* API Config */
.api-body{flex:1;padding:14px;overflow-y:auto;background:#f2f4f7}
.api-hint{font-size:11px;color:#8a8a9a;margin-bottom:10px}
.api-body label{display:block;font-size:12px;font-weight:600;color:#1a1a2e;margin:10px 0 4px}
.api-body input{width:100%;padding:8px 10px;border:1px solid #e8e8ee;border-radius:8px;font-size:12px;color:#1a1a2e;background:#fff;outline:none;
  &:focus{border-color:#2b7eed}}
.api-save{width:100%;margin-top:18px;padding:10px;background:#2b7eed;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;
  &:hover{filter:brightness(1.1)}}
.api-refresh{width:100%;margin-top:8px;padding:10px;background:#8a8a9a;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;
  &:hover{filter:brightness(1.1)}}

/* Reduced motion overrides */
:deep(.st-reduce-motion) .lament-cube,:deep(.st-reduce-motion) .phone-frame{transition:none!important;animation:none!important}
</style>
