import type { GameConfig, GameState, Platform, LevelConfig, WeaponType, PetConfig, ChestConfig, ChestType, EquipDrop, EquipmentSlot, ObstacleConfig, ObstacleType, EnemyType } from '../types'
import { LEVEL_CONFIGS } from './LevelConfigs'
import { Player } from '../entities/Player'
import { Enemy, ENEMY_CONFIGS } from '../entities/Enemy'
import { Boss } from '../entities/Boss'
import { PetEntity, drawPet } from '../entities/Pet'
import { createProjectile, updateProjectile, drawProjectileData, projectileRect } from '../entities/Projectile'
import type { ProjectileData } from '../entities/Projectile'
import { ParticleSystem } from '../engine/ParticleSystem'
import { PhysicsManager } from '../engine/PhysicsManager'
import { drawBackground, drawPlatform, drawItemSprite, drawChestSprite, drawObstacleSprite } from '../engine/AssetLoader'
import { rollEquipmentDrop, armorEquip, weaponEquip, randomWeaponType, getArmorSpec } from '../entities/Equipment'
import { BackgroundAnimator } from '../engine/BackgroundAnimator'
import { soundEngine } from '../engine/SoundEngine'

interface ItemData {
  x: number; y: number; w: number; h: number
  type: string; life: number
  /** equip 掉落物携带的装备数据 */
  equip?: EquipDrop
}

/** 可交互障碍物（世界坐标） */
interface ObstacleData {
  x: number; y: number; w: number; h: number
  type: ObstacleType
  /** crate/barrel 的剩余血量（spikes 不可破坏） */
  hp: number
  broken: boolean
  /** 受击闪白计时 */
  hitFlash: number
  alive: boolean
}

// 障碍物尺寸
const OBSTACLE_DIMS: Record<ObstacleType, { w: number; h: number }> = {
  crate: { w: 36, h: 30 },
  spikes: { w: 64, h: 20 },
  barrel: { w: 30, h: 34 },
  quicksand: { w: 90, h: 22 }
}

/** 跨关卡/存档持久化的装备进度 */
interface EquipState {
  weaponTiers: Record<WeaponType, number>
  weaponInventories: Record<WeaponType, number[]>
  armorTier: number
  armorInventory: number[]
}

interface ChestData {
  /** 箱子中心 x（世界坐标） */
  x: number
  /** 箱子底部 y（贴地） */
  y: number
  w: number
  h: number
  type: ChestType
  opened: boolean
  /** 开箱动画计时（帧） */
  openTimer: number
}

export function shouldAdvanceScene(sceneCleared: boolean, playerX: number, sceneStartX: number, sceneLength: number) {
  if (!sceneCleared) return false
  const sceneEndX = sceneStartX + sceneLength
  const transitionStartX = sceneEndX - 220
  return playerX >= transitionStartX
}

export function getSceneTransitionState(sceneCleared: boolean, playerX: number, sceneStartX: number, sceneLength: number) {
  if (!sceneCleared) return { canAdvance: false, progress: 0, message: '清理当前区域的敌人' }
  const sceneEndX = sceneStartX + sceneLength
  const transitionStartX = sceneEndX - 220
  const progress = Math.min(1, Math.max(0, (playerX - (sceneEndX - 400)) / 220))
  const canAdvance = playerX >= transitionStartX
  return {
    canAdvance,
    progress,
    message: canAdvance ? '前方传送门已开启' : '继续向前，传送门即将开启'
  }
}

export class GameScene {
  config: GameConfig
  player: Player
  particles: ParticleSystem
  bgAnimator: BackgroundAnimator
  state: GameState = 'menu'

  currentLevelId: number = 0
  private levelConfig!: LevelConfig
  private platforms: Platform[] = []
  private enemies: Enemy[] = []
  private boss: Boss | null = null
  private projectiles: ProjectileData[] = []
  private items: ItemData[] = []
  /** 可交互障碍物（木箱 / 尖刺 / 炸药桶 / 流沙） */
  private obstacles: ObstacleData[] = []
  /** 流沙持续伤害计时（每 24 帧扣血） */
  private quicksandTick: number = 0

  private waveIndex: number = 0
  private waveSpawnTimers: Map<string, number> = new Map()
  private isBossStage: boolean = false
  private activeSceneIndex: number = 0
  private sceneStartX: number = 0
  private sceneCleared: boolean = false
  private sceneHintTimer: number = 0
  private sceneHintText: string = ''
  private bossSpawned: boolean = false
  private preBossTimer: number = 0
  private levelCompleteTimer: number = 0
  private bossWarningTimer: number = 0
  private gameOverTimer: number = 0

  // ==== 宝箱 & 秘密通道 ====
  private chests: ChestData[] = []
  private secretSpawned = new Set<string>()
  private secretHintKey: string = ''

  // ====== 场景过渡动画 ======
  private sceneTransitionTimer: number = 0
  private sceneTransitionPhase: 'idle' | 'fadeout' | 'hold' | 'fadein' = 'idle'
  private transitionFromSceneName: string = ''
  private transitionToSceneName: string = ''
  private transitionAlpha: number = 0
  private pendingSceneIndex: number = -1

  cameraX: number = 0
  cameraY: number = 0
  private shakeTime: number = 0
  private shakeIntensity: number = 0
  private lastWeapon: WeaponType = 'sword'
  // 宠物
  petEntity: PetEntity | null = null
  activePetConfig: PetConfig | null = null
  /** 已应用到玩家身上的宠物 buff（切换宠物/重新进关时先撤销，防止永久叠加） */
  private appliedPetBuff: { type: 'attack' | 'defense' | 'mp' | 'hp' | 'speed'; value: number } | null = null
  onPetUnlock?: () => void  // 宠物解锁回调

  onStateChange?: (state: GameState) => void
  onStatsChange?: (stats: any) => void
  onBossHP?: (hp: number, maxHp: number, name: string) => void
  onWaveChange?: (wave: number, total: number) => void
  /** 装备变更回调（拾取/手动切换） */
  onEquipmentChange?: (info: {
    kind: 'weapon' | 'armor'
    slot: EquipmentSlot
    weaponType?: WeaponType
    name: string
    tier: number
    equipped: boolean
    levelId: number
  }) => void

  constructor(config: GameConfig) {
    this.config = config
    this.player = new Player(200, config.groundY - 55)
    this.particles = new ParticleSystem()
    this.bgAnimator = new BackgroundAnimator()
    soundEngine.init()
  }

  startLevel(levelId: number) {
    this.currentLevelId = levelId
    const levelConfig = LEVEL_CONFIGS[levelId]
    if (!levelConfig) return
    this.levelConfig = levelConfig
    const scenes = this.getLevelScenes()
    const firstScene = scenes[0]
    if (!firstScene) return
    this.platforms = this.buildScenePlatforms(firstScene, 0)
    this.enemies = []; this.boss = null; this.projectiles = []; this.items = []
    this.chests = this.buildChests(firstScene, 0)
    this.obstacles = this.buildObstacles(firstScene, 0)
    this.secretSpawned.clear(); this.secretHintKey = ''
    this.waveIndex = 0; this.waveSpawnTimers.clear()
    this.isBossStage = false; this.bossSpawned = false
    this.activeSceneIndex = 0; this.sceneStartX = 0
    this.sceneCleared = false
    this.sceneHintTimer = 0; this.sceneHintText = ''
    this.preBossTimer = 0; this.levelCompleteTimer = 0
    this.bossWarningTimer = 0; this.gameOverTimer = 0
    this.cameraX = 0; this.cameraY = 0
    this.player.respawn(200, this.config.groundY - 55)
    // 应用冒险进度中的装备状态（跨关卡保留）
    const equipState = (window as any).__equipState as EquipState | undefined
    if (equipState) {
      const types: WeaponType[] = ['sword', 'spear', 'bow', 'gun']
      for (const t of types) {
        this.player.equipWeapon(t, equipState.weaponTiers?.[t] ?? 0)
      }
      if (typeof equipState.armorTier === 'number' && equipState.armorTier >= 0) {
        this.player.equipArmor(equipState.armorTier)
      }
    }
    this.player.currentWeapon = 'sword'
    this.player.currentWeaponStats = this.player.equippedWeapons['sword']
    this.lastWeapon = 'sword'
    // 初始化宠物（如果已激活）
    const activePet = (window as any).__activePetConfig as PetConfig | undefined
    if (activePet) {
      this.activePetConfig = activePet
      this.petEntity = new PetEntity(activePet, this.player.x - 40, this.player.y - 20)
      // 应用 buff
      this.applyPetBuff(activePet)
    } else {
      // 未选择宠物：撤销之前残留的宠物 buff
      this.unapplyPetBuff()
      this.activePetConfig = null
      this.petEntity = null
    }
    this.state = 'playing'
    this.onStateChange?.('playing')
    this.sendBossHP()
    this.bgAnimator.init(levelId, this.config.width, this.config.height)
    this.bgAnimator.setTheme(firstScene.theme ?? 0)
    soundEngine.resume()
    soundEngine.startMusic(levelId)
  }

  // 撤销已应用的宠物 buff（从玩家属性中对称减回）
  private unapplyPetBuff() {
    const prev = this.appliedPetBuff
    if (!prev) return
    switch (prev.type) {
      case 'attack': this.player.attack -= prev.value; break
      case 'defense': this.player.defense -= prev.value; break
      case 'mp':
        this.player.maxMp -= prev.value
        this.player.mp = Math.min(this.player.mp, this.player.maxMp)
        break
      case 'hp':
        this.player.maxHp -= prev.value
        this.player.hp = Math.min(this.player.hp, this.player.maxHp)
        break
      case 'speed': this.player.speed -= prev.value; break
    }
    this.appliedPetBuff = null
  }

  // 应用宠物 buff 到玩家（先撤销旧 buff，避免跨关卡/切换宠物时属性永久叠加）
  private applyPetBuff(petConfig: PetConfig) {
    this.unapplyPetBuff()
    const buff = petConfig.buff
    switch (buff.type) {
      case 'attack': this.player.attack += buff.value; break
      case 'defense': this.player.defense += buff.value; break
      case 'mp': this.player.maxMp += buff.value; this.player.mp = Math.min(this.player.mp + buff.value, this.player.maxMp); break
      case 'hp': this.player.maxHp += buff.value; this.player.hp = Math.min(this.player.hp + buff.value, this.player.maxHp); break
      case 'speed': this.player.speed += buff.value; break
    }
    this.appliedPetBuff = { type: buff.type, value: buff.value }
  }

  update() {
    if (this.state !== 'playing') return
    if (this.shakeTime > 0) this.shakeTime--

    // Boss 已死亡：安全过渡阶段
    const bossDead = this.boss && !this.boss.isAlive
    if (bossDead) {
      // 清屏：清除所有敌人投射物
      this.projectiles = this.projectiles.filter(p => p.owner !== 'enemy')
      // 清除所有敌人（Boss死后小怪撤退）
      this.enemies = []
      // 玩家无敌，不会被致死
      this.player.invincible = true
      // 玩家缓慢回复少量血量
      if (this.player.hp < this.player.maxHp) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 0.5)
      }
    }

    this.player.update(this.getInputState(), this.getCollisionPlatforms())
    this.sendStats()
    this.sendBossHP()

    // 武器切换提示
    if (!bossDead && this.player.currentWeapon !== this.lastWeapon) {
      this.lastWeapon = this.player.currentWeapon
      this.particles.addFloatingText(
        this.player.x + this.player.width / 2,
        this.player.y - 10,
        this.player.currentWeaponStats.name,
        '#ffd700'
      )
    }

    const targetCamX = this.player.x - this.config.width / 2
    this.cameraX += (targetCamX - this.cameraX) * 0.1
    this.cameraX = Math.max(0, Math.min(this.cameraX, this.levelConfig.levelLength - this.config.width))

    if (!bossDead) {
      this.updateItems()
      this.updateObstacles()
      this.updateChests()
      this.updateEnemies()
      if (this.boss && this.boss.isAlive) this.boss.update(this.player.x, this.player.y)
      this.processCombat()
      if (!this.isBossStage) {
        this.manageWaves()
        this.updateSecretArea()
      }
      if (!this.isBossStage) this.updateSceneTransition()
      this.updateBossStage()
    }
    this.updateProjectiles()

    // 中毒持续掉血提示
    if (this.player.poisonTimer > 0 && this.player.poisonTimer % 30 === 0) {
      this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, '-3', '#6ee7a0')
    }
    if (this.boss && !this.boss.isAlive && this.levelCompleteTimer === 0) {
      this.levelCompleteTimer = 1
      soundEngine.playBossDefeated()
      // Boss 战利品：必掉一件高阶装备（第 4 关起可出神话阶）
      if (this.boss) this.dropEquip(this.boss.x, this.boss.y, Math.min(4, this.currentLevelId + 2))
    }
    if (this.levelCompleteTimer > 0) {
      this.levelCompleteTimer++
      if (this.levelCompleteTimer > 120) {
        const newState = this.currentLevelId >= LEVEL_CONFIGS.length - 1 ? 'victory' : 'levelComplete'
        this.state = newState
        this.onStateChange?.(newState)
        if (newState === 'victory') {
          soundEngine.playVictory()
          soundEngine.stopMusic()
        } else {
          soundEngine.playLevelUp()
        }
      }
    }
    if (!bossDead && this.player.hp <= 0) {
      this.gameOverTimer++
      if (this.gameOverTimer > 90) {
        this.state = 'gameOver'
        this.onStateChange?.('gameOver')
        soundEngine.playDefeat()
        soundEngine.stopMusic()
      }
    }
    if (this.bossWarningTimer > 0) this.bossWarningTimer--
    if (this.sceneHintTimer > 0) this.sceneHintTimer--
    this.bgAnimator.update(1)
    this.particles.update()

    // 场景过渡动画更新
    this.updateSceneTransitionAnimation()

    // 宠物更新
    if (this.petEntity && this.activePetConfig) {
      const attackResult = this.petEntity.update(
        this.player.x, this.player.y, this.player.width, this.player.height,
        this.platforms, this.enemies, this.boss
      )
      if (attackResult?.fire) {
        soundEngine.playPetAttack()
        // 宠物发射投射物
        const px = this.petEntity.x + this.petEntity.width / 2
        const py = this.petEntity.y + this.petEntity.height / 2
        const dx = attackResult.targetX - px
        const dy = attackResult.targetY - py
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const speed = 8
        this.projectiles.push(createProjectile(
          px, py,
          (dx / dist) * speed,
          (dy / dist) * speed * 0.3,
          this.activePetConfig.projectileType || 'magic',
          this.activePetConfig.attackDamage,
          this.petEntity.dir, 'player', 80
        ))
      }
    }
  }

  private getInputState() {
    return (window as any).__gameInput || { left: false, right: false, jump: false, attack: false, skill1: false, skill2: false, ultimate: false, switchWeapon: false, pause: false, directWeapon: -1 }
  }

  private sendStats() {
    this.onStatsChange?.(this.player.getStats())
  }

  private sendBossHP() {
    if (this.boss) {
      this.onBossHP?.(this.boss.hp, this.boss.maxHp, this.boss.config.name)
    } else {
      this.onBossHP?.(0, 0, '')
    }
  }

  private updateItems() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]!
      item.y += 0.5; item.life--
      if (item.life <= 0) { this.items.splice(i, 1); continue }
      if (PhysicsManager.rectCollide(this.player.rect, { x: item.x, y: item.y, width: item.w, height: item.h })) {
        switch (item.type) {
          case 'health': this.player.heal(20); this.particles.addFloatingText(item.x, item.y, '+20HP', '#4f4'); soundEngine.playPickupHealth(); break
          case 'mana': this.player.restoreMp(15); this.particles.addFloatingText(item.x, item.y, '+15MP', '#48f'); soundEngine.playPickupMana(); break
          case 'coin_bronze': this.player.addCoins(1); soundEngine.playPickupCoin(); break
          case 'coin_silver': this.player.addCoins(5); soundEngine.playPickupCoin(); break
          case 'coin_gold': this.player.addCoins(10); soundEngine.playPickupCoin(); break
          case 'equip':
            if (item.equip) this.pickupEquip(item.equip, item.x, item.y)
            else this.player.addCoins(20)
            break
        }
        this.items.splice(i, 1)
      }
    }
  }

  // ==== 宝箱系统 ====
  // ==== 可交互障碍物 ====
  /** 玩家碰撞体 = 平台 + 存活的木箱/炸药桶（可站立/阻挡） */
  private getCollisionPlatforms(): Platform[] {
    const solid = this.obstacles.filter(o => o.alive && (o.type === 'crate' || o.type === 'barrel'))
    if (solid.length === 0) return this.platforms
    return [...this.platforms, ...solid.map(o => ({ x: o.x, y: o.y, width: o.w, height: o.h, type: 'platform' as const }))]
  }

  private buildObstacles(scene: { id: number; length: number; chests?: ChestConfig[]; obstacles?: ObstacleConfig[] }, offsetX: number): ObstacleData[] {
    const configs = scene.obstacles?.length ? scene.obstacles : this.autoObstacleConfigs(scene)
    return configs.map(c => {
      const dims = OBSTACLE_DIMS[c.type]
      const x = c.x + offsetX - dims.w / 2
      const y = c.y !== undefined ? c.y - dims.h : this.config.groundY - dims.h
      return {
        x, y, w: dims.w, h: dims.h,
        type: c.type,
        hp: c.type === 'crate' ? 2 : c.type === 'barrel' ? 3 : 9999,
        broken: false, hitFlash: 0, alive: true
      }
    })
  }

  /** 未手工配置障碍物时，按场景自动生成 2-4 个可交互障碍物（木箱/尖刺/炸药桶） */
  private autoObstacleConfigs(scene: { id: number; length: number; chests?: ChestConfig[] }): ObstacleConfig[] {
    const out: ObstacleConfig[] = []
    const span = scene.length
    const count = 2 + (scene.id % 3) // 2-4 个
    // 宝箱 x 坐标（避开，避免重叠）
    const chestXs = (scene.chests ?? []).map(c => c.x)
    let placed = 0
    let attempt = 0
    while (placed < count && attempt < 80) {
      attempt++
      const base = 0.22 + (attempt % 5) * 0.05
      const x = Math.floor(span * Math.min(base + placed * 0.2, 0.9))
      if (x <= 200) continue
      if (chestXs.some(cx => Math.abs(cx - x) < 80)) continue
      const type: ObstacleType =
        (scene.id + placed) % 3 === 0 ? 'barrel'
          : (scene.id + placed) % 3 === 1 ? 'spikes'
            : 'crate'
      out.push({ x, type })
      placed++
    }
    return out
  }

  private updateObstacles() {
    // 每帧重置流沙状态（离开流沙后立即恢复移动能力）
    this.player.sinking = false
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i]!
      if (!ob.alive) { this.obstacles.splice(i, 1); continue }
      if (ob.hitFlash > 0) ob.hitFlash--
      const rect = { x: ob.x, y: ob.y, width: ob.w, height: ob.h }

      // 流沙陷阱（沙漠专属）：陷入减速、无法起跳、持续陷落伤害
      if (ob.type === 'quicksand') {
        // 只检测脚部与流沙重叠，模拟“踩进沙坑”
        const feet = {
          x: this.player.rect.x + 4,
          y: this.player.rect.y + this.player.rect.height - 10,
          width: this.player.rect.width - 8,
          height: 10
        }
        const onSand = PhysicsManager.rectCollide(feet, rect)
        if (onSand) {
          this.player.sinking = true
          this.quicksandTick++
          // 脚下沙粒扬起
          if (this.quicksandTick % 4 === 0) {
            this.particles.emit(
              this.player.x + this.player.width / 2,
              this.player.y + this.player.height - 2,
              2, '#eab308', { size: 2 }
            )
          }
          // 持续陷落伤害（真实伤害，不受防御减免）
          if (this.quicksandTick % 24 === 0) {
            this.player.hp -= 3
            this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, '-3', '#f59e0b')
          }
        }
        continue
      }

      // 尖刺：接触受伤（无敌帧内不重复触发）
      if (ob.type === 'spikes' && !this.player.invincible && PhysicsManager.rectCollide(this.player.rect, rect)) {
        const actual = this.player.takeDamage(Math.max(1, Math.floor(this.player.maxHp * 0.1)))
        if (actual) {
          this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${actual}`, '#f66')
          this.shake(3)
          soundEngine.playPlayerHurt()
          // 向反方向弹开
          this.player.x += this.player.x + this.player.width / 2 < ob.x + ob.w / 2 ? -16 : 16
        }
      }

      // 近战攻击破坏木箱/炸药桶
      if (this.player.attacking && this.player.attackTimer > 4 && (ob.type === 'crate' || ob.type === 'barrel')) {
        const ws = this.player.currentWeaponStats
        if ((ws.type === 'sword' || ws.type === 'spear') && PhysicsManager.rectCollide(this.player.attackBox, rect)) {
          ob.hitFlash = 6
          ob.hp--
          this.particles.emit(ob.x + ob.w / 2, ob.y + ob.h / 2, 4, '#ffcc88', { size: 2 })
          soundEngine.playEnemyHit()
          if (ob.hp <= 0) this.breakObstacle(ob)
        }
      }

      // 炸药桶：玩家弹幕击中引爆
      if (ob.type === 'barrel' && ob.alive) {
        for (const p of this.projectiles) {
          if (p.owner !== 'player') continue
          if (PhysicsManager.rectCollide(projectileRect(p), rect)) {
            this.breakObstacle(ob)
            break
          }
        }
      }
    }
  }

  private breakObstacle(ob: ObstacleData) {
    if (!ob.alive) return
    ob.alive = false
    ob.broken = true
    const cx = ob.x + ob.w / 2
    const cy = ob.y + ob.h / 2

    if (ob.type === 'crate') {
      // 木屑飞溅
      for (let k = 0; k < 12; k++) {
        this.particles.add({
          x: cx, y: cy,
          vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4,
          life: 20 + Math.random() * 20, maxLife: 40,
          size: 2.5, color: k % 2 ? '#d8a05f' : '#8a5a2a', alpha: 1,
        })
      }
      soundEngine.playHit()
      this.dropItems(cx, cy, [
        { item: 'coin_bronze', chance: 0.9 },
        { item: 'coin_silver', chance: 0.25 },
        { item: 'health', chance: 0.3 },
        { item: 'mana', chance: 0.25 },
      ])
      if (Math.random() < 0.2) this.dropEquip(cx, cy, Math.max(0, this.currentLevelId))
    } else if (ob.type === 'barrel') {
      // 爆炸：火圈粒子 + 范围伤害
      for (let k = 0; k < 26; k++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 4
        this.particles.add({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed * 2.2, vy: Math.sin(angle) * speed * 2.2 - 3,
          life: 20 + Math.random() * 20, maxLife: 40,
          size: 3 + Math.random() * 2,
          color: ['#ff4400', '#ffaa00', '#ffdd66', '#ffffff'][k % 4]!,
          alpha: 1,
        })
      }
      soundEngine.playBossRoar()
      this.shake(6)
      const boom = { x: cx - 55, y: cy - 55, width: 110, height: 110 }
      for (const enemy of this.enemies) {
        if (enemy.isAlive && PhysicsManager.rectCollide(enemy.rect, boom)) {
          enemy.takeDamage(50)
          this.particles.addFloatingText(enemy.x + enemy.width / 2, enemy.y, '-50', '#f84')
        }
      }
      if (this.boss?.isAlive && PhysicsManager.rectCollide(this.boss.rect, boom)) {
        this.boss.takeDamage(50)
        this.particles.addFloatingText(this.boss.x + this.boss.width / 2, this.boss.y, '-50', '#f84')
      }
      // 玩家在爆炸范围内也会受伤（注意距离，主动引爆桶子有一定风险）
      if (PhysicsManager.rectCollide(this.player.rect, boom)) {
        const actual = this.player.takeDamage(22)
        if (actual) this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${actual}`, '#f44')
      }
    }
    this.particles.emit(cx, cy, 8, '#ffffff', { size: 2 })
  }

  private buildChests(scene: { chests?: ChestConfig[]; secretArea?: { chests?: ChestConfig[] } }, offsetX: number): ChestData[] {
    const configs: ChestConfig[] = [...(scene.chests ?? []), ...(scene.secretArea?.chests ?? [])]
    return configs.map(c => ({
      x: c.x + offsetX,
      y: this.findGroundY(c.x + offsetX, c.y),
      w: 34,
      h: 24,
      type: c.type,
      opened: false,
      openTimer: 0
    }))
  }

  private findGroundY(x: number, explicitBottomY?: number): number {
    if (explicitBottomY !== undefined) return explicitBottomY
    let best = -1
    for (const p of this.platforms) {
      if (x >= p.x - 12 && x <= p.x + p.width + 12) {
        if (best === -1 || p.y < best) best = p.y
      }
    }
    return best > 0 ? best : this.config.groundY
  }

  private updateChests() {
    for (const chest of this.chests) {
      if (chest.opened) {
        chest.openTimer++
        continue
      }
      const rect = { x: chest.x - chest.w / 2, y: chest.y - chest.h, width: chest.w, height: chest.h }
      if (PhysicsManager.rectCollide(this.player.rect, rect)) {
        this.openChest(chest)
      }
    }
  }

  private openChest(chest: ChestData) {
    if (chest.opened) return
    chest.opened = true
    chest.openTimer = 0
    const cx = chest.x
    const cy = chest.y - chest.h / 2
    const color = chest.type === 'special' ? '#c39bd3' : chest.type === 'gold' ? '#ffd700' : '#b8860b'
    this.particles.emit(cx, cy, 14, color)
    this.particles.addFloatingText(cx, cy - 18, chest.type === 'special' ? '稀有宝藏！' : chest.type === 'gold' ? '黄金宝箱！' : '宝箱！', color)
    soundEngine.playPickupCoin()
    if (chest.type === 'common') {
      this.dropItems(cx, cy, [
        { item: 'coin_bronze', chance: 1 },
        { item: 'coin_bronze', chance: 0.7 },
        { item: 'health', chance: 0.5 },
        { item: 'mana', chance: 0.4 },
        { item: 'equip', chance: 0.35 }
      ])
    } else if (chest.type === 'gold') {
      this.dropItems(cx, cy, [
        { item: 'coin_silver', chance: 1 },
        { item: 'coin_silver', chance: 0.9 },
        { item: 'coin_gold', chance: 0.6 },
        { item: 'health', chance: 0.7 },
        { item: 'mana', chance: 0.6 },
        { item: 'equip', chance: 0.7 }
      ])
    } else {
      // 特殊宝箱：直接给予丰厚奖励 + 必掉高阶装备
      this.dropItems(cx, cy, [
        { item: 'coin_gold', chance: 1 },
        { item: 'coin_gold', chance: 0.8 },
        { item: 'health', chance: 1 },
        { item: 'mana', chance: 1 }
      ])
      this.dropEquip(cx, cy, Math.min(4, this.currentLevelId + 1))
      this.player.addExp(60)
      this.player.heal(20)
      this.player.restoreMp(20)
      this.particles.addFloatingText(cx, cy - 34, '+60 EXP  +20HP  +20MP', '#ffd700')
    }
  }

  // ==== 秘密通道 ====
  private updateSecretArea() {
    const scene = this.getActiveScene()
    const secret = scene?.secretArea
    if (!secret) return
    const sx = this.sceneStartX + secret.entranceX
    const ex = sx + secret.length

    // 进入通道范围 → 发现提示（一次）
    const hintKey = `hint-${this.currentLevelId}-${this.activeSceneIndex}`
    if (this.secretHintKey !== hintKey && this.player.x >= sx - 60 && this.player.x <= ex) {
      this.secretHintKey = hintKey
      this.sceneHintText = secret.hint ?? '🔍 发现秘密通道！'
      this.sceneHintTimer = 150
    }

    // 进入通道范围 → 刷出精英守卫（一次）
    const guardKey = `${this.currentLevelId}-${this.activeSceneIndex}`
    if (!this.secretSpawned.has(guardKey) && this.player.x >= sx - 80 && this.player.x <= ex + 40) {
      this.secretSpawned.add(guardKey)
      const guards = secret.eliteGuards ?? []
      for (const g of guards) {
        const cfg = ENEMY_CONFIGS[g.type]
        if (!cfg) continue
        for (let i = 0; i < g.count; i++) {
          const gx = sx + 70 + i * 80 + Math.random() * 40
          const gy = this.findGroundY(gx) - cfg.height
          this.enemies.push(new Enemy(cfg, gx, gy, true))
        }
      }
      soundEngine.playBossWarn()
    }
  }

  private updateEnemies() {
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue
      enemy.update(this.player.x, this.player.y, this.platforms)

      // 沙狼钻地：隐藏期间追踪玩家位置，计时结束后跃出扑咬
      if (enemy.hidden) {
        if (enemy.eruptPending > 0) {
          enemy.eruptPending--
          // 钻地沙丘痕迹（暗示潜行路线）
          if (enemy.eruptPending % 10 === 0) {
            this.particles.emit(enemy.x + enemy.width / 2, enemy.y + enemy.height, 3, '#eab308', { size: 2 })
          }
        }
        if (enemy.eruptPending <= 0) {
          enemy.hidden = false
          enemy.eruptPending = 0
          const sign = this.player.x + this.player.width / 2 < enemy.x + enemy.width / 2 ? -1 : 1
          enemy.dir = sign === 1 ? 'right' : 'left'
          enemy.vy = -11
          enemy.vx = sign * enemy.speed * 2.8
          enemy.skillActive = 22
          this.particles.emit(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 16, '#eab308', { size: 3 })
          this.particles.emit(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 8, '#eab308', { size: 3 })
        }
        continue
      }

      // 鹰身女妖俯冲：本体撞击玩家造成伤害
      if (enemy.skill === 'soar' && enemy.skillActive > 0 && !this.player.invincible
        && PhysicsManager.rectCollide(enemy.rect, this.player.rect)) {
        const dmg = this.player.takeDamage(enemy.config.attack + 10)
        if (dmg) {
          this.particles.emit(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 8, '#c084fc')
          this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${dmg}`, '#f44')
          this.shake(4)
          soundEngine.playPlayerHurt()
        }
        enemy.skillActive = 0
        enemy.vy = -4
      }
    }
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!
      if (!updateProjectile(p)) { this.projectiles.splice(i, 1); continue }
      const pr = projectileRect(p)
      if (p.owner === 'player') {
        let hit = false
        for (const enemy of this.enemies) {
          if (!enemy.isAlive || enemy.hidden) continue
          if (PhysicsManager.rectCollide(pr, enemy.rect)) {
            enemy.takeDamage(p.damage)
            this.particles.emit(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 3, '#ffdd00')
            this.particles.addFloatingText(enemy.x + enemy.width / 2, enemy.y, `-${p.damage}`, '#ff0')
            this.projectiles.splice(i, 1)
            soundEngine.playEnemyHit()
            hit = true
            break
          }
        }
        if (hit) continue
        if (this.boss?.isAlive && PhysicsManager.rectCollide(pr, this.boss.rect)) {
          this.boss.takeDamage(p.damage)
          this.particles.emit(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2, 5, '#ffdd00')
          this.particles.addFloatingText(this.boss.x + this.boss.width / 2, this.boss.y, `-${p.damage}`, '#ff0')
          this.projectiles.splice(i, 1)
          hit = true
        }
        if (hit) continue
        // 远程攻击可开箱
        for (const chest of this.chests) {
          if (chest.opened) continue
          const chestRect = { x: chest.x - chest.w / 2, y: chest.y - chest.h, width: chest.w, height: chest.h }
          if (PhysicsManager.rectCollide(pr, chestRect)) {
            this.openChest(chest)
            this.projectiles.splice(i, 1)
            break
          }
        }
      } else {
        if (PhysicsManager.rectCollide(pr, this.player.rect)) {
          if (p.type === 'web') {
            // 蛛网 / 灵魂汲取弹：不造成伤害，施加减速
            this.player.slowTimer = Math.max(this.player.slowTimer, 110)
            this.particles.emit(this.player.x + this.player.width / 2, this.player.y, 8, '#b5e8f0', { size: 3 })
            this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, '减速!', '#9be8ff')
          } else if (p.type === 'gale') {
            // 旋风弹（天空猎鹰）：不造成伤害，缠住减速
            this.player.slowTimer = Math.max(this.player.slowTimer, 85)
            this.particles.emit(this.player.x + this.player.width / 2, this.player.y, 8, '#93c5fd', { size: 3 })
            this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, '缠住!', '#93c5fd')
          } else if (p.type === 'stone') {
            // 石化凝视（石像鬼）：造成伤害并定身
            const dmg = this.player.takeDamage(p.damage)
            if (dmg) {
              this.particles.emit(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 6, '#9ca3af')
              this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${dmg}`, '#9ca3af')
              this.shake(2)
              soundEngine.playPlayerHurt()
            }
            this.player.petrifyTimer = Math.max(this.player.petrifyTimer, 90)
            this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y - 12, '石化!', '#d1d5db')
          } else if (p.type === 'poison') {
            // 毒液弹（沙蝎）：造成伤害并持续中毒
            const dmg = this.player.takeDamage(p.damage)
            if (dmg) {
              this.particles.emit(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 6, '#6ee7a0')
              this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${dmg}`, '#6ee7a0')
              this.shake(2)
              soundEngine.playPlayerHurt()
            }
            this.player.poisonTimer = Math.max(this.player.poisonTimer, 150)
            this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y - 12, '中毒!', '#6ee7a0')
          } else {
            const dmg = this.player.takeDamage(p.damage)
            if (dmg) {
              this.particles.emit(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 5, '#f44')
              this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${dmg}`, '#f44')
              this.shake(2)
              soundEngine.playPlayerHurt()
            }
          }
          this.projectiles.splice(i, 1)
        }
      }
    }
  }

  /**
   * 近战命中特效：剑为金色斩光、矛为红色刺光，随武器阶数升级规模与颜色（T2+ 冲击环，T4 爆闪）
   */
  private meleeHitEffect(x: number, y: number) {
    const w = this.player.currentWeaponStats
    const tier = Math.max(0, Math.min(4, this.player.weaponTiers[this.player.currentWeapon] ?? 0))
    const colors = ['#ffd700', '#ffb347', '#4fa3ff', '#d27bff', '#ffd24d']
    const color = w.type === 'spear' && tier < 3 ? (tier >= 1 ? '#ff6a4d' : '#ff5a5a') : colors[tier]!
    this.particles.emit(x, y, 4 + tier * 2, color)
    // T2+ 冲击环（环形扩散粒子）
    if (tier >= 2) {
      const ringColor = tier >= 4 ? '#ffffff' : color
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        this.particles.add({
          x, y,
          vx: Math.cos(a) * (3 + tier * 0.8),
          vy: Math.sin(a) * (3 + tier * 0.8),
          life: 0, maxLife: 20,
          size: 2.5,
          color: ringColor,
          alpha: 1,
        })
      }
    }
    // T4 二次爆闪
    if (tier >= 4) {
      this.particles.emit(x, y, 6, '#fff3c0', { size: 3 })
    }
  }

  private processCombat() {
    // 清除死亡敌人
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]!
      if (!e.isAlive) {
        this.dropItems(e.x + e.width / 2, e.y + e.height / 2, e.config.dropTable)
        this.player.addExp(e.exp)
        this.particles.addFloatingText(e.x + e.width / 2, e.y, `+${e.exp}EXP`, '#aaa')
        // 装备掉落：精英小怪高概率（随关卡进阶），普通小怪低概率
        const equipChance = e.elite ? 0.9 : 0.05
        if (Math.random() < equipChance) {
          this.dropEquip(e.x + e.width / 2, e.y + e.height / 2, Math.max(0, this.currentLevelId))
        }
        this.enemies.splice(i, 1)
      }
    }

    // 玩家近战
    if (this.player.attacking && this.player.attackTimer > 4) {
      const w = this.player.currentWeaponStats
      const tier = Math.max(0, Math.min(4, this.player.weaponTiers[this.player.currentWeapon] ?? 0))
      if (w.type === 'sword' || w.type === 'spear') {
        if (this.player.attackTimer === 6) soundEngine.playWeaponAttack(w.type, tier)
        const ab = this.player.attackBox
        for (const enemy of this.enemies) {
          if (!enemy.isAlive || enemy.hidden) continue
          if (this.player.hasHitTarget(enemy)) continue
          if (PhysicsManager.rectCollide(ab, enemy.rect)) {
            const dmg = w.damage + this.player.armorAttackBonus + Math.floor(this.player.attack * 0.25) + Math.floor(Math.random() * 8)
            enemy.takeDamage(dmg)
            this.meleeHitEffect(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2)
            this.particles.addFloatingText(enemy.x + enemy.width / 2, enemy.y, `-${dmg}`, '#ffd700')
            this.player.markHit(enemy)
            soundEngine.playEnemyHit()
          }
        }
        if (this.boss?.isAlive && !this.player.hasHitTarget(this.boss) && PhysicsManager.rectCollide(ab, this.boss.rect)) {
          const dmg = w.damage + this.player.armorAttackBonus + Math.floor(this.player.attack * 0.25) + Math.floor(Math.random() * 6)
          this.boss.takeDamage(dmg)
          this.meleeHitEffect(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2)
          this.particles.addFloatingText(this.boss.x + this.boss.width / 2, this.boss.y, `-${dmg}`, '#ffd700')
          this.player.markHit(this.boss); this.shake(3)
        }

        // 近战攻击可开箱
        for (const chest of this.chests) {
          if (chest.opened) continue
          const chestRect = { x: chest.x - chest.w / 2, y: chest.y - chest.h, width: chest.w, height: chest.h }
          if (PhysicsManager.rectCollide(ab, chestRect)) this.openChest(chest)
        }
      }
      // 远程武器开火
      if ((w.type === 'bow' || w.type === 'gun') && this.player.attackTimer === 5) {
        const tier = this.player.weaponTiers[w.type] ?? 0
        soundEngine.playWeaponAttack(w.type, tier)
        const mx = this.player.x + this.player.width / 2 + (this.player.dir === 'right' ? 20 : -20)
        const my = this.player.y + this.player.height / 2 - 5
        // 开火粒子（枪口/弓前火花，随阶数增多）
        this.particles.emit(mx, my, 3 + tier * 2, w.type === 'gun' ? '#ffaa00' : '#7ee8b8', { size: 2 + tier * 0.4 })
        for (let i = 0; i < w.projectileCount; i++) {
          const spr = w.projectileCount > 1 ? (i - (w.projectileCount - 1) / 2) * 1.5 : 0
          this.projectiles.push(createProjectile(
            this.player.x + this.player.width / 2, this.player.y + this.player.height / 2 - 5 + spr,
            this.player.dir === 'right' ? w.projectileSpeed : -w.projectileSpeed, spr,
            w.type === 'gun' ? 'bullet' : 'arrow', w.damage + this.player.armorAttackBonus + Math.floor(this.player.attack * 0.15) + Math.floor(Math.random() * 5),
            this.player.dir, 'player', 80, tier))
        }
      }
    }

    // 技能1
    this.processSkill1()

    // 技能2
    this.processSkill2()

    // 大招
    this.processUltimate()

    // 敌人攻击玩家
    for (const enemy of this.enemies) {
      if (!enemy.isAlive || enemy.hidden) continue
      if (enemy.wantsToAttack(this.player.x, this.player.y, this.player.rect)) {
        const dmg = this.player.takeDamage(enemy.getAttackDamage())
        if (dmg) {
          this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${dmg}`, '#f44')
          this.shake(2)
          soundEngine.playPlayerHurt()
        }
      }
    }

    // 敌人特色技能：落地冲击（史莱姆/霜牙狼）
    for (const enemy of this.enemies) {
      if (!enemy.isAlive || enemy.landPound <= 0) continue
      enemy.landPound = 0
      const ecx = enemy.x + enemy.width / 2
      const ecy = enemy.y + enemy.height / 2
      this.particles.emit(ecx, ecy + 6, 12, enemy.config.type === 'frost_wolf' ? '#cfe8ff' : '#8ac75a', { size: 3 })
      this.shake(3)
      if (Math.hypot(this.player.x + this.player.width / 2 - ecx, this.player.y + this.player.height / 2 - ecy) < 78) {
        const dmg = this.player.takeDamage(enemy.config.attack + 6)
        if (dmg) {
          this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${dmg}`, '#ff8844')
          soundEngine.playPlayerHurt()
        }
      }
    }

    // 敌人特色技能消费
    for (const enemy of this.enemies) {
      if (!enemy.isAlive || !enemy.wantsToUseSkill) continue
      this.executeEnemySkill(enemy)
      enemy.consumeSkill()
    }

    // 敌人远程
    for (const enemy of this.enemies) {
      if (enemy.wantsToShoot) {
        this.projectiles.push(createProjectile(
          enemy.x + enemy.width / 2, enemy.y + enemy.height / 2,
          enemy.dir === 'right' ? 5 : -5, 0, enemy.config.type === 'dark_mage' ? 'dark' : 'magic',
          enemy.config.attack, enemy.dir, 'enemy', 100))
      }
    }

    // Boss攻击
    if (this.boss?.isAlive) {
      this.processBossAttacks()
    }
  }

  /** 消费小怪特色技能：每种小怪一套完全不同的攻击 */
  private executeEnemySkill(enemy: Enemy) {
    const type = enemy.config.type
    const atk = enemy.config.attack
    const cx = enemy.x + enemy.width / 2
    const cy = enemy.y + enemy.height / 2
    const dir = enemy.dir
    const pdx = this.player.x + this.player.width / 2 - cx
    const pdy = this.player.y + this.player.height / 2 - cy
    const pdist = Math.hypot(pdx, pdy)

    const hurtPlayer = (dmg: number, color = '#f44', kb = 0) => {
      const actual = this.player.takeDamage(dmg)
      if (!actual) return
      this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${actual}`, color)
      this.shake(3)
      soundEngine.playPlayerHurt()
      if (kb > 0) {
        const sign = this.player.x + this.player.width / 2 < cx ? -1 : 1
        this.player.x += sign * kb
      }
    }

    switch (type) {
      case 'skeleton':
        // 掷骨矛：高速直线弹
        this.projectiles.push(createProjectile(cx, cy - 10, dir === 'right' ? 9 : -9, -1.5, 'dark', atk, dir, 'enemy', 100))
        this.particles.emit(cx, cy - 10, 4, '#cfcfcf', { size: 2 })
        break
      case 'goblin':
        // 三段突刺连击
        if (pdist < 120) {
          hurtPlayer(atk + 4, '#ff8844', 14)
          this.particles.emit(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 8, '#ffaa55')
          this.particles.addFloatingText(cx, cy - 20, '突刺！', '#ffaa55')
        }
        break
      case 'dark_mage':
        // 扇形暗弹三连发
        for (let i = -1; i <= 1; i++) {
          this.projectiles.push(createProjectile(cx, cy, (dir === 'right' ? 5.5 : -5.5) + i * 1.8, i * 1.4 - 0.5, 'dark', atk, dir, 'enemy', 110))
        }
        this.particles.emit(cx, cy, 10, '#c06cff', { size: 2 })
        break
      case 'armored_knight':
        // 盾击：震退玩家
        if (pdist < 110) hurtPlayer(atk + 8, '#ffd966', 26)
        this.particles.emit(cx, cy, 10, '#ffd966', { size: 3 })
        this.shake(3)
        break
      case 'shadow_ghost':
        // 瞬移背刺：闪烁到玩家身后
        {
          const side = this.player.dir === 'right' ? -1 : 1
          const nx = Math.max(60, Math.min(this.levelConfig.levelLength - 60, this.player.x + side * 78))
          enemy.x = nx
          enemy.y = this.player.y + this.player.height - enemy.height
          enemy.vx = 0
          this.particles.emit(cx, cy, 10, '#8b5cf6', { size: 3 })
          this.particles.emit(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 10, '#8b5cf6', { size: 3 })
          if (Math.abs(this.player.x - enemy.x) < 90) hurtPlayer(atk + 10, '#a78bfa')
        }
        break
      case 'spider_witch':
        // 蛛网减速弹 + 毒液
        this.projectiles.push(createProjectile(cx, cy, dir === 'right' ? 4 : -4, -1.2, 'web', 0, dir, 'enemy', 140))
        this.projectiles.push(createProjectile(cx, cy, dir === 'right' ? 6 : -6, -0.6, 'dark', atk, dir, 'enemy', 100))
        break
      case 'fire_imp':
        // 自爆：同归于尽
        this.particles.emit(cx, cy, 24, '#ff6600', { size: 4 })
        this.particles.emit(cx, cy, 14, '#ffcc00', { size: 3 })
        this.shake(6)
        if (pdist < 150) hurtPlayer(atk + 24, '#ff5522', 30)
        enemy.hp = 0
        enemy.isAlive = false
        break
      case 'magma_golem':
        // 震地波：落地才吃到伤害，跳跃可躲
        this.particles.emit(cx, cy + enemy.height / 2, 18, '#ff7a1a', { size: 4 })
        this.shake(5)
        if (pdist < 230 && this.player.onGround) hurtPlayer(atk + 12, '#ff7a1a', 18)
        break
      case 'ice_troll':
        // 冰锥投掷（抛物线）两连发
        this.projectiles.push(createProjectile(cx, cy - 12, dir === 'right' ? 6 : -6, -7, 'ice', atk + 4, dir, 'enemy', 130))
        this.projectiles.push(createProjectile(cx, cy - 12, dir === 'right' ? 7 : -7, -4.5, 'ice', atk + 4, dir, 'enemy', 120))
        this.particles.emit(cx, cy - 12, 6, '#bfe9ff', { size: 2 })
        break
      case 'frost_wolf':
        // 扑咬（运动由 consumeSkill 处理，落地冲击由 landPound 处理）
        break
      case 'ice_elemental':
        // 冰晶风暴：360° 八向弹幕
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          this.projectiles.push(createProjectile(cx, cy, Math.cos(a) * 4.5, Math.sin(a) * 4.5, 'ice', atk, dir, 'enemy', 90))
        }
        this.particles.emit(cx, cy, 12, '#7dd3fc', { size: 3 })
        break
      case 'abyss_knight':
        // 剑气波：穿透性的大型弹幕
        this.projectiles.push(createProjectile(cx, cy - 8, dir === 'right' ? 8 : -8, 0, 'dark', atk + 12, dir, 'enemy', 120))
        this.projectiles.push(createProjectile(cx, cy - 8, dir === 'right' ? 6.5 : -6.5, 1.2, 'dark', atk + 6, dir, 'enemy', 110))
        this.particles.emit(cx, cy - 8, 8, '#7c3aed', { size: 2 })
        break
      case 'void_wraith':
        // 灵魂汲取：吸取玩家 MP 并减速
        if (pdist < 200) {
          this.player.restoreMp(-14)
          this.player.slowTimer = Math.max(this.player.slowTimer, 70)
          this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, '-14MP', '#9d7bff')
          this.particles.emit(this.player.x + this.player.width / 2, this.player.y, 8, '#9d7bff', { size: 2 })
        }
        this.projectiles.push(createProjectile(cx, cy, dir === 'right' ? 4.5 : -4.5, -0.5, 'web', 0, dir, 'enemy', 120))
        break
      case 'ancient_golem':
        // 落石陨星：从玩家上方砸落
        for (let i = 0; i < 2; i++) {
          const lx = this.player.x + this.player.width / 2 + (i === 0 ? -30 : 30)
          this.projectiles.push(createProjectile(lx, this.player.y - 260 - i * 40, 0, 7.5, 'fire', atk + 18, 'right', 'enemy', 120))
        }
        this.particles.emit(cx, cy + enemy.height / 2, 12, '#b45309', { size: 4 })
        break
      case 'slime':
        // 跳跃砸地（运动由 consumeSkill 处理，落地冲击由 landPound 处理）
        break
      case 'scorpion':
        // 毒尾横扫：近身二连击 + 中毒，并抛射毒液弹
        if (pdist < 120) {
          hurtPlayer(atk + 6, '#ffcf5a', 12)
          hurtPlayer(atk + 6, '#ffcf5a', 10)
          this.player.poisonTimer = Math.max(this.player.poisonTimer, 150)
          this.particles.addFloatingText(cx, cy - 18, '毒刺！', '#ffcf5a')
        }
        this.projectiles.push(createProjectile(cx, cy - 8, dir === 'right' ? 6.5 : -6.5, -1.6, 'poison', atk, dir, 'enemy', 130))
        this.particles.emit(cx, cy, 10, '#eab308', { size: 2 })
        break
      case 'dune_wolf':
        // 钻地潜行：隐藏 70 帧后从玩家脚下跃出扑咬（updateEnemies 处理跃出）
        enemy.hidden = true
        enemy.eruptPending = 70
        this.particles.emit(cx, cy + enemy.height / 2, 16, '#eab308', { size: 3 })
        this.shake(2)
        break
      case 'sand_wraith':
        // 沙暴弹幕：5 向沙弹
        for (let i = -2; i <= 2; i++) {
          this.projectiles.push(createProjectile(cx, cy, (dir === 'right' ? 5 : -5) + i * 1.6, i * 1.2 - 0.3, 'sand', atk, dir, 'enemy', 115))
        }
        this.particles.emit(cx, cy, 14, '#facc15', { size: 2 })
        break
      case 'harpy':
        // 高空盘旋俯冲（运动由 consumeSkill 处理，撞击由 updateEnemies 处理）
        this.particles.emit(cx, cy, 8, '#c084fc', { size: 2 })
        break
      case 'cloud_imp':
        // 闪电链：三向闪电弹
        for (let i = -1; i <= 1; i++) {
          this.projectiles.push(createProjectile(cx, cy - 6, (dir === 'right' ? 6.5 : -6.5) + i * 1.8, i * 1.4 - 0.8, 'lightning', atk + 8, dir, 'enemy', 95))
        }
        this.particles.emit(cx, cy, 10, '#7dd3fc', { size: 2 })
        break
      case 'sky_raptor':
        // 旋风弹：慢速旋风（命中减速）
        this.projectiles.push(createProjectile(cx, cy - 6, dir === 'right' ? 4.5 : -4.5, -1.6, 'gale', 0, dir, 'enemy', 160))
        this.particles.emit(cx, cy - 6, 6, '#93c5fd', { size: 2 })
        break
      case 'castle_guard':
        // 长枪突刺：直线贯穿 + 近身猛击
        if (pdist < 130) {
          hurtPlayer(atk + 8, '#ffd966', 16)
          this.particles.emit(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, 8, '#fbbf24')
        }
        this.projectiles.push(createProjectile(cx, cy - 8, dir === 'right' ? 8 : -8, 0, 'dark', atk + 6, dir, 'enemy', 110))
        this.particles.emit(cx, cy, 12, '#fbbf24', { size: 3 })
        this.shake(3)
        break
      case 'cursed_knight':
        // 诅咒剑气：宽幅三道暗弹
        for (let i = -1; i <= 1; i++) {
          this.projectiles.push(createProjectile(cx, cy - 8 + i * 10, dir === 'right' ? 8.5 : -8.5, i * 0.8, 'dark', atk + 6 + Math.abs(i) * 4, dir, 'enemy', 120))
        }
        this.particles.emit(cx, cy - 8, 10, '#7c3aed', { size: 3 })
        break
      case 'gargoyle':
        // 石化凝视：直线石化弹（命中定身 90 帧）
        this.projectiles.push(createProjectile(cx, cy - 8, dir === 'right' ? 5.5 : -5.5, 0, 'stone', atk + 4, dir, 'enemy', 140))
        this.particles.emit(cx, cy - 8, 10, '#9ca3af', { size: 2 })
        break

      default:
        break
    }
  }

  private processSkill1() {
    const cd = this.player.skill1Cooldown
    if (cd <= 0 || cd < this.player.skill1MaxCD - 2) return
    const ws = this.player.currentWeaponStats
    const tier = this.player.weaponTiers[this.player.currentWeapon] ?? 0
    const cx = this.player.x + this.player.width / 2
    const cy = this.player.y + this.player.height / 2
    if (ws.type === 'sword') {
      this.projectiles.push(createProjectile(cx, cy - 5, this.player.dir === 'right' ? 8 : -8, 0, 'magic', ws.damage * 2, this.player.dir, 'player', 60, tier))
    } else if (ws.type === 'gun') {
      for (let i = 0; i < 5; i++) {
        this.projectiles.push(createProjectile(cx, cy, (i - 2) * 2 + (this.player.dir === 'right' ? 6 : -6), (i - 2) * 1.5 - 2, 'fire', ws.damage * 1.5, this.player.dir, 'player', 50, tier))
      }
    } else if (ws.type === 'bow') {
      for (let i = 0; i < 5; i++) {
        this.projectiles.push(createProjectile(cx, cy - 10 + (i - 2) * 4, this.player.dir === 'right' ? 10 : -10, (i - 2) * 1.5, 'arrow', ws.damage * 1.8, this.player.dir, 'player', 80, tier))
      }
    } else {
      this.projectiles.push(createProjectile(cx, cy - 5, this.player.dir === 'right' ? 12 : -12, 0, 'magic', ws.damage * 2.5, this.player.dir, 'player', 40, tier))
    }
  }

  private processSkill2() {
    const cd = this.player.skill2Cooldown
    if (cd <= 0 || cd < this.player.skill2MaxCD - 2) return
    const ws = this.player.currentWeaponStats
    const cx = this.player.x + this.player.width / 2
    const cy = this.player.y + this.player.height / 2
    this.particles.emit(cx, cy, 20, ws.type === 'gun' ? '#ff4400' : '#00aaff')
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue
      const dist = Math.hypot(enemy.x + enemy.width / 2 - cx, enemy.y + enemy.height / 2 - cy)
      if (dist < 120) {
        const dmg = ws.damage * 1.5 + Math.floor(Math.random() * 10)
        enemy.takeDamage(dmg)
        this.particles.addFloatingText(enemy.x + enemy.width / 2, enemy.y, `-${dmg}`, '#0ff')
      }
    }
    if (this.boss?.isAlive) {
      const dist = Math.hypot(this.boss.x + this.boss.width / 2 - cx, this.boss.y + this.boss.height / 2 - cy)
      if (dist < 150) {
        const dmg = ws.damage * 1.5 + Math.floor(Math.random() * 8)
        this.boss.takeDamage(dmg)
        this.shake(4)
      }
    }
  }

  private processUltimate() {
    const cd = this.player.ultimateCooldown
    if (cd <= 0 || cd < this.player.ultimateMaxCD - 2) return
    const ws = this.player.currentWeaponStats
    const cx = this.player.x + this.player.width / 2
    const cy = this.player.y + this.player.height / 2
    this.particles.emit(cx, cy, 40, '#ff8800')
    this.shake(8)

    // 全屏伤害
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue
      const dmg = ws.damage * 3 + Math.floor(Math.random() * 20)
      enemy.takeDamage(dmg)
      this.particles.addFloatingText(enemy.x + enemy.width / 2, enemy.y, `-${dmg}`, '#f80')
    }
    if (this.boss?.isAlive) {
      const dmg = ws.damage * 3 + Math.floor(Math.random() * 15)
      this.boss.takeDamage(dmg)
    }

    // 投射物弹幕（随武器阶数发光）
    const tier = this.player.weaponTiers[this.player.currentWeapon] ?? 0
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      this.projectiles.push(createProjectile(cx, cy, Math.cos(angle) * 6, Math.sin(angle) * 6, 'dark', ws.damage * 1.2, i < 6 ? 'right' : 'left', 'player', 60, tier))
    }
  }

  private processBossAttacks() {
    const boss = this.boss!
    // 近战攻击
    if (boss.wantsToAttack() && PhysicsManager.rectCollide(boss.rect, { ...this.player.rect, x: this.player.rect.x - 20, width: this.player.rect.width + 40 })) {
      const dmg = this.player.takeDamage(boss.getAttackDamage())
      if (dmg) { this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${dmg}`, '#f44'); this.shake(5) }
    }
    // 弹幕：瞄准弹 + 扇形散射（阶段越高越密）
    if (boss.wantsToShoot()) {
      const bcx = boss.x + boss.width / 2
      const bcy = boss.y + boss.height / 3
      const pAngle = Math.atan2(
        this.player.y + this.player.height / 2 - bcy,
        this.player.x + this.player.width / 2 - bcx
      )
      // 瞄准弹（追踪玩家当前位置）
      this.projectiles.push(createProjectile(bcx, bcy, Math.cos(pAngle) * 5.5, Math.sin(pAngle) * 5.5, 'dark', boss.phase.attackDamage, 'right', 'boss', 110))
      // 两侧散射弹
      for (let i = 0; i < 2 + boss.currentPhase; i++) {
        const a = pAngle + (i % 2 === 0 ? -1 : 1) * (0.28 + i * 0.16)
        this.projectiles.push(createProjectile(bcx, bcy, Math.cos(a) * 4.2, Math.sin(a) * 4.2, 'fire', boss.phase.attackDamage - 2, 'right', 'boss', 100))
      }
      // 阶段 3：追加环形冰弹
      if (boss.currentPhase >= 2) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          this.projectiles.push(createProjectile(bcx, bcy, Math.cos(a) * 3.6, Math.sin(a) * 3.6, 'ice', boss.phase.attackDamage - 4, 'right', 'boss', 80))
        }
      }
    }
    // 冲锋
    if (boss.wantsToCharge()) {
      this.projectiles.push(createProjectile(boss.x + boss.width / 2, boss.y + boss.height / 2, boss.dir === 'right' ? 8 : -8, -1, 'fire', boss.phase.attackDamage + 10, boss.dir, 'boss', 40))
    }
    // AOE：落地范围伤害 + 击退
    if (boss.wantsAreaAttack()) {
      this.particles.emit(boss.x + boss.width / 2, boss.y + boss.height / 2, 20, '#ff0000')
      const pcx = this.player.x + this.player.width / 2
      const pcy = this.player.y + this.player.height / 2
      const bcx = boss.x + boss.width / 2
      const bcy = boss.y + boss.height / 2
      if (Math.hypot(pcx - bcx, pcy - bcy) < 200) {
        const dmg = this.player.takeDamage(boss.phase.attackDamage + 15)
        if (dmg) {
          this.shake(6)
          this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${dmg}`, '#f00')
          const sign = pcx < bcx ? -1 : 1
          this.player.x += sign * 22
        }
      }
    }
    // 冲刺伤害
    if (boss.isSpinningNow() && PhysicsManager.rectCollide(boss.rect, { ...this.player.rect, x: this.player.rect.x - 10, width: this.player.rect.width + 20 })) {
      const dmg = this.player.takeDamage(boss.phase.attackDamage + 5)
      if (dmg) { this.particles.addFloatingText(this.player.x + this.player.width / 2, this.player.y, `-${dmg}`, '#f84') }
    }
    // 召唤：召唤当前关卡的小怪（随波次主题）
    if (boss.willSummon()) {
      boss.consumeSummon()
      const summonTypes: EnemyType[] = []
      const scene = this.getActiveScene()
      for (const wave of scene?.waves ?? []) {
        for (const g of wave.enemies) {
          if (!summonTypes.includes(g.type)) summonTypes.push(g.type)
          if (summonTypes.length >= 3) break
        }
        if (summonTypes.length >= 3) break
      }
      const base: EnemyType[] = summonTypes.length > 0 ? summonTypes : ['slime']
      for (let i = 0; i < 2 + boss.currentPhase; i++) {
        const ex = boss.x + (i - 1) * 80 + Math.random() * 40
        const ey = this.config.groundY - 36
        const type = base[Math.floor(Math.random() * base.length)]!
        this.enemies.push(new Enemy(ENEMY_CONFIGS[type]!, ex, ey))
      }
      this.particles.emit(boss.x + boss.width / 2, boss.y + boss.height / 2, 14, '#c06cff', { size: 3 })
    }
  }

  private manageWaves() {
    const scene = this.getActiveScene()
    if (!scene) return
    if (this.waveIndex >= scene.waves.length) {
      return
    }
    const wave = scene.waves[this.waveIndex]!
    let allSpawned = true
    for (const group of wave.enemies) {
      const key = `${this.activeSceneIndex}-${this.waveIndex}-${group.type}`
      let t = this.waveSpawnTimers.get(key) ?? 0
      if (t >= group.count) continue
      allSpawned = false; t++
      if (t % group.delay === 0 || t === 1) {
        for (let i = 0; i < 1; i++) {
          const ex = this.sceneStartX + group.x + Math.random() * 60
          const ey = group.y
          const cfg = ENEMY_CONFIGS[group.type]!
          const enemy = new Enemy(cfg, ex, ey, !!group.elite)
          this.enemies.push(enemy)
        }
      }
      this.waveSpawnTimers.set(key, t)
    }
    if (allSpawned && this.enemies.length === 0) {
      this.waveIndex++
      if (this.waveIndex >= scene.waves.length) {
        this.sceneCleared = true
      }
      this.onWaveChange?.(this.waveIndex + 1, scene.waves.length)
      this.waveSpawnTimers.clear()
    }
  }

  private updateSceneTransition() {
    // 过渡动画期间不检测传送门
    if (this.sceneTransitionPhase !== 'idle') return

    const scenes = this.getLevelScenes()
    if (!this.sceneCleared) return
    if (this.activeSceneIndex >= scenes.length - 1) {
      this.isBossStage = true
      return
    }

    const scene = scenes[this.activeSceneIndex]!
    const sceneEndX = this.sceneStartX + scene.length
    const transitionStartX = sceneEndX - 220
    const transitionHintX = sceneEndX - 320

    if (this.player.x >= transitionHintX && this.sceneHintTimer <= 0) {
      this.sceneHintText = '传送门即将开启：继续向前'
      this.sceneHintTimer = 90
    }

    if (this.player.x >= transitionStartX) {
      this.advanceToNextScene()
    }
  }

  // ====== 场景过渡动画状态机 ======
  private updateSceneTransitionAnimation() {
    if (this.sceneTransitionPhase === 'idle') return

    this.sceneTransitionTimer++
    const t = this.sceneTransitionTimer

    switch (this.sceneTransitionPhase) {
      case 'fadeout':
        // 30帧淡出（屏幕变黑 + 粒子汇聚）
        this.transitionAlpha = Math.min(1, t / 30)
        // 屏幕震动效果
        if (t === 15) { this.shakeTime = 8; this.shakeIntensity = 6 }
        // 生成传送粒子
        if (t % 3 === 0 && t < 27) {
          for (let i = 0; i < 4; i++) {
            const px = Math.random() * this.config.width
            const py = Math.random() * this.config.height
            this.particles.add({
              x: px, y: py,
              vx: (this.config.width / 2 - px) * 0.08,
              vy: (this.config.height / 2 - py) * 0.08,
              life: 30, maxLife: 30,
              color: BackgroundAnimator.getThemeColorFor(this.getPendingSceneTheme()),
              size: 3 + Math.random() * 3,
              alpha: 1
            })
          }
        }
        if (t >= 30) {
          this.sceneTransitionPhase = 'hold'
          this.sceneTransitionTimer = 0
          // 在 hold 阶段执行实际场景切换
          this.executeSceneSwitch()
          // 显示新场景名称
          const newScene = this.getLevelScenes()[this.activeSceneIndex]
          if (newScene) {
            this.sceneHintText = `进入：${newScene.name} ${BackgroundAnimator.getThemeNameFor(this.getActiveSceneTheme())}`
            this.sceneHintTimer = 120
          }
        }
        break

      case 'hold':
        // 20帧保持全黑（给玩家感知切换的时间）
        this.transitionAlpha = 1
        if (t >= 20) {
          this.sceneTransitionPhase = 'fadein'
          this.sceneTransitionTimer = 0
        }
        break

      case 'fadein':
        // 35帧淡入（屏幕恢复）
        this.transitionAlpha = Math.max(0, 1 - t / 35)
        // 淡入时散发光粒子
        if (t < 20 && t % 2 === 0) {
          const cx = this.config.width / 2 + (Math.random() - 0.5) * 200
          const cy = this.config.height / 2 + (Math.random() - 0.5) * 100
          this.particles.add({
            x: cx, y: cy,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3 - 1,
            life: 40, maxLife: 40,
            color: '#ffffff',
            size: 2 + Math.random() * 2,
            alpha: 0.8
          })
        }
        if (t >= 35) {
          this.sceneTransitionPhase = 'idle'
          this.transitionAlpha = 0
          this.sceneTransitionTimer = 0
        }
        break
    }
  }

  private getLevelScenes() {
    if (this.levelConfig.scenes?.length) return this.levelConfig.scenes
    return [{ id: 0, name: '主线', length: this.levelConfig.levelLength, platforms: this.levelConfig.platforms, waves: this.levelConfig.waves }]
  }

  private getActiveScene() {
    return this.getLevelScenes()[this.activeSceneIndex]
  }

  /** 当前激活场景的背景主题索引 */
  private getActiveSceneTheme(): number {
    return this.getActiveScene()?.theme ?? 0
  }

  /** 待切换目标场景的背景主题索引 */
  private getPendingSceneTheme(): number {
    if (this.pendingSceneIndex < 0) return 0
    return this.getLevelScenes()[this.pendingSceneIndex]?.theme ?? 0
  }

  private buildScenePlatforms(scene: { platforms: Platform[]; secretArea?: { platforms?: Platform[] } }, offsetX: number) {
    const all = [...scene.platforms, ...(scene.secretArea?.platforms ?? [])]
    return all.map(platform => ({ ...platform, x: platform.x + offsetX }))
  }

  private advanceToNextScene() {
    const scenes = this.getLevelScenes()
    if (this.activeSceneIndex >= scenes.length - 1) {
      this.isBossStage = true
      return
    }

    // 启动场景过渡动画（而不是瞬间切换）
    const currentScene = scenes[this.activeSceneIndex]!
    this.transitionFromSceneName = currentScene.name
    this.transitionToSceneName = scenes[this.activeSceneIndex + 1]!.name
    this.pendingSceneIndex = this.activeSceneIndex + 1
    this.sceneTransitionPhase = 'fadeout'
    this.sceneTransitionTimer = 0
    this.transitionAlpha = 0
    // 暂停玩家输入
    this.player.vx = 0
    this.player.vy = 0
    soundEngine.playPickupHealth() // 复用音效作为传送音效
  }

  // 执行场景切换（在过渡动画的 hold 阶段调用）
  private executeSceneSwitch() {
    const scenes = this.getLevelScenes()
    if (this.pendingSceneIndex < 0 || this.pendingSceneIndex >= scenes.length) return

    this.activeSceneIndex = this.pendingSceneIndex
    this.pendingSceneIndex = -1
    this.waveIndex = 0
    this.waveSpawnTimers.clear()
    this.enemies = []
    this.projectiles = this.projectiles.filter(p => p.owner !== 'enemy')
    this.sceneCleared = false

    const scene = scenes[this.activeSceneIndex]!
    const previousOffset = this.sceneStartX
    this.sceneStartX = scenes.slice(0, this.activeSceneIndex).reduce((sum, item) => sum + item.length, 0)
    this.platforms = this.buildScenePlatforms(scene, this.sceneStartX)
    this.chests = this.buildChests(scene, this.sceneStartX)
    this.obstacles = this.buildObstacles(scene, this.sceneStartX)
    this.secretSpawned.clear()
    this.secretHintKey = ''

    this.player.x = Math.max(this.sceneStartX + 80, Math.min(this.player.x + 80, this.sceneStartX + scene.length - 120))
    this.player.y = this.config.groundY - this.player.height
    this.player.vx = 0
    this.player.vy = 0
    this.cameraX = Math.max(0, Math.min(this.sceneStartX, this.levelConfig.levelLength - this.config.width))

    if (this.player.x > this.sceneStartX + scene.length - 160) {
      this.player.x = this.sceneStartX + 80
    }
    this.player.x = Math.max(this.player.x, previousOffset + 80)

    // 切换背景主题（场景主题驱动背景与粒子层）
    this.bgAnimator.setTheme(scene.theme ?? 0)
  }

  private updateBossStage() {
    if (this.isBossStage && !this.bossSpawned) {
      this.preBossTimer++
      if (this.preBossTimer > 120) { this.spawnBoss(); this.bossSpawned = true; this.bossWarningTimer = 90 }
    }
  }

  private spawnBoss() {
    const bx = this.levelConfig.levelLength - 300
    const by = this.config.groundY - this.levelConfig.boss.height
    this.boss = new Boss(this.levelConfig.boss, bx, by, this.config.groundY)
    this.onBossHP?.(this.boss.hp, this.boss.maxHp, this.boss.config.name)
    soundEngine.playBossWarn()
  }

  private dropItems(x: number, y: number, table: { item: string; chance: number }[]) {
    for (const drop of table) {
      if (drop.item === 'equip') {
        // 装备掉落：按当前关卡难度生成
        if (Math.random() < drop.chance) {
          const eq = rollEquipmentDrop(this.currentLevelId)
          if (eq) this.items.push({ x: x - 11, y: y - 11, w: 22, h: 22, type: 'equip', equip: eq, life: 600 })
        }
        continue
      }
      if (Math.random() < drop.chance) {
        this.items.push({ x: x - 6, y: y - 6, w: 12, h: 12, type: drop.item, life: 300 })
      }
    }
  }

  /** 掉落指定阶数附近的装备（用于精英/Boss/特殊宝箱） */
  private dropEquip(x: number, y: number, tier: number) {
    let t = Math.max(0, Math.min(4, Math.floor(tier)))
    const r = Math.random()
    if (r < 0.3) t = Math.min(4, t + 1)
    else if (r < 0.45) t = Math.max(0, t - 1)
    let eq: EquipDrop | null
    if (Math.random() < 0.35) {
      const spec = getArmorSpec(t)
      eq = spec ? armorEquip(spec) : null
    } else {
      eq = weaponEquip(randomWeaponType(), t)
    }
    if (eq) this.items.push({ x: x - 11, y: y - 11, w: 22, h: 22, type: 'equip', equip: eq, life: 600 })
  }

  /** 拾取装备：自动学习 + 同槽更高阶自动替换，并同步到存档 */
  private pickupEquip(eq: EquipDrop, ix: number, iy: number) {
    const isUpgrade =
      eq.slot === 'weapon' && eq.weaponType
        ? eq.tier > this.player.weaponTiers[eq.weaponType]
        : eq.slot === 'armor'
          ? eq.tier > (this.player.armorSlot?.tier ?? -1)
          : false

    if (eq.slot === 'weapon' && eq.weaponType) {
      this.player.learnWeapon(eq.weaponType, eq.tier)
      this.particles.addFloatingText(ix, iy - 14, `获得 ${eq.name}!`, eq.color)
      this.particles.emit(ix, iy, 8, eq.color)
      if (isUpgrade) {
        soundEngine.playEquip()
        this.particles.addFloatingText(ix, iy - 28, '已替换旧装备', '#fff')
      } else {
        soundEngine.playEquipLow()
        this.particles.addFloatingText(ix, iy - 28, '已收录到装备栏', '#ccc')
      }
      // 必须先同步全局装备状态，GameCanvas 的回调才能读到最新值
      this.syncEquipment()
      this.onEquipmentChange?.({
        kind: 'weapon', slot: 'weapon', weaponType: eq.weaponType,
        name: eq.name, tier: eq.tier, equipped: isUpgrade, levelId: this.currentLevelId
      })
    } else if (eq.slot === 'armor') {
      this.player.learnArmor(eq.tier)
      this.particles.addFloatingText(ix, iy - 14, `获得 ${eq.name}!`, eq.color)
      this.particles.emit(ix, iy, 8, eq.color)
      if (isUpgrade) {
        soundEngine.playEquip()
        this.particles.addFloatingText(ix, iy - 28, '已替换旧装备', '#fff')
      } else {
        soundEngine.playEquipLow()
        this.particles.addFloatingText(ix, iy - 28, '已收录到装备栏', '#ccc')
      }
      // 必须先同步全局装备状态，GameCanvas 的回调才能读到最新值
      this.syncEquipment()
      this.onEquipmentChange?.({
        kind: 'armor', slot: 'armor',
        name: eq.name, tier: eq.tier, equipped: isUpgrade, levelId: this.currentLevelId
      })
    }
    this.player.addExp(3)
    this.syncEquipment()
  }

  /** 装备栏手动切换武器 */
  equipWeapon(type: WeaponType, tier: number) {
    this.player.equipWeapon(type, tier)
    const stats = this.player.equippedWeapons[type]
    if (this.player.currentWeapon === type) this.player.currentWeaponStats = stats
    this.particles.addFloatingText(this.player.x + 16, this.player.y - 20, `装备 ${stats.name}`, '#ffd700')
    this.syncEquipment()
    this.onEquipmentChange?.({
      kind: 'weapon', slot: 'weapon', weaponType: type,
      name: stats.name, tier, equipped: true, levelId: this.currentLevelId
    })
  }

  /** 装备栏手动切换护甲 */
  equipArmor(tier: number) {
    this.player.equipArmor(tier)
    const spec = this.player.armorSlot
    if (spec) {
      this.particles.addFloatingText(this.player.x + 16, this.player.y - 20, `装备 ${spec.name}`, spec.color)
      this.syncEquipment()
      this.onEquipmentChange?.({
        kind: 'armor', slot: 'armor', name: spec.name, tier, equipped: true, levelId: this.currentLevelId
      })
    }
  }

  /** 将当前装备进度写回全局（供 gameStore 持久化 / 跨关卡应用） */
  syncEquipment() {
    const state: EquipState = {
      weaponTiers: { ...this.player.weaponTiers },
      weaponInventories: Object.fromEntries(
        (Object.keys(this.player.weaponInventory) as WeaponType[]).map(k => [k, [...this.player.weaponInventory[k]!]])
      ) as Record<WeaponType, number[]>,
      armorTier: this.player.armorSlot?.tier ?? -1,
      armorInventory: [...this.player.armorInventory]
    }
    ;(window as any).__equipState = state
  }

  shake(intensity: number) {
    this.shakeTime = 10
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity)
  }

  draw(ctx: CanvasRenderingContext2D) {
    // 游戏未初始化（菜单状态）时跳过绘制
    if (!this.levelConfig) return

    const sx = this.shakeTime > 0 ? (Math.random() - 0.5) * this.shakeIntensity * 2 : 0
    const sy = this.shakeTime > 0 ? (Math.random() - 0.5) * this.shakeIntensity : 0

    // 第一层：背景 + 世界对象 + UI
    ctx.save()
    ctx.translate(sx, sy)

    // 背景（屏幕空间，使用cameraX做视差滚动）——按当前场景主题绘制
    drawBackground(ctx, this.getActiveSceneTheme(), this.cameraX, this.config.width, this.config.height)

    // 动态背景前景粒子
    this.bgAnimator.drawForeground(ctx, this.config.width, this.config.height)

    // 保存shake状态，进入世界坐标
    ctx.save()
    ctx.translate(-this.cameraX, 0)

    // 平台
    for (const p of this.platforms) {
      if (p.x + p.width < this.cameraX - 100 || p.x > this.cameraX + this.config.width + 100) continue
      drawPlatform(ctx, p.x, p.y, p.width, p.height, p.type, this.getActiveSceneTheme())
    }

    // 秘密通道入口光柱标记
    const secret = this.getActiveScene()?.secretArea
    if (secret) {
      const sx = this.sceneStartX + secret.entranceX
      if (sx > this.cameraX - 80 && sx < this.cameraX + this.config.width + 80) {
        const pulse = Math.sin(Date.now() * 0.008)
        ctx.save()
        ctx.globalAlpha = 0.22 + pulse * 0.12
        ctx.fillStyle = '#c39bd3'
        ctx.fillRect(sx - 10, this.config.groundY - 280, 20, 280)
        // 入口箭头（向下指向隐藏入口）
        ctx.globalAlpha = 0.55 + pulse * 0.3
        ctx.fillStyle = '#e8d5f5'
        ctx.beginPath()
        ctx.moveTo(sx, this.config.groundY - 300)
        ctx.lineTo(sx - 9, this.config.groundY - 288)
        ctx.lineTo(sx + 9, this.config.groundY - 288)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    }

    // 可交互障碍物（木箱 / 尖刺 / 炸药桶）
    for (const ob of this.obstacles) {
      if (ob.x < this.cameraX - 80 || ob.x > this.cameraX + this.config.width + 80) continue
      drawObstacleSprite(ctx, ob.x, ob.y, ob.w, ob.h, ob.type, Math.floor(Date.now() / 100), ob.hitFlash > 0)
    }

    // 物品
    for (const item of this.items) {
      if (item.x < this.cameraX - 50 || item.x > this.cameraX + this.config.width + 50) continue
      // 装备掉落光柱：让玩家一眼看到新装备
      if (item.type === 'equip' && item.equip) {
        const pulse = 0.25 + Math.sin(Date.now() * 0.008 + item.x) * 0.12
        ctx.save()
        ctx.globalAlpha = pulse
        ctx.fillStyle = item.equip.color
        ctx.fillRect(item.x - 2, item.y - 60, 4, 60)
        ctx.restore()
      }
      drawItemSprite(ctx, item.x, item.y, item.w, item.h, item.type, Math.floor(Date.now() / 100), item.equip)
    }

    // 宝箱
    for (const chest of this.chests) {
      if (chest.x < this.cameraX - 60 || chest.x > this.cameraX + this.config.width + 60) continue
      drawChestSprite(ctx, chest.x, chest.y, chest.w, chest.h, chest.type, chest.opened, chest.opened ? chest.openTimer : Math.floor(Date.now() / 100))
    }

    // 敌人
    for (const enemy of this.enemies) {
      if (enemy.x < this.cameraX - 100 || enemy.x > this.cameraX + this.config.width + 100) continue
      enemy.draw(ctx)
    }

    // 投射物
    for (const p of this.projectiles) {
      if (p.x < this.cameraX - 50 || p.x > this.cameraX + this.config.width + 50) continue
      drawProjectileData(ctx, p)
    }

    // Boss
    if (this.boss?.isAlive) {
      this.boss.draw(ctx)
    }

    const currentScene = this.getActiveScene()
    if (!currentScene) return
    const gateX = this.sceneStartX + currentScene.length - 140
    const gateY = this.config.groundY - 140
    const gateOpen = this.sceneCleared && this.player.x >= gateX - 120
    ctx.save()
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(gateX, gateY, 56, 140)
    ctx.fillStyle = gateOpen ? '#8ef1ff' : '#5a4d2a'
    ctx.fillRect(gateX + 10, gateY + 10, 36, 120)
    ctx.fillStyle = '#ffd166'
    ctx.fillRect(gateX + 16, gateY + 16, 24, 24)
    ctx.fillStyle = gateOpen ? '#ffffff' : '#fbbf24'
    ctx.fillRect(gateX + 18, gateY + 54, 20, 50)
    ctx.restore()

    if (this.sceneCleared) {
      ctx.save()
      ctx.strokeStyle = gateOpen ? '#8ef1ff' : '#fbbf24'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(gateX + 10, gateY + 10)
      ctx.lineTo(gateX + 46, gateY + 10)
      ctx.lineTo(gateX + 46, gateY + 130)
      ctx.lineTo(gateX + 10, gateY + 130)
      ctx.stroke()
      ctx.restore()
    }

    // 玩家
    this.player.draw(ctx)

    // 宠物
    if (this.petEntity) {
      drawPet(ctx, this.petEntity)
    }

    // 粒子
    this.particles.draw(ctx)

    // 回到shake空间（屏幕坐标）
    ctx.restore()

    // ====== 场景过渡动画覆盖层 ======
    if (this.sceneTransitionPhase !== 'idle') {
      this.drawSceneTransition(ctx)
    }

    // 场景提示文字（非过渡期间也显示）
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(260, 24, this.config.width - 520, 48)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(this.sceneHintText, this.config.width / 2, 56)
    ctx.restore()

    // Boss警告（屏幕固定位置）
    if (this.bossWarningTimer > 0 && this.boss) {
      ctx.fillStyle = `rgba(255,0,0,${0.3 + Math.sin(Date.now() * 0.01) * 0.2})`
      ctx.fillRect(0, 0, this.config.width, this.config.height)
      ctx.fillStyle = '#ff0'
      ctx.font = 'bold 32px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`⚠ ${this.boss.config.name} 出现了！⚠`, this.config.width / 2, this.config.height / 2 - 40)
      if (this.bossWarningTimer === 85) soundEngine.playBossRoar()
    }

    // Boss血条（屏幕固定位置）
    if (this.boss?.isAlive && this.bossSpawned) {
      ctx.fillStyle = '#000'
      ctx.fillRect(200, 30, this.config.width - 400, 24)
      ctx.fillStyle = '#400'
      ctx.fillRect(202, 32, this.config.width - 404, 20)
      const hpR = this.boss.hp / this.boss.maxHp
      const hpColor = hpR > 0.5 ? '#4f4' : hpR > 0.25 ? '#ff0' : '#f44'
      ctx.fillStyle = hpColor
      ctx.fillRect(202, 32, (this.config.width - 404) * hpR, 20)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${this.boss.config.name} | ${this.boss.hp}/${this.boss.maxHp}`, this.config.width / 2, 47)
    }

    // 调试：输入状态 + 玩家信息
    const inp = this.getInputState()
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(5, this.config.height - 45, 230, 40)
    ctx.fillStyle = '#0f0'
    const l = inp.left ? '←' : ' '
    const r = inp.right ? '→' : ' '
    const j = inp.jump ? 'JUMP' : '   '
    const a = inp.attack ? 'ATK' : '   '
    ctx.fillText(`[${l}${r}] ${j} ${a} | X:${Math.floor(this.player.x)} Y:${Math.floor(this.player.y)} GND:${this.player.onGround}`, 10, this.config.height - 30)
    ctx.fillText(`State:${this.state} Wave:${this.waveIndex}/${this.levelConfig?.waves.length||0}`, 10, this.config.height - 15)

    ctx.restore()
  }

  // ====== 绘制场景过渡动画覆盖层 ======
  private drawSceneTransition(ctx: CanvasRenderingContext2D) {
    const W = this.config.width
    const H = this.config.height
    const alpha = this.transitionAlpha

    // 全屏渐变遮罩
    if (this.sceneTransitionPhase === 'fadeout') {
      // 淡出：从边缘向中心收缩的暗角效果 + 粒子汇聚感
      // 暗角 vignette
      const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7)
      grad.addColorStop(0, `rgba(0,0,0,${alpha * 0.4})`)
      grad.addColorStop(1, `rgba(0,0,0,${alpha})`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // 扫描线效果（从上往下扫）
      const scanY = (this.sceneTransitionTimer / 30) * H
      ctx.fillStyle = `rgba(0,0,10,${alpha * 0.6})`
      ctx.fillRect(0, scanY - 8, W, 16)

      // 边缘光晕
      const themeColor = BackgroundAnimator.getThemeColorFor(this.getPendingSceneTheme())
      ctx.strokeStyle = themeColor
      ctx.lineWidth = 3
      ctx.globalAlpha = alpha * 0.7
      ctx.strokeRect(4, 4, W - 8, H - 8)
      ctx.globalAlpha = 1

    } else if (this.sceneTransitionPhase === 'hold') {
      // 保持：全黑 + 场景名称展示
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)

      // 中央场景名称
      if (this.sceneHintText) {
        ctx.save()
        // 发光文字背景条
        ctx.fillStyle = 'rgba(20,20,40,0.9)'
        ctx.fillRect(W / 2 - 220, H / 2 - 30, 440, 60)
        // 边框发光
        const themeColor = BackgroundAnimator.getThemeColorFor(this.getActiveSceneTheme())
        ctx.strokeStyle = themeColor
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.006) * 0.3
        ctx.strokeRect(W / 2 - 220, H / 2 - 30, 440, 60)
        ctx.globalAlpha = 1

        // 文字
        ctx.font = 'bold 26px "Microsoft YaHei", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // 文字阴影/发光
        ctx.shadowColor = themeColor
        ctx.shadowBlur = 15
        ctx.fillStyle = '#fff'
        ctx.fillText(this.sceneHintText, W / 2, H / 2)
        ctx.shadowBlur = 0

        // 副标题
        ctx.font = '14px monospace'
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillText('— 正在加载新区域 —', W / 2, H / 2 + 22)

        ctx.restore()
      }

      // 四角传送门能量纹路
      this.drawPortalEnergy(ctx, W, H)

    } else if (this.sceneTransitionPhase === 'fadein') {
      // 淡入：从中心向外扩散的光芒
      const progress = 1 - alpha // 0→1

      // 背景遮罩逐渐消失
      ctx.fillStyle = `rgba(0,0,10,${alpha})`
      ctx.fillRect(0, 0, W, H)

      // 从中心扩散的光圈
      const themeColor = BackgroundAnimator.getThemeColorFor(this.getActiveSceneTheme())
      const ringRadius = progress * Math.max(W, H) * 0.8
      ctx.strokeStyle = themeColor
      ctx.lineWidth = 4
      ctx.globalAlpha = 1 - progress
      ctx.beginPath()
      ctx.arc(W / 2, H / 2, ringRadius, 0, Math.PI * 2)
      ctx.stroke()

      // 十字光芒
      ctx.lineWidth = 2
      const crossLen = ringRadius * 0.6
      ctx.beginPath()
      ctx.moveTo(W / 2 - crossLen, H / 2); ctx.lineTo(W / 2 + crossLen, H / 2)
      ctx.moveTo(W / 2, H / 2 - crossLen); ctx.lineTo(W / 2, H / 2 + crossLen)
      ctx.stroke()

      // 对角光芒
      const diagLen = crossLen * 0.4
      ctx.globalAlpha = (1 - progress) * 0.5
      ctx.beginPath()
      ctx.moveTo(W / 2 - diagLen, H / 2 - diagLen); ctx.lineTo(W / 2 + diagLen, H / 2 + diagLen)
      ctx.moveTo(W / 2 + diagLen, H / 2 - diagLen); ctx.lineTo(W / 2 - diagLen, H / 2 + diagLen)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  // 绘制传送门能量纹路装饰
  private drawPortalEnergy(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const t = Date.now() * 0.003
    const themeColor = BackgroundAnimator.getThemeColorFor(this.getActiveSceneTheme())

    ctx.save()
    ctx.strokeStyle = themeColor
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.4 + Math.sin(t * 2) * 0.2

    // 四角的几何图案
    const cornerSize = 60
    const margin = 30

    // 左上角
    ctx.beginPath()
    ctx.moveTo(margin, margin + cornerSize)
    ctx.lineTo(margin, margin)
    ctx.lineTo(margin + cornerSize, margin)
    ctx.stroke()

    // 右上角
    ctx.beginPath()
    ctx.moveTo(W - margin - cornerSize, margin)
    ctx.lineTo(W - margin, margin)
    ctx.lineTo(W - margin, margin + cornerSize)
    ctx.stroke()

    // 左下角
    ctx.beginPath()
    ctx.moveTo(margin, H - margin - cornerSize)
    ctx.lineTo(margin, H - margin)
    ctx.lineTo(margin + cornerSize, H - margin)
    ctx.stroke()

    // 右下角
    ctx.beginPath()
    ctx.moveTo(W - margin - cornerSize, H - margin)
    ctx.lineTo(W - margin, H - margin)
    ctx.lineTo(W - margin, H - margin - cornerSize)
    ctx.stroke()

    // 内框呼吸线
    ctx.globalAlpha = 0.15 + Math.sin(t * 1.5) * 0.1
    ctx.lineWidth = 1
    ctx.strokeRect(margin + 20, margin + 20, W - margin * 2 - 40, H - margin * 2 - 40)

    ctx.restore()
  }
}



