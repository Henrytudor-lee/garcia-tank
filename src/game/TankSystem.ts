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
  private customPlayer2Spawn: Position | null = null
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
  setCustomSpawns(playerSpawn: Position, enemySpawns: Position[], player2Spawn?: Position) {
    this.customPlayerSpawn = playerSpawn
    this.customPlayer2Spawn = player2Spawn || null
    this.customEnemySpawns = enemySpawns
  }

  // Clear custom spawns
  clearCustomSpawns() {
    this.customPlayerSpawn = null
    this.customPlayer2Spawn = null
    this.customEnemySpawns = []
  }

  // Create player 1 tank (green)
  createPlayer(color?: string): Tank {
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
      spriteColor: color || config.color,
    }

    this.tanks.set(id, tank)
    return tank
  }

  // Create player 2 tank (yellow)
  createPlayer2(color?: string): Tank {
    const id = this.generateId()
    const config = GAME_CONFIG.TANK_CONFIGS[TankType.PLAYER]

    // Get tile size from map system
    const tileSize = this.mapSystem.getTileSize()

    // Use custom spawn position if available, otherwise use default
    let spawnX: number, spawnY: number
    if (this.customPlayer2Spawn) {
      spawnX = this.customPlayer2Spawn.x * tileSize + 2
      spawnY = this.customPlayer2Spawn.y * tileSize + 2
    } else {
      // Default spawn at tile (8, 11)
      spawnX = 8 * tileSize + 2
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
      spriteColor: color || GAME_CONFIG.PLAYER2_COLOR || '#FFFF00',
    }

    this.tanks.set(id, tank)
    return tank
  }

  // Create enemy tank
  createEnemy(type: TankType, avoidPosition?: Position): Tank {
    const id = this.generateId()
    const config = GAME_CONFIG.TANK_CONFIGS[type]

    // Get tile size from map system
    const tileSize = this.mapSystem.getTileSize()

    // Use custom enemy spawns if available, otherwise use default
    let spawn: Position
    if (this.customEnemySpawns.length > 0) {
      // Filter out spawns too close to player
      const validSpawns = this.customEnemySpawns.filter(spawnPos => {
        if (!avoidPosition) return true
        const spawnPixelX = spawnPos.x * tileSize
        const spawnPixelY = spawnPos.y * tileSize
        const dx = spawnPixelX - avoidPosition.x
        const dy = spawnPixelY - avoidPosition.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance > tileSize * 4 // At least 4 tiles away
      })
      const spawnList = validSpawns.length > 0 ? validSpawns : this.customEnemySpawns
      const spawnIdx = Math.floor(Math.random() * spawnList.length)
      const randomSpawn = spawnList[spawnIdx]
      spawn = {
        x: randomSpawn.x * tileSize,
        y: randomSpawn.y * tileSize
      }
    } else {
      // Default spawn positions for enemies (below top border, at tile y=1)
      // Avoid x=6 which is where the base is located
      // Make spawn more random and avoid player position
      const spawnPositions: Position[] = [
        { x: 0, y: 1 },
        { x: 2, y: 1 },
        { x: 4, y: 1 },
        { x: 6, y: 1 },
        { x: 8, y: 1 },
        { x: 10, y: 1 },
        { x: 12, y: 1 },
        { x: 1, y: 0 },
        { x: 5, y: 0 },
        { x: 9, y: 0 },
        { x: 11, y: 0 },
      ]

      // Filter spawn positions that are too close to player
      const validSpawns = spawnPositions.filter(spawnPos => {
        if (!avoidPosition) return true
        const spawnPixelX = spawnPos.x * tileSize
        const spawnPixelY = spawnPos.y * tileSize
        const dx = spawnPixelX - avoidPosition.x
        const dy = spawnPixelY - avoidPosition.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance > tileSize * 4 // At least 4 tiles away
      })

      // Pick a random valid spawn
      const spawnList = validSpawns.length > 0 ? validSpawns : spawnPositions
      const randomIdx = Math.floor(Math.random() * spawnList.length)
      const randomSpawn = spawnList[randomIdx]
      spawn = {
        x: randomSpawn.x * tileSize,
        y: randomSpawn.y * tileSize
      }
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
  fire(tankId: string): { success: boolean; bullet?: any; extraBullets?: any[] } {
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

    // Check for triple bullet effect
    const hasTripleBullet = tank.tripleBulletEndTime && tank.tripleBulletEndTime > now

    const directions: number[] = hasTripleBullet ? [-0.3, 0, 0.3] : [0]

    const bullets: any[] = []
    for (const offset of directions) {
      let velX = 0
      let velY = 0
      let bx = bulletX
      let by = bulletY

      switch (tank.direction) {
        case Direction.UP:
          by -= bulletSize
          velY = -bulletSpeed
          bx += offset * 20
          break
        case Direction.DOWN:
          by += tank.size.height
          velY = bulletSpeed
          bx += offset * 20
          break
        case Direction.LEFT:
          bx -= bulletSize
          velX = -bulletSpeed
          by += offset * 20
          break
        case Direction.RIGHT:
          bx += tank.size.width
          velX = bulletSpeed
          by += offset * 20
          break
      }

      const bullet = {
        id: `bullet_${++this.idCounter}`,
        position: { x: bx, y: by },
        size: { width: bulletSize, height: bulletSize },
        direction: tank.direction,
        speed: bulletSpeed,
        velocityX: velX,
        velocityY: velY,
        damage: GAME_CONFIG.BULLET_DAMAGE,
        ownerId: tankId,
        isPlayerBullet: tank.isPlayer,
      }
      bullets.push(bullet)
    }

    // Return first bullet for compatibility, but GameEngine will add all
    return { success: true, bullet: bullets[0], extraBullets: bullets.slice(1) }
  }

  // Get tank by ID
  getTank(id: string): Tank | undefined {
    return this.tanks.get(id)
  }

  // Get all tanks
  getAllTanks(): Tank[] {
    return Array.from(this.tanks.values())
  }

  // Get all player tanks (for multiplayer)
  getPlayers(): Tank[] {
    return Array.from(this.tanks.values()).filter(t => t.isPlayer)
  }

  // Get player tank (returns first player for backward compatibility)
  getPlayer(): Tank | undefined {
    const allTanks = Array.from(this.tanks.values())
    for (const tank of allTanks) {
      if (tank.isPlayer) return tank
    }
    return undefined
  }

  // Get player 1 tank (green)
  getPlayer1(): Tank | undefined {
    const players = this.getPlayers()
    // Player 1 is the one at lower x position (left side)
    return players.reduce((prev, curr) => {
      if (!prev) return curr
      return curr.position.x < prev.position.x ? curr : prev
    }, undefined as Tank | undefined)
  }

  // Get player 2 tank (yellow)
  getPlayer2(): Tank | undefined {
    const players = this.getPlayers()
    if (players.length < 2) return undefined
    // Player 2 is the one at higher x position (right side)
    return players.reduce((prev, curr) => {
      if (!prev) return curr
      return curr.position.x > prev.position.x ? curr : prev
    }, undefined as Tank | undefined)
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

  // Get all enemies with positions (for explosion effects)
  getEnemyPositions(): { x: number; y: number; size: number }[] {
    return Array.from(this.tanks.values())
      .filter(t => !t.isPlayer)
      .map(t => ({
        x: t.position.x,
        y: t.position.y,
        size: t.size.width,
      }))
  }

  // Get player positions (for shield rendering)
  getPlayerPositions(): { x: number; y: number; size: number }[] {
    return Array.from(this.tanks.values())
      .filter(t => t.isPlayer)
      .map(t => ({
        x: t.position.x,
        y: t.position.y,
        size: t.size.width,
      }))
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

  // Render shield effect for a player tank
  renderShieldEffect(tank: Tank, time: number) {
    const { x, y } = tank.position
    const { width, height } = tank.size
    const centerX = x + width / 2
    const centerY = y + height / 2

    // Pulsing effect
    const pulse = Math.sin(time * 0.01) * 0.3 + 0.7
    const radius = (width + height) / 2 + 5 + Math.sin(time * 0.005) * 3

    // Draw outer glow
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, width * 0.3,
      centerX, centerY, radius
    )
    gradient.addColorStop(0, `rgba(136, 136, 255, 0)`)
    gradient.addColorStop(0.5, `rgba(136, 136, 255, ${0.3 * pulse})`)
    gradient.addColorStop(0.8, `rgba(200, 200, 255, ${0.5 * pulse})`)
    gradient.addColorStop(1, `rgba(136, 136, 255, 0)`)

    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    this.ctx.fill()

    // Draw rotating ring effect
    this.ctx.strokeStyle = `rgba(200, 200, 255, ${0.6 * pulse})`
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([10, 5])
    this.ctx.lineDashOffset = time * 0.05
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius - 2, 0, Math.PI * 2)
    this.ctx.stroke()
    this.ctx.setLineDash([])

    // Draw inner bright ring
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * pulse})`
    this.ctx.lineWidth = 1.5
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius - 6, 0, Math.PI * 2)
    this.ctx.stroke()
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
    this.customPlayer2Spawn = null
    this.customEnemySpawns = []
  }

  destroy() {
    this.tanks.clear()
  }
}
