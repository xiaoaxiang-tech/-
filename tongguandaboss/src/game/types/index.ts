// ==================== 核心类型 ====================

export type Direction = 'left' | 'right'

export interface KeyState {
  left: boolean
  right: boolean
  jump: boolean
  attack: boolean
  skill1: boolean
  skill2: boolean
  ultimate: boolean
  switchWeapon: boolean
  pause: boolean
  directWeapon: number  // -1=无, 0-3=直接选择武器索引
}

export type WeaponType = 'sword' | 'spear' | 'bow' | 'gun'

export interface WeaponStats {
  name: string
  type: WeaponType
  damage: number
  range: number        // 攻击距离(px)
  attackSpeed: number   // 攻击间隔(帧)
  energyCost: number    // 每次攻击MP消耗
  knockback: number     // 击退力
  pierce: boolean       // 是否穿透
  projectileSpeed: number
  projectileCount: number
  description: string
  /** 装备阶数（0-4，用于 HUD 星级显示） */
  tier?: number
}

// === 装备系统 ===
export type EquipmentSlot = 'weapon' | 'armor'

/** 一件可掉落/已拾取的装备 */
export interface EquipDrop {
  slot: EquipmentSlot
  weaponType?: WeaponType   // slot=weapon 时
  tier: number              // 0-4
  name: string
  damage?: number
  defense?: number
  hpBonus?: number
  attackBonus?: number
  description: string
  icon: string
  color: string
}

export interface PlayerStats {
  x: number
  y: number
  vx: number
  vy: number
  onGround: boolean
  dir: Direction
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  level: number
  exp: number
  expToNext: number
  attack: number
  defense: number
  speed: number
  jumpForce: number
  skillCooldowns: {
    skill1: { current: number; max: number }
    skill2: { current: number; max: number }
    ultimate: { current: number; max: number }
  }
  currentWeapon: WeaponType
  weaponName: string
  weaponTier: number           // 当前武器阶数 0-4
  weaponTiers: Record<WeaponType, number>
  armorTier: number            // -1 = 未获得护甲
  armorName: string
  coins: number
  attacking: boolean
  attackTimer: number
  width: number
  height: number
  invincible: boolean
  animFrame: number
  animTimer: number
}

export interface AttackBox {
  x: number
  y: number
  width: number
  height: number
}

export interface Platform {
  x: number
  y: number
  width: number
  height: number
  type: 'ground' | 'platform' | 'wall'
  tile?: string
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Particle {
  x: number; y: number
  vx: number; vy: number
  life: number; maxLife: number
  color: string; size: number
  alpha: number
}

export interface FloatingText {
  x: number; y: number
  text: string; color: string
  life: number; maxLife: number
}

export type GameState = 'menu' | 'worldMap' | 'storyIntro' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'victory' | 'petPanel'

export type EnemyType = 'slime' | 'skeleton' | 'goblin' | 'dark_mage' | 'armored_knight' | 'bee_warrior' | 'shadow_ghost' | 'spider_witch' | 'fire_imp' | 'magma_golem' | 'ice_troll' | 'frost_wolf' | 'ice_elemental' | 'abyss_knight' | 'void_wraith' | 'ancient_golem'
  // === 沙漠 / 天空 / 城堡 特色小怪 ===
  | 'scorpion'      // 沙蝎：毒尾突刺
  | 'dune_wolf'     // 沙狼：沙尘扑咬
  | 'sand_wraith'   // 沙幽灵：沙暴弹幕
  | 'harpy'         // 鹰身女妖：高空俯冲
  | 'cloud_imp'     // 云灵：闪电弹
  | 'sky_raptor'    // 天空猎鹰：高速穿云
  | 'castle_guard'  // 城堡卫兵：盾击护卫
  | 'cursed_knight' // 诅咒骑士：黑暗剑气
  | 'gargoyle'      // 石像鬼：坠石震地

export interface EnemyConfig {
  name: string
  type: EnemyType
  hp: number
  attack: number
  speed: number
  width: number
  height: number
  exp: number
  behavior: 'chase' | 'patrol' | 'ranged' | 'charge' | 'tank'
  dropTable: { item: string; chance: number }[]
}

export type BossPattern = 'melee' | 'projectile' | 'charge' | 'summon' | 'aoe' | 'spin'

export interface BossPhase {
  pattern: BossPattern
  /** 该阶段可组合的招式列表（Boss 会在其中轮换，避免连续重复）；
   *  未配置时退化为只使用 pattern 一个招式 */
  patterns?: BossPattern[]
  speed: number
  attackDamage: number
  attackInterval: number
  hpThreshold: number       // 进入该阶段的血量百分比
}

export interface BossConfig {
  name: string
  maxHp: number
  width: number
  height: number
  phases: BossPhase[]
  dropExp: number
}

export interface WaveGroup {
  type: EnemyType
  x: number
  y: number
  count: number
  delay: number
  /** 是否精英小怪（属性大幅强化、体型更大、掉落更好） */
  elite?: boolean
}

export interface WaveConfig {
  enemies: WaveGroup[]
}

export type ChestType = 'common' | 'gold' | 'special'

/** 可交互障碍物类型：crate=可破坏木箱 / spikes=尖刺陷阱 / barrel=可引爆炸药桶 / quicksand=沙漠流沙陷阱（减速+持续伤害） */
export type ObstacleType = 'crate' | 'spikes' | 'barrel' | 'quicksand'

export interface ObstacleConfig {
  /** 障碍物中心 x（相对场景起点的世界坐标） */
  x: number
  /** 障碍物底部 y；缺省时自动落到地面 groundY */
  y?: number
  type: ObstacleType
}

export interface ChestConfig {
  /** 箱子中心 x（相对场景起点的世界坐标） */
  x: number
  /** 箱子底部 y；缺省时自动落到该 x 处最高的平台顶面 */
  y?: number
  type: ChestType
}

export interface SecretAreaConfig {
  /** 入口 x（相对场景起点） */
  entranceX: number
  /** 秘密通道横向范围（用于触发提示与精英守卫） */
  length: number
  /** 隐藏高台平台（叠加在场景平台之上） */
  platforms: Platform[]
  /** 通道内宝箱（通常为特殊宝箱） */
  chests?: ChestConfig[]
  /** 进入通道时出现的精英守卫 */
  eliteGuards?: { type: EnemyType; count: number }[]
  /** 发现通道时显示的提示文字 */
  hint?: string
}

export interface SceneConfig {
  id: number
  name: string
  length: number
  platforms: Platform[]
  waves: WaveConfig[]
  /** 全局背景主题索引（0-8），对应 BackgroundGenerator 中的背景变体 */
  theme?: number
  /** 场景中正常路径上的宝箱 */
  chests?: ChestConfig[]
  /** 路上可交互的障碍物（可破坏木箱 / 尖刺陷阱 / 炸药桶） */
  obstacles?: ObstacleConfig[]
  /** 秘密通道（隐藏高台、特殊宝箱、精英守卫） */
  secretArea?: SecretAreaConfig
}

export interface LevelConfig {
  id: number
  name: string
  bossName: string
  groundY: number
  levelLength: number
  platforms: Platform[]
  waves: WaveConfig[]
  scenes: SceneConfig[]
  boss: BossConfig
  background: { skyColor: string; groundColor: string; accentColor: string }
  music?: string
  // === 故事系统 ===
  storyTitle: string       // 关卡章节名
  storyIntro: string       // 关卡前过场文字
  storyOutro: string       // 通关后过场文字
  bossDialog: { text: string; speaker: string }[]  // Boss 出场对话
  victoryDialog: { text: string; speaker: string }[]  // 战胜后对话
  // === 地图节点 ===
  mapNode: { x: number; y: number; icon: string }
  // === 可驯服宠物 ===
  petReward?: PetConfig
}

// === 宠物系统 ===
export interface PetConfig {
  id: string
  name: string
  description: string
  icon: string              // 表情图标
  color: string             // 主色
  buff: {
    type: 'attack' | 'defense' | 'mp' | 'hp' | 'speed'
    value: number            // 加成值
  }
  skillName: string         // 主动技能名
  skillDescription: string
  attackDamage: number      // 跟随攻击伤害
  attackInterval: number    // 攻击间隔(帧)
  projectileType?: 'arrow' | 'magic' | 'fire' | 'ice' | 'dark'
}

export interface Pet {
  config: PetConfig
  unlocked: boolean         // 是否已解锁
  active: boolean           // 是否出战
  level: number             // 宠物等级
}

export interface GameConfig {
  width: number
  height: number
  gravity: number
  groundY: number
}

export interface SpriteAnimConfig {
  name: string
  row: number
  frameCount: number
  frameWidth: number
  frameHeight: number
  speed: number
  loop: boolean
}
