import { describe, expect, it } from 'vitest'
import { Player } from '../Player'
import {
  WEAPON_DAMAGE, WEAPON_TIER_NAMES, ARMOR_TIERS,
  getWeaponStatsFor, getArmorSpec, rollEquipmentDrop, tierColor
} from '../Equipment'
import { createProjectile, drawProjectileData } from '../Projectile'
import { drawPlayerSprite, drawItemSprite } from '../../engine/AssetLoader'
import { weaponEquip, armorEquip } from '../Equipment'
import type { WeaponType } from '../../types'

// 渲染测试用的 Canvas2D mock（jsdom 不支持 2D context，逐方法打桩）
function createMockCtx(): CanvasRenderingContext2D {
  const noop = () => {}
  const grad = { addColorStop: noop } as unknown as CanvasGradient
  return {
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    arc: noop, ellipse: noop, rect: noop, fill: noop, stroke: noop,
    clip: noop, fillRect: noop, strokeRect: noop, clearRect: noop,
    fillText: noop, strokeText: noop, drawImage: noop, setTransform: noop,
    bezierCurveTo: noop, quadraticCurveTo: noop, createPattern: noop,
    measureText: () => ({ width: 0 }),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    canvas: {} as HTMLCanvasElement,
  } as unknown as CanvasRenderingContext2D
}

describe('equipment system', () => {
  it('武器各类型 5 阶伤害严格递增', () => {
    const types: WeaponType[] = ['sword', 'spear', 'bow', 'gun']
    for (const t of types) {
      for (let i = 1; i < WEAPON_DAMAGE[t].length; i++) {
        expect(WEAPON_DAMAGE[t][i]!).toBeGreaterThan(WEAPON_DAMAGE[t][i - 1]!)
      }
    }
  })

  it('getWeaponStatsFor 返回对应阶名称与伤害', () => {
    const s = getWeaponStatsFor('sword', 2)
    expect(s.name).toBe(WEAPON_TIER_NAMES.sword[2])
    expect(s.damage).toBe(WEAPON_DAMAGE.sword[2])
    expect(s.tier).toBe(2)
  })

  it('玩家初始装备全为 0 阶', () => {
    const p = new Player(0, 0)
    expect(p.currentWeaponStats.damage).toBe(15)
    expect(p.weaponTiers).toEqual({ sword: 0, spear: 0, bow: 0, gun: 0 })
    expect(p.armorSlot).toBeNull()
  })

  it('learnWeapon 高阶自动替换，低阶仅收藏', () => {
    const p = new Player(0, 0)
    const r1 = p.learnWeapon('sword', 3)
    expect(r1.equipped).toBe(true)
    expect(p.weaponTiers.sword).toBe(3)
    expect(p.equippedWeapons.sword.damage).toBe(WEAPON_DAMAGE.sword[3])

    const r2 = p.learnWeapon('sword', 1)
    expect(r2.equipped).toBe(false)
    expect(p.weaponTiers.sword).toBe(3)
    expect(p.weaponInventory.sword).toContain(1)
  })

  it('equipArmor 增加生命与防御，替换时生命加成正确切换', () => {
    const p = new Player(0, 0)
    const baseHp = p.maxHp
    p.equipArmor(2)
    const a2 = ARMOR_TIERS[2]!
    expect(p.maxHp).toBe(baseHp + a2.hpBonus)
    expect(p.armorDefense).toBe(a2.defense)

    p.equipArmor(1)
    const a1 = ARMOR_TIERS[1]!
    expect(p.maxHp).toBe(baseHp + a1.hpBonus)
    expect(p.armorDefense).toBe(a1.defense)
  })

  it('rollEquipmentDrop 各关卡都生成合法装备', () => {
    for (let lv = 0; lv < 5; lv++) {
      for (let i = 0; i < 60; i++) {
        const eq = rollEquipmentDrop(lv)
        expect(eq).not.toBeNull()
        expect(eq!.tier).toBeGreaterThanOrEqual(0)
        expect(eq!.tier).toBeLessThanOrEqual(4)
        if (eq!.slot === 'weapon') expect(eq!.weaponType).toBeDefined()
        if (eq!.slot === 'armor') expect(eq!.defense).toBeGreaterThan(0)
      }
    }
  })

  it('getArmorSpec 越界返回 null', () => {
    expect(getArmorSpec(5)).toBeNull()
    expect(getArmorSpec(-1)).toBeNull()
  })
})

describe('装备阶数特效渲染', () => {
  const types: WeaponType[] = ['sword', 'spear', 'bow', 'gun']

  it('每阶颜色各不相同（外观/辉光按阶数区分）', () => {
    const colors = [0, 1, 2, 3, 4].map(t => tierColor(t))
    expect(new Set(colors).size).toBe(5)
  })

  it('drawPlayerSprite 各武器×各阶数渲染不抛错（含攻击特效）', () => {
    const ctx = createMockCtx()
    for (const t of types) {
      for (let tier = 0; tier <= 4; tier++) {
        expect(() => {
          drawPlayerSprite(ctx, 100, 100, 32, 56, 'right', 0, t, tier, true, true, 0.5)
          drawPlayerSprite(ctx, 100, 100, 32, 56, 'left', 0, t, tier, false, true, 0)
        }).not.toThrow()
      }
    }
  })

  it('createProjectile 默认 0 阶，可指定武器阶数', () => {
    const p0 = createProjectile(0, 0, 1, 0, 'bullet', 10, 'right', 'player', 80)
    expect(p0.tier).toBe(0)
    const p4 = createProjectile(0, 0, 1, 0, 'arrow', 10, 'right', 'player', 80, 4)
    expect(p4.tier).toBe(4)
  })

  it('drawProjectileData 各类型×阶数渲染不抛错', () => {
    const ctx = createMockCtx()
    for (const type of ['bullet', 'arrow', 'magic', 'fire', 'ice', 'dark']) {
      for (let tier = 0; tier <= 4; tier++) {
        const p = createProjectile(10, 10, 2, 0, type, 10, 'right', 'player', 80, tier)
        expect(() => drawProjectileData(ctx, p)).not.toThrow()
      }
    }
  })

  it('drawItemSprite 装备掉落物各阶渲染不抛错', () => {
    const ctx = createMockCtx()
    for (let tier = 0; tier <= 4; tier++) {
      const w = weaponEquip('sword', tier)
      const a = armorEquip(ARMOR_TIERS[tier]!)
      expect(() => drawItemSprite(ctx, 50, 50, 24, 24, 'equip', 30, w)).not.toThrow()
      expect(() => drawItemSprite(ctx, 50, 50, 24, 24, 'equip', 30, a)).not.toThrow()
    }
  })
})
