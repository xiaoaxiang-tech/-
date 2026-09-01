import type { Direction, WeaponType, EquipDrop } from '../types'
import { generateAllSpriteSheets, getSpriteSheet } from './SpriteSheetGenerator'
import { generateAllBackgrounds, getBackground } from './BackgroundGenerator'

// 装备阶数（0-4）对应的辉光色：灰 → 绿 → 秘银蓝 → 冰紫 → 神话金
const TIER_GLOWS = ['#b8b8b8', '#6fce6f', '#4fa3ff', '#d27bff', '#ffb13d']

// 图像缓存
const imageCache: Map<string, HTMLImageElement> = new Map()
const loadedImages: Set<string> = new Set()

// 检测当前环境是否支持 Canvas 2D（jsdom 等测试环境不支持时跳过程序化精灵生成，避免崩溃）
function isCanvas2DSupported(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!c.getContext('2d')
  } catch {
    return false
  }
}

// 启动时生成所有精灵图
if (isCanvas2DSupported()) {
  generateAllSpriteSheets()
  generateAllBackgrounds()
}

export function loadImage(key: string, url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (imageCache.has(key)) {
      resolve(imageCache.get(key)!)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(key, img)
      loadedImages.add(key)
      resolve(img)
    }
    img.onerror = () => {
      console.warn(`[AssetLoader] Failed to load: ${url}`)
      loadedImages.add(key) // mark as attempted
      resolve(img) // resolve anyway, we'll use fallback drawing
    }
    img.src = url
  })
}

export function getImage(key: string): HTMLImageElement | undefined {
  return imageCache.get(key)
}

export function isImageLoaded(key: string): boolean {
  return loadedImages.has(key)
}

// ========== 精灵绘制函数（程序化像素艺术） ==========

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  dir: Direction, animFrame: number,
  weaponType: WeaponType, tier: number,
  attacking: boolean,
  onGround: boolean,
  attackProgress: number = 0
) {
  ctx.save()

  // === 真正的精灵图帧动画 ===
  let sheetKey = 'player_idle'
  if (attacking) sheetKey = 'player_attack'
  else if (!onGround) sheetKey = 'player_jump'
  else if (Math.abs((window as any).__playerVx || 0) > 0.1) sheetKey = 'player_walk'
  else sheetKey = 'player_idle'

  const sheet = getSpriteSheet(sheetKey)

  if (sheet) {
    // 计算当前帧索引
    let frameIdx: number
    if (sheetKey === 'player_attack') {
      // 攻击动画按 attackProgress 直接映射到帧
      frameIdx = Math.min(sheet.frameCount - 1, Math.floor(attackProgress * sheet.frameCount))
    } else if (sheetKey === 'player_jump') {
      // 跳跃按 vy 映射到 4 帧
      const vy = (window as any).__playerVy || 0
      frameIdx = vy < -5 ? 1 : vy < 0 ? 2 : vy > 5 ? 3 : 0
    } else {
      // idle/walk 用 animFrame 循环
      frameIdx = Math.floor(animFrame) % sheet.frameCount
    }

    const sx = frameIdx * sheet.frameWidth
    const cx = x + w / 2
    // 方向翻转
    if (dir === 'left') {
      ctx.translate(cx * 2, 0)
      ctx.scale(-1, 1)
    }
    // 用 9 参数 drawImage 切片绘制精灵图的某一帧
    const padX = (w - sheet.frameWidth) / 2
    const padY = (h - sheet.frameHeight) / 2
    ctx.drawImage(
      sheet.canvas,
      sx, 0, sheet.frameWidth, sheet.frameHeight,
      x + padX, y + padY, sheet.frameWidth, sheet.frameHeight
    )
    ctx.restore()

    // 在精灵图上叠加武器
    drawPlayerWeapon(ctx, x, y, w, h, dir, weaponType, tier, attacking, attackProgress)

    // 武器特定攻击特效（随阶数升级：越高阶弧光越宽、颜色越华丽）
    if (attacking && attackProgress > 0.1 && attackProgress < 0.8) {
      ctx.save()
      const flip = dir === 'left' ? -1 : 1
      const isMelee = weaponType === 'sword' || weaponType === 'spear'
      const glow = TIER_GLOWS[Math.max(0, Math.min(4, tier))]!

      if (isMelee) {
        const slashAlpha = Math.sin(attackProgress * Math.PI) * (0.65 + tier * 0.06)
        const slashAngle = (attackProgress - 0.45) * 1.4
        ctx.translate(x + w / 2 + (attackProgress - 0.5) * 12 * flip, y + h / 2 - 6)
        if (dir === 'left') ctx.scale(-1, 1)
        ctx.rotate(slashAngle)
        if (tier >= 2) { ctx.shadowColor = glow; ctx.shadowBlur = 14 }
        ctx.globalAlpha = slashAlpha
        // 外弧（随阶数变宽、变长）
        ctx.strokeStyle = tier >= 3 ? glow : '#ffffff'
        ctx.lineWidth = 2.5 + tier * 0.8
        ctx.beginPath(); ctx.arc(2, 0, 28 + tier * 4, -0.7, 0.7); ctx.stroke()
        // 内弧
        ctx.strokeStyle = tier >= 3 ? '#ffffff' : '#ffdd55'
        ctx.lineWidth = 4 + tier
        ctx.globalAlpha = slashAlpha * 0.5
        ctx.beginPath(); ctx.arc(2, 0, 20 + tier * 3, -0.5, 0.5); ctx.stroke()
        // T4 额外第三层华丽弧光
        if (tier >= 4) {
          ctx.globalAlpha = slashAlpha * 0.4
          ctx.strokeStyle = '#fff3c0'
          ctx.lineWidth = 6
          ctx.beginPath(); ctx.arc(2, 0, 14 + tier * 3, -0.35, 0.35); ctx.stroke()
        }
      } else if (weaponType === 'gun') {
        const flashAlpha = Math.sin(attackProgress * Math.PI)
        const muzzleX = x + w / 2 + (dir === 'right' ? 22 : -22)
        const muzzleY = y + h / 2 - 5
        ctx.globalAlpha = flashAlpha
        ctx.shadowColor = '#ffaa00'
        ctx.shadowBlur = 8 + tier * 4
        ctx.fillStyle = '#ffaa00'
        ctx.beginPath(); ctx.arc(muzzleX, muzzleY, 7 + tier * 2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = tier >= 3 ? glow : '#ffff44'
        ctx.beginPath(); ctx.arc(muzzleX, muzzleY, 4 + tier, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(muzzleX, muzzleY, 2, 0, Math.PI * 2); ctx.fill()
        // 高阶枪口散射火花
        if (tier >= 2) {
          for (let s = 0; s < tier; s++) {
            const a = Math.PI * 2 * s / tier + attackProgress * 6
            ctx.fillStyle = tier >= 4 ? '#ffd24d' : '#ff8833'
            ctx.globalAlpha = flashAlpha * 0.8
            ctx.beginPath(); ctx.arc(muzzleX + Math.cos(a) * (7 + tier), muzzleY + Math.sin(a) * (7 + tier), 1.5, 0, Math.PI * 2); ctx.fill()
          }
        }
      } else if (weaponType === 'bow') {
        const chargeAlpha = Math.sin(attackProgress * Math.PI) * (0.6 + tier * 0.08)
        const bowX = x + w / 2 + (dir === 'right' ? -8 : 8)
        const bowY = y + h / 2 - 5
        ctx.globalAlpha = chargeAlpha
        ctx.shadowColor = tier >= 3 ? glow : '#aaffcc'
        ctx.shadowBlur = 6 + tier * 4
        ctx.strokeStyle = tier >= 3 ? glow : '#aaffcc'
        ctx.lineWidth = 1.5 + tier * 0.5
        ctx.beginPath(); ctx.arc(bowX, bowY, 10 + tier, -0.8, 0.8); ctx.stroke()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.arc(bowX + (dir === 'right' ? 4 : -4), bowY, 2 + tier * 0.4, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }
    return
  }

  // 程序化绘制回退
  drawPixelPlayer(ctx, x, y, w, h, dir, animFrame, weaponType, tier, attacking, onGround, attackProgress)
  ctx.restore()
}

function drawPixelPlayer(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  dir: Direction, animFrame: number,
  weaponType: WeaponType, tier: number,
  attacking: boolean,
  onGround: boolean,
  attackProgress: number = 0
) {
  const flip = dir === 'left' ? -1 : 1
  const fx = dir === 'left' ? x + w : x
  ctx.save()
  ctx.translate(fx, y)
  ctx.scale(flip, 1)

  // ===== 攻击斜斩特效（随阶数升级） =====
  if (attacking && attackProgress > 0.1 && attackProgress < 0.8) {
    const slashAlpha = Math.sin(attackProgress * Math.PI) * (0.65 + tier * 0.06)
    const slashAngle = (attackProgress - 0.45) * 1.4
    const glow = TIER_GLOWS[Math.max(0, Math.min(4, tier))]!
    ctx.save()
    ctx.translate(w / 2 + (attackProgress - 0.5) * 14, h / 2 - 6)
    ctx.rotate(slashAngle)
    if (tier >= 2) { ctx.shadowColor = glow; ctx.shadowBlur = 14 }
    ctx.globalAlpha = slashAlpha
    ctx.strokeStyle = tier >= 3 ? glow : '#ffffff'
    ctx.lineWidth = 2.5 + tier * 0.8
    ctx.beginPath(); ctx.arc(0, 0, 34 + tier * 4, -0.7, 0.7); ctx.stroke()
    ctx.strokeStyle = tier >= 3 ? '#ffffff' : '#ffdd55'
    ctx.lineWidth = 4 + tier
    ctx.globalAlpha = slashAlpha * 0.5
    ctx.beginPath(); ctx.arc(0, 0, 26 + tier * 3, -0.5, 0.5); ctx.stroke()
    ctx.restore()
    ctx.globalAlpha = 1
  }

  // ===== 攻击身体前倾 =====
  const leanAmount = attacking ? Math.sin(attackProgress * Math.PI) * 3 : 0
  ctx.save()
  if (leanAmount > 0.5) ctx.translate(leanAmount * 0.5, 0)

  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(2, h - 4, w - 4, 4)

  // 腿部动画（攻击时停步）
  const isWalking = onGround && !attacking
  const legOffset = isWalking ? Math.sin(animFrame * 0.6) * 4 : (attacking ? -1 : -2)
  const legOffset2 = isWalking ? Math.sin(animFrame * 0.6 + Math.PI) * 4 : (attacking ? 1 : 2)

  // 腿
  ctx.fillStyle = '#5a3a2a'
  ctx.fillRect(8, h - 22, 8, 18)
  ctx.fillRect(20, h - 22 + legOffset, 8, 18 + legOffset2)

  // 靴子
  ctx.fillStyle = '#3a2010'
  ctx.fillRect(6, h - 8, 12, 8)
  ctx.fillRect(18 + legOffset, h - 8 + legOffset2, 12, 8)

  // 身体（铠甲）
  const armorGrad = ctx.createLinearGradient(4, h - 40, 28, h - 20)
  armorGrad.addColorStop(0, '#4a90d9')
  armorGrad.addColorStop(0.5, '#6ab0ff')
  armorGrad.addColorStop(1, '#3a70b0')
  ctx.fillStyle = armorGrad
  ctx.fillRect(6, h - 42, 20, 24)

  // 铠甲细节
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(14, h - 38, 4, 4)
  ctx.fillRect(10, h - 28, 12, 3)
  ctx.fillStyle = '#c0c0c0'
  ctx.fillRect(12, h - 35, 2, 6)
  ctx.fillRect(18, h - 35, 2, 6)

  // 护肩
  ctx.fillStyle = '#8b8b8b'
  ctx.fillRect(2, h - 44, 8, 6)
  ctx.fillRect(22, h - 44, 8, 6)

  // 头
  ctx.fillStyle = '#ffdbb4'
  ctx.fillRect(10, h - 54, 12, 12)

  // 头盔
  ctx.fillStyle = '#888'
  ctx.beginPath()
  ctx.arc(16, h - 48, 9, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(14, h - 56, 4, 3)

  // 攻击时眼睛发光
  if (attacking && attackProgress > 0.2) {
    ctx.fillStyle = '#ff3333'
    ctx.fillRect(12, h - 50, 7, 2)
  } else {
    ctx.fillStyle = '#000'
    ctx.fillRect(14, h - 50, 2, 2)
  }

  ctx.restore() // 恢复身体前倾

  // 手臂 - 攻击时做蓄力+挥砍动作
  let armAngle: number
  if (attacking) {
    const t = attackProgress
    if (t < 0.4) {
      armAngle = 0.3 + (t / 0.4) * (-1.6)   // 举起蓄力
    } else {
      armAngle = -1.6 + ((t - 0.4) / 0.6) * 2.8   // 向前挥砍
    }
  } else {
    armAngle = Math.sin(animFrame * 0.6) * 0.3
  }
  ctx.save()
  ctx.translate(22, h - 36)
  ctx.rotate(armAngle)
  ctx.fillStyle = '#ffdbb4'
  ctx.fillRect(-4, -2, 14, 4)
  // 手
  ctx.fillStyle = '#ffdbb4'
  ctx.fillRect(6, -3, 6, 6)
  ctx.restore()

  ctx.restore()

  // 武器
  drawPlayerWeapon(ctx, x, y, w, h, dir, weaponType, tier, attacking, attackProgress)
}

function drawPlayerWeapon(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  dir: Direction, weaponType: WeaponType, tier: number, attacking: boolean,
  attackProgress: number = 0
) {
  const cx = x + w / 2, cy = y + h / 2
  const tierClamped = Math.max(0, Math.min(4, tier))
  const glow = TIER_GLOWS[tierClamped]!

  let weaponAngle: number
  if (attacking) {
    const t = attackProgress
    if (t < 0.4) {
      weaponAngle = 0.1 + (t / 0.4) * (-1.1)    // 蓄力后摆
    } else {
      weaponAngle = -1.1 + ((t - 0.4) / 0.6) * 2.4   // 前挥砍出
    }
  } else {
    weaponAngle = 0.1
  }

  ctx.save()
  ctx.translate(cx, cy - 8)

  if (weaponType === 'sword') {
    const rot = dir === 'right' ? weaponAngle : -weaponAngle
    ctx.rotate(rot)

    // 挥砍轨迹光弧（随阶数升级：更长、更亮、多层）
    if (attacking && attackProgress > 0.3 && attackProgress < 0.7) {
      ctx.save()
      const trailAlpha = Math.sin((attackProgress - 0.3) * Math.PI / 0.4) * (0.5 + tier * 0.08)
      if (tier >= 2) { ctx.shadowColor = glow; ctx.shadowBlur = 12 }
      ctx.globalAlpha = trailAlpha
      ctx.strokeStyle = tier >= 3 ? glow : '#ffffcc'
      ctx.lineWidth = 3 + tier
      ctx.beginPath()
      ctx.moveTo(-1, -4)
      ctx.lineTo(0, -32 - tier * 3)
      ctx.stroke()
      ctx.strokeStyle = tier >= 4 ? '#ffffff' : '#ffdd44'
      ctx.lineWidth = 5 + tier * 0.8
      ctx.globalAlpha = trailAlpha * 0.4
      ctx.beginPath()
      ctx.moveTo(0, -4)
      ctx.lineTo(0, -28 - tier * 3)
      ctx.stroke()
      // T4 双层残影
      if (tier >= 4) {
        ctx.globalAlpha = trailAlpha * 0.5
        ctx.strokeStyle = '#fff3c0'
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(-1, -6); ctx.lineTo(-4, -30 - tier * 3); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(4, -30 - tier * 3); ctx.stroke()
      }
      ctx.restore()
    }

    // 高阶武器辉光
    if (tier >= 2) { ctx.shadowColor = glow; ctx.shadowBlur = 6 + tier * 3 }

    // 剑柄（随阶数精致）
    ctx.fillStyle = tier >= 4 ? '#d4a020' : '#8B4513'
    ctx.fillRect(-2, 4, 4, 8)
    // 护手
    if (tier >= 3) {
      ctx.fillStyle = glow
      ctx.fillRect(-7, 2, 14, 3)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(-7, 4, 14, 1)
    } else if (tier >= 1) {
      ctx.fillStyle = tier === 2 ? '#4fa3ff' : '#ffd700'
      ctx.fillRect(-6, 2, 12, 3)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillRect(-6, 3, 12, 1)
    } else {
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(-6, 2, 12, 3)
    }
    // 柄尾宝石（T3+）
    if (tier >= 3) {
      ctx.fillStyle = tier === 4 ? '#ffd24d' : '#d27bff'
      ctx.beginPath(); ctx.arc(0, 10, 2, 0, Math.PI * 2); ctx.fill()
    }

    // 剑身（长度随阶数增长、配色随阶数华丽）
    const bladeLen = 30 + tier * 4
    const bladeGrad = ctx.createLinearGradient(0, 0, 0, -bladeLen)
    if (tier === 4) {
      bladeGrad.addColorStop(0, '#ffd700'); bladeGrad.addColorStop(0.4, '#fff3c0'); bladeGrad.addColorStop(1, '#b8860b')
    } else if (tier === 3) {
      bladeGrad.addColorStop(0, '#a8e8ff'); bladeGrad.addColorStop(0.3, '#ffffff'); bladeGrad.addColorStop(1, '#6fc8ff')
    } else if (tier === 2) {
      bladeGrad.addColorStop(0, '#b8d8ff'); bladeGrad.addColorStop(0.4, '#ffffff'); bladeGrad.addColorStop(1, '#4fa3ff')
    } else if (tier === 1) {
      bladeGrad.addColorStop(0, '#f0f0f0'); bladeGrad.addColorStop(0.4, '#ffffff'); bladeGrad.addColorStop(1, '#9a9a9a')
    } else {
      bladeGrad.addColorStop(0, '#e0e0e0'); bladeGrad.addColorStop(0.15, '#ffffff'); bladeGrad.addColorStop(0.7, '#c0c0c0'); bladeGrad.addColorStop(1, '#888888')
    }
    ctx.fillStyle = bladeGrad
    ctx.fillRect(-3, -bladeLen, 6, bladeLen - 4)

    // 剑尖（随阶数变长）
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(-3, -bladeLen)
    ctx.lineTo(0, -bladeLen - 8 - tier * 2)
    ctx.lineTo(3, -bladeLen)
    ctx.fill()

    // 剑身中缝与刃口装饰（高阶）
    ctx.strokeStyle = tier === 4 ? 'rgba(255,210,77,0.8)' : tier >= 3 ? 'rgba(127,207,255,0.8)' : 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 0.5 + (tier >= 2 ? 0.5 : 0)
    ctx.beginPath()
    ctx.moveTo(0, -bladeLen + 6)
    ctx.lineTo(0, -2)
    ctx.stroke()
    if (tier >= 3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(-2, -bladeLen + 5); ctx.lineTo(-2, -3); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(2, -bladeLen + 5); ctx.lineTo(2, -3); ctx.stroke()
    }
  } else if (weaponType === 'spear') {
    ctx.translate(dir === 'right' ? 20 : -20, -10)
    if (dir === 'left') ctx.rotate(Math.PI)
    if (attacking) ctx.translate(18, 0)
    if (tier >= 2) { ctx.shadowColor = glow; ctx.shadowBlur = 6 + tier * 3 }
    // 枪杆（随阶数加长、配色）
    const poleLen = 50 + tier * 4
    if (tier >= 4) {
      ctx.fillStyle = '#d4a020'
      ctx.fillRect(-2, -6, 4, poleLen)
      ctx.fillStyle = '#fff3c0'
      ctx.fillRect(-2, -6, 1, poleLen)
    } else if (tier >= 3) {
      ctx.fillStyle = '#5a7fd0'
      ctx.fillRect(-2, -6, 4, poleLen)
      ctx.fillStyle = '#a8e8ff'
      ctx.fillRect(0, -6, 2, poleLen)
    } else if (tier === 2) {
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(-2, -6, 4, poleLen)
      ctx.fillStyle = '#4fa3ff'
      ctx.fillRect(-1, -6, 2, poleLen)
    } else {
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(-2, -6, 4, poleLen)
    }
    // 枪尖（随阶数加大、发光）
    const tipW = 3 + tier * 0.5
    const tipH = 16 + tier * 2
    ctx.fillStyle = tier >= 3 ? '#cfe9ff' : '#c0c0c0'
    ctx.beginPath()
    ctx.moveTo(-tipW, -6)
    ctx.lineTo(tipW, -6)
    ctx.lineTo(0, -tipH)
    ctx.fill()
    if (tier >= 2) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.moveTo(-1, -8); ctx.lineTo(1, -8); ctx.lineTo(0, -tipH + 2); ctx.fill()
    }
    // 枪缨/宝石（高阶）
    ctx.fillStyle = tier === 4 ? '#ffd24d' : tier >= 3 ? '#6fd3ff' : '#ff4444'
    ctx.fillRect(-1, -10 - tier, 2, 8)
    if (tier >= 3) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(0, -6, 2.2, 0, Math.PI * 2); ctx.fill()
    }
    // 尾端装饰
    if (tier >= 3) {
      ctx.fillStyle = glow
      ctx.fillRect(-3, poleLen - 2, 6, 3)
    }
  } else if (weaponType === 'bow') {
    ctx.translate(dir === 'right' ? -20 : 20, -5)
    ctx.rotate(dir === 'right' ? -0.3 : 0.3)
    if (tier >= 2) { ctx.shadowColor = glow; ctx.shadowBlur = 5 + tier * 3 }
    // 弓臂（随阶数多层精致）
    const bowR = 20 + tier * 2
    if (tier >= 3) {
      // 双弓臂 + 中心白线
      ctx.strokeStyle = tier === 4 ? '#ffd700' : '#6fc8ff'
      ctx.lineWidth = 4
      ctx.beginPath(); ctx.arc(0, 0, bowR, -1.2, 1.2); ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(0, 0, bowR - 2, -1.2, 1.2); ctx.stroke()
    } else if (tier === 2) {
      ctx.strokeStyle = '#4fa3ff'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(0, 0, bowR, -1.2, 1.2); ctx.stroke()
      ctx.strokeStyle = '#b8d8ff'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(0, 0, bowR - 1, -1.2, 1.2); ctx.stroke()
    } else {
      ctx.strokeStyle = '#8B4513'
      ctx.lineWidth = tier === 1 ? 3.5 : 3
      ctx.beginPath(); ctx.arc(0, 0, bowR, -1.2, 1.2); ctx.stroke()
    }
    // 弓臂末梢宝石（T2+）
    if (tier >= 2) {
      ctx.fillStyle = glow
      const endX = Math.sin(1.2) * bowR, endY = Math.cos(1.2) * bowR
      ctx.beginPath(); ctx.arc(-endX, endY, 2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(endX, endY, 2, 0, Math.PI * 2); ctx.fill()
    }
    // 弦（随阶数发光）
    ctx.strokeStyle = tier >= 3 ? '#eaf7ff' : '#ddd'
    ctx.lineWidth = tier >= 2 ? 1.5 : 1
    ctx.beginPath()
    ctx.moveTo(-bowR + 1, -2)
    ctx.lineTo(bowR - 1, -2)
    ctx.stroke()
    // 箭（攻击时，随阶数发光）
    if (attacking) {
      ctx.fillStyle = tier >= 4 ? '#d4a020' : '#8B4513'
      ctx.fillRect(-1, -8, 2, 20)
      ctx.fillStyle = tier >= 3 ? '#cfe9ff' : '#ff0000'
      ctx.shadowBlur = 6 + tier * 2
      ctx.beginPath()
      ctx.moveTo(-2, -28)
      ctx.lineTo(2, -28)
      ctx.lineTo(0, -34)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillRect(-2, -16, 4, 3)
      if (tier >= 3) {
        ctx.fillStyle = glow
        ctx.fillRect(-1, -8, 2, 4)
      }
    }
  } else if (weaponType === 'gun') {
    ctx.translate(dir === 'right' ? 18 : -18, -5)
    if (dir === 'left') ctx.rotate(Math.PI)
    if (tier >= 2) { ctx.shadowColor = glow; ctx.shadowBlur = 5 + tier * 3 }
    // 枪身（随阶数配色）
    ctx.fillStyle = tier === 4 ? '#d4a020' : tier >= 3 ? '#4a5a8a' : '#444'
    ctx.fillRect(-3, -8, 6, 20)
    // 枪管（随阶数加长、多节）
    ctx.fillStyle = tier === 4 ? '#8a6a10' : tier >= 3 ? '#3a4a7a' : '#333'
    ctx.fillRect(-2, -16 - tier, 4, 10 + tier * 2)
    if (tier >= 2) {
      ctx.fillStyle = tier >= 4 ? '#ffd700' : '#4fa3ff'
      ctx.fillRect(-2, -14 - tier, 4, 1)
      ctx.fillRect(-2, -10 - tier, 4, 1)
    }
    // 瞄具（T3+）
    if (tier >= 3) {
      ctx.fillStyle = '#fff'
      ctx.fillRect(-1, -18 - tier, 2, 2)
      ctx.fillRect(-1, -2, 2, 2)
    }
    // 握把
    ctx.fillStyle = tier >= 4 ? '#8a5a10' : '#8B4513'
    ctx.fillRect(-2, 8, 4, 8)
    // 符文装饰
    ctx.fillStyle = glow
    ctx.fillRect(-1, -4, 2, 3)
    // 枪口火光(攻击时，随阶数增强)
    if (attacking) {
      ctx.shadowColor = '#ffaa00'
      ctx.shadowBlur = 10 + tier * 4
      ctx.fillStyle = '#ffaa00'
      ctx.beginPath(); ctx.arc(0, -18 - tier, 6 + tier * 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = tier >= 3 ? glow : '#ffff00'
      ctx.beginPath(); ctx.arc(0, -18 - tier, 3 + tier, 0, Math.PI * 2); ctx.fill()
      if (tier >= 4) {
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(0, -18 - tier, 1.5, 0, Math.PI * 2); ctx.fill()
      }
    }
  }

  ctx.restore()
}

// 敌人精灵图映射
const ENEMY_SPRITE_MAP: Record<string, string> = {
  slime: 'slime',
  bee_warrior: 'bee_warrior',
  skeleton: 'skeleton',
  goblin: 'goblin',
  dark_mage: 'dark_mage',
  armored_knight: 'armored_knight',
  shadow_ghost: 'shadow_ghost',
  spider_witch: 'spider_witch',
  fire_imp: 'fire_imp',
  magma_golem: 'magma_golem',
  ice_troll: 'ice_troll',
  frost_wolf: 'frost_wolf',
  ice_elemental: 'ice_elemental',
  abyss_knight: 'abyss_knight',
  void_wraith: 'void_wraith',
  ancient_golem: 'ancient_golem'
}

// Boss精灵图映射
const BOSS_SPRITE_MAP: Record<string, string> = {
  'dragon_warrior': 'dragon_warrior',
  'shadow_lord': 'shadow_lord',
  'demon_lord': 'demon_lord',
  'frost_giant': 'frost_giant',
  'abyss_lord': 'abyss_lord'
}

// 背景精灵图映射
const BG_SPRITE_MAP: Record<number, string> = {
  0: 'bg_grass',
  1: 'bg_night',
  2: 'bg_night'
}

// 道具精灵图映射
const ITEM_SPRITE_MAP: Record<string, string> = {
  health: 'potion_red',
  mana: 'potion_blue',
  coin_bronze: 'coin',
  coin_silver: 'coin',
  coin_gold: 'coin'
}

// 投射物精灵图映射
const PROJECTILE_SPRITE_MAP: Record<string, string> = {
  bullet: 'projectile',
  arrow: 'projectile',
  magic: 'projectile',
  fire: 'projectile',
  dark: 'projectile'
}

export function drawEnemySprite(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  dir: Direction, enemyType: string,
  animFrame: number, hp: number, maxHp: number,
  attacking: boolean
) {
  ctx.save()

  // === 精灵图渲染 ===
  // === 精灵图帧动画 ===
  const sheetKey = ENEMY_SPRITE_MAP[enemyType]
  const sheet = sheetKey ? getSpriteSheet(sheetKey) : undefined

  if (sheet) {
    const cx = x + w / 2
    // 方向翻转
    if (dir === 'left') {
      ctx.translate(cx * 2, 0)
      ctx.scale(-1, 1)
    }
    // 按帧索引切片绘制
    const frameIdx = Math.floor(animFrame * 0.3) % sheet.frameCount
    const sx = frameIdx * sheet.frameWidth
    const padX = (w - sheet.frameWidth) / 2
    const padY = (h - sheet.frameHeight) / 2
    ctx.drawImage(
      sheet.canvas,
      sx, 0, sheet.frameWidth, sheet.frameHeight,
      x + padX, y + padY, sheet.frameWidth, sheet.frameHeight
    )

    // 血条
    if (hp < maxHp) {
      const barW = w + 4, barH = 3, barY = y - 6
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(x - 2, barY, barW, barH)
      const ratio = hp / maxHp
      const color = ratio > 0.5 ? '#4f4' : ratio > 0.25 ? '#ff0' : '#f44'
      ctx.fillStyle = color
      ctx.fillRect(x - 2, barY, barW * ratio, barH)
    }
    ctx.restore()
    return
  }

  // 单图精灵图回退（旧的）
  const spriteKey = ENEMY_SPRITE_MAP[enemyType]
  const sprite = spriteKey ? imageCache.get(spriteKey) : undefined

  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    const cx = x + w / 2
    if (dir === 'left') {
      ctx.translate(cx * 2, 0)
      ctx.scale(-1, 1)
    }
    const bounce = Math.abs(Math.sin(animFrame * 0.15)) * 3
    const padX = (w - 28) / 2
    const padY = (h - 28) / 2
    ctx.drawImage(sprite, x + padX, y + padY + bounce, 28, 28)

    if (hp < maxHp) {
      const barW = w + 4, barH = 3, barY = y - 6
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(x - 2, barY, barW, barH)
      const ratio = hp / maxHp
      const color = ratio > 0.5 ? '#4f4' : ratio > 0.25 ? '#ff0' : '#f44'
      ctx.fillStyle = color
      ctx.fillRect(x - 2, barY, barW * ratio, barH)
    }
    ctx.restore()
    return
  }

  // 程序化绘制回退
  switch (enemyType) {
    case 'slime': drawSlime(ctx, x, y, w, h, animFrame); break
    case 'bee_warrior': drawBeeWarrior(ctx, x, y, w, h, dir, animFrame); break
    case 'skeleton': drawSkeleton(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'goblin': drawGoblin(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'dark_mage': drawDarkMage(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'armored_knight': drawArmoredKnight(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'shadow_ghost': drawShadowGhost(ctx, x, y, w, h, animFrame); break
    case 'spider_witch': drawSpiderWitch(ctx, x, y, w, h, dir, animFrame); break
    case 'fire_imp': drawFireImp(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'magma_golem': drawMagmaGolem(ctx, x, y, w, h, dir, animFrame); break
    case 'ice_troll': drawIceTroll(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'frost_wolf': drawFrostWolf(ctx, x, y, w, h, dir, animFrame); break
    case 'ice_elemental': drawIceElemental(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'abyss_knight': drawAbyssKnight(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'void_wraith': drawVoidWraith(ctx, x, y, w, h, animFrame); break
    case 'ancient_golem': drawAncientGolem(ctx, x, y, w, h, dir, animFrame); break
    case 'scorpion': drawScorpion(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'dune_wolf': drawDuneWolf(ctx, x, y, w, h, dir, animFrame); break
    case 'sand_wraith': drawSandWraith(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'harpy': drawHarpy(ctx, x, y, w, h, dir, animFrame); break
    case 'cloud_imp': drawCloudImp(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'sky_raptor': drawSkyRaptor(ctx, x, y, w, h, dir, animFrame); break
    case 'castle_guard': drawCastleGuard(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'cursed_knight': drawCursedKnight(ctx, x, y, w, h, dir, animFrame, attacking); break
    case 'gargoyle': drawGargoyle(ctx, x, y, w, h, dir, animFrame); break
    default: drawSlime(ctx, x, y, w, h, animFrame)
  }

  // 血条
  if (hp < maxHp) {
    const barW = w + 4, barH = 3, barY = y - 6
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(x - 2, barY, barW, barH)
    const ratio = hp / maxHp
    const color = ratio > 0.5 ? '#4f4' : ratio > 0.25 ? '#ff0' : '#f44'
    ctx.fillStyle = color
    ctx.fillRect(x - 2, barY, barW * ratio, barH)
  }

  ctx.restore()
}

function drawSlime(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
  const bounce = Math.abs(Math.sin(frame * 0.15)) * 5
  const cy = y + h
  const cx = x + w / 2

  // 身体
  ctx.fillStyle = '#44cc44'
  ctx.beginPath()
  ctx.ellipse(cx, cy - h / 2 + bounce, w / 2, h / 2 + bounce * 0.5, 0, 0, Math.PI * 2)
  ctx.fill()

  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.beginPath()
  ctx.ellipse(cx - 4, cy - h / 2 - 2 + bounce, 5, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  // 眼睛
  ctx.fillStyle = '#fff'
  ctx.fillRect(cx - 6, cy - h / 2 - 3 + bounce, 5, 5)
  ctx.fillRect(cx + 2, cy - h / 2 - 3 + bounce, 5, 5)
  ctx.fillStyle = '#000'
  ctx.fillRect(cx - 3, cy - h / 2 - 1 + bounce, 2, 2)
  ctx.fillRect(cx + 4, cy - h / 2 - 1 + bounce, 2, 2)
}

function drawSkeleton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y)
  ctx.scale(flip, 1)

  const legSwing = Math.sin(frame * 0.4) * 3
  const armSwing = attacking ? 30 : Math.sin(frame * 0.3) * 5

  // 腿
  ctx.strokeStyle = '#ddd'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(8, h - 18); ctx.lineTo(8 + legSwing, h - 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(16, h - 18); ctx.lineTo(16 - legSwing, h - 2); ctx.stroke()

  // 身体
  ctx.fillStyle = '#ddd'
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(6, h - 22 - i * 6, 12, 3)
  }
  ctx.fillRect(10, h - 24, 4, 20)

  // 头骨
  ctx.fillStyle = '#eee'
  ctx.beginPath()
  ctx.arc(12, h - 30, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#300'
  ctx.fillRect(8, h - 33, 3, 4)
  ctx.fillRect(14, h - 33, 3, 4)
  ctx.strokeStyle = '#300'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(8, h - 27)
  ctx.lineTo(16, h - 27)
  ctx.stroke()

  // 手臂
  ctx.strokeStyle = '#ddd'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(4, h - 22)
  ctx.lineTo(4 - 2 + Math.cos(armSwing * 0.017) * 10, h - 12 + Math.sin(armSwing * 0.017) * 4)
  ctx.stroke()

  // 武器（骨头剑）
  if (attacking) {
    ctx.save()
    ctx.translate(14, h - 14)
    ctx.rotate(1.2)
    ctx.fillStyle = '#ddd'
    ctx.fillRect(-2, 0, 4, 20)
    ctx.fillRect(-3, 0, 6, 3)
    ctx.restore()
  }

  ctx.restore()
}

function drawGoblin(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y)
  ctx.scale(flip, 1)

  const legSwing = Math.sin(frame * 0.5) * 3

  // 腿
  ctx.fillStyle = '#6b3a1f'
  ctx.fillRect(6, h - 14, 5, 12 + legSwing)
  ctx.fillRect(13, h - 14, 5, 12 - legSwing)

  // 身体
  ctx.fillStyle = '#4a8c2a'
  ctx.fillRect(4, h - 28, 16, 16)

  // 腰带
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(4, h - 14, 16, 3)
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(10, h - 15, 4, 4)

  // 头
  ctx.fillStyle = '#7ab648'
  ctx.beginPath()
  ctx.arc(12, h - 34, 9, 0, Math.PI * 2)
  ctx.fill()

  // 尖耳朵
  ctx.beginPath()
  ctx.moveTo(6, h - 36)
  ctx.lineTo(0, h - 44)
  ctx.lineTo(8, h - 38)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(18, h - 36)
  ctx.lineTo(24, h - 44)
  ctx.lineTo(16, h - 38)
  ctx.fill()

  // 眼睛
  ctx.fillStyle = '#ff0'
  ctx.fillRect(8, h - 38, 3, 3)
  ctx.fillRect(14, h - 38, 3, 3)
  ctx.fillStyle = '#000'
  ctx.fillRect(9, h - 37, 1, 1)
  ctx.fillRect(15, h - 37, 1, 1)

  // 手臂+匕首
  ctx.save()
  ctx.translate(18, h - 24)
  if (attacking) ctx.rotate(0.8)
  ctx.fillStyle = '#6b3a1f'
  ctx.fillRect(0, -2, 10, 4)
  ctx.fillStyle = '#888'
  ctx.fillRect(8, -3, 2, 10)
  ctx.fillStyle = '#aaa'
  ctx.beginPath()
  ctx.moveTo(9, -13)
  ctx.lineTo(11, -13)
  ctx.lineTo(10, -16)
  ctx.fill()
  ctx.restore()
  ctx.restore()
}

function drawDarkMage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y)
  ctx.scale(flip, 1)

  // 长袍
  ctx.fillStyle = '#3a1a6e'
  ctx.beginPath()
  ctx.moveTo(2, h - 30)
  ctx.lineTo(4, h)
  ctx.lineTo(20, h)
  ctx.lineTo(22, h - 30)
  ctx.closePath()
  ctx.fill()

  // 袍子褶皱
  ctx.strokeStyle = '#4a2a8e'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(8, h - 20); ctx.lineTo(6, h - 4); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(16, h - 20); ctx.lineTo(18, h - 4); ctx.stroke()

  // 头
  ctx.fillStyle = '#ffdbb4'
  ctx.beginPath()
  ctx.arc(12, h - 36, 8, 0, Math.PI * 2)
  ctx.fill()

  // 帽子
  ctx.fillStyle = '#3a1a6e'
  ctx.beginPath()
  ctx.moveTo(2, h - 40)
  ctx.lineTo(12, h - 54)
  ctx.lineTo(22, h - 40)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffd700'
  ctx.beginPath()
  ctx.arc(12, h - 54, 3, 0, Math.PI * 2)
  ctx.fill()

  // 眼睛（发光）
  ctx.fillStyle = '#ff00ff'
  ctx.fillRect(8, h - 38, 3, 3)
  ctx.fillRect(14, h - 38, 3, 3)

  // 法杖
  ctx.save()
  ctx.translate(18, h - 26)
  if (attacking) ctx.rotate(-0.5)
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(0, -2, 2, 30)
  ctx.fillStyle = '#ff00ff'
  ctx.beginPath()
  ctx.arc(1, -4, 5, 0, Math.PI * 2)
  ctx.fill()
  if (attacking) {
    ctx.fillStyle = 'rgba(255,0,255,0.5)'
    ctx.beginPath()
    ctx.arc(1, -4, 10, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  ctx.restore()
}

function drawArmoredKnight(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y)
  ctx.scale(flip, 1)

  // 腿（重甲）
  ctx.fillStyle = '#777'
  ctx.fillRect(5, h - 20, 7, 18)
  ctx.fillRect(14, h - 20, 7, 18)
  // 护膝
  ctx.fillStyle = '#999'
  ctx.fillRect(4, h - 10, 9, 3)
  ctx.fillRect(13, h - 10, 9, 3)

  // 身体（板甲）
  const plateGrad = ctx.createLinearGradient(4, 0, 22, 0)
  plateGrad.addColorStop(0, '#555')
  plateGrad.addColorStop(0.3, '#aaa')
  plateGrad.addColorStop(0.7, '#888')
  plateGrad.addColorStop(1, '#555')
  ctx.fillStyle = plateGrad
  ctx.fillRect(2, h - 38, 22, 22)

  // 铠甲装饰
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(8, h - 36, 10, 2)
  ctx.fillRect(11, h - 28, 4, 4)

  // 肩甲
  ctx.fillStyle = '#999'
  ctx.fillRect(0, h - 42, 8, 6)
  ctx.fillRect(18, h - 42, 8, 6)

  // 头盔
  ctx.fillStyle = '#888'
  ctx.beginPath()
  ctx.arc(13, h - 48, 10, Math.PI, 0)
  ctx.fill()
  ctx.fillRect(3, h - 48, 20, 6)
  // 面甲
  ctx.fillStyle = '#444'
  ctx.fillRect(6, h - 50, 14, 8)
  ctx.fillStyle = '#ff4'
  ctx.fillRect(10, h - 48, 2, 2)
  ctx.fillRect(14, h - 48, 2, 2)
  // 头盔羽毛
  ctx.fillStyle = '#f00'
  ctx.fillRect(12, h - 60, 2, 12)

  // 手臂+盾牌和武器
  ctx.fillStyle = '#777'
  ctx.fillRect(0, h - 34, 4, 12)
  ctx.fillRect(22, h - 34, 4, 12)
  // 盾牌
  ctx.fillStyle = '#666'
  ctx.fillRect(-2, h - 30, 6, 14)
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(0, h - 24, 2, 2)
  // 大剑
  ctx.save()
  ctx.translate(24, h - 32)
  if (attacking) ctx.rotate(0.9)
  ctx.fillStyle = '#888'
  ctx.fillRect(-2, -4, 4, 6)
  ctx.fillStyle = '#bbb'
  ctx.fillRect(-2, -22, 4, 20)
  ctx.beginPath()
  ctx.moveTo(-3, -22)
  ctx.lineTo(3, -22)
  ctx.lineTo(0, -26)
  ctx.fill()
  ctx.restore()
  ctx.restore()
}

function drawBeeWarrior(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y)
  ctx.scale(flip, 1)
  const wingFlap = Math.sin(frame * 0.4) * 3
  ctx.fillStyle = 'rgba(220,230,255,0.6)'
  ctx.beginPath(); ctx.ellipse(7, 10 + wingFlap, 6, 4, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(21, 10 + wingFlap, 6, 4, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffcc00'; ctx.fillRect(8, 12, 12, 14)
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(8, 16, 12, 3); ctx.fillRect(8, 22, 12, 2)
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(10, 6, 8, 8)
  ctx.fillStyle = '#ff4444'; ctx.fillRect(12, 8, 3, 3); ctx.fillRect(17, 8, 3, 3)
  ctx.fillStyle = '#fff'; ctx.fillRect(13, 9, 1, 1); ctx.fillRect(18, 9, 1, 1)
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(11, 3, 1, 4); ctx.fillRect(18, 3, 1, 4)
  ctx.fillStyle = '#ff4400'; ctx.fillRect(13, 26, 2, 2)
  ctx.fillStyle = '#8B4513'; ctx.fillRect(22, 14, 2, 10); ctx.fillStyle = '#aaa'; ctx.fillRect(21, 12, 4, 3)
  ctx.restore()
}

function drawShadowGhost(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
  const float = Math.sin(frame * 0.15) * 3
  const cx = x + w / 2
  ctx.fillStyle = 'rgba(80,0,120,0.4)'; ctx.fillRect(x + 6, y + h - 2, 16, 2)
  ctx.fillStyle = 'rgba(60,20,100,0.8)'
  ctx.beginPath(); ctx.arc(cx, y + 14 + float, 10, Math.PI, 0); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx - 10, y + 14 + float); ctx.lineTo(cx - 10, y + 26 + float)
  ctx.lineTo(cx - 6, y + 24 + float); ctx.lineTo(cx - 2, y + 26 + float)
  ctx.lineTo(cx + 2, y + 24 + float); ctx.lineTo(cx + 6, y + 26 + float)
  ctx.lineTo(cx + 10, y + 24 + float); ctx.lineTo(cx + 10, y + 14 + float)
  ctx.fill()
  ctx.fillStyle = '#000'; ctx.fillRect(cx - 6, y + 10 + float, 4, 4); ctx.fillRect(cx + 2, y + 10 + float, 4, 4)
  ctx.fillStyle = '#b400ff'; ctx.fillRect(cx - 5, y + 11 + float, 2, 2); ctx.fillRect(cx + 3, y + 11 + float, 2, 2)
  ctx.fillStyle = '#2a0040'; ctx.fillRect(cx - 2, y + 16 + float, 4, 4)
  ctx.fillStyle = `rgba(128,0,255,${0.15 + Math.sin(frame * 0.1) * 0.05})`
  ctx.beginPath(); ctx.arc(cx, y + 16 + float, 14, 0, Math.PI * 2); ctx.fill()
}

function drawSpiderWitch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const legSwing = Math.sin(frame * 0.3) * 2
  ctx.fillStyle = '#1a0020'
  ctx.fillRect(2, 14 + legSwing, 2, 12); ctx.fillRect(4, 16 + legSwing, 2, 10)
  ctx.fillRect(26, 16 - legSwing, 2, 10); ctx.fillRect(28, 14 - legSwing, 2, 12)
  ctx.fillRect(0, 18 + legSwing, 2, 8); ctx.fillRect(30, 18 - legSwing, 2, 8)
  ctx.fillStyle = '#2a0040'; ctx.fillRect(10, 10, 12, 16)
  ctx.fillStyle = '#3a1a5a'; ctx.fillRect(11, 6, 10, 8)
  ctx.fillStyle = '#ff00ff'; ctx.fillRect(12, 8, 2, 2); ctx.fillRect(16, 8, 2, 2); ctx.fillRect(20, 8, 2, 2)
  ctx.fillStyle = '#fff'; ctx.fillRect(13, 9, 1, 1); ctx.fillRect(17, 9, 1, 1); ctx.fillRect(21, 9, 1, 1)
  ctx.fillStyle = '#fff'; ctx.fillRect(14, 13, 1, 3); ctx.fillRect(18, 13, 1, 3)
  ctx.fillStyle = '#6a008a'; ctx.fillRect(14, 16, 4, 2); ctx.fillStyle = '#4a006a'; ctx.fillRect(12, 20, 8, 2)
  ctx.fillStyle = '#aa00ff'; ctx.fillRect(20, 22, 2, 4)
  ctx.restore()
}

function drawFireImp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const breath = Math.sin(frame * 0.15) * 1
  const flame = Math.sin(frame * 0.3) * 2
  ctx.fillStyle = '#8a1a00'; ctx.fillRect(8, 22, 4, 8); ctx.fillRect(16, 22, 4, 8)
  ctx.fillStyle = '#cc3300'; ctx.fillRect(6, 10 + breath, 16, 14)
  ctx.fillStyle = '#ff6600'; ctx.fillRect(6, 10 + breath, 16, 3)
  ctx.fillStyle = '#8a1a00'; ctx.fillRect(6, 21 + breath, 16, 3)
  ctx.fillStyle = '#ff4400'; ctx.fillRect(8, 2 + breath, 12, 10)
  ctx.fillStyle = '#1a0000'; ctx.fillRect(7, 0 + breath, 2, 4); ctx.fillRect(19, 0 + breath, 2, 4)
  ctx.fillStyle = '#ffff00'; ctx.fillRect(10, 5 + breath, 3, 3); ctx.fillRect(15, 5 + breath, 3, 3)
  ctx.fillStyle = '#000'; ctx.fillRect(11, 6 + breath, 1, 1); ctx.fillRect(16, 6 + breath, 1, 1)
  ctx.fillStyle = '#1a0000'; ctx.fillRect(11, 10 + breath, 6, 2)
  ctx.fillStyle = '#ff6600'
  ctx.beginPath()
  ctx.moveTo(10, -2 + breath); ctx.lineTo(12, -6 + breath - flame); ctx.lineTo(14, -2 + breath); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(16, -2 + breath); ctx.lineTo(18, -6 + breath - flame); ctx.lineTo(20, -2 + breath); ctx.fill()
  ctx.fillStyle = '#8B4513'; ctx.fillRect(22, 14 + breath, 2, 10)
  ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(23, 12 + breath, 3 + flame, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawMagmaGolem(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const breath = Math.sin(frame * 0.1) * 1
  const glow = Math.sin(frame * 0.1) * 0.5 + 0.5
  ctx.fillStyle = '#4a1a00'; ctx.fillRect(6, 24, 8, 14); ctx.fillRect(18, 24, 8, 14)
  ctx.fillStyle = '#2a0a00'; ctx.fillRect(4, 36, 10, 4); ctx.fillRect(18, 36, 10, 4)
  ctx.fillStyle = '#6a2a00'; ctx.fillRect(2, 8 + breath, 28, 20)
  ctx.fillStyle = '#8a4a00'; ctx.fillRect(2, 8 + breath, 28, 3)
  ctx.fillStyle = `rgba(255,150,0,${0.5 + glow * 0.5})`
  ctx.fillRect(6, 14 + breath, 2, 10); ctx.fillRect(8, 18 + breath, 4, 2)
  ctx.fillRect(20, 12 + breath, 2, 12); ctx.fillRect(20, 18 + breath, 6, 2)
  ctx.fillStyle = `rgba(255,200,0,${0.7 + glow * 0.3})`
  ctx.beginPath(); ctx.arc(16, 18 + breath, 4 + glow, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#5a2a00'; ctx.fillRect(8, 0 + breath, 16, 10)
  ctx.fillStyle = '#7a4a00'; ctx.fillRect(8, 0 + breath, 16, 2)
  ctx.fillStyle = '#ff4400'; ctx.fillRect(10, 4 + breath, 4, 3); ctx.fillRect(18, 4 + breath, 4, 3)
  ctx.fillStyle = `rgba(255,${200 + glow * 55},0,1)`; ctx.fillRect(11, 4 + breath, 2, 2); ctx.fillRect(19, 4 + breath, 2, 2)
  ctx.fillStyle = '#4a1a00'; ctx.fillRect(0, 12 + breath, 4, 14); ctx.fillRect(28, 12 + breath, 4, 14)
  ctx.fillStyle = '#3a1000'; ctx.fillRect(-2, 22 + breath, 6, 6); ctx.fillRect(28, 22 + breath, 6, 6)
  ctx.restore()
}

// ============ 冰霜系敌人（第4关）============
function drawIceTroll(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const breath = Math.sin(frame * 0.1) * 1.5
  const armSwing = attacking ? 4 : Math.sin(frame * 0.2) * 1
  // 腿（冰蓝粗腿）
  ctx.fillStyle = '#3a6a8a'; ctx.fillRect(6, h - 16, 8, 14); ctx.fillRect(18, h - 16, 8, 14)
  ctx.fillStyle = '#2a4a6a'; ctx.fillRect(4, h - 4, 11, 4); ctx.fillRect(18, h - 4, 11, 4)
  // 身体（冰蓝厚皮 + 冰晶装甲）
  ctx.fillStyle = '#4a8ab0'; ctx.fillRect(3, h - 34, 26, 20)
  ctx.fillStyle = '#6ac0e8'; ctx.fillRect(3, h - 34, 26, 3)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(10, h - 30, 3, 4); ctx.fillRect(18, h - 30, 3, 4)
  // 冰晶装甲条纹
  ctx.fillStyle = '#a0e8ff'; ctx.fillRect(6, h - 28 + armSwing, 3, 8); ctx.fillRect(22, h - 28 + armSwing, 3, 8)
  // 手臂（攻击挥冰锤）
  ctx.fillStyle = '#4a8ab0'
  ctx.fillRect(0, h - 32 + armSwing, 5, 10); ctx.fillRect(26, h - 32 + armSwing, 5, 10)
  if (attacking) {
    ctx.fillStyle = '#c8f0ff'; ctx.fillRect(-5, h - 38, 8, 7); ctx.fillRect(-4, h - 40, 6, 3)
  }
  // 头
  ctx.fillStyle = '#5a9ac0'; ctx.fillRect(7, h - 46 + breath, 18, 14)
  ctx.fillStyle = '#7ad0f0'; ctx.fillRect(7, h - 46 + breath, 18, 3)
  // 冰晶角
  ctx.fillStyle = '#c8f0ff'
  ctx.beginPath(); ctx.moveTo(9, h - 44 + breath); ctx.lineTo(4, h - 54 + breath); ctx.lineTo(13, h - 43 + breath); ctx.fill()
  ctx.beginPath(); ctx.moveTo(23, h - 44 + breath); ctx.lineTo(28, h - 54 + breath); ctx.lineTo(19, h - 43 + breath); ctx.fill()
  // 眼睛（橙红怒眼）
  ctx.fillStyle = '#ff8830'; ctx.fillRect(10, h - 40 + breath, 4, 4); ctx.fillRect(18, h - 40 + breath, 4, 4)
  ctx.fillStyle = '#000'; ctx.fillRect(11, h - 39 + breath, 2, 2); ctx.fillRect(19, h - 39 + breath, 2, 2)
  // 獠牙
  ctx.fillStyle = '#e0f4ff'; ctx.fillRect(10, h - 34 + breath, 3, 4); ctx.fillRect(19, h - 34 + breath, 3, 4)
  ctx.restore()
}

function drawFrostWolf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const run = Math.sin(frame * 0.5) * 2
  // 腿（奔跑）
  ctx.fillStyle = '#b8d8e8'; ctx.fillRect(6, h - 12 + run, 5, 11 - run); ctx.fillRect(12, h - 12 - run, 5, 11 + run)
  ctx.fillRect(20, h - 12 - run, 5, 11 + run); ctx.fillRect(26, h - 12 + run, 5, 11 - run)
  // 身体（白狼）
  ctx.fillStyle = '#e8f4fa'; ctx.fillRect(4, h - 24, 24, 13)
  ctx.fillStyle = '#c0dcea'; ctx.fillRect(4, h - 24, 24, 3)
  // 背毛
  ctx.fillStyle = '#8ab8d0'; ctx.fillRect(12, h - 27, 9, 4)
  // 尾巴
  ctx.fillStyle = '#dceef6'; ctx.beginPath(); ctx.moveTo(26, h - 20); ctx.quadraticCurveTo(32, h - 26, 30, h - 32); ctx.lineTo(28, h - 24); ctx.fill()
  // 头
  ctx.fillStyle = '#eef6fa'; ctx.fillRect(2, h - 32, 16, 10)
  // 尖耳
  ctx.fillStyle = '#c0dcea'; ctx.beginPath(); ctx.moveTo(4, h - 32); ctx.lineTo(2, h - 40); ctx.lineTo(8, h - 31); ctx.fill()
  ctx.beginPath(); ctx.moveTo(12, h - 32); ctx.lineTo(14, h - 40); ctx.lineTo(17, h - 31); ctx.fill()
  // 红眼（霜牙凶光）
  ctx.fillStyle = '#ff2020'; ctx.fillRect(4, h - 29, 3, 2); ctx.fillRect(10, h - 29, 3, 2)
  // 冰牙
  ctx.fillStyle = '#a0d8f0'; ctx.fillRect(2, h - 26, 3, 5); ctx.fillRect(7, h - 26, 3, 5)
  // 口鼻
  ctx.fillStyle = '#c8e0f0'; ctx.fillRect(2, h - 27, 16, 3)
  ctx.restore()
}

function drawIceElemental(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const float = Math.sin(frame * 0.12) * 2
  const glow = Math.sin(frame * 0.12) * 0.5 + 0.5
  // 旋转冰晶（光环）
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + frame * 0.05
    const ix = 14 + Math.cos(a) * 13, iy = h - 16 + Math.sin(a) * 10
    ctx.fillStyle = `rgba(160,230,255,${0.4 + glow * 0.3})`
    ctx.fillRect(ix - 2, iy - 2, 4, 4)
  }
  // 寒气尾迹
  ctx.fillStyle = `rgba(190,240,255,${0.3 + glow * 0.2})`
  ctx.beginPath(); ctx.ellipse(14, h - 8, 10 + glow * 3, 3, 0, 0, Math.PI * 2); ctx.fill()
  // 核心（冰晶）
  ctx.fillStyle = '#60c8f0'; ctx.beginPath(); ctx.moveTo(14, h - 30 + float); ctx.lineTo(8, h - 22 + float); ctx.lineTo(14, h - 2 + float); ctx.lineTo(20, h - 22 + float); ctx.fill()
  ctx.fillStyle = '#a8e8ff'; ctx.beginPath(); ctx.moveTo(14, h - 30 + float); ctx.lineTo(14, h - 2 + float); ctx.lineTo(18, h - 22 + float); ctx.fill()
  ctx.fillStyle = '#ffffff'; ctx.fillRect(11, h - 26 + float, 2, 8)
  // 攻击时的冰箭凝聚
  if (attacking) {
    ctx.fillStyle = '#d8f4ff'
    ctx.beginPath(); ctx.arc(26, h - 16 + float, 5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(26, h - 16 + float, 2, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

// ============ 深渊系敌人（第5关）============
function drawAbyssKnight(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const breath = Math.sin(frame * 0.1) * 1
  // 腿（暗黑重甲）
  ctx.fillStyle = '#1a0e24'; ctx.fillRect(5, h - 16, 8, 14); ctx.fillRect(18, h - 16, 8, 14)
  ctx.fillStyle = '#0a0512'; ctx.fillRect(4, h - 5, 11, 5); ctx.fillRect(17, h - 5, 11, 5)
  // 身体（深渊重甲 + 紫纹）
  ctx.fillStyle = '#241232'; ctx.fillRect(2, h - 34, 28, 20)
  ctx.fillStyle = '#3a1a50'; ctx.fillRect(2, h - 34, 28, 3)
  ctx.fillStyle = 'rgba(160,80,255,0.55)'; ctx.fillRect(10, h - 28, 4, 6); ctx.fillRect(18, h - 28, 4, 6)
  ctx.fillStyle = 'rgba(200,120,255,0.4)'; ctx.fillRect(14, h - 30, 2, 4)
  // 手臂
  ctx.fillStyle = '#241232'; ctx.fillRect(0, h - 32, 4, 12); ctx.fillRect(28, h - 32, 4, 12)
  // 肩甲尖刺
  ctx.fillStyle = '#4a2068'; ctx.beginPath(); ctx.moveTo(0, h - 32); ctx.lineTo(-4, h - 38); ctx.lineTo(4, h - 30); ctx.fill()
  ctx.beginPath(); ctx.moveTo(32, h - 32); ctx.lineTo(36, h - 38); ctx.lineTo(28, h - 30); ctx.fill()
  // 头盔（带角）
  ctx.fillStyle = '#2a1440'; ctx.fillRect(6, h - 46 + breath, 20, 14)
  ctx.fillStyle = '#401c60'; ctx.fillRect(6, h - 46 + breath, 20, 3)
  // 头盔角
  ctx.fillStyle = '#8a40d0'; ctx.beginPath(); ctx.moveTo(9, h - 44 + breath); ctx.lineTo(5, h - 56 + breath); ctx.lineTo(13, h - 43 + breath); ctx.fill()
  ctx.beginPath(); ctx.moveTo(23, h - 44 + breath); ctx.lineTo(27, h - 56 + breath); ctx.lineTo(19, h - 43 + breath); ctx.fill()
  // 红眼（面甲缝隙）
  ctx.fillStyle = '#ff2040'; ctx.fillRect(9, h - 40 + breath, 5, 2); ctx.fillRect(18, h - 40 + breath, 5, 2)
  // 深渊巨剑
  ctx.save()
  ctx.translate(26, h - 34)
  if (attacking) ctx.rotate(0.8)
  ctx.fillStyle = '#3a1a50'; ctx.fillRect(-3, 0, 6, 14)
  ctx.fillStyle = '#5a2a80'; ctx.fillRect(-4, -26, 8, 26)
  ctx.fillStyle = '#a050ff'; ctx.fillRect(-2, -26, 2, 24)
  ctx.fillStyle = '#e0b0ff'; ctx.beginPath(); ctx.moveTo(-4, -26); ctx.lineTo(4, -26); ctx.lineTo(0, -32); ctx.fill()
  ctx.restore()
  ctx.restore()
}

function drawVoidWraith(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
  const float = Math.sin(frame * 0.12) * 3
  const cx = x + w / 2
  const cy = y + h - 8 + float
  const pul = Math.sin(frame * 0.1) * 0.5 + 0.5
  // 虚空曳尾
  ctx.fillStyle = `rgba(90,30,140,${0.2 + pul * 0.15})`
  ctx.beginPath(); ctx.ellipse(cx, cy + 8, w * 0.5, 6, 0, 0, Math.PI * 2); ctx.fill()
  // 主体（半透明暗紫虚影）
  ctx.fillStyle = `rgba(120,50,200,${0.55 + pul * 0.15})`
  ctx.beginPath()
  ctx.moveTo(cx, y + 2 + float)
  ctx.quadraticCurveTo(x + w, y + 8 + float, x + w - 4, cy)
  ctx.quadraticCurveTo(x + w, h + 6, cx, y + h + float)
  ctx.quadraticCurveTo(x, h + 6, x + 4, cy)
  ctx.quadraticCurveTo(x, y + 8 + float, cx, y + 2 + float)
  ctx.fill()
  // 撕裂的衣摆
  ctx.fillStyle = `rgba(70,20,130,${0.4 + pul * 0.2})`
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(cx - 10 + i * 9, cy + 4)
    ctx.lineTo(cx - 6 + i * 9, cy + 10 + (i % 2) * 3)
    ctx.lineTo(cx - 2 + i * 9, cy + 4)
    ctx.fill()
  }
  // 头部（黑洞漩涡）
  ctx.fillStyle = '#0a0412'; ctx.beginPath(); ctx.arc(cx, y + 14 + float, 10, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgba(160,80,255,${0.35 + pul * 0.25})`
  ctx.beginPath(); ctx.arc(cx, y + 14 + float, 10 + pul * 3, 0, Math.PI * 2); ctx.fill()
  // 虚空之眼
  ctx.fillStyle = '#e080ff'; ctx.fillRect(cx - 6, y + 10 + float, 4, 4); ctx.fillRect(cx + 2, y + 10 + float, 4, 4)
  ctx.fillStyle = '#000'; ctx.fillRect(cx - 5, y + 11 + float, 2, 2); ctx.fillRect(cx + 3, y + 11 + float, 2, 2)
}

function drawAncientGolem(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const breath = Math.sin(frame * 0.08) * 1
  const glow = Math.sin(frame * 0.08) * 0.5 + 0.5
  // 腿（巨型石柱）
  ctx.fillStyle = '#3a3a46'; ctx.fillRect(6, h - 16, 10, 14); ctx.fillRect(22, h - 16, 10, 14)
  ctx.fillStyle = '#2a2a34'; ctx.fillRect(4, h - 4, 14, 4); ctx.fillRect(22, h - 4, 14, 4)
  // 身体（远古岩石 + 发光符文）
  ctx.fillStyle = '#4a4a58'; ctx.fillRect(2, h - 36 + breath, 34, 22)
  ctx.fillStyle = '#5a5a6a'; ctx.fillRect(2, h - 36 + breath, 34, 3)
  // 符文纹路（紫色能量）
  ctx.fillStyle = `rgba(170,90,255,${0.5 + glow * 0.5})`
  ctx.fillRect(8, h - 26 + breath, 5, 3); ctx.fillRect(16, h - 30 + breath, 3, 8); ctx.fillRect(24, h - 26 + breath, 5, 3)
  ctx.fillStyle = `rgba(255,255,255,${0.5 + glow * 0.3})`; ctx.fillRect(16, h - 30 + breath, 1, 8)
  // 巨臂
  ctx.fillStyle = '#4a4a58'; ctx.fillRect(0, h - 32 + breath, 6, 16); ctx.fillRect(32, h - 32 + breath, 6, 16)
  // 巨拳
  ctx.fillStyle = '#5a5a6a'; ctx.fillRect(-3, h - 16 + breath, 8, 8); ctx.fillRect(33, h - 16 + breath, 8, 8)
  ctx.fillStyle = '#7a7a8a'; ctx.fillRect(-2, h - 15 + breath, 2, 6); ctx.fillRect(34, h - 15 + breath, 2, 6)
  // 头（石像）
  ctx.fillStyle = '#525260'; ctx.fillRect(8, h - 46 + breath, 22, 12)
  ctx.fillStyle = '#626270'; ctx.fillRect(8, h - 46 + breath, 22, 3)
  // 符文之眼（紫焰）
  ctx.fillStyle = `rgba(200,110,255,${0.6 + glow * 0.4})`
  ctx.fillRect(12, h - 40 + breath, 6, 3); ctx.fillRect(20, h - 40 + breath, 6, 3)
  ctx.fillStyle = '#fff'; ctx.fillRect(13, h - 40 + breath, 2, 1); ctx.fillRect(21, h - 40 + breath, 2, 1)
  // 头顶裂纹发光
  ctx.fillStyle = `rgba(190,100,255,${0.4 + glow * 0.4})`
  ctx.beginPath(); ctx.moveTo(14, h - 46 + breath); ctx.lineTo(19, h - 50 + breath); ctx.lineTo(24, h - 46 + breath); ctx.fill()
  ctx.restore()
}

// ============ 沙漠系敌人（第2关）============
function drawScorpion(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const wave = Math.sin(frame * 0.25) * 2
  // 六足
  ctx.fillStyle = '#a16207'
  ctx.fillRect(4, h - 6 + (wave > 0 ? -2 : 0), 3, 6); ctx.fillRect(10, h - 4 + (wave > 0 ? -2 : 0), 3, 5)
  ctx.fillRect(18, h - 4 - (wave > 0 ? -2 : 0), 3, 5); ctx.fillRect(24, h - 6 - (wave > 0 ? -2 : 0), 3, 6)
  // 腹部
  ctx.fillStyle = '#ca8a04'
  ctx.beginPath(); ctx.ellipse(14, h - 12 - Math.abs(wave) * 0.5, 11, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#eab308'
  ctx.beginPath(); ctx.ellipse(14, h - 14 - Math.abs(wave) * 0.5, 7, 4, 0, 0, Math.PI * 2); ctx.fill()
  // 甲壳节
  ctx.fillStyle = '#a16207'
  for (let i = 0; i < 3; i++) ctx.fillRect(9 + i * 3, h - 17 - Math.abs(wave) * 0.5, 2, 3)
  // 钳子（前伸）
  ctx.fillStyle = '#ca8a04'
  const reach = attacking ? 6 : Math.sin(frame * 0.2) * 2
  ctx.fillRect(26 + reach, h - 20, 4, 5); ctx.fillRect(29 + reach, h - 24, 3, 6)
  ctx.fillStyle = '#eab308'
  ctx.fillRect(30 + reach, h - 25, 2, 3); ctx.fillRect(31 + reach, h - 22, 2, 4)
  // 头部
  ctx.fillStyle = '#ca8a04'
  ctx.fillRect(2, h - 22, 10, 9)
  ctx.fillStyle = '#1a1206'
  ctx.fillRect(4, h - 20, 2, 3); ctx.fillRect(8, h - 20, 2, 3)
  // 毒尾（上翘）
  ctx.strokeStyle = '#a16207'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(14, h - 18 - Math.abs(wave)); ctx.quadraticCurveTo(14 + wave * 2, h - 28 - Math.abs(wave), 6 + wave, h - 34 - Math.abs(wave)); ctx.stroke()
  ctx.fillStyle = '#dc2626'
  ctx.beginPath(); ctx.arc(6 + wave, h - 36 - Math.abs(wave), 3, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(6 + wave, h - 37 - Math.abs(wave), 1, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawDuneWolf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const run = Math.sin(frame * 0.4) * 4
  // 后腿
  ctx.fillStyle = '#b45309'
  ctx.fillRect(4, h - 10 + (run > 0 ? -4 : 0), 4, 10); ctx.fillRect(10, h - 10 - (run > 0 ? -4 : 0), 4, 10)
  // 前腿
  ctx.fillRect(20, h - 10 - (run > 0 ? -4 : 0), 4, 10); ctx.fillRect(26, h - 10 + (run > 0 ? -4 : 0), 4, 10)
  // 身体
  ctx.fillStyle = '#d97706'
  ctx.fillRect(2, h - 22 + Math.abs(run) * 0.3, 28, 12)
  ctx.fillStyle = '#f59e0b'
  ctx.fillRect(2, h - 22 + Math.abs(run) * 0.3, 28, 3)
  // 沙色斑纹
  ctx.fillStyle = '#92400e'
  ctx.fillRect(10, h - 16 + Math.abs(run) * 0.3, 4, 3); ctx.fillRect(18, h - 15 + Math.abs(run) * 0.3, 3, 3)
  // 尾巴（上扬甩动）
  ctx.strokeStyle = '#d97706'; ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(2, h - 20 + Math.abs(run) * 0.3); ctx.quadraticCurveTo(-6 + run * 0.3, h - 26, -2 + run * 0.3, h - 32); ctx.stroke()
  ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(-2 + run * 0.3, h - 33, 3, 0, Math.PI * 2); ctx.fill()
  // 头
  ctx.fillStyle = '#d97706'
  ctx.fillRect(24, h - 30, 8, 9)
  ctx.fillStyle = '#f59e0b'; ctx.fillRect(24, h - 30, 8, 2)
  // 耳朵
  ctx.fillStyle = '#92400e'
  ctx.fillRect(25, h - 34, 3, 5); ctx.fillRect(29, h - 34, 3, 5)
  // 眼睛
  ctx.fillStyle = '#fffbeb'; ctx.fillRect(29, h - 27, 2, 2)
  ctx.fillStyle = '#000'; ctx.fillRect(30, h - 27, 1, 2)
  // 獠牙
  ctx.fillStyle = '#fef3c7'; ctx.fillRect(24, h - 22, 2, 3)
  ctx.restore()
}

function drawSandWraith(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const float = Math.sin(frame * 0.12) * 3
  const cx = x + w / 2
  ctx.globalAlpha = 0.85
  // 沙尘拖尾（幽灵下摆）
  ctx.fillStyle = '#d9a13b'
  ctx.beginPath(); ctx.ellipse(cx, y + h - 2 + float, w / 2, 4, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#c58a2c'
  ctx.beginPath(); ctx.ellipse(cx - 6, y + h + 2 + float, 5, 3, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(cx + 6, y + h + 2 + float, 5, 3, 0, 0, Math.PI * 2); ctx.fill()
  // 身体（沙雾人形）
  ctx.fillStyle = '#e6b44a'
  ctx.beginPath()
  ctx.moveTo(cx - w / 2, y + h - 6 + float)
  ctx.quadraticCurveTo(cx - w / 2, y + 4 + float, cx, y + 2 + float)
  ctx.quadraticCurveTo(cx + w / 2, y + 4 + float, cx + w / 2, y + h - 6 + float)
  ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#f6c964'
  ctx.beginPath(); ctx.ellipse(cx, y + 10 + float, w / 2 - 2, 8, 0, 0, Math.PI * 2); ctx.fill()
  // 手臂（流沙）
  ctx.fillStyle = '#d9a13b'
  const arm = attacking ? 8 : Math.sin(frame * 0.2) * 3
  ctx.fillRect(cx - w / 2 + 2, y + 12 + float + (arm > 0 ? arm : 0), 4, 10)
  ctx.fillRect(cx + w / 2 - 6, y + 12 + float + (arm < 0 ? -arm : 0), 4, 10)
  // 空洞之眼（灼热金瞳）
  ctx.fillStyle = '#fffbeb'; ctx.fillRect(cx - 6, y + 14 + float, 4, 4); ctx.fillRect(cx + 2, y + 14 + float, 4, 4)
  ctx.fillStyle = '#b45309'; ctx.fillRect(cx - 5, y + 15 + float, 2, 2); ctx.fillRect(cx + 3, y + 15 + float, 2, 2)
  // 头顶沙尘
  ctx.fillStyle = 'rgba(250,204,21,0.6)'
  ctx.fillRect(cx - 4, y - 2 + float, 8, 2)
  ctx.globalAlpha = 1
  ctx.restore()
}


// ============ 天空系敌人（第7关）============
function drawHarpy(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const flap = Math.sin(frame * 0.3) * 5
  const bob = Math.sin(frame * 0.15) * 2
  // 翅膀（扇动）
  ctx.fillStyle = '#7c3aed'
  ctx.beginPath()
  ctx.moveTo(6, 14 + bob)
  ctx.lineTo(-4 + flap, 2 + bob); ctx.lineTo(-2, 14 + bob); ctx.lineTo(-2 - flap * 0.5, 20 + bob)
  ctx.closePath(); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(22, 14 + bob)
  ctx.lineTo(32 - flap, 2 + bob); ctx.lineTo(30, 14 + bob); ctx.lineTo(30 + flap * 0.5, 20 + bob)
  ctx.closePath(); ctx.fill()
  // 腿爪
  ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(10, 22 + bob); ctx.lineTo(9, 28 + bob); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(18, 22 + bob); ctx.lineTo(19, 28 + bob); ctx.stroke()
  ctx.fillStyle = '#4c1d95'
  ctx.fillRect(6, 28 + bob, 6, 2); ctx.fillRect(16, 28 + bob, 6, 2)
  // 身体
  ctx.fillStyle = '#8b5cf6'
  ctx.beginPath(); ctx.ellipse(14, 16 + bob, 8, 10, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#a78bfa'; ctx.beginPath(); ctx.ellipse(14, 12 + bob, 5, 5, 0, 0, Math.PI * 2); ctx.fill()
  // 头
  ctx.fillStyle = '#a78bfa'
  ctx.beginPath(); ctx.arc(14, 4 + bob, 6, 0, Math.PI * 2); ctx.fill()
  // 羽冠
  ctx.fillStyle = '#c4b5fd'
  ctx.beginPath(); ctx.moveTo(12, 0 + bob); ctx.lineTo(14, -5 + bob); ctx.lineTo(17, 0 + bob); ctx.fill()
  // 眼睛与喙
  ctx.fillStyle = '#fff'; ctx.fillRect(17, 2 + bob, 2, 3)
  ctx.fillStyle = '#000'; ctx.fillRect(18, 3 + bob, 1, 1)
  ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(19, 5 + bob); ctx.lineTo(24, 6 + bob); ctx.lineTo(19, 8 + bob); ctx.fill()
  ctx.restore()
}

function drawCloudImp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const float = Math.sin(frame * 0.15) * 2
  const spark = attacking ? Math.sin(frame * 0.5) * 3 : Math.sin(frame * 0.1) * 1
  // 云朵身体
  ctx.fillStyle = '#e0f2fe'
  ctx.beginPath()
  ctx.moveTo(3, 20 + float)
  ctx.quadraticCurveTo(0, 14 + float, 6, 12 + float)
  ctx.quadraticCurveTo(8, 5 + float, 14, 8 + float)
  ctx.quadraticCurveTo(20, 4 + float, 23, 10 + float)
  ctx.quadraticCurveTo(29, 10 + float, 27, 17 + float)
  ctx.quadraticCurveTo(28, 24 + float, 20, 23 + float)
  ctx.quadraticCurveTo(10, 26 + float, 6, 22 + float)
  ctx.closePath(); ctx.fill()
  // 高光
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.ellipse(12, 12 + float, 5, 3, 0, 0, Math.PI * 2); ctx.fill()
  // 闪电标志
  ctx.fillStyle = '#facc15'
  ctx.beginPath(); ctx.moveTo(19, 6 + float + spark); ctx.lineTo(14, 13 + float + spark); ctx.lineTo(18, 13 + float + spark); ctx.lineTo(16, 20 + float + spark); ctx.lineTo(23, 11 + float + spark); ctx.lineTo(19, 11 + float + spark); ctx.closePath(); ctx.fill()
  // 眼睛（深蓝）
  ctx.fillStyle = '#1e3a8a'
  ctx.fillRect(9, 16 + float, 4, 4); ctx.fillRect(17, 16 + float, 4, 4)
  ctx.fillStyle = '#dbeafe'; ctx.fillRect(10, 16 + float, 2, 2); ctx.fillRect(18, 16 + float, 2, 2)
  ctx.restore()
}

function drawSkyRaptor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const glide = Math.sin(frame * 0.35) * 4
  const bob = Math.sin(frame * 0.2) * 1.5
  // 展开的翅膀（滑翔）
  ctx.fillStyle = '#60a5fa'
  ctx.beginPath()
  ctx.moveTo(10, 12 + bob); ctx.lineTo(-4 + glide, 2 + bob); ctx.lineTo(-3 + glide, 8 + bob); ctx.lineTo(4, 16 + bob)
  ctx.closePath(); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(18, 12 + bob); ctx.lineTo(32 - glide, 2 + bob); ctx.lineTo(31 - glide, 8 + bob); ctx.lineTo(24, 16 + bob)
  ctx.closePath(); ctx.fill()
  // 翼尖羽
  ctx.fillStyle = '#93c5fd'
  ctx.fillRect(-2 + glide, 3 + bob, 3, 2); ctx.fillRect(27 - glide, 3 + bob, 3, 2)
  // 身体
  ctx.fillStyle = '#3b82f6'
  ctx.beginPath(); ctx.ellipse(14, 14 + bob, 6, 8, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#dbeafe'; ctx.beginPath(); ctx.ellipse(14, 16 + bob, 3, 4, 0, 0, Math.PI * 2); ctx.fill()
  // 头
  ctx.fillStyle = '#3b82f6'
  ctx.beginPath(); ctx.arc(14, 4 + bob, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#dbeafe'; ctx.fillRect(10, 1 + bob, 9, 2)
  // 眼睛与喙
  ctx.fillStyle = '#fff'; ctx.fillRect(16, 2 + bob, 2, 2)
  ctx.fillStyle = '#000'; ctx.fillRect(17, 2 + bob, 1, 1)
  ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(18, 5 + bob); ctx.lineTo(23, 6 + bob); ctx.lineTo(18, 8 + bob); ctx.fill()
  // 爪
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(11, 20 + bob); ctx.lineTo(11, 26 + bob); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(17, 20 + bob); ctx.lineTo(17, 26 + bob); ctx.stroke()
  ctx.restore()
}


// ============ 城堡系敌人（第8关）============
function drawCastleGuard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const bob = attacking ? 1 : Math.sin(frame * 0.1) * 1
  // 腿（铁靴）
  ctx.fillStyle = '#4b5563'
  ctx.fillRect(8, h - 12, 6, 10); ctx.fillRect(18, h - 12, 6, 10)
  ctx.fillStyle = '#374151'; ctx.fillRect(6, h - 4, 10, 4); ctx.fillRect(16, h - 4, 10, 4)
  // 铠甲身体
  ctx.fillStyle = '#6b7280'
  ctx.fillRect(5, h - 32 + bob, 22, 22)
  ctx.fillStyle = '#9ca3af'; ctx.fillRect(5, h - 32 + bob, 22, 3)
  // 甲片纹
  ctx.fillStyle = '#4b5563'
  for (let i = 0; i < 3; i++) ctx.fillRect(8, h - 26 + bob + i * 5, 16, 1)
  // 胸徽（金色狮头）
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath(); ctx.arc(16, h - 22 + bob, 3, 0, Math.PI * 2); ctx.fill()
  // 盾（前举）
  ctx.fillStyle = '#374151'
  ctx.fillRect(26, h - 34 + bob, 5, 24)
  ctx.fillStyle = '#1f2937'; ctx.fillRect(27, h - 32 + bob, 3, 20)
  ctx.fillStyle = '#f59e0b'; ctx.fillRect(28, h - 28 + bob, 1, 8)
  // 头盔（带面甲）
  ctx.fillStyle = '#9ca3af'
  ctx.fillRect(8, h - 44 + bob, 16, 12)
  ctx.fillStyle = '#6b7280'; ctx.fillRect(8, h - 44 + bob, 16, 2)
  // 面甲缝隙（金色眼睛）
  ctx.fillStyle = '#1f2937'; ctx.fillRect(10, h - 39 + bob, 12, 2)
  ctx.fillStyle = '#fde047'; ctx.fillRect(11, h - 39 + bob, 2, 2); ctx.fillRect(19, h - 39 + bob, 2, 2)
  // 盔缨
  ctx.fillStyle = '#dc2626'; ctx.fillRect(13, h - 47 + bob, 6, 3)
  ctx.restore()
}

function drawCursedKnight(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number, attacking: boolean) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const bob = attacking ? 1 : Math.sin(frame * 0.1) * 1
  const glow = Math.sin(frame * 0.15) * 0.5 + 0.5
  // 腿（暗黑铁靴）
  ctx.fillStyle = '#2d1b3d'
  ctx.fillRect(8, h - 12, 6, 10); ctx.fillRect(18, h - 12, 6, 10)
  ctx.fillStyle = '#1b0f28'; ctx.fillRect(6, h - 4, 10, 4); ctx.fillRect(16, h - 4, 10, 4)
  // 铠甲身体（暗紫黑）
  ctx.fillStyle = '#3b2a52'
  ctx.fillRect(5, h - 32 + bob, 22, 22)
  ctx.fillStyle = '#503a6e'; ctx.fillRect(5, h - 32 + bob, 22, 3)
  // 诅咒符文（紫光脉动）
  ctx.fillStyle = `rgba(170,90,255,${0.5 + glow * 0.5})`
  ctx.fillRect(9, h - 27 + bob, 4, 2); ctx.fillRect(15, h - 25 + bob, 4, 2); ctx.fillRect(19, h - 29 + bob, 3, 2)
  // 披风（飘动）
  ctx.fillStyle = '#1a0f28'
  ctx.beginPath()
  ctx.moveTo(4, h - 30 + bob); ctx.lineTo(0, h - 6 + bob); ctx.lineTo(8, h - 20 + bob)
  ctx.closePath(); ctx.fill()
  // 暗剑（出招时前指）
  ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(26, h - 20 + bob); ctx.lineTo(26 + (attacking ? 10 : 3), h - 26 + bob); ctx.stroke()
  ctx.fillStyle = `rgba(255,255,255,${0.3 + glow * 0.4})`; ctx.fillRect(26 + (attacking ? 8 : 1), h - 28 + bob, 2, 4)
  // 头盔（角盔）
  ctx.fillStyle = '#503a6e'
  ctx.fillRect(8, h - 44 + bob, 16, 12)
  ctx.fillStyle = '#3b2a52'; ctx.fillRect(8, h - 44 + bob, 16, 2)
  ctx.fillStyle = '#2d1b3d'
  ctx.beginPath(); ctx.moveTo(9, h - 44 + bob); ctx.lineTo(7, h - 52 + bob); ctx.lineTo(12, h - 44 + bob); ctx.fill()
  ctx.beginPath(); ctx.moveTo(23, h - 44 + bob); ctx.lineTo(25, h - 52 + bob); ctx.lineTo(20, h - 44 + bob); ctx.fill()
  // 血红之眼
  ctx.fillStyle = '#ff2040'; ctx.fillRect(11, h - 39 + bob, 3, 3); ctx.fillRect(18, h - 39 + bob, 3, 3)
  ctx.fillStyle = '#fff'; ctx.fillRect(12, h - 39 + bob, 1, 1); ctx.fillRect(19, h - 39 + bob, 1, 1)
  ctx.restore()
}

function drawGargoyle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: Direction, frame: number) {
  ctx.save()
  const flip = dir === 'left' ? -1 : 1
  ctx.translate(x + (dir === 'left' ? w : 0), y); ctx.scale(flip, 1)
  const bob = Math.sin(frame * 0.12) * 1
  const eyeGlow = Math.sin(frame * 0.2) * 0.5 + 0.5
  // 石翼（折叠）
  ctx.fillStyle = '#6b7280'
  ctx.beginPath(); ctx.moveTo(4, 10 + bob); ctx.lineTo(-3, 2 + bob); ctx.lineTo(-2, 14 + bob); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(28, 10 + bob); ctx.lineTo(35, 2 + bob); ctx.lineTo(34, 14 + bob); ctx.closePath(); ctx.fill()
  // 石爪腿
  ctx.fillStyle = '#4b5563'
  ctx.fillRect(6, h - 14, 6, 12); ctx.fillRect(20, h - 14, 6, 12)
  ctx.fillStyle = '#374151'; ctx.fillRect(4, h - 4, 10, 4); ctx.fillRect(18, h - 4, 10, 4)
  // 石躯
  ctx.fillStyle = '#9ca3af'
  ctx.fillRect(4, h - 30 + bob, 24, 18)
  ctx.fillStyle = '#b0b8c0'; ctx.fillRect(4, h - 30 + bob, 24, 3)
  // 石纹
  ctx.fillStyle = '#6b7280'
  ctx.fillRect(10, h - 22 + bob, 3, 6); ctx.fillRect(19, h - 24 + bob, 3, 8)
  // 头（石像鬼）
  ctx.fillStyle = '#a3adb8'
  ctx.fillRect(8, h - 40 + bob, 16, 11)
  ctx.fillStyle = '#8b95a0'; ctx.fillRect(8, h - 40 + bob, 16, 2)
  // 角
  ctx.fillStyle = '#6b7280'
  ctx.beginPath(); ctx.moveTo(9, h - 40 + bob); ctx.lineTo(7, h - 46 + bob); ctx.lineTo(12, h - 40 + bob); ctx.fill()
  ctx.beginPath(); ctx.moveTo(23, h - 40 + bob); ctx.lineTo(25, h - 46 + bob); ctx.lineTo(20, h - 40 + bob); ctx.fill()
  // 发光红眼
  ctx.fillStyle = `rgba(255,60,60,${0.6 + eyeGlow * 0.4})`
  ctx.fillRect(11, h - 36 + bob, 4, 3); ctx.fillRect(17, h - 36 + bob, 4, 3)
  // 獠牙
  ctx.fillStyle = '#e5e7eb'
  ctx.fillRect(11, h - 30 + bob, 2, 3); ctx.fillRect(19, h - 30 + bob, 2, 3)
  ctx.restore()
}


// Boss 精灵绘制
export function drawBossSprite(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  bossName: string, phase: number,
  animFrame: number, attacking: boolean
) {
  // === 精灵图帧动画 ===
  let sheetKey = 'dragon_warrior'
  if (bossName.includes('草原') || bossName.includes('龙人')) sheetKey = 'dragon_warrior'
  else if (bossName.includes('暗影') || bossName.includes('狼王')) sheetKey = 'shadow_lord'
  else if (bossName.includes('魔王') || bossName.includes('熔岩')) sheetKey = 'demon_lord'
  else if (bossName.includes('霜') || bossName.includes('冰') || bossName.includes('凛')) sheetKey = 'frost_giant'
  else if (bossName.includes('深渊') || bossName.includes('灭世')) sheetKey = 'abyss_lord'
  // 沙漠/天空/城堡 Boss：无专属精灵图，使用专属 key 命中程序化绘制分支，
  // 避免统一回落到 dragon_warrior 导致三关 Boss 长相完全相同
  else if (bossName.includes('法老') || bossName.includes('沙皇')) sheetKey = 'sand_pharaoh'
  else if (bossName.includes('苍穹') || bossName.includes('云海')) sheetKey = 'sky_lord'
  else if (bossName.includes('皇帝') || bossName.includes('国王')) sheetKey = 'castle_king'

  const sheet = getSpriteSheet(sheetKey)
  if (sheet) {
    ctx.save()
    // 精灵表支持攻击帧段（前一半待机 / 后一半出招动作）时，出招切换到攻击帧
    const hasAttackFrames = sheet.frameCount >= 8
    const segBase = hasAttackFrames && attacking ? Math.floor(sheet.frameCount / 2) : 0
    const segLen = hasAttackFrames ? Math.floor(sheet.frameCount / 2) : sheet.frameCount
    const animSpeed = hasAttackFrames && attacking ? 0.3 : 0.2
    const frameIdx = segBase + Math.floor(animFrame * animSpeed) % segLen
    const sx = frameIdx * sheet.frameWidth
    // 按 sheet 的宽高比缩放到 boss 大小
    const scale = Math.min(w / sheet.frameWidth, h / sheet.frameHeight)
    const dw = sheet.frameWidth * scale
    const dh = sheet.frameHeight * scale
    const padX = (w - dw) / 2
    const padY = (h - dh) / 2
    ctx.drawImage(
      sheet.canvas,
      sx, 0, sheet.frameWidth, sheet.frameHeight,
      x + padX, y + padY, dw, dh
    )

    // 阶段 2+ 添加愤怒光环
    if (phase >= 2) {
      ctx.globalAlpha = 0.3 + Math.sin(animFrame * 0.1) * 0.2
      ctx.fillStyle = bossName.includes('熔岩') || bossName.includes('魔王') ? '#ff4400'
        : bossName.includes('暗影') || bossName.includes('狼王') ? '#6600cc'
        : bossName.includes('霜') || bossName.includes('冰') || bossName.includes('凛') ? '#66ccff'
        : bossName.includes('深渊') || bossName.includes('灭世') ? '#ff4080'
        : bossName.includes('法老') || bossName.includes('沙皇') ? '#f59e0b'
        : bossName.includes('苍穹') || bossName.includes('云海') ? '#38bdf8'
        : bossName.includes('皇帝') ? '#b91c1c'
        : '#44cc44'
      ctx.fillRect(x - 5, y - 5, w + 10, h + 10)
      ctx.globalAlpha = 1
    }
    ctx.restore()
    drawBossAura(ctx, x, y, w, h, phase, animFrame, attacking)
    return
  }

  // 单图精灵图回退
  const spriteKey = sheetKey
  const sprite = imageCache.get(spriteKey)
  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    ctx.save()
    const bounce = Math.abs(Math.sin(animFrame * 0.08)) * 4
    const size = Math.min(w, h) - 20
    const padX = (w - size) / 2
    const padY = (h - size) / 2 - 10
    ctx.drawImage(sprite, x + padX, y + padY + bounce, size, size)

    if (phase >= 2) {
      ctx.globalAlpha = 0.3 + Math.sin(animFrame * 0.1) * 0.2
      ctx.fillStyle = bossName.includes('熔岩') || bossName.includes('魔王') ? '#ff4400'
        : bossName.includes('暗影') || bossName.includes('狼王') ? '#6600cc'
        : bossName.includes('霜') || bossName.includes('冰') || bossName.includes('凛') ? '#66ccff'
        : bossName.includes('深渊') || bossName.includes('灭世') ? '#ff4080'
        : bossName.includes('法老') || bossName.includes('沙皇') ? '#f59e0b'
        : bossName.includes('苍穹') || bossName.includes('云海') ? '#38bdf8'
        : bossName.includes('皇帝') ? '#b91c1c'
        : '#44cc44'
      ctx.fillRect(x - 5, y - 5, w + 10, h + 10)
      ctx.globalAlpha = 1
    }
    ctx.restore()
    drawBossAura(ctx, x, y, w, h, phase, animFrame, attacking)
    return
  }

  // 程序化绘制回退
  if (bossName.includes('草原') || bossName.includes('龙人')) drawDragonKnight(ctx, x, y, w, h, phase, animFrame, attacking)
  else if (bossName.includes('暗影') || bossName.includes('狼王')) drawShadowLord(ctx, x, y, w, h, phase, animFrame, attacking)
  else if (bossName.includes('魔王') || bossName.includes('熔岩')) drawDemonKing(ctx, x, y, w, h, phase, animFrame, attacking)
  else if (bossName.includes('霜') || bossName.includes('冰') || bossName.includes('凛')) drawFrostGiant(ctx, x, y, w, h, phase, animFrame, attacking)
  else if (bossName.includes('法老') || bossName.includes('沙皇')) drawSandPharaoh(ctx, x, y, w, h, phase, animFrame, attacking)
  else if (bossName.includes('苍穹') || bossName.includes('云海')) drawSkyLord(ctx, x, y, w, h, phase, animFrame, attacking)
  else if (bossName.includes('深渊') || bossName.includes('灭世')) drawAbyssLord(ctx, x, y, w, h, phase, animFrame, attacking)
  else if (bossName.includes('皇帝') || bossName.includes('国王')) drawCastleKing(ctx, x, y, w, h, phase, animFrame, attacking)
  else drawDragonKnight(ctx, x, y, w, h, phase, animFrame, attacking)
  drawBossAura(ctx, x, y, w, h, phase, animFrame, attacking)
}

/**
 * Boss 阶段动画特效（在精灵图/单图/程序化绘制之上叠加）：
 * - 出招时前方亮起凝聚光效（配合精灵表攻击帧）
 * - 阶段 2+ 脚下能量光带
 * - 阶段 3 狂暴微闪
 * 仅使用 fillRect/save/restore，兼容测试 mock context。
 */
function drawBossAura(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  phase: number, animFrame: number, attacking: boolean
) {
  // 攻击凝聚光效：出招瞬间身体前方亮起
  if (attacking) {
    const pulse = 0.2 + Math.sin(animFrame * 0.4) * 0.12
    ctx.save()
    ctx.globalAlpha = Math.max(0.12, pulse)
    ctx.fillStyle = '#ffd24d'
    ctx.fillRect(x + w * 0.28, y + h * 0.34, w * 0.3, h * 0.3)
    ctx.restore()
  }
  // 阶段 2+ 脚下能量光带
  if (phase >= 2) {
    const glow = 0.18 + Math.sin(animFrame * 0.12) * 0.1
    ctx.save()
    ctx.globalAlpha = Math.max(0.08, glow)
    ctx.fillStyle = '#ff8800'
    ctx.fillRect(x - 8, y + h - 3, w + 16, 6)
    ctx.restore()
  }
  // 阶段 3 狂暴微闪
  if (phase >= 3 && animFrame % 8 < 2) {
    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12)
    ctx.restore()
  }
}

function drawDragonKnight(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, frame: number, attacking: boolean) {
  const cx = x + w / 2, cy = y + h / 2

  // 尾巴
  ctx.strokeStyle = phase >= 2 ? '#ff4444' : '#2d8a2d'
  ctx.lineWidth = 6
  const tailWag = Math.sin(frame * 0.1) * 10
  ctx.beginPath()
  ctx.moveTo(x + 10, y + h - 10)
  ctx.quadraticCurveTo(x - 20 - tailWag, y + h / 2, x - 30, y + h / 4)
  ctx.stroke()
  // 尾巴尖
  ctx.fillStyle = '#ff8800'
  ctx.beginPath()
  ctx.moveTo(x - 30, y + h / 4)
  ctx.lineTo(x - 38, y + h / 4 - 10)
  ctx.lineTo(x - 28, y + h / 4 - 12)
  ctx.closePath()
  ctx.fill()

  // 腿（龙腿）
  ctx.fillStyle = '#2d8a2d'
  ctx.fillRect(x + 15, y + h - 30, 16, 28)
  ctx.fillRect(x + w - 30, y + h - 30, 16, 28)
  // 爪子
  ctx.fillStyle = '#444'
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + 15 + i * 6, y + h - 4, 3, 6)
    ctx.fillRect(x + w - 30 + i * 6, y + h - 4, 3, 6)
  }

  // 身体（龙鳞）
  const bodyGrad = ctx.createLinearGradient(x, 0, x + w, 0)
  bodyGrad.addColorStop(0, '#1a6a1a')
  bodyGrad.addColorStop(0.5, '#2d8a2d')
  bodyGrad.addColorStop(1, '#1a6a1a')
  ctx.fillStyle = bodyGrad
  ctx.fillRect(x + 8, y + h - 45, w - 16, 25)

  // 鳞片纹理
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 5; c++) {
      ctx.fillRect(x + 12 + c * 8, y + h - 42 + r * 8, 5, 5)
    }
  }

  // 头部（龙）
  ctx.fillStyle = phase >= 2 ? '#ff4422' : '#2d8a2d'
  ctx.beginPath()
  ctx.moveTo(cx - 16, y + h - 45)
  ctx.lineTo(cx + 16, y + h - 45)
  ctx.lineTo(cx + 14, y + h - 58)
  ctx.lineTo(cx, y + h - 64)
  ctx.lineTo(cx - 14, y + h - 58)
  ctx.closePath()
  ctx.fill()

  // 角
  ctx.fillStyle = phase >= 2 ? '#ff8800' : '#ddd'
  ctx.beginPath()
  ctx.moveTo(cx - 8, y + h - 58)
  ctx.lineTo(cx - 14, y + h - 72)
  ctx.lineTo(cx - 2, y + h - 56)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + 8, y + h - 58)
  ctx.lineTo(cx + 14, y + h - 72)
  ctx.lineTo(cx + 2, y + h - 56)
  ctx.fill()

  // 眼睛
  ctx.fillStyle = '#ff0'
  ctx.fillRect(cx - 8, y + h - 56, 4, 4)
  ctx.fillRect(cx + 4, y + h - 56, 4, 4)
  ctx.fillStyle = '#000'
  ctx.fillRect(cx - 6, y + h - 55, 2, 2)
  ctx.fillRect(cx + 6, y + h - 55, 2, 2)

  // 鼻子（火焰）
  if (phase >= 2 || attacking) {
    ctx.fillStyle = '#ff4400'
    ctx.beginPath()
    ctx.arc(cx + 16, y + h - 48, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffaa00'
    ctx.beginPath()
    ctx.arc(cx + 18, y + h - 46, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  // 翅膀（Boss标志）
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  const wingFlap = Math.sin(frame * 0.08) * 5
  ctx.beginPath()
  ctx.moveTo(x + 15, y + h - 40)
  ctx.quadraticCurveTo(x - 15, y - 10 - wingFlap, x + 5, y - 20)
  ctx.quadraticCurveTo(x + 15, y, x + 15, y + h - 40)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + w - 15, y + h - 40)
  ctx.quadraticCurveTo(x + w + 15, y - 10 - wingFlap, x + w - 5, y - 20)
  ctx.quadraticCurveTo(x + w - 15, y, x + w - 15, y + h - 40)
  ctx.fill()

  // 大剑
  ctx.save()
  ctx.translate(cx + 10, y + h - 55)
  if (attacking) ctx.rotate(0.7)
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(-3, 0, 6, 10)
  const bigBladeGrad = ctx.createLinearGradient(0, -10, 0, -40)
  bigBladeGrad.addColorStop(0, '#ddd')
  bigBladeGrad.addColorStop(1, '#ff4444')
  ctx.fillStyle = bigBladeGrad
  ctx.fillRect(-4, -35, 8, 35)
  ctx.beginPath()
  ctx.moveTo(-5, -35)
  ctx.lineTo(5, -35)
  ctx.lineTo(0, -40)
  ctx.fill()
  ctx.restore()
}

function drawShadowLord(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, frame: number, attacking: boolean) {
  const cx = x + w / 2, cy = y + h / 2

  // 阴影光环
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 5, w / 2 + 10, h / 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // 暗影粒子
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4 + frame * 0.02
    const dist = 35 + Math.sin(frame * 0.05 + i) * 5
    const sx = cx + Math.cos(angle) * dist
    const sy = cy - 10 + Math.sin(angle) * dist
    ctx.fillStyle = `rgba(128,0,255,${0.3 + Math.sin(frame * 0.1 + i) * 0.2})`
    ctx.fillRect(sx - 2, sy - 2, 4, 4)
  }

  // 身体（暗影形态）
  const shadowGrad = ctx.createLinearGradient(x, 0, x + w, 0)
  shadowGrad.addColorStop(0, '#1a0033')
  shadowGrad.addColorStop(0.5, '#330066')
  shadowGrad.addColorStop(1, '#1a0033')
  ctx.fillStyle = shadowGrad
  ctx.fillRect(x + 10, y + h - 50, w - 20, 35)

  // 披风
  ctx.fillStyle = '#0a0020'
  ctx.beginPath()
  ctx.moveTo(x + 8, y + h - 40)
  ctx.quadraticCurveTo(x - 10, y + h - 10, x + 5, y + h)
  ctx.lineTo(x + 20, y + h)
  ctx.quadraticCurveTo(x + 10, y + h - 20, x + 8, y + h - 40)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + w - 8, y + h - 40)
  ctx.quadraticCurveTo(x + w + 10, y + h - 10, x + w - 5, y + h)
  ctx.lineTo(x + w - 20, y + h)
  ctx.quadraticCurveTo(x + w - 10, y + h - 20, x + w - 8, y + h - 40)
  ctx.fill()

  // 头（骷髅面具）
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(cx, y + h - 60, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#000'
  ctx.fillRect(cx - 10, y + h - 65, 5, 6)
  ctx.fillRect(cx + 6, y + h - 65, 5, 6)
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx - 7, y + h - 55)
  ctx.lineTo(cx + 8, y + h - 55)
  ctx.stroke()

  // 王冠
  ctx.fillStyle = '#ffd700'
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(cx - 8 + i * 8, y + h - 79, 5, 8)
  }
  ctx.fillRect(cx - 10, y + h - 74, 21, 3)

  // 暗影武器
  ctx.save()
  ctx.translate(cx + 10, y + h - 45)
  if (attacking) ctx.rotate(0.6)
  ctx.fillStyle = '#6600cc'
  ctx.fillRect(-3, 0, 6, 40)
  ctx.fillStyle = '#9900ff'
  ctx.beginPath()
  ctx.arc(0, -5, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawDemonKing(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, frame: number, attacking: boolean) {
  const cx = x + w / 2, cy = y + h / 2

  // 火焰光环
  ctx.fillStyle = 'rgba(255,100,0,0.15)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 5, w / 2 + 15, h / 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // 岩浆裂纹地面效果
  ctx.strokeStyle = `rgba(255,50,0,${0.3 + Math.sin(frame * 0.1) * 0.2})`
  ctx.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 10 + i * 20, y + h)
    ctx.lineTo(x + 15 + i * 20 + Math.sin(frame * 0.05 + i) * 10, y + h - 10)
    ctx.stroke()
  }

  // 腿（恶魔之蹄）
  ctx.fillStyle = '#8B0000'
  ctx.fillRect(x + 12, y + h - 28, 14, 26)
  ctx.fillRect(x + w - 26, y + h - 28, 14, 26)
  ctx.fillStyle = '#000'
  ctx.fillRect(x + 10, y + h - 4, 18, 6)
  ctx.fillRect(x + w - 28, y + h - 4, 18, 6)

  // 身体（熔岩盔甲）
  const lavaGrad = ctx.createLinearGradient(x, 0, x + w, 0)
  lavaGrad.addColorStop(0, '#8B0000')
  lavaGrad.addColorStop(0.3, '#cc3300')
  lavaGrad.addColorStop(0.5, '#ff4400')
  lavaGrad.addColorStop(0.7, '#cc3300')
  lavaGrad.addColorStop(1, '#8B0000')
  ctx.fillStyle = lavaGrad
  ctx.fillRect(x + 6, y + h - 52, w - 12, 30)

  // 熔岩纹理
  ctx.fillStyle = 'rgba(255,200,0,0.4)'
  for (let i = 0; i < 3; i++) {
    const lx = x + 12 + i * 14 + Math.sin(frame * 0.08 + i) * 3
    ctx.fillRect(lx, y + h - 40, 10, 6)
  }

  // 角
  ctx.fillStyle = '#222'
  ctx.beginPath()
  ctx.moveTo(cx - 16, y + h - 52)
  ctx.lineTo(cx - 24, y + h - 82)
  ctx.lineTo(cx - 8, y + h - 50)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + 16, y + h - 52)
  ctx.lineTo(cx + 24, y + h - 82)
  ctx.lineTo(cx + 8, y + h - 50)
  ctx.fill()

  // 头
  ctx.fillStyle = '#ff4400'
  ctx.beginPath()
  ctx.moveTo(cx - 18, y + h - 50)
  ctx.lineTo(cx + 18, y + h - 50)
  ctx.lineTo(cx + 14, y + h - 62)
  ctx.lineTo(cx, y + h - 70)
  ctx.lineTo(cx - 14, y + h - 62)
  ctx.closePath()
  ctx.fill()

  // 眼睛（火焰）
  ctx.fillStyle = '#ff0'
  ctx.fillRect(cx - 8, y + h - 60, 4, 5)
  ctx.fillRect(cx + 5, y + h - 60, 4, 5)
  ctx.fillStyle = '#f00'
  ctx.fillRect(cx - 7, y + h - 59, 2, 3)
  ctx.fillRect(cx + 6, y + h - 59, 2, 3)

  // 嘴（火焰吐息）
  ctx.fillStyle = '#ff4400'
  ctx.fillRect(cx - 4, y + h - 52, 9, 4)
  if (attacking) {
    ctx.fillStyle = '#ffaa00'
    ctx.beginPath()
    ctx.moveTo(cx + 10, y + h - 50)
    ctx.lineTo(cx + 25, y + h - 45)
    ctx.lineTo(cx + 10, y + h - 46)
    ctx.fill()
  }

  // 巨大武器
  ctx.save()
  ctx.translate(cx + 18, y + h - 48)
  if (attacking) ctx.rotate(0.9)
  ctx.fillStyle = '#8B0000'
  ctx.fillRect(-4, 0, 8, 14)
  const hellBladeGrad = ctx.createLinearGradient(0, -14, 0, -50)
  hellBladeGrad.addColorStop(0, '#ff4400')
  hellBladeGrad.addColorStop(1, '#ffff00')
  ctx.fillStyle = hellBladeGrad
  ctx.fillRect(-5, -48, 10, 48)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(-6, -48)
  ctx.lineTo(6, -48)
  ctx.lineTo(0, -55)
  ctx.fill()
  // 武器粒子
  if (phase >= 2) {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#ff4400'
      ctx.fillRect(-5 + i * 5, -30 - i * 2, 3, 3)
    }
  }
  ctx.restore()
}

// ============ 第4关 Boss：冰霜巨人 ============
function drawFrostGiant(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, frame: number, attacking: boolean) {
  const cx = x + w / 2, cy = y + h / 2
  const fury = phase >= 2
  const base = fury ? '#3a6a8a' : '#2a5a7a'

  // 寒霜光环（地面扩散）
  ctx.fillStyle = 'rgba(140,200,255,0.13)'
  ctx.beginPath(); ctx.ellipse(cx, cy + 8, w / 2 + 18, h / 3, 0, 0, Math.PI * 2); ctx.fill()
  // 地面冰纹
  ctx.strokeStyle = `rgba(180,230,255,${0.3 + Math.sin(frame * 0.1) * 0.15})`
  ctx.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 10 + i * 18, y + h)
    ctx.lineTo(x + 14 + i * 18 + Math.sin(frame * 0.05 + i) * 8, y + h - 12)
    ctx.stroke()
  }
  // 飘雪冰晶（环绕）
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5 + frame * 0.03
    const dist = 40 + Math.sin(frame * 0.05 + i) * 6
    const px = cx + Math.cos(angle) * dist
    const py = cy + Math.sin(angle) * dist - 5
    ctx.fillStyle = `rgba(200,240,255,${0.35 + Math.sin(frame * 0.1 + i) * 0.2})`
    ctx.fillRect(px - 2, py - 2, 4, 4)
  }

  // 腿（冰柱巨腿）
  ctx.fillStyle = base
  ctx.fillRect(x + 14, y + h - 32, 18, 30)
  ctx.fillRect(x + w - 32, y + h - 32, 18, 30)
  ctx.fillStyle = '#8ac8e8'; ctx.fillRect(x + 12, y + h - 6, 22, 6); ctx.fillRect(x + w - 34, y + h - 6, 22, 6)

  // 身体（冰晶战甲）
  const iceGrad = ctx.createLinearGradient(x, 0, x + w, 0)
  iceGrad.addColorStop(0, base)
  iceGrad.addColorStop(0.5, fury ? '#6ab8e0' : '#4a90c0')
  iceGrad.addColorStop(1, base)
  ctx.fillStyle = iceGrad
  ctx.fillRect(x + 8, y + h - 58, w - 16, 32)
  // 胸甲冰棱
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(cx - 20 + i * 16, y + h - 56)
    ctx.lineTo(cx - 16 + i * 16, y + h - 62)
    ctx.lineTo(cx - 12 + i * 16, y + h - 56)
    ctx.fill()
  }
  // 狂暴时的裂纹红光
  if (fury) {
    ctx.strokeStyle = `rgba(255,60,60,${0.4 + Math.sin(frame * 0.15) * 0.3})`
    ctx.lineWidth = 2
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(x + 20 + i * 18, y + h - 50)
      ctx.lineTo(x + 24 + i * 18 + Math.sin(frame * 0.1 + i) * 4, y + h - 38)
      ctx.stroke()
    }
  }

  // 角（巨型冰晶王冠）
  ctx.fillStyle = fury ? '#ff6666' : '#c8f0ff'
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.35
    ctx.beginPath()
    ctx.moveTo(cx - 24 + i * 12, y + h - 56)
    ctx.lineTo(cx - 24 + i * 12 + Math.sin(a) * 22, y + h - 88)
    ctx.lineTo(cx - 16 + i * 12, y + h - 54)
    ctx.fill()
  }

  // 头（冰霜巨颅）
  ctx.fillStyle = fury ? '#e06060' : '#7ab8e0'
  ctx.beginPath()
  ctx.moveTo(cx - 22, y + h - 56)
  ctx.lineTo(cx + 22, y + h - 56)
  ctx.lineTo(cx + 18, y + h - 70)
  ctx.lineTo(cx, y + h - 78)
  ctx.lineTo(cx - 18, y + h - 70)
  ctx.closePath()
  ctx.fill()

  // 眼睛（凛冽寒光）
  ctx.fillStyle = fury ? '#ff4400' : '#fff'
  ctx.fillRect(cx - 12, y + h - 68, 6, 5)
  ctx.fillRect(cx + 6, y + h - 68, 6, 5)
  ctx.fillStyle = fury ? '#ffcc00' : '#88e0ff'
  ctx.fillRect(cx - 11, y + h - 67, 3, 3)
  ctx.fillRect(cx + 7, y + h - 67, 3, 3)

  // 冰冻吐息（攻击时）
  if (attacking) {
    ctx.fillStyle = '#d8f4ff'
    ctx.beginPath(); ctx.arc(cx + 26, y + h - 60, 8, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.arc(cx + 30, y + h - 58, 4, 0, Math.PI * 2); ctx.fill()
  }

  // 巨拳 / 冰锤
  ctx.save()
  ctx.translate(cx + 14, y + h - 58)
  if (attacking) ctx.rotate(0.9)
  ctx.fillStyle = '#5a9ac0'
  ctx.fillRect(-5, 0, 10, 16)
  ctx.fillStyle = '#c8f0ff'
  ctx.fillRect(-8, -40, 16, 40)
  ctx.beginPath()
  ctx.moveTo(-9, -40); ctx.lineTo(9, -40); ctx.lineTo(0, -48)
  ctx.fill()
  ctx.restore()
}

// ============ 第5关 Boss：深渊主宰（最终 BOSS）============
function drawAbyssLord(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, frame: number, attacking: boolean) {
  const cx = x + w / 2, cy = y + h / 2
  const fury = phase >= 2

  // 黑洞吞噬光环（巨大）
  ctx.fillStyle = 'rgba(20,5,40,0.45)'
  ctx.beginPath(); ctx.ellipse(cx, cy + 10, w / 2 + 25, h / 3 + 5, 0, 0, Math.PI * 2); ctx.fill()
  // 暗紫怨火（环绕）
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6 + frame * 0.04
    const dist = 45 + Math.sin(frame * 0.05 + i) * 8
    const px = cx + Math.cos(angle) * dist
    const py = cy + Math.sin(angle) * dist - 8
    ctx.fillStyle = fury
      ? `rgba(255,60,80,${0.4 + Math.sin(frame * 0.12 + i) * 0.25})`
      : `rgba(160,60,255,${0.4 + Math.sin(frame * 0.12 + i) * 0.25})`
    ctx.fillRect(px - 2.5, py - 2.5, 5, 5)
  }
  // 地面虚空裂隙
  ctx.strokeStyle = `rgba(200,80,255,${0.35 + Math.sin(frame * 0.08) * 0.2})`
  ctx.lineWidth = 2.5
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 8 + i * 20, y + h)
    ctx.lineTo(x + 12 + i * 20 + Math.sin(frame * 0.06 + i) * 10, y + h - 14)
    ctx.stroke()
  }

  // 腿（深渊之蹄）
  ctx.fillStyle = '#150818'
  ctx.fillRect(x + 16, y + h - 36, 16, 34)
  ctx.fillRect(x + w - 32, y + h - 36, 16, 34)
  ctx.fillStyle = fury ? '#a01020' : '#3a1040'
  ctx.fillRect(x + 12, y + h - 8, 22, 8); ctx.fillRect(x + w - 34, y + h - 8, 22, 8)

  // 恶魔双翼（压迫感核心）
  const wingFlap = Math.sin(frame * 0.06) * 8
  ctx.fillStyle = fury ? 'rgba(120,10,30,0.85)' : 'rgba(25,5,50,0.9)'
  ctx.beginPath()
  ctx.moveTo(x + 20, y + h - 48)
  ctx.quadraticCurveTo(x - 30, y - 20 - wingFlap, x - 55, y + 10)
  ctx.quadraticCurveTo(x - 30, y + 15, x + 22, y + h - 28)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + w - 20, y + h - 48)
  ctx.quadraticCurveTo(x + w + 30, y - 20 - wingFlap, x + w + 55, y + 10)
  ctx.quadraticCurveTo(x + w + 30, y + 15, x + w - 22, y + h - 28)
  ctx.fill()
  // 翼骨尖刺
  ctx.fillStyle = fury ? '#ff3050' : '#6a30b0'
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x - 8 - i * 14 + wingFlap * 0.5, y + 5 + i * 14, 4, 12)
    ctx.fillRect(x + w + 4 + i * 14 - wingFlap * 0.5, y + 5 + i * 14, 4, 12)
  }

  // 身体（深渊魔铠）
  const abyssGrad = ctx.createLinearGradient(x, 0, x + w, 0)
  abyssGrad.addColorStop(0, '#1a0a22')
  abyssGrad.addColorStop(0.3, fury ? '#5a1020' : '#2a1040')
  abyssGrad.addColorStop(0.5, fury ? '#8a2030' : '#4a1a60')
  abyssGrad.addColorStop(0.7, '#2a1040')
  abyssGrad.addColorStop(1, '#1a0a22')
  ctx.fillStyle = abyssGrad
  ctx.fillRect(x + 6, y + h - 66, w - 12, 36)
  // 魔铠纹路
  ctx.fillStyle = 'rgba(180,80,255,0.4)'
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 14 + i * 16, y + h - 58, 6, 3)
  }

  // 胸口深渊之眼（第二只眼，压迫感）
  const eyeGlow = Math.sin(frame * 0.12) * 0.5 + 0.5
  ctx.fillStyle = '#05020a'
  ctx.beginPath(); ctx.arc(cx, y + h - 48, 12, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgba(${fury ? '255,40,60' : '180,80,255'},${0.5 + eyeGlow * 0.5})`
  ctx.beginPath(); ctx.arc(cx, y + h - 48, 12 + eyeGlow * 3, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = fury ? '#ff2040' : '#c060ff'
  ctx.beginPath(); ctx.arc(cx, y + h - 48, 4, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#000'
  ctx.beginPath(); ctx.arc(cx, y + h - 48, 2, 0, Math.PI * 2); ctx.fill()

  // 头（恶魔之颅 + 巨型双角）
  ctx.fillStyle = fury ? '#a02030' : '#2a1040'
  ctx.beginPath()
  ctx.moveTo(cx - 20, y + h - 66)
  ctx.lineTo(cx + 20, y + h - 66)
  ctx.lineTo(cx + 16, y + h - 82)
  ctx.lineTo(cx, y + h - 90)
  ctx.lineTo(cx - 16, y + h - 82)
  ctx.closePath()
  ctx.fill()
  // 巨角
  ctx.fillStyle = fury ? '#ff3050' : '#a060e0'
  ctx.beginPath(); ctx.moveTo(cx - 14, y + h - 82); ctx.lineTo(cx - 30, y + h - 112); ctx.lineTo(cx - 2, y + h - 80); ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx + 14, y + h - 82); ctx.lineTo(cx + 30, y + h - 112); ctx.lineTo(cx + 2, y + h - 80); ctx.fill()
  // 眼睛（血红）
  ctx.fillStyle = fury ? '#ffdd00' : '#ff2040'
  ctx.fillRect(cx - 11, y + h - 80, 7, 6)
  ctx.fillRect(cx + 4, y + h - 80, 7, 6)
  ctx.fillStyle = fury ? '#fff' : '#ff88a0'
  ctx.fillRect(cx - 10, y + h - 79, 4, 3)
  ctx.fillRect(cx + 5, y + h - 79, 4, 3)

  // 深渊巨剑（最终武器）
  ctx.save()
  ctx.translate(cx + 22, y + h - 60)
  if (attacking) ctx.rotate(1.1)
  ctx.fillStyle = '#2a1040'
  ctx.fillRect(-5, 0, 10, 20)
  const lordBladeGrad = ctx.createLinearGradient(0, -20, 0, -70)
  lordBladeGrad.addColorStop(0, fury ? '#ff3050' : '#a060ff')
  lordBladeGrad.addColorStop(1, fury ? '#ffcc00' : '#e0a0ff')
  ctx.fillStyle = lordBladeGrad
  ctx.fillRect(-7, -68, 14, 68)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(-8, -68); ctx.lineTo(8, -68); ctx.lineTo(0, -80)
  ctx.fill()
  // 剑身暗纹
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(-2, -60, 4, 40)
  // 狂暴剑气
  if (fury) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = `rgba(255,60,80,${0.5 + Math.sin(frame * 0.2 + i) * 0.3})`
      ctx.fillRect(-7 + i * 4, -70 - i * 4, 3, 5)
    }
  }
  ctx.restore()
}

// ============ 第2关 Boss：沙漠法老王 ============
function drawSandPharaoh(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, frame: number, attacking: boolean) {
  const cx = x + w / 2, cy = y + h / 2
  const fury = phase >= 2
  const pulse = Math.sin(frame * 0.1) * 0.5 + 0.5

  // 沙暴光环
  ctx.fillStyle = 'rgba(180,130,20,0.30)'
  ctx.beginPath(); ctx.ellipse(cx, cy + 10, w / 2 + 20, h / 3 + 5, 0, 0, Math.PI * 2); ctx.fill()
  // 旋转沙尘
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5 + frame * 0.05
    const dist = 42 + Math.sin(frame * 0.06 + i) * 10
    ctx.fillStyle = `rgba(${fury ? '255,120,30' : '235,180,60'},${0.35 + Math.sin(frame * 0.12 + i) * 0.25})`
    ctx.fillRect(cx + Math.cos(angle) * dist - 2.5, cy + Math.sin(angle) * dist - 8 - 2.5, 5, 5)
  }

  // 腿（黄金战靴）
  ctx.fillStyle = '#8a5a00'
  ctx.fillRect(x + 18, y + h - 34, 14, 32)
  ctx.fillRect(x + w - 32, y + h - 34, 14, 32)
  ctx.fillStyle = fury ? '#d97706' : '#a87200'
  ctx.fillRect(x + 14, y + h - 6, 22, 6); ctx.fillRect(x + w - 36, y + h - 6, 22, 6)
  // 法老长袍（金色圣衣）
  const robeGrad = ctx.createLinearGradient(x, 0, x + w, 0)
  robeGrad.addColorStop(0, '#8a5a00')
  robeGrad.addColorStop(0.4, fury ? '#d97706' : '#c89200')
  robeGrad.addColorStop(0.6, fury ? '#f59e0b' : '#e0aa10')
  robeGrad.addColorStop(1, '#8a5a00')
  ctx.fillStyle = robeGrad
  ctx.fillRect(x + 8, y + h - 66, w - 16, 38)
  // 圣带纹
  ctx.fillStyle = 'rgba(120,60,0,0.5)'
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 14 + i * 14, y + h - 60, 7, 4)
  // 腰带宝石
  ctx.fillStyle = fury ? '#ff2040' : '#dc2626'
  ctx.fillRect(cx - 4, y + h - 48, 8, 8)
  ctx.fillStyle = '#fff'; ctx.fillRect(cx - 2, y + h - 46, 2, 2)

  // 法老项链（金色圣甲虫）
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = fury ? '#fbbf24' : '#eab308'
    ctx.beginPath(); ctx.arc(cx - 14 + i * 14, y + h - 56, 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#78350f'; ctx.fillRect(cx - 14 + i * 14 - 1, y + h - 58, 2, 2)
  }

  // 头（法老之容 + 鹰神之冠）
  ctx.fillStyle = fury ? '#e88a1a' : '#e0a030'
  ctx.beginPath()
  ctx.moveTo(cx - 18, y + h - 66)
  ctx.lineTo(cx + 18, y + h - 66)
  ctx.lineTo(cx + 15, y + h - 80)
  ctx.lineTo(cx, y + h - 86)
  ctx.lineTo(cx - 15, y + h - 80)
  ctx.closePath()
  ctx.fill()
  // 法老鹰冠（golden uraeus + 头饰）
  ctx.fillStyle = '#fbbf24'
  ctx.fillRect(cx - 20, y + h - 86, 40, 8)
  ctx.fillRect(cx - 2, y + h - 96, 4, 12)
  ctx.fillStyle = fury ? '#ff2040' : '#dc2626'
  ctx.fillRect(cx - 1, y + h - 98, 2, 4)
  // 眼睛（神圣金瞳）
  ctx.fillStyle = fury ? '#ffdd00' : '#fde68a'
  ctx.fillRect(cx - 11, y + h - 78, 7, 5)
  ctx.fillRect(cx + 4, y + h - 78, 7, 5)
  ctx.fillStyle = '#78350f'
  ctx.fillRect(cx - 9, y + h - 77, 3, 3); ctx.fillRect(cx + 6, y + h - 77, 3, 3)
  // 颧骨阴影
  ctx.fillStyle = 'rgba(120,60,0,0.4)'
  ctx.fillRect(cx - 12, y + h - 70, 8, 3); ctx.fillRect(cx + 4, y + h - 70, 8, 3)

  // 黄金权杖（圣光）
  ctx.save()
  ctx.translate(cx + 26, y + h - 58)
  if (attacking) ctx.rotate(0.8)
  ctx.fillStyle = '#b45309'; ctx.fillRect(-3, 0, 6, 20)
  ctx.fillStyle = fury ? '#ffcc00' : '#fde047'
  ctx.fillRect(-5, -34, 10, 34)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(-6, -34); ctx.lineTo(6, -34); ctx.lineTo(0, -46)
  ctx.fill()
  // 圣光脉动
  ctx.fillStyle = `rgba(255,255,255,${0.3 + pulse * 0.4})`
  ctx.beginPath(); ctx.arc(0, -40, 6 + pulse * 4, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}


// ============ 第7关 Boss：苍穹霸主 ============
function drawSkyLord(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, frame: number, attacking: boolean) {
  const cx = x + w / 2, cy = y + h / 2
  const fury = phase >= 2
  const pulse = Math.sin(frame * 0.12) * 0.5 + 0.5

  // 闪电光环
  ctx.fillStyle = 'rgba(140,200,255,0.25)'
  ctx.beginPath(); ctx.ellipse(cx, cy + 10, w / 2 + 20, h / 3 + 5, 0, 0, Math.PI * 2); ctx.fill()
  // 电弧（环绕旋转）
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4 + frame * 0.06
    const dist = 45 + Math.sin(frame * 0.08 + i) * 8
    ctx.strokeStyle = `rgba(${fury ? '120,80,255' : '150,210,255'},${0.5 + Math.sin(frame * 0.15 + i) * 0.3})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist - 10)
    ctx.lineTo(cx + Math.cos(angle) * (dist + 6) + Math.sin(frame * 0.3 + i) * 4, cy + Math.sin(angle) * (dist + 6) - 10)
    ctx.stroke()
  }

  // 腿（云纹战靴）
  ctx.fillStyle = '#1e3a8a'
  ctx.fillRect(x + 16, y + h - 32, 14, 30)
  ctx.fillRect(x + w - 30, y + h - 32, 14, 30)
  ctx.fillStyle = fury ? '#4c1d95' : '#3b82f6'
  ctx.fillRect(x + 12, y + h - 5, 22, 5); ctx.fillRect(x + w - 34, y + h - 5, 22, 5)
  // 身体（苍穹战甲）
  const skyGrad = ctx.createLinearGradient(x, 0, x + w, 0)
  skyGrad.addColorStop(0, '#1d4ed8')
  skyGrad.addColorStop(0.4, fury ? '#7c3aed' : '#3b82f6')
  skyGrad.addColorStop(0.6, fury ? '#a855f7' : '#60a5fa')
  skyGrad.addColorStop(1, '#1d4ed8')
  ctx.fillStyle = skyGrad
  ctx.fillRect(x + 6, y + h - 60, w - 12, 32)
  // 云纹甲片
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.ellipse(x + 16 + i * 18, y + h - 46, 6, 3, 0, 0, Math.PI * 2); ctx.fill()
  }
  // 胸口闪电圣印
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.moveTo(cx + 2, y + h - 52); ctx.lineTo(cx - 3, y + h - 44); ctx.lineTo(cx + 1, y + h - 44); ctx.lineTo(cx - 2, y + h - 37); ctx.lineTo(cx + 5, y + h - 45); ctx.lineTo(cx + 1, y + h - 45)
  ctx.closePath(); ctx.fill()

  // 云之翼（圣光羽翼）
  const wing = Math.sin(frame * 0.07) * 6
  ctx.fillStyle = fury ? 'rgba(150,80,255,0.85)' : 'rgba(240,250,255,0.9)'
  ctx.beginPath()
  ctx.moveTo(x + 18, y + h - 44)
  ctx.quadraticCurveTo(x - 32, y - 14 - wing, x - 58, y + 6)
  ctx.quadraticCurveTo(x - 30, y + 12, x + 20, y + h - 24)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + w - 18, y + h - 44)
  ctx.quadraticCurveTo(x + w + 32, y - 14 - wing, x + w + 58, y + 6)
  ctx.quadraticCurveTo(x + w + 30, y + 12, x + w - 20, y + h - 24)
  ctx.fill()

  // 头（云冠之神）
  ctx.fillStyle = fury ? '#a855f7' : '#93c5fd'
  ctx.beginPath()
  ctx.moveTo(cx - 16, y + h - 60)
  ctx.lineTo(cx + 16, y + h - 60)
  ctx.lineTo(cx + 13, y + h - 74)
  ctx.lineTo(cx, y + h - 80)
  ctx.lineTo(cx - 13, y + h - 74)
  ctx.closePath()
  ctx.fill()
  // 云之圣冠
  ctx.fillStyle = '#fef9c3'
  ctx.fillRect(cx - 18, y + h - 82, 36, 6)
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.arc(cx - 12 + i * 8, y + h - 82, 4, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = '#facc15'
  ctx.fillRect(cx - 2, y + h - 92, 4, 10)
  // 眼睛（雷光之眼）
  ctx.fillStyle = fury ? '#ff2040' : '#dbeafe'
  ctx.fillRect(cx - 10, y + h - 72, 7, 5)
  ctx.fillRect(cx + 3, y + h - 72, 7, 5)
  ctx.fillStyle = '#1e3a8a'
  ctx.fillRect(cx - 8, y + h - 71, 3, 3); ctx.fillRect(cx + 5, y + h - 71, 3, 3)

  // 雷枪
  ctx.save()
  ctx.translate(cx + 24, y + h - 52)
  if (attacking) ctx.rotate(1.0)
  ctx.fillStyle = '#1e3a8a'; ctx.fillRect(-2, 0, 4, 18)
  ctx.fillStyle = fury ? '#fde047' : '#e0f2fe'
  ctx.fillRect(-5, -40, 10, 40)
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(6, -40); ctx.lineTo(0, -54); ctx.fill()
  ctx.fillStyle = `rgba(255,255,255,${0.3 + pulse * 0.4})`
  ctx.beginPath(); ctx.arc(0, -46, 5 + pulse * 3, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}


// ============ 第8关 Boss：黑暗皇帝（最终 BOSS）============
function drawCastleKing(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, frame: number, attacking: boolean) {
  const cx = x + w / 2, cy = y + h / 2
  const fury = phase >= 2
  const pulse = Math.sin(frame * 0.1) * 0.5 + 0.5

  // 黑雾王座光环
  ctx.fillStyle = 'rgba(40,5,10,0.5)'
  ctx.beginPath(); ctx.ellipse(cx, cy + 12, w / 2 + 28, h / 3 + 6, 0, 0, Math.PI * 2); ctx.fill()
  // 暗红皇炎（环绕）
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6 + frame * 0.05
    const dist = 46 + Math.sin(frame * 0.06 + i) * 9
    ctx.fillStyle = `rgba(${fury ? '255,40,60' : '180,30,40'},${0.4 + Math.sin(frame * 0.12 + i) * 0.25})`
    ctx.fillRect(cx + Math.cos(angle) * dist - 3, cy + Math.sin(angle) * dist - 8 - 3, 6, 6)
  }
  // 地面裂隙（炽红）
  ctx.strokeStyle = `rgba(255,80,40,${0.4 + Math.sin(frame * 0.08) * 0.2})`
  ctx.lineWidth = 2.5
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x + 8 + i * 22, y + h)
    ctx.lineTo(x + 13 + i * 22 + Math.sin(frame * 0.06 + i) * 10, y + h - 16)
    ctx.stroke()
  }

  // 腿（王铁战靴）
  ctx.fillStyle = '#1c1018'
  ctx.fillRect(x + 16, y + h - 38, 16, 36)
  ctx.fillRect(x + w - 32, y + h - 38, 16, 36)
  ctx.fillStyle = fury ? '#7f1d1d' : '#38121c'
  ctx.fillRect(x + 12, y + h - 8, 24, 8); ctx.fillRect(x + w - 36, y + h - 8, 24, 8)

  // 暗红皇披风（飘动）
  const cape = Math.sin(frame * 0.05) * 6
  ctx.fillStyle = fury ? 'rgba(153,27,27,0.9)' : 'rgba(70,12,20,0.92)'
  ctx.beginPath()
  ctx.moveTo(x + 16, y + h - 66)
  ctx.quadraticCurveTo(x - 20 - cape, y + h - 30, x - 10 - cape, y + h)
  ctx.quadraticCurveTo(x + 14, y + h - 6, x + 30, y + h - 40)
  ctx.fill()

  // 身体（黑金王甲）
  const kingGrad = ctx.createLinearGradient(x, 0, x + w, 0)
  kingGrad.addColorStop(0, '#1a1018')
  kingGrad.addColorStop(0.35, fury ? '#5a1220' : '#2a1620')
  kingGrad.addColorStop(0.55, fury ? '#8a2030' : '#4a2030')
  kingGrad.addColorStop(1, '#1a1018')
  ctx.fillStyle = kingGrad
  ctx.fillRect(x + 6, y + h - 70, w - 12, 38)
  // 王甲金纹
  ctx.fillStyle = 'rgba(220,170,40,0.6)'
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 14 + i * 18, y + h - 62, 9, 3)
  // 胸口王印（暗红水晶）
  ctx.fillStyle = fury ? '#ff2040' : '#a01030'
  ctx.beginPath(); ctx.arc(cx, y + h - 52, 8, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = `rgba(255,80,80,${0.4 + pulse * 0.4})`
  ctx.beginPath(); ctx.arc(cx, y + h - 52, 8 + pulse * 3, 0, Math.PI * 2); ctx.fill()

  // 头（王者之盔 + 魔皇冠）
  ctx.fillStyle = fury ? '#7a1a2a' : '#2a1620'
  ctx.beginPath()
  ctx.moveTo(cx - 20, y + h - 70)
  ctx.lineTo(cx + 20, y + h - 70)
  ctx.lineTo(cx + 16, y + h - 88)
  ctx.lineTo(cx, y + h - 96)
  ctx.lineTo(cx - 16, y + h - 88)
  ctx.closePath()
  ctx.fill()
  // 皇冠（黑金之冕 + 红宝石）
  ctx.fillStyle = '#d4af37'
  ctx.fillRect(cx - 22, y + h - 98, 44, 8)
  ctx.beginPath(); ctx.moveTo(cx - 22, y + h - 98); ctx.lineTo(cx - 22, y + h - 108); ctx.lineTo(cx - 14, y + h - 98); ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx + 22, y + h - 98); ctx.lineTo(cx + 22, y + h - 108); ctx.lineTo(cx + 14, y + h - 98); ctx.fill()
  ctx.fillStyle = fury ? '#ff2040' : '#dc2626'
  ctx.fillRect(cx - 3, y + h - 104, 6, 8)
  ctx.fillStyle = '#fff'; ctx.fillRect(cx - 1, y + h - 102, 2, 2)
  // 眼睛（血红魔瞳）
  ctx.fillStyle = fury ? '#ffdd00' : '#ff2040'
  ctx.fillRect(cx - 12, y + h - 86, 9, 6)
  ctx.fillRect(cx + 3, y + h - 86, 9, 6)
  ctx.fillStyle = fury ? '#fff' : '#ff88a0'
  ctx.fillRect(cx - 11, y + h - 85, 5, 3)
  ctx.fillRect(cx + 4, y + h - 85, 5, 3)

  // 魔皇大剑（双手巨剑）
  ctx.save()
  ctx.translate(cx + 26, y + h - 62)
  if (attacking) ctx.rotate(1.1)
  ctx.fillStyle = '#3a1a20'; ctx.fillRect(-4, 0, 8, 20)
  const bladeGrad = ctx.createLinearGradient(0, -24, 0, -78)
  bladeGrad.addColorStop(0, fury ? '#ff2040' : '#8a2030')
  bladeGrad.addColorStop(1, fury ? '#ffcc00' : '#d4af37')
  ctx.fillStyle = bladeGrad
  ctx.fillRect(-8, -76, 16, 76)
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.moveTo(-9, -76); ctx.lineTo(9, -76); ctx.lineTo(0, -90); ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(-2, -68, 4, 48)
  // 狂暴剑气
  if (fury) {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(255,60,80,${0.5 + Math.sin(frame * 0.2 + i) * 0.3})`
      ctx.fillRect(-8 + i * 4, -78 - i * 4, 4, 6)
    }
  }
  ctx.restore()
}


// 投射物精灵
export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  type: string, dir: Direction, tier: number = 0
) {
  ctx.save()
  const cx = x + 4, cy = y + 4
  const tierClamped = Math.max(0, Math.min(4, tier))

  // 精灵图渲染
  const spriteKey = PROJECTILE_SPRITE_MAP[type]
  const sprite = spriteKey ? imageCache.get(spriteKey) : undefined
  if (sprite && sprite.complete && sprite.naturalWidth > 0) {
    if (tierClamped >= 1) {
      ctx.shadowColor = TIER_GLOWS[tierClamped]!
      ctx.shadowBlur = 6 + tierClamped * 3
    }
    if (dir === 'left') {
      ctx.translate(x + 8, y)
      ctx.scale(-1, 1)
      ctx.drawImage(sprite, 0, 0, 8, 8)
    } else {
      ctx.drawImage(sprite, x, y, 8, 8)
    }
    ctx.restore()
    return
  }

  // 程序化绘制回退（玩家弹幕随武器阶数：发光更亮、弹体更大、颜色向该阶辉光靠拢）
  const glowColor = TIER_GLOWS[tierClamped]!
  if (tierClamped >= 2) {
    ctx.shadowColor = glowColor
    ctx.shadowBlur = 8 + tierClamped * 3
  }
  const g = tierClamped / 4
  switch (type) {
    case 'bullet':
      ctx.fillStyle = tierClamped >= 3 ? glowColor : '#ffff44'
      ctx.beginPath()
      ctx.arc(cx, cy, 4 + tierClamped * 0.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(cx - 1, cy - 1, 1.5 + tierClamped * 0.3, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'arrow':
      ctx.fillStyle = tierClamped >= 4 ? '#d4a020' : '#8B4513'
      ctx.fillRect(x, y + 2, 8 + tierClamped, 3)
      ctx.fillStyle = tierClamped >= 3 ? '#cfe9ff' : '#ff0000'
      ctx.beginPath()
      ctx.moveTo(dir === 'right' ? x + 8 : x, y + 3)
      ctx.lineTo(dir === 'right' ? x + 12 + tierClamped : x - 4 - tierClamped, y)
      ctx.lineTo(dir === 'right' ? x + 8 : x, y - 2)
      ctx.fill()
      ctx.fillStyle = tierClamped >= 2 ? '#eaf7ff' : '#fff'
      ctx.fillRect(x + 2, y + 1, 2, 5)
      if (tierClamped >= 2) {
        ctx.fillStyle = glowColor
        ctx.fillRect(x - 1, y + 2, 3, 3)
      }
      break
    case 'magic':
      ctx.fillStyle = tierClamped >= 3 ? glowColor : '#ff00ff'
      ctx.beginPath()
      ctx.arc(cx, cy, 5 + tierClamped * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(255,0,255,${0.4 - g * 0.2})`
      ctx.beginPath()
      ctx.arc(cx, cy, 8 + tierClamped, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'fire':
      ctx.fillStyle = '#ff4400'
      ctx.beginPath()
      ctx.arc(cx, cy, 5 + tierClamped * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = tierClamped >= 3 ? glowColor : '#ffaa00'
      ctx.beginPath()
      ctx.arc(cx, cy, 3 + tierClamped * 0.6, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'ice':
      ctx.fillStyle = '#66c8ff'
      ctx.beginPath()
      ctx.arc(cx, cy, 5 + tierClamped * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e0f4ff'
      ctx.beginPath()
      ctx.arc(cx, cy, 2.5 + tierClamped * 0.4, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'dark':
      ctx.fillStyle = '#440088'
      ctx.beginPath()
      ctx.arc(cx, cy, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(128,0,255,0.4)'
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'web':
      // 蛛网：银白网状缠绕弹
      ctx.strokeStyle = '#e8f4f8'
      ctx.lineWidth = 1.2
      for (let r = 0; r < 3; r++) {
        ctx.beginPath()
        ctx.arc(cx, cy, 3 + r * 2.2, 0, Math.PI * 2)
        ctx.stroke()
      }
      for (let r = 0; r < 4; r++) {
        const a = (r / 4) * Math.PI + Math.PI / 8
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2)
        ctx.lineTo(cx + Math.cos(a) * 7.5, cy + Math.sin(a) * 7.5)
        ctx.stroke()
      }
      break
    case 'poison':
      // 毒液弹：绿紫渐变球（沙蝎毒尾 / 毒液吐息）
      ctx.fillStyle = '#5bd64f'
      ctx.beginPath()
      ctx.arc(cx, cy, 5 + tierClamped * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#a8f08a'
      ctx.beginPath()
      ctx.arc(cx - 1, cy - 1, 2.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(139,92,246,0.35)'
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'sand':
      // 沙弹：金砂聚团 + 飞散砂粒（沙漠沙暴）
      ctx.fillStyle = '#d9a13b'
      ctx.beginPath()
      ctx.arc(cx, cy, 5 + tierClamped * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f2c35e'
      ctx.beginPath()
      ctx.arc(cx - 1.5, cy - 1.5, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(242,195,94,0.6)'
      ctx.fillRect(cx - 5, cy + 3, 2, 2)
      ctx.fillRect(cx + 3, cy - 3, 2, 2)
      ctx.fillRect(cx - 1, cy + 5, 2, 2)
      break
    case 'lightning':
      // 落雷：蓝白闪电球 + 锯齿放电
      ctx.fillStyle = '#4da6ff'
      ctx.beginPath()
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e8f4ff'
      ctx.beginPath()
      ctx.arc(cx, cy, 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#9fd4ff'
      ctx.lineWidth = 1
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * 4.5, cy + Math.sin(a) * 4.5)
        ctx.lineTo(cx + Math.cos(a + 0.5) * 7.5, cy + Math.sin(a + 0.5) * 7.5)
        ctx.lineTo(cx + Math.cos(a + 1) * 4.5, cy + Math.sin(a + 1) * 4.5)
        ctx.stroke()
      }
      break
    case 'stone':
      // 石弹：灰石棱弹（石像鬼凝视 / 落石）
      ctx.fillStyle = '#9aa0b0'
      ctx.beginPath()
      ctx.moveTo(cx - 5, cy - 2)
      ctx.lineTo(cx, cy - 5.5)
      ctx.lineTo(cx + 5, cy - 2)
      ctx.lineTo(cx + 4, cy + 3.5)
      ctx.lineTo(cx - 3, cy + 5)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#c8cdd8'
      ctx.beginPath()
      ctx.arc(cx - 1, cy - 1, 2, 0, Math.PI * 2)
      ctx.fill()
      break
    default:
      ctx.fillStyle = '#ff0'
      ctx.beginPath()
      ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fill()
  }

  ctx.restore()
}

// 道具精灵
export function drawItemSprite(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  itemType: string, frame: number, equip?: EquipDrop
) {
  const cx = x + w / 2, cy = y + h / 2
  const bob = Math.sin(frame * 0.05) * 2

  // 精灵图渲染
  const spriteKey = ITEM_SPRITE_MAP[itemType]
  const sprite = spriteKey ? imageCache.get(spriteKey) : undefined
  if (sprite && sprite.complete && sprite.naturalWidth > 0 && itemType !== 'equip') {
    ctx.save()
    ctx.translate(cx, cy + bob)
    const size = Math.min(w, h) - 4
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size)
    ctx.restore()
    return
  }

  // 程序化绘制回退
  ctx.save()
  ctx.translate(cx, cy + bob)

  // 装备掉落物：发光武器 / 护甲图标 + 旋转光环 + 阶数星光（阶数越高越华丽）
  if (itemType === 'equip' && equip) {
    const color = equip.color || '#ffd700'
    const tierC = Math.max(0, Math.min(4, equip.tier))
    ctx.shadowColor = tierC >= 4 ? '#fff3c0' : color
    ctx.shadowBlur = 10 + tierC * 4 + Math.sin(frame * 0.15) * 4
    // 底部光晕（随阶数增大增亮）
    ctx.fillStyle = color
    ctx.globalAlpha = 0.28 + tierC * 0.05
    ctx.beginPath()
    ctx.arc(0, 0, 10 + tierC * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // 旋转光环（T1+ 出现，越高阶越华丽；T4 双环交叉）
    const ringR = 15 + tierC * 2.5 + Math.sin(frame * 0.1) * 1.5
    if (tierC >= 1) {
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.35 + tierC * 0.1
      ctx.lineWidth = 1 + tierC * 0.3
      ctx.beginPath()
      ctx.arc(0, 0, ringR, frame * 0.05, frame * 0.05 + Math.PI * 1.4)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (tierC >= 3) {
      ctx.strokeStyle = tierC >= 4 ? '#fff3c0' : '#ffffff'
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.arc(0, 0, ringR + 3, -frame * 0.06, -frame * 0.06 + Math.PI * 1.2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    if (equip.slot === 'weapon' && equip.weaponType) {
      drawEquipWeaponIcon(ctx, equip.weaponType, color)
    } else {
      drawEquipArmorIcon(ctx, color)
    }
    // 阶数星光（顶部小星，随阶数变大）
    ctx.fillStyle = tierC >= 4 ? '#fff3c0' : '#fff'
    ctx.shadowBlur = 4 + tierC * 2
    const starCount = Math.min(5, tierC + 1)
    for (let i = 0; i < starCount; i++) {
      const sx = (i - (starCount - 1) / 2) * (5 + tierC * 0.6)
      ctx.beginPath()
      ctx.arc(sx, -10 - tierC, 1.6 + tierC * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0
    ctx.restore()
    return
  }

  switch (itemType) {
    case 'health':
      ctx.fillStyle = '#ff3333'
      ctx.beginPath()
      ctx.moveTo(0, -3)
      ctx.bezierCurveTo(-8, -8, -8, 2, 0, 6)
      ctx.bezierCurveTo(8, 2, 8, -8, 0, -3)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(-2, -3, 2, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'mana':
      ctx.fillStyle = '#4488ff'
      ctx.fillRect(-4, -6, 8, 12)
      ctx.fillRect(-3, -10, 2, 4)
      ctx.fillRect(1, -10, 2, 4)
      ctx.fillStyle = '#aaccff'
      ctx.fillRect(-2, -2, 4, 6)
      break
    case 'coin_bronze':
      ctx.fillStyle = '#cd7f32'
      ctx.beginPath()
      ctx.arc(0, 0, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffba5a'
      ctx.beginPath()
      ctx.arc(0, 0, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#cd7f32'
      ctx.font = 'bold 5px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('$', 0, 2)
      break
    case 'coin_silver':
      ctx.fillStyle = '#c0c0c0'
      ctx.beginPath()
      ctx.arc(0, 0, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e8e8e8'
      ctx.beginPath()
      ctx.arc(0, 0, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#999'
      ctx.font = 'bold 5px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('$', 0, 2)
      break
    case 'coin_gold':
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.arc(0, 0, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffee55'
      ctx.beginPath()
      ctx.arc(0, 0, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#aa8800'
      ctx.font = 'bold 5px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('$', 0, 2)
      break
  }

  ctx.restore()
}

// 装备图标：武器小图标（剑/矛/弓/铳）
function drawEquipWeaponIcon(ctx: CanvasRenderingContext2D, type: WeaponType, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.fillStyle = color
  if (type === 'sword') {
    // 竖剑
    ctx.fillRect(-1, -6, 2, 10)
    ctx.beginPath()
    ctx.moveTo(0, -9); ctx.lineTo(3, -5); ctx.lineTo(-3, -5)
    ctx.closePath(); ctx.fill()
    // 护手
    ctx.fillRect(-4, 2, 8, 2)
    // 剑柄
    ctx.fillRect(-1, 4, 2, 4)
  } else if (type === 'spear') {
    // 斜矛
    ctx.save()
    ctx.rotate(-0.5)
    ctx.fillRect(-1, -8, 2, 14)
    ctx.beginPath()
    ctx.moveTo(0, -10); ctx.lineTo(3, -5); ctx.lineTo(-3, -5)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  } else if (type === 'bow') {
    // 弓
    ctx.beginPath()
    ctx.arc(0, 0, 7, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-7, 0); ctx.lineTo(7, 0)
    ctx.stroke()
    ctx.fillRect(-1, -8, 2, 2)
  } else {
    // 铳
    ctx.fillRect(-7, -2, 10, 4)
    ctx.fillRect(3, -3, 3, 6)
    ctx.fillStyle = '#fff'
    ctx.fillRect(-5, -1, 3, 2)
  }
}

// 装备图标：护甲（胸甲轮廓）
function drawEquipArmorIcon(ctx: CanvasRenderingContext2D, color: string) {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2
  // 胸甲
  ctx.beginPath()
  ctx.moveTo(-6, -7)
  ctx.lineTo(-6, 1)
  ctx.quadraticCurveTo(0, 8, 6, 1)
  ctx.lineTo(6, -7)
  ctx.quadraticCurveTo(0, -2, -6, -7)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.moveTo(0, -5)
  ctx.lineTo(0, 5)
  ctx.quadraticCurveTo(2, 6, 4, 3)
  ctx.lineTo(4, -5)
  ctx.quadraticCurveTo(2, -3, 0, -5)
  ctx.closePath()
  ctx.fill()
}
// cx = 箱子中心 x；groundY = 箱子底部 y（贴地）
export function drawChestSprite(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number, w: number, h: number,
  type: 'common' | 'gold' | 'special',
  open: boolean, frame: number
) {
  const bodyColor = type === 'gold' ? '#c9a227' : type === 'special' ? '#7d3c98' : '#8b5a2b'
  const lidColor = type === 'gold' ? '#ffd700' : type === 'special' ? '#9b59b6' : '#a9703b'
  const glowColor = type === 'gold' ? '#fff3b0' : type === 'special' ? '#e8c7f0' : '#ffe9b0'
  const bob = open ? 0 : Math.sin(frame * 0.05) * 1.5

  ctx.save()
  ctx.translate(cx, groundY + bob)

  // 地面阴影
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(-w / 2 + 2, -2, w - 4, 4)

  // 箱体
  ctx.fillStyle = bodyColor
  ctx.fillRect(-w / 2, -h + 4, w, h - 4)
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(-w / 2, -h + 4, w, h - 4)

  // 箱体木纹
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.moveTo(-w / 2 + 2, -h / 2); ctx.lineTo(w / 2 - 2, -h / 2)
  ctx.stroke()

  // 箱盖
  if (open) {
    // 盖打开角度
    const angle = -Math.min(frame * 0.07, 1) * 1.4
    ctx.save()
    ctx.translate(-w / 2, -h + 4)
    ctx.rotate(angle)
    ctx.fillStyle = lidColor
    ctx.fillRect(0, -7, w, 7)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.strokeRect(0, -7, w, 7)
    ctx.restore()

    // 内部发光 + 奖励微光
    ctx.fillStyle = glowColor
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.25
    ctx.fillRect(-w / 2 + 4, -h + 6, w - 8, 5)
    ctx.globalAlpha = 1
  } else {
    ctx.fillStyle = lidColor
    ctx.fillRect(-w / 2 - 1.5, -h + 11, w + 3, 7)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.strokeRect(-w / 2 - 1.5, -h + 11, w + 3, 7)
    // 盖顶高光
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(-w / 2 - 1.5, -h + 11, w + 3, 2.5)
  }

  // 锁扣
  ctx.fillStyle = '#ffd700'
  ctx.fillRect(-3, -h / 2 - 2, 6, 7)
  ctx.fillStyle = '#b8860b'
  ctx.fillRect(-1.5, -h / 2 - 2, 3, 7)

  // 特殊宝箱的紫色脉动光晕 / 金宝箱的金色光晕
  if (type === 'special' || type === 'gold') {
    const pulse = 0.25 + Math.sin(Date.now() * 0.006) * 0.15
    ctx.globalAlpha = pulse
    ctx.fillStyle = type === 'special' ? '#c39bd3' : '#ffe680'
    ctx.beginPath()
    ctx.arc(0, -h / 2, w / 2 + 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

// ============ 可交互障碍物绘制 ============
export type ObstacleRenderType = 'crate' | 'spikes' | 'barrel' | 'quicksand'

/** 绘制可交互障碍物（x/y 为左上角，w/h 为尺寸） */
export function drawObstacleSprite(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  type: ObstacleRenderType,
  frame: number,
  hit: boolean
) {
  ctx.save()
  if (hit) {
    // 受击闪白
    ctx.filter = 'brightness(1.8)'
    ctx.globalAlpha = 0.85
  }
  switch (type) {
    case 'crate': drawCrateObstacle(ctx, x, y, w, h, frame); break
    case 'spikes': drawSpikeObstacle(ctx, x, y, w, h, frame); break
    case 'barrel': drawBarrelObstacle(ctx, x, y, w, h, frame); break
    case 'quicksand': drawQuicksandObstacle(ctx, x, y, w, h, frame); break
  }
  ctx.restore()
}

function drawQuicksandObstacle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
  // 流沙陷阱：椭圆漩涡沙坑，边缘沙粒缓缓向内坍陷（frame 驱动波纹旋转）
  const cx = x + w / 2
  const bottom = y + h
  // 外围干沙层
  ctx.fillStyle = 'rgba(226,178,98,0.9)'
  ctx.beginPath()
  ctx.ellipse(cx, bottom, w / 2 + 4, h * 0.8, 0, 0, Math.PI * 2)
  ctx.fill()
  // 漩涡沙体（中心深、边缘浅）
  const grad = ctx.createRadialGradient(cx, bottom, 1, cx, bottom, w / 2 + 4)
  grad.addColorStop(0, '#4a2c0e')
  grad.addColorStop(0.55, '#8a5a1e')
  grad.addColorStop(1, '#c99942')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(cx, bottom, w / 2, h * 0.72, 0, 0, Math.PI * 2)
  ctx.fill()
  // 螺旋下沉波纹（随时间旋转）
  ctx.strokeStyle = 'rgba(120,70,20,0.55)'
  ctx.lineWidth = 1.4
  for (let i = 0; i < 3; i++) {
    const phase = frame * 0.15 + i * 2.1
    const rx = w / 2 - 5 - i * 9
    if (rx <= 2) continue
    ctx.beginPath()
    ctx.ellipse(cx, bottom, rx, rx * 0.6, 0, phase, phase + Math.PI * 1.5)
    ctx.stroke()
  }
  // 边缘坍陷沙粒
  ctx.fillStyle = 'rgba(242,195,94,0.85)'
  const t = frame * 0.25
  for (let i = 0; i < 4; i++) {
    const a = Math.PI + (i / 4) * Math.PI * 2 + t * 0.4
    const rr = w / 2 - 2 + Math.sin(t + i) * 3
    ctx.fillRect(cx + Math.cos(a) * rr, bottom - 4 + Math.sin(a) * rr * 0.5, 2.5, 2.5)
  }
  // 深色塌陷中心
  ctx.fillStyle = 'rgba(30,16,4,0.75)'
  ctx.beginPath()
  ctx.ellipse(cx, bottom, 8 + Math.sin(frame * 0.12) * 1.5, 5, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawCrateObstacle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
  const bob = Math.sin(frame * 0.06) * 0.8
  const cx = x + w / 2
  const cy = y + h / 2 + bob
  // 地面阴影
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(cx - w / 2 + 2, y + h - 2, w - 4, 4)
  // 箱体
  const grad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy)
  grad.addColorStop(0, '#a9713f')
  grad.addColorStop(0.5, '#c99a5f')
  grad.addColorStop(1, '#8a5a2f')
  ctx.fillStyle = grad
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h)
  // 木纹横条
  ctx.strokeStyle = 'rgba(70,40,10,0.45)'
  ctx.lineWidth = 1.5
  for (let i = 1; i < 4; i++) {
    const ly = cy - h / 2 + (h * i) / 4
    ctx.beginPath(); ctx.moveTo(cx - w / 2 + 1, ly); ctx.lineTo(cx + w / 2 - 1, ly); ctx.stroke()
  }
  // 对角加固条
  ctx.strokeStyle = 'rgba(60,35,10,0.5)'
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(cx - w / 2 + 2, cy + h / 2 - 2); ctx.lineTo(cx + w / 2 - 2, cy - h / 2 + 2); ctx.stroke()
  // 金属包边
  ctx.strokeStyle = '#5a4126'
  ctx.lineWidth = 2
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h)
  // 顶部高光
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fillRect(cx - w / 2 + 1.5, cy - h / 2 + 1.5, w - 3, 3)
  // 四角铆钉
  ctx.fillStyle = '#e8c877'
  for (const [dx, dy] of [[3, 3], [w - 6, 3], [3, h - 6], [w - 6, h - 6]] as const) {
    ctx.beginPath(); ctx.arc(cx - w / 2 + dx, cy - h / 2 + dy, 1.6, 0, Math.PI * 2); ctx.fill()
  }
}

function drawSpikeObstacle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
  const cx = x + w / 2
  const bottom = y + h
  // 底座铁板
  const grad = ctx.createLinearGradient(0, bottom - h, 0, bottom)
  grad.addColorStop(0, '#6b5a45')
  grad.addColorStop(1, '#3c2f22')
  ctx.fillStyle = grad
  ctx.fillRect(x, bottom - h + h * 0.42, w, h * 0.58)
  // 底座警示条
  ctx.fillStyle = '#ffd24a'
  ctx.fillRect(x, bottom - h * 0.28, w, h * 0.14)
  // 尖刺（3-4 根，随 frame 轻微金属反光）
  const spikes = Math.max(3, Math.floor(w / 18))
  const spikeH = h * 0.42
  for (let i = 0; i < spikes; i++) {
    const sx = x + (i + 0.5) * (w / spikes)
    const baseY = bottom - h * 0.58
    const sway = Math.sin(frame * 0.05 + i) * 0.6
    const sg = ctx.createLinearGradient(sx - 3, baseY, sx + 3, baseY - spikeH)
    sg.addColorStop(0, '#d8d8e8')
    sg.addColorStop(0.5, '#9aa0b8')
    sg.addColorStop(1, '#e8f0ff')
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.moveTo(sx - 3 + sway, baseY)
    ctx.lineTo(sx + sway, baseY - spikeH)
    ctx.lineTo(sx + 3 + sway, baseY)
    ctx.closePath()
    ctx.fill()
    // 尖刺勾
    ctx.fillStyle = '#c0c8dc'
    ctx.beginPath()
    ctx.moveTo(sx + sway, baseY - spikeH)
    ctx.lineTo(sx + 4 + sway, baseY - spikeH * 0.6)
    ctx.lineTo(sx - 2 + sway, baseY - spikeH * 0.7)
    ctx.closePath()
    ctx.fill()
  }
}

function drawBarrelObstacle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
  const bob = Math.sin(frame * 0.06) * 1
  const cx = x + w / 2
  const cy = y + h / 2 + bob
  // 地面阴影
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.fillRect(cx - w / 2 + 2, y + h - 2, w - 4, 4)
  // 桶身（桶形轮廓）
  const grad = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0)
  grad.addColorStop(0, '#8e1f1f')
  grad.addColorStop(0.35, '#d93a3a')
  grad.addColorStop(0.7, '#b82b2b')
  grad.addColorStop(1, '#701717')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(cx - w / 2, cy - h / 2 + h * 0.16)
  ctx.quadraticCurveTo(cx - w / 2, cy - h / 2, cx - w / 2 + w * 0.12, cy - h / 2)
  ctx.lineTo(cx + w / 2 - w * 0.12, cy - h / 2)
  ctx.quadraticCurveTo(cx + w / 2, cy - h / 2, cx + w / 2, cy - h / 2 + h * 0.16)
  ctx.lineTo(cx + w / 2, cy + h / 2 - h * 0.16)
  ctx.quadraticCurveTo(cx + w / 2, cy + h / 2, cx + w / 2 - w * 0.12, cy + h / 2)
  ctx.lineTo(cx - w / 2 + w * 0.12, cy + h / 2)
  ctx.quadraticCurveTo(cx - w / 2, cy + h / 2, cx - w / 2, cy + h / 2 - h * 0.16)
  ctx.closePath()
  ctx.fill()
  // 桶身木箍（上下两条）
  ctx.strokeStyle = '#3c1515'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx - w / 2 + 1, cy - h / 2 + h * 0.2); ctx.lineTo(cx + w / 2 - 1, cy - h / 2 + h * 0.2); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - w / 2 + 1, cy + h / 2 - h * 0.2); ctx.lineTo(cx + w / 2 - 1, cy + h / 2 - h * 0.2); ctx.stroke()
  // 黄色警示带
  ctx.fillStyle = '#ffd24a'
  ctx.fillRect(cx - w / 2 + 2, cy - h * 0.14, w - 4, h * 0.28)
  // 警示骷髅符号
  ctx.fillStyle = '#202020'
  ctx.font = `${Math.floor(h * 0.2)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('☠', cx, cy + h * 0.02)
  // 顶部引信
  ctx.strokeStyle = '#7a4a1a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, cy - h / 2)
  ctx.quadraticCurveTo(cx + 4, cy - h / 2 - 5, cx + 6, cy - h / 2 - 7)
  ctx.stroke()
  // 引信火星（闪烁）
  const spark = 0.7 + Math.sin(frame * 0.5) * 0.3
  ctx.globalAlpha = spark
  ctx.fillStyle = '#ffbb33'
  ctx.beginPath(); ctx.arc(cx + 6, cy - h / 2 - 7, 2.2, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff7d0'
  ctx.beginPath(); ctx.arc(cx + 6, cy - h / 2 - 7, 1, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1
}

// themeKey 为全局背景主题索引（0-8）：0草原|1沼泽|2巨树|3月夜|4枯木|5祭坛|6岩浆前哨|7熔岩裂谷|8火山核心
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  themeKey: number,
  cameraX: number,
  w: number, h: number
) {
  const bgSet = getBackground(themeKey)
  if (!bgSet) {
    // 回退：为第4-8关新增主题（9-23）提供主题色渐变背景
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    if (themeKey >= 9 && themeKey <= 11) {
      // 冰霜系：冷白天空 + 深蓝地平线
      grad.addColorStop(0, '#b8dcec')
      grad.addColorStop(0.6, '#6a9ab8')
      grad.addColorStop(1, '#2a4a5a')
    } else if (themeKey >= 12 && themeKey <= 14) {
      // 深渊系：暗紫天空 + 墨黑地平线
      grad.addColorStop(0, '#2a1040')
      grad.addColorStop(0.6, '#180828')
      grad.addColorStop(1, '#0d0518')
    } else if (themeKey >= 15 && themeKey <= 17) {
      // 沙漠系：金黄天空 + 焦土地平线
      grad.addColorStop(0, '#f8cf6a')
      grad.addColorStop(0.6, '#d98f2b')
      grad.addColorStop(1, '#7c4a12')
    } else if (themeKey >= 18 && themeKey <= 20) {
      // 天空系：明亮云空 + 深海蓝地平线
      grad.addColorStop(0, '#dff0ff')
      grad.addColorStop(0.6, '#8ec5e8')
      grad.addColorStop(1, '#4a7ab0')
    } else if (themeKey >= 21) {
      // 城堡系：铅灰天空 + 暗红地平线
      grad.addColorStop(0, '#5a5a66')
      grad.addColorStop(0.6, '#2e2e38')
      grad.addColorStop(1, '#141418')
    } else {
      grad.addColorStop(0, '#1a1a2e')
      grad.addColorStop(1, '#0d0d1a')
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    // 主题装饰剪影（金字塔/云朵浮岛/宫殿），带视差滚动
    drawFallbackDecor(ctx, themeKey, cameraX, w, h)
    return
  }

  // 1. 天空渐变
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
  skyGrad.addColorStop(0, bgSet.sky.colorTop)
  skyGrad.addColorStop(0.6, bgSet.sky.colorMid)
  skyGrad.addColorStop(1, bgSet.sky.colorBottom)
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, w, h)

  // 2. 多层视差
  ctx.save()
  ctx.imageSmoothingEnabled = false
  for (const layer of bgSet.layers) {
    const layerW = layer.width
    const parallaxOffset = cameraX * layer.parallax
    // 视差偏移取模实现循环平铺
    const offset = ((parallaxOffset % layerW) + layerW) % layerW
    // 计算垂直位置（远景在上方）
    const layerY = h - layer.height - 40

    // 绘制循环平铺
    let drawX = -offset
    while (drawX < w) {
      ctx.drawImage(layer.canvas, drawX, layerY)
      drawX += layerW
    }
  }
  ctx.restore()
}

/**
 * 回退主题装饰：为 15-23（沙漠/天空/城堡）渐变背景叠加主题剪影，
 * 带简单视差滚动，让三关背景有明显差异（不受背景精灵图加载状态影响）。
 */
function drawFallbackDecor(
  ctx: CanvasRenderingContext2D,
  themeKey: number,
  cameraX: number,
  w: number, h: number
) {
  const px = (speed: number) => ((cameraX * speed) % w + w) % w
  if (themeKey >= 15 && themeKey <= 17) {
    // === 沙漠：烈日 + 金字塔群 + 仙人掌 ===
    const sunX = w - 130
    ctx.fillStyle = 'rgba(255,220,120,0.95)'
    ctx.beginPath(); ctx.arc(sunX, 88, 34, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,232,150,0.35)'
    ctx.beginPath(); ctx.arc(sunX, 88, 52, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,240,180,0.16)'
    ctx.beginPath(); ctx.arc(sunX, 88, 76, 0, Math.PI * 2); ctx.fill()
    const pBase = h - 40
    for (let k = 0; k < 3; k++) {
      const gx = ((k * 380 - px(0.25) + w) % w) - 90
      const size = 92 + (k % 2) * 36
      ctx.fillStyle = k % 2 === 0 ? 'rgba(190,132,52,0.5)' : 'rgba(150,95,35,0.55)'
      ctx.beginPath()
      ctx.moveTo(gx + size * 0.5, pBase - size * 0.95)
      ctx.lineTo(gx, pBase)
      ctx.lineTo(gx + size, pBase)
      ctx.closePath(); ctx.fill()
      // 塔尖受光面
      ctx.fillStyle = 'rgba(255,235,170,0.45)'
      ctx.beginPath()
      ctx.moveTo(gx + size * 0.5, pBase - size * 0.95)
      ctx.lineTo(gx + size * 0.38, pBase - size * 0.62)
      ctx.lineTo(gx + size * 0.56, pBase - size * 0.64)
      ctx.closePath(); ctx.fill()
    }
    const cBase = h - 40
    for (let k = 0; k < 4; k++) {
      const gx = ((k * 270 - px(0.5) + w) % w) - 24
      ctx.fillStyle = 'rgba(58,108,52,0.8)'
      ctx.fillRect(gx, cBase - 46, 8, 46)
      ctx.fillRect(gx - 12, cBase - 30, 6, 16)
      ctx.fillRect(gx + 10, cBase - 36, 6, 22)
    }
  } else if (themeKey >= 18 && themeKey <= 20) {
    // === 天空：太阳 + 多层云朵 + 浮空岛 ===
    ctx.fillStyle = 'rgba(255,240,200,0.95)'
    ctx.beginPath(); ctx.arc(w * 0.78, 80, 26, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,245,215,0.3)'
    ctx.beginPath(); ctx.arc(w * 0.78, 80, 44, 0, Math.PI * 2); ctx.fill()
    const cloudSpeeds = [0.15, 0.3, 0.5]
    for (let li = 0; li < 3; li++) {
      const sp = cloudSpeeds[li]!
      const yy = 62 + li * 62
      ctx.fillStyle = `rgba(255,255,255,${0.85 - li * 0.22})`
      for (let k = 0; k < 4; k++) {
        const gx = ((k * 300 - px(sp) + w) % w) - 60
        ctx.beginPath()
        ctx.ellipse(gx, yy, 55, 16, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(gx + 30, yy - 9, 32, 12, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // 浮空岛剪影
    for (let k = 0; k < 2; k++) {
      const gx = ((k * 430 - px(0.35) + w) % w) - 70
      ctx.fillStyle = 'rgba(120,150,182,0.5)'
      ctx.beginPath()
      ctx.moveTo(gx, h * 0.42); ctx.lineTo(gx + 92, h * 0.42); ctx.lineTo(gx + 70, h * 0.5); ctx.lineTo(gx + 16, h * 0.5)
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = 'rgba(92,122,152,0.5)'
      ctx.fillRect(gx + 30, h * 0.34, 26, 32)
      ctx.fillRect(gx + 12, h * 0.38, 10, 26)
      ctx.fillRect(gx + 58, h * 0.36, 8, 28)
    }
  } else if (themeKey >= 21) {
    // === 城堡：暗月 + 宫殿剪影（城齿/主塔/尖顶/亮窗） ===
    ctx.fillStyle = 'rgba(200,200,215,0.85)'
    ctx.beginPath(); ctx.arc(w * 0.82, 80, 24, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(220,220,235,0.22)'
    ctx.beginPath(); ctx.arc(w * 0.82, 80, 40, 0, Math.PI * 2); ctx.fill()
    const pBase = h - 44
    for (let k = 0; k < 3; k++) {
      const gx = ((k * 360 - px(0.22) + w) % w) - 80
      const dark = k % 2 === 0 ? 'rgba(44,44,58,0.92)' : 'rgba(30,30,40,0.95)'
      ctx.fillStyle = dark
      // 城墙 + 城齿
      ctx.fillRect(gx + 22, pBase - 92, 100, 92)
      for (let i = 0; i < 4; i++) ctx.fillRect(gx + 24 + i * 25, pBase - 102, 14, 10)
      // 主塔 + 尖顶
      ctx.fillRect(gx + 50, pBase - 162, 42, 70)
      ctx.beginPath()
      ctx.moveTo(gx + 50, pBase - 162)
      ctx.lineTo(gx + 71, pBase - 204)
      ctx.lineTo(gx + 92, pBase - 162)
      ctx.closePath(); ctx.fill()
      // 窗户亮光
      ctx.fillStyle = 'rgba(255,200,80,0.55)'
      ctx.fillRect(gx + 62, pBase - 142, 8, 12)
      ctx.fillRect(gx + 70, pBase - 142, 8, 12)
    }
  }
}

// 平台绘制
// themeKey 为全局背景主题索引（0-8），地面使用主题专属 groundDetail，浮动平台按主题改变材质
export function drawPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: string, themeKey: number = 0) {
  if (type === 'ground') {
    const bgSet = getBackground(themeKey)
    if (bgSet) {
      // 使用主题专属地面渲染
      bgSet.groundDetail(ctx, x, y, w, h)
      return
    }
    // 回退
    if (themeKey >= 9 && themeKey <= 11) {
      // 冰霜地面：冻土 + 雪层
      const iceGrad = ctx.createLinearGradient(0, y, 0, y + h)
      iceGrad.addColorStop(0, '#dceef8')
      iceGrad.addColorStop(0.3, '#a8c8d8')
      iceGrad.addColorStop(1, '#52788a')
      ctx.fillStyle = iceGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#eaf7ff'
      ctx.fillRect(x, y, w, 5)
      // 冰晶点缀
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      for (let i = 0; i < Math.floor(w / 40); i++) {
        ctx.fillRect(x + 8 + i * 40, y + 3 + (i % 3) * 6, 3, 3)
      }
    } else if (themeKey >= 12 && themeKey <= 14) {
      // 深渊地面：暗紫魔土 + 裂隙紫光
      const abyssGrad = ctx.createLinearGradient(0, y, 0, y + h)
      abyssGrad.addColorStop(0, '#2a1440')
      abyssGrad.addColorStop(0.4, '#1c0c30')
      abyssGrad.addColorStop(1, '#0d0518')
      ctx.fillStyle = abyssGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#5a2a80'
      ctx.fillRect(x, y, w, 4)
      ctx.strokeStyle = 'rgba(180,90,255,0.4)'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 60); i++) {
        ctx.beginPath()
        ctx.moveTo(x + 15 + i * 60, y + 6)
        ctx.lineTo(x + 12 + i * 60, y + h - 4)
        ctx.stroke()
      }
    } else if (themeKey >= 15 && themeKey <= 17) {
      // 沙漠地面：黄沙 + 沙纹波纹
      const sandGrad = ctx.createLinearGradient(0, y, 0, y + h)
      sandGrad.addColorStop(0, '#f2c35e')
      sandGrad.addColorStop(0.4, '#d9a13b')
      sandGrad.addColorStop(1, '#9a6a1e')
      ctx.fillStyle = sandGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#f7d98a'
      ctx.fillRect(x, y, w, 5)
      ctx.strokeStyle = 'rgba(150,95,20,0.5)'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 48); i++) {
        ctx.beginPath()
        ctx.moveTo(x + 8 + i * 48, y + 10)
        ctx.quadraticCurveTo(x + 18 + i * 48, y + 5, x + 28 + i * 48, y + 10)
        ctx.stroke()
      }
    } else if (themeKey >= 18 && themeKey <= 20) {
      // 天空地面：云白石板 + 淡蓝微光
      const skyGrad2 = ctx.createLinearGradient(0, y, 0, y + h)
      skyGrad2.addColorStop(0, '#eef6ff')
      skyGrad2.addColorStop(0.5, '#c8dff0')
      skyGrad2.addColorStop(1, '#8fb8d8')
      ctx.fillStyle = skyGrad2
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x, y, w, 4)
      ctx.strokeStyle = 'rgba(90,140,190,0.5)'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 24); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 24, y + 6)
        ctx.lineTo(x + i * 24 + 12, y + h - 2)
        ctx.stroke()
      }
    } else if (themeKey >= 21) {
      // 城堡地面：灰石砖 + 暗红砖缝
      const castleGrad = ctx.createLinearGradient(0, y, 0, y + h)
      castleGrad.addColorStop(0, '#5a5a66')
      castleGrad.addColorStop(0.5, '#3a3a46')
      castleGrad.addColorStop(1, '#22222c')
      ctx.fillStyle = castleGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#6e6e7c'
      ctx.fillRect(x, y, w, 4)
      ctx.strokeStyle = 'rgba(40,10,20,0.6)'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 22); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 22, y + 3)
        ctx.lineTo(x + i * 22, y + h - 2)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(120,20,40,0.35)'
      for (let i = 0; i < Math.floor(w / 44); i++) {
        ctx.fillRect(x + 16 + i * 44, y + h / 2, 12, 2)
      }
    } else {
      const dirtGrad = ctx.createLinearGradient(0, y, 0, y + h)
      dirtGrad.addColorStop(0, '#8B6914')
      dirtGrad.addColorStop(0.2, '#6B4914')
      dirtGrad.addColorStop(1, '#4B2904')
      ctx.fillStyle = dirtGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#4a8a2a'
      ctx.fillRect(x, y, w, 6)
    }
  } else if (type === 'platform') {
    // 浮动平台 - 按主题切换材质
    const lava = themeKey >= 6 && themeKey <= 8
    const dusk = themeKey === 3 || themeKey === 5
    const ice = themeKey >= 9 && themeKey <= 11
    const abyss = themeKey >= 12 && themeKey <= 14
    const sand = themeKey >= 15 && themeKey <= 17
    const sky = themeKey >= 18 && themeKey <= 20
    const castle = themeKey >= 21
    if (ice) {
      // 冰晶平台：透蓝冰砖 + 雪顶
      const iceGrad = ctx.createLinearGradient(0, y, 0, y + h)
      iceGrad.addColorStop(0, '#c8e8f8')
      iceGrad.addColorStop(0.4, '#8ac8e0')
      iceGrad.addColorStop(1, '#4a90b0')
      ctx.fillStyle = iceGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.fillRect(x, y, w, 3)
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 16); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 16 + 4, y + 2)
        ctx.lineTo(x + i * 16 + 9, y + h - 2)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(200,240,255,0.35)'
      ctx.fillRect(x, y + h - 2, w, 2)
    } else if (abyss) {
      // 深渊平台：黑曜石 + 紫纹
      const abyssGrad = ctx.createLinearGradient(0, y, 0, y + h)
      abyssGrad.addColorStop(0, '#3a1a50')
      abyssGrad.addColorStop(0.4, '#241032')
      abyssGrad.addColorStop(1, '#120818')
      ctx.fillStyle = abyssGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#a050ff'
      ctx.fillRect(x, y, w, 2)
      ctx.strokeStyle = 'rgba(160,80,255,0.5)'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 18); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 18 + 4, y + 3)
        ctx.lineTo(x + i * 18 + 10, y + h - 3)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(190,100,255,0.3)'
      ctx.fillRect(x, y + h - 2, w, 2)
    } else if (sand) {
      // 沙漠平台：砂岩板 + 沙纹 + 金色边缘
      const sandGrad = ctx.createLinearGradient(0, y, 0, y + h)
      sandGrad.addColorStop(0, '#e0b066')
      sandGrad.addColorStop(0.4, '#c08a3e')
      sandGrad.addColorStop(1, '#8a5a20')
      ctx.fillStyle = sandGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#f4d98c'
      ctx.fillRect(x, y, w, 3)
      ctx.strokeStyle = 'rgba(120,70,20,0.55)'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 16); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 16 + 3, y + 4)
        ctx.quadraticCurveTo(x + i * 16 + 8, y + h - 6, x + i * 16 + 13, y + 4)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(255,210,110,0.45)'
      ctx.fillRect(x, y + h - 2, w, 2)
    } else if (sky) {
      // 天空平台：云白石板 + 淡蓝微光
      const skyGrad = ctx.createLinearGradient(0, y, 0, y + h)
      skyGrad.addColorStop(0, '#ffffff')
      skyGrad.addColorStop(0.45, '#d8eaf7')
      skyGrad.addColorStop(1, '#9cc2e0')
      ctx.fillStyle = skyGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x, y, w, 3)
      ctx.strokeStyle = 'rgba(90,150,200,0.45)'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 18); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 18 + 4, y + 3)
        ctx.lineTo(x + i * 18 + 10, y + h - 3)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(140,200,255,0.4)'
      ctx.fillRect(x, y + h - 2, w, 2)
    } else if (castle) {
      // 城堡平台：灰石砖 + 暗红砖缝 + 铁托架
      const castleGrad = ctx.createLinearGradient(0, y, 0, y + h)
      castleGrad.addColorStop(0, '#6a6a78')
      castleGrad.addColorStop(0.4, '#484856')
      castleGrad.addColorStop(1, '#28282f')
      ctx.fillStyle = castleGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#7c7c8c'
      ctx.fillRect(x, y, w, 3)
      ctx.strokeStyle = 'rgba(30,10,20,0.7)'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 18); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 18 + 4, y + 2)
        ctx.lineTo(x + i * 18 + 4, y + h - 2)
        ctx.stroke()
      }
      // 底部铁托架
      ctx.fillStyle = '#3c3c48'
      ctx.fillRect(x + 4, y + h - 4, 10, 4)
      ctx.fillRect(x + w - 14, y + h - 4, 10, 4)
      ctx.fillStyle = 'rgba(150,30,50,0.4)'
      ctx.fillRect(x, y + h / 2 - 1, w, 2)
    } else if (lava) {
      // 熔岩平台：黑曜石 + 橙色熔岩裂纹
      const stoneGrad = ctx.createLinearGradient(0, y, 0, y + h)
      stoneGrad.addColorStop(0, '#4a2a1a')
      stoneGrad.addColorStop(0.4, '#2a1410')
      stoneGrad.addColorStop(1, '#140a08')
      ctx.fillStyle = stoneGrad
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#ff8a2a'
      ctx.fillRect(x, y + 1, w, 2)
      ctx.strokeStyle = 'rgba(255,138,42,0.55)'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 18); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 18 + 4, y + 3)
        ctx.lineTo(x + i * 18 + 10, y + h - 3)
        ctx.stroke()
      }
      // 底缘发光
      ctx.fillStyle = 'rgba(255,120,30,0.35)'
      ctx.fillRect(x, y + h - 2, w, 2)
    } else if (themeKey === 0 || themeKey === 2) {
      // 木平台（草原/巨树）：棕木板
      const woodGrad = ctx.createLinearGradient(0, y, 0, y + h)
      woodGrad.addColorStop(0, '#a5753a')
      woodGrad.addColorStop(0.4, '#8a5f2c')
      woodGrad.addColorStop(1, '#6a4520')
      ctx.fillStyle = woodGrad
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = '#5a3a18'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 16); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 16, y + 2)
        ctx.lineTo(x + i * 16 + 8, y + h - 2)
        ctx.stroke()
      }
      // 板缝横线
      ctx.fillStyle = 'rgba(60,35,10,0.6)'
      ctx.fillRect(x, y + h / 2 - 1, w, 2)
    } else if (themeKey === 1) {
      // 苔藓石（沼泽）
      const stoneGrad = ctx.createLinearGradient(0, y, 0, y + h)
      stoneGrad.addColorStop(0, '#6a6a52')
      stoneGrad.addColorStop(0.4, '#4a4a38')
      stoneGrad.addColorStop(1, '#33332a')
      ctx.fillStyle = stoneGrad
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = '#3a3a2a'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 15); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 15, y + 2)
        ctx.lineTo(x + i * 15 + 6, y + h - 2)
        ctx.stroke()
      }
      // 厚苔藓
      ctx.fillStyle = 'rgba(70,110,50,0.8)'
      ctx.fillRect(x, y, w, 4)
      ctx.fillStyle = 'rgba(90,140,60,0.6)'
      ctx.fillRect(x + 2, y - 2, w - 4, 2)
    } else if (themeKey === 4) {
      // 暗朽木（枯木峡谷）
      const stoneGrad = ctx.createLinearGradient(0, y, 0, y + h)
      stoneGrad.addColorStop(0, '#5a442e')
      stoneGrad.addColorStop(0.4, '#3a2a1c')
      stoneGrad.addColorStop(1, '#251810')
      ctx.fillStyle = stoneGrad
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = '#1e140c'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 14); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 14, y + 3)
        ctx.lineTo(x + i * 14 + 5, y + h - 2)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(30,16,8,0.5)'
      ctx.fillRect(x, y, w, 3)
    } else {
      // 暗夜/祭坛：青灰石板 + 微光
      const stoneGrad = ctx.createLinearGradient(0, y, 0, y + h)
      if (dusk) {
        stoneGrad.addColorStop(0, '#6a7088')
        stoneGrad.addColorStop(0.4, '#484e66')
        stoneGrad.addColorStop(1, '#30364e')
      } else {
        stoneGrad.addColorStop(0, '#a0a0a0')
        stoneGrad.addColorStop(0.3, '#808080')
        stoneGrad.addColorStop(1, '#606060')
      }
      ctx.fillStyle = stoneGrad
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = dusk ? '#3a4058' : '#707070'
      ctx.lineWidth = 1
      for (let i = 0; i < Math.floor(w / 15); i++) {
        ctx.beginPath()
        ctx.moveTo(x + i * 15, y + 2)
        ctx.lineTo(x + i * 15 + 6, y + h - 2)
        ctx.stroke()
      }
      // 苔藓/微光
      if (dusk) {
        ctx.fillStyle = 'rgba(140,170,255,0.25)'
        ctx.fillRect(x, y, w, 3)
      } else {
        ctx.fillStyle = 'rgba(80,130,50,0.5)'
        ctx.fillRect(x, y, w, 3)
      }
    }
  }
}
