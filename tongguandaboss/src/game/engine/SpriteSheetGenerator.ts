// ============ 精灵图生成器（运行时生成多帧精灵图）============
// 真正的精灵图：一张大图水平排列多帧，渲染时按帧索引切片

export interface SpriteSheet {
  canvas: HTMLCanvasElement
  frameWidth: number
  frameHeight: number
  frameCount: number
}

const sheetCache: Map<string, SpriteSheet> = new Map()

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const cvs = document.createElement('canvas')
  cvs.width = width
  cvs.height = height
  const ctx = cvs.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return cvs
}

// 像素绘制辅助
function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

// ============ 玩家精灵图（每帧 32x40，4 种动画）============

// 玩家通用骨架（朝右）
function drawPlayerBase(ctx: CanvasRenderingContext2D, ox: number, oy: number, pose: {
  bodyDx: number; bodyDy: number
  headDx: number; headDy: number
  legL: number; legR: number  // 腿偏移
  armAngle: number            // 手臂角度
  weaponVisible: boolean
}) {
  const SKIN = '#ffdbb4'
  const ARMOR = '#4a90d9'
  const ARMOR_DARK = '#2a5a99'
  const HELMET = '#888'
  const HELMET_DARK = '#555'
  const BOOT = '#3a2010'
  const GOLD = '#ffd700'

  // 阴影
  px(ctx, ox + 8, oy + 36, 16, 2, 'rgba(0,0,0,0.3)')

  // 腿（左右）
  px(ctx, ox + 10, oy + 22 + pose.legL, 4, 12 - Math.abs(pose.legL), '#5a3a2a')
  px(ctx, ox + 18, oy + 22 + pose.legR, 4, 12 - Math.abs(pose.legR), '#5a3a2a')
  // 靴子
  px(ctx, ox + 9, oy + 32 + pose.legL, 6, 4, BOOT)
  px(ctx, ox + 17, oy + 32 + pose.legR, 6, 4, BOOT)

  // 身体（铠甲）
  px(ctx, ox + 8 + pose.bodyDx, oy + 14 + pose.bodyDy, 16, 12, ARMOR)
  // 铠甲暗部
  px(ctx, ox + 8 + pose.bodyDx, oy + 22 + pose.bodyDy, 16, 4, ARMOR_DARK)
  // 金色腰带
  px(ctx, ox + 8 + pose.bodyDx, oy + 22 + pose.bodyDy, 16, 2, GOLD)
  // 胸口装饰
  px(ctx, ox + 14 + pose.bodyDx, oy + 16 + pose.bodyDy, 4, 4, GOLD)

  // 护肩
  px(ctx, ox + 6 + pose.bodyDx, oy + 13 + pose.bodyDy, 4, 4, HELMET)
  px(ctx, ox + 22 + pose.bodyDx, oy + 13 + pose.bodyDy, 4, 4, HELMET)

  // 头
  px(ctx, ox + 11 + pose.headDx, oy + 4 + pose.headDy, 10, 10, SKIN)
  // 头盔
  px(ctx, ox + 10 + pose.headDx, oy + 2 + pose.headDy, 12, 5, HELMET)
  px(ctx, ox + 10 + pose.headDx, oy + 6 + pose.headDy, 12, 2, HELMET_DARK)
  // 头盔金边
  px(ctx, ox + 10 + pose.headDx, oy + 6 + pose.headDy, 12, 1, GOLD)
  // 头盔羽毛
  px(ctx, ox + 15 + pose.headDx, oy + 0 + pose.headDy, 2, 4, '#c44')
  // 眼睛
  px(ctx, ox + 14 + pose.headDx, oy + 9 + pose.headDy, 2, 2, '#000')
  px(ctx, ox + 18 + pose.headDx, oy + 9 + pose.headDy, 2, 2, '#000')

  // 手臂
  ctx.save()
  ctx.translate(ox + 24 + pose.bodyDx, oy + 18 + pose.bodyDy)
  ctx.rotate(pose.armAngle)
  px(ctx, -2, -1, 8, 4, ARMOR)
  px(ctx, 5, -2, 4, 6, SKIN)  // 手
  ctx.restore()
}

// 待机动画 - 4 帧（呼吸）
function genPlayerIdle(): SpriteSheet {
  const FW = 32, FH = 40, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const breath = Math.sin((i / FC) * Math.PI * 2) * 1
    drawPlayerBase(ctx, i * FW, 0, {
      bodyDx: 0, bodyDy: breath,
      headDx: 0, headDy: breath,
      legL: 0, legR: 0,
      armAngle: 0.1 + breath * 0.02,
      weaponVisible: true
    })
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 行走动画 - 6 帧（四肢摆动）
function genPlayerWalk(): SpriteSheet {
  const FW = 32, FH = 40, FC = 6
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const legL = Math.sin(t * Math.PI * 2) * 3
    const legR = -legL
    const armAngle = Math.sin(t * Math.PI * 2) * 0.3
    const bodyBob = Math.abs(Math.sin(t * Math.PI * 2)) * -1
    drawPlayerBase(ctx, i * FW, 0, {
      bodyDx: 0, bodyDy: bodyBob,
      headDx: 0, headDy: bodyBob,
      legL, legR,
      armAngle,
      weaponVisible: true
    })
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 攻击动画 - 6 帧（蓄力→挥砍→收回）
function genPlayerAttack(): SpriteSheet {
  const FW = 32, FH = 40, FC = 6
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / (FC - 1)
    let armAngle: number
    let bodyDx = 0
    if (t < 0.3) {
      // 蓄力
      armAngle = 0.1 - (t / 0.3) * 1.2
    } else if (t < 0.7) {
      // 挥砍
      armAngle = -1.1 + ((t - 0.3) / 0.4) * 2.8
      bodyDx = 2
    } else {
      // 收回
      armAngle = 1.7 - ((t - 0.7) / 0.3) * 1.5
      bodyDx = 1
    }
    drawPlayerBase(ctx, i * FW, 0, {
      bodyDx, bodyDy: 0,
      headDx: 0, headDy: 0,
      legL: 0, legR: 0,
      armAngle,
      weaponVisible: true
    })

    // 挥砍阶段画剑光
    if (t > 0.3 && t < 0.7) {
      const alpha = Math.sin((t - 0.3) / 0.4 * Math.PI) * 0.6
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = '#ffffcc'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(i * FW + 22, 18, 22, -1, 1.5)
      ctx.stroke()
      ctx.restore()
    }
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 跳跃动画 - 4 帧（蹲下→起跳→悬空→下落）
function genPlayerJump(): SpriteSheet {
  const FW = 32, FH = 40, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  const poses = [
    { legL: 2, legR: 2, armAngle: -0.3, bodyDy: 2 },    // 蓄力
    { legL: -2, legR: -2, armAngle: -0.8, bodyDy: -2 }, // 起跳
    { legL: -3, legR: -3, armAngle: -0.5, bodyDy: -3 }, // 悬空
    { legL: 1, legR: 1, armAngle: 0.2, bodyDy: 0 },     // 下落
  ]
  for (let i = 0; i < FC; i++) {
    const p = poses[i]!
    drawPlayerBase(ctx, i * FW, 0, {
      bodyDx: 0, bodyDy: p.bodyDy,
      headDx: 0, headDy: p.bodyDy,
      legL: p.legL, legR: p.legR,
      armAngle: p.armAngle,
      weaponVisible: true
    })
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// ============ 敌人精灵图（每帧 28x28）============

// 史莱姆 - 4 帧弹跳
function genSlime(): SpriteSheet {
  const FW = 28, FH = 28, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const squish = Math.sin(t * Math.PI * 2)
    const h = 14 + squish * 4   // 高度变化
    const w = 20 - squish * 2   // 宽度变化
    const x = i * FW + (28 - w) / 2
    const y = 28 - h
    // 身体
    ctx.fillStyle = '#44cc44'
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.beginPath()
    ctx.ellipse(x + 6, y + 4, 4, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    // 眼睛
    px(ctx, x + 7, y + h / 2 - 2, 3, 3, '#fff')
    px(ctx, x + 14, y + h / 2 - 2, 3, 3, '#fff')
    px(ctx, x + 8, y + h / 2 - 1, 1, 1, '#000')
    px(ctx, x + 15, y + h / 2 - 1, 1, 1, '#000')
    // 阴影
    px(ctx, x + 2, 26, w - 4, 2, 'rgba(0,0,0,0.3)')
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 骷髅 - 4 帧行走
function genSkeleton(): SpriteSheet {
  const FW = 28, FH = 32, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const legSwing = Math.sin(t * Math.PI * 2) * 2
    const armSwing = Math.sin(t * Math.PI * 2) * 3
    const ox = i * FW
    // 阴影
    px(ctx, ox + 6, 30, 16, 2, 'rgba(0,0,0,0.3)')
    // 腿
    px(ctx, ox + 10, 18, 3, 12 + legSwing, '#ddd')
    px(ctx, ox + 15, 18, 3, 12 - legSwing, '#ddd')
    // 身体（肋骨）
    px(ctx, ox + 8, 8, 12, 10, '#ddd')
    px(ctx, ox + 10, 10, 2, 6, '#888')
    px(ctx, ox + 16, 10, 2, 6, '#888')
    px(ctx, ox + 8, 12, 12, 1, '#888')
    px(ctx, ox + 8, 15, 12, 1, '#888')
    // 头骨
    px(ctx, ox + 9, 0, 10, 8, '#eee')
    px(ctx, ox + 11, 2, 2, 2, '#300')
    px(ctx, ox + 15, 2, 2, 2, '#300')
    px(ctx, ox + 11, 5, 6, 1, '#300')
    // 手臂 + 剑
    px(ctx, ox + 4, 10, 3, 8, '#ddd')
    px(ctx, ox + 20, 10, 3, 8, '#ddd')
    px(ctx, ox + 22 + armSwing, 14, 2, 10, '#aaa')
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 哥布林 - 4 帧行走
function genGoblin(): SpriteSheet {
  const FW = 28, FH = 32, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const legSwing = Math.sin(t * Math.PI * 2) * 2
    const ox = i * FW
    px(ctx, ox + 6, 30, 16, 2, 'rgba(0,0,0,0.3)')
    // 腿
    px(ctx, ox + 9, 18, 4, 12 + legSwing, '#6b3a1f')
    px(ctx, ox + 15, 18, 4, 12 - legSwing, '#6b3a1f')
    // 身体
    px(ctx, ox + 7, 8, 14, 12, '#4a8c2a')
    px(ctx, ox + 7, 16, 14, 2, '#8B4513')  // 腰带
    px(ctx, ox + 13, 15, 4, 4, '#ffd700')  // 腰带扣
    // 头
    px(ctx, ox + 9, 0, 10, 9, '#7ab648')
    // 尖耳朵
    px(ctx, ox + 5, 2, 4, 2, '#7ab648')
    px(ctx, ox + 19, 2, 4, 2, '#7ab648')
    // 眼睛
    px(ctx, ox + 11, 3, 3, 3, '#ff0')
    px(ctx, ox + 16, 3, 3, 3, '#ff0')
    px(ctx, ox + 12, 4, 1, 1, '#000')
    px(ctx, ox + 17, 4, 1, 1, '#000')
    // 牙齿
    px(ctx, ox + 13, 7, 2, 1, '#fff')
    // 匕首
    px(ctx, ox + 22, 12, 2, 8, '#888')
    px(ctx, ox + 21, 18, 4, 2, '#aa6600')
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 暗黑法师 - 4 帧施法
function genDarkMage(): SpriteSheet {
  const FW = 28, FH = 36, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const staffGlow = (Math.sin(t * Math.PI * 2) + 1) / 2
    const ox = i * FW
    px(ctx, ox + 6, 34, 16, 2, 'rgba(0,0,0,0.3)')
    // 长袍
    ctx.fillStyle = '#3a1a6e'
    ctx.beginPath()
    ctx.moveTo(ox + 4, 12)
    ctx.lineTo(ox + 6, 34)
    ctx.lineTo(ox + 22, 34)
    ctx.lineTo(ox + 24, 12)
    ctx.closePath()
    ctx.fill()
    // 头
    px(ctx, ox + 10, 4, 8, 8, '#ffdbb4')
    // 帽子
    ctx.fillStyle = '#3a1a6e'
    ctx.beginPath()
    ctx.moveTo(ox + 6, 8)
    ctx.lineTo(ox + 14, -2)
    ctx.lineTo(ox + 22, 8)
    ctx.closePath()
    ctx.fill()
    px(ctx, ox + 12, -2, 4, 4, '#ffd700')
    // 眼睛（发光）
    px(ctx, ox + 11, 7, 2, 2, '#ff00ff')
    px(ctx, ox + 16, 7, 2, 2, '#ff00ff')
    // 法杖
    px(ctx, ox + 22, 14, 2, 22, '#8B4513')
    // 法杖宝石（发光）
    ctx.fillStyle = '#ff00ff'
    ctx.beginPath()
    ctx.arc(ox + 23, 14, 3 + staffGlow * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(255,0,255,${0.3 + staffGlow * 0.4})`
    ctx.beginPath()
    ctx.arc(ox + 23, 14, 6 + staffGlow * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 重甲骑士 - 4 帧行走
function genArmoredKnight(): SpriteSheet {
  const FW = 32, FH = 40, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const legSwing = Math.sin(t * Math.PI * 2) * 2
    const ox = i * FW
    px(ctx, ox + 6, 38, 20, 2, 'rgba(0,0,0,0.3)')
    // 腿
    px(ctx, ox + 10, 24, 6, 14 + legSwing, '#777')
    px(ctx, ox + 16, 24, 6, 14 - legSwing, '#777')
    px(ctx, ox + 9, 32 + legSwing, 8, 4, '#999')
    px(ctx, ox + 15, 32 - legSwing, 8, 4, '#999')
    // 身体（板甲）
    px(ctx, ox + 6, 12, 20, 16, '#888')
    px(ctx, ox + 6, 18, 20, 2, '#aaa')
    px(ctx, ox + 14, 14, 4, 4, '#ffd700')
    // 肩甲
    px(ctx, ox + 4, 12, 4, 6, '#999')
    px(ctx, ox + 24, 12, 4, 6, '#999')
    // 头盔
    px(ctx, ox + 8, 2, 16, 10, '#888')
    px(ctx, ox + 8, 8, 16, 4, '#444')  // 面甲
    px(ctx, ox + 11, 9, 2, 2, '#ff4')  // 眼
    px(ctx, ox + 19, 9, 2, 2, '#ff4')
    // 头盔羽毛
    px(ctx, ox + 15, -2, 2, 6, '#c44')
    // 盾牌
    px(ctx, ox + 0, 14, 6, 14, '#666')
    px(ctx, ox + 1, 16, 4, 10, '#888')
    px(ctx, ox + 2, 19, 2, 4, '#ffd700')
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// ============ Boss 精灵图（每关独特造型）============

// 第一关Boss：草原守护者 - 巨型植物战士
function genGrasslandGuardian(): SpriteSheet {
  const FW = 96, FH = 96, FC = 8
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const attack = i >= 4
    const at = i - 4
    const t = (i % 4) / 4
    const breath = Math.sin(t * Math.PI * 2) * 2
    const sway = Math.sin(t * Math.PI * 2) * 1
    const ox = i * FW

    // 阴影
    px(ctx, ox + 12, 90, 72, 4, 'rgba(0,0,0,0.4)')

    // 根须脚（像树根）
    px(ctx, ox + 20, 74, 10, 16, '#4a2a0a')
    px(ctx, ox + 66, 74, 10, 16, '#4a2a0a')
    px(ctx, ox + 16, 86, 6, 4, '#3a1a04')
    px(ctx, ox + 74, 86, 6, 4, '#3a1a04')
    // 根须
    px(ctx, ox + 14, 88, 3, 2, '#5a3a14')
    px(ctx, ox + 79, 88, 3, 2, '#5a3a14')

    // 身体（树干）
    px(ctx, ox + 20, 24 + breath, 56, 52, '#5a3a1a')
    px(ctx, ox + 20, 24 + breath, 56, 3, '#6b4a2a')  // 高光
    px(ctx, ox + 20, 72 + breath, 56, 4, '#3a1a04')  // 阴影

    // 树皮纹理（竖线）
    px(ctx, ox + 30, 28 + breath, 1, 44, '#4a2a10')
    px(ctx, ox + 45, 30 + breath, 2, 42, '#4a2a10')
    px(ctx, ox + 60, 28 + breath, 1, 44, '#4a2a10')
    // 苔藓斑点
    px(ctx, ox + 28, 40 + breath, 4, 3, '#4a8a2a')
    px(ctx, ox + 55, 50 + breath, 5, 3, '#4a8a2a')
    px(ctx, ox + 40, 60 + breath, 3, 2, '#6aaa3a')

    // 头（树精头）
    px(ctx, ox + 30, 4 + breath, 36, 24, '#6b4a2a')
    px(ctx, ox + 30, 4 + breath, 36, 3, '#8b6a4a')  // 头顶高光
    // 树冠
    px(ctx, ox + 22, 0 + breath + sway, 52, 8, '#2a6a2a')
    px(ctx, ox + 18, 2 + breath + sway, 60, 4, '#3a8a3a')
    px(ctx, ox + 26, -4 + breath + sway, 44, 6, '#4a9a4a')
    // 叶子装饰
    px(ctx, ox + 24, -6 + breath + sway, 6, 4, '#5aaa4a')
    px(ctx, ox + 66, -6 + breath + sway, 6, 4, '#5aaa4a')
    px(ctx, ox + 45, -8 + breath + sway, 8, 5, '#6aba5a')

    // 眼睛（绿色发光）
    px(ctx, ox + 36, 12 + breath, 8, 7, '#1a3a0a')
    px(ctx, ox + 52, 12 + breath, 8, 7, '#1a3a0a')
    px(ctx, ox + 38, 13 + breath, 4, 5, '#4aff4a')
    px(ctx, ox + 54, 13 + breath, 4, 5, '#4aff4a')
    px(ctx, ox + 39, 14 + breath, 2, 3, '#aaffaa')
    px(ctx, ox + 55, 14 + breath, 2, 3, '#aaffaa')

    // 嘴
    px(ctx, ox + 42, 22 + breath, 12, 3, '#1a3a0a')
    px(ctx, ox + 44, 22 + breath, 2, 3, '#fff')  // 牙
    px(ctx, ox + 50, 22 + breath, 2, 3, '#fff')

    // 手臂（藤蔓）
    px(ctx, ox + 6, 28 + breath + sway, 14, 6, '#3a6a2a')
    px(ctx, ox + 14, 34 + breath + sway, 6, 24, '#3a6a2a')
    // 藤蔓卷曲
    px(ctx, ox + 12, 58 + breath + sway, 8, 6, '#4a8a3a')
    px(ctx, ox + 14, 64 + breath + sway, 6, 4, '#2a5a1a')
    // 右手
    px(ctx, ox + 76, 28 + breath - sway, 14, 6, '#3a6a2a')
    px(ctx, ox + 76, 34 + breath - sway, 6, 24, '#3a6a2a')
    px(ctx, ox + 78, 58 + breath - sway, 8, 6, '#4a8a3a')

    // 武器（藤蔓巨锤）
    px(ctx, ox + 78, 24 + breath - sway, 4, 30, '#5a3a1a')
    px(ctx, ox + 72, 18 + breath - sway, 16, 12, '#6a4a2a')
    px(ctx, ox + 72, 18 + breath - sway, 16, 3, '#7a5a3a')
    // 锤子叶子
    px(ctx, ox + 70, 14 + breath - sway, 5, 6, '#3a8a3a')
    px(ctx, ox + 81, 14 + breath - sway, 5, 6, '#3a8a3a')

    // ===== 攻击帧：挥动藤蔓巨锤 + 怒吼 =====
    if (attack) {
      ctx.save()
      ctx.translate(3, 0)
      // 身体前压
      px(ctx, ox + 20, 24 + breath, 56, 52, '#4a2a12')
      px(ctx, ox + 20, 24 + breath, 56, 3, '#5a3a1a')
      // 巨锤高举过头（随攻击子帧推进）
      const hammerLift = at * 2
      px(ctx, ox + 76, 4 + breath + hammerLift, 16, 12, '#6a4a2a')
      px(ctx, ox + 78, 14 + breath + hammerLift, 4, 28, '#5a3a1a')
      px(ctx, ox + 68, 10 + breath + hammerLift, 5, 6, '#3a8a3a')
      px(ctx, ox + 81, 10 + breath + hammerLift, 5, 6, '#3a8a3a')
      // 绿色挥击弧线
      ctx.strokeStyle = 'rgba(100,255,120,0.85)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(ox + 78, 26 + breath, 24 + at * 3, -0.6, 0.9)
      ctx.stroke()
      // 瞪大的发光眼睛
      px(ctx, ox + 36, 11 + breath, 9, 8, '#1a3a0a')
      px(ctx, ox + 52, 11 + breath, 9, 8, '#1a3a0a')
      px(ctx, ox + 38, 12 + breath, 5, 6, '#aaffaa')
      px(ctx, ox + 55, 12 + breath, 5, 6, '#aaffaa')
      // 地面尘土
      px(ctx, ox + 12, 90, 6, 3, 'rgba(200,180,120,0.85)')
      px(ctx, ox + 78, 90, 6, 3, 'rgba(200,180,120,0.85)')
      ctx.restore()
    }
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 第二关Boss：暗影狼王 - 巨大的暗影狼
function genShadowWolfKing(): SpriteSheet {
  const FW = 96, FH = 96, FC = 8
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const attack = i >= 4
    const at = i - 4
    const t = (i % 4) / 4
    const breath = Math.sin(t * Math.PI * 2) * 2
    const earWiggle = Math.sin(t * Math.PI * 2) * 1
    const ox = i * FW

    // 阴影（拖长）
    px(ctx, ox + 8, 90, 80, 4, 'rgba(60,0,100,0.5)')

    // 尾巴
    const tailWag = Math.sin(t * Math.PI * 2) * 6
    ctx.fillStyle = '#2a1a4a'
    ctx.beginPath()
    ctx.moveTo(ox + 76, 60 + breath)
    ctx.quadraticCurveTo(ox + 92 + tailWag, 30 + breath, ox + 88 + tailWag, 10 + breath)
    ctx.lineTo(ox + 94 + tailWag, 14 + breath)
    ctx.quadraticCurveTo(ox + 96 + tailWag, 32 + breath, ox + 82, 62 + breath)
    ctx.fill()
    // 尾巴尖端
    px(ctx, ox + 87 + tailWag, 8 + breath, 8, 6, '#4a2a6a')
    px(ctx, ox + 89 + tailWag, 4 + breath, 4, 6, '#6a4a8a')

    // 后腿
    px(ctx, ox + 18, 68 + breath, 10, 20, '#3a2a5a')
    px(ctx, ox + 68, 68 + breath, 10, 20, '#3a2a5a')
    px(ctx, ox + 16, 86 + breath, 14, 4, '#2a1a4a')
    px(ctx, ox + 66, 86 + breath, 14, 4, '#2a1a4a')

    // 身体（狼身）
    ctx.fillStyle = '#3a2a5a'
    ctx.beginPath()
    ctx.ellipse(ox + 48, 52 + breath, 34, 22, 0, 0, Math.PI * 2)
    ctx.fill()
    // 背部高光
    ctx.fillStyle = '#4a3a7a'
    ctx.beginPath()
    ctx.ellipse(ox + 48, 44 + breath, 28, 10, 0, 0, Math.PI * 2)
    ctx.fill()
    // 暗色腹部
    ctx.fillStyle = '#1a0a3a'
    ctx.beginPath()
    ctx.ellipse(ox + 48, 64 + breath, 28, 10, 0, 0, Math.PI * 2)
    ctx.fill()

    // 毛发纹理
    px(ctx, ox + 26, 44 + breath, 3, 8, '#4a3a7a')
    px(ctx, ox + 36, 40 + breath, 3, 10, '#4a3a7a')
    px(ctx, ox + 56, 40 + breath, 3, 10, '#4a3a7a')
    px(ctx, ox + 66, 44 + breath, 3, 8, '#4a3a7a')

    // 头部（狼头）
    ctx.fillStyle = '#3a2a5a'
    ctx.beginPath()
    ctx.ellipse(ox + 28, 28 + breath, 18, 16, 0, 0, Math.PI * 2)
    ctx.fill()
    // 口鼻部
    ctx.fillStyle = '#2a1a4a'
    ctx.beginPath()
    ctx.ellipse(ox + 14, 32 + breath, 10, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    // 鼻子
    px(ctx, ox + 6, 30 + breath, 4, 4, '#0a0020')
    // 獠牙
    px(ctx, ox + 10, 38 + breath, 2, 4, '#ddd')
    px(ctx, ox + 16, 38 + breath, 2, 4, '#ddd')

    // 耳朵（三角）
    ctx.fillStyle = '#2a1a4a'
    ctx.beginPath()
    ctx.moveTo(ox + 20, 16 + breath)
    ctx.lineTo(ox + 24 + earWiggle, 2 + breath)
    ctx.lineTo(ox + 30, 18 + breath)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(ox + 36, 16 + breath)
    ctx.lineTo(ox + 42 - earWiggle, 2 + breath)
    ctx.lineTo(ox + 44, 18 + breath)
    ctx.fill()
    // 耳朵内侧
    px(ctx, ox + 24 + earWiggle, 10 + breath, 3, 4, '#6a3a7a')
    px(ctx, ox + 40 - earWiggle, 10 + breath, 3, 4, '#6a3a7a')

    // 眼睛（紫色发光）
    px(ctx, ox + 24, 24 + breath, 5, 6, '#0a0020')
    px(ctx, ox + 32, 24 + breath, 5, 6, '#0a0020')
    px(ctx, ox + 25, 25 + breath, 3, 4, '#b400ff')
    px(ctx, ox + 33, 25 + breath, 3, 4, '#b400ff')
    px(ctx, ox + 26, 26 + breath, 1, 2, '#f080ff')
    px(ctx, ox + 34, 26 + breath, 1, 2, '#f080ff')

    // 暗影光环
    ctx.fillStyle = `rgba(128,0,255,${0.1 + Math.sin(t * Math.PI * 2) * 0.05})`
    ctx.beginPath()
    ctx.ellipse(ox + 48, 50 + breath, 44, 30, 0, 0, Math.PI * 2)
    ctx.fill()

    // 爪子
    px(ctx, ox + 12, 88 + breath, 3, 4, '#ddd')
    px(ctx, ox + 16, 88 + breath, 3, 4, '#ddd')
    px(ctx, ox + 68, 88 + breath, 3, 4, '#ddd')
    px(ctx, ox + 72, 88 + breath, 3, 4, '#ddd')

    // ===== 攻击帧：前扑张口嚎叫 + 凝聚暗影弹 =====
    if (attack) {
      ctx.save()
      ctx.translate(3, 0)
      // 张开的巨口（覆盖口鼻部）
      ctx.fillStyle = '#0a0020'
      ctx.beginPath()
      ctx.ellipse(ox + 14, 32 + breath, 11, 9, 0, 0, Math.PI * 2)
      ctx.fill()
      // 獠牙
      px(ctx, ox + 7, 29 + breath, 3, 6, '#fff')
      px(ctx, ox + 14, 29 + breath, 3, 6, '#fff')
      px(ctx, ox + 20, 31 + breath, 3, 6, '#fff')
      // 暗影能量球（在嘴前凝聚，随子帧扩大）
      const ballR = 4 + at * 1.6
      ctx.fillStyle = `rgba(180,80,255,${0.7 + at * 0.06})`
      ctx.beginPath()
      ctx.arc(ox + 2, 30 + breath, ballR, 0, Math.PI * 2)
      ctx.fill()
      // 嚎叫扩散波纹
      ctx.strokeStyle = `rgba(180,80,255,${0.8 - at * 0.1})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(ox + 12, 30 + breath, 14 + at * 2, -1.3, 1.0)
      ctx.stroke()
      // 怒视发亮
      px(ctx, ox + 25, 25 + breath, 4, 5, '#ff80ff')
      px(ctx, ox + 33, 25 + breath, 4, 5, '#ff80ff')
      // 前爪刨地烟尘
      px(ctx, ox + 10, 90, 6, 3, 'rgba(120,60,180,0.7)')
      px(ctx, ox + 76, 90, 6, 3, 'rgba(120,60,180,0.7)')
      ctx.restore()
    }
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 第三关Boss：熔岩魔王 - 熔岩恶魔
function genMagmaDemonLord(): SpriteSheet {
  const FW = 96, FH = 96, FC = 8
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const attack = i >= 4
    const at = i - 4
    const t = (i % 4) / 4
    const breath = Math.sin(t * Math.PI * 2) * 2
    const flameFlicker = Math.sin(t * Math.PI * 4) * 2
    const ox = i * FW

    // 岩浆地面效果
    ctx.fillStyle = `rgba(255,80,0,${0.3 + Math.sin(t * Math.PI * 2) * 0.1})`
    ctx.beginPath()
    ctx.ellipse(ox + 48, 92, 44, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    // 岩浆裂纹
    px(ctx, ox + 20, 90, 2, 6, '#ff4400')
    px(ctx, ox + 40, 92, 2, 4, '#ff8800')
    px(ctx, ox + 60, 90, 2, 6, '#ff4400')
    px(ctx, ox + 76, 92, 2, 4, '#ffaa00')

    // 腿（熔岩柱）
    px(ctx, ox + 22, 64 + breath, 14, 24, '#3a0a00')
    px(ctx, ox + 60, 64 + breath, 14, 24, '#3a0a00')
    // 岩浆流动
    px(ctx, ox + 24, 68 + breath, 10, 2, '#cc3300')
    px(ctx, ox + 62, 68 + breath, 10, 2, '#cc3300')
    px(ctx, ox + 26, 74 + breath, 6, 2, '#ff6600')
    px(ctx, ox + 64, 74 + breath, 6, 2, '#ff6600')
    // 蹄子
    px(ctx, ox + 20, 86 + breath, 18, 4, '#1a0000')
    px(ctx, ox + 58, 86 + breath, 18, 4, '#1a0000')

    // 身体（熔岩装甲）
    const bodyGrad = ctx.createLinearGradient(ox, 0, ox + FW, 0)
    bodyGrad.addColorStop(0, '#3a0a00')
    bodyGrad.addColorStop(0.3, '#8a1a00')
    bodyGrad.addColorStop(0.5, '#cc3300')
    bodyGrad.addColorStop(0.7, '#8a1a00')
    bodyGrad.addColorStop(1, '#3a0a00')
    ctx.fillStyle = bodyGrad
    ctx.fillRect(ox + 14, 24 + breath, 68, 44)

    // 岩浆裂纹（发光）
    ctx.fillStyle = `rgba(255,200,0,${0.6 + Math.sin(t * Math.PI * 2) * 0.3})`
    ctx.beginPath()
    ctx.moveTo(ox + 24, 30 + breath)
    ctx.lineTo(ox + 28, 40 + breath)
    ctx.lineTo(ox + 22, 50 + breath)
    ctx.lineTo(ox + 30, 60 + breath)
    ctx.lineTo(ox + 26, 68 + breath)
    ctx.lineTo(ox + 34, 64 + breath)
    ctx.stroke()
    ctx.lineWidth = 2
    ctx.strokeStyle = `rgba(255,200,0,${0.6 + Math.sin(t * Math.PI * 2) * 0.3})`
    ctx.beginPath()
    ctx.moveTo(ox + 24, 30 + breath)
    ctx.lineTo(ox + 28, 40 + breath)
    ctx.lineTo(ox + 22, 50 + breath)
    ctx.lineTo(ox + 30, 60 + breath)
    ctx.lineTo(ox + 26, 68 + breath)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(ox + 64, 32 + breath)
    ctx.lineTo(ox + 60, 42 + breath)
    ctx.lineTo(ox + 68, 52 + breath)
    ctx.lineTo(ox + 62, 64 + breath)
    ctx.stroke()

    // 胸口核心
    ctx.fillStyle = '#ffaa00'
    ctx.beginPath()
    ctx.arc(ox + 48, 46 + breath, 8 + flameFlicker, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffff00'
    ctx.beginPath()
    ctx.arc(ox + 48, 46 + breath, 4 + flameFlicker * 0.5, 0, Math.PI * 2)
    ctx.fill()

    // 巨角
    ctx.fillStyle = '#1a0000'
    ctx.beginPath()
    ctx.moveTo(ox + 28, 24 + breath)
    ctx.lineTo(ox + 18, -8 + breath)
    ctx.lineTo(ox + 34, 20 + breath)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(ox + 68, 24 + breath)
    ctx.lineTo(ox + 78, -8 + breath)
    ctx.lineTo(ox + 62, 20 + breath)
    ctx.fill()
    // 角上的岩浆
    px(ctx, ox + 22, 8 + breath, 4, 6, '#cc3300')
    px(ctx, ox + 72, 8 + breath, 4, 6, '#cc3300')
    px(ctx, ox + 24, 0 + breath + flameFlicker, 2, 6, '#ff6600')
    px(ctx, ox + 72, 0 + breath + flameFlicker, 2, 6, '#ff6600')

    // 头
    ctx.fillStyle = '#cc3300'
    ctx.beginPath()
    ctx.moveTo(ox + 30, 24 + breath)
    ctx.lineTo(ox + 66, 24 + breath)
    ctx.lineTo(ox + 70, 10 + breath)
    ctx.lineTo(ox + 48, 2 + breath)
    ctx.lineTo(ox + 26, 10 + breath)
    ctx.closePath()
    ctx.fill()
    // 头暗部
    px(ctx, ox + 36, 18 + breath, 24, 6, '#8a1a00')

    // 眼睛（火焰）
    px(ctx, ox + 34, 14 + breath, 8, 6, '#000')
    px(ctx, ox + 54, 14 + breath, 8, 6, '#000')
    px(ctx, ox + 36, 15 + breath, 4, 4, '#ff4400')
    px(ctx, ox + 56, 15 + breath, 4, 4, '#ff4400')
    px(ctx, ox + 37, 15 + breath + flameFlicker, 2, 2, '#ffff00')
    px(ctx, ox + 57, 15 + breath + flameFlicker, 2, 2, '#ffff00')

    // 嘴（火焰吐息）
    px(ctx, ox + 40, 22 + breath, 16, 4, '#1a0000')
    if (flameFlicker > 0) {
      ctx.fillStyle = '#ff6600'
      ctx.beginPath()
      ctx.moveTo(ox + 56, 23 + breath)
      ctx.lineTo(ox + 62, 22 + breath + flameFlicker * 2)
      ctx.lineTo(ox + 56, 25 + breath)
      ctx.fill()
    }

    // 翅膀（火焰翅膀）
    ctx.fillStyle = '#3a0a00'
    ctx.beginPath()
    ctx.moveTo(ox + 14, 30 + breath)
    ctx.quadraticCurveTo(ox - 10, 10 + breath - flameFlicker, ox + 4, 2 + breath)
    ctx.quadraticCurveTo(ox + 10, 16 + breath, ox + 14, 30 + breath)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(ox + 82, 30 + breath)
    ctx.quadraticCurveTo(ox + 106, 10 + breath - flameFlicker, ox + 92, 2 + breath)
    ctx.quadraticCurveTo(ox + 86, 16 + breath, ox + 82, 30 + breath)
    ctx.fill()
    // 翅膀火焰
    ctx.fillStyle = `rgba(255,100,0,${0.5 + Math.sin(t * Math.PI * 2) * 0.2})`
    ctx.beginPath()
    ctx.moveTo(ox + 8, 30 + breath)
    ctx.quadraticCurveTo(ox - 4, 14 + breath, ox + 6, 8 + breath)
    ctx.quadraticCurveTo(ox + 12, 20 + breath, ox + 16, 32 + breath)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(ox + 88, 30 + breath)
    ctx.quadraticCurveTo(ox + 100, 14 + breath, ox + 90, 8 + breath)
    ctx.quadraticCurveTo(ox + 84, 20 + breath, ox + 80, 32 + breath)
    ctx.fill()

    // 武器（熔岩巨剑）
    ctx.fillStyle = '#1a0000'
    ctx.fillRect(ox + 84, 36 + breath, 6, 16)
    const swordGrad = ctx.createLinearGradient(ox + 82, 0, ox + 92, 0)
    swordGrad.addColorStop(0, '#ff4400')
    swordGrad.addColorStop(0.5, '#ffaa00')
    swordGrad.addColorStop(1, '#ffff00')
    ctx.fillStyle = swordGrad
    ctx.beginPath()
    ctx.moveTo(ox + 82, 36 + breath)
    ctx.lineTo(ox + 92, 36 + breath)
    ctx.lineTo(ox + 90, 0 + breath)
    ctx.lineTo(ox + 84, 0 + breath)
    ctx.closePath()
    ctx.fill()
    // 剑尖火焰
    ctx.fillStyle = `rgba(255,200,0,${0.7 + Math.sin(t * Math.PI * 2) * 0.3})`
    ctx.beginPath()
    ctx.moveTo(ox + 84, 0 + breath)
    ctx.lineTo(ox + 90, 0 + breath)
    ctx.lineTo(ox + 87, -6 + breath - flameFlicker)
    ctx.closePath()
    ctx.fill()

    // ===== 攻击帧：前倾喷吐烈焰 + 怒视 =====
    if (attack) {
      ctx.save()
      ctx.translate(2, 0)
      // 烈焰吐息（从嘴向前喷射，随子帧延长）
      const flameLen = 20 + at * 7
      ctx.fillStyle = 'rgba(255,120,0,0.95)'
      ctx.beginPath()
      ctx.moveTo(ox + 58, 23 + breath)
      ctx.lineTo(ox + 58 + flameLen, 20 + breath)
      ctx.lineTo(ox + 58 + flameLen, 28 + breath)
      ctx.lineTo(ox + 58, 26 + breath)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,235,120,0.9)'
      ctx.beginPath()
      ctx.moveTo(ox + 58, 23 + breath)
      ctx.lineTo(ox + 58 + flameLen * 0.6, 22 + breath)
      ctx.lineTo(ox + 58 + flameLen * 0.6, 26 + breath)
      ctx.lineTo(ox + 58, 25 + breath)
      ctx.closePath()
      ctx.fill()
      // 火星飞溅
      px(ctx, ox + 62 + flameLen, 22 + breath, 4, 4, '#ffaa00')
      px(ctx, ox + 56 + flameLen, 26 + breath, 3, 3, '#ff4400')
      // 眼睛怒视（熔岩更亮）
      px(ctx, ox + 36, 15 + breath, 4, 4, '#ffcc00')
      px(ctx, ox + 56, 15 + breath, 4, 4, '#ffcc00')
      // 胸口核心猛跳
      ctx.fillStyle = '#ffdd00'
      ctx.beginPath()
      ctx.arc(ox + 48, 46 + breath, 10 + flameFlicker, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// ============ 关卡专属小怪精灵图 ============

// 草原专属
function genGrassSlime(): SpriteSheet {
  const FW = 28, FH = 28, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const squish = Math.sin(t * Math.PI * 2)
    const h = 14 + squish * 4
    const w = 20 - squish * 2
    const x = i * FW + (28 - w) / 2
    const y = 28 - h
    ctx.fillStyle = '#44cc44'
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    // 草
    px(ctx, x + 4, y - 2, 2, 4, '#2a6a2a')
    px(ctx, x + 10, y - 3, 2, 5, '#3a7a3a')
    px(ctx, x + 16, y - 2, 2, 4, '#2a6a2a')
    // 花
    if (i % 2 === 0) {
      px(ctx, x + 8, y - 4, 2, 2, '#ff66aa')
      px(ctx, x + 9, y - 5, 1, 1, '#ffee44')
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.beginPath()
    ctx.ellipse(x + 6, y + 4, 4, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    px(ctx, x + 7, y + h / 2 - 2, 3, 3, '#fff')
    px(ctx, x + 14, y + h / 2 - 2, 3, 3, '#fff')
    px(ctx, x + 8, y + h / 2 - 1, 1, 1, '#000')
    px(ctx, x + 15, y + h / 2 - 1, 1, 1, '#000')
    px(ctx, x + 2, 26, w - 4, 2, 'rgba(0,0,0,0.3)')
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

function genBeeWarrior(): SpriteSheet {
  const FW = 28, FH = 28, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const wingFlap = Math.sin(t * Math.PI * 4) * 3
    const ox = i * FW
    // 阴影
    px(ctx, ox + 8, 26, 12, 2, 'rgba(0,0,0,0.3)')
    // 翅膀
    ctx.fillStyle = 'rgba(220,230,255,0.6)'
    ctx.beginPath()
    ctx.ellipse(ox + 6, 10 + wingFlap, 6, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(ox + 22, 10 + wingFlap, 6, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    // 身体（黄黑条纹）
    px(ctx, ox + 8, 12, 12, 14, '#ffcc00')
    px(ctx, ox + 8, 16, 12, 3, '#1a1a1a')
    px(ctx, ox + 8, 22, 12, 2, '#1a1a1a')
    // 头
    px(ctx, ox + 10, 6, 8, 8, '#1a1a1a')
    // 眼睛
    px(ctx, ox + 12, 8, 3, 3, '#ff4444')
    px(ctx, ox + 17, 8, 3, 3, '#ff4444')
    px(ctx, ox + 13, 9, 1, 1, '#fff')
    px(ctx, ox + 18, 9, 1, 1, '#fff')
    // 触角
    px(ctx, ox + 11, 3, 1, 4, '#1a1a1a')
    px(ctx, ox + 18, 3, 1, 4, '#1a1a1a')
    // 尾刺
    px(ctx, ox + 13, 26, 2, 2, '#ff4400')
    // 武器（小矛）
    px(ctx, ox + 22, 14, 2, 10, '#8B4513')
    px(ctx, ox + 21, 12, 4, 3, '#aaa')
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 幽暗森林专属
function genShadowGhost(): SpriteSheet {
  const FW = 28, FH = 32, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const float = Math.sin(t * Math.PI * 2) * 3
    const ox = i * FW
    // 阴影
    px(ctx, ox + 6, 30, 16, 2, 'rgba(80,0,120,0.4)')
    // 身体（幽灵）
    ctx.fillStyle = 'rgba(60,20,100,0.8)'
    ctx.beginPath()
    ctx.arc(ox + 14, 14 + float, 10, Math.PI, 0)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(ox + 4, 14 + float)
    ctx.lineTo(ox + 4, 26 + float)
    ctx.lineTo(ox + 8, 24 + float)
    ctx.lineTo(ox + 12, 26 + float)
    ctx.lineTo(ox + 16, 24 + float)
    ctx.lineTo(ox + 20, 26 + float)
    ctx.lineTo(ox + 24, 24 + float)
    ctx.lineTo(ox + 24, 14 + float)
    ctx.fill()
    // 眼睛（紫色发光）
    px(ctx, ox + 9, 10 + float, 4, 4, '#000')
    px(ctx, ox + 15, 10 + float, 4, 4, '#000')
    px(ctx, ox + 10, 11 + float, 2, 2, '#b400ff')
    px(ctx, ox + 16, 11 + float, 2, 2, '#b400ff')
    // 嘴
    px(ctx, ox + 12, 16 + float, 4, 4, '#2a0040')
    // 光环
    ctx.fillStyle = `rgba(128,0,255,${0.15 + Math.sin(t * Math.PI * 2) * 0.05})`
    ctx.beginPath()
    ctx.arc(ox + 14, 16 + float, 14, 0, Math.PI * 2)
    ctx.fill()
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

function genSpiderWitch(): SpriteSheet {
  const FW = 32, FH = 32, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const legSwing = Math.sin(t * Math.PI * 2) * 2
    const ox = i * FW
    // 阴影
    px(ctx, ox + 8, 30, 16, 2, 'rgba(0,0,0,0.4)')
    // 8条腿
    px(ctx, ox + 2, 14 + legSwing, 2, 12, '#1a0020')
    px(ctx, ox + 4, 16 + legSwing, 2, 10, '#1a0020')
    px(ctx, ox + 26, 16 - legSwing, 2, 10, '#1a0020')
    px(ctx, ox + 28, 14 - legSwing, 2, 12, '#1a0020')
    px(ctx, ox + 0, 18 + legSwing, 2, 8, '#1a0020')
    px(ctx, ox + 30, 18 - legSwing, 2, 8, '#1a0020')
    // 身体
    px(ctx, ox + 10, 10, 12, 16, '#2a0040')
    // 头
    px(ctx, ox + 11, 6, 10, 8, '#3a1a5a')
    // 眼睛（多只发光）
    px(ctx, ox + 12, 8, 2, 2, '#ff00ff')
    px(ctx, ox + 16, 8, 2, 2, '#ff00ff')
    px(ctx, ox + 20, 8, 2, 2, '#ff00ff')
    px(ctx, ox + 13, 9, 1, 1, '#fff')
    px(ctx, ox + 17, 9, 1, 1, '#fff')
    px(ctx, ox + 21, 9, 1, 1, '#fff')
    // 獠牙
    px(ctx, ox + 14, 13, 1, 3, '#fff')
    px(ctx, ox + 18, 13, 1, 3, '#fff')
    // 花纹
    px(ctx, ox + 14, 16, 4, 2, '#6a008a')
    px(ctx, ox + 12, 20, 8, 2, '#4a006a')
    // 毒液
    px(ctx, ox + 20, 22, 2, 4, '#aa00ff')
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 火山专属
function genFireImp(): SpriteSheet {
  const FW = 28, FH = 32, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const breath = Math.sin(t * Math.PI * 2) * 1
    const flame = Math.sin(t * Math.PI * 4) * 2
    const ox = i * FW
    // 阴影
    px(ctx, ox + 6, 30, 16, 2, 'rgba(255,50,0,0.3)')
    // 腿
    px(ctx, ox + 8, 22, 4, 8, '#8a1a00')
    px(ctx, ox + 16, 22, 4, 8, '#8a1a00')
    // 身体
    px(ctx, ox + 6, 10 + breath, 16, 14, '#cc3300')
    px(ctx, ox + 6, 10 + breath, 16, 3, '#ff6600')
    px(ctx, ox + 6, 21 + breath, 16, 3, '#8a1a00')
    // 头
    px(ctx, ox + 8, 2 + breath, 12, 10, '#ff4400')
    // 角
    px(ctx, ox + 7, 0 + breath, 2, 4, '#1a0000')
    px(ctx, ox + 19, 0 + breath, 2, 4, '#1a0000')
    // 眼睛
    px(ctx, ox + 10, 5 + breath, 3, 3, '#ffff00')
    px(ctx, ox + 15, 5 + breath, 3, 3, '#ffff00')
    px(ctx, ox + 11, 6 + breath, 1, 1, '#000')
    px(ctx, ox + 16, 6 + breath, 1, 1, '#000')
    // 嘴
    px(ctx, ox + 11, 10 + breath, 6, 2, '#1a0000')
    px(ctx, ox + 12, 10 + breath, 1, 2, '#fff')
    px(ctx, ox + 15, 10 + breath, 1, 2, '#fff')
    // 火焰毛发
    ctx.fillStyle = '#ff6600'
    ctx.beginPath()
    ctx.moveTo(ox + 10, -2 + breath)
    ctx.lineTo(ox + 12, -6 + breath - flame)
    ctx.lineTo(ox + 14, -2 + breath)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(ox + 16, -2 + breath)
    ctx.lineTo(ox + 18, -6 + breath - flame)
    ctx.lineTo(ox + 20, -2 + breath)
    ctx.fill()
    // 火把手
    px(ctx, ox + 22, 14 + breath, 2, 10, '#8B4513')
    ctx.fillStyle = '#ffaa00'
    ctx.beginPath()
    ctx.arc(ox + 23, 12 + breath, 3 + flame, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffff00'
    ctx.beginPath()
    ctx.arc(ox + 23, 12 + breath, 1.5 + flame * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

function genMagmaGolem(): SpriteSheet {
  const FW = 32, FH = 40, FC = 4
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const t = i / FC
    const breath = Math.sin(t * Math.PI * 2) * 1
    const glow = Math.sin(t * Math.PI * 2) * 0.5 + 0.5
    const ox = i * FW
    // 阴影
    px(ctx, ox + 4, 38, 24, 2, 'rgba(255,50,0,0.3)')
    // 腿
    px(ctx, ox + 6, 24, 8, 14, '#4a1a00')
    px(ctx, ox + 18, 24, 8, 14, '#4a1a00')
    px(ctx, ox + 4, 36, 10, 4, '#2a0a00')
    px(ctx, ox + 18, 36, 10, 4, '#2a0a00')
    // 身体
    px(ctx, ox + 2, 8 + breath, 28, 20, '#6a2a00')
    px(ctx, ox + 2, 8 + breath, 28, 3, '#8a4a00')
    // 岩浆裂纹
    ctx.fillStyle = `rgba(255,150,0,${0.5 + glow * 0.5})`
    ctx.fillRect(ox + 6, 14 + breath, 2, 10)
    ctx.fillRect(ox + 8, 18 + breath, 4, 2)
    ctx.fillRect(ox + 20, 12 + breath, 2, 12)
    ctx.fillRect(ox + 20, 18 + breath, 6, 2)
    // 胸口核心
    ctx.fillStyle = `rgba(255,200,0,${0.7 + glow * 0.3})`
    ctx.beginPath()
    ctx.arc(ox + 16, 18 + breath, 4 + glow, 0, Math.PI * 2)
    ctx.fill()
    // 头
    px(ctx, ox + 8, 0 + breath, 16, 10, '#5a2a00')
    px(ctx, ox + 8, 0 + breath, 16, 2, '#7a4a00')
    // 眼睛（岩浆光）
    px(ctx, ox + 10, 4 + breath, 4, 3, '#ff4400')
    px(ctx, ox + 18, 4 + breath, 4, 3, '#ff4400')
    px(ctx, ox + 11, 4 + breath, 2, 2, `rgba(255,${200 + glow * 55},0,1)`)
    px(ctx, ox + 19, 4 + breath, 2, 2, `rgba(255,${200 + glow * 55},0,1)`)
    // 手臂
    px(ctx, ox + 0, 12 + breath, 4, 14, '#4a1a00')
    px(ctx, ox + 28, 12 + breath, 4, 14, '#4a1a00')
    // 拳头
    px(ctx, ox - 2, 22 + breath, 6, 6, '#3a1000')
    px(ctx, ox + 28, 22 + breath, 6, 6, '#3a1000')
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 第四关Boss：凛冬巨像 - 冰霜巨人
function genFrostGiant(): SpriteSheet {
  const FW = 96, FH = 96, FC = 8
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const attack = i >= 4
    const at = i - 4
    const t = (i % 4) / 4
    const breath = Math.sin(t * Math.PI * 2) * 1.5
    const sway = Math.sin(t * Math.PI * 2) * 1
    const sparkle = 0.6 + Math.sin(t * Math.PI * 2 + 1) * 0.3
    const ox = i * FW

    // 阴影
    px(ctx, ox + 10, 90, 76, 5, 'rgba(20,40,80,0.5)')

    // 冰晶脚
    px(ctx, ox + 18, 72, 14, 18, '#7fc4e8')
    px(ctx, ox + 64, 72, 14, 18, '#7fc4e8')
    px(ctx, ox + 16, 86, 8, 4, '#5a9cc8')
    px(ctx, ox + 72, 86, 8, 4, '#5a9cc8')
    px(ctx, ox + 12, 86, 4, 4, '#a8e0ff')
    px(ctx, ox + 80, 86, 4, 4, '#a8e0ff')

    // 身体（冰柱感）
    px(ctx, ox + 22, 22 + breath, 52, 52, '#5aa8d8')
    px(ctx, ox + 22, 22 + breath, 52, 4, '#8ad4ff')
    px(ctx, ox + 22, 70 + breath, 52, 4, '#3a78a8')
    // 冰晶纹理
    px(ctx, ox + 30, 30 + breath, 2, 40, '#7cc4e8')
    px(ctx, ox + 46, 26 + breath, 3, 44, '#4a90c0')
    px(ctx, ox + 62, 30 + breath, 2, 40, '#7cc4e8')
    // 肩部冰刺
    px(ctx, ox + 14, 22 + breath, 8, 6, '#9ad8f8')
    px(ctx, ox + 18, 18 + breath, 6, 6, '#7cc4e8')
    px(ctx, ox + 72, 22 + breath, 10, 6, '#9ad8f8')
    px(ctx, ox + 70, 18 + breath, 8, 6, '#7cc4e8')

    // 胸口冰核
    ctx.fillStyle = `rgba(140,230,255,${0.6 + sparkle * 0.4})`
    ctx.beginPath()
    ctx.arc(ox + 48, 46 + breath, 7, 0, Math.PI * 2)
    ctx.fill()
    px(ctx, ox + 46, 43 + breath, 4, 6, '#d8f4ff')
    ctx.strokeStyle = `rgba(180,235,255,${0.4 * sparkle})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(ox + 48, 46 + breath, 11, 0, Math.PI * 2)
    ctx.stroke()

    // 头
    px(ctx, ox + 32, 4 + breath, 32, 20, '#6ab8e0')
    px(ctx, ox + 32, 4 + breath, 32, 3, '#9adcf8')
    // 冰王冠
    px(ctx, ox + 30, 0 + breath, 4, 6, '#a8e0ff')
    px(ctx, ox + 40, -2 + breath, 4, 8, '#c8f0ff')
    px(ctx, ox + 50, 0 + breath, 4, 6, '#a8e0ff')
    px(ctx, ox + 58, 2 + breath, 4, 4, '#8ad0f0')
    // 眼睛（寒光）
    px(ctx, ox + 38, 12 + breath, 6, 6, '#1a4a6a')
    px(ctx, ox + 52, 12 + breath, 6, 6, '#1a4a6a')
    px(ctx, ox + 40, 13 + breath, 3, 4, '#b8f0ff')
    px(ctx, ox + 54, 13 + breath, 3, 4, '#b8f0ff')
    // 嘴（冰缝）
    px(ctx, ox + 42, 20 + breath, 12, 2, '#1a4a6a')
    px(ctx, ox + 44, 20 + breath, 2, 3, '#dff4ff')
    px(ctx, ox + 50, 20 + breath, 2, 3, '#dff4ff')

    // 手臂（粗壮冰臂）
    px(ctx, ox + 6, 26 + breath + sway, 16, 8, '#5aa8d8')
    px(ctx, ox + 6, 34 + breath + sway, 8, 30, '#5aa8d8')
    px(ctx, ox + 74, 26 + breath - sway, 16, 8, '#5aa8d8')
    px(ctx, ox + 82, 34 + breath - sway, 8, 30, '#5aa8d8')
    // 冰拳
    px(ctx, ox + 2, 62 + breath + sway, 16, 10, '#6ab8e0')
    px(ctx, ox + 78, 62 + breath - sway, 16, 10, '#6ab8e0')

    // ===== 攻击帧：双臂举起凝聚冰晶 + 怒目 =====
    if (attack) {
      ctx.save()
      ctx.translate(0, 4)
      px(ctx, ox + 4, 6 + breath, 8, 26, '#5aa8d8')
      px(ctx, ox + 84, 6 + breath, 8, 26, '#5aa8d8')
      const ballR = 5 + at * 2.5
      ctx.fillStyle = `rgba(160,235,255,${0.5 + at * 0.1})`
      ctx.beginPath()
      ctx.arc(ox + 8, 8 + breath, ballR, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(220,248,255,0.8)'
      ctx.beginPath()
      ctx.arc(ox + 7, 7 + breath, ballR * 0.45, 0, Math.PI * 2)
      ctx.fill()
      px(ctx, ox + 40, 13 + breath, 5, 5, '#ff8844')
      px(ctx, ox + 54, 13 + breath, 5, 5, '#ff8844')
      ctx.restore()
    }
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// 第五关Boss：灭世深渊 - 深渊魔君
function genAbyssLord(): SpriteSheet {
  const FW = 96, FH = 96, FC = 8
  const cvs = createCanvas(FW * FC, FH)
  const ctx = cvs.getContext('2d')!
  for (let i = 0; i < FC; i++) {
    const attack = i >= 4
    const at = i - 4
    const t = (i % 4) / 4
    const breath = Math.sin(t * Math.PI * 2) * 2
    const sway = Math.sin(t * Math.PI * 2) * 2
    const glow = 0.5 + Math.sin(t * Math.PI * 2) * 0.3
    const ox = i * FW

    // 阴影
    px(ctx, ox + 12, 90, 72, 4, 'rgba(20,0,30,0.5)')

    // 深渊之足（暗焰）
    px(ctx, ox + 18, 74, 12, 16, '#1a0a2a')
    px(ctx, ox + 66, 74, 12, 16, '#1a0a2a')
    ctx.fillStyle = `rgba(150,40,255,${0.4 + glow * 0.3})`
    ctx.beginPath()
    ctx.arc(ox + 24, 90, 8, 0, Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ox + 72, 90, 8, 0, Math.PI)
    ctx.fill()

    // 披风/躯体
    px(ctx, ox + 20, 22 + breath, 56, 54, '#2a1040')
    px(ctx, ox + 20, 22 + breath, 56, 4, '#3a1a55')
    px(ctx, ox + 20, 72 + breath, 56, 4, '#12041f')
    px(ctx, ox + 16, 40 + breath + sway, 6, 36, '#2a1040')
    px(ctx, ox + 74, 40 + breath - sway, 6, 36, '#2a1040')
    px(ctx, ox + 30, 30 + breath, 2, 42, '#4a2270')
    px(ctx, ox + 46, 26 + breath, 3, 46, '#1a0830')
    px(ctx, ox + 62, 30 + breath, 2, 42, '#4a2270')

    // 胸口深渊核心
    ctx.fillStyle = `rgba(200,80,255,${0.5 + glow * 0.5})`
    ctx.beginPath()
    ctx.arc(ox + 48, 46 + breath, 6 + glow * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = `rgba(200,80,255,${0.4 * glow})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(ox + 48, 46 + breath, 10, 0, Math.PI * 2)
    ctx.stroke()

    // 头（魔君之面）
    px(ctx, ox + 34, 4 + breath, 28, 20, '#3a1a55')
    px(ctx, ox + 34, 4 + breath, 28, 3, '#4a2a6a')
    // 恶魔角
    px(ctx, ox + 28, 0 + breath, 6, 10, '#c8b8e0')
    px(ctx, ox + 62, 0 + breath, 6, 10, '#c8b8e0')
    px(ctx, ox + 30, 2 + breath, 3, 7, '#e8d8ff')
    px(ctx, ox + 63, 2 + breath, 3, 7, '#e8d8ff')
    // 眼睛（紫焰）
    px(ctx, ox + 40, 12 + breath, 6, 6, '#12001f')
    px(ctx, ox + 50, 12 + breath, 6, 6, '#12001f')
    px(ctx, ox + 41, 13 + breath, 4, 4, `rgba(255,80,255,${0.7 + glow * 0.3})`)
    px(ctx, ox + 51, 13 + breath, 4, 4, `rgba(255,80,255,${0.7 + glow * 0.3})`)
    // 嘴（裂到脸颊）
    px(ctx, ox + 38, 20 + breath, 20, 2, '#12001f')
    px(ctx, ox + 40, 20 + breath, 2, 3, '#fff')
    px(ctx, ox + 46, 20 + breath, 2, 3, '#fff')
    px(ctx, ox + 52, 20 + breath, 2, 3, '#fff')

    // 手臂（深渊爪）
    px(ctx, ox + 4, 28 + breath + sway, 16, 6, '#2a1040')
    px(ctx, ox + 4, 34 + breath + sway, 6, 26, '#2a1040')
    px(ctx, ox + 76, 28 + breath - sway, 16, 6, '#2a1040')
    px(ctx, ox + 86, 34 + breath - sway, 6, 26, '#2a1040')
    // 爪子
    px(ctx, ox + 0, 58 + breath + sway, 5, 14, '#c8b8e0')
    px(ctx, ox + 4, 62 + breath + sway, 5, 12, '#a088c0')
    px(ctx, ox + 88, 58 + breath - sway, 5, 14, '#c8b8e0')
    px(ctx, ox + 84, 62 + breath - sway, 5, 12, '#a088c0')

    // ===== 攻击帧：巨镰挥砍 + 紫焰残影 =====
    if (attack) {
      ctx.save()
      ctx.translate(2, 0)
      const slant = at * 3
      px(ctx, ox + 78 - slant, 8 + breath - sway, 4, 58, '#6a4a8a')
      ctx.fillStyle = '#c8b8e0'
      ctx.beginPath()
      ctx.moveTo(ox + 80 - slant, 10 + breath - sway)
      ctx.lineTo(ox + 66 - slant, 2 + breath - sway)
      ctx.lineTo(ox + 56 - slant, 16 + breath - sway)
      ctx.lineTo(ox + 70 - slant, 20 + breath - sway)
      ctx.fill()
      ctx.strokeStyle = `rgba(200,80,255,${0.6 - at * 0.08})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(ox + 48, 34 + breath, 20 + at * 2, -1.2, 1.2)
      ctx.stroke()
      px(ctx, ox + 41, 12 + breath, 6, 6, '#ff2aff')
      px(ctx, ox + 51, 12 + breath, 6, 6, '#ff2aff')
      ctx.restore()
    }
  }
  return { canvas: cvs, frameWidth: FW, frameHeight: FH, frameCount: FC }
}

// ============ 入口：生成所有精灵图 ============

export function generateAllSpriteSheets(): void {
  if (sheetCache.size > 0) return

  sheetCache.set('player_idle', genPlayerIdle())
  sheetCache.set('player_walk', genPlayerWalk())
  sheetCache.set('player_attack', genPlayerAttack())
  sheetCache.set('player_jump', genPlayerJump())

  sheetCache.set('slime', genGrassSlime())
  sheetCache.set('bee_warrior', genBeeWarrior())
  sheetCache.set('skeleton', genSkeleton())
  sheetCache.set('goblin', genGoblin())
  sheetCache.set('dark_mage', genDarkMage())
  sheetCache.set('armored_knight', genArmoredKnight())
  sheetCache.set('shadow_ghost', genShadowGhost())
  sheetCache.set('spider_witch', genSpiderWitch())
  sheetCache.set('fire_imp', genFireImp())
  sheetCache.set('magma_golem', genMagmaGolem())

  sheetCache.set('dragon_warrior', genGrasslandGuardian())
  sheetCache.set('shadow_lord', genShadowWolfKing())
  sheetCache.set('demon_lord', genMagmaDemonLord())
  sheetCache.set('frost_giant', genFrostGiant())
  sheetCache.set('abyss_lord', genAbyssLord())
}

export function getSpriteSheet(key: string): SpriteSheet | undefined {
  return sheetCache.get(key)
}
