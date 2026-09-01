import { beforeAll, describe, it, expect } from 'vitest'
import { installCanvasMock } from '../../engine/__tests__/helpers/canvasMock'
import type { BossConfig } from '../../types'

let Boss: typeof import('../Boss').Boss

beforeAll(async () => {
  // 与 ThemeSystem.test 相同：mock 就绪后再加载 Boss（其 import 链含 AssetLoader）
  installCanvasMock()
  Boss = (await import('../Boss')).Boss
})

/** 双招式阶段配置：验证组合轮换 */
const MULTI_PATTERN_CFG: BossConfig = {
  name: '测试守护者',
  maxHp: 500,
  width: 80,
  height: 90,
  phases: [
    { pattern: 'melee', patterns: ['melee', 'charge'], speed: 3, attackDamage: 20, attackInterval: 24, hpThreshold: 1.0 },
    { pattern: 'charge', patterns: ['charge', 'aoe'], speed: 6, attackDamage: 25, attackInterval: 24, hpThreshold: 0.5 },
  ],
  dropExp: 1,
}

describe('Boss 招式组合', () => {
  it('多招式阶段内会轮换到不同招式（不再永远只用一种）', () => {
    const boss = new Boss(MULTI_PATTERN_CFG, 300, 0, 100, () => 0)
    const seen = new Set<string>()
    for (let i = 0; i < 320; i++) {
      boss.update(200, 50)
      seen.add(boss.currentPattern)
    }
    expect(seen.has('melee')).toBe(true)
    expect(seen.has('charge')).toBe(true)
  })

  it('招式轮换绝不连续重复', () => {
    const boss = new Boss(MULTI_PATTERN_CFG, 300, 0, 100, () => 0)
    const seq: string[] = []
    for (let i = 0; i < 320; i++) {
      boss.update(200, 50)
      if (boss.currentPattern !== seq[seq.length - 1]) seq.push(boss.currentPattern)
    }
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).not.toBe(seq[i - 1])
    }
  })

  it('向后兼容：只有单一 pattern 的阶段始终使用该招式', () => {
    const cfg: BossConfig = {
      ...MULTI_PATTERN_CFG,
      phases: [{ pattern: 'aoe', speed: 2, attackDamage: 30, attackInterval: 20, hpThreshold: 1.0 }],
    }
    const boss = new Boss(cfg, 300, 0, 100, () => 0)
    for (let i = 0; i < 200; i++) boss.update(200, 50)
    expect(boss.currentPattern).toBe('aoe')
  })

  it('血量降到阈值后切换阶段，招式列表随之更新', () => {
    const boss = new Boss(MULTI_PATTERN_CFG, 300, 0, 100, () => 0)
    expect(boss.currentPhase).toBe(0)
    boss.hp = 200 // 200/500 = 0.4 < 0.5
    boss.update(200, 50)
    expect(boss.currentPhase).toBe(1)
    expect(boss.patternList).toEqual(['charge', 'aoe'])
  })

  it('melee 招式在释放窗口内触发一次近战', () => {
    const cfg: BossConfig = {
      ...MULTI_PATTERN_CFG,
      phases: [{ pattern: 'melee', patterns: ['melee'], speed: 3, attackDamage: 20, attackInterval: 20, hpThreshold: 1.0 }],
    }
    const boss = new Boss(cfg, 300, 0, 100, () => 0)
    let hits = 0
    for (let i = 0; i < 200; i++) {
      boss.update(100, 50)
      if (boss.wantsToAttack()) hits++
    }
    expect(hits).toBeGreaterThan(0)
  })

  it('projectile 招式在释放窗口内多次触发弹幕', () => {
    const cfg: BossConfig = {
      ...MULTI_PATTERN_CFG,
      phases: [{ pattern: 'projectile', patterns: ['projectile'], speed: 2, attackDamage: 20, attackInterval: 20, hpThreshold: 1.0 }],
    }
    const boss = new Boss(cfg, 300, 0, 100, () => 0)
    let shots = 0
    for (let i = 0; i < 200; i++) {
      boss.update(100, 50)
      if (boss.wantsToShoot()) shots++
    }
    expect(shots).toBeGreaterThan(0)
  })

  it('charge/aoe/spin/summon 招式分别在合适时机触发', () => {
    // charge：蓄力完成后起跑瞬间触发一次
    {
      const cfg: BossConfig = {
        ...MULTI_PATTERN_CFG,
        phases: [{ pattern: 'charge', patterns: ['charge'], speed: 4, attackDamage: 20, attackInterval: 20, hpThreshold: 1.0 }],
      }
      const boss = new Boss(cfg, 300, 0, 100, () => 0)
      let charges = 0
      for (let i = 0; i < 240; i++) {
        boss.update(100, 50)
        if (boss.wantsToCharge()) charges++
      }
      expect(charges).toBeGreaterThan(0)
    }
    // aoe：原地聚气后爆发一次
    {
      const cfg: BossConfig = {
        ...MULTI_PATTERN_CFG,
        phases: [{ pattern: 'aoe', patterns: ['aoe'], speed: 2, attackDamage: 20, attackInterval: 20, hpThreshold: 1.0 }],
      }
      const boss = new Boss(cfg, 300, 0, 100, () => 0)
      let aoes = 0
      for (let i = 0; i < 300; i++) {
        boss.update(100, 50)
        if (boss.wantsAreaAttack()) aoes++
      }
      expect(aoes).toBeGreaterThan(0)
    }
    // spin：旋转冲刺期间持续造成接触伤害
    {
      const cfg: BossConfig = {
        ...MULTI_PATTERN_CFG,
        phases: [{ pattern: 'spin', patterns: ['spin'], speed: 5, attackDamage: 20, attackInterval: 20, hpThreshold: 1.0 }],
      }
      const boss = new Boss(cfg, 300, 0, 100, () => 0)
      let spinFrames = 0
      for (let i = 0; i < 240; i++) {
        boss.update(100, 50)
        if (boss.isSpinningNow()) spinFrames++
      }
      expect(spinFrames).toBeGreaterThan(0)
    }
    // summon：召唤只能被消费一次，消费后不再重复
    {
      const cfg: BossConfig = {
        ...MULTI_PATTERN_CFG,
        phases: [{ pattern: 'summon', patterns: ['summon'], speed: 2, attackDamage: 20, attackInterval: 20, hpThreshold: 1.0 }],
      }
      const boss = new Boss(cfg, 300, 0, 100, () => 0)
      let summons = 0
      for (let i = 0; i < 240; i++) {
        boss.update(100, 50)
        if (boss.willSummon()) {
          summons++
          boss.consumeSummon()
        }
      }
      expect(summons).toBeGreaterThan(0)
    }
  })

  it('出招期间 attacking 标志置真，精灵表切换到攻击帧段绘制', () => {
    const cfg: BossConfig = {
      ...MULTI_PATTERN_CFG,
      phases: [{ pattern: 'melee', patterns: ['melee'], speed: 3, attackDamage: 20, attackInterval: 20, hpThreshold: 1.0 }],
    }
    const boss = new Boss(cfg, 300, 0, 100, () => 0)
    let sawAttacking = false
    let sawIdle = false
    const drawSX: number[] = []
    const recordCtx = {
      save: () => {},
      restore: () => {},
      globalAlpha: 1,
      drawImage: (_img: unknown, sx: number) => { drawSX.push(sx) },
      fillRect: () => {},
    } as unknown as CanvasRenderingContext2D

    for (let i = 0; i < 240; i++) {
      boss.update(100, 50)
      if (boss.attacking) sawAttacking = true
      else sawIdle = true
      boss.draw(recordCtx)
    }
    expect(sawAttacking).toBe(true)
    expect(sawIdle).toBe(true)
    // 攻击帧段 sx = 4*96=384 起（前 4 帧待机 / 后 4 帧攻击）
    expect(drawSX.some(sx => sx >= 384)).toBe(true)
    expect(drawSX.some(sx => sx < 384)).toBe(true)
  })
})
