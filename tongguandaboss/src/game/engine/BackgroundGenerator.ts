// ============ 多层视差像素背景生成器 ============
// 勇者之路风格：每关生成 3 层视差背景（远山/中景/前景）
// 缓存为精灵图，drawBackground 时按 cameraX 偏移切片绘制

export interface BackgroundLayer {
  canvas: HTMLCanvasElement
  width: number
  height: number
  parallax: number  // 视差系数（0~1）
}

export interface BackgroundSet {
  sky: { colorTop: string; colorMid: string; colorBottom: string }
  layers: BackgroundLayer[]  // 从远到近
  groundColor: string
  groundDetail: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void
}

const bgCache: Map<number, BackgroundSet> = new Map()

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const cvs = document.createElement('canvas')
  cvs.width = width
  cvs.height = height
  const ctx = cvs.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return cvs
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

// ============ 通用：像素云朵 ============
function drawPixelCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = 'rgba(255,255,255,0.7)') {
  ctx.fillStyle = color
  // 像素风圆角矩形组合
  const w = 16 * s, h = 8 * s
  px(ctx, x + 2 * s, y, w - 4 * s, 2 * s, color)
  px(ctx, x, y + 2 * s, w, h - 2 * s, color)
  px(ctx, x + 2 * s, y + h, w - 4 * s, 1 * s, color)
  // 凸起
  px(ctx, x + 4 * s, y - 2 * s, 4 * s, 2 * s, color)
  px(ctx, x + 8 * s, y - 2 * s, 3 * s, 2 * s, color)
}

// ============ 通用：像素星星 ============
function drawPixelStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color = '#fff') {
  px(ctx, x, y - size, 1, size * 2, color)
  px(ctx, x - size, y, size * 2, 1, color)
  px(ctx, x - 1, y - 1, 3, 3, color)
}

// ============ 第一关：翠绿草原 ============
function genGrassland(): BackgroundSet {
  // 远景：连绵雪山
  const farLayer = createCanvas(1024, 200)
  const farCtx = farLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 80) {
    const h = 80 + Math.floor(Math.sin(x * 0.1) * 20) + ((x * 7) % 30)
    px(farCtx, x, 200 - h, 80, h, '#7a9aaa')
    // 雪顶
    px(farCtx, x + 30, 200 - h, 20, 8, '#ddeeff')
    px(farCtx, x + 35, 200 - h - 4, 10, 4, '#fff')
    // 阴影
    px(farCtx, x, 200 - h + 8, 80, 4, '#5a7a8a')
  }

  // 中景：树林 + 草地
  const midLayer = createCanvas(1024, 240)
  const midCtx = midLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 60) {
    // 像素松树
    const tx = x + ((x * 13) % 20)
    const ty = 60 + ((x * 7) % 30)
    // 树干
    px(midCtx, tx + 6, ty + 50, 4, 30, '#5a3a1a')
    // 树冠（三角形像素）
    px(midCtx, tx + 4, ty + 30, 8, 8, '#2a6a2a')
    px(midCtx, tx + 2, ty + 38, 12, 8, '#2a6a2a')
    px(midCtx, tx + 0, ty + 46, 16, 8, '#2a6a2a')
    // 高光
    px(midCtx, tx + 4, ty + 32, 2, 4, '#4a8c4a')
    px(midCtx, tx + 2, ty + 40, 2, 4, '#4a8c4a')
  }

  // 前景：草丛 + 花朵
  const frontLayer = createCanvas(1024, 100)
  const frontCtx = frontLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 12) {
    const offset = (x * 17) % 8
    // 草丛
    px(frontCtx, x + 1, 80 - offset, 1, 8 + offset, '#3a8a3a')
    px(frontCtx, x + 3, 78 - offset, 1, 6 + offset, '#2a7a2a')
    px(frontCtx, x + 5, 80 - offset, 1, 8 + offset, '#3a8a3a')
    // 偶尔加花
    if ((x * 3) % 48 === 0) {
      px(frontCtx, x + 2, 70, 2, 2, '#ff4466')
      px(frontCtx, x + 1, 72, 4, 1, '#ff4466')
      px(frontCtx, x + 2, 74, 2, 4, '#3a8a3a')
    }
  }

  return {
    sky: { colorTop: '#7ac0ff', colorMid: '#a8d8ff', colorBottom: '#c8e8ff' },
    layers: [
      { canvas: farLayer, width: 1024, height: 200, parallax: 0.2 },
      { canvas: midLayer, width: 1024, height: 240, parallax: 0.5 },
      { canvas: frontLayer, width: 1024, height: 100, parallax: 0.85 },
    ],
    groundColor: '#4a8c2a',
    groundDetail: (ctx, x, y, w, h) => {
      // 草地表面
      px(ctx, x, y, w, 4, '#5a9c3a')
      px(ctx, x, y + 4, w, 2, '#3a7a2a')
      px(ctx, x, y + 6, w, h - 6, '#6b4914')
      // 草尖
      for (let gx = 0; gx < w; gx += 8) {
        px(ctx, x + gx, y - 2, 2, 2, '#4a8c2a')
        px(ctx, x + gx + 4, y - 1, 1, 1, '#4a8c2a')
      }
    },
  }
}

// ============ 第二关：暗夜森林 ============
function genDarkForest(): BackgroundSet {
  // 远景：月亮 + 暗山
  const farLayer = createCanvas(1024, 200)
  const farCtx = farLayer.getContext('2d')!
  // 月亮
  px(farCtx, 100, 30, 40, 40, '#fff8d0')
  px(farCtx, 104, 34, 32, 32, '#fff')
  // 月坑
  px(farCtx, 110, 40, 6, 6, '#ddd8a0')
  px(farCtx, 124, 50, 4, 4, '#ddd8a0')
  // 远山轮廓
  for (let x = 0; x < 1024; x += 100) {
    const h = 100 + ((x * 7) % 40)
    px(farCtx, x, 200 - h, 100, h, '#1a1a3a')
    px(farCtx, x, 200 - h, 100, 4, '#2a2a5a')
  }
  // 星星
  for (let i = 0; i < 50; i++) {
    const sx = (i * 137) % 1024
    const sy = (i * 73) % 120
    px(farCtx, sx, sy, 1, 1, '#fff')
    if (i % 5 === 0) px(farCtx, sx, sy, 2, 2, '#fff')
  }

  // 中景：枯树 + 雾气
  const midLayer = createCanvas(1024, 280)
  const midCtx = midLayer.getContext('2d')!
  // 雾气带
  for (let y = 100; y < 200; y += 4) {
    px(midCtx, 0, y, 1024, 2, `rgba(80,60,120,${0.15 + (y - 100) * 0.005})`)
  }
  for (let x = 0; x < 1024; x += 80) {
    const tx = x + ((x * 13) % 30)
    const ty = 40 + ((x * 7) % 20)
    // 枯树干（扭曲）
    px(midCtx, tx + 10, ty + 80, 6, 100, '#1a0e1a')
    px(midCtx, tx + 12, ty + 90, 2, 80, '#2a1a2a')
    // 枯枝
    px(midCtx, tx + 4, ty + 70, 8, 2, '#1a0e1a')
    px(midCtx, tx + 0, ty + 60, 6, 2, '#1a0e1a')
    px(midCtx, tx + 14, ty + 75, 8, 2, '#1a0e1a')
    px(midCtx, tx + 18, ty + 65, 6, 2, '#1a0e1a')
    px(midCtx, tx + 8, ty + 50, 4, 2, '#1a0e1a')
    px(midCtx, tx + 14, ty + 45, 4, 2, '#1a0e1a')
  }

  // 前景：发光蘑菇 + 草
  const frontLayer = createCanvas(1024, 100)
  const frontCtx = frontLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 30) {
    if ((x * 3) % 60 === 0) {
      // 发光蘑菇
      const mx = x + 4
      const my = 80
      // 茎
      px(frontCtx, mx, my - 4, 2, 6, '#ddd')
      // 蘑菇盖（发光紫）
      px(frontCtx, mx - 2, my - 8, 6, 4, '#9a4add')
      px(frontCtx, mx - 1, my - 9, 4, 1, '#c47aff')
      // 光晕
      px(frontCtx, mx - 3, my - 7, 8, 2, 'rgba(180,120,255,0.3)')
      px(frontCtx, mx - 1, my - 10, 4, 1, 'rgba(180,120,255,0.3)')
      // 斑点
      px(frontCtx, mx, my - 7, 1, 1, '#fff')
      px(frontCtx, mx + 2, my - 6, 1, 1, '#fff')
    } else {
      // 暗草
      px(frontCtx, x + 2, 76, 1, 8, '#2a4a2a')
      px(frontCtx, x + 4, 78, 1, 6, '#1a3a1a')
      px(frontCtx, x + 6, 76, 1, 8, '#2a4a2a')
    }
  }

  return {
    sky: { colorTop: '#0a0518', colorMid: '#1a0e3a', colorBottom: '#2a1a4a' },
    layers: [
      { canvas: farLayer, width: 1024, height: 200, parallax: 0.15 },
      { canvas: midLayer, width: 1024, height: 280, parallax: 0.45 },
      { canvas: frontLayer, width: 1024, height: 100, parallax: 0.8 },
    ],
    groundColor: '#2a1a3a',
    groundDetail: (ctx, x, y, w, h) => {
      px(ctx, x, y, w, 3, '#3a2a4a')
      px(ctx, x, y + 3, w, 2, '#2a1a3a')
      px(ctx, x, y + 5, w, h - 5, '#1a0e2a')
      // 苔藓
      for (let gx = 0; gx < w; gx += 12) {
        px(ctx, x + gx, y - 1, 3, 1, '#4a8a4a')
        px(ctx, x + gx + 6, y - 2, 2, 2, '#5a9a5a')
      }
    },
  }
}

// ============ 第三关：火焰地狱 ============
function genFireHell(): BackgroundSet {
  // 远景：熔岩山 + 烟柱
  const farLayer = createCanvas(1024, 200)
  const farCtx = farLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 90) {
    const h = 120 + ((x * 7) % 50)
    // 火焰山
    px(farCtx, x, 200 - h, 90, h, '#5a1a0a')
    px(farCtx, x, 200 - h, 90, 6, '#8a3010')
    px(farCtx, x + 10, 200 - h + 6, 70, 4, '#3a0a00')
    // 熔岩裂缝
    px(farCtx, x + 20, 200 - h + 20, 4, 2, '#ff4400')
    px(farCtx, x + 40, 200 - h + 30, 6, 2, '#ff8800')
    px(farCtx, x + 60, 200 - h + 25, 4, 2, '#ff4400')
  }
  // 烟柱
  for (let i = 0; i < 5; i++) {
    const sx = 100 + i * 220
    for (let y = 0; y < 120; y += 2) {
      px(farCtx, sx + (y % 4), 180 - y, 2, 2, `rgba(80,40,40,${0.6 - y * 0.005})`)
    }
  }

  // 中景：火焰柱 + 焦黑岩石
  const midLayer = createCanvas(1024, 280)
  const midCtx = midLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 70) {
    const fx = x + ((x * 13) % 20)
    // 焦黑岩石
    px(midCtx, fx, 220, 60, 60, '#1a0a0a')
    px(midCtx, fx, 218, 60, 2, '#3a1a0a')
    // 火焰柱（多层）
    const flameH = 80 + ((x * 7) % 40)
    for (let y = 0; y < flameH; y += 2) {
      const w = 6 - Math.floor(y / 20)
      const color = y < flameH * 0.4 ? '#ffff00' : y < flameH * 0.7 ? '#ff8800' : '#ff4400'
      const flick = (x + y) % 4 - 2
      px(midCtx, fx + 30 + flick, 220 - y, w, 2, color)
    }
    // 余烬
    px(midCtx, fx + 28, 220 - flameH, 6, 2, '#ffff88')
  }

  // 前景：火星 + 灰烬草
  const frontLayer = createCanvas(1024, 80)
  const frontCtx = frontLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 8) {
    if ((x * 3) % 24 === 0) {
      // 火星
      px(frontCtx, x, 20 + ((x * 7) % 40), 2, 2, '#ff8800')
      px(frontCtx, x + 1, 24 + ((x * 7) % 30), 1, 1, '#ffff00')
    }
    if ((x * 5) % 40 === 0) {
      // 焦黑植物
      px(frontCtx, x, 70, 2, 8, '#3a1a0a')
      px(frontCtx, x + 3, 72, 1, 6, '#2a0a0a')
    }
  }

  return {
    sky: { colorTop: '#3a0a05', colorMid: '#5a1a05', colorBottom: '#8a3010' },
    layers: [
      { canvas: farLayer, width: 1024, height: 200, parallax: 0.2 },
      { canvas: midLayer, width: 1024, height: 280, parallax: 0.5 },
      { canvas: frontLayer, width: 1024, height: 80, parallax: 0.85 },
    ],
    groundColor: '#3a1a0a',
    groundDetail: (ctx, x, y, w, h) => {
      // 焦黑地表
      px(ctx, x, y, w, 3, '#5a2a0a')
      px(ctx, x, y + 3, w, 2, '#3a1a0a')
      px(ctx, x, y + 5, w, h - 5, '#1a0a05')
      // 熔岩裂缝
      for (let gx = 0; gx < w; gx += 20) {
        px(ctx, x + gx, y + 8, 6, 2, '#ff4400')
        px(ctx, x + gx + 1, y + 10, 4, 1, '#ff8800')
        px(ctx, x + gx + 2, y + 6, 2, 1, '#ffff00')
      }
    },
  }
}

// ============ 主题1：沼泽地带（第一关·场景2） ============
function genMarsh(): BackgroundSet {
  // 远景：雾霭中的枯树剪影
  const farLayer = createCanvas(1024, 200)
  const farCtx = farLayer.getContext('2d')!
  // 灰雾
  for (let y = 0; y < 160; y += 3) {
    px(farCtx, 0, 40 + y, 1024, 2, `rgba(90,110,80,${0.10 + (y / 160) * 0.12})`)
  }
  for (let x = 0; x < 1024; x += 70) {
    const h = 70 + ((x * 7) % 40)
    px(farCtx, x, 200 - h, 70, h, '#3a4a35')
    // 枯枝
    px(farCtx, x + 12, 200 - h - 10, 3, 10, '#2a3a28')
    px(farCtx, x + 22, 200 - h - 4, 3, 8, '#2a3a28')
    px(farCtx, x + 34, 200 - h - 8, 3, 8, '#2a3a28')
  }
  // 远处的月亮（朦胧）
  px(farCtx, 820, 40, 26, 26, '#c8d8a8')
  px(farCtx, 824, 44, 18, 18, '#e0ecc0')

  // 中景：芦苇 + 水洼
  const midLayer = createCanvas(1024, 260)
  const midCtx = midLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 14) {
    const h = 40 + ((x * 13) % 50)
    // 芦苇杆
    px(midCtx, x, 240 - h, 2, h, '#4a5a2a')
    // 芦穗
    px(midCtx, x - 2, 240 - h - 6, 6, 6, '#6a7a3a')
    px(midCtx, x - 1, 240 - h - 8, 4, 3, '#7a8a4a')
  }
  // 水洼（反光）
  for (let x = 0; x < 1024; x += 60) {
    const wy = 200 + ((x * 7) % 30)
    px(midCtx, x, wy, 44, 10, 'rgba(30,60,40,0.8)')
    px(midCtx, x + 6, wy + 3, 12, 2, 'rgba(120,180,140,0.4)')
    px(midCtx, x + 24, wy + 5, 8, 2, 'rgba(140,200,160,0.3)')
  }
  // 雾气
  px(midCtx, 0, 170, 1024, 3, 'rgba(100,120,90,0.18)')
  px(midCtx, 0, 200, 1024, 3, 'rgba(100,120,90,0.15)')

  // 前景：水草 + 气泡 + 荷叶
  const frontLayer = createCanvas(1024, 90)
  const frontCtx = frontLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 10) {
    const h = 20 + ((x * 17) % 30)
    px(frontCtx, x, 80 - h, 2, h, '#3a6a2a')
    px(frontCtx, x + 3, 80 - h + 4, 2, h - 4, '#2a5a1a')
    px(frontCtx, x + 6, 80 - h + 8, 2, h - 8, '#3a6a2a')
    // 荷叶
    if ((x * 3) % 50 === 0) {
      px(frontCtx, x + 8, 68, 16, 4, '#3a7a2a')
      px(frontCtx, x + 10, 66, 12, 4, '#4a8a3a')
    }
    // 气泡
    if ((x * 5) % 60 === 0) {
      px(frontCtx, x + 2, 40 + ((x * 7) % 30), 3, 3, 'rgba(200,255,220,0.5)')
    }
  }

  return {
    sky: { colorTop: '#2f3a2c', colorMid: '#45503a', colorBottom: '#5a6a48' },
    layers: [
      { canvas: farLayer, width: 1024, height: 200, parallax: 0.18 },
      { canvas: midLayer, width: 1024, height: 260, parallax: 0.5 },
      { canvas: frontLayer, width: 1024, height: 90, parallax: 0.85 },
    ],
    groundColor: '#3a4a2a',
    groundDetail: (ctx, x, y, w, h) => {
      // 泥沼地面
      px(ctx, x, y, w, 4, '#4a5a2a')
      px(ctx, x, y + 4, w, 3, '#3a4a22')
      px(ctx, x, y + 7, w, h - 7, '#2a3a18')
      // 绿藻
      for (let gx = 0; gx < w; gx += 10) {
        px(ctx, x + gx, y - 1, 3, 2, '#5a8a3a')
        px(ctx, x + gx + 5, y - 2, 2, 2, '#4a7a2a')
      }
      // 泥浆反光点
      for (let gx = 0; gx < w; gx += 30) {
        px(ctx, x + gx + 8, y + 12, 6, 2, 'rgba(140,190,150,0.25)')
      }
    },
  }
}

// ============ 主题2：巨树之巅（第一关·场景3） ============
function genGiantTree(): BackgroundSet {
  // 远景：树冠层（透过树叶的光斑）
  const farLayer = createCanvas(1024, 200)
  const farCtx = farLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 40) {
    const h = 90 + Math.floor(Math.sin(x * 0.08) * 30) + ((x * 11) % 40)
    // 远处树冠
    px(farCtx, x, 200 - h, 40, h, '#1d5a35')
    px(farCtx, x + 8, 200 - h, 24, 8, '#2a7a45')
    // 光斑
    if ((x * 3) % 60 === 0) {
      px(farCtx, x + 14, 60 + ((x * 7) % 80), 6, 6, 'rgba(160,255,140,0.35)')
      px(farCtx, x + 2, 90 + ((x * 5) % 60), 4, 4, 'rgba(180,255,160,0.3)')
    }
  }

  // 中景：巨型树干 + 藤蔓
  const midLayer = createCanvas(1024, 280)
  const midCtx = midLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 130) {
    const tx = x + ((x * 13) % 40)
    // 巨大树干（有纹理）
    px(midCtx, tx, 20, 46, 260, '#4a3218')
    px(midCtx, tx + 6, 20, 34, 260, '#5a4220')
    for (let gy = 30; gy < 270; gy += 26) {
      px(midCtx, tx + 10, gy, 20, 3, '#3a2810')
      px(midCtx, tx + 30, gy + 12, 10, 3, '#6a5228')
    }
    // 藤蔓垂下
    const vineLen = 60 + ((x * 7) % 60)
    for (let vx = 0; vx < 6; vx++) {
      px(midCtx, tx + 8 + vx * 6, 30 + vx * 4, 2, vineLen - vx * 4, '#2a6a2a')
      px(midCtx, tx + 9 + vx * 6, 30 + vx * 4 + vineLen - vx * 4 - 6, 3, 6, '#3a8a3a')
    }
    // 苔藓
    px(midCtx, tx - 4, 20, 8, 260, '#3a7a2a')
  }

  // 前景：藤蔓枝 + 树洞蘑菇
  const frontLayer = createCanvas(1024, 90)
  const frontCtx = frontLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 16) {
    px(frontCtx, x, 70, 3, 20, '#3a5a1a')
    px(frontCtx, x + 6, 60, 2, 30, '#2a4a12')
    // 蘑菇
    if ((x * 3) % 64 === 0) {
      px(frontCtx, x + 8, 52, 2, 6, '#ddd')
      px(frontCtx, x + 5, 46, 10, 6, '#8a5a2a')
      px(frontCtx, x + 6, 44, 8, 2, '#aa7a4a')
    }
  }

  return {
    sky: { colorTop: '#1a4a3a', colorMid: '#2a6a4a', colorBottom: '#4a8a5a' },
    layers: [
      { canvas: farLayer, width: 1024, height: 200, parallax: 0.2 },
      { canvas: midLayer, width: 1024, height: 280, parallax: 0.5 },
      { canvas: frontLayer, width: 1024, height: 90, parallax: 0.85 },
    ],
    groundColor: '#4a3a1a',
    groundDetail: (ctx, x, y, w, h) => {
      // 苔藓木地面
      px(ctx, x, y, w, 4, '#5a6a2a')
      px(ctx, x, y + 4, w, 3, '#3a4a18')
      px(ctx, x, y + 7, w, h - 7, '#3a2a12')
      // 木纹
      for (let gx = 0; gx < w; gx += 24) {
        px(ctx, x + gx, y + 10, 16, 2, '#2a1a0a')
      }
      // 苔藓
      for (let gx = 0; gx < w; gx += 12) {
        px(ctx, x + gx, y - 1, 4, 2, '#4a8a3a')
        px(ctx, x + gx + 6, y - 2, 3, 2, '#5a9a4a')
      }
    },
  }
}

// ============ 主题4：枯木峡谷（第二关·场景2） ============
function genDeadCanyon(): BackgroundSet {
  // 远景：干裂山壁 + 阴云
  const farLayer = createCanvas(1024, 200)
  const farCtx = farLayer.getContext('2d')!
  // 阴云
  for (let x = 0; x < 1024; x += 60) {
    px(farCtx, x, 10, 80, 10, '#2a2a38')
    px(farCtx, x + 30, 4, 50, 8, '#35354a')
  }
  for (let x = 0; x < 1024; x += 90) {
    const h = 90 + ((x * 7) % 50)
    // 山壁（干裂）
    px(farCtx, x, 200 - h, 90, h, '#3a2a2a')
    px(farCtx, x, 200 - h, 90, 5, '#4a3a34')
    // 裂缝
    px(farCtx, x + 30, 200 - h + 30, 2, 4, '#1a1010')
    px(farCtx, x + 60, 200 - h + 60, 2, 6, '#1a1010')
  }

  // 中景：枯树群 + 干裂地面
  const midLayer = createCanvas(1024, 280)
  const midCtx = midLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 70) {
    const tx = x + ((x * 13) % 30)
    // 枯树干（扭曲向上）
    px(midCtx, tx + 10, 130, 6, 150, '#2a1a12')
    px(midCtx, tx + 12, 140, 2, 130, '#3a2a1a')
    // 枯枝
    px(midCtx, tx + 4, 120, 10, 2, '#2a1a12')
    px(midCtx, tx - 2, 100, 8, 2, '#2a1a12')
    px(midCtx, tx + 14, 90, 8, 2, '#2a1a12')
    px(midCtx, tx + 8, 70, 4, 2, '#2a1a12')
    px(midCtx, tx + 18, 55, 4, 2, '#2a1a12')
  }
  // 地面裂纹
  for (let x = 0; x < 1024; x += 40) {
    px(midCtx, x, 240 + ((x * 7) % 30), 20, 2, '#1a1008')
    px(midCtx, x + 30, 255 + ((x * 5) % 20), 14, 2, '#1a1008')
  }

  // 前景：碎石 + 干草
  const frontLayer = createCanvas(1024, 80)
  const frontCtx = frontLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 10) {
    px(frontCtx, x, 68, 3, 12, '#3a2a18')
    px(frontCtx, x + 4, 64, 2, 16, '#2a1a0e')
    if ((x * 3) % 50 === 0) {
      px(frontCtx, x + 8, 66, 8, 6, '#4a3a24')
      px(frontCtx, x + 9, 64, 5, 4, '#5a4a30')
    }
  }

  return {
    sky: { colorTop: '#1a1a26', colorMid: '#2a2a38', colorBottom: '#3a3040' },
    layers: [
      { canvas: farLayer, width: 1024, height: 200, parallax: 0.2 },
      { canvas: midLayer, width: 1024, height: 280, parallax: 0.5 },
      { canvas: frontLayer, width: 1024, height: 80, parallax: 0.85 },
    ],
    groundColor: '#3a2a18',
    groundDetail: (ctx, x, y, w, h) => {
      // 干裂泥土
      px(ctx, x, y, w, 4, '#4a3824')
      px(ctx, x, y + 4, w, 3, '#3a2a18')
      px(ctx, x, y + 7, w, h - 7, '#2a1a0e')
      // 龟裂
      for (let gx = 0; gx < w; gx += 18) {
        px(ctx, x + gx, y + 8, 10, 2, '#1a0e06')
        px(ctx, x + gx + 5, y + 12, 2, 8, '#1a0e06')
      }
      // 干草
      for (let gx = 0; gx < w; gx += 24) {
        px(ctx, x + gx, y - 2, 1, 6, '#5a4a2a')
        px(ctx, x + gx + 3, y - 2, 1, 5, '#6a5a34')
      }
    },
  }
}

// ============ 主题5：银月祭坛（第二关·场景3） ============
function genMoonAltar(): BackgroundSet {
  // 远景：巨大月亮 + 圣山
  const farLayer = createCanvas(1024, 200)
  const farCtx = farLayer.getContext('2d')!
  // 巨大月亮（光环）
  px(farCtx, 300, 30, 90, 90, 'rgba(200,200,255,0.25)')
  px(farCtx, 310, 40, 70, 70, '#d8d8f8')
  px(farCtx, 318, 48, 54, 54, '#e8e8ff')
  // 月坑
  px(farCtx, 330, 56, 10, 10, '#c0c0e0')
  px(farCtx, 350, 70, 7, 7, '#c0c0e0')
  px(farCtx, 326, 78, 6, 6, '#c0c0e0')
  // 圣山轮廓
  for (let x = 0; x < 1024; x += 110) {
    const h = 80 + ((x * 7) % 50)
    px(farCtx, x, 200 - h, 110, h, '#1a1a34')
    px(farCtx, x, 200 - h, 110, 5, '#2a2a4a')
  }
  // 星星
  for (let i = 0; i < 60; i++) {
    const sx = (i * 137) % 1024
    const sy = (i * 73) % 130
    px(farCtx, sx, sy, 1, 1, '#fff')
    if (i % 4 === 0) px(farCtx, sx, sy, 2, 2, '#fff')
  }

  // 中景：祭坛石柱废墟 + 月光石阶
  const midLayer = createCanvas(1024, 280)
  const midCtx = midLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 160) {
    const tx = x + ((x * 13) % 50)
    // 破损石柱
    px(midCtx, tx, 100, 22, 180, '#3a3a5a')
    px(midCtx, tx + 4, 104, 14, 176, '#4a4a6a')
    // 柱头
    px(midCtx, tx - 4, 92, 30, 10, '#5a5a7a')
    // 裂纹
    px(midCtx, tx + 10, 150, 3, 6, '#2a2a4a')
    px(midCtx, tx + 6, 200, 3, 8, '#2a2a4a')
    // 断裂的柱顶（倒下）
    px(midCtx, tx + 20, 130, 60, 8, '#4a4a6a')
  }
  // 月光石阶
  for (let x = 0; x < 1024; x += 50) {
    px(midCtx, x, 250, 50, 4, 'rgba(120,120,200,0.25)')
    px(midCtx, x + 20, 245, 10, 4, 'rgba(160,160,255,0.3)')
  }
  // 漂浮光尘
  for (let i = 0; i < 20; i++) {
    px(midCtx, (i * 47) % 1024, 60 + (i * 13) % 150, 3, 3, 'rgba(200,200,255,0.4)')
  }

  // 前景：萤光草 + 祭坛纹路
  const frontLayer = createCanvas(1024, 90)
  const frontCtx = frontLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 8) {
    const h = 12 + ((x * 17) % 20)
    px(frontCtx, x, 80 - h, 2, h, '#2a2a5a')
    px(frontCtx, x + 3, 80 - h + 2, 2, h - 2, '#3a3a7a')
    // 发光草尖
    if ((x * 3) % 32 === 0) {
      px(frontCtx, x + 1, 80 - h - 3, 2, 4, '#8888ff')
      px(frontCtx, x + 1, 80 - h - 5, 1, 2, 'rgba(160,160,255,0.7)')
    }
  }

  return {
    sky: { colorTop: '#0a0a20', colorMid: '#14143a', colorBottom: '#1e1e4a' },
    layers: [
      { canvas: farLayer, width: 1024, height: 200, parallax: 0.2 },
      { canvas: midLayer, width: 1024, height: 280, parallax: 0.5 },
      { canvas: frontLayer, width: 1024, height: 90, parallax: 0.85 },
    ],
    groundColor: '#2a2a4a',
    groundDetail: (ctx, x, y, w, h) => {
      // 祭坛青石地面
      px(ctx, x, y, w, 4, '#3a3a5a')
      px(ctx, x, y + 4, w, 3, '#2e2e4e')
      px(ctx, x, y + 7, w, h - 7, '#26264a')
      // 石砖缝
      for (let gx = 0; gx < w; gx += 32) {
        px(ctx, x + gx, y, 2, h - 4, '#1e1e3a')
      }
      // 月光符文（发光）
      for (let gx = 0; gx < w; gx += 60) {
        px(ctx, x + gx + 14, y + 10, 10, 2, 'rgba(120,160,255,0.5)')
        px(ctx, x + gx + 20, y + 14, 4, 2, 'rgba(140,180,255,0.5)')
      }
    },
  }
}


// ============ 主题7：熔岩裂谷（第三关·场景2） ============
function genLavaRift(): BackgroundSet {
  // 远景：开裂岩壁 + 熔岩河
  const farLayer = createCanvas(1024, 200)
  const farCtx = farLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 100) {
    const h = 100 + ((x * 7) % 60)
    // 岩壁
    px(farCtx, x, 200 - h, 100, h, '#3a0a06')
    px(farCtx, x, 200 - h, 100, 6, '#5a1808')
    // 裂缝发光
    px(farCtx, x + 20, 200 - h + 20, 4, 3, '#ff4400')
    px(farCtx, x + 50, 200 - h + 50, 5, 2, '#ff8800')
    px(farCtx, x + 70, 200 - h + 35, 4, 3, '#ff4400')
  }
  // 远处熔岩河
  px(farCtx, 0, 180, 1024, 3, '#ff5500')
  px(farCtx, 0, 183, 1024, 2, '#ffaa00')
  px(farCtx, 0, 185, 1024, 4, '#ffdd66')
  for (let x = 0; x < 1024; x += 60) {
    px(farCtx, x, 178, 20, 2, '#ff2200')
  }

  // 中景：悬石 + 岩浆瀑布
  const midLayer = createCanvas(1024, 280)
  const midCtx = midLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 130) {
    const tx = x + ((x * 13) % 50)
    // 悬空岩石
    px(midCtx, tx, 80, 60, 40, '#2a0a04')
    px(midCtx, tx + 4, 82, 52, 36, '#3a1408')
    // 岩下岩浆滴
    for (let dy = 0; dy < 3; dy++) {
      px(midCtx, tx + 20 + dy * 10, 120 + dy * 8, 3, 8, '#ff6600')
    }
    // 地面岩浆河
    px(midCtx, tx - 20, 235, 110, 8, '#ff4400')
    px(midCtx, tx - 16, 237, 102, 4, '#ffaa00')
    px(midCtx, tx - 10, 240, 90, 3, '#ffdd66')
  }
  // 漂浮余烬
  for (let i = 0; i < 14; i++) {
    px(midCtx, (i * 71) % 1024, 40 + (i * 29) % 180, 2, 2, '#ff8800')
  }

  // 前景：黑曜石尖刺
  const frontLayer = createCanvas(1024, 80)
  const frontCtx = frontLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 40) {
    const sp = 24 + ((x * 7) % 20)
    // 尖刺
    px(frontCtx, x, 80 - sp, 10, sp, '#1a0a04')
    px(frontCtx, x + 2, 80 - sp + 4, 6, sp - 4, '#2a1208')
    px(frontCtx, x + 4, 80 - sp + 8, 2, sp - 8, '#3a180a')
    // 尖端发光
    px(frontCtx, x + 4, 80 - sp, 2, 3, '#ffaa00')
  }

  return {
    sky: { colorTop: '#1a0402', colorMid: '#3a0804', colorBottom: '#5a1206' },
    layers: [
      { canvas: farLayer, width: 1024, height: 200, parallax: 0.2 },
      { canvas: midLayer, width: 1024, height: 280, parallax: 0.5 },
      { canvas: frontLayer, width: 1024, height: 80, parallax: 0.85 },
    ],
    groundColor: '#2a0a04',
    groundDetail: (ctx, x, y, w, h) => {
      // 裂谷黑岩地面
      px(ctx, x, y, w, 4, '#3a1408')
      px(ctx, x, y + 4, w, 3, '#2a0a04')
      px(ctx, x, y + 7, w, h - 7, '#1a0602')
      // 岩浆裂缝
      for (let gx = 0; gx < w; gx += 24) {
        px(ctx, x + gx, y + 8, 14, 2, '#ff4400')
        px(ctx, x + gx + 2, y + 10, 10, 1, '#ff8800')
        px(ctx, x + gx + 4, y + 6, 6, 2, '#ffaa00')
      }
      // 发光碎石
      for (let gx = 0; gx < w; gx += 40) {
        px(ctx, x + gx + 20, y + 14, 3, 3, '#ff6600')
      }
    },
  }
}


// ============ 主题8：火山核心（第三关·场景3） ============
function genVolcanoCore(): BackgroundSet {
  // 远景：巨大火山口 + 喷射烟柱
  const farLayer = createCanvas(1024, 200)
  const farCtx = farLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 200) {
    const h = 150 + Math.floor(Math.sin(x * 0.05) * 20)
    // 火山锥
    px(farCtx, x, 200 - h, 200, h, '#4a0e06')
    px(farCtx, x + 40, 200 - h, 120, 10, '#6a2008')
    // 火山口发光
    px(farCtx, x + 60, 200 - h - 6, 80, 8, '#ff6600')
    px(farCtx, x + 70, 200 - h - 3, 60, 4, '#ffcc00')
    // 熔岩流下
    px(farCtx, x + 80, 200 - h + 8, 8, 40, '#ff4400')
    px(farCtx, x + 84, 200 - h + 10, 4, 36, '#ffaa00')
  }
  // 烟柱
  for (let i = 0; i < 4; i++) {
    const sx = 120 + i * 280
    for (let y = 0; y < 150; y += 3) {
      px(farCtx, sx + (y % 6), 190 - y, 4, 3, `rgba(60,20,16,${0.6 - y * 0.004})`)
      px(farCtx, sx + 8 + (y % 5), 186 - y, 3, 3, `rgba(120,40,20,${0.5 - y * 0.003})`)
    }
  }

  // 中景：熔岩湖 + 石柱
  const midLayer = createCanvas(1024, 280)
  const midCtx = midLayer.getContext('2d')!
  // 熔岩湖（波纹）
  px(midCtx, 0, 230, 1024, 50, '#ff2200')
  px(midCtx, 0, 234, 1024, 40, '#ff4400')
  px(midCtx, 0, 240, 1024, 30, '#ff6600')
  px(midCtx, 0, 250, 1024, 16, '#ff8800')
  for (let x = 0; x < 1024; x += 40) {
    px(midCtx, x, 236, 16, 2, '#ffcc00')
    px(midCtx, x + 20, 246, 10, 2, '#ffdd66')
    px(midCtx, x + 10, 256, 18, 2, '#ffcc00')
  }
  // 熔岩石柱
  for (let x = 0; x < 1024; x += 170) {
    const tx = x + ((x * 13) % 60)
    px(midCtx, tx, 60, 24, 170, '#1a0602')
    px(midCtx, tx + 4, 64, 16, 166, '#2a0e04')
    // 柱上裂纹发光
    px(midCtx, tx + 10, 90, 4, 30, '#ff4400')
    px(midCtx, tx + 6, 140, 4, 24, '#ff6600')
    // 柱顶火苗
    px(midCtx, tx + 8, 52, 8, 10, '#ff8800')
    px(midCtx, tx + 10, 44, 4, 10, '#ffcc00')
    px(midCtx, tx + 11, 40, 2, 6, '#ffff66')
  }
  // 火星上升
  for (let i = 0; i < 18; i++) {
    px(midCtx, (i * 53) % 1024, 150 - (i * 31) % 120, 2, 2, '#ff8800')
    px(midCtx, (i * 53 + 20) % 1024, 180 - (i * 29) % 140, 2, 2, '#ffaa00')
  }

  // 前景：火苗 + 灰烬堆
  const frontLayer = createCanvas(1024, 80)
  const frontCtx = frontLayer.getContext('2d')!
  for (let x = 0; x < 1024; x += 12) {
    if ((x * 3) % 36 === 0) {
      // 小火苗
      const fh = 14 + ((x * 7) % 12)
      px(frontCtx, x, 80 - fh, 4, fh, '#ff4400')
      px(frontCtx, x + 1, 80 - fh + 3, 2, fh - 3, '#ff8800')
      px(frontCtx, x + 1, 80 - fh - 4, 2, 6, '#ffcc00')
      px(frontCtx, x + 1, 80 - fh - 8, 1, 4, '#ffff88')
    } else {
      // 灰烬
      px(frontCtx, x, 76, 3, 4, '#3a1a0a')
      px(frontCtx, x + 5, 74, 2, 6, '#2a1208')
    }
  }

  return {
    sky: { colorTop: '#3a0301', colorMid: '#6a1004', colorBottom: '#9a2a06' },
    layers: [
      { canvas: farLayer, width: 1024, height: 200, parallax: 0.2 },
      { canvas: midLayer, width: 1024, height: 280, parallax: 0.5 },
      { canvas: frontLayer, width: 1024, height: 80, parallax: 0.85 },
    ],
    groundColor: '#2a0a04',
    groundDetail: (ctx, x, y, w, h) => {
      // 火山核心地表（密集熔岩缝）
      px(ctx, x, y, w, 4, '#3a1006')
      px(ctx, x, y + 4, w, 3, '#2a0804')
      px(ctx, x, y + 7, w, h - 7, '#1a0402')
      // 密集熔岩裂缝
      for (let gx = 0; gx < w; gx += 16) {
        px(ctx, x + gx, y + 8, 10, 2, '#ff4400')
        px(ctx, x + gx + 2, y + 10, 6, 1, '#ff8800')
        px(ctx, x + gx + 3, y + 6, 4, 2, '#ffcc00')
      }
      // 热浪发光点
      for (let gx = 0; gx < w; gx += 30) {
        px(ctx, x + gx + 12, y + 16, 3, 3, '#ff6600')
      }
    },
  }
}

// ============ 入口：生成所有主题背景 ============
// 主题索引：0 草原 | 1 沼泽 | 2 巨树 | 3 月夜森林 | 4 枯木峡谷 | 5 银月祭坛 | 6 岩浆前哨 | 7 熔岩裂谷 | 8 火山核心
export function generateAllBackgrounds(): void {
  if (bgCache.size > 0) return
  bgCache.set(0, genGrassland())
  bgCache.set(1, genMarsh())
  bgCache.set(2, genGiantTree())
  bgCache.set(3, genDarkForest())
  bgCache.set(4, genDeadCanyon())
  bgCache.set(5, genMoonAltar())
  bgCache.set(6, genFireHell())
  bgCache.set(7, genLavaRift())
  bgCache.set(8, genVolcanoCore())
}


export function getBackground(levelId: number): BackgroundSet | undefined {
  return bgCache.get(levelId)
}

// ============ 菜单背景：城堡废墟黄昏 ============
let menuBgCache: HTMLCanvasElement | null = null
export function generateMenuBackground(): HTMLCanvasElement {
  if (menuBgCache) return menuBgCache

  const W = 1024, H = 576
  const cvs = createCanvas(W, H)
  const ctx = cvs.getContext('2d')!

  // 天空渐变（黄昏紫橙）
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#2a0a3a')
  sky.addColorStop(0.4, '#6a2a4a')
  sky.addColorStop(0.7, '#aa5a3a')
  sky.addColorStop(1, '#5a2a1a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)

  // 月亮/太阳
  const sunX = 800, sunY = 120
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 60)
  sunGrad.addColorStop(0, 'rgba(255,200,120,1)')
  sunGrad.addColorStop(0.5, 'rgba(255,150,80,0.6)')
  sunGrad.addColorStop(1, 'rgba(255,100,50,0)')
  ctx.fillStyle = sunGrad
  ctx.fillRect(sunX - 60, sunY - 60, 120, 120)
  px(ctx, sunX - 30, sunY - 30, 60, 60, '#ffd090')
  px(ctx, sunX - 26, sunY - 26, 52, 52, '#ffe0a0')

  // 远山（剪影）
  for (let x = 0; x < W; x += 100) {
    const h = 120 + ((x * 7) % 60)
    px(ctx, x, H - h - 200, 100, h + 200, '#2a0a2a')
  }

  // 中景：城堡废墟剪影
  // 主体城堡
  const cx = W / 2 - 120
  // 主塔
  px(ctx, cx, H - 280, 80, 280, '#1a0a1a')
  px(ctx, cx + 10, H - 320, 60, 40, '#1a0a1a')
  px(ctx, cx + 30, H - 360, 20, 40, '#1a0a1a')
  // 城垛
  for (let bx = 0; bx < 80; bx += 16) {
    px(ctx, cx + bx, H - 286, 10, 8, '#1a0a1a')
  }
  // 破洞窗户（透光）
  px(ctx, cx + 24, H - 240, 8, 16, '#ff8800')
  px(ctx, cx + 44, H - 200, 6, 12, '#ff6600')
  px(ctx, cx + 16, H - 160, 10, 14, '#ff8800')

  // 侧塔
  px(ctx, cx - 60, H - 220, 50, 220, '#1a0a1a')
  px(ctx, cx - 50, H - 240, 30, 20, '#1a0a1a')
  // 侧塔窗
  px(ctx, cx - 40, H - 180, 6, 10, '#ff6600')
  px(ctx, cx - 30, H - 140, 6, 10, '#ff8800')

  px(ctx, cx + 130, H - 240, 50, 240, '#1a0a1a')
  px(ctx, cx + 140, H - 260, 30, 20, '#1a0a1a')
  px(ctx, cx + 150, H - 200, 6, 10, '#ff6600')
  px(ctx, cx + 160, H - 160, 6, 10, '#ff8800')

  // 前景：枯树 + 草丛
  for (let x = 0; x < W; x += 50) {
    if ((x * 3) % 100 === 0) {
      // 枯树
      const tx = x + 10
      px(ctx, tx, H - 60, 4, 60, '#0a0508')
      px(ctx, tx - 8, H - 80, 12, 2, '#0a0508')
      px(ctx, tx - 12, H - 95, 8, 2, '#0a0508')
      px(ctx, tx + 4, H - 70, 10, 2, '#0a0508')
      px(ctx, tx + 8, H - 85, 6, 2, '#0a0508')
    } else if ((x * 5) % 75 === 0) {
      // 草
      px(ctx, x + 4, H - 30, 2, 30, '#1a0a0a')
      px(ctx, x + 6, H - 25, 1, 25, '#2a1a1a')
      px(ctx, x + 8, H - 30, 2, 30, '#1a0a0a')
    }
  }

  // 地面
  const groundGrad = ctx.createLinearGradient(0, H - 30, 0, H)
  groundGrad.addColorStop(0, '#1a0a0a')
  groundGrad.addColorStop(1, '#0a0508')
  ctx.fillStyle = groundGrad
  ctx.fillRect(0, H - 30, W, 30)

  // 星星
  ctx.fillStyle = 'rgba(255,255,200,0.8)'
  for (let i = 0; i < 80; i++) {
    const sx = (i * 137) % W
    const sy = (i * 73) % 200
    px(ctx, sx, sy, 1, 1, '#ffe')
    if (i % 6 === 0) px(ctx, sx, sy, 2, 2, '#ffe')
  }

  // 雾气
  ctx.fillStyle = 'rgba(120,60,80,0.2)'
  ctx.fillRect(0, H - 120, W, 90)

  menuBgCache = cvs
  return cvs
}
