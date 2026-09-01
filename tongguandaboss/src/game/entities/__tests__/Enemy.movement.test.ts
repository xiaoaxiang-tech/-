import { describe, it, expect } from 'vitest'
import { Enemy, ENEMY_CONFIGS } from '../Enemy'

/**
 * 覆盖“小怪位置异常”修复：
 * 1. 受击会打断蓄力/运动中的特色技能 → 不再“打它一下它闪走/跳走”
 *    （shadow_ghost blink 瞬移、slime leap / frost_wolf pounce / bee_warrior dive）
 * 2. 空中受击不进入硬直 return → 不再“定在半空”
 * 3. 远程怪理想距离固定，不再每帧随机 → 不再“走着走着来回乱走”
 */
describe('enemy hit / movement stability', () => {
  it('受击会打断蓄力中的特色技能（取消瞬移/跳跃蓄力）', () => {
    const ghost = new Enemy(ENEMY_CONFIGS.shadow_ghost!, 200, 300)
    // 模拟已进入 blink 蓄力（红圈警示），正等待 GameScene 消费
    ghost.wantsToUseSkill = true
    ghost.takeDamage(5)
    expect(ghost.wantsToUseSkill).toBe(false) // 不再被消费执行瞬移背刺
    expect(ghost.skillActive).toBe(0)
    expect(ghost.vx).toBe(0)
  })

  it('跳跃/俯冲中受击也会被打断（运动速度清零）', () => {
    const slime = new Enemy(ENEMY_CONFIGS.slime!, 200, 300)
    slime.consumeSkill() // 史莱姆起跳：skillActive=26, vy=-13
    expect(slime.skillActive).toBeGreaterThan(0)
    expect(slime.vy).toBeLessThan(0)
    slime.takeDamage(3)
    expect(slime.skillActive).toBe(0)
    expect(slime.vy).toBe(0) // 上抛被清零，只保留下落
    expect(slime.vx).toBe(0)
  })

  it('空中受击不进入硬直停顿（避免定在半空）', () => {
    const wolf = new Enemy(ENEMY_CONFIGS.frost_wolf!, 200, 300)
    wolf.onGround = false
    wolf.vy = 10 // 下落中
    wolf.takeDamage(4)
    expect((wolf as any).stunTimer).toBe(0) // 空中被击不 return 悬停
  })

  it('地面受击保留短暂硬直', () => {
    const e = new Enemy(ENEMY_CONFIGS.slime!, 200, 300)
    e.onGround = true
    e.takeDamage(4)
    expect((e as any).stunTimer).toBe(8)
  })

  it('远程怪理想距离固定，不在每帧重roll（避免来回乱走）', () => {
    const mage = new Enemy(ENEMY_CONFIGS.dark_mage!, 500, 300) as unknown as {
      rangedIdeal: number
      rangedRollTimer: number
      update: (x: number, y: number, p: Array<{ x: number; y: number; width: number; height: number }>) => void
    }
    // 首次 update 触发第一次 roll（定时器初始为 0）
    mage.update(100, 300, [])
    const rolled = mage.rangedIdeal
    expect(rolled).toBeGreaterThanOrEqual(150)
    expect(rolled).toBeLessThanOrEqual(200)
    for (let i = 0; i < 88; i++) {
      mage.update(100, 300, [])
      expect(mage.rangedIdeal).toBe(rolled) // 重roll周期内理想距离不再每帧变化
    }
  })

  it('远程怪移动方向在理想距离固定后保持稳定（修复前会频繁反向）', () => {
    const mage = new Enemy(ENEMY_CONFIGS.dark_mage!, 500, 300)
    // 玩家在左侧足够远处：|dx| 恒大于理想距离，vx 应始终向左逼近
    const signs = new Set<number>()
    for (let i = 0; i < 89; i++) {
      mage.update(100, 300, [])
      if (mage.vx !== 0) signs.add(Math.sign(mage.vx))
    }
    expect(signs.size).toBe(1)
    expect(signs.has(-1)).toBe(true)
  })
})
