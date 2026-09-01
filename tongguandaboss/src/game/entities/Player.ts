import type { KeyState, Direction, WeaponType, WeaponStats, Platform, Rect, PlayerStats, AttackBox } from '../types'
import { getNextWeapon, getWeaponByIndex } from './Weapon'
import { getWeaponStatsFor, getArmorSpec, type ArmorSpec } from './Equipment'
import { drawPlayerSprite } from '../engine/AssetLoader'
import type { Enemy } from './Enemy'
import type { Boss } from './Boss'

export class Player {
  x: number
  y: number
  vx: number = 0
  vy: number = 0
  onGround: boolean = false
  dir: Direction = 'right'

  // 状态
  hp: number = 100
  maxHp: number = 100
  mp: number = 100
  maxMp: number = 100
  level: number = 1
  exp: number = 0
  expToNext: number = 100
  attack: number = 10
  defense: number = 5
  speed: number = 4
  jumpForce: number = 14
  coins: number = 0

  // 武器
  currentWeapon: WeaponType = 'sword'
  currentWeaponStats: WeaponStats

  // ==== 装备系统 ====
  /** 各武器类型当前装备的武器（含阶数加成） */
  equippedWeapons: Record<WeaponType, WeaponStats>
  /** 各武器类型当前使用/装备的阶数 0-4 */
  weaponTiers: Record<WeaponType, number>
  /** 各武器类型已经获得过的阶数集合（用于装备栏显示） */
  weaponInventory: Record<WeaponType, number[]>
  /** 当前护甲（null=未获得） */
  armorSlot: ArmorSpec | null
  /** 已经获得过的护甲阶数集合 */
  armorInventory: number[]

  // 攻击
  attacking: boolean = false
  attackTimer: number = 0
  attackCooldown: number = 0

  // 技能冷却
  skill1Cooldown: number = 0
  skill2Cooldown: number = 0
  ultimateCooldown: number = 0
  skill1MaxCD: number = 90
  skill2MaxCD: number = 180
  ultimateMaxCD: number = 300

  // 攻击动画
  attackMaxTimer: number = 0
  attackProgress: number = 0
  // 本轮攻击已经命中过的目标（避免同一挥砍多次伤害）
  private hitTargets: Set<Enemy | Boss> = new Set()

  // 按键追踪（用于边缘检测）
  private lastInput: KeyState | null = null

  // 动画
  animFrame: number = 0
  animTimer: number = 0
  invincible: boolean = false
  private invincibleTimer: number = 0
  private canDoubleJump: boolean = false
  private hasDoubleJumped: boolean = false
  private jumpHeld: boolean = false
  width: number = 32
  height: number = 56
  // 坠落判定阈值：超出此 y 坐标视为掉出地图（画布高 640 + 缓冲 80）
  private fallLimit: number = 720
  private switchCooldown: number = 0
  private hitFlash: number = 0

  /** 减速状态（蛛网/灵魂汲取）：>0 时移动速度减半 */
  slowTimer: number = 0
  /** 石化状态（石像鬼凝视）：>0 时完全无法移动/跳跃 */
  petrifyTimer: number = 0
  /** 中毒状态（沙蝎毒刺/毒液弹）：>0 时每 30 帧扣 3 点真实生命 */
  poisonTimer: number = 0
  /** 陷入流沙（沙漠陷阱）：减速且无法跳跃 */
  sinking: boolean = false

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.equippedWeapons = {
      sword: getWeaponStatsFor('sword', 0),
      spear: getWeaponStatsFor('spear', 0),
      bow: getWeaponStatsFor('bow', 0),
      gun: getWeaponStatsFor('gun', 0)
    }
    this.weaponTiers = { sword: 0, spear: 0, bow: 0, gun: 0 }
    this.weaponInventory = { sword: [0], spear: [0], bow: [0], gun: [0] }
    this.armorSlot = null
    this.armorInventory = []
    this.currentWeaponStats = this.equippedWeapons['sword']
  }

  /** 护甲提供的额外防御 */
  get armorDefense(): number {
    return this.armorSlot?.defense ?? 0
  }

  /** 护甲提供的额外攻击 */
  get armorAttackBonus(): number {
    return this.armorSlot?.attackBonus ?? 0
  }

  /** 拾取武器：收录进收藏；若比当前装备更高阶则自动装备 */
  learnWeapon(type: WeaponType, tier: number): { equipped: boolean; tier: number } {
    if (tier > this.weaponTiers[type]) {
      this.equipWeapon(type, tier)
      return { equipped: true, tier }
    }
    if (!this.weaponInventory[type].includes(tier)) this.weaponInventory[type].push(tier)
    return { equipped: false, tier: this.weaponTiers[type] }
  }

  /** 装备指定阶数的武器（替换同类旧武器） */
  equipWeapon(type: WeaponType, tier: number) {
    const stats = getWeaponStatsFor(type, tier)
    this.equippedWeapons[type] = stats
    this.weaponTiers[type] = tier
    if (!this.weaponInventory[type].includes(tier)) this.weaponInventory[type].push(tier)
    if (this.currentWeapon === type) this.currentWeaponStats = stats
  }

  /** 拾取护甲：收录进收藏；若比当前护甲更高阶则自动装备 */
  learnArmor(tier: number): { equipped: boolean; tier: number } {
    const cur = this.armorSlot?.tier ?? -1
    if (tier > cur) {
      this.equipArmor(tier)
      return { equipped: true, tier }
    }
    if (!this.armorInventory.includes(tier)) this.armorInventory.push(tier)
    return { equipped: false, tier: cur }
  }

  /** 装备指定阶数的护甲（替换旧护甲，生命加成随之变化） */
  equipArmor(tier: number) {
    const spec = getArmorSpec(tier)
    if (!spec) return
    if (this.armorSlot) this.maxHp -= this.armorSlot.hpBonus
    this.armorSlot = { ...spec }
    this.maxHp += spec.hpBonus
    this.hp = Math.min(this.maxHp, this.hp + spec.hpBonus)
    if (!this.armorInventory.includes(tier)) this.armorInventory.push(tier)
  }

  /** 卸下护甲（仅在极端情况下使用，保留收藏） */
  unequipArmor() {
    if (this.armorSlot) this.maxHp -= this.armorSlot.hpBonus
    this.armorSlot = null
    this.hp = Math.min(this.hp, this.maxHp)
  }

  get rect(): Rect {
    return { x: this.x + 4, y: this.y + 4, width: this.width - 8, height: this.height - 4 }
  }

  get attackBox(): AttackBox {
    const ws = this.currentWeaponStats
    return {
      x: this.dir === 'right' ? this.x + this.width / 2 : this.x - ws.range,
      y: this.y - 5,
      width: ws.range,
      height: this.height + 10
    }
  }

  getStats(): PlayerStats {
    return {
      x: this.x, y: this.y,
      vx: this.vx, vy: this.vy,
      onGround: this.onGround,
      dir: this.dir,
      hp: this.hp, maxHp: this.maxHp,
      mp: this.mp, maxMp: this.maxMp,
      level: this.level, exp: this.exp, expToNext: this.expToNext,
      attack: this.attack, defense: this.defense,
      speed: this.speed, jumpForce: this.jumpForce,
      skillCooldowns: {
        skill1: { current: this.skill1Cooldown, max: this.skill1MaxCD },
        skill2: { current: this.skill2Cooldown, max: this.skill2MaxCD },
        ultimate: { current: this.ultimateCooldown, max: this.ultimateMaxCD }
      },
      currentWeapon: this.currentWeapon,
      weaponName: this.currentWeaponStats.name,
      weaponTier: this.currentWeaponStats.tier ?? 0,
      weaponTiers: { ...this.weaponTiers },
      armorTier: this.armorSlot?.tier ?? -1,
      armorName: this.armorSlot?.name ?? '',
      coins: this.coins,
      attacking: this.attacking,
      attackTimer: this.attackTimer,
      width: this.width, height: this.height,
      invincible: this.invincible,
      animFrame: this.animFrame,
      animTimer: this.animTimer
    }
  }

  update(input: KeyState, platforms: Platform[], dt: number = 1) {
    this.animTimer++

    // 按键边缘检测（防漏键）
    const justPressed = this.lastInput ? {
      attack: input.attack && !this.lastInput.attack,
      skill1: input.skill1 && !this.lastInput.skill1,
      skill2: input.skill2 && !this.lastInput.skill2,
      ultimate: input.ultimate && !this.lastInput.ultimate,
      switchWeapon: input.switchWeapon && !this.lastInput.switchWeapon,
    } : input  // 第一帧全部当作按下
    this.lastInput = { ...input }

    // 计时器
    if (this.attackTimer > 0) {
      this.attackTimer--
      if (this.attackTimer <= 0) {
        this.attacking = false
        this.attackProgress = 0
        this.attackMaxTimer = 0
      } else {
        this.attackProgress = 1 - this.attackTimer / this.attackMaxTimer
      }
    }
    if (this.attackCooldown > 0) this.attackCooldown--
    if (this.skill1Cooldown > 0) this.skill1Cooldown--
    if (this.skill2Cooldown > 0) this.skill2Cooldown--
    if (this.ultimateCooldown > 0) this.ultimateCooldown--
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--
      if (this.invincibleTimer <= 0) this.invincible = false
    }
    if (this.switchCooldown > 0) this.switchCooldown--
    if (this.hitFlash > 0) this.hitFlash--
    if (this.slowTimer > 0) this.slowTimer--
    if (this.petrifyTimer > 0) this.petrifyTimer--
    if (this.poisonTimer > 0) this.poisonTimer--
    // 中毒持续掉血（真实伤害，无视防御）
    if (this.poisonTimer > 0 && this.poisonTimer % 30 === 0) this.hp -= 3

    // 移动
    this.vx = 0
    const speedMul = this.slowTimer > 0 || this.sinking ? 0.45 : 1
    const frozen = this.petrifyTimer > 0
    if (input.left && !frozen) {
      this.vx = -this.speed * speedMul
      this.dir = 'left'
    }
    if (input.right && !frozen) {
      this.vx = this.speed * speedMul
      this.dir = 'right'
    }

    // 跳跃（流沙中无法起跳）
    if (input.jump && !this.jumpHeld && !this.sinking && !frozen) {
      this.jumpHeld = true
      if (this.onGround) {
        this.vy = -this.jumpForce
        this.onGround = false
        this.canDoubleJump = true
        this.hasDoubleJumped = false
      } else if (this.canDoubleJump && !this.hasDoubleJumped) {
        this.vy = -this.jumpForce * 0.75
        this.hasDoubleJumped = true
        this.canDoubleJump = false
      }
    }
    if (!input.jump) this.jumpHeld = false

    // 切换武器（Tab循环切换）
    if (input.switchWeapon && this.switchCooldown <= 0) {
      this.currentWeapon = getNextWeapon(this.currentWeapon)
      this.currentWeaponStats = this.equippedWeapons[this.currentWeapon]
      this.switchCooldown = 15
    }

    // 数字键1-4直接选择武器
    if (input.directWeapon >= 0 && this.switchCooldown <= 0) {
      const target = getWeaponByIndex(input.directWeapon)
      if (target && target !== this.currentWeapon) {
        this.currentWeapon = target
        this.currentWeaponStats = this.equippedWeapons[this.currentWeapon]
        this.switchCooldown = 10
      }
    }

    // 技能1 - 剑气斩 / 突刺 / 多重箭 / 榴弹
    if (justPressed.skill1 && this.skill1Cooldown <= 0 && this.mp >= 15) {
      this.skill1Cooldown = this.skill1MaxCD
      this.mp -= 15
      this.startAttack(12)
    }

    // 技能2 - 回旋斩 / 龙卷 / 箭雨 / 激光炮
    if (justPressed.skill2 && this.skill2Cooldown <= 0 && this.mp >= 30) {
      this.skill2Cooldown = this.skill2MaxCD
      this.mp -= 30
      this.startAttack(18)
    }

    // 大招
    if (justPressed.ultimate && this.ultimateCooldown <= 0 && this.mp >= 50) {
      this.ultimateCooldown = this.ultimateMaxCD
      this.mp -= 50
      this.startAttack(30)
    }

    // 普通攻击
    if (justPressed.attack && this.attackCooldown <= 0) {
      if (this.mp >= this.currentWeaponStats.energyCost) {
        this.attackCooldown = this.currentWeaponStats.attackSpeed
        this.mp -= this.currentWeaponStats.energyCost
        this.startAttack(12)
      }
    }

    // 物理
    this.vy += 0.8 // 重力
    if (this.vy > 15) this.vy = 15

    // 水平移动
    this.x += this.vx

    // 水平碰撞检测：只对玩家身体高度范围相交的平台做碰撞
    if (this.vx !== 0) {
      const prr = this.rect
      const playerTop = prr.y
      const playerBottom = prr.y + prr.height

      for (const plat of platforms) {
        const platTop = plat.y
        const platBottom = plat.y + plat.height

        // 跳过脚下的地面平台：玩家站在上面时不触发水平碰撞
        if (playerBottom <= platTop + 6) continue
        // 跳过头顶的：玩家完全在平台上方时也不水平碰撞
        if (playerTop >= platBottom) continue

        if (this.aabb(prr.x, prr.y, prr.width, prr.height, plat.x, plat.y, plat.width, plat.height)) {
          if (this.vx > 0) this.x = plat.x - this.width + 4
          else if (this.vx < 0) this.x = plat.x + plat.width - 4
          this.vx = 0
          break
        }
      }
    }

    // 垂直移动
    this.y += this.vy
    this.onGround = false

    for (const plat of platforms) {
      if (this.aabb(this.rect.x, this.rect.y, this.rect.width, this.rect.height, plat.x, plat.y, plat.width, plat.height)) {
        if (this.vy > 0) {
          this.y = plat.y - this.height + 4
          this.vy = 0
          this.onGround = true
          this.canDoubleJump = false
          this.hasDoubleJumped = false
        } else if (this.vy < 0) {
          this.y = plat.y + plat.height - 4
          this.vy = 0
        }
      }
    }

    // 坠落复位：掉出画面底部后回到最近的安全平台，避免玩家卡在屏幕外上不来
    // 画布高 640，坠落缓冲 80 → 掉到 y>720 判定为坠崖
    if (this.y > this.fallLimit) {
      this.respawnFromFall(platforms)
    }

    // 动画帧
    if (this.onGround && Math.abs(this.vx) > 0) {
      this.animFrame += 0.2
    } else if (!this.onGround) {
      this.animFrame += 0.1
    } else {
      this.animFrame += 0.05
    }

    // 暴露给渲染层用于选择动画帧
    ;(window as any).__playerVx = this.vx
    ;(window as any).__playerVy = this.vy
  }

  // 开始新一轮攻击：重置命中追踪
  private startAttack(duration: number) {
    this.attacking = true
    this.attackMaxTimer = duration
    this.attackTimer = duration
    this.attackProgress = 0
    this.hitTargets.clear()
  }

  // 检查是否本轮攻击已命中过该目标（避免同一挥砍多次伤害）
  hasHitTarget(target: Enemy | Boss): boolean {
    return this.hitTargets.has(target)
  }

  // 标记目标为已命中
  markHit(target: Enemy | Boss) {
    this.hitTargets.add(target)
  }

  private aabb(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2
  }

  takeDamage(amount: number): number | undefined {
    if (this.invincible) return 0
    // 混合减伤：固定减免与保底 25% 比例伤害取较大者。
    // 后期玩家防御（等级+装备+buff）可达 100+，若只有固定减免，
    // 小怪攻击（40-70）会被压到 1 血；保底比例保证受击始终有真实压力。
    const def = this.defense + this.armorDefense
    const flat = Math.max(1, Math.round(amount - def / 2))
    const floorDmg = Math.max(1, Math.round(amount * 0.25))
    const actualDmg = Math.max(flat, floorDmg)
    this.hp -= actualDmg
    this.invincible = true
    this.invincibleTimer = 40
    this.hitFlash = 10
    return actualDmg
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount)
  }

  restoreMp(amount: number) {
    this.mp = Math.max(0, Math.min(this.maxMp, this.mp + amount))
  }

  addExp(amount: number) {
    this.exp += amount
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext
      this.levelUp()
    }
  }

  addCoins(amount: number) {
    this.coins += amount
  }

  private levelUp() {
    this.level++
    this.expToNext = Math.floor(this.expToNext * 1.4)
    this.maxHp += 20
    this.hp = this.maxHp
    this.maxMp += 10
    this.mp = this.maxMp
    this.attack += 4
    this.defense += 2
  }

  draw(ctx: CanvasRenderingContext2D) {
    // 受击闪烁
    if (this.hitFlash > 0 && this.hitFlash % 4 < 2) return

    // 无敌闪烁
    if (this.invincible && this.animTimer % 6 < 3) {
      ctx.globalAlpha = 0.5
    }

    // 护甲等级光效：脚下光环随阶数越大越亮（越高阶护甲越显眼）
    if (this.armorSlot) {
      ctx.save()
      ctx.globalAlpha = 0.16 + this.armorSlot.tier * 0.05
      ctx.fillStyle = this.armorSlot.color
      ctx.shadowColor = this.armorSlot.color
      ctx.shadowBlur = 8 + this.armorSlot.tier * 5
      ctx.beginPath()
      ctx.ellipse(this.x + this.width / 2, this.y + this.height - 2, 15 + this.armorSlot.tier * 5, (15 + this.armorSlot.tier * 5) * 0.35, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    drawPlayerSprite(
      ctx, this.x, this.y, this.width, this.height,
      this.dir, Math.floor(this.animFrame),
      this.currentWeapon, this.weaponTiers[this.currentWeapon] ?? 0,
      this.attacking, this.onGround,
      this.attackProgress
    )

    ctx.globalAlpha = 1
  }

  respawn(x: number, y: number) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.hp = this.maxHp
    this.mp = this.maxMp
    this.attacking = false
    this.attackTimer = 0
    this.attackCooldown = 0
    this.invincible = true
    this.invincibleTimer = 60
  }

  // 坠崖复位：回到最近的安全平台顶部，保留当前血量（只扣少量坠落伤害）
  private respawnFromFall(platforms: Platform[]) {
    // 先结算坠落伤害（若处于无敌状态则跳过），再用重置逻辑给短暂无敌帧
    const fallDamage = Math.max(1, Math.floor(this.maxHp * 0.15))
    this.takeDamage(fallDamage)
    this.vx = 0
    this.vy = 0
    this.attacking = false
    this.attackTimer = 0
    this.attackCooldown = 0

    // 找玩家水平位置最近的安全平台，站回其顶部
    let best: Platform | null = null
    let bestDist = Infinity
    for (const plat of platforms) {
      const platCenterX = plat.x + plat.width / 2
      const dist = Math.abs(platCenterX - (this.x + this.width / 2))
      if (dist < bestDist) {
        bestDist = dist
        best = plat
      }
    }
    if (best) {
      this.x = best.x + best.width / 2 - this.width / 2
      this.y = best.y - this.height + 4
    } else {
      // 理论上平台永远存在（地面段覆盖全程）；此处兜底回到出生点高度
      this.x = 200
      this.y = 600 - this.height + 4
    }
    this.onGround = false
    this.invincible = true
    this.invincibleTimer = 60
  }
}
