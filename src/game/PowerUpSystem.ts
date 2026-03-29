import { PowerUp, PowerUpType, Position } from './types'
import { GAME_CONFIG } from '@/src/config/gameConfig'

export class PowerUpSystem {
  private powerUps: Map<string, PowerUp> = new Map()
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private mapSystem: any // Will be set from GameEngine
  private idCounter: number = 0
  private pulsePhase: number = 0
  private magnetActive: boolean = false
  private magnetEndTime: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  // Set map system reference for finding empty tiles
  setMapSystem(mapSystem: any) {
    this.mapSystem = mapSystem
  }

  // Try to drop a power-up at enemy death position
  tryDropPowerUp(enemyX: number, enemyY: number, enemyType: string): PowerUp | null {
    const config = GAME_CONFIG.POWER_UPS
    const chance = config.DROP_CHANCE

    // Stronger enemies have higher drop chance
    const typeBonus = enemyType === 'enemy_armor' ? 0.15 :
                      enemyType === 'enemy_heavy' ? 0.10 :
                      enemyType === 'enemy_fast' ? 0.05 : 0

    if (Math.random() > chance + typeBonus) {
      return null
    }

    // Choose random power-up type
    const types = Object.values(config.TYPES)
    const randomType = types[Math.floor(Math.random() * types.length)] as any

    const powerUp: PowerUp = {
      id: `powerup_${this.idCounter++}`,
      position: { x: enemyX - config.TILE_SIZE / 2, y: enemyY - config.TILE_SIZE / 2 },
      size: { width: config.TILE_SIZE, height: config.TILE_SIZE },
      direction: 0,
      type: randomType.name as PowerUpType,
      color: randomType.color,
      symbol: randomType.symbol,
    }

    this.powerUps.set(powerUp.id, powerUp)
    return powerUp
  }

  // Check if power-up should be removed (instant power-ups)
  isInstantPowerUp(type: PowerUpType): boolean {
    const config = GAME_CONFIG.POWER_UPS
    const typeKey = type as unknown as keyof typeof config.TYPES
    const typeConfig = config.TYPES[typeKey] as any
    return typeConfig?.instant === true
  }

  // Set magnet effect
  setMagnetActive(duration: number) {
    this.magnetActive = true
    this.magnetEndTime = Date.now() + duration
  }

  // Update magnet effect
  updateMagnet(playerX: number, playerY: number) {
    if (!this.magnetActive || Date.now() > this.magnetEndTime) {
      this.magnetActive = false
      return
    }

    // Move power-ups towards player
    const powerUps = Array.from(this.powerUps.values())
    for (const powerUp of powerUps) {
      const dx = playerX - powerUp.position.x
      const dy = playerY - powerUp.position.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > 5) {
        const speed = 3
        powerUp.position.x += (dx / dist) * speed
        powerUp.position.y += (dy / dist) * speed
      }
    }
  }

  // Check collision with a tank
  checkCollision(tankX: number, tankY: number, tankSize: number): PowerUp | null {
    const entries = Array.from(this.powerUps.entries())
    for (const [id, powerUp] of entries) {
      // Simple AABB collision
      if (
        tankX < powerUp.position.x + powerUp.size.width &&
        tankX + tankSize > powerUp.position.x &&
        tankY < powerUp.position.y + powerUp.size.height &&
        tankY + tankSize > powerUp.position.y
      ) {
        // Remove the power-up
        this.powerUps.delete(id)
        return powerUp
      }
    }
    return null
  }

  // Update power-up rendering (pulsing effect)
  update() {
    this.pulsePhase += 0.1

    // Check magnet expiration
    if (this.magnetActive && Date.now() > this.magnetEndTime) {
      this.magnetActive = false
    }
  }

  // Render all power-ups
  render() {
    const config = GAME_CONFIG.POWER_UPS

    const powerUps = Array.from(this.powerUps.values())
    for (const powerUp of powerUps) {
      const { position, size, color, symbol } = powerUp
      const centerX = position.x + size.width / 2
      const centerY = position.y + size.height / 2

      // Pulsing effect
      const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8
      const currentSize = size.width * pulse

      // Draw glow
      this.ctx.shadowColor = color
      this.ctx.shadowBlur = 15

      // Draw power-up background
      this.ctx.fillStyle = color
      this.ctx.globalAlpha = 0.7
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, currentSize / 2, 0, Math.PI * 2)
      this.ctx.fill()

      // Draw border
      this.ctx.globalAlpha = 1
      this.ctx.strokeStyle = '#ffffff'
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      // Draw symbol text
      this.ctx.shadowBlur = 0
      this.ctx.fillStyle = '#000000'
      this.ctx.font = 'bold 16px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(symbol, centerX, centerY)

      this.ctx.shadowBlur = 0
      this.ctx.globalAlpha = 1
    }

    // Draw magnet indicator if active
    if (this.magnetActive) {
      this.ctx.strokeStyle = '#ff00ff'
      this.ctx.lineWidth = 2
      this.ctx.globalAlpha = 0.3 + Math.sin(this.pulsePhase * 2) * 0.2
      this.ctx.beginPath()
      this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 100, 0, Math.PI * 2)
      this.ctx.stroke()
      this.ctx.globalAlpha = 1
    }
  }

  // Reset power-up system
  reset() {
    this.powerUps.clear()
    this.magnetActive = false
    this.magnetEndTime = 0
  }

  // Destroy
  destroy() {
    this.powerUps.clear()
  }
}