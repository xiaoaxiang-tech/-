// ============ 道具实体 ============
import type { Rect } from '../types'
import { AssetManager } from '../engine/AssetManager'

type ItemType = 'health' | 'mana' | 'coin_bronze' | 'coin_silver' | 'coin_gold'

export class Item {
  x: number
  y: number
  type: ItemType
  width = 20
  height = 20
  vy = 0
  onGround = false
  life = 0
  maxLife = 600 // 10秒后消失

  constructor(x: number, y: number, type: ItemType) {
    this.x = x
    this.y = y
    this.type = type
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, width: this.width, height: this.height }
  }

  update() {
    if (!this.onGround) {
      this.vy += 0.5
      this.y += this.vy
    }
    this.life++
  }

  isExpired(): boolean {
    return this.life >= this.maxLife
  }

  draw(ctx: CanvasRenderingContext2D, assetMgr: AssetManager, frame: number) {
    // 快消失时闪烁
    if (this.life > this.maxLife - 120 && Math.floor(this.life / 8) % 2 === 0) return
    assetMgr.drawItem(ctx, this.x, this.y, this.type, frame)
  }
}
