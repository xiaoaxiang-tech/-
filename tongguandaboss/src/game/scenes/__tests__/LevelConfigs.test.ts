import { describe, it, expect } from 'vitest'
import { LEVEL_CONFIGS } from '../LevelConfigs'
import { getSceneTransitionState } from '../GameScene'

describe('level scene progression', () => {
  it('每一关都应该包含多段可推进的场景', () => {
    for (const level of LEVEL_CONFIGS) {
      expect(level.scenes.length).toBeGreaterThanOrEqual(3)
      expect(level.scenes.every(scene => scene.waves.length > 0)).toBe(true)
      const totalLength = level.scenes.reduce((sum, scene) => sum + scene.length, 0)
      expect(totalLength).toBeGreaterThanOrEqual(level.levelLength)
    }
  })

  it('每个场景都应该有唯一视觉主题（保证切换时有明显差异）', () => {
    for (const level of LEVEL_CONFIGS) {
      const themes = level.scenes.map(scene => scene.theme ?? 0)
      expect(new Set(themes).size).toBe(level.scenes.length)
    }
  })

  it('每个场景波次充足（>=3），避免快速抵达 Boss', () => {
    for (const level of LEVEL_CONFIGS) {
      for (const scene of level.scenes) {
        expect(scene.waves.length).toBeGreaterThanOrEqual(3)
        // 每波都有敌人
        expect(scene.waves.every(w => w.enemies.length > 0)).toBe(true)
      }
    }
  })

  it('每个场景都配置了精英小怪、宝箱与秘密通道', () => {
    for (const level of LEVEL_CONFIGS) {
      for (const scene of level.scenes) {
        const hasElite = scene.waves.some(w => w.enemies.some(g => g.elite))
        expect(hasElite).toBe(true)
        // 普通路径宝箱
        expect(scene.chests?.length).toBeGreaterThanOrEqual(2)
        // 秘密通道：高台 + 特殊宝箱 + 精英守卫
        expect(scene.secretArea).toBeDefined()
        expect(scene.secretArea!.platforms.length).toBeGreaterThanOrEqual(2)
        expect(scene.secretArea!.chests?.some(c => c.type === 'special')).toBe(true)
        expect(scene.secretArea!.eliteGuards?.length).toBeGreaterThanOrEqual(1)
      }
    }
  })
})
