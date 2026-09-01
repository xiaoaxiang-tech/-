import { beforeAll, describe, it, expect } from 'vitest'
import { installCanvasMock } from '../../engine/__tests__/helpers/canvasMock'
import type { KeyState, Platform } from '../../types'

let Player: typeof import('../Player').Player

beforeAll(async () => {
  // 与 ThemeSystem.test 相同：mock 就绪后再加载 Player（其 import 链含 AssetLoader）
  installCanvasMock()
  Player = (await import('../Player')).Player
})

const idle: KeyState = {
  left: false,
  right: false,
  jump: false,
  attack: false,
  skill1: false,
  skill2: false,
  ultimate: false,
  switchWeapon: false,
  pause: false,
  directWeapon: -1,
}

const groundPlatforms: Platform[] = [
  { x: 0, y: 600, width: 480, height: 50, type: 'ground' },
]

describe('Player 坠崖复位', () => {
  it('掉出画面底部后回到最近平台顶部并扣除坠落伤害', () => {
    const player = new Player(200, 545)
    // 模拟玩家从平台缝隙掉入深坑
    player.y = 721

    player.update(idle, groundPlatforms)

    // 站回 ground 平台顶部（y = 600 - 56 + 4 = 548）
    expect(player.y).toBe(548)
    // 水平居中于最近平台
    expect(player.x).toBe(224)
    // 扣除 15% 最大生命 = 15，新混合减伤：round(15-2.5)=13，防御低时保底 round(15*0.25)=4，取较大值 13
    expect(player.hp).toBe(87)
    // 重力清零、有短暂无敌帧
    expect(player.vy).toBe(0)
    expect(player.invincible).toBe(true)
  })

  it('复位后下一帧正常落地并恢复 onGround', () => {
    const player = new Player(200, 545)
    player.y = 721
    player.update(idle, groundPlatforms)
    expect(player.onGround).toBe(false)

    // 第二帧：重力下落与平台碰撞，正常站住
    player.update(idle, groundPlatforms)

    expect(player.onGround).toBe(true)
    expect(player.y).toBe(548)
    expect(player.vy).toBe(0)
  })

  it('无敌状态下坠崖不重复扣血但仍复位', () => {
    const player = new Player(200, 545)
    player.invincible = true
    player.y = 721

    player.update(idle, groundPlatforms)

    expect(player.hp).toBe(100)
    expect(player.y).toBe(548)
    expect(player.invincible).toBe(true)
  })

  it('在地面正常行走时不会误触发坠崖复位', () => {
    const player = new Player(200, 545)
    // 正常站在地面上，掉落到 y=600 附近也不该触发
    player.y = 600
    player.update(idle, groundPlatforms)
    expect(player.hp).toBe(100)
    expect(player.y).toBeLessThanOrEqual(620)
  })
})
