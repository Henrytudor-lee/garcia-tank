// Visual effect types
export enum EffectType {
  EXPLOSION = 'explosion',
}

// Explosion effect data
export interface ExplosionEffect {
  id: string
  x: number
  y: number
  radius: number
  maxRadius: number
  alpha: number
  color: string
}

// Visual effect system for managing particle effects
export class EffectSystem {
  private explosions: ExplosionEffect[] = []
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private idCounter: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  // Trigger explosion at position
  triggerExplosion(x: number, y: number, radius: number = 40) {
    const explosion: ExplosionEffect = {
      id: `explosion_${this.idCounter++}`,
      x,
      y,
      radius: 0,
      maxRadius: radius,
      alpha: 1,
      color: '#ff4444',
    }
    this.explosions.push(explosion)
  }

  // Trigger multiple explosions (for bomb)
  triggerBombExplosions(positions: { x: number; y: number; size: number }[]) {
    for (const pos of positions) {
      this.triggerExplosion(
        pos.x + pos.size / 2,
        pos.y + pos.size / 2,
        pos.size
      )
    }
  }

  // Update effects
  update() {
    // Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i]
      exp.radius += 4
      exp.alpha -= 0.05

      if (exp.alpha <= 0 || exp.radius >= exp.maxRadius) {
        this.explosions.splice(i, 1)
      }
    }
  }

  // Render all effects
  render() {
    // Render explosions
    for (const exp of this.explosions) {
      this.renderExplosion(exp)
    }
  }

  // Render single explosion
  private renderExplosion(exp: ExplosionEffect) {
    const ctx = this.ctx

    // Draw outer glow
    const gradient = ctx.createRadialGradient(
      exp.x, exp.y, 0,
      exp.x, exp.y, exp.radius
    )
    gradient.addColorStop(0, `rgba(255, 255, 200, ${exp.alpha})`)
    gradient.addColorStop(0.3, `rgba(255, 150, 50, ${exp.alpha * 0.8})`)
    gradient.addColorStop(0.6, `rgba(255, 50, 0, ${exp.alpha * 0.5})`)
    gradient.addColorStop(1, `rgba(100, 0, 0, 0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2)
    ctx.fill()

    // Draw inner bright core
    const coreRadius = exp.radius * 0.3
    const coreGradient = ctx.createRadialGradient(
      exp.x, exp.y, 0,
      exp.x, exp.y, coreRadius
    )
    coreGradient.addColorStop(0, `rgba(255, 255, 255, ${exp.alpha})`)
    coreGradient.addColorStop(1, `rgba(255, 255, 200, 0)`)

    ctx.fillStyle = coreGradient
    ctx.beginPath()
    ctx.arc(exp.x, exp.y, coreRadius, 0, Math.PI * 2)
    ctx.fill()

    // Draw spark lines
    ctx.strokeStyle = `rgba(255, 200, 100, ${exp.alpha * 0.8})`
    ctx.lineWidth = 2
    const sparkCount = 8
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2
      const sparkLength = exp.radius * 0.8
      const sparkX = exp.x + Math.cos(angle) * sparkLength
      const sparkY = exp.y + Math.sin(angle) * sparkLength

      ctx.beginPath()
      ctx.moveTo(exp.x + Math.cos(angle) * exp.radius * 0.2, exp.y + Math.sin(angle) * exp.radius * 0.2)
      ctx.lineTo(sparkX, sparkY)
      ctx.stroke()
    }
  }

  // Check if effects are still active
  hasActiveEffects(): boolean {
    return this.explosions.length > 0
  }

  // Get explosion count
  getExplosionCount(): number {
    return this.explosions.length
  }

  // Reset
  reset() {
    this.explosions = []
  }

  // Destroy
  destroy() {
    this.explosions = []
  }
}