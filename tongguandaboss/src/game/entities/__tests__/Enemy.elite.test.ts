import { describe, it, expect } from 'vitest'
import { Enemy, ENEMY_CONFIGS } from '../Enemy'

describe('enemy elite variants', () => {
  it('精英敌人属性大幅强化且不污染共享基础配置', () => {
    const base = ENEMY_CONFIGS.slime!
    const baseHp = base.hp
    const baseExp = base.exp

    const elite = new Enemy(base, 100, 100, true)

    expect(elite.elite).toBe(true)
    expect(elite.hp).toBeGreaterThan(baseHp * 2)
    expect(elite.exp).toBeGreaterThan(baseExp * 2)
    expect(elite.width).toBeGreaterThan(base.width)
    expect(elite.config.name).toContain('精英')
    expect(elite.config.dropTable.some(d => d.item === 'coin_gold')).toBe(true)

    // 原配置未被污染（后续波次仍使用基础数值）
    expect(base.hp).toBe(baseHp)
    expect(base.exp).toBe(baseExp)
    expect(ENEMY_CONFIGS.slime!.hp).toBe(baseHp)
  })

  it('普通敌人保持基础属性', () => {
    const normal = new Enemy(ENEMY_CONFIGS.slime!, 100, 100)
    expect(normal.elite).toBe(false)
    expect(normal.hp).toBe(ENEMY_CONFIGS.slime!.hp)
    expect(normal.exp).toBe(ENEMY_CONFIGS.slime!.exp)
  })
})
