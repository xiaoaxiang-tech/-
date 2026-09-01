// ============ 物理/碰撞管理器 ============
import type { Rect, Platform } from '../types'

export class PhysicsManager {
  /** AABB 碰撞检测 */
  static rectCollide(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    )
  }

  /** 点是否在矩形内 */
  static pointInRect(px: number, py: number, r: Rect): boolean {
    return px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height
  }

  /** 解决平台碰撞 */
  static resolvePlatforms(
    x: number, y: number, w: number, h: number,
    vx: number, vy: number,
    platforms: Platform[]
  ): { x: number; y: number; vx: number; vy: number; onGround: boolean } {
    let nx = x + vx
    let ny = y + vy
    let nvx = vx
    let nvy = vy
    let onGround = false

    const entity: Rect = { x: nx, y: ny, width: w, height: h }

    for (const plat of platforms) {
      const pr: Rect = { x: plat.x, y: plat.y, width: plat.width, height: plat.height }

      if (!this.rectCollide(entity, pr)) continue

      const overlapLeft = (entity.x + entity.width) - pr.x
      const overlapRight = (pr.x + pr.width) - entity.x
      const overlapTop = (entity.y + entity.height) - pr.y
      const overlapBottom = (pr.y + pr.height) - entity.y

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)

      if (minOverlap === overlapTop && nvy >= 0) {
        // 落在平台上
        entity.y = pr.y - entity.height
        nvy = 0
        onGround = true
      } else if (minOverlap === overlapBottom && nvy < 0) {
        // 撞头
        entity.y = pr.y + pr.height
        nvy = 0
      } else if (minOverlap === overlapLeft && nvx > 0) {
        entity.x = pr.x - entity.width
        nvx = 0
      } else if (minOverlap === overlapRight && nvx < 0) {
        entity.x = pr.x + pr.width
        nvx = 0
      }
    }

    return { x: entity.x, y: entity.y, vx: nvx, vy: nvy, onGround }
  }

  /** 距离计算 */
  static distance(ax: number, ay: number, bx: number, by: number): number {
    return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
  }
}
