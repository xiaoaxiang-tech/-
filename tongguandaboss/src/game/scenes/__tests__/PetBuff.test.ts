import { beforeAll, describe, it, expect } from 'vitest'
import { installCanvasMock } from '../../engine/__tests__/helpers/canvasMock'
import type { GameConfig, PetConfig } from '../../types'

let GameScene: typeof import('../GameScene').GameScene

const CFG: GameConfig = { width: 960, height: 600, gravity: 0.8, groundY: 600 }

// 固定测试用宠物配置（独立于正式配置，避免数值调整导致测试脆弱）
const PET_SPEED: PetConfig = {
  id: 'pet_test_speed',
  name: '测试·速度',
  description: '',
  icon: '⚡',
  color: '#fff',
  buff: { type: 'speed', value: 2 },
  skillName: '',
  skillDescription: '',
  attackDamage: 1,
  attackInterval: 90,
  projectileType: 'magic',
}
const PET_ATTACK: PetConfig = {
  id: 'pet_test_attack',
  name: '测试·攻击',
  description: '',
  icon: '⚔️',
  color: '#fff',
  buff: { type: 'attack', value: 5 },
  skillName: '',
  skillDescription: '',
  attackDamage: 1,
  attackInterval: 90,
  projectileType: 'magic',
}
const PET_HP: PetConfig = {
  id: 'pet_test_hp',
  name: '测试·生命',
  description: '',
  icon: '❤️',
  color: '#fff',
  buff: { type: 'hp', value: 40 },
  skillName: '',
  skillDescription: '',
  attackDamage: 1,
  attackInterval: 90,
  projectileType: 'magic',
}

beforeAll(async () => {
  installCanvasMock()
  GameScene = (await import('../GameScene')).GameScene
})

describe('宠物 buff 不叠加（切换/重进关卡不残留加速）', () => {
  it('应用速度宠物后 speed 正确加成', () => {
    const scene = new GameScene(CFG)
    const player = (scene as any).player
    expect(player.speed).toBe(4)
    ;(scene as any).applyPetBuff(PET_SPEED)
    expect(player.speed).toBe(6)
  })

  it('切换宠物时旧 buff 被撤销（速度不残留）', () => {
    const scene = new GameScene(CFG)
    const player = (scene as any).player
    ;(scene as any).applyPetBuff(PET_SPEED)
    expect(player.speed).toBe(6)
    // 切换到攻击宠物：速度回到基础 4，攻击 10 → 15
    ;(scene as any).applyPetBuff(PET_ATTACK)
    expect(player.speed).toBe(4)
    expect(player.attack).toBe(15)
  })

  it('同一宠物反复应用（如反复进入关卡）不叠加', () => {
    const scene = new GameScene(CFG)
    const player = (scene as any).player
    ;(scene as any).applyPetBuff(PET_SPEED)
    ;(scene as any).applyPetBuff(PET_SPEED)
    ;(scene as any).applyPetBuff(PET_SPEED)
    expect(player.speed).toBe(6)
  })

  it('取消宠物（未选择宠物进入关卡）后属性恢复基础值', () => {
    const scene = new GameScene(CFG)
    const player = (scene as any).player
    ;(scene as any).applyPetBuff(PET_SPEED)
    expect(player.speed).toBe(6)
    ;(scene as any).unapplyPetBuff()
    expect(player.speed).toBe(4)
  })

  it('hp buff 切换后当前血量被正确收敛到新上限内', () => {
    const scene = new GameScene(CFG)
    const player = (scene as any).player
    ;(scene as any).applyPetBuff(PET_HP)
    expect(player.maxHp).toBe(140)
    expect(player.hp).toBe(140)
    // 将血量打低后切换到攻击宠物：上限回落 100，血量保持 50 不变
    player.hp = 50
    ;(scene as any).applyPetBuff(PET_ATTACK)
    expect(player.maxHp).toBe(100)
    expect(player.hp).toBe(50)
  })
})
