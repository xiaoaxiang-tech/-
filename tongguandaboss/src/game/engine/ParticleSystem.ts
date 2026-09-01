// ============ 粒子系统 ============
import type { Particle, FloatingText } from '../types'

export class ParticleSystem {
  particles: Particle[] = []
  floatingTexts: FloatingText[] = []

  /** 直接添加一个完全指定的粒子（用于场景过渡等特殊效果） */
  add(p: Particle) {
    this.particles.push(p)
  }

  emit(x: number, y: number, count: number, color: string, config?: Partial<Particle>) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 4
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 20 + Math.random() * 20,
        maxLife: 40,
        size: config?.size ?? (2 + Math.random() * 4),
        color,
        alpha: 1,
      })
    }
  }

  addFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 20,
      text,
      color,
      life: 0,
      maxLife: 40,
    })
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.1 // gravity
      p.life++
      p.alpha = 1 - p.life / p.maxLife
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1)
      }
    }
    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i]!
      ft.y -= 1.5
      ft.life++
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1)
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw particles
    for (const p of this.particles) {
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      ctx.restore() 
    }
    // Draw floating texts
    for (const ft of this.floatingTexts) {
      const alpha = 1 - ft.life / ft.maxLife
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = ft.color
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      ctx.strokeText(ft.text, ft.x, ft.y)
      ctx.fillText(ft.text, ft.x, ft.y)
      ctx.restore()
    }
  }

  clear() {
    this.particles = []
    this.floatingTexts = []
  }
}
