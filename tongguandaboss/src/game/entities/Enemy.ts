import type { EnemyType, EnemyConfig, Direction, Rect } from '../types'
import { drawEnemySprite } from '../engine/AssetLoader'

/** 每种小怪独有的特色攻击技能 */
export type EnemySkill =
  | 'leap'        // 史莱姆：跳跃砸地（范围伤害）
  | 'bone'        // 骷髅兵：掷骨矛（直线快弹）
  | 'stab'        // 哥布林：三段突刺连击
  | 'fan'         // 暗法师：扇形暗弹
  | 'bash'        // 重甲骑士：盾击震退
  | 'dive'        // 蜜蜂战士：高速俯冲
  | 'blink'       // 暗影幽灵：瞬移背刺
  | 'web'         // 蜘蛛女巫：蛛网减速弹
  | 'selfboom'    // 火焰小鬼：自爆
  | 'quake'       // 熔岩傀儡：震地波
  | 'iceBolt'     // 冰霜巨魔：冰锥投掷
  | 'pounce'      // 霜牙狼：扑咬突袭
  | 'crystal'     // 冰晶元素：冰晶风暴（360°弹幕）
  | 'slash'       // 深渊骑士：剑气波
  | 'drain'       // 虚空怨灵：灵魂汲取（吸MP+减速）
  | 'boulder'     // 远古魔像：落石陨星
  | 'tailStrike'  // 沙蝎：毒尾横扫（近身中毒）
  | 'burrow'      // 沙狼：沙中潜行突袭（隐身+跃出扑咬）
  | 'sandstorm'   // 沙幽灵：沙暴弹幕（扇形沙弹）
  | 'soar'        // 鹰身女妖：高空盘旋后俯冲
  | 'thunder'     // 云灵：闪电链（追踪雷击）
  | 'gale'        // 天空猎鹰：旋风弹（牵引减速）
  | 'lance'       // 城堡卫兵：长枪突刺（直线贯穿）
  | 'cursedBlade' // 诅咒骑士：诅咒剑气（直线暗弹）
  | 'petrifyGaze' // 石像鬼：石化凝视（定身射线）

interface EnemySkillConfig {
  skill: EnemySkill
  /** 技能冷却帧数 */
  cooldown: number
  /** 触发距离（水平 px） */
  range: number
}

/** 技能配置：让每只小怪拥有完全不同的攻击风格 */
export const ENEMY_SKILLS: Record<EnemyType, EnemySkillConfig> = {
  slime:           { skill: 'leap',      cooldown: 100, range: 260 },
  skeleton:        { skill: 'bone',      cooldown: 140, range: 380 },
  goblin:          { skill: 'stab',      cooldown: 130, range: 90 },
  dark_mage:       { skill: 'fan',       cooldown: 115, range: 340 },
  armored_knight:  { skill: 'bash',      cooldown: 170, range: 100 },
  bee_warrior:     { skill: 'dive',      cooldown: 130, range: 340 },
  shadow_ghost:    { skill: 'blink',     cooldown: 140, range: 300 },
  spider_witch:    { skill: 'web',       cooldown: 125, range: 380 },
  fire_imp:        { skill: 'selfboom',  cooldown: 230, range: 120 },
  magma_golem:     { skill: 'quake',     cooldown: 190, range: 280 },
  ice_troll:       { skill: 'iceBolt',   cooldown: 150, range: 360 },
  frost_wolf:      { skill: 'pounce',    cooldown: 120, range: 320 },
  ice_elemental:   { skill: 'crystal',   cooldown: 160, range: 340 },
  abyss_knight:    { skill: 'slash',     cooldown: 150, range: 340 },
  void_wraith:     { skill: 'drain',     cooldown: 130, range: 280 },
  ancient_golem:   { skill: 'boulder',   cooldown: 200, range: 400 },
  // === 沙漠 / 天空 / 城堡 特色小怪 ===
  scorpion:        { skill: 'tailStrike',   cooldown: 125, range: 110 },
  dune_wolf:       { skill: 'burrow',       cooldown: 160, range: 380 },
  sand_wraith:     { skill: 'sandstorm',    cooldown: 140, range: 340 },
  harpy:           { skill: 'soar',         cooldown: 150, range: 340 },
  cloud_imp:       { skill: 'thunder',      cooldown: 130, range: 420 },
  sky_raptor:      { skill: 'gale',         cooldown: 135, range: 360 },
  castle_guard:    { skill: 'lance',        cooldown: 130, range: 120 },
  cursed_knight:   { skill: 'cursedBlade',  cooldown: 150, range: 340 },
  gargoyle:        { skill: 'petrifyGaze',  cooldown: 190, range: 320 },
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  slime: {
    name: '史莱姆',
    type: 'slime',
    hp: 30,
    attack: 8,
    speed: 2,
    width: 28,
    height: 24,
    exp: 20,
    behavior: 'chase',
    dropTable: [
      { item: 'health', chance: 0.3 },
      { item: 'coin_bronze', chance: 0.6 }
    ]
  },
  skeleton: {
    name: '骷髅兵',
    type: 'skeleton',
    hp: 50,
    attack: 15,
    speed: 2.5,
    width: 24,
    height: 40,
    exp: 35,
    behavior: 'patrol',
    dropTable: [
      { item: 'health', chance: 0.25 },
      { item: 'mana', chance: 0.2 },
      { item: 'coin_silver', chance: 0.4 }
    ]
  },
  goblin: {
    name: '哥布林',
    type: 'goblin',
    hp: 40,
    attack: 18,
    speed: 3.5,
    width: 24,
    height: 36,
    exp: 30,
    behavior: 'charge',
    dropTable: [
      { item: 'health', chance: 0.2 },
      { item: 'coin_silver', chance: 0.5 }
    ]
  },
  dark_mage: {
    name: '暗法师',
    type: 'dark_mage',
    hp: 35,
    attack: 20,
    speed: 2,
    width: 24,
    height: 42,
    exp: 40,
    behavior: 'ranged',
    dropTable: [
      { item: 'mana', chance: 0.4 },
      { item: 'coin_gold', chance: 0.3 }
    ]
  },
  armored_knight: {
    name: '重甲骑士',
    type: 'armored_knight',
    hp: 80,
    attack: 25,
    speed: 2,
    width: 28,
    height: 44,
    exp: 60,
    behavior: 'tank',
    dropTable: [
      { item: 'health', chance: 0.4 },
      { item: 'mana', chance: 0.2 },
      { item: 'coin_gold', chance: 0.5 }
    ]
  },
  bee_warrior: {
    name: '蜜蜂战士',
    type: 'bee_warrior',
    hp: 25,
    attack: 12,
    speed: 4,
    width: 28,
    height: 28,
    exp: 18,
    behavior: 'charge',
    dropTable: [
      { item: 'health', chance: 0.25 },
      { item: 'coin_bronze', chance: 0.5 }
    ]
  },
  shadow_ghost: {
    name: '暗影幽灵',
    type: 'shadow_ghost',
    hp: 35,
    attack: 16,
    speed: 3,
    width: 28,
    height: 32,
    exp: 30,
    behavior: 'chase',
    dropTable: [
      { item: 'mana', chance: 0.35 },
      { item: 'coin_silver', chance: 0.4 }
    ]
  },
  spider_witch: {
    name: '蜘蛛女巫',
    type: 'spider_witch',
    hp: 55,
    attack: 18,
    speed: 2.5,
    width: 32,
    height: 32,
    exp: 45,
    behavior: 'ranged',
    dropTable: [
      { item: 'mana', chance: 0.4 },
      { item: 'health', chance: 0.2 },
      { item: 'coin_silver', chance: 0.5 }
    ]
  },
  fire_imp: {
    name: '火焰小鬼',
    type: 'fire_imp',
    hp: 45,
    attack: 20,
    speed: 3.5,
    width: 28,
    height: 32,
    exp: 40,
    behavior: 'charge',
    dropTable: [
      { item: 'health', chance: 0.3 },
      { item: 'coin_gold', chance: 0.35 }
    ]
  },
  magma_golem: {
    name: '熔岩傀儡',
    type: 'magma_golem',
    hp: 120,
    attack: 28,
    speed: 1.5,
    width: 32,
    height: 40,
    exp: 80,
    behavior: 'tank',
    dropTable: [
      { item: 'health', chance: 0.5 },
      { item: 'mana', chance: 0.3 },
      { item: 'coin_gold', chance: 0.6 }
    ]
  },
  ice_troll: {
    name: '冰霜巨魔',
    type: 'ice_troll',
    hp: 110,
    attack: 28,
    speed: 2.2,
    width: 32,
    height: 44,
    exp: 85,
    behavior: 'tank',
    dropTable: [
      { item: 'health', chance: 0.5 },
      { item: 'mana', chance: 0.3 },
      { item: 'coin_gold', chance: 0.6 }
    ]
  },
  frost_wolf: {
    name: '霜牙狼',
    type: 'frost_wolf',
    hp: 60,
    attack: 24,
    speed: 5,
    width: 32,
    height: 28,
    exp: 55,
    behavior: 'charge',
    dropTable: [
      { item: 'health', chance: 0.3 },
      { item: 'coin_silver', chance: 0.5 }
    ]
  },
  ice_elemental: {
    name: '冰晶元素',
    type: 'ice_elemental',
    hp: 75,
    attack: 26,
    speed: 2.5,
    width: 28,
    height: 36,
    exp: 70,
    behavior: 'ranged',
    dropTable: [
      { item: 'mana', chance: 0.45 },
      { item: 'coin_gold', chance: 0.4 }
    ]
  },
  abyss_knight: {
    name: '深渊骑士',
    type: 'abyss_knight',
    hp: 150,
    attack: 36,
    speed: 2.2,
    width: 30,
    height: 46,
    exp: 115,
    behavior: 'tank',
    dropTable: [
      { item: 'health', chance: 0.55 },
      { item: 'mana', chance: 0.35 },
      { item: 'coin_gold', chance: 0.7 }
    ]
  },
  void_wraith: {
    name: '虚空怨灵',
    type: 'void_wraith',
    hp: 65,
    attack: 30,
    speed: 4,
    width: 28,
    height: 32,
    exp: 95,
    behavior: 'chase',
    dropTable: [
      { item: 'mana', chance: 0.5 },
      { item: 'coin_gold', chance: 0.5 }
    ]
  },
  ancient_golem: {
    name: '远古魔像',
    type: 'ancient_golem',
    hp: 220,
    attack: 42,
    speed: 1.2,
    width: 36,
    height: 46,
    exp: 160,
    behavior: 'tank',
    dropTable: [
      { item: 'health', chance: 0.65 },
      { item: 'mana', chance: 0.4 },
      { item: 'coin_gold', chance: 0.8 }
    ]
  },
  // ============ 沙漠特色小怪 ============
  scorpion: {
    name: '沙蝎',
    type: 'scorpion',
    hp: 120,
    attack: 38,
    speed: 3.6,
    width: 30,
    height: 24,
    exp: 90,
    behavior: 'charge',
    dropTable: [
      { item: 'health', chance: 0.3 },
      { item: 'coin_silver', chance: 0.5 }
    ]
  },
  dune_wolf: {
    name: '沙狼',
    type: 'dune_wolf',
    hp: 130,
    attack: 40,
    speed: 4.4,
    width: 30,
    height: 26,
    exp: 100,
    behavior: 'charge',
    dropTable: [
      { item: 'health', chance: 0.3 },
      { item: 'coin_silver', chance: 0.5 }
    ]
  },
  sand_wraith: {
    name: '沙幽灵',
    type: 'sand_wraith',
    hp: 100,
    attack: 42,
    speed: 2.4,
    width: 26,
    height: 38,
    exp: 110,
    behavior: 'ranged',
    dropTable: [
      { item: 'mana', chance: 0.45 },
      { item: 'coin_gold', chance: 0.4 }
    ]
  },
  // ============ 天空特色小怪 ============
  harpy: {
    name: '鹰身女妖',
    type: 'harpy',
    hp: 200,
    attack: 50,
    speed: 4.6,
    width: 30,
    height: 30,
    exp: 160,
    behavior: 'charge',
    dropTable: [
      { item: 'health', chance: 0.4 },
      { item: 'coin_gold', chance: 0.5 }
    ]
  },
  cloud_imp: {
    name: '云灵',
    type: 'cloud_imp',
    hp: 180,
    attack: 52,
    speed: 2.6,
    width: 28,
    height: 32,
    exp: 180,
    behavior: 'ranged',
    dropTable: [
      { item: 'mana', chance: 0.5 },
      { item: 'coin_gold', chance: 0.5 }
    ]
  },
  sky_raptor: {
    name: '天空猎鹰',
    type: 'sky_raptor',
    hp: 220,
    attack: 55,
    speed: 5.2,
    width: 32,
    height: 28,
    exp: 190,
    behavior: 'charge',
    dropTable: [
      { item: 'health', chance: 0.45 },
      { item: 'coin_gold', chance: 0.5 }
    ]
  },
  // ============ 城堡特色小怪 ============
  castle_guard: {
    name: '城堡卫兵',
    type: 'castle_guard',
    hp: 320,
    attack: 64,
    speed: 2.2,
    width: 30,
    height: 46,
    exp: 240,
    behavior: 'tank',
    dropTable: [
      { item: 'health', chance: 0.5 },
      { item: 'mana', chance: 0.3 },
      { item: 'coin_gold', chance: 0.6 }
    ]
  },
  cursed_knight: {
    name: '诅咒骑士',
    type: 'cursed_knight',
    hp: 380,
    attack: 72,
    speed: 2.6,
    width: 30,
    height: 46,
    exp: 270,
    behavior: 'tank',
    dropTable: [
      { item: 'health', chance: 0.55 },
      { item: 'mana', chance: 0.35 },
      { item: 'coin_gold', chance: 0.7 }
    ]
  },
  gargoyle: {
    name: '石像鬼',
    type: 'gargoyle',
    hp: 350,
    attack: 62,
    speed: 3.4,
    width: 32,
    height: 34,
    exp: 260,
    behavior: 'chase',
    dropTable: [
      { item: 'health', chance: 0.5 },
      { item: 'coin_gold', chance: 0.65 }
    ]
  },

}

export class Enemy {
  x: number
  y: number
  vx: number = 0
  vy: number = 0
  hp: number
  maxHp: number
  attack: number
  speed: number
  width: number
  height: number
  config: EnemyConfig
  dir: Direction = 'left'
  isAlive: boolean = true
  exp: number
  /** 是否精英小怪（属性强化、体型更大、掉落更好、金色特效） */
  elite: boolean

  // AI
  private behavior: EnemyConfig['behavior']
  private aiTimer: number = 0
  private patrolDir: number = 1
  private patrolTimer: number = 0
  private attackTimer: number = 0
  private stunTimer: number = 0
  private chargeTimer: number = 0
  onGround: boolean = false
  /** 远程怪保持的理想距离（固定值，定期重roll，避免每帧随机造成来回抖动） */
  private rangedIdeal: number = 150
  private rangedRollTimer: number = 0

  // 动画
  animFrame: number = 0
  animDir: number = 1
  private hitFlash: number = 0

  // 暗法师专属
  private shootTimer: number = 0
  wantsToShoot: boolean = false

  // 重甲骑士
  private blockTimer: number = 0

  // ==== 特色技能系统 ====
  /** 本只小怪的特色技能 */
  readonly skill: EnemySkill
  /** 技能已触发（等待 GameScene 消费） */
  wantsToUseSkill: boolean = false
  /** 技能进行中的帧数（运动类技能 / 演出） */
  skillActive: number = 0
  /** 落地冲击剩余帧（slime 跳跃砸地，GameScene 消费造成范围伤害） */
  landPound: number = 0
  /** 飞行敌人（鹰身女妖/云灵/猎鹰）：悬浮追踪玩家，不受平台与地面限制 */
  flying: boolean = false
  /** 潜行状态（沙狼钻地）：不绘制、不参与碰撞判定 */
  hidden: boolean = false
  /** 潜行后准备跃出扑咬的剩余帧（GameScene 计数到 0 恢复） */
  eruptPending: number = 0
  /** 技能方向（消费后由 GameScene 用于弹幕方向） */
  private skillTimer: number = 0
  private skillCooldown: number
  private skillRange: number

  /** 根据基础配置构建精英配置（不污染原共享配置） */
  static buildEliteConfig(config: EnemyConfig): EnemyConfig {
    return {
      ...config,
      name: `精英·${config.name}`,
      hp: Math.round(config.hp * 3),
      attack: Math.round(config.attack * 1.5),
      speed: config.speed * 1.2,
      width: config.width + 10,
      height: config.height + 10,
      exp: config.exp * 3,
      dropTable: [
        ...config.dropTable,
        { item: 'coin_gold', chance: 0.9 },
        { item: 'health', chance: 0.7 },
        { item: 'mana', chance: 0.5 }
      ]
    }
  }

  constructor(config: EnemyConfig, x: number, y: number, elite: boolean = false) {
    this.elite = elite
    const cfg = elite ? Enemy.buildEliteConfig(config) : config
    this.config = cfg
    this.x = x
    this.y = y
    this.hp = cfg.hp
    this.maxHp = cfg.hp
    this.attack = cfg.attack
    this.speed = cfg.speed
    this.width = cfg.width
    this.height = cfg.height
    this.exp = cfg.exp
    this.behavior = cfg.behavior
    const skillCfg = ENEMY_SKILLS[this.config.type] ?? ENEMY_SKILLS.slime
    this.skill = skillCfg.skill
    this.skillCooldown = skillCfg.cooldown
    this.skillRange = skillCfg.range
    this.skillTimer = Math.floor(skillCfg.cooldown * 0.5) // 开局留一点缓冲
    // 天空系小怪（鹰身女妖/云灵/猎鹰）与石像鬼为飞行单位：悬浮追踪玩家
    this.flying = config.type === 'harpy' || config.type === 'cloud_imp' || config.type === 'sky_raptor' || config.type === 'gargoyle'
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height }
  }

  update(playerX: number, playerY: number, platforms: Array<{ x: number; y: number; width: number; height: number }>) {
    if (!this.isAlive) return
    if (this.stunTimer > 0) { this.stunTimer--; return }
    if (this.hitFlash > 0) this.hitFlash--

    this.aiTimer++
    this.animFrame += 0.15
    const dx = playerX - this.x
    const dy = playerY - this.y
    this.dir = dx > 0 ? 'right' : 'left'

    // 特色技能驱动
    this.updateSkill(dx, dy)

    switch (this.behavior) {
      case 'chase': this.chaseBehavior(dx, dy); break
      case 'patrol': this.patrolBehavior(dx, dy, platforms); break
      case 'ranged': this.rangedBehavior(dx, dy); break
      case 'charge': this.chargeBehavior(dx, dy); break
      case 'tank': this.tankBehavior(dx, dy); break
    }

    // 飞行敌人：悬浮追踪玩家头顶，不受平台/重力/地面限制（soar 俯冲期间除外，走正常重力）
    if (this.flying && !(this.skill === 'soar' && this.skillActive > 0)) {
      const targetY = playerY - this.height - 70 - Math.sin(this.aiTimer * 0.025) * 24
      const dyT = targetY - this.y
      this.vy += dyT * 0.035
      if (this.vy > 2.4) this.vy = 2.4
      if (this.vy < -2.4) this.vy = -2.4
      this.y += this.vy
      if (this.y < 60) this.y = 60
      if (this.y > 600 - this.height) this.y = 600 - this.height
      this.x += this.vx
      this.onGround = false
      this.landPound = 0
      return
    }

    // 重力
    this.vy += 0.8
    if (this.vy > 12) this.vy = 12
    this.x += this.vx
    this.y += this.vy
    this.onGround = false

    // 平台碰撞
    for (const p of platforms) {
      if (this.aabbCollide(p)) {
        // 垂直碰撞
        if (this.vy > 0) {
          this.y = p.y - this.height
          this.vy = 0
          this.onGround = true
        } else if (this.vy < 0) {
          this.y = p.y + p.height
          this.vy = 0
        }
        // 水平碰撞：用垂直修正后的最新 y 判断，只对和敌人身体高度相交的平台做碰撞
        if (this.vx !== 0) {
          const platTop = p.y
          const platBottom = p.y + p.height
          const bottom = this.y + this.height
          const top = this.y
          // 跳过脚下的地面和头顶的台子
          if (bottom > platTop + 4 && top < platBottom - 2) {
            if (this.vx > 0) { this.x = p.x - this.width; this.vx = 0; this.patrolDir = -1 }
            else if (this.vx < 0) { this.x = p.x + p.width; this.vx = 0; this.patrolDir = 1 }
            break // 每帧只被一个平台水平推开，避免多平台连环弹跳导致“走着走着位置跳变”
          }
        }
      }
    }

    if (this.y > 700) { this.y = 700; this.vy = 0; this.onGround = true }

    // 落地冲击：slime 跳跃落地后保持 landPound 若干帧，供 GameScene 造成范围伤害
    if (this.landPound > 0) this.landPound--
  }

  /** 特色技能驱动：冷却 + 距离判定，触发后等待 GameScene 消费 */
  private updateSkill(dx: number, _dy: number) {
    if (this.skillActive > 0) {
      this.skillActive--
      // 运动类技能（leap/pounce）落地瞬间标记冲击
      if ((this.skill === 'leap' || this.skill === 'pounce') && this.onGround && this.landPound <= 0 && this.skillActive <= 20) {
        this.landPound = 16
        this.skillActive = 0
      }
      return
    }
    if (this.wantsToUseSkill) return
    if (this.stunTimer > 0) return
    if (this.hitFlash > 6) return // 被攻击硬直中不出招
    this.skillTimer++
    if (this.skillTimer < this.skillCooldown) return
    if (Math.abs(dx) > this.skillRange) return
    if (Math.abs(dx) < 26) return
    // 近战怪不在贴脸普攻冷却内重复出招
    if (this.attackTimer < 38) return
    this.skillTimer = 0
    this.wantsToUseSkill = true
  }

  /** GameScene 消费技能后调用：启动运动类技能，其余弹幕/范围效果由 GameScene 处理 */
  consumeSkill() {
    this.wantsToUseSkill = false
    switch (this.skill) {
      case 'leap':
      case 'pounce':
        // 高高跃起扑向玩家
        this.skillActive = 26
        this.vy = -13
        this.vx = this.dir === 'right' ? this.speed * 2.6 : -this.speed * 2.6
        break
      case 'dive':
        // 俯冲：保持水平高速突进
        this.skillActive = 24
        this.vx = this.dir === 'right' ? this.speed * 4.6 : -this.speed * 4.6
        this.vy = -3
        break
      case 'blink':
      case 'selfboom':
        // 由 GameScene 处理瞬移/爆炸，此处仅保留演出帧
        this.skillActive = 6
        break
      case 'quake':
        this.skillActive = 16
        this.vx = 0
        break
      case 'burrow':
        // 沙狼钻地：隐藏自身，由 GameScene 设定 eruptPending（跃出时间）
        this.hidden = true
        this.skillActive = 0
        break
      case 'soar':
        // 鹰身女妖：先爬升再俯冲，俯冲撞击由 GameScene 造成伤害
        this.skillActive = 44
        this.vy = -9.5
        this.vx = this.dir === 'right' ? this.speed * 3.2 : -this.speed * 3.2
        break
      case 'tailStrike':
      case 'sandstorm':
      case 'thunder':
      case 'gale':
      case 'lance':
      case 'cursedBlade':
      case 'petrifyGaze':
        // 施法/蓄力：原地演出帧，弹幕/范围效果由 GameScene 发射
        this.skillActive = 16
        this.vx = 0
        break
      default:
        this.skillActive = 12
        break
    }
  }

  private chaseBehavior(dx: number, _dy: number) {
    this.vx = dx > 0 ? this.speed : -this.speed
    if (Math.abs(dx) < 20) this.vx = 0
  }

  private patrolBehavior(dx: number, _dy: number, _platforms: Array<any>) {
    // 巡逻中检测到玩家
    if (Math.abs(dx) < 200) {
      this.vx = dx > 0 ? this.speed : -this.speed
      this.patrolTimer = 0
    } else {
      this.patrolTimer++
      if (this.patrolTimer > 120) {
        this.patrolDir *= -1
        this.patrolTimer = 0
      }
      this.vx = this.patrolDir * this.speed * 0.5
    }
  }

  private rangedBehavior(dx: number, _dy: number) {
    // 保持距离（固定理想距离，定期重roll，避免每帧随机导致来回乱走）
    if (this.rangedRollTimer <= 0) {
      this.rangedIdeal = 150 + Math.random() * 50
      this.rangedRollTimer = 90
    } else {
      this.rangedRollTimer--
    }
    const idealDist = this.rangedIdeal
    if (Math.abs(dx) > idealDist) {
      this.vx = dx > 0 ? this.speed : -this.speed
    } else if (Math.abs(dx) < idealDist - 40) {
      this.vx = dx > 0 ? -this.speed : this.speed
    } else {
      this.vx = 0
    }

    // 射击
    this.shootTimer++
    if (Math.abs(dx) < 350 && this.shootTimer > 80) {
      this.wantsToShoot = true
      this.shootTimer = 0
    } else {
      this.wantsToShoot = false
    }
  }

  private chargeBehavior(dx: number, _dy: number) {
    if (this.chargeTimer > 0) {
      this.chargeTimer--
      this.vx = this.dir === 'right' ? this.speed * 3 : -this.speed * 3
      return
    }

    if (Math.abs(dx) < 180) {
      if (this.chargeTimer <= 0 && Math.abs(dx) > 40) {
        this.chargeTimer = 30
        this.vx = dx > 0 ? this.speed * 3 : -this.speed * 3
        return
      }
      this.vx = dx > 0 ? this.speed : -this.speed
    } else {
      this.vx = 0
    }
  }

  private tankBehavior(dx: number, dy: number) {
    // 缓慢推进
    this.vx = dx > 0 ? this.speed : -this.speed
    if (Math.abs(dx) < 30) this.vx = 0

    // 即将被攻击时举盾
    if (Math.abs(dx) < 80) {
      this.blockTimer = 30
    }
    if (this.blockTimer > 0) {
      this.blockTimer--
      this.vx *= 0.3
    }
  }

  get isBlocking(): boolean {
    return this.blockTimer > 0
  }

  takeDamage(amount: number): number {
    if (this.isBlocking) {
      amount = Math.floor(amount * 0.2)
    }
    this.hp -= amount
    // 受击硬直：地面被击短暂停顿；空中被击不悬停（保持下落，避免“定在半空”）
    this.stunTimer = this.onGround ? 8 : 0
    this.hitFlash = 6
    // 受击打断技能：取消蓄力/瞬移/突进等运动类技能，避免“打它一下它闪走/跳走”
    this.wantsToUseSkill = false
    this.skillActive = 0
    this.hidden = false
    this.vx = 0
    if (this.vy < 0) this.vy = 0 // 打断上抛，只保留下落
    if (this.hp <= 0) {
      this.hp = 0
      this.isAlive = false
    }
    return amount
  }

  getAttackDamage(): number {
    this.attackTimer = 0
    return this.attack
  }

  wantsToAttack(playerX: number, playerY: number, playerRect: Rect): boolean {
    this.attackTimer++
    if (this.attackTimer < 40) return false
    if (this.behavior === 'ranged') return false // 远程不近战
    const dx = Math.abs(this.x - playerX)
    const dy = Math.abs(this.y - playerY)
    return dx < 40 && dy < 50
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.isAlive) return
    if (this.hidden) return // 沙狼钻地潜行：不绘制，等待跃出
    if (this.hitFlash > 0 && this.hitFlash % 3 < 1) {
      ctx.globalAlpha = 0.5
    }
    drawEnemySprite(
      ctx, this.x, this.y, this.width, this.height,
      this.dir, this.config.type, Math.floor(this.animFrame),
      this.hp, this.maxHp,
      this.attackTimer > 35 || this.wantsToUseSkill || this.skillActive > 0
    )

    // 技能蓄力警示：闪红光圈
    if (this.wantsToUseSkill && this.isAlive) {
      ctx.save()
      const cx = this.x + this.width / 2
      const cy = this.y + this.height / 2
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.03) * 0.3
      ctx.strokeStyle = '#ff3333'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, this.width / 2 + 10 + Math.sin(Date.now() * 0.02) * 3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    if (this.elite && this.isAlive) {
      ctx.save()
      const cx = this.x + this.width / 2
      const cy = this.y + this.height / 2
      // 金色光环（脉动）
      ctx.globalAlpha = 0.45 + Math.sin(Date.now() * 0.008) * 0.2
      ctx.strokeStyle = '#ffd700'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, this.width / 2 + 7, 0, Math.PI * 2)
      ctx.stroke()
      // 皇冠
      ctx.globalAlpha = 0.9
      ctx.fillStyle = '#ffd700'
      ctx.strokeStyle = '#b8860b'
      ctx.lineWidth = 1
      const top = this.y - 12
      ctx.beginPath()
      ctx.moveTo(cx - 9, top + 7)
      ctx.lineTo(cx - 9, top)
      ctx.lineTo(cx - 4, top + 4)
      ctx.lineTo(cx, top - 3)
      ctx.lineTo(cx + 4, top + 4)
      ctx.lineTo(cx + 9, top)
      ctx.lineTo(cx + 9, top + 7)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // 冠上宝石
      ctx.fillStyle = '#ff5252'
      ctx.fillRect(cx - 1.5, top - 3, 3, 3)
      ctx.restore()
    }

    ctx.globalAlpha = 1
  }

  private aabbCollide(p: { x: number; y: number; width: number; height: number }): boolean {
    return this.x < p.x + p.width && this.x + this.width > p.x &&
           this.y < p.y + p.height && this.y + this.height > p.y
  }
}
