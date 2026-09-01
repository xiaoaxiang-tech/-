<script setup lang="ts">
// ============ 牛皮纸卷轴世界地图（小型）============
// 不是全屏游戏地图，而是一个居中的小卷轴弹窗
// 牛皮纸展开效果，上面用小像素画展示关卡特色
// 默认所有关卡都是虚影，"已到达"（已解锁，无论是否通关）才具象化
// 通关后展示到下一关的虚线连接动画
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import { LEVEL_CONFIGS } from '@/game/scenes/LevelConfigs'
import { soundEngine } from '@/game/engine/SoundEngine'

const store = useGameStore()
const levels = LEVEL_CONFIGS

const canvasRef = ref<HTMLCanvasElement | null>(null)
// 卷轴内绘制区域尺寸（不含两侧卷轴杆）—— 小型化
const PAPER_W = 760, PAPER_H = 420
const ROD_W = 26
const W = PAPER_W + ROD_W * 2
const H = PAPER_H + 72  // 上下留白用于卷轴杆

// 每关在牛皮纸上的位置（小型布局，蛇形从左到右）
// 起点废墟 → 草原 → 森林 → 火山 → 雪山 → 洞窟 → 沙漠 → 天空 → 城堡（8关）
const NODES = [
  { x: 110, y: 320, region: 'grass',   title: '翠绿草原' },
  { x: 218, y: 235, region: 'forest',  title: '暗夜森林' },
  { x: 326, y: 150, region: 'volcano', title: '炎之火山' },
  { x: 434, y: 95,  region: 'ice',     title: '永冻雪山' },
  { x: 542, y: 150, region: 'abyss',   title: '深渊洞窟' },
  { x: 650, y: 235, region: 'sand',    title: '金色沙漠' },
  { x: 650, y: 330, region: 'sky',     title: '浮空云巅' },
  { x: 560, y: 378, region: 'castle',  title: '王者城堡' },
]
const START = { x: 52,  y: 372 }

let rafId = 0
let frame = 0
const hoverNode = ref<number>(-1)
const pressedNode = ref<number>(-1)
const unfoldAnim = ref(0)  // 卷轴展开动画进度 0~1

// 状态
// "已到达" = store.unlockedLevels >= levelId（即解锁，未通关也算到达）
function isReached(levelId: number): boolean { return levelId <= store.unlockedLevels }
function isCompleted(levelId: number): boolean { return levelId < store.unlockedLevels }
function isCurrent(levelId: number): boolean { return levelId === store.unlockedLevels }
function enterLevel(levelId: number) {
  if (!isReached(levelId)) return
  soundEngine.playButtonClick()
  store.setCurrentLevel(levelId)
  // 同步已激活宠物到全局变量，供 GameScene 读取
  const activePet = store.activePet
  ;(window as any).__activePetConfig = activePet?.unlocked ? activePet.config : null
  store.setState('storyIntro')
}
function backToMenu() { soundEngine.playButtonClick(); store.setState('menu') }
function openPets() { soundEngine.playButtonClick(); store.setState('petPanel') }
const petCount = computed(() => store.pets.filter(p => p.unlocked).length)
const totalPets = computed(() => store.pets.length)

// ============ 像素工具 ============
function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

// ============ 牛皮纸背景 ============
function drawParchment(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // 主色：明亮的米黄牛皮纸（确保和深色卷轴杆形成强对比）
  const grad = ctx.createLinearGradient(x, y, x + w, y + h)
  grad.addColorStop(0, '#f5e3a8')
  grad.addColorStop(0.5, '#e8c87a')
  grad.addColorStop(1, '#c89848')
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)

  // 纸张纹理（点状）—— 适配小尺寸
  ctx.fillStyle = 'rgba(80,50,20,0.10)'
  for (let i = 0; i < 120; i++) {
    const px2 = x + (i * 137) % w
    const py2 = y + (i * 73) % h
    ctx.fillRect(px2, py2, 1, 1)
  }
  // 阴影斑（不规则深色块）
  ctx.fillStyle = 'rgba(80,40,10,0.08)'
  for (let i = 0; i < 8; i++) {
    const px2 = x + (i * 91) % w
    const py2 = y + (i * 47) % h
    ctx.beginPath()
    ctx.ellipse(px2, py2, 14 + (i * 7) % 12, 8 + (i * 5) % 6, (i * 0.3), 0, Math.PI * 2)
    ctx.fill()
  }
  // 烧焦边（深色加粗，更明显）
  ctx.fillStyle = 'rgba(60,30,5,0.55)'
  ctx.fillRect(x, y, w, 2)
  ctx.fillRect(x, y + h - 2, w, 2)
  ctx.fillRect(x, y, 2, h)
  ctx.fillRect(x + w - 2, y, 2, h)
  // 内侧金边（让牛皮纸更突出）
  ctx.fillStyle = 'rgba(255,220,120,0.6)'
  ctx.fillRect(x + 2, y + 2, w - 4, 1)
  ctx.fillRect(x + 2, y + 2, 1, h - 4)
  // 边缘磨损（不规则小三角）
  ctx.fillStyle = 'rgba(120,70,30,0.5)'
  for (let i = 0; i < 20; i++) {
    const ex = x + (i * (w / 20))
    const ey = y + ((i * 7) % 3)
    ctx.beginPath()
    ctx.moveTo(ex, ey)
    ctx.lineTo(ex + 4, ey)
    ctx.lineTo(ex + 2, ey - 2 - (i % 3))
    ctx.fill()
    const ey2 = y + h - ((i * 5) % 3)
    ctx.beginPath()
    ctx.moveTo(ex, ey2)
    ctx.lineTo(ex + 4, ey2)
    ctx.lineTo(ex + 2, ey2 + 2 + (i % 3))
    ctx.fill()
  }
}

// ============ 两侧卷轴杆 ============
function drawRod(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  // 杆身（深棕木质）
  const grad = ctx.createLinearGradient(x, y, x + ROD_W, y)
  grad.addColorStop(0, '#3a1a08')
  grad.addColorStop(0.4, '#8a5028')
  grad.addColorStop(0.6, '#a06030')
  grad.addColorStop(1, '#3a1a08')
  ctx.fillStyle = grad
  ctx.fillRect(x, y, ROD_W, h)
  // 顶端球
  ctx.fillStyle = '#5a2a10'
  ctx.beginPath()
  ctx.arc(x + ROD_W / 2, y - 4, ROD_W / 2 + 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8a5028'
  ctx.beginPath()
  ctx.arc(x + ROD_W / 2 - 2, y - 6, 4, 0, Math.PI * 2)
  ctx.fill()
  // 底端球
  ctx.fillStyle = '#5a2a10'
  ctx.beginPath()
  ctx.arc(x + ROD_W / 2, y + h + 4, ROD_W / 2 + 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#8a5028'
  ctx.beginPath()
  ctx.arc(x + ROD_W / 2 - 2, y + h + 6, 4, 0, Math.PI * 2)
  ctx.fill()
  // 金属环
  ctx.fillStyle = '#c89020'
  ctx.fillRect(x - 2, y + 10, ROD_W + 4, 3)
  ctx.fillRect(x - 2, y + h - 13, ROD_W + 4, 3)
}

// ============ 关卡特色小像素画 ============
// 16×16 基础尺寸，缩放绘制
function drawLevelIcon(ctx: CanvasRenderingContext2D, region: string, cx: number, cy: number, scale: number, ghost: boolean) {
  const s = scale
  // 草原：松树+花
  if (region === 'grass') {
    const trunk = ghost ? '#888' : '#5a3a1a'
    const leaf  = ghost ? '#aaa' : '#2a6a2a'
    const high  = ghost ? '#bbb' : '#4a8c4a'
    const flower= ghost ? '#999' : '#ff4466'
    // 松树
    px(ctx, cx - 1*s, cy + 4*s, 2*s, 4*s, trunk)
    px(ctx, cx - 3*s, cy + 0*s, 6*s, 4*s, leaf)
    px(ctx, cx - 4*s, cy - 4*s, 8*s, 4*s, leaf)
    px(ctx, cx - 2*s, cy - 8*s, 4*s, 4*s, leaf)
    px(ctx, cx - 1*s, cy - 10*s, 2*s, 2*s, leaf)
    if (!ghost) px(ctx, cx - 3*s, cy - 6*s, 1*s, 2*s, high)
    // 小花
    px(ctx, cx + 5*s, cy + 5*s, 1*s, 1*s, flower)
    px(ctx, cx + 4*s, cy + 6*s, 3*s, 1*s, flower)
    px(ctx, cx + 5*s, cy + 7*s, 1*s, 2*s, ghost ? '#999' : '#3a8a3a')
  }
  // 森林：月亮+枯树
  else if (region === 'forest') {
    const moon = ghost ? '#aaa' : '#fff8d0'
    const tree = ghost ? '#888' : '#1a0e1a'
    // 月
    px(ctx, cx + 3*s, cy - 8*s, 6*s, 6*s, moon)
    if (!ghost) {
      px(ctx, cx + 4*s, cy - 7*s, 4*s, 4*s, '#fff')
      px(ctx, cx + 5*s, cy - 6*s, 2*s, 2*s, '#ddd8a0')
    }
    // 枯树
    px(ctx, cx - 1*s, cy + 2*s, 2*s, 8*s, tree)
    px(ctx, cx - 3*s, cy + 4*s, 3*s, 1*s, tree)
    px(ctx, cx + 2*s, cy + 6*s, 3*s, 1*s, tree)
    px(ctx, cx - 4*s, cy + 2*s, 2*s, 1*s, tree)
    px(ctx, cx + 2*s, cy + 0*s, 2*s, 1*s, tree)
  }
  // 火山：熔岩山+火焰
  else if (region === 'volcano') {
    const rock = ghost ? '#999' : '#3a1a0a'
    const lava1 = ghost ? '#aaa' : '#ff4400'
    const lava2 = ghost ? '#bbb' : '#ff8800'
    const lava3 = ghost ? '#ccc' : '#ffff00'
    px(ctx, cx - 6*s, cy + 2*s, 12*s, 6*s, rock)
    px(ctx, cx - 4*s, cy - 2*s, 8*s, 4*s, rock)
    px(ctx, cx - 2*s, cy - 6*s, 4*s, 4*s, rock)
    if (!ghost) {
      // 火焰
      for (let i = 0; i < 2; i++) {
        const fx = cx + (i - 0.5) * 4 * s
        const fh = 6 * s
        for (let y = 0; y < fh; y += 2) {
          const w = 2 * s - Math.floor(y / (fh / 2))
          const color = y < fh / 3 ? lava3 : y < (fh * 2) / 3 ? lava2 : lava1
          px(ctx, fx, cy - 8 * s - y, w, 2, color)
        }
      }
    }
  }
  // 冰原：雪峰+暴雪+冰晶
  else if (region === 'ice') {
    const peak = ghost ? '#aaa' : '#dceef8'
    const peak2 = ghost ? '#bbb' : '#a8d8f0'
    const snow = ghost ? '#ccc' : '#f0faff'
    const icec = ghost ? '#bbb' : '#66c8f0'
    // 雪峰
    px(ctx, cx - 6*s, cy + 3*s, 12*s, 5*s, peak2)
    px(ctx, cx - 4*s, cy - 1*s, 8*s, 4*s, peak2)
    px(ctx, cx - 2*s, cy - 5*s, 4*s, 4*s, peak)
    if (!ghost) {
      // 雪顶
      px(ctx, cx - 2*s, cy - 5*s, 2*s, 2*s, snow)
      px(ctx, cx - 4*s, cy - 1*s, 2*s, 2*s, snow)
      px(ctx, cx + 1*s, cy - 1*s, 2*s, 2*s, snow)
      // 飘雪
      px(ctx, cx - 5*s, cy - 8*s, 1*s, 1*s, snow)
      px(ctx, cx + 1*s, cy - 10*s, 1*s, 1*s, snow)
      px(ctx, cx + 5*s, cy - 6*s, 1*s, 1*s, snow)
      // 冰晶
      px(ctx, cx - 5*s, cy + 7*s, 2*s, 2*s, icec)
      px(ctx, cx + 5*s, cy + 6*s, 2*s, 2*s, icec)
    }
  }
  // 深渊：黑暗王座+虚空之眼
  else if (region === 'abyss') {
    const dark = ghost ? '#888' : '#12041a'
    const dark2 = ghost ? '#999' : '#241040'
    const eye = ghost ? '#aaa' : '#c060ff'
    // 王座塔
    px(ctx, cx - 5*s, cy + 2*s, 10*s, 6*s, dark)
    px(ctx, cx - 2*s, cy - 8*s, 4*s, 10*s, dark)
    px(ctx, cx - 3*s, cy - 10*s, 6*s, 2*s, dark)
    for (let bx = -5; bx < 5; bx += 2) {
      px(ctx, cx + bx*s, cy + 0*s, 1*s, 2*s, dark2)
    }
    if (!ghost) {
      // 塔尖紫焰
      px(ctx, cx - 1*s, cy - 13*s, 2*s, 3*s, eye)
      px(ctx, cx - 2*s, cy - 12*s, 1*s, 2*s, '#ff7a5a')
      // 虚空之眼
      px(ctx, cx - 1*s, cy - 6*s, 2*s, 3*s, eye)
      px(ctx, cx + 1*s, cy - 6*s, 1*s, 3*s, eye)
      px(ctx, cx - 2*s, cy - 5*s, 1*s, 2*s, eye)
      // 地面裂隙
      px(ctx, cx - 4*s, cy + 4*s, 1*s, 2*s, '#ff5a6a')
      px(ctx, cx + 3*s, cy + 5*s, 1*s, 2*s, '#ff5a6a')
    }
  }

  // 沙漠：金字塔 + 仙人掌
  else if (region === 'sand') {
    const sand = ghost ? '#888' : '#d9a13b'
    const sand2 = ghost ? '#999' : '#f2c35e'
    const dark = ghost ? '#777' : '#9a6a1e'
    const cactus = ghost ? '#999' : '#4a8a3a'
    // 金字塔
    px(ctx, cx - 5*s, cy + 2*s, 10*s, 6*s, sand)
    px(ctx, cx - 3*s, cy - 4*s, 6*s, 6*s, sand)
    px(ctx, cx - 1*s, cy - 8*s, 2*s, 4*s, sand)
    if (!ghost) {
      // 金字塔光芒
      px(ctx, cx - 3*s, cy - 2*s, 2*s, 2*s, '#ffe9a8')
      px(ctx, cx - 1*s, cy - 6*s, 2*s, 2*s, '#fff0c0')
      // 沙纹
      px(ctx, cx - 4*s, cy + 6*s, 3*s, 1*s, sand2)
      px(ctx, cx + 2*s, cy + 7*s, 3*s, 1*s, sand2)
      // 仙人掌
      px(ctx, cx + 6*s, cy + 2*s, 2*s, 6*s, cactus)
      px(ctx, cx + 5*s, cy + 3*s, 2*s, 1*s, cactus)
      px(ctx, cx + 7*s, cy + 5*s, 2*s, 1*s, cactus)
      // 圣甲虫
      px(ctx, cx - 6*s, cy + 6*s, 2*s, 1*s, dark)
    }
  }
  // 天空：浮岛 + 云朵
  else if (region === 'sky') {
    const cloud = ghost ? '#aaa' : '#e6f4ff'
    const cloud2 = ghost ? '#bbb' : '#bde3ff'
    const island = ghost ? '#999' : '#8a5a2a'
    const grass = ghost ? '#999' : '#5a8a3a'
    // 浮岛
    px(ctx, cx - 5*s, cy + 3*s, 10*s, 4*s, island)
    px(ctx, cx - 3*s, cy + 1*s, 6*s, 2*s, island)
    px(ctx, cx - 5*s, cy + 1*s, 10*s, 1*s, grass)
    if (!ghost) {
      // 悬石
      px(ctx, cx + 7*s, cy + 5*s, 3*s, 3*s, island)
      // 云朵
      px(ctx, cx - 2*s, cy - 8*s, 5*s, 2*s, cloud)
      px(ctx, cx + 1*s, cy - 10*s, 4*s, 2*s, cloud)
      px(ctx, cx - 4*s, cy - 9*s, 3*s, 2*s, cloud2)
      // 光芒
      px(ctx, cx - 1*s, cy - 3*s, 2*s, 2*s, '#fff6c0')
      // 星星
      px(ctx, cx - 7*s, cy - 11*s, 1*s, 1*s, '#fff')
      px(ctx, cx + 7*s, cy - 9*s, 1*s, 1*s, '#fff')
    }
  }
  // 城堡：王城塔楼 + 旗帜
  else if (region === 'castle') {
    const stone = ghost ? '#999' : '#6a6a76'
    const stone2 = ghost ? '#aaa' : '#8a8a96'
    const roof = ghost ? '#888' : '#7f1d1d'
    const gold = ghost ? '#999' : '#d4af37'
    // 城墙
    px(ctx, cx - 7*s, cy + 2*s, 14*s, 6*s, stone)
    px(ctx, cx - 5*s, cy - 2*s, 10*s, 4*s, stone)
    // 塔楼
    px(ctx, cx - 4*s, cy - 8*s, 3*s, 6*s, stone2)
    px(ctx, cx + 1*s, cy - 8*s, 3*s, 6*s, stone2)
    // 塔顶
    px(ctx, cx - 4*s, cy - 10*s, 3*s, 2*s, roof)
    px(ctx, cx + 1*s, cy - 10*s, 3*s, 2*s, roof)
    // 主塔
    px(ctx, cx - 1*s, cy - 13*s, 2*s, 5*s, stone2)
    px(ctx, cx - 2*s, cy - 15*s, 4*s, 2*s, roof)
    if (!ghost) {
      // 旗帜
      px(ctx, cx + 1*s, cy - 17*s, 3*s, 2*s, '#ffcc00')
      px(ctx, cx + 1*s, cy - 19*s, 1*s, 2*s, '#b91c1c')
      // 窗户
      px(ctx, cx - 6*s, cy + 1*s, 2*s, 2*s, '#ffd54a')
      px(ctx, cx + 4*s, cy + 1*s, 2*s, 2*s, '#ffd54a')
      px(ctx, cx - 3*s, cy - 4*s, 2*s, 2*s, '#ffd54a')
      px(ctx, cx + 1*s, cy - 4*s, 2*s, 2*s, '#ffd54a')
      // 城门
      px(ctx, cx - 1*s, cy + 5*s, 2*s, 3*s, '#1a0a0a')
      // 金冠装饰
      px(ctx, cx - 1*s, cy - 16*s, 2*s, 1*s, gold)
    }
  }
}

// 起点：废墟
function drawStartIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, ghost: boolean) {
  const s = scale
  const c = ghost ? '#999' : '#3a2a3a'
  const glow = ghost ? '#aaa' : '#ff8800'
  px(ctx, cx - 5*s, cy - 2*s, 10*s, 6*s, c)
  px(ctx, cx - 1*s, cy - 8*s, 2*s, 6*s, c)
  px(ctx, cx - 2*s, cy - 10*s, 4*s, 2*s, c)
  px(ctx, cx - 4*s, cy - 6*s, 2*s, 4*s, c)
  px(ctx, cx + 2*s, cy - 6*s, 2*s, 4*s, c)
  // 透光
  if (!ghost) {
    px(ctx, cx - 1*s, cy - 6*s, 2*s, 2*s, glow)
    px(ctx, cx - 3*s, cy - 4*s, 1*s, 2*s, glow)
    px(ctx, cx + 3*s, cy - 4*s, 1*s, 2*s, glow)
  }
}
// 终点：魔王城
function drawEndIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, ghost: boolean) {
  const s = scale
  const c = ghost ? '#777' : '#1a0a1a'
  const eye = ghost ? '#aaa' : '#ff4040'
  px(ctx, cx - 6*s, cy - 2*s, 12*s, 6*s, c)
  px(ctx, cx - 2*s, cy - 12*s, 4*s, 10*s, c)
  px(ctx, cx - 3*s, cy - 14*s, 6*s, 2*s, c)
  // 城垛
  for (let bx = -6; bx < 6; bx += 2) {
    px(ctx, cx + bx*s, cy - 4*s, 1*s, 2*s, c)
  }
  // 邪眼
  if (!ghost) {
    px(ctx, cx - 1*s, cy - 10*s, 1*s, 2*s, eye)
    px(ctx, cx + 1*s, cy - 10*s, 1*s, 2*s, eye)
  }
}

// ============ 节点绘制（小型）============
function drawNode(ctx: CanvasRenderingContext2D, levelId: number, t: number) {
  const node = NODES[levelId]!
  const lv = levels[levelId]!
  const cx = node.x, cy = node.y
  const reached = isReached(levelId)
  const completed = isCompleted(levelId)
  const current = isCurrent(levelId)
  const ghost = !reached  // 未到达=虚影

  // 圆盘底座（小型 r=20）
  const r = 20
  // 阴影
  ctx.fillStyle = 'rgba(60,30,10,0.4)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + r + 2, r, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  if (ghost) {
    // 虚影：灰色半透明
    ctx.fillStyle = 'rgba(80,60,40,0.4)'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(100,80,60,0.6)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 2])
    ctx.stroke()
    ctx.setLineDash([])
  } else {
    // 具象化
    const grad = ctx.createRadialGradient(cx - 5, cy - 5, 3, cx, cy, r)
    if (current) {
      grad.addColorStop(0, '#ffe890')
      grad.addColorStop(1, '#8a6010')
    } else if (completed) {
      grad.addColorStop(0, '#c0e8a0')
      grad.addColorStop(1, '#5a8a3a')
    } else {
      grad.addColorStop(0, '#e8d0a0')
      grad.addColorStop(1, '#8a6a3a')
    }
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = current ? '#ffd700' : completed ? '#4a8a3a' : '#8a6a3a'
    ctx.lineWidth = current ? 2 : 1
    ctx.stroke()

    // 当前关卡脉冲
    if (current) {
      const pulse = (Math.sin(t * 0.08) + 1) / 2
      ctx.strokeStyle = `rgba(255,215,0,${0.4 + pulse * 0.4})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, r + 3 + pulse * 2, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // 小图标（缩放 1.8）
  drawLevelIcon(ctx, node.region, cx, cy - 2, 1.8, ghost)

  // 名称（小字）
  ctx.font = 'bold 10px "Microsoft YaHei", serif'
  ctx.textAlign = 'center'
  ctx.shadowColor = 'rgba(60,30,10,0.8)'
  ctx.shadowBlur = 2
  ctx.fillStyle = ghost ? 'rgba(80,60,40,0.6)' : (current ? '#5a2a00' : completed ? '#3a5a1a' : '#4a2a10')
  ctx.fillText(lv.name, cx, cy + r + 12)
  ctx.shadowBlur = 0

  // 徽章（极小）
  if (completed) {
    px(ctx, cx + r - 5, cy - r + 1, 8, 8, '#4a8a3a')
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx + r - 3, cy - r + 5)
    ctx.lineTo(cx + r - 2, cy - r + 6)
    ctx.lineTo(cx + r + 1, cy - r + 3)
    ctx.stroke()
  } else if (current) {
    const blink = Math.sin(t * 0.12) > 0
    if (blink) {
      px(ctx, cx + r - 5, cy - r + 1, 8, 8, '#ffd700')
      px(ctx, cx + r - 2, cy - r + 3, 2, 4, '#000')
    }
  } else if (ghost) {
    // 锁（极小）
    px(ctx, cx + r - 5, cy - r + 1, 8, 8, 'rgba(80,60,40,0.7)')
    px(ctx, cx + r - 3, cy - r + 3, 4, 4, '#bbb')
    px(ctx, cx + r - 2, cy - r + 4, 2, 2, '#000')
  }

  // 悬停高亮
  if (hoverNode.value === levelId && reached) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath()
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

// ============ 起点 / 终点（小型）============
function drawStartEnd(ctx: CanvasRenderingContext2D, t: number) {
  // 起点：始终具象（开始就在那）
  drawStartIcon(ctx, START.x, START.y, 1.5, false)
  ctx.font = 'bold 9px "Microsoft YaHei", serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#5a2a00'
  ctx.fillText('故乡废墟', START.x, START.y + 18)

  // 终点标记（最后一关就是最终关，深渊主宰沉眠于深渊王座）
  const lastNode = NODES[NODES.length - 1]!
  const finalReached = store.unlockedLevels >= NODES.length - 1
  // 在最后一关上方显示"最终决战"标记
  ctx.font = 'bold 8px "Microsoft YaHei", serif'
  ctx.fillStyle = finalReached ? '#aa2200' : 'rgba(120,40,40,0.5)'
  ctx.fillText('最终决战', lastNode.x, lastNode.y - 32)
  // 装饰小剑
  px(ctx, lastNode.x - 1, lastNode.y - 28, 2, 5, finalReached ? '#aa2200' : 'rgba(120,40,40,0.5)')
  px(ctx, lastNode.x - 3, lastNode.y - 26, 6, 1, finalReached ? '#aa2200' : 'rgba(120,40,40,0.5)')
}

// ============ 连线（小型）============
function drawPaths(ctx: CanvasRenderingContext2D, t: number) {
  const points = [START, ...NODES]
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!
    const b = points[i + 1]!
    const segCompleted = i < store.unlockedLevels  // 已通
    const isNext = i === store.unlockedLevels       // 指向下一目标
    // 控制点
    const cx = (a.x + b.x) / 2
    const cy = (a.y + b.y) / 2 - 15

    ctx.save()
    if (segCompleted) {
      // 已通：墨实线
      ctx.strokeStyle = '#5a2a00'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo(cx, cy, b.x, b.y)
      ctx.stroke()
    } else if (isNext) {
      // 下一目标：虚线动画（墨色）
      ctx.strokeStyle = '#5a2a00'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.lineDashOffset = -t * 0.4
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo(cx, cy, b.x, b.y)
      ctx.stroke()
      ctx.setLineDash([])
      // 小箭头（指向 b）
      const angle = Math.atan2(b.y - cy, b.x - cx)
      ctx.fillStyle = '#5a2a00'
      ctx.beginPath()
      ctx.moveTo(b.x - Math.cos(angle) * 22, b.y - Math.sin(angle) * 22)
      ctx.lineTo(b.x - Math.cos(angle - 0.5) * 16, b.y - Math.sin(angle - 0.5) * 16)
      ctx.lineTo(b.x - Math.cos(angle + 0.5) * 16, b.y - Math.sin(angle + 0.5) * 16)
      ctx.closePath()
      ctx.fill()
    } else {
      // 未激活：极淡虚线
      ctx.strokeStyle = 'rgba(80,60,40,0.25)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 3])
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo(cx, cy, b.x, b.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    ctx.restore()
  }
}

// ============ 牛皮纸上的装饰小元素（罗盘、海怪、风纹）============
function drawParchmentDecor(ctx: CanvasRenderingContext2D) {
  // 右上角小罗盘
  const cx = PAPER_W - 40, cy = 30
  ctx.strokeStyle = '#5a2a00'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, 12, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, 8, 0, Math.PI * 2)
  ctx.stroke()
  // 指针
  ctx.fillStyle = '#5a2a00'
  ctx.beginPath()
  ctx.moveTo(cx, cy - 10)
  ctx.lineTo(cx - 2, cy)
  ctx.lineTo(cx + 2, cy)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#8a3a00'
  ctx.beginPath()
  ctx.moveTo(cx, cy + 10)
  ctx.lineTo(cx - 2, cy)
  ctx.lineTo(cx + 2, cy)
  ctx.closePath()
  ctx.fill()
  // N 字
  ctx.font = 'bold 8px serif'
  ctx.fillStyle = '#5a2a00'
  ctx.textAlign = 'center'
  ctx.fillText('N', cx, cy - 15)

  // 左下角小风纹（卷云）
  ctx.strokeStyle = 'rgba(90,42,0,0.4)'
  ctx.lineWidth = 1
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(30 + i * 8, PAPER_H - 30, 8 + i * 2, 0.2, Math.PI - 0.2)
    ctx.stroke()
  }

  // 中部下方的海浪线（隔开区域）
  ctx.strokeStyle = 'rgba(90,42,0,0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x < PAPER_W; x += 4) {
    const y = PAPER_H - 60 + Math.sin(x * 0.1) * 2
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 几只海鸟（小 M 形）
  ctx.strokeStyle = 'rgba(90,42,0,0.5)'
  ctx.lineWidth = 1
  const birds = [[80, 40], [200, 30], [380, 50]]
  for (const bird of birds) {
    const bx = bird[0] ?? 0
    const by = bird[1] ?? 0
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.quadraticCurveTo(bx + 3, by - 3, bx + 6, by)
    ctx.quadraticCurveTo(bx + 9, by - 3, bx + 12, by)
    ctx.stroke()
  }
}

// ============ 鼠标交互 ============
function getCanvasPos(e: MouseEvent) {
  const c = canvasRef.value!
  const rect = c.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) * (W / rect.width),
    y: (e.clientY - rect.top) * (H / rect.height),
  }
}
function hitNode(x: number, y: number): number {
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i]!
    const dx = x - n.x, dy = y - n.y
    if (dx * dx + dy * dy < 18 * 18) return i
  }
  return -1
}
function onMouseMove(e: MouseEvent) {
  const p = getCanvasPos(e)
  hoverNode.value = hitNode(p.x, p.y)
  canvasRef.value!.style.cursor = (hoverNode.value >= 0 && isReached(hoverNode.value)) ? 'pointer' : 'default'
}
function onMouseDown(e: MouseEvent) {
  const p = getCanvasPos(e)
  pressedNode.value = hitNode(p.x, p.y)
}
function onMouseUp(e: MouseEvent) {
  const p = getCanvasPos(e)
  const idx = hitNode(p.x, p.y)
  const wasPressed = pressedNode.value
  pressedNode.value = -1
  if (idx >= 0 && idx === wasPressed && isReached(idx)) {
    enterLevel(idx)
  }
}

// ============ 渲染 ============
function render() {
  const c = canvasRef.value
  if (!c) return
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, W, H)

  // 展开动画进度
  if (unfoldAnim.value < 1) {
    unfoldAnim.value = Math.min(1, unfoldAnim.value + 0.04)
  }
  const unfold = unfoldAnim.value
  // easeOut
  const ease = 1 - Math.pow(1 - unfold, 3)

  // 1. 卷轴整体（居中）
  // 顶部标题（在卷轴上方）
  ctx.font = 'bold 14px "Microsoft YaHei", serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffd700'
  ctx.shadowColor = '#000'
  ctx.shadowBlur = 2
  ctx.fillText('— 世界地图卷轴 —', W / 2, 14)
  ctx.shadowBlur = 0

  // 2. 左侧卷轴杆（始终可见）
  drawRod(ctx, 0, 36, PAPER_H)

  // 3. 牛皮纸（从左杆展开）
  const paperX = ROD_W
  const paperY = 36
  const visibleW = PAPER_W * ease
  ctx.save()
  ctx.beginPath()
  ctx.rect(paperX, paperY, visibleW, PAPER_H)
  ctx.clip()
  // 牛皮纸底
  drawParchment(ctx, paperX, paperY, PAPER_W, PAPER_H)
  // 装饰
  drawParchmentDecor(ctx)
  // 连线
  drawPaths(ctx, frame)
  // 起终点
  drawStartEnd(ctx, frame)
  // 关卡节点
  for (let i = 0; i < NODES.length; i++) {
    drawNode(ctx, i, frame)
  }
  ctx.restore()

  // 4. 右侧卷轴杆（跟随展开位置）
  drawRod(ctx, paperX + visibleW - ROD_W, 36, PAPER_H)

  // 5. 悬停信息浮层（小）
  if (hoverNode.value >= 0 && unfold >= 1) {
    const lv = levels[hoverNode.value]!
    const n = NODES[hoverNode.value]!
    const tx = n.x + 30 > PAPER_W - 140 ? n.x - 160 : n.x + 30
    const ty = n.y - 20
    // 小信息框（牛皮纸风格）
    ctx.fillStyle = 'rgba(232,201,135,0.95)'
    ctx.fillRect(tx, ty, 130, 50)
    ctx.strokeStyle = '#5a2a00'
    ctx.lineWidth = 1
    ctx.strokeRect(tx, ty, 130, 50)
    ctx.font = 'bold 10px "Microsoft YaHei", serif'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#5a2a00'
    ctx.fillText(lv.name, tx + 6, ty + 14)
    ctx.font = '9px "Microsoft YaHei", serif'
    ctx.fillStyle = '#4a2a10'
    ctx.fillText(`Boss: ${lv.bossName}`, tx + 6, ty + 28)
    ctx.fillStyle = isReached(hoverNode.value) ? '#2a5a2a' : '#8a4a2a'
    ctx.fillText(isReached(hoverNode.value) ? '点击进入 →' : '尚未到达', tx + 6, ty + 42)
  }

  frame++
  rafId = requestAnimationFrame(render)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') backToMenu()
}

onMounted(() => {
  const c = canvasRef.value!
  c.width = W
  c.height = H
  c.addEventListener('mousemove', onMouseMove)
  c.addEventListener('mousedown', onMouseDown)
  c.addEventListener('mouseup', onMouseUp)
  c.addEventListener('mouseleave', () => { hoverNode.value = -1; pressedNode.value = -1 })
  window.addEventListener('keydown', onKeydown)
  render()
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  const c = canvasRef.value
  if (c) {
    c.removeEventListener('mousemove', onMouseMove)
    c.removeEventListener('mousedown', onMouseDown)
    c.removeEventListener('mouseup', onMouseUp)
  }
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="scroll-map-wrapper">
    <!-- 半透明遮罩 -->
    <div class="scroll-backdrop"></div>

    <!-- 卷轴 canvas -->
    <canvas ref="canvasRef" class="scroll-canvas"></canvas>

    <!-- 顶部按钮（HTML 覆盖层）-->
    <div class="scroll-header">
      <button class="scroll-btn" @click="backToMenu">← 返回</button>
      <button class="scroll-btn pet-btn" @click="openPets">
        <span>宠物</span>
        <span class="pet-count">{{ petCount }}/{{ totalPets }}</span>
      </button>
    </div>

    <!-- 底部进度信息 -->
    <div class="scroll-footer">
      <span>进度: {{ store.unlockedLevels }} / {{ levels.length }}</span>
      <span class="sep">|</span>
      <span>宠物: {{ petCount }} / {{ totalPets }}</span>
      <span class="sep">|</span>
      <span>第 {{ Math.min(store.storyProgress + 1, LEVEL_CONFIGS.length) }} 章</span>
    </div>
  </div>
</template>

<style scoped>
.scroll-map-wrapper {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.scroll-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}
.scroll-canvas {
  position: relative;
  z-index: 2;
  width: 812px;
  max-width: 94vw;
  height: auto;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  filter: drop-shadow(0 6px 18px rgba(0,0,0,0.7));
}

.scroll-header {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  z-index: 5;
  pointer-events: none;
}
.scroll-btn {
  pointer-events: auto;
  background: rgba(60,30,10,0.9);
  border: 2px solid #c89020;
  color: #ffd700;
  padding: 8px 18px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-family: 'Microsoft YaHei', serif;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
}
.scroll-btn:hover {
  background: rgba(120,70,30,0.95);
  box-shadow: 0 4px 12px rgba(200,144,32,0.6);
  transform: translateY(-1px);
}
.pet-btn { display: flex; align-items: center; gap: 6px; }
.pet-count { font-weight: bold; color: #fff; }

.scroll-footer {
  position: absolute;
  bottom: 12px;
  left: 0; right: 0;
  text-align: center;
  color: #c9a4ff;
  font-size: 12px;
  font-family: 'Microsoft YaHei', serif;
  z-index: 5;
}
.sep { color: #ffd700; margin: 0 8px; }
</style>
