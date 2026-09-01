import type { BossConfig, BossPhase, BossPattern, Rect, Direction } from '../types'
import { drawBossSprite } from '../engine/AssetLoader'

/** 招式状态：休整(追击) → 起手(蓄力) → 释放(出招) → 恢复(硬直) */
type PatternState = 'rest' | 'windup' | 'active' | 'recover'

/** 每种招式在状态机中的持续帧数（起手/释放/恢复） */
const PATTERN_TIMING: Record<BossPattern, { windup: number; active: number; recover: number }> = {
  melee:      { windup: 12, active: 22, recover: 12 },
  projectile: { windup: 10, active: 30, recover: 12 },
  charge:     { windup: 32, active: 28, recover: 18 },
  summon:     { windup: 40, active: 10, recover: 26 },
  aoe:        { windup: 34, active: 14, recover: 30 },
  spin:       { windup: 14, active: 60, recover: 16 },
}

export class Boss {
  x: number
  y: number
  hp: number
  maxHp: number
  width: number
  height: number
  config: BossConfig
  currentPhase: number = 0
  isAlive: boolean = true
  dir: Direction = 'left'
  vx: number = 0
  vy: number = 0

  /** 当前正在使用（或即将使用）的招式 */
  currentPattern: BossPattern

  private patternState: PatternState = 'rest'
  private patternTimer: number = 0
  private lastPattern: BossPattern | null = null
  private shootCooldown: number = 0
  private meleeFired: boolean = false
  private aoeFired: boolean = false
  private summonFired: boolean = false
  private random: () => number

  private attackTimer: number = 0
  private specialTimer: number = 0
  private summonTimer: number = 0
  private phase2Timer: number = 0
  private spinAngle: number = 0
  private isSpinning: boolean = false
  private groundLevel: number = 0
  animFrame: number = 0
  private hitFlash: number = 0

  /** 受伤回避计时：被击中后短暂拉开距离并跳跃，防止被站桩连打 */
  private lastHitTimer: number = 999
  /** 阶段切换后的狂暴加速剩余帧 */
  private rageTimer: number = 0

  constructor(config: BossConfig, x: number, y: number, groundY: number, random: () => number = Math.random) {
    this.config = config
    this.x = x
    this.y = y
    this.hp = config.maxHp
    this.maxHp = config.maxHp
    this.width = config.width
    this.height = config.height
    this.groundLevel = groundY
    this.random = random
    this.currentPattern = this.patternList[0]!
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height }
  }

  get phase(): BossPhase {
    return this.config.phases[this.currentPhase] ?? this.config.phases[0]!
  }

  /** 当前阶段可用的招式组合（未配置 patterns 时退化为单招式，向后兼容） */
  get patternList(): BossPattern[] {
    const list = this.phase.patterns
    return list && list.length > 0 ? list : [this.phase.pattern]
  }

  /** 是否处于出招状态（起手/释放），用于驱动精灵攻击帧 */
  get attacking(): boolean {
    return this.patternState === 'windup' || this.patternState === 'active'
  }

  update(playerX: number, playerY: number, _dt: number = 1) {
    if (!this.isAlive) return
    this.animFrame++
    if (this.hitFlash > 0) this.hitFlash--

    // 阶段切换
    const hpRatio = this.hp / this.maxHp
    if (this.config.phases.length >= 3 && hpRatio < this.config.phases[2]!.hpThreshold) {
      if (this.currentPhase !== 2) { this.currentPhase = 2; this.onPhaseChange() }
    } else if (this.config.phases.length >= 2 && hpRatio < this.config.phases[1]!.hpThreshold) {
      if (this.currentPhase !== 1) { this.currentPhase = 1; this.onPhaseChange() }
    }

    this.attackTimer++
    this.specialTimer++
    this.summonTimer++
    this.phase2Timer++
    this.patternTimer++
    this.shootCooldown++
    this.lastHitTimer++
    if (this.rageTimer > 0) this.rageTimer--

    const dx = playerX - this.x
    const dy = playerY - this.y
    this.dir = dx > 0 ? 'right' : 'left'

    // ===== 招式状态机：休整 → 起手 → 释放 → 恢复 → 休整 =====
    switch (this.patternState) {
      case 'rest': {
        this.executeRest(dx, dy)
        // 休整至少持续 attackInterval 帧（相当于出招冷却），之后进入下一招的起手
        if (this.patternTimer >= Math.max(this.phase.attackInterval, 24)) {
          this.enterState('windup')
        }
        break
      }
      case 'windup': {
        // 起手/蓄力：站定不动，攒出攻击气势
        this.vx = 0
        const t = PATTERN_TIMING[this.currentPattern]
        if (this.patternTimer >= t.windup) {
          this.meleeFired = false
          this.aoeFired = false
          this.summonFired = false
          this.shootCooldown = 8
          this.enterState('active')
        }
        break
      }
      case 'active': {
        this.executeActive(dx, dy)
        const t = PATTERN_TIMING[this.currentPattern]
        if (this.patternTimer >= t.active) {
          this.enterState('recover')
        }
        break
      }
      case 'recover': {
        this.executeRecover(dx, dy)
        const t = PATTERN_TIMING[this.currentPattern]
        if (this.patternTimer >= t.recover) {
          // 阶段 2+ 连招：大概率直接衔接下一招，形成持续压制
          const chainChance = this.currentPhase >= 1 ? 0.24 + this.currentPhase * 0.08 : 0
          if (this.random() < chainChance && this.patternList.length > 1) {
            this.enterState('windup')
            this.pickNextPattern(dx)
          } else {
            this.enterState('rest')
            this.pickNextPattern(dx)
          }
        }
        break
      }
    }

    // 重力
    this.vy += 0.8
    if (this.vy > 12) this.vy = 12
    this.x += this.vx
    this.y += this.vy
    if (this.y >= this.groundLevel - this.height) {
      this.y = this.groundLevel - this.height
      this.vy = 0
    }
    if (this.y < 0) this.y = 0
  }

  private enterState(state: PatternState) {
    this.patternState = state
    this.patternTimer = 0
  }

  /** 阶段内招式轮换：绝不连续重复，且按玩家距离智能加权 */
  private pickNextPattern(dx: number) {
    const list = this.patternList
    if (list.length <= 1) {
      this.currentPattern = list[0]!
      this.lastPattern = this.currentPattern
      return
    }
    const candidates = list.filter(p => p !== this.lastPattern)
    const pool = candidates.length > 0 ? candidates : list
    const dist = Math.abs(dx)
    // 智能权重：贴脸偏好近战/冲锋/旋转，拉开距离偏好弹幕/范围/召唤
    const weights = pool.map(p => {
      let w = 1
      if (p === 'melee' || p === 'charge' || p === 'spin') {
        w += dist < 150 ? 2.4 : dist < 260 ? 0.9 : 0.15
      }
      if (p === 'projectile' || p === 'aoe' || p === 'summon') {
        w += dist > 240 ? 2.4 : dist > 120 ? 1.1 : 0.2
      }
      if (this.currentPhase >= 1 && p === 'summon') w += 0.5
      if (this.currentPhase >= 2 && p === 'aoe') w += 0.4
      return w
    })
    let total = 0
    for (const w of weights) total += w
    let roll = this.random() * total
    let picked = pool[pool.length - 1]!
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i]!
      if (roll <= 0) { picked = pool[i]!; break }
    }
    this.currentPattern = picked
    this.lastPattern = this.currentPattern
  }

  private onPhaseChange() {
    this.attackTimer = 0
    this.specialTimer = 0
    this.isSpinning = false
    this.patternState = 'rest'
    this.patternTimer = 0
    this.currentPattern = this.patternList[0]!
    this.lastPattern = this.currentPattern
    // 狂暴加速 + BOSS跳跃动画
    this.rageTimer = 90
    this.vy = -18
  }

  /** 休整：受伤后回避、贴近玩家、按招式类型保持距离 */
  private executeRest(dx: number, _dy: number) {
    const speed = this.phase.speed * (this.rageTimer > 0 ? 1.5 : 1)
    const dist = Math.abs(dx)

    // 受伤回避：后撤 + 跳跃，防止站桩输出
    if (this.lastHitTimer < 55) {
      this.vx = dx > 0 ? -speed : speed
      if (this.vy === 0 && this.lastHitTimer < 42 && this.random() < 0.65) {
        this.vy = -12
      }
      return
    }

    const meleeish = this.currentPattern === 'melee' || this.currentPattern === 'charge' || this.currentPattern === 'spin'
    if (meleeish) {
      // 近战逼近：贴脸 + 小跳（防止被风筝）
      if (dist > 80) {
        this.vx = dx > 0 ? speed : -speed
      } else {
        this.vx = Math.sin(this.attackTimer * 0.12) * 0.7
        if (this.attackTimer % 50 === 0 && this.vy === 0 && this.random() < 0.5) {
          this.vy = -10
        }
      }
    } else {
      // 远程/范围：保持理想距离 200~280
      const ideal = 240
      if (dist > ideal + 60) {
        this.vx = dx > 0 ? speed : -speed
      } else if (dist < ideal - 80) {
        this.vx = dx > 0 ? -speed : speed
      } else {
        this.vx = 0
      }
    }
  }

  /** 释放阶段：执行招式动作 */
  private executeActive(dx: number, _dy: number) {
    switch (this.currentPattern) {
      case 'melee':
        // 近战逼近，贴身出拳（伤害由 GameScene 在 active 窗口消费）
        this.vx = Math.abs(dx) > 40 ? (dx > 0 ? this.phase.speed : -this.phase.speed) : 0
        break
      case 'projectile':
        // 保持距离 + 射击窗口（shootCooldown 控制连发节奏）
        {
          const idealDist = 220
          if (Math.abs(dx) > idealDist) {
            this.vx = dx > 0 ? 1 : -1
          } else if (Math.abs(dx) < idealDist - 100) {
            this.vx = dx > 0 ? -1.2 : 1.2
          } else {
            this.vx = 0
          }
        }
        break
      case 'charge':
        // 冲锋：全速撞向玩家
        this.vx = this.dir === 'right' ? this.phase.speed * 1.6 : -this.phase.speed * 1.6
        break
      case 'summon':
        // 召唤：后撤拉开距离呼叫援军
        this.vx = Math.abs(dx) < 260 ? (dx > 0 ? -2 : 2) : 0
        break
      case 'aoe':
        // 范围技：原地站定，落地冲击
        this.vx = 0
        break
      case 'spin':
        // 旋转突进：速度随阶段提升，且中途会朝玩家方向转向
        this.isSpinning = true
        this.spinAngle += 0.15
        if (this.patternTimer % 14 === 0) {
          this.dir = dx > 0 ? 'right' : 'left'
        }
        this.vx = this.dir === 'right' ? 4 + this.phase.speed * 0.6 : -(4 + this.phase.speed * 0.6)
        break
    }
  }

  /** 恢复阶段：收招硬直，速度衰减 */
  private executeRecover(dx: number, _dy: number) {
    this.isSpinning = false
    this.vx *= 0.85
    if (Math.abs(this.vx) < 0.5) this.vx = 0
    void dx
  }

  wantsToAttack(): boolean {
    if (this.currentPattern !== 'melee') return false
    if (this.patternState !== 'active') return false
    if (this.meleeFired || this.patternTimer < 4) return false
    this.meleeFired = true
    this.attackTimer = 0
    return true
  }

  wantsToShoot(): boolean {
    if (this.currentPattern !== 'projectile') return false
    if (this.patternState !== 'active') return false
    if (this.shootCooldown < 10) return false
    this.shootCooldown = 0
    this.attackTimer = 0
    return true
  }

  wantsAreaAttack(): boolean {
    if (this.currentPattern !== 'aoe') return false
    if (this.patternState !== 'active') return false
    if (this.aoeFired || this.patternTimer < 2) return false
    this.aoeFired = true
    this.specialTimer = 0
    return true
  }

  wantsToCharge(): boolean {
    if (this.currentPattern !== 'charge') return false
    // 冲锋起跑的瞬间触发（蓄力已完成）
    if (this.patternState === 'active' && this.patternTimer === 1) {
      return true
    }
    return false
  }

  isSpinningNow(): boolean {
    return this.currentPattern === 'spin' && this.patternState === 'active'
  }

  willSummon(): boolean {
    return this.currentPattern === 'summon' && this.patternState === 'active' && !this.summonFired
  }

  consumeSummon(): void {
    this.summonFired = true
  }

  getAttackDamage(): number {
    return this.phase.attackDamage + Math.floor(Math.random() * 5)
  }

  takeDamage(amount: number): number {
    this.hp -= Math.floor(amount * 0.85) // Boss有15%减伤（数值更高但配合血量提升）
    this.hitFlash = 8
    this.lastHitTimer = 0
    if (this.hp <= 0) {
      this.hp = 0
      this.isAlive = false
    }
    return amount
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.isAlive) return
    if (this.hitFlash > 0 && this.hitFlash % 4 < 2) {
      ctx.globalAlpha = 0.6
    }
    drawBossSprite(
      ctx, this.x, this.y, this.width, this.height,
      this.config.name, this.currentPhase,
      Math.floor(this.animFrame),
      this.attacking
    )
    ctx.globalAlpha = 1
  }
}

