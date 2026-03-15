import { Tank, Direction, TankType, Position } from './types'
import { GAME_CONFIG } from '@/src/config/gameConfig'
import { MapSystem } from './MapSystem'

interface EnemyState {
  tankId: string
  direction: Direction
  moveTimer: number
  changeDirTimer: number
  lastMoveSuccessful: boolean
  targetDirection: Direction | null
  stuckTimer: number
  behavior: 'random' | 'hunt' | 'patrol'
}

export class EnemyAI {
  private enemies: Map<string, EnemyState> = new Map()
  private mapSystem: MapSystem
  private playerPosition: Position | null = null

  constructor(mapSystem: MapSystem) {
    this.mapSystem = mapSystem
  }

  // Set player position for hunting behavior
  setPlayerPosition(position: Position | null) {
    this.playerPosition = position
  }

  // Register an enemy for AI control
  registerEnemy(tankId: string) {
    const initialDir = this.getRandomDirection()
    // Randomly assign behavior
    const behaviors: EnemyState['behavior'][] = ['random', 'hunt', 'patrol']
    const behavior = behaviors[Math.floor(Math.random() * behaviors.length)]

    this.enemies.set(tankId, {
      tankId,
      direction: initialDir,
      moveTimer: 0,
      changeDirTimer: 0,
      lastMoveSuccessful: true,
      targetDirection: null,
      stuckTimer: 0,
      behavior,
    })
  }

  // Unregister an enemy
  unregisterEnemy(tankId: string) {
    this.enemies.delete(tankId)
  }

  // Get random direction
  private getRandomDirection(): Direction {
    return Math.floor(Math.random() * 4) as Direction
  }

  // Get direction towards a target position
  private getDirectionTowards(from: Position, to: Position): Direction {
    const dx = to.x - from.x
    const dy = to.y - from.y

    // Prefer horizontal or vertical based on larger distance
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? Direction.RIGHT : Direction.LEFT
    } else {
      return dy > 0 ? Direction.DOWN : Direction.UP
    }
  }

  // Check if a direction is clear
  private isDirectionClear(tank: Tank, direction: Direction): boolean {
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

    newX = Math.max(0, Math.min(GAME_CONFIG.CANVAS_WIDTH - tank.size.width, newX))
    newY = Math.max(0, Math.min(GAME_CONFIG.CANVAS_HEIGHT - tank.size.height, newY))

    return !this.mapSystem.isColliding(newX, newY, tank.size.width)
  }

  // Update all enemies
  update(enemies: Tank[], deltaTime: number) {
    const currentTime = Date.now()

    // Find player position from the first enemy (to check if player exists)
    for (const enemy of enemies) {
      const state = this.enemies.get(enemy.id)
      if (!state) continue

      // Get movement interval based on enemy type
      let moveInterval = 300 // Default fast
      if (enemy.type === TankType.ENEMY_HEAVY) {
        moveInterval = 800 // Slow
      } else if (enemy.type === TankType.ENEMY_FAST) {
        moveInterval = 150 // Very fast
      } else if (enemy.type === TankType.ENEMY_ARMOR) {
        moveInterval = 400
      }

      state.moveTimer += deltaTime

      // Move at intervals based on enemy type
      if (state.moveTimer >= moveInterval) {
        state.moveTimer = 0

        // Check if stuck
        if (!state.lastMoveSuccessful) {
          state.stuckTimer += moveInterval
        } else {
          state.stuckTimer = 0
        }

        // Determine next action based on behavior
        let newDirection = state.direction

        if (state.behavior === 'hunt' && this.playerPosition) {
          // Smart hunting - try to move towards player
          const preferredDir = this.getDirectionTowards(enemy.position, this.playerPosition)
          if (this.isDirectionClear(enemy, preferredDir) || Math.random() < 0.3) {
            newDirection = preferredDir
          } else {
            // Find a clear direction
            newDirection = this.findClearDirection(enemy, preferredDir)
          }
        } else if (state.behavior === 'patrol') {
          // Patrol - move in patterns, change direction less frequently
          if (state.stuckTimer > 500 || Math.random() < 0.2) {
            newDirection = this.getRandomDirection()
          }
        } else {
          // Random behavior - more erratic
          if (!state.lastMoveSuccessful || Math.random() < 0.4) {
            newDirection = this.findClearDirection(enemy, state.direction)
          } else if (Math.random() < 0.15) {
            newDirection = this.getRandomDirection()
          }
        }

        state.direction = newDirection
        const moved = this.tryMove(enemy, state.direction)
        state.lastMoveSuccessful = moved

        // Firing based on enemy type
        let fireChance = 0.3
        if (enemy.type === TankType.ENEMY_FAST) fireChance = 0.5
        if (enemy.type === TankType.ENEMY_HEAVY) fireChance = 0.2
        if (enemy.type === TankType.ENEMY_ARMOR) fireChance = 0.25

        if (Math.random() < fireChance) {
          enemy.lastFireTime = currentTime - enemy.fireCooldown
        }
      }
    }
  }

  // Find a clear direction to move
  private findClearDirection(tank: Tank, preferred: Direction): Direction {
    const directions: Direction[] = [preferred, Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]

    // Shuffle directions for variety
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = directions[i]
      directions[i] = directions[j]
      directions[j] = temp
    }

    for (const dir of directions) {
      if (this.isDirectionClear(tank, dir)) {
        return dir
      }
    }

    return preferred // Return preferred even if blocked
  }

  // Try to move enemy in direction
  private tryMove(tank: Tank, direction: Direction): boolean {
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
    newX = Math.max(0, Math.min(GAME_CONFIG.CANVAS_WIDTH - tank.size.width, newX))
    newY = Math.max(0, Math.min(GAME_CONFIG.CANVAS_HEIGHT - tank.size.height, newY))

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

  // Get direction for enemy (called when AI needs to move)
  getNextDirection(tankId: string, currentDirection: Direction): Direction {
    const state = this.enemies.get(tankId)
    if (!state) return currentDirection
    return state.direction
  }

  // Get score for destroying enemy type
  static getScoreForType(type: TankType): number {
    if (type === TankType.PLAYER) return 0
    const config = GAME_CONFIG.TANK_CONFIGS[type]
    return (config as any)?.score || 100
  }

  // Get enemy type from tank
  static getEnemyType(tank: Tank): TankType {
    return tank.type
  }

  // Reset AI
  reset() {
    this.enemies.clear()
    this.playerPosition = null
  }

  destroy() {
    this.enemies.clear()
  }
}
