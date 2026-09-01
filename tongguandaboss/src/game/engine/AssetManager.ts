// ============ 程序化像素美术渲染器 ============
import type { EnemyType } from '../types'

export class AssetManager {
  private offscreen: HTMLCanvasElement
  private offCtx: CanvasRenderingContext2D

  constructor() {
    this.offscreen = document.createElement('canvas')
    this.offscreen.width = 100
    this.offscreen.height = 100
    this.offCtx = this.offscreen.getContext('2d')!
  }

  px = (v: number) => Math.round(v)
  pixel = (ctx: CanvasRenderingContext2D) => { ctx.imageSmoothingEnabled = false }

  /** 画像素矩形 */
  drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
    ctx.fillStyle = color
    ctx.fillRect(this.px(x), this.px(y), this.px(w), this.px(h))
  }

  // ========== 玩家 48x56 像素风 ==========
  drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: 'left' | 'right', animFrame: number, attacking: boolean) {
    ctx.save()
    this.pixel(ctx)
    const cx = x
    const cy = y
    const flip = dir === 'left'

    if (flip) {
      ctx.translate(cx + 24, 0)
      ctx.scale(-1, 1)
      ctx.translate(-(cx + 24), 0)
    }

    // 身体动画
    const bodyBob = Math.sin(animFrame * 0.4) * 1.5

    // 靴子
    this.drawRect(ctx, cx + 10, cy + 48, 10, 8, '#5c3a1e')
    this.drawRect(ctx, cx + 28, cy + 48, 10, 8, '#5c3a1e')

    // 腿
    this.drawRect(ctx, cx + 12, cy + 40, 8, 10, '#3a5a8c')
    this.drawRect(ctx, cx + 28, cy + 40, 8, 10, '#3a5a8c')

    // 身体（铠甲）
    this.drawRect(ctx, cx + 8, cy + 18, 32, 24, '#4a7ab5')
    this.drawRect(ctx, cx + 12, cy + 20, 8, 6, '#6da0d8') // 胸甲高光
    this.drawRect(ctx, cx + 28, cy + 20, 8, 6, '#6da0d8')

    // 腰带
    this.drawRect(ctx, cx + 8, cy + 38, 32, 4, '#8B6914')
    this.drawRect(ctx, cx + 20, cy + 36, 8, 8, '#DAA520') // 腰扣

    // 手臂
    const armAngle = attacking ? 0.6 : Math.sin(animFrame * 0.5) * 0.2
    ctx.save()
    ctx.translate(cx + 6, cy + 22)
    ctx.rotate(-armAngle)
    this.drawRect(ctx, 0, 0, 6, 16, '#4a7ab5')
    this.drawRect(ctx, 0, 14, 6, 4, '#f4c67a') // 手
    if (attacking) {
      // 剑
      this.drawRect(ctx, 4, -24, 4, 26, '#c0c0c0')
      this.drawRect(ctx, 3, -26, 6, 4, '#fff')
      this.drawRect(ctx, 8, 2, 4, 8, '#8B4513') // 剑柄
    }
    ctx.restore()

    // 右臂
    ctx.save()
    ctx.translate(cx + 36, cy + 22)
    ctx.rotate(armAngle * 0.3)
    this.drawRect(ctx, 0, 0, 6, 16, '#3d6aa0')
    this.drawRect(ctx, 0, 14, 6, 4, '#f4c67a')
    if (attacking) {
      this.drawRect(ctx, 4, -24, 4, 26, '#c0c0c0')
      this.drawRect(ctx, 3, -26, 6, 4, '#fff')
    }
    ctx.restore()

    // 头
    this.drawRect(ctx, cx + 12, cy + 1, 24, 22, '#f4c67a') // 肤色
    // 头发
    this.drawRect(ctx, cx + 10, cy - 2, 28, 8, '#6b3a2a')
    this.drawRect(ctx, cx + 8, cy + 2, 4, 8, '#6b3a2a')
    this.drawRect(ctx, cx + 36, cy + 2, 4, 8, '#6b3a2a')
    // 眼睛
    this.drawRect(ctx, cx + 18, cy + 6, 4, 4, '#fff')
    this.drawRect(ctx, cx + 24, cy + 6, 4, 4, '#fff')
    this.drawRect(ctx, cx + 20, cy + 7, 2, 2, '#333')
    this.drawRect(ctx, cx + 26, cy + 7, 2, 2, '#333')
    // 嘴
    this.drawRect(ctx, cx + 18, cy + 14, 10, 3, '#c4956b')

    // 披风
    this.drawRect(ctx, cx + 6, cy + 18, 6, 28, '#8b2020')
    this.drawRect(ctx, cx + 36, cy + 18, 6, 28, '#8b2020')
    this.drawRect(ctx, cx + 2, cy + 28, 10, 12, '#a02020')

    ctx.restore()
  }

  // ========== 怪物绘制 ==========
  drawEnemy(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: EnemyType, dir: 'left' | 'right', frame: number) {
    ctx.save()
    this.pixel(ctx)
    const cx = x
    const cy = y
    const bob = Math.sin(frame * 0.3) * 1

    if (dir === 'left') {
      ctx.translate(cx + w / 2, 0)
      ctx.scale(-1, 1)
      ctx.translate(-(cx + w / 2), 0)
    }

    switch (type) {
      case 'slime':
        this.drawSlime(ctx, cx, cy + bob, w, h, frame)
        break
      case 'skeleton':
        this.drawSkeleton(ctx, cx, cy + bob, w, h, frame)
        break
      case 'goblin':
        this.drawGoblin(ctx, cx, cy + bob, w, h, frame)
        break
      case 'dark_mage':
        this.drawDarkMage(ctx, cx, cy + bob, w, h, frame)
        break
    }

    ctx.restore()
  }

  private drawSlime(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
    const squish = 1 + Math.sin(frame * 0.4) * 0.15
    // 身体
    ctx.fillStyle = '#4cd137'
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h * 0.6, w * 0.45 * squish, h * 0.35, 0, Math.PI, 0)
    ctx.fill()
    // 上半
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h * 0.35, w * 0.42, h * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()
    // 高光
    ctx.fillStyle = '#7bed6f'
    ctx.beginPath()
    ctx.ellipse(x + w * 0.35, y + h * 0.3, w * 0.15, h * 0.12, 0, 0, Math.PI * 2)
    ctx.fill()
    // 眼睛
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(x + w * 0.3, y + h * 0.28, 5, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + w * 0.65, y + h * 0.28, 5, 5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#222'
    ctx.beginPath()
    ctx.ellipse(x + w * 0.32, y + h * 0.29, 2, 2, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + w * 0.67, y + h * 0.29, 2, 2, 0, 0, Math.PI * 2); ctx.fill()
  }

  private drawSkeleton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
    const bob = Math.sin(frame * 0.5) * 1
    // 腿
    this.drawRect(ctx, x + 6, y + 36, 6, 14, '#d1ccc0')
    this.drawRect(ctx, x + 20, y + 36, 6, 14, '#d1ccc0')
    // 身体
    this.drawRect(ctx, x + 6, y + 12, 20, 26, '#f5f0e8')
    this.drawRect(ctx, x + 10, y + 15, 5, 18, '#dfd9d0')
    this.drawRect(ctx, x + 17, y + 15, 5, 18, '#dfd9d0')
    // 手臂
    const armSwing = Math.sin(frame * 0.35) * 0.4
    ctx.save()
    ctx.translate(x + 4, y + 16)
    ctx.rotate(-0.3 + armSwing)
    this.drawRect(ctx, -2, 0, 5, 18, '#f5f0e8')
    this.drawRect(ctx, -1, 16, 3, 4, '#d1ccc0')
    ctx.restore()
    ctx.save()
    ctx.translate(x + 23, y + 16)
    ctx.rotate(-0.3 - armSwing)
    this.drawRect(ctx, 0, 0, 5, 18, '#f5f0e8')
    this.drawRect(ctx, 1, 16, 3, 4, '#d1ccc0')
    ctx.restore()
    // 武器(骨剑)
    ctx.save()
    ctx.translate(x + 28, y + 18)
    this.drawRect(ctx, 0, 0, 4, 22, '#c8c0b0')
    this.drawRect(ctx, -1, -3, 6, 5, '#fff')
    ctx.restore()
    // 头
    ctx.fillStyle = '#f5f0e8'
    ctx.beginPath()
    ctx.ellipse(x + 16, y + 6, 12, 11, 0, 0, Math.PI * 2); ctx.fill()
    // 眼睛
    ctx.fillStyle = '#222'
    this.drawRect(ctx, x + 10, y + 3, 3, 4, '#222')
    this.drawRect(ctx, x + 19, y + 3, 3, 4, '#222')
    ctx.fillStyle = '#ff4444'
    this.drawRect(ctx, x + 11, y + 4, 1, 2, '#ff4444')
    this.drawRect(ctx, x + 20, y + 4, 1, 2, '#ff4444')
    // 嘴
    this.drawRect(ctx, x + 12, y + 10, 8, 2, '#444')
  }

  private drawGoblin(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
    // 腿
    this.drawRect(ctx, x + 4, y + 30, 6, 10, '#5a4a3a')
    this.drawRect(ctx, x + 16, y + 30, 6, 10, '#5a4a3a')
    // 身体
    this.drawRect(ctx, x + 3, y + 10, 20, 22, '#8B7355')
    this.drawRect(ctx, x + 5, y + 12, 7, 8, '#a08868')
    // 背心
    this.drawRect(ctx, x + 3, y + 10, 20, 10, '#6b8e23')
    // 手臂
    this.drawRect(ctx, x - 1, y + 12, 6, 16, '#a08868')
    this.drawRect(ctx, x + 21, y + 12, 6, 16, '#a08868')
    // 匕首
    this.drawRect(ctx, x + 25, y + 16, 3, 10, '#c0c0c0')
    this.drawRect(ctx, x + 23, y + 24, 7, 3, '#c0c0c0')
    // 头
    ctx.fillStyle = '#8BC34A'
    ctx.beginPath()
    ctx.ellipse(x + 13, y + 4, 10, 12, 0, 0, Math.PI * 2); ctx.fill()
    // 耳朵
    ctx.beginPath()
    ctx.ellipse(x + 5, y - 2, 4, 8, -0.3, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 21, y - 2, 4, 8, 0.3, 0, Math.PI * 2); ctx.fill()
    // 眼睛
    ctx.fillStyle = '#fff'
    this.drawRect(ctx, x + 7, y + 1, 4, 4, '#ff0')
    this.drawRect(ctx, x + 15, y + 1, 4, 4, '#ff0')
    ctx.fillStyle = '#222'
    this.drawRect(ctx, x + 8, y + 2, 2, 2, '#222')
    this.drawRect(ctx, x + 16, y + 2, 2, 2, '#222')
    // 嘴
    this.drawRect(ctx, x + 9, y + 9, 8, 3, '#6d4c41')
    this.drawRect(ctx, x + 10, y + 11, 2, 3, '#fff') // 牙
    this.drawRect(ctx, x + 14, y + 11, 2, 3, '#fff')
  }

  private drawDarkMage(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number) {
    const magicPulse = Math.sin(frame * 0.3) * 0.3 + 0.7
    // 身体（长袍）
    ctx.fillStyle = '#3d1f6d'
    ctx.beginPath()
    ctx.moveTo(x + 2, y + 12)
    ctx.lineTo(x + w - 2, y + 12)
    ctx.lineTo(x + w + 2, y + h)
    ctx.lineTo(x - 2, y + h)
    ctx.closePath()
    ctx.fill()
    // 袍边饰带
    ctx.fillStyle = '#6c3aaa'
    this.drawRect(ctx, x + 2, y + 12, w - 4, 6, '#6c3aaa')
    // 手臂
    this.drawRect(ctx, x - 2, y + 16, 6, 16, '#3d1f6d')
    this.drawRect(ctx, x + w - 4, y + 16, 6, 16, '#3d1f6d')
    // 法杖
    const staffTop = y - 14 + Math.sin(frame * 0.25) * 2
    this.drawRect(ctx, x + w + 3, staffTop + 10, 2, 28, '#8B4513')
    // 法球
    ctx.fillStyle = `rgba(180, 0, 255, ${magicPulse})`
    ctx.beginPath()
    ctx.ellipse(x + w + 4, staffTop + 8, 6, 6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(x + w + 3, staffTop + 6, 2, 2, 0, 0, Math.PI * 2); ctx.fill()
    // 头
    ctx.fillStyle = '#d1c4b8'
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + 4, 11, 11, 0, 0, Math.PI * 2); ctx.fill()
    // 巫师帽
    ctx.fillStyle = '#3d1f6d'
    ctx.beginPath()
    ctx.moveTo(x + w / 2 - 3, y - 12)
    ctx.lineTo(x + w / 2 + 3, y - 12)
    ctx.lineTo(x + w / 2 + 10, y + 4)
    ctx.lineTo(x + w / 2 - 10, y + 4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#6c3aaa'
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y - 12, 4, 3, 0, 0, Math.PI * 2); ctx.fill()
    // 眼睛（发光）
    ctx.fillStyle = `rgba(0, 255, 255, ${magicPulse})`
    ctx.beginPath()
    ctx.ellipse(x + 7, y + 4, 3, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 17, y + 4, 3, 3, 0, 0, Math.PI * 2); ctx.fill()
  }

  // ========== Boss 绘制 ==========
  drawBoss(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type: string, dir: 'left' | 'right', frame: number, phase: number) {
    ctx.save()
    this.pixel(ctx)
    const cx = x
    const cy = y

    if (dir === 'left') {
      ctx.translate(cx + w / 2, 0)
      ctx.scale(-1, 1)
      ctx.translate(-(cx + w / 2), 0)
    }

    switch (type) {
      case 'dragonWarrior': this.drawBossDragonWarrior(ctx, cx, cy, w, h, frame, phase); break
      case 'shadowLord': this.drawBossShadowLord(ctx, cx, cy, w, h, frame, phase); break
      case 'demonKing': this.drawBossDemonKing(ctx, cx, cy, w, h, frame, phase); break
    }

    ctx.restore()
  }

  private drawBossDragonWarrior(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, phase: number) {
    const rage = phase >= 2 ? Math.sin(frame * 0.2) * 0.2 : 0
    // 腿（重型护甲）
    this.drawRect(ctx, x + 12, y + 70, 16, 20, '#555')
    this.drawRect(ctx, x + 52, y + 70, 16, 20, '#555')
    this.drawRect(ctx, x + 10, y + 88, 20, 8, '#444')
    this.drawRect(ctx, x + 50, y + 88, 20, 8, '#444')
    // 身体（龙鳞铠甲）
    ctx.fillStyle = '#2d5016'
    ctx.fillRect(x + 6, y + 20, 68, 52)
    // 鳞片纹理
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#3a6b1e' : '#2d5016'
        ctx.beginPath()
        ctx.ellipse(x + 16 + i * 14, y + 28 + j * 16, 6, 5, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // 胸甲核心宝石
    ctx.fillStyle = phase >= 2 ? '#ff4444' : '#ff8800'
    ctx.beginPath()
    ctx.ellipse(x + 40, y + 38, 8 + rage * 2, 6, 0, 0, Math.PI * 2); ctx.fill()
    // 手臂
    this.drawRect(ctx, x, y + 22, 12, 30, '#2d5016')
    this.drawRect(ctx, x + 68, y + 22, 12, 30, '#2d5016')
    // 武器 - 巨剑
    this.drawRect(ctx, x + 78, y + 12, 6, 40, '#888')
    this.drawRect(ctx, x + 76, y + 8, 10, 8, '#aaa')
    this.drawRect(ctx, x + 72, y + 48, 16, 4, '#8B4513')
    // 龙翼
    ctx.fillStyle = '#3a6b1e'
    ctx.beginPath()
    ctx.moveTo(x + 10, y + 18)
    ctx.lineTo(x - 14 - rage * 5, y + 2)
    ctx.lineTo(x - 6, y + 30)
    ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x + 10, y + 30)
    ctx.lineTo(x - 10 - rage * 4, y + 10)
    ctx.lineTo(x - 2, y + 40)
    ctx.closePath(); ctx.fill()
    // 头
    ctx.fillStyle = '#2d5016'
    ctx.beginPath()
    ctx.ellipse(x + 40, y + 8, 18, 16, 0, 0, Math.PI * 2); ctx.fill()
    // 龙角
    ctx.fillStyle = '#c8a832'
    ctx.beginPath()
    ctx.moveTo(x + 24, y - 2)
    ctx.lineTo(x + 16, y - 18)
    ctx.lineTo(x + 28, y - 4); ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x + 56, y - 2)
    ctx.lineTo(x + 64, y - 18)
    ctx.lineTo(x + 52, y - 4); ctx.closePath(); ctx.fill()
    // 眼睛
    ctx.fillStyle = '#ff0'
    ctx.beginPath()
    ctx.ellipse(x + 32, y + 4, 5, 4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 48, y + 4, 5, 4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#222'
    ctx.beginPath()
    ctx.ellipse(x + 33, y + 5, 2, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 49, y + 5, 2, 3, 0, 0, Math.PI * 2); ctx.fill()
  }

  private drawBossShadowLord(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, phase: number) {
    const shadowAlpha = 0.4 + Math.sin(frame * 0.15) * 0.15
    // 黑影
    ctx.fillStyle = '#1a0a2e'
    ctx.fillRect(x + 8, y + 24, 64, 60)
    // 铠甲
    ctx.fillStyle = '#2d1b4e'
    this.drawRect(ctx, x + 10, y + 26, 60, 56, '#2d1b4e')
    this.drawRect(ctx, x + 14, y + 28, 52, 22, '#3d2b5e')
    // 暗纹
    ctx.fillStyle = '#4a2080'
    this.drawRect(ctx, x + 20, y + 50, 40, 4, '#4a2080')
    this.drawRect(ctx, x + 16, y + 58, 48, 3, '#4a2080')
    if (phase >= 2) {
      ctx.fillStyle = '#8800ff'
      this.drawRect(ctx, x + 30, y + 38, 20, 10, '#8800ff')
    }
    // 腿
    this.drawRect(ctx, x + 16, y + 82, 14, 16, '#1a0a2e')
    this.drawRect(ctx, x + 50, y + 82, 14, 16, '#1a0a2e')
    // 靴子
    this.drawRect(ctx, x + 12, y + 96, 22, 6, '#333')
    this.drawRect(ctx, x + 46, y + 96, 22, 6, '#333')
    // 手臂 + 镰刀
    this.drawRect(ctx, x + 2, y + 28, 10, 30, '#1a0a2e')
    this.drawRect(ctx, x - 6, y + 14, 6, 18, '#666') // 镰刀柄
    ctx.fillStyle = '#888'
    ctx.beginPath()
    ctx.arc(x - 3, y + 10, 14, -0.5, Math.PI * 1.2); ctx.fill()
    // 左臂
    this.drawRect(ctx, x + 68, y + 28, 10, 30, '#1a0a2e')
    // 暗影能量球
    ctx.fillStyle = `rgba(120, 0, 255, ${shadowAlpha})`
    ctx.beginPath()
    ctx.ellipse(x + 78, y + 24, 8, 8, 0, 0, Math.PI * 2); ctx.fill()
    // 头
    ctx.fillStyle = '#1a0a2e'
    ctx.beginPath()
    ctx.ellipse(x + 40, y + 10, 14, 15, 0, 0, Math.PI * 2); ctx.fill()
    // 兜帽
    ctx.fillStyle = '#2d1b4e'
    ctx.beginPath()
    ctx.moveTo(x + 26, y + 8)
    ctx.lineTo(x + 30, y - 20)
    ctx.lineTo(x + 50, y - 20)
    ctx.lineTo(x + 54, y + 8)
    ctx.fill()
    // 眼睛
    ctx.fillStyle = '#ff0066'
    ctx.beginPath()
    ctx.ellipse(x + 34, y + 10, 4, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 46, y + 10, 4, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(x + 33, y + 9, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 45, y + 9, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill()
  }

  private drawBossDemonKing(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frame: number, phase: number) {
    const fireGlow = 0.5 + Math.sin(frame * 0.25) * 0.3
    // 腿（蹄子）
    ctx.fillStyle = '#4a1a1a'
    this.drawRect(ctx, x + 14, y + 78, 16, 18, '#4a1a1a')
    this.drawRect(ctx, x + 54, y + 78, 16, 18, '#4a1a1a')
    ctx.fillStyle = '#333'
    this.drawRect(ctx, x + 10, y + 94, 24, 6, '#333')
    this.drawRect(ctx, x + 50, y + 94, 24, 6, '#333')
    // 身体（熔岩纹）
    ctx.fillStyle = '#6b1818'
    ctx.fillRect(x + 8, y + 24, 68, 56)
    ctx.fillStyle = '#8b2020'
    this.drawRect(ctx, x + 12, y + 28, 60, 14, '#8b2020')
    ctx.fillStyle = '#b02c2c'
    this.drawRect(ctx, x + 28, y + 46, 28, 20, '#b02c2c')
    // 熔岩裂缝
    ctx.fillStyle = `rgba(255, 120, 0, ${fireGlow})`
    this.drawRect(ctx, x + 24, y + 50, 4, 12, '#ff7800')
    this.drawRect(ctx, x + 52, y + 50, 4, 12, '#ff7800')
    this.drawRect(ctx, x + 38, y + 62, 8, 4, '#ffaa00')
    // 手臂
    this.drawRect(ctx, x - 2, y + 28, 14, 30, '#8b2020')
    this.drawRect(ctx, x + 72, y + 28, 14, 30, '#8b2020')
    // 火焰拳
    ctx.fillStyle = `rgba(255, 60, 0, ${fireGlow})`
    ctx.beginPath()
    ctx.ellipse(x - 4, y + 56, 8, 6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 88, y + 56, 8, 6, 0, 0, Math.PI * 2); ctx.fill()
    // 巨翼
    ctx.fillStyle = '#4a1010'
    ctx.beginPath()
    ctx.moveTo(x + 4, y + 24)
    ctx.lineTo(x - 22, y - 8)
    ctx.lineTo(x - 4, y + 40)
    ctx.lineTo(x - 16, y + 10)
    ctx.lineTo(x + 2, y + 54)
    ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x + 80, y + 24)
    ctx.lineTo(x + 106, y - 8)
    ctx.lineTo(x + 88, y + 40)
    ctx.lineTo(x + 100, y + 10)
    ctx.lineTo(x + 82, y + 54)
    ctx.closePath(); ctx.fill()
    // 头
    ctx.fillStyle = '#8b2020'
    ctx.beginPath()
    ctx.ellipse(x + 42, y + 8, 20, 18, 0, 0, Math.PI * 2); ctx.fill()
    // 角
    ctx.fillStyle = '#333'
    ctx.beginPath()
    ctx.moveTo(x + 26, y - 2)
    ctx.lineTo(x + 14, y - 26)
    ctx.lineTo(x + 22, y - 22)
    ctx.lineTo(x + 30, y - 6); ctx.closePath(); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x + 58, y - 2)
    ctx.lineTo(x + 70, y - 26)
    ctx.lineTo(x + 62, y - 22)
    ctx.lineTo(x + 54, y - 6); ctx.closePath(); ctx.fill()
    // 眼睛
    ctx.fillStyle = '#ff0'
    ctx.beginPath()
    ctx.ellipse(x + 32, y + 6, 5, 4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 52, y + 6, 5, 4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#222'
    ctx.beginPath()
    ctx.ellipse(x + 33, y + 7, 2, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.ellipse(x + 53, y + 7, 2, 3, 0, 0, Math.PI * 2); ctx.fill()
  }

  // ========== 道具绘制 ==========
  drawItem(ctx: CanvasRenderingContext2D, x: number, y: number, type: string, frame: number) {
    const bob = Math.sin(frame * 0.2) * 2
    ctx.save()
    this.pixel(ctx)
    const cy = y + bob

    switch (type) {
      case 'health':
        // 红心
        ctx.fillStyle = '#e74c3c'
        ctx.beginPath()
        ctx.arc(x + 6, cy + 5, 5, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath()
        ctx.arc(x + 14, cy + 5, 5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#e74c3c'
        ctx.beginPath()
        ctx.moveTo(x + 2, cy + 6)
        ctx.lineTo(x + 10, cy + 16)
        ctx.lineTo(x + 18, cy + 6)
        ctx.fill()
        // 高光
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.ellipse(x + 5, cy + 3, 2, 2, 0, 0, Math.PI * 2); ctx.fill()
        break
      case 'mana':
        // 蓝瓶
        ctx.fillStyle = '#3498db'
        ctx.fillRect(x + 5, cy + 2, 10, 14)
        ctx.fillStyle = '#5dade2'
        ctx.fillRect(x + 6, cy + 4, 4, 8)
        ctx.fillStyle = '#2980b9'
        ctx.fillRect(x + 7, cy, 6, 4)
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.ellipse(x + 10, cy + 8, 2, 2, 0, 0, Math.PI * 2); ctx.fill()
        break
      case 'coin_bronze':
        ctx.fillStyle = '#cd7f32'
        ctx.beginPath()
        ctx.ellipse(x + 8, cy + 6, 8, 6, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#e8a85f'
        ctx.beginPath()
        ctx.ellipse(x + 8, cy + 5, 6, 4, 0, 0, Math.PI * 2); ctx.fill()
        break
      case 'coin_silver':
        ctx.fillStyle = '#c0c0c0'
        ctx.beginPath()
        ctx.ellipse(x + 8, cy + 6, 8, 6, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#e0e0e0'
        ctx.beginPath()
        ctx.ellipse(x + 8, cy + 5, 6, 4, 0, 0, Math.PI * 2); ctx.fill()
        break
      case 'coin_gold':
        ctx.fillStyle = '#daa520'
        ctx.beginPath()
        ctx.ellipse(x + 8, cy + 6, 8, 6, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffd700'
        ctx.beginPath()
        ctx.ellipse(x + 8, cy + 5, 6, 4, 0, 0, Math.PI * 2); ctx.fill()
        break
    }
    ctx.restore()
  }

  // ========== 子弹/投射物 ==========
  drawProjectile(ctx: CanvasRenderingContext2D, x: number, y: number, type: string, w: number, h: number) {
    ctx.save()
    this.pixel(ctx)
    switch (type) {
      case 'player_slash':
        ctx.fillStyle = '#ffd700'
        ctx.beginPath()
        ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(x + w / 2, y + h / 2, 4, 0, Math.PI * 2); ctx.fill()
        break
      case 'dark_bolt':
        ctx.fillStyle = '#8800ff'
        ctx.beginPath()
        ctx.arc(x + w / 2, y + h / 2, 6, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#aa44ff'
        ctx.beginPath()
        ctx.arc(x + w / 2, y + h / 2, 3, 0, Math.PI * 2); ctx.fill()
        break
      case 'fire_ball':
        ctx.fillStyle = '#ff4500'
        ctx.beginPath()
        ctx.arc(x + w / 2, y + h / 2, 8, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffaa00'
        ctx.beginPath()
        ctx.arc(x + w / 2, y + h / 2, 4, 0, Math.PI * 2); ctx.fill()
        break
      case 'boss_charge':
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(x, y, w, h)
        ctx.fillStyle = '#ffff00'
        ctx.fillRect(x + 4, y + 2, w - 8, h - 4)
        break
      default:
        ctx.fillStyle = '#ff0'
        ctx.fillRect(x, y, w, h)
    }
    ctx.restore()
  }

  // ========== 背景绘制 ==========
  drawBackground(ctx: CanvasRenderingContext2D, levelId: number, scrollX: number, w: number, h: number) {
    this.pixel(ctx)
    const themes: Record<number, { sky: string[]; mountains: string; ground: string }> = {
      1: { sky: ['#87CEEB', '#b0e0e6', '#add8e6'], mountains: '#6b8e23', ground: '#8B7355' },
      2: { sky: ['#4a4a6a', '#6a6a8a', '#3a3a5a'], mountains: '#3d5a3d', ground: '#5a4a3a' },
      3: { sky: ['#8B0000', '#a01010', '#6a0000'], mountains: '#2a2a2a', ground: '#4a2a1a' },
      4: { sky: ['#1a1a3a', '#2a2a5a', '#0a0a2a'], mountains: '#1a2a1a', ground: '#2a1a1a' },
      5: { sky: ['#1a0a2e', '#2d1b4e', '#0a0a1a'], mountains: '#1a1a1a', ground: '#1a0a1a' },
    }
    const theme = themes[levelId] ?? themes[1]!

    // 天空渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.6)
    theme.sky.forEach((c, i) => grad.addColorStop(i / (theme.sky.length - 1), c))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h * 0.6)

    // 远山
    ctx.fillStyle = theme.mountains
    for (let i = 0; i < 12; i++) {
      const mx = i * 120 - (scrollX * 0.2) % 120
      const mh = 60 + Math.sin(i * 1.7) * 40
      ctx.beginPath()
      ctx.moveTo(mx, h * 0.6)
      ctx.lineTo(mx + 60, h * 0.6 - mh)
      ctx.lineTo(mx + 120, h * 0.6)
      ctx.fill()
    }

    // 近景树
    ctx.fillStyle = theme.ground
    for (let i = 0; i < 16; i++) {
      const tx = i * 80 - (scrollX * 0.5) % 80
      const th = 30 + Math.sin(i * 2.3) * 15
      ctx.fillRect(tx + 2, h * 0.6 - th, 14, th)
      ctx.fillStyle = theme.sky[0] ?? '#87CEEB'
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.arc(tx + 9, h * 0.6 - th, 16, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = theme.ground
    }

    // 地面
    ctx.fillStyle = theme.ground
    ctx.fillRect(0, h * 0.65, w, h * 0.35)
    // 地面纹理
    ctx.fillStyle = this.darken(theme.ground, 0.9)
    for (let i = 0; i < 30; i++) {
      ctx.fillRect(i * 40 - (scrollX * 0.1) % 40, h * 0.65 + (i % 4) * 6, 20, 2)
    }
  }

  private darken(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`
  }

  // ========== 血条绘制 ==========
  drawHPBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, hp: number, maxHp: number, isBoss: boolean = false) {
    this.pixel(ctx)
    const ratio = Math.max(0, hp / maxHp)
    const barH = isBoss ? 8 : 4
    const barY = y - 12

    // 背景
    ctx.fillStyle = '#333'
    ctx.fillRect(x, barY, w, barH)
    // 边框
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.strokeRect(x, barY, w, barH)

    // 血量
    const color = ratio > 0.6 ? '#4cd137' : ratio > 0.3 ? '#f39c12' : '#e74c3c'
    ctx.fillStyle = color
    ctx.fillRect(x + 1, barY + 1, (w - 2) * ratio, barH - 2)

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillRect(x + 1, barY + 1, (w - 2) * ratio, (barH - 2) / 2)
  }
}
