// ============ 宠物系统：跟随玩家、自动攻击 ============
import type { PetConfig, Direction, Rect } from '../types'

// 简化的目标类型，兼容 Enemy 和 Boss 类
interface TargetLike {
  x: number
  y: number
  width: number
  height: number
  isAlive: boolean
}

export class PetEntity {
  config: PetConfig
  x: number
  y: number
  vx: number = 0
  vy: number = 0
  width: number = 24
  height: number = 24
  dir: Direction = 'right'
  animFrame: number = 0
  attackTimer: number = 0
  onGround: boolean = false

  constructor(config: PetConfig, x: number, y: number) {
    this.config = config
    this.x = x
    this.y = y
  }

  update(playerX: number, playerY: number, playerW: number, playerH: number, platforms: { x: number; y: number; width: number; height: number; type: string }[], enemies: TargetLike[], boss: TargetLike | null, dt: number = 1) {
    // 跟随玩家：飞在玩家身后上方
    const targetX = playerX + (playerW - this.width) / 2 - (this.dir === 'right' ? 30 : -30)
    const targetY = playerY - 20 + Math.sin(this.animFrame * 0.1) * 3

    // 平滑移动到目标位置（飞行宠物，不依赖平台）
    this.vx = (targetX - this.x) * 0.15
    this.vy = (targetY - this.y) * 0.15
    this.x += this.vx
    this.y += this.vy

    // 方向跟随玩家
    this.dir = (this.vx > 0.5) ? 'right' : (this.vx < -0.5) ? 'left' : this.dir

    // 寻找最近敌人
    const target = this.findNearestEnemy(playerX, enemies, boss)
    if (target) {
      // 调整朝向
      const targetCx = target.x + target.width / 2
      const playerCx = playerX + playerW / 2
      this.dir = targetCx > playerCx ? 'right' : 'left'
    }

    // 攻击计时
    if (this.attackTimer > 0) this.attackTimer--
    this.animFrame += 0.1

    return this.tryAttack(target)
  }

  private findNearestEnemy(playerX: number, enemies: TargetLike[], boss: TargetLike | null): { x: number; y: number; width: number; height: number } | null {
    let nearest: { x: number; y: number; width: number; height: number; dist: number } | null = null
    const maxRange = 400  // 攻击范围

    for (const e of enemies) {
      if (!e.isAlive) continue
      const dx = e.x - playerX
      const dist = Math.abs(dx)
      if (dist > maxRange) continue
      if (!nearest || dist < nearest.dist) {
        nearest = { x: e.x, y: e.y, width: e.width, height: e.height, dist }
      }
    }

    if (boss && boss.isAlive) {
      const dist = Math.abs(boss.x - playerX)
      if (dist < maxRange && (!nearest || dist < nearest.dist)) {
        nearest = { x: boss.x, y: boss.y, width: boss.width, height: boss.height, dist }
      }
    }

    return nearest
  }

  private tryAttack(target: { x: number; y: number; width: number; height: number } | null): { fire: boolean; targetX: number; targetY: number } | null {
    if (!target) return null
    if (this.attackTimer > 0) return null
    this.attackTimer = this.config.attackInterval
    return {
      fire: true,
      targetX: target.x + target.width / 2,
      targetY: target.y + target.height / 2,
    }
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height }
  }
}

// 绘制宠物
export function drawPet(ctx: CanvasRenderingContext2D, pet: PetEntity) {
  const { x, y, width: w, height: h, config, animFrame, dir } = pet
  ctx.save()

  // 方向翻转
  const cx = x + w / 2
  if (dir === 'left') {
    ctx.translate(cx * 2, 0)
    ctx.scale(-1, 1)
  }

  // 呼吸光晕
  const pulse = (Math.sin(animFrame * 0.15) + 1) / 2
  ctx.shadowColor = config.color
  ctx.shadowBlur = 8 + pulse * 6

  // 主体（圆形能量体）
  ctx.fillStyle = config.color
  ctx.beginPath()
  ctx.arc(x + w / 2, y + h / 2, w / 2 - 2, 0, Math.PI * 2)
  ctx.fill()

  // 内核
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath()
  ctx.arc(x + w / 2 - 2, y + h / 2 - 2, w / 4, 0, Math.PI * 2)
  ctx.fill()

  // 眼睛
  ctx.fillStyle = '#000'
  ctx.fillRect(x + 8, y + 10, 2, 3)
  ctx.fillRect(x + 14, y + 10, 2, 3)

  // 表情图标作为标识（小角标）
  ctx.font = '8px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillText(config.icon, x + w / 2, y - 2)

  ctx.restore()
}
