import type { EquipDrop, WeaponStats, WeaponType } from '../types'
import { WEAPON_DATA } from './Weapon'

// ============================================================
// 装备系统数据表
// 武器 4 类 × 5 阶，护甲 5 阶。
// 阶数越高，伤害/防御越强，供路上掉落与宝箱开出。
// ============================================================

// 各武器类型各阶伤害（tier 0-4）
export const WEAPON_DAMAGE: Record<WeaponType, number[]> = {
  sword: [15, 40, 80, 135, 220],
  spear: [25, 58, 100, 165, 255],
  bow: [20, 48, 90, 150, 235],
  gun: [8, 24, 58, 105, 185]
}

// 各武器类型各阶名称
export const WEAPON_TIER_NAMES: Record<WeaponType, string[]> = {
  sword: ['斩龙剑', '精钢剑', '秘银剑', '寒霜之刃', '圣辉之剑'],
  spear: ['龙牙枪', '破城枪', '雷霆枪', '冰晶长枪', '弑神之矛'],
  bow: ['精灵弓', '猎风弓', '月影弓', '霜陨弓', '天穹之弓'],
  gun: ['爆炎铳', '连弩铳', '魔导铳', '奥术铳', '终焉铳']
}

export const WEAPON_ICONS: Record<WeaponType, string> = {
  sword: '⚔️',
  spear: '🔱',
  bow: '🏹',
  gun: '💥'
}

// 各阶武器描述
const TIER_DESC = [
  '基础武器',
  '更锋利的刀刃',
  '附魔强化',
  '传说级神兵',
  '神话级神兵'
]

const WEAPON_DESC: Record<WeaponType, string> = {
  sword: '近战快攻 | 连击流畅 | 无消耗',
  spear: '中距穿刺 | 穿透敌人 | 击退强',
  bow: '远程精确 | 蓄力射击 | 高伤害',
  gun: '急速连射 | 散射弹幕 | 低耗蓝'
}

// 各武器类型在 tier>=2 时的额外增益（让每阶更有差异）
const WEAPON_EXTRA: Record<WeaponType, Partial<WeaponStats>[]> = {
  sword: [
    {}, {},
    { attackSpeed: 13 },          // 秘银剑：更快
    { attackSpeed: 12, knockback: 12 }, // 寒霜之刃：更快更狠
    { attackSpeed: 11, knockback: 15, range: 85 } // 圣辉之剑
  ],
  spear: [
    {}, {},
    { attackSpeed: 26 },          // 雷霆枪
    { attackSpeed: 24, knockback: 16 }, // 冰晶长枪
    { attackSpeed: 22, knockback: 18, range: 125 } // 弑神之矛
  ],
  bow: [
    {}, {},
    { projectileSpeed: 12 },      // 月影弓
    { projectileSpeed: 13, attackSpeed: 40 }, // 霜陨弓
    { projectileSpeed: 14, attackSpeed: 36 }  // 天穹之弓
  ],
  gun: [
    {}, {},
    { attackSpeed: 10 },          // 魔导铳
    { attackSpeed: 9, projectileCount: 4 },  // 奥术铳
    { attackSpeed: 8, projectileCount: 5 }   // 终焉铳
  ]
}

export function getWeaponStatsFor(type: WeaponType, tier: number): WeaponStats {
  const base = WEAPON_DATA[type]
  const t = Math.max(0, Math.min(4, Math.floor(tier)))
  const extra = WEAPON_EXTRA[type][t] ?? {}
  return {
    ...base,
    ...extra,
    name: WEAPON_TIER_NAMES[type][t] ?? WEAPON_TIER_NAMES[type][0]!,
    damage: WEAPON_DAMAGE[type][t] ?? WEAPON_DAMAGE[type][0]!,
    tier: t,
    description: `${TIER_DESC[t]} · ${WEAPON_DESC[type]}`
  }
}

// ============================================================
// 护甲 5 阶
// ============================================================
export interface ArmorSpec {
  tier: number
  name: string
  defense: number
  hpBonus: number
  attackBonus: number
  description: string
  icon: string
  color: string
}

export const ARMOR_TIERS: ArmorSpec[] = [
  { tier: 0, name: '冒险者布衣', defense: 3, hpBonus: 15, attackBonus: 0, description: '轻便的旅行者衣物', icon: '🥋', color: '#b8a36b' },
  { tier: 1, name: '狼皮软甲', defense: 8, hpBonus: 45, attackBonus: 2, description: '坚韧兽皮缝制的护甲', icon: '🧥', color: '#a06a3b' },
  { tier: 2, name: '锁子甲', defense: 16, hpBonus: 90, attackBonus: 4, description: '精铁环环相扣', icon: '🛡️', color: '#8aa0b8' },
  { tier: 3, name: '冰晶魔甲', defense: 30, hpBonus: 150, attackBonus: 7, description: '极北寒冰铸就的魔铠', icon: '❄️', color: '#6fd3ff' },
  { tier: 4, name: '深渊圣龙甲', defense: 55, hpBonus: 240, attackBonus: 12, description: '以龙鳞与深渊之力铸成', icon: '🐲', color: '#c77dff' }
]

export function getArmorSpec(tier: number): ArmorSpec | null {
  if (tier < 0 || tier >= ARMOR_TIERS.length) return null
  return ARMOR_TIERS[tier]!
}

// ============================================================
// 掉落生成
// ============================================================
const MAX_TIER = 4

/** 根据关卡难度随机生成一件装备（levelId 0-4 对应基础阶数 0-3） */
export function rollEquipmentDrop(levelId: number): EquipDrop | null {
  const base = Math.max(0, Math.min(MAX_TIER - 1, levelId))
  // tier 在 [base, base+1] 内随机，关卡越靠后越容易拿到高阶
  const r = Math.random()
  let tier = base + (r < 0.65 ? 0 : 1)
  if (tier > MAX_TIER) tier = MAX_TIER
  if (Math.random() < 0.35) {
    // 35% 掉护甲
    const spec = getArmorSpec(tier)
    if (spec) return armorEquip(spec)
    return null
  }
  return weaponEquip(randomWeaponType(), tier)
}

export function weaponEquip(type: WeaponType, tier: number): EquipDrop {
  const stats = getWeaponStatsFor(type, tier)
  const extra = stats.tier! >= 2 ? ' · 强化属性' : ''
  return {
    slot: 'weapon',
    weaponType: type,
    tier: stats.tier!,
    name: stats.name,
    damage: stats.damage,
    description: `${TIER_DESC[stats.tier!]}${extra} · 伤害 ${stats.damage}`,
    icon: WEAPON_ICONS[type],
    color: tierColor(stats.tier!)
  }
}

export function armorEquip(spec: ArmorSpec): EquipDrop {
  return {
    slot: 'armor',
    tier: spec.tier,
    name: spec.name,
    defense: spec.defense,
    hpBonus: spec.hpBonus,
    attackBonus: spec.attackBonus,
    description: `护甲 ${spec.defense} · HP+${spec.hpBonus} · 攻击+${spec.attackBonus}`,
    icon: spec.icon,
    color: spec.color
  }
}

export function randomWeaponType(): WeaponType {
  const types: WeaponType[] = ['sword', 'spear', 'bow', 'gun']
  return types[Math.floor(Math.random() * types.length)]!
}

export function tierColor(tier: number): string {
  const colors = ['#b8b8b8', '#6fce6f', '#4fa3ff', '#d27bff', '#ffb13d']
  return colors[Math.max(0, Math.min(colors.length - 1, tier))]!
}

export function tierStars(tier: number): string {
  return '★'.repeat(Math.max(0, Math.min(5, tier)))
}
