// ============ UI 精灵图生成器（勇者之路风格像素艺术）============
// 生成真正的精灵图：按钮、面板、边框、标题Logo、图标
// 所有元素都是像素艺术，可作为 canvas 切片渲染

export interface UISprite {
  canvas: HTMLCanvasElement
  width: number
  height: number
}

const uiCache: Map<string, UISprite> = new Map()

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const cvs = document.createElement('canvas')
  cvs.width = width
  cvs.height = height
  const ctx = cvs.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return cvs
}

// 像素绘制
function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

// ============ 像素艺术按钮精灵图 ============
// 9-slice 风格：3 状态（normal/hover/pressed）× 3 段（左/中/右）布局
// 但我们做成完整按钮精灵图，三种状态水平排列
// 每个按钮 160x40，共 3 帧

export type ButtonStyle = 'primary' | 'secondary' | 'gold' | 'danger'

function drawPixelButton(ctx: CanvasRenderingContext2D, ox: number, oy: number, w: number, h: number, style: ButtonStyle, state: 'normal' | 'hover' | 'pressed') {
  // 配色（每个 style 对应一套像素色板）
  const palettes: Record<ButtonStyle, { base: string; light: string; dark: string; edge: string; text: string }> = {
    primary:   { base: '#3a5a9a', light: '#6a8acc', dark: '#1a3a6a', edge: '#0a1a3a', text: '#ffffff' },
    secondary: { base: '#3a3a4a', light: '#5a5a6a', dark: '#1a1a2a', edge: '#0a0a1a', text: '#cccccc' },
    gold:      { base: '#c89020', light: '#ffd040', dark: '#8a6010', edge: '#4a3000', text: '#fff8d0' },
    danger:    { base: '#a8281a', light: '#e04830', dark: '#68100a', edge: '#380400', text: '#ffe0d0' },
  }
  const p = palettes[style]

  // 状态偏移
  const stateOffset = state === 'pressed' ? 1 : 0
  const hoverBoost = state === 'hover' ? 1 : 0

  // 阴影（按下时消失）
  if (state !== 'pressed') {
    px(ctx, ox + 2, oy + h, w - 2, 2, 'rgba(0,0,0,0.4)')
  }

  // 主体（带 2px 圆角像素效果）
  const bx = ox + stateOffset
  const by = oy + stateOffset

  // 底边（深色）
  px(ctx, bx, by + h - 2, w, 2, p.edge)
  // 右边（深色）
  px(ctx, bx + w - 2, by, 2, h, p.edge)
  // 主体填充
  px(ctx, bx, by, w - 2, h - 2, p.base)
  // 顶部高光（浅色）
  px(ctx, bx + 2, by, w - 4, 2, p.light)
  // 左侧高光
  px(ctx, bx, by + 2, 2, h - 4, p.light)
  // 底内阴影
  px(ctx, bx + 2, by + h - 4, w - 4, 2, p.dark)
  // 右内阴影
  px(ctx, bx + w - 4, by + 2, 2, h - 4, p.dark)

  // hover 时加发光边框
  if (hoverBoost) {
    ctx.strokeStyle = p.light
    ctx.lineWidth = 1
    ctx.strokeRect(bx - 0.5, by - 0.5, w - 1, h - 1)
  }

  // 中央装饰菱形（金色按钮加宝石）
  if (style === 'gold') {
    const cx = bx + w / 2
    const cy = by + 6
    px(ctx, cx - 1, cy - 2, 2, 1, '#fff')
    px(ctx, cx - 2, cy - 1, 4, 2, '#ffd040')
    px(ctx, cx - 1, cy + 1, 2, 1, '#8a6010')
  }
}

// 按钮精灵图：3 帧水平排列 (normal/hover/pressed)
function genButtonSheet(style: ButtonStyle, w = 160, h = 36): UISprite {
  const cvs = createCanvas(w * 3, h + 2)
  const ctx = cvs.getContext('2d')!
  drawPixelButton(ctx, 0, 0, w, h, style, 'normal')
  drawPixelButton(ctx, w, 0, w, h, style, 'hover')
  drawPixelButton(ctx, w * 2, 0, w, h, style, 'pressed')
  return { canvas: cvs, width: w, height: h }
}

// ============ 像素面板精灵图（9-slice）============
// 9-slice 面板：用于菜单、对话框、HUD 框
// 总尺寸 (2*border + center) × (2*border + center)
function genPanelSheet(borderColor = '#ffd700', innerColor = '#2a1648', accentColor = '#c9a4ff', border = 8, center = 64): UISprite {
  const W = border * 2 + center
  const H = border * 2 + center
  const cvs = createCanvas(W, H)
  const ctx = cvs.getContext('2d')!

  // 内部填充
  px(ctx, 0, 0, W, H, innerColor)
  // 内部纹理（菱形暗纹）
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  for (let y = 0; y < H; y += 8) {
    for (let x = 0; x < W; x += 8) {
      if ((x / 8 + y / 8) % 2 === 0) {
        px(ctx, x, y, 8, 8, 'rgba(255,255,255,0.04)')
      }
    }
  }

  // 外边框（金色）
  px(ctx, 0, 0, W, border, borderColor)
  px(ctx, 0, H - border, W, border, borderColor)
  px(ctx, 0, 0, border, H, borderColor)
  px(ctx, W - border, 0, border, H, borderColor)

  // 边框高光（顶部+左侧浅色）
  px(ctx, 1, 1, W - 2, 2, '#fff4a0')
  px(ctx, 1, 1, 2, H - 2, '#fff4a0')
  // 边框阴影（底部+右侧深色）
  px(ctx, 1, H - 3, W - 2, 2, '#8a6010')
  px(ctx, W - 3, 1, 2, H - 2, '#8a6010')

  // 角花装饰（4 角的菱形宝石）
  function drawCorner(cx: number, cy: number) {
    px(ctx, cx - 1, cy - 3, 2, 1, '#fff')
    px(ctx, cx - 2, cy - 2, 4, 2, accentColor)
    px(ctx, cx - 3, cy - 1, 6, 2, accentColor)
    px(ctx, cx - 2, cy + 1, 4, 2, accentColor)
    px(ctx, cx - 1, cy + 2, 2, 1, '#fff')
    px(ctx, cx, cy, 2, 2, '#ffd700')
  }
  drawCorner(border / 2, border / 2)
  drawCorner(W - border / 2, border / 2)
  drawCorner(border / 2, H - border / 2)
  drawCorner(W - border / 2, H - border / 2)

  // 中央花纹（勇者之剑交叉）
  const mx = W / 2
  const my = H / 2
  // 简单的菱形中心标志
  px(ctx, mx - 4, my - 1, 2, 2, accentColor)
  px(ctx, mx - 1, my - 4, 2, 2, accentColor)
  px(ctx, mx + 3, my - 1, 2, 2, accentColor)
  px(ctx, mx - 1, my + 3, 2, 2, accentColor)
  px(ctx, mx - 1, my - 1, 2, 2, '#ffd700')

  return { canvas: cvs, width: W, height: H }
}

// 9-slice 绘制辅助
export function draw9Slice(ctx: CanvasRenderingContext2D, sprite: UISprite, dx: number, dy: number, dw: number, dh: number, border = 8) {
  const src = sprite.canvas
  const sw = sprite.width
  const sh = sprite.height
  const b = border

  // 4 个角
  ctx.drawImage(src, 0, 0, b, b, dx, dy, b, b)
  ctx.drawImage(src, sw - b, 0, b, b, dx + dw - b, dy, b, b)
  ctx.drawImage(src, 0, sh - b, b, b, dx, dy + dh - b, b, b)
  ctx.drawImage(src, sw - b, sh - b, b, b, dx + dw - b, dy + dh - b, b, b)

  // 4 条边（拉伸）
  ctx.drawImage(src, b, 0, sw - b * 2, b, dx + b, dy, dw - b * 2, b)
  ctx.drawImage(src, b, sh - b, sw - b * 2, b, dx + b, dy + dh - b, dw - b * 2, b)
  ctx.drawImage(src, 0, b, b, sh - b * 2, dx, dy + b, b, dh - b * 2)
  ctx.drawImage(src, sw - b, b, b, sh - b * 2, dx + dw - b, dy + b, b, dh - b * 2)

  // 中心
  ctx.drawImage(src, b, b, sw - b * 2, sh - b * 2, dx + b, dy + b, dw - b * 2, dh - b * 2)
}

// ============ 标题 Logo 精灵图 ============
// 「黎恩征途」4 字大标题，带装饰剑与水晶
function genTitleLogo(): UISprite {
  const W = 480, H = 120
  const cvs = createCanvas(W, H)
  const ctx = cvs.getContext('2d')!

  // 背景光晕
  const grad = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W / 2)
  grad.addColorStop(0, 'rgba(255,215,0,0.3)')
  grad.addColorStop(1, 'rgba(255,215,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // 像素艺术大字：黎恩征途
  // 每字 80x80，间距 16，居中
  const chars = [
    { ch: '黎', color: '#ffd700', shadow: '#8a6010' },
    { ch: '恩', color: '#ffd700', shadow: '#8a6010' },
    { ch: '征', color: '#ffe890', shadow: '#a07a20' },
    { ch: '途', color: '#ffe890', shadow: '#a07a20' },
  ]
  ctx.font = 'bold 72px "Microsoft YaHei", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const startX = W / 2 - (chars.length * 80 + (chars.length - 1) * 16) / 2 + 40
  chars.forEach((c, i) => {
    const x = startX + i * 96
    const y = H / 2
    // 阴影（黑色外描边）
    ctx.fillStyle = '#000'
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue
        ctx.fillText(c.ch, x + dx, y + dy)
      }
    }
    // 主色阴影
    ctx.fillStyle = c.shadow
    ctx.fillText(c.ch, x + 2, y + 2)
    // 主色
    ctx.fillStyle = c.color
    ctx.fillText(c.ch, x, y)
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText(c.ch, x - 1, y - 2)
  })

  // 两侧装饰剑
  function drawSword(cx: number, cy: number, flip: boolean) {
    ctx.save()
    ctx.translate(cx, cy)
    if (flip) ctx.scale(-1, 1)
    // 剑刃
    px(ctx, -2, -40, 4, 60, '#ddd')
    px(ctx, -1, -40, 2, 60, '#fff')
    px(ctx, -3, -38, 6, 2, '#aaa')
    // 剑尖
    px(ctx, -2, -44, 4, 4, '#fff')
    // 护手
    px(ctx, -10, 20, 20, 4, '#ffd700')
    px(ctx, -10, 24, 20, 2, '#8a6010')
    // 剑柄
    px(ctx, -2, 24, 4, 12, '#8B4513')
    // 剑柄末端宝石
    px(ctx, -3, 36, 6, 4, '#c44')
    px(ctx, -2, 37, 4, 2, '#f88')
    ctx.restore()
  }
  drawSword(40, 60, false)
  drawSword(W - 40, 60, true)

  // 副标题
  ctx.font = '14px "Microsoft YaHei", serif'
  ctx.fillStyle = '#c9a4ff'
  ctx.textAlign = 'center'
  ctx.fillText('— 水晶碎片之歌 —', W / 2, H - 12)

  return { canvas: cvs, width: W, height: H }
}

// ============ 小图标精灵图 ============
// 心、星、剑、盾等像素图标（16x16）
function genIconSheet(): UISprite {
  const SIZE = 16
  const ICONS = 8  // 8 个图标水平排列
  const cvs = createCanvas(SIZE * ICONS, SIZE)
  const ctx = cvs.getContext('2d')!

  // 0: 心 (HP)
  function drawHeart(ox: number) {
    px(ctx, ox + 4, 3, 2, 1, '#ff4466')
    px(ctx, ox + 10, 3, 2, 1, '#ff4466')
    px(ctx, ox + 3, 4, 4, 2, '#ff4466')
    px(ctx, ox + 9, 4, 4, 2, '#ff4466')
    px(ctx, ox + 2, 6, 12, 3, '#ff4466')
    px(ctx, ox + 3, 9, 10, 2, '#ff4466')
    px(ctx, ox + 4, 11, 8, 1, '#ff4466')
    px(ctx, ox + 5, 12, 6, 1, '#ff4466')
    px(ctx, ox + 6, 13, 4, 1, '#ff4466')
    px(ctx, ox + 7, 14, 2, 1, '#ff4466')
    // 高光
    px(ctx, ox + 4, 4, 1, 1, '#ffaabb')
    px(ctx, ox + 5, 5, 1, 1, '#ffaabb')
  }
  drawHeart(0)

  // 1: 星 (MP)
  function drawStar(ox: number) {
    const pts = [
      [8, 1], [9, 5], [13, 5], [10, 8], [11, 12], [8, 10], [5, 12], [6, 8], [3, 5], [7, 5]
    ]
    for (const pt of pts) px(ctx, ox + (pt[0] ?? 0) - 1, (pt[1] ?? 0) - 1, 2, 2, '#5acfff')
    px(ctx, ox + 7, 2, 2, 2, '#a0e0ff')
    px(ctx, ox + 6, 4, 2, 1, '#a0e0ff')
  }
  drawStar(16)

  // 2: 剑
  function drawSword(ox: number) {
    px(ctx, ox + 7, 1, 2, 9, '#ddd')
    px(ctx, ox + 6, 2, 4, 8, '#fff')
    px(ctx, ox + 7, 0, 2, 1, '#aaa')
    px(ctx, ox + 4, 9, 8, 1, '#aaa')
    px(ctx, ox + 4, 10, 8, 1, '#ffd700')
    px(ctx, ox + 4, 11, 8, 1, '#8a6010')
    px(ctx, ox + 7, 11, 2, 4, '#8B4513')
    px(ctx, ox + 6, 14, 4, 2, '#c44')
  }
  drawSword(32)

  // 3: 盾
  function drawShield(ox: number) {
    px(ctx, ox + 3, 2, 10, 2, '#888')
    px(ctx, ox + 2, 4, 12, 2, '#aaa')
    px(ctx, ox + 2, 6, 12, 4, '#888')
    px(ctx, ox + 3, 10, 10, 2, '#666')
    px(ctx, ox + 4, 12, 8, 2, '#444')
    px(ctx, ox + 6, 14, 4, 1, '#222')
    // 十字
    px(ctx, ox + 7, 4, 2, 8, '#ffd700')
    px(ctx, ox + 4, 7, 8, 2, '#ffd700')
  }
  drawShield(48)

  // 4: 金币
  function drawCoin(ox: number) {
    px(ctx, ox + 5, 3, 6, 1, '#8a6010')
    px(ctx, ox + 4, 4, 8, 1, '#ffd700')
    px(ctx, ox + 3, 5, 10, 6, '#ffd700')
    px(ctx, ox + 4, 11, 8, 1, '#ffd700')
    px(ctx, ox + 5, 12, 6, 1, '#8a6010')
    // 中心符号
    px(ctx, ox + 7, 5, 2, 6, '#c89020')
    px(ctx, ox + 6, 7, 4, 2, '#c89020')
    // 高光
    px(ctx, ox + 4, 5, 1, 2, '#fff4a0')
    px(ctx, ox + 5, 4, 1, 1, '#fff4a0')
  }
  drawCoin(64)

  // 5: 火焰
  function drawFire(ox: number) {
    px(ctx, ox + 7, 1, 2, 2, '#ff0')
    px(ctx, ox + 6, 3, 4, 2, '#f80')
    px(ctx, ox + 5, 5, 6, 3, '#f40')
    px(ctx, ox + 4, 8, 8, 4, '#f00')
    px(ctx, ox + 5, 12, 6, 2, '#a00')
    px(ctx, ox + 6, 14, 4, 1, '#500')
    // 中心亮
    px(ctx, ox + 7, 6, 2, 3, '#fff')
  }
  drawFire(80)

  // 6: 水晶
  function drawCrystal(ox: number) {
    px(ctx, ox + 6, 1, 4, 2, '#a0e0ff')
    px(ctx, ox + 5, 3, 6, 2, '#80c0ff')
    px(ctx, ox + 4, 5, 8, 4, '#5a9fff')
    px(ctx, ox + 5, 9, 6, 2, '#4080dd')
    px(ctx, ox + 6, 11, 4, 2, '#3060bb')
    px(ctx, ox + 7, 13, 2, 2, '#2050aa')
    // 高光
    px(ctx, ox + 5, 4, 1, 3, '#fff')
    px(ctx, ox + 6, 5, 1, 2, '#fff')
  }
  drawCrystal(96)

  // 7: 锁
  function drawLock(ox: number) {
    // 锁体
    px(ctx, ox + 4, 7, 8, 7, '#888')
    px(ctx, ox + 4, 7, 8, 1, '#aaa')
    px(ctx, ox + 4, 13, 8, 1, '#444')
    // 锁孔
    px(ctx, ox + 7, 9, 2, 2, '#ffd700')
    px(ctx, ox + 7, 11, 2, 2, '#ffd700')
    // 锁环
    px(ctx, ox + 5, 4, 6, 1, '#888')
    px(ctx, ox + 4, 5, 1, 2, '#888')
    px(ctx, ox + 11, 5, 1, 2, '#888')
    px(ctx, ox + 5, 3, 1, 1, '#888')
    px(ctx, ox + 10, 3, 1, 1, '#888')
  }
  drawLock(112)

  return { canvas: cvs, width: SIZE, height: SIZE }
}

// ============ 装饰边框精灵图（勇者之路风格花纹）============
function genDecorFrame(): UISprite {
  const W = 256, H = 16
  const cvs = createCanvas(W, H)
  const ctx = cvs.getContext('2d')!

  // 重复花纹（一段 32px）
  for (let seg = 0; seg < W / 32; seg++) {
    const ox = seg * 32
    // 中心菱形宝石
    px(ctx, ox + 14, 4, 4, 1, '#ffd700')
    px(ctx, ox + 12, 5, 8, 2, '#ffd700')
    px(ctx, ox + 10, 7, 12, 2, '#ffd700')
    px(ctx, ox + 12, 9, 8, 2, '#ffd700')
    px(ctx, ox + 14, 11, 4, 1, '#ffd700')
    px(ctx, ox + 15, 6, 2, 4, '#c9a4ff')
    px(ctx, ox + 15, 7, 2, 2, '#fff')
    // 左右藤蔓
    px(ctx, ox + 2, 7, 8, 2, '#8a6010')
    px(ctx, ox + 4, 5, 2, 2, '#8a6010')
    px(ctx, ox + 6, 9, 2, 2, '#8a6010')
    px(ctx, ox + 22, 7, 8, 2, '#8a6010')
    px(ctx, ox + 24, 5, 2, 2, '#8a6010')
    px(ctx, ox + 26, 9, 2, 2, '#8a6010')
    // 小叶子
    px(ctx, ox + 3, 4, 2, 2, '#4a8c2a')
    px(ctx, ox + 7, 10, 2, 2, '#4a8c2a')
    px(ctx, ox + 23, 4, 2, 2, '#4a8c2a')
    px(ctx, ox + 27, 10, 2, 2, '#4a8c2a')
  }
  return { canvas: cvs, width: W, height: H }
}

// ============ 入口：生成所有 UI 精灵图 ============
export function generateAllUISprites(): void {
  if (uiCache.size > 0) return

  uiCache.set('btn_primary', genButtonSheet('primary'))
  uiCache.set('btn_secondary', genButtonSheet('secondary'))
  uiCache.set('btn_gold', genButtonSheet('gold'))
  uiCache.set('btn_danger', genButtonSheet('danger'))

  uiCache.set('panel_main', genPanelSheet('#ffd700', '#2a1648', '#c9a4ff', 8, 64))
  uiCache.set('panel_dark', genPanelSheet('#6a5aaa', '#1a0e2a', '#8a7add', 6, 64))

  uiCache.set('title_logo', genTitleLogo())
  uiCache.set('icons', genIconSheet())
  uiCache.set('decor_frame', genDecorFrame())
}

export function getUISprite(key: string): UISprite | undefined {
  return uiCache.get(key)
}

// 绘制按钮（带文字）
export function drawUIButton(
  ctx: CanvasRenderingContext2D,
  style: ButtonStyle,
  x: number, y: number, w: number, h: number,
  text: string,
  state: 'normal' | 'hover' | 'pressed' = 'normal'
) {
  const sprite = uiCache.get(`btn_${style}`)
  if (!sprite) return

  // 直接重绘按钮（精灵图切片）
  const stateIdx = state === 'normal' ? 0 : state === 'hover' ? 1 : 2
  const srcX = stateIdx * sprite.width
  // 拉伸绘制（左右 8px 保持，中间拉伸）
  const b = 8
  ctx.drawImage(sprite.canvas, srcX, 0, b, sprite.height, x, y, b, h)
  ctx.drawImage(sprite.canvas, srcX + sprite.width - b, 0, b, sprite.height, x + w - b, y, b, h)
  ctx.drawImage(sprite.canvas, srcX + b, 0, sprite.width - b * 2, sprite.height, x + b, y, w - b * 2, h)

  // 文字
  ctx.fillStyle = state === 'pressed' ? '#ffe890' : '#fff'
  ctx.font = 'bold 14px "Microsoft YaHei", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0,0,0,0.8)'
  ctx.shadowBlur = 2
  ctx.shadowOffsetY = 1
  ctx.fillText(text, x + w / 2 + (state === 'pressed' ? 1 : 0), y + h / 2 + (state === 'pressed' ? 1 : 0))
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
}

// 绘制图标
export function drawUIIcon(ctx: CanvasRenderingContext2D, idx: number, x: number, y: number, scale = 1) {
  const sprite = uiCache.get('icons')
  if (!sprite) return
  ctx.drawImage(sprite.canvas, idx * 16, 0, 16, 16, x, y, 16 * scale, 16 * scale)
}

// 绘制装饰横条
export function drawDecorFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const sprite = uiCache.get('decor_frame')
  if (!sprite) return
  // 重复平铺
  let cx = x
  while (cx < x + w) {
    const remaining = x + w - cx
    const drawW = Math.min(sprite.width, remaining)
    ctx.drawImage(sprite.canvas, 0, 0, drawW, sprite.height, cx, y, drawW, sprite.height)
    cx += sprite.width
  }
}
