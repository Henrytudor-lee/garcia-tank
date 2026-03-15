import { Tank, Direction, TankType, Position } from './types'
import { GAME_CONFIG } from '@/src/config/gameConfig'
import { MapSystem } from './MapSystem'

export class TankSystem {
  private tanks: Map<string, Tank> = new Map()
  private mapSystem: MapSystem
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private idCounter: number = 0
  private onFireCallback: ((bullet: any) => void) | null = null
  private customPlayerSpawn: Position | null = null
  private customEnemySpawns: Position[] = []

  constructor(canvas: HTMLCanvasElement, mapSystem: MapSystem) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.mapSystem = mapSystem
  }

  // Generate unique ID
  private generateId(): string {
    return `tank_${++this.idCounter}`
  }

  // Set custom spawn positions
  setCustomSpawns(playerSpawn: Position, enemySpawns: Position[]) {
    this.customPlayerSpawn = playerSpawn
    this.customEnemySpawns = enemySpawns
  }

  // Clear custom spawns
  clearCustomSpawns() {
    this.customPlayerSpawn = null
    this.customEnemySpawns = []
  }

  // Create player tank
  createPlayer(): Tank {
    const id = this.generateId()
    const config = GAME_CONFIG.TANK_CONFIGS[TankType.PLAYER]

    // Get tile size from map system
    const tileSize = this.mapSystem.getTileSize()

    // Use custom spawn position if available, otherwise use default
    let spawnX: number, spawnY: number
    if (this.customPlayerSpawn) {
      spawnX = this.customPlayerSpawn.x * tileSize + 2
      spawnY = this.customPlayerSpawn.y * tileSize + 2
    } else {
      // Default spawn at tile (4, 11)
      spawnX = 4 * tileSize + 2
      spawnY = 11 * tileSize + 2
    }

    // Get tank size based on tile size (slightly smaller than tile)
    const tankSize = tileSize * 0.9

    const tank: Tank = {
      id,
      type: TankType.PLAYER,
      position: { x: spawnX, y: spawnY },
      size: { width: tankSize, height: tankSize },
      direction: Direction.UP,
      speed: config.speed,
      hp: config.hp,
      maxHp: config.hp,
      fireCooldown: config.fireCooldown,
      lastFireTime: 0,
      isPlayer: true,
      isMoving: false,
      spriteColor: config.color,
    }

    this.tanks.set(id, tank)
    return tank
  }

  // Create enemy tank
  createEnemy(type: TankType): Tank {
    const id = this.generateId()
    const config = GAME_CONFIG.TANK_CONFIGS[type]

    // Get tile size from map system
    const tileSize = this.mapSystem.getTileSize()

    // Use custom enemy spawns if available, otherwise use default
    let spawn: Position
    if (this.customEnemySpawns.length > 0) {
      const spawnIdx = this.tanks.size % this.customEnemySpawns.length
      const customSpawn = this.customEnemySpawns[spawnIdx]
      spawn = {
        x: customSpawn.x * tileSize,
        y: customSpawn.y * tileSize
      }
    } else {
      // Default spawn positions for enemies (below top border, at tile y=1)
      const spawnPositions: Position[] = [
        { x: 1 * tileSize, y: 1 * tileSize },
        { x: 6 * tileSize, y: 1 * tileSize },
        { x: 11 * tileSize, y: 1 * tileSize },
      ]
      const spawnIdx = this.tanks.size % spawnPositions.length
      spawn = spawnPositions[spawnIdx]
    }

    // Get tank size based on tile size
    const tankSize = tileSize * 0.9

    const tank: Tank = {
      id,
      type,
      position: { x: spawn.x + tileSize * 0.05, y: spawn.y + tileSize * 0.05 },
      size: { width: tankSize, height: tankSize },
      direction: Direction.DOWN,
      speed: config.speed,
      hp: config.hp,
      maxHp: config.hp,
      fireCooldown: config.fireCooldown,
      lastFireTime: 0,
      isPlayer: false,
      isMoving: false,
      spriteColor: config.color,
    }

    this.tanks.set(id, tank)
    return tank
  }

  // Move tank
  moveTank(tankId: string, direction: Direction): boolean {
    const tank = this.tanks.get(tankId)
    if (!tank) return false

    const speed = tank.speed
    let newX = tank.position.x
    let newY = tank.position.y

    switch (direction) {
      case Direction.UP:
        newY -= speed
        break
      case Direction.DOWN:
        newY += speed
        break
      case Direction.LEFT:
        newX -= speed
        break
      case Direction.RIGHT:
        newX += speed
        break
    }

    // Keep within canvas bounds
    newX = Math.max(0, Math.min(this.canvas.width - tank.size.width, newX))
    newY = Math.max(0, Math.min(this.canvas.height - tank.size.height, newY))

    // Check map collision
    if (!this.mapSystem.isColliding(newX, newY, tank.size.width)) {
      tank.position.x = newX
      tank.position.y = newY
      tank.direction = direction
      tank.isMoving = true
      return true
    }

    tank.isMoving = false
    return false
  }

  // Update tank direction without moving
  setDirection(tankId: string, direction: Direction): boolean {
    const tank = this.tanks.get(tankId)
    if (!tank) return false

    const newX = tank.position.x
    const newY = tank.position.y
    let canMove = false

    switch (direction) {
      case Direction.UP:
        canMove = !this.mapSystem.isColliding(newX, newY - 1, tank.size.width)
        break
      case Direction.DOWN:
        canMove = !this.mapSystem.isColliding(newX, newY + 1, tank.size.width)
        break
      case Direction.LEFT:
        canMove = !this.mapSystem.isColliding(newX - 1, newY, tank.size.width)
        break
      case Direction.RIGHT:
        canMove = !this.mapSystem.isColliding(newX + 1, newY, tank.size.width)
        break
    }

    if (canMove) {
      tank.direction = direction
      return true
    }
    return false
  }

  // Fire bullet from tank
  fire(tankId: string): { success: boolean; bullet?: any } {
    const tank = this.tanks.get(tankId)
    if (!tank) return { success: false }

    const now = Date.now()
    if (now - tank.lastFireTime < tank.fireCooldown) {
      return { success: false }
    }

    tank.lastFireTime = now

    // Calculate bullet size proportional to tile size
    const tileSize = this.mapSystem.getTileSize()
    const bulletSize = tileSize * 0.15  // 15% of tile size

    // Calculate bullet position (center of tank, offset in direction)
    let bulletX = tank.position.x + tank.size.width / 2 - bulletSize / 2
    let bulletY = tank.position.y + tank.size.height / 2 - bulletSize / 2

    const bulletSpeed = GAME_CONFIG.BULLET_SPEED
    let velocityX = 0
    let velocityY = 0

    switch (tank.direction) {
      case Direction.UP:
        bulletY -= bulletSize
        velocityY = -bulletSpeed
        break
      case Direction.DOWN:
        bulletY += tank.size.height
        velocityY = bulletSpeed
        break
      case Direction.LEFT:
        bulletX -= bulletSize
        velocityX = -bulletSpeed
        break
      case Direction.RIGHT:
        bulletX += tank.size.width
        velocityX = bulletSpeed
        break
    }

    const bullet = {
      id: `bullet_${++this.idCounter}`,
      position: { x: bulletX, y: bulletY },
      size: { width: bulletSize, height: bulletSize },
      direction: tank.direction,
      speed: bulletSpeed,
      velocityX,
      velocityY,
      damage: GAME_CONFIG.BULLET_DAMAGE,
      ownerId: tankId,
      isPlayerBullet: tank.isPlayer,
    }

    return { success: true, bullet }
  }

  // Get tank by ID
  getTank(id: string): Tank | undefined {
    return this.tanks.get(id)
  }

  // Get all tanks
  getAllTanks(): Tank[] {
    return Array.from(this.tanks.values())
  }

  // Get player tank
  getPlayer(): Tank | undefined {
    const allTanks = Array.from(this.tanks.values())
    for (const tank of allTanks) {
      if (tank.isPlayer) return tank
    }
    return undefined
  }

  // Get enemy tanks
  getEnemies(): Tank[] {
    return Array.from(this.tanks.values()).filter(t => !t.isPlayer)
  }

  // Remove tank
  removeTank(id: string): boolean {
    return this.tanks.delete(id)
  }

  // Damage tank
  damageTank(id: string, damage: number): boolean {
    const tank = this.tanks.get(id)
    if (!tank) return false

    tank.hp -= damage
    return tank.hp <= 0
  }

  // Render all tanks
  render() {
    const allTanks = Array.from(this.tanks.values())
    for (const tank of allTanks) {
      this.renderTank(tank)
    }
  }

  private renderTank(tank: Tank) {
    const { x, y } = tank.position
    const { width, height } = tank.size
    const color = tank.spriteColor || '#00ff00'

    // Draw tank body
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, width, height)

    // Draw tank details based on direction
    this.ctx.fillStyle = this.darkenColor(color, 0.3)

    // Draw turret/track details
    const trackWidth = 6
    const bodyPadding = 4

    // Horizontal tracks
    this.ctx.fillRect(x + bodyPadding, y + bodyPadding, trackWidth, height - bodyPadding * 2)
    this.ctx.fillRect(x + width - bodyPadding - trackWidth, y + bodyPadding, trackWidth, height - bodyPadding * 2)

    // Draw turret (darker center)
    const turretSize = 14
    const turretX = x + (width - turretSize) / 2
    const turretY = y + (height - turretSize) / 2
    this.ctx.fillRect(turretX, turretY, turretSize, turretSize)

    // Draw cannon barrel
    this.ctx.fillStyle = this.darkenColor(color, 0.2)
    const barrelLength = 12
    const barrelWidth = 4
    const barrelX = x + width / 2 - barrelWidth / 2
    const barrelY = y + height / 2 - barrelWidth / 2

    switch (tank.direction) {
      case Direction.UP:
        this.ctx.fillRect(barrelX, y - 2, barrelWidth, barrelLength)
        break
      case Direction.DOWN:
        this.ctx.fillRect(barrelX, y + height - barrelLength + 2, barrelWidth, barrelLength)
        break
      case Direction.LEFT:
        this.ctx.fillRect(x - 2, barrelY, barrelLength, barrelWidth)
        break
      case Direction.RIGHT:
        this.ctx.fillRect(x + width - barrelLength + 2, barrelY, barrelLength, barrelWidth)
        break
    }

    // Draw direction indicator
    this.ctx.fillStyle = '#FFFFFF'
    const indicatorSize = 4
    const indicatorOffset = 8

    switch (tank.direction) {
      case Direction.UP:
        this.ctx.fillRect(x + width / 2 - indicatorSize / 2, y + indicatorOffset, indicatorSize, indicatorSize)
        break
      case Direction.DOWN:
        this.ctx.fillRect(x + width / 2 - indicatorSize / 2, y + height - indicatorOffset - indicatorSize, indicatorSize, indicatorSize)
        break
      case Direction.LEFT:
        this.ctx.fillRect(x + indicatorOffset, y + height / 2 - indicatorSize / 2, indicatorSize, indicatorSize)
        break
      case Direction.RIGHT:
        this.ctx.fillRect(x + width - indicatorOffset - indicatorSize, y + height / 2 - indicatorSize / 2, indicatorSize, indicatorSize)
        break
    }

    // Draw player indicator
    if (tank.isPlayer) {
      this.ctx.strokeStyle = '#FFFF00'
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
    }
  }

  private darkenColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)

    const newR = Math.max(0, Math.floor(r * (1 - amount)))
    const newG = Math.max(0, Math.floor(g * (1 - amount)))
    const newB = Math.max(0, Math.floor(b * (1 - amount)))

    return `rgb(${newR}, ${newG}, ${newB})`
  }

  // Reset tank system
  reset() {
    this.tanks.clear()
    this.idCounter = 0
    this.customPlayerSpawn = null
    this.customEnemySpawns = []
  }

  destroy() {
    this.tanks.clear()
  }
}
