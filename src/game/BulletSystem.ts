import { Bullet, Direction, Position } from './types'
import { GAME_CONFIG } from '@/src/config/gameConfig'

export interface BulletData {
  id: string
  position: Position
  size: { width: number; height: number }
  direction: Direction
  speed: number
  velocityX: number
  velocityY: number
  damage: number
  ownerId: string
  isPlayerBullet: boolean
}

export class BulletSystem {
  private bullets: Map<string, BulletData> = new Map()
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private idCounter: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  // Generate unique ID
  private generateId(): string {
    return `bullet_${++this.idCounter}`
  }

  // Add bullet
  addBullet(bullet: Omit<BulletData, 'id'>): string {
    const id = this.generateId()
    this.bullets.set(id, { ...bullet, id })
    return id
  }

  // Update bullet position
  updateBullet(id: string): boolean {
    const bullet = this.bullets.get(id)
    if (!bullet) return false

    bullet.position.x += bullet.velocityX
    bullet.position.y += bullet.velocityY

    // Check if bullet is out of bounds
    if (
      bullet.position.x < -bullet.size.width ||
      bullet.position.x > this.canvas.width ||
      bullet.position.y < -bullet.size.height ||
      bullet.position.y > this.canvas.height
    ) {
      this.bullets.delete(id)
      return false
    }

    return true
  }

  // Get all bullets
  getAllBullets(): BulletData[] {
    return Array.from(this.bullets.values())
  }

  // Get bullet by ID
  getBullet(id: string): BulletData | undefined {
    return this.bullets.get(id)
  }

  // Remove bullet
  removeBullet(id: string): boolean {
    return this.bullets.delete(id)
  }

  // Get bullet count
  getBulletCount(): number {
    return this.bullets.size
  }

  // Check collision with bullet
  checkCollision(bulletId: string, x: number, y: number, width: number, height: number): boolean {
    const bullet = this.bullets.get(bulletId)
    if (!bullet) return false

    return (
      bullet.position.x < x + width &&
      bullet.position.x + bullet.size.width > x &&
      bullet.position.y < y + height &&
      bullet.position.y + bullet.size.height > y
    )
  }

  // Update all bullets
  update() {
    const ids = Array.from(this.bullets.keys())
    for (const id of ids) {
      this.updateBullet(id)
    }
  }

  // Render all bullets
  render() {
    const bullets = Array.from(this.bullets.values())
    for (const bullet of bullets) {
      this.renderBullet(bullet)
    }
  }

  private renderBullet(bullet: BulletData) {
    const { x, y } = bullet.position
    const size = bullet.size.width

    // Draw bullet
    this.ctx.fillStyle = bullet.isPlayerBullet ? '#FFFF00' : '#FF0000'

    // Draw as circle
    this.ctx.beginPath()
    this.ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
    this.ctx.fill()

    // Draw glow effect
    this.ctx.fillStyle = bullet.isPlayerBullet ? 'rgba(255, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)'
    this.ctx.beginPath()
    this.ctx.arc(x + size / 2, y + size / 2, size / 2 + 2, 0, Math.PI * 2)
    this.ctx.fill()
  }

  // Reset bullet system
  reset() {
    this.bullets.clear()
    this.idCounter = 0
  }

  destroy() {
    this.bullets.clear()
  }
}
