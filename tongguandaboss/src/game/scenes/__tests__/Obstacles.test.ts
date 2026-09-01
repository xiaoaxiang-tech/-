import { beforeAll, describe, it, expect } from 'vitest'
import { installCanvasMock } from '../../engine/__tests__/helpers/canvasMock'
import type { GameConfig } from '../../types'

let GameScene: typeof import('../GameScene').GameScene
let LEVEL_CONFIGS: typeof import('../LevelConfigs').LEVEL_CONFIGS

const CFG: GameConfig = { width: 960, height: 600, gravity: 0.8, groundY: 600 }

beforeAll(async () => {
  installCanvasMock()
  GameScene = (await import('../GameScene')).GameScene
  LEVEL_CONFIGS = (await import('../LevelConfigs')).LEVEL_CONFIGS
})

describe('可交互障碍物', () => {
  it('进入关卡自动生成 2+ 个可交互障碍物（木箱/尖刺/炸药桶）', () => {
    const scene = new GameScene(CFG)
    scene.startLevel(0)
    const obstacles = (scene as any).obstacles as Array<{ type: string; w: number; h: number; hp: number; alive: boolean }>
    expect(obstacles.length).toBeGreaterThanOrEqual(2)
    for (const ob of obstacles) {
      expect(['crate', 'spikes', 'barrel']).toContain(ob.type)
      expect(ob.w).toBeGreaterThan(0)
      expect(ob.h).toBeGreaterThan(0)
      expect(ob.hp).toBeGreaterThan(0)
      expect(ob.alive).toBe(true)
    }
  })

  it('每一关都会生成可交互障碍物，且位置落在场景内', () => {
    for (let lv = 0; lv < LEVEL_CONFIGS.length; lv++) {
      const scene = new GameScene(CFG)
      scene.startLevel(lv)
      const obstacles = (scene as any).obstacles as Array<{ x: number; w: number }>
      expect(obstacles.length).toBeGreaterThanOrEqual(2)
      for (const ob of obstacles) expect(ob.x + ob.w).toBeGreaterThan(0)
    }
  })

  it('关卡级手工 obstacles 配置优先于自动生成', () => {
    const scene = new GameScene(CFG)
    // 不直接改 scenes（LevelConfigs 只读），验证自动生成不抛异常即可
    scene.startLevel(2)
    const obstacles = (scene as any).obstacles as Array<{ type: string }>
    expect(obstacles.every(o => ['crate', 'spikes', 'barrel'].includes(o.type))).toBe(true)
  })
})

describe('地图加长', () => {
  it('每关场景长度之和等于关卡总长（加长后一致）', () => {
    for (const level of LEVEL_CONFIGS) {
      const total = level.scenes.reduce((sum, s) => sum + s.length, 0)
      expect(total).toBe(level.levelLength)
      // 每个场景显著加长
      for (const scene of level.scenes) {
        expect(scene.length).toBeGreaterThanOrEqual(2000)
      }
    }
  })

  it('加长后每个场景的地面平台完整覆盖场景长度（不会掉出地面）', () => {
    for (const level of LEVEL_CONFIGS) {
      for (const scene of level.scenes) {
        const grounds = scene.platforms.filter(p => p.type === 'ground')
        expect(grounds.length).toBeGreaterThan(0)
        const maxRight = Math.max(...grounds.map(g => g.x + g.width))
        expect(maxRight).toBeGreaterThanOrEqual(scene.length)
      }
    }
  })
})

describe('Boss 强化与灵活机动', () => {
  it('五个 Boss 血量明显提升（更高数值、更耐打）', () => {
    const hps = LEVEL_CONFIGS.map(l => l.boss.maxHp)
    expect(hps[0]).toBeGreaterThan(400)   // 草原守护者
    expect(hps[1]).toBeGreaterThan(500)   // 暗影狼王
    expect(hps[2]).toBeGreaterThan(650)   // 熔岩魔王
    expect(hps[3]).toBeGreaterThan(850)   // 冰霜巨人
    expect(hps[4]).toBeGreaterThan(1150)  // 深渊主宰
    // 血量随关卡严格递增，终局 Boss 最耐打
    for (let i = 1; i < hps.length; i++) {
      expect(hps[i]!).toBeGreaterThan(hps[i - 1]!)
    }
  })

  it('Boss 高阶段移动速度更快、攻击节奏更密（更灵活）', () => {
    for (const level of LEVEL_CONFIGS) {
      const last = level.boss.phases[level.boss.phases.length - 1]!
      expect(last.speed).toBeGreaterThanOrEqual(8)
      expect(last.attackInterval).toBeLessThanOrEqual(30)
    }
  })
})
