import type { WeaponType, WeaponStats } from '../types'

// 武器数据表
export const WEAPON_DATA: Record<WeaponType, WeaponStats> = {
  sword: {
    name: '斩龙剑',
    type: 'sword',
    damage: 15,
    range: 70,
    attackSpeed: 15,
    energyCost: 0,
    knockback: 8,
    pierce: false,
    projectileSpeed: 0,
    projectileCount: 0,
    description: '近战快攻 | 连击流畅 | 无消耗'
  },
  spear: {
    name: '龙牙枪',
    type: 'spear',
    damage: 25,
    range: 110,
    attackSpeed: 30,
    energyCost: 5,
    knockback: 12,
    pierce: true,
    projectileSpeed: 0,
    projectileCount: 0,
    description: '中距穿刺 | 穿透敌人 | 击退强'
  },
  bow: {
    name: '精灵弓',
    type: 'bow',
    damage: 20,
    range: 600,
    attackSpeed: 45,
    energyCost: 8,
    knockback: 4,
    pierce: false,
    projectileSpeed: 10,
    projectileCount: 1,
    description: '远程精确 | 蓄力射击 | 高伤害'
  },
  gun: {
    name: '爆炎铳',
    type: 'gun',
    damage: 8,
    range: 400,
    attackSpeed: 12,
    energyCost: 3,
    knockback: 3,
    pierce: false,
    projectileSpeed: 14,
    projectileCount: 3,
    description: '急速连射 | 散射弹幕 | 低耗蓝'
  }
}

// 武器切换顺序
export const WEAPON_ORDER: WeaponType[] = ['sword', 'spear', 'bow', 'gun']

export function getWeaponStats(type: WeaponType): WeaponStats {
  return WEAPON_DATA[type]
}

export function getNextWeapon(current: WeaponType): WeaponType {
  const idx = WEAPON_ORDER.indexOf(current)
  return WEAPON_ORDER[(idx + 1) % WEAPON_ORDER.length]!
}

export function getPrevWeapon(current: WeaponType): WeaponType {
  const idx = WEAPON_ORDER.indexOf(current)
  return WEAPON_ORDER[(idx - 1 + WEAPON_ORDER.length) % WEAPON_ORDER.length]!
}

// 按数字索引直接获取武器（0-3）
export function getWeaponByIndex(index: number): WeaponType | null {
  if (index < 0 || index >= WEAPON_ORDER.length) return null
  const result = WEAPON_ORDER[index]
  return result ?? null
}
