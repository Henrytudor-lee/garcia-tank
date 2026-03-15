import { GameLoop } from './GameLoop'
import { InputManager } from './InputManager'
import { MapSystem } from './MapSystem'
import { TankSystem } from './TankSystem'
import { BulletSystem, BulletData } from './BulletSystem'
import { Collision } from './Collision'
import { EnemyAI } from './EnemyAI'
import { ScoreSystem } from './ScoreSystem'
import { LevelSystem } from './LevelSystem'
import { GameState, TankType, Direction, CustomMap } from './types'
import { GAME_CONFIG } from '@/src/config/gameConfig'

type GameEventCallback = (...args: any[]) => void

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private gameLoop: GameLoop
  private inputManager: InputManager
  private mapSystem: MapSystem
  private tankSystem: TankSystem
  private bulletSystem: BulletSystem
  private collision: Collision
  private enemyAI: EnemyAI
  private scoreSystem: ScoreSystem
  private levelSystem: LevelSystem

  private gameState: GameState = GameState.MENU
  private playerId: string | null = null
  private events: Map<string, GameEventCallback[]> = new Map()
  private lastPlayerFireCheck: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!

    // Initialize systems
    this.gameLoop = new GameLoop(60)
    this.inputManager = new InputManager()
    this.mapSystem = new MapSystem(canvas)
    this.tankSystem = new TankSystem(canvas, this.mapSystem)
    this.bulletSystem = new BulletSystem(canvas)
    this.collision = new Collision(this.mapSystem)
    this.enemyAI = new EnemyAI(this.mapSystem)
    this.scoreSystem = new ScoreSystem()
    this.levelSystem = new LevelSystem()

    // Register update and render callbacks
    this.gameLoop.onUpdate(this.update.bind(this))
    this.gameLoop.onRender(this.render.bind(this))
  }

  // Set canvas size
  setCanvasSize(size: number) {
    this.canvas.width = size
    this.canvas.height = size
    // Update systems with new size
    this.mapSystem.setCanvasSize(size)
  }

  // Initialize game
  init() {
    this.gameState = GameState.MENU
    this.emit('stateChange', this.gameState)
    this.render()
  }

  // Start game
  start(canvasSize?: number) {
    // Allow start from MENU, PAUSED, GAMEOVER, or VICTORY states
    if (this.gameState !== GameState.MENU &&
        this.gameState !== GameState.PAUSED &&
        this.gameState !== GameState.GAMEOVER &&
        this.gameState !== GameState.VICTORY) {
      return
    }

    // Set canvas size if provided
    if (canvasSize) {
      this.canvas.width = canvasSize
      this.canvas.height = canvasSize
      this.mapSystem.setCanvasSize(canvasSize)
    }

    // Reset game systems
    this.mapSystem.reset()
    this.tankSystem.reset()
    this.bulletSystem.reset()
    this.enemyAI.reset()
    this.scoreSystem.reset()
    this.levelSystem.reset()

    // Create player
    const player = this.tankSystem.createPlayer()
    this.playerId = player.id

    // Update UI
    this.emit('scoreUpdate', this.scoreSystem.getScore())
    this.emit('livesUpdate', this.scoreSystem.getLives())
    this.emit('levelUpdate', this.levelSystem.getCurrentLevel())

    this.gameState = GameState.PLAYING
    this.emit('stateChange', this.gameState)

    // Start game loop
    this.gameLoop.start()
  }

  // Restart game
  restart() {
    this.gameLoop.stop()
    this.start()
  }

  // Start game with custom map
  startWithCustomMap(customMap: CustomMap, canvasSize?: number) {
    // Allow start from MENU, PAUSED, GAMEOVER, or VICTORY states
    if (this.gameState !== GameState.MENU &&
        this.gameState !== GameState.PAUSED &&
        this.gameState !== GameState.GAMEOVER &&
        this.gameState !== GameState.VICTORY) {
      return
    }

    // Set canvas size if provided
    if (canvasSize) {
      this.canvas.width = canvasSize
      this.canvas.height = canvasSize
      this.mapSystem.setCanvasSize(canvasSize)
    }

    // Reset game systems
    this.mapSystem.reset()
    this.tankSystem.reset()
    this.bulletSystem.reset()
    this.enemyAI.reset()
    this.scoreSystem.reset()
    this.levelSystem.reset()

    // Load custom map
    this.mapSystem.loadCustomMap(customMap)

    // Set custom spawn positions
    this.tankSystem.setCustomSpawns(customMap.playerSpawn, customMap.enemySpawns)

    // Create player
    const player = this.tankSystem.createPlayer()
    this.playerId = player.id

    // Update UI
    this.emit('scoreUpdate', this.scoreSystem.getScore())
    this.emit('livesUpdate', this.scoreSystem.getLives())
    this.emit('levelUpdate', this.levelSystem.getCurrentLevel())

    this.gameState = GameState.PLAYING
    this.emit('stateChange', this.gameState)

    // Start game loop
    this.gameLoop.start()
  }

  // Main update loop
  private update(deltaTime: number) {
    if (this.gameState === GameState.PLAYING) {
      // Check for pause key
      if (this.inputManager.isPausePressed()) {
        this.pause()
        return
      }
    }

    if (this.gameState !== GameState.PLAYING) return

    // Update player
    this.updatePlayer()

    // Update enemies
    this.updateEnemies(deltaTime)

    // Update bullets
    this.bulletSystem.update()

    // Check collisions
    this.checkCollisions()

    // Spawn enemies
    this.spawnEnemies()

    // Check level completion
    this.checkLevelCompletion()

    // Update UI
    this.emit('scoreUpdate', this.scoreSystem.getScore())
    this.emit('livesUpdate', this.scoreSystem.getLives())
    this.emit('levelUpdate', this.levelSystem.getCurrentLevel())
  }

  // Update player
  private updatePlayer() {
    if (!this.playerId) {
      console.log('No player ID')
      return
    }

    const player = this.tankSystem.getPlayer()
    if (!player) {
      console.log('No player tank')
      return
    }

    // Get movement direction
    const direction = this.inputManager.getMovementDirection()
    if (direction !== null) {
      console.log('Moving player in direction:', direction, 'position:', player.position)
      this.tankSystem.moveTank(player.id, direction)
    } else {
      player.isMoving = false
    }

    // Handle firing
    if (this.inputManager.isFiring()) {
      const result = this.tankSystem.fire(player.id)
      if (result.success && result.bullet) {
        this.bulletSystem.addBullet(result.bullet)
      }
    }
  }

  // Update enemies
  private updateEnemies(deltaTime: number) {
    const enemies = this.tankSystem.getEnemies()

    // Update player position for AI tracking
    const player = this.tankSystem.getPlayer()
    if (player) {
      this.enemyAI.setPlayerPosition(player.position)
    } else {
      this.enemyAI.setPlayerPosition(null)
    }

    this.enemyAI.update(enemies, deltaTime)

    // Try to fire for each enemy
    const now = Date.now()
    for (const enemy of enemies) {
      if (now - enemy.lastFireTime >= enemy.fireCooldown) {
        if (Math.random() < 0.3) {
          const result = this.tankSystem.fire(enemy.id)
          if (result.success && result.bullet) {
            this.bulletSystem.addBullet(result.bullet)
          }
        }
      }
    }
  }

  // Check collisions
  private checkCollisions() {
    const bullets = this.bulletSystem.getAllBullets()
    const tanks = this.tankSystem.getAllTanks()

    // Check bullet collisions
    const collisionResults = this.collision.checkBulletCollisions(bullets, tanks)

    const collisionEntries = Array.from(collisionResults.entries())
    for (const [bulletId, results] of collisionEntries) {
      const bullet = this.bulletSystem.getBullet(bulletId)
      if (!bullet) continue

      let bulletDestroyed = false

      for (const result of results) {
        if (bulletDestroyed) break

        switch (result.type) {
          case 'boundary':
          case 'steel':
            // Bullet hits wall/boundary - destroy bullet
            this.bulletSystem.removeBullet(bulletId)
            bulletDestroyed = true
            break

          case 'brick':
            // Bullet hits brick - destroy bullet and brick
            this.bulletSystem.removeBullet(bulletId)
            bulletDestroyed = true
            if (result.targetX !== undefined && result.targetY !== undefined) {
              this.mapSystem.destroyBrick(result.targetX + 20, result.targetY + 20)
            }
            break

          case 'base':
            // Bullet hits base - game over
            this.bulletSystem.removeBullet(bulletId)
            bulletDestroyed = true
            this.handleGameOver()
            break

          case 'tank':
            // Bullet hits tank
            if (result.targetId) {
              const targetTank = this.tankSystem.getTank(result.targetId)
              if (targetTank) {
                const destroyed = this.tankSystem.damageTank(result.targetId, bullet.damage)
                this.bulletSystem.removeBullet(bulletId)
                bulletDestroyed = true

                if (destroyed) {
                  this.handleTankDestroyed(result.targetId, targetTank)
                }
              }
            }
            break
        }
      }
    }
  }

  // Handle tank destruction
  private handleTankDestroyed(tankId: string, tank: any) {
    // Remove tank
    this.tankSystem.removeTank(tankId)

    if (tank.isPlayer) {
      // Player died
      const lives = this.scoreSystem.loseLife()
      if (lives > 0) {
        // Respawn player
        const player = this.tankSystem.createPlayer()
        this.playerId = player.id
      } else {
        // Game over
        this.handleGameOver()
      }
    } else {
      // Enemy destroyed - add score
      const score = EnemyAI.getScoreForType(tank.type)
      this.scoreSystem.addScore(score)
      this.levelSystem.recordEnemyDestroyed()

      // Unregister from AI
      this.enemyAI.unregisterEnemy(tankId)
    }
  }

  // Spawn enemies
  private spawnEnemies() {
    if (!this.levelSystem.shouldSpawnEnemy()) return

    const enemyType = this.levelSystem.getRandomEnemyType()
    const enemy = this.tankSystem.createEnemy(enemyType)
    this.enemyAI.registerEnemy(enemy.id)
    this.levelSystem.recordSpawn()
  }

  // Check level completion
  private checkLevelCompletion() {
    if (this.levelSystem.isLevelComplete()) {
      if (this.levelSystem.isGameComplete()) {
        // Victory!
        this.gameState = GameState.VICTORY
        this.emit('stateChange', this.gameState)
        this.gameLoop.stop()
      } else {
        // Next level
        this.levelSystem.advanceLevel()
        this.mapSystem.reset()
        this.tankSystem.reset()
        this.bulletSystem.reset()

        // Respawn player with fresh tank
        const player = this.tankSystem.createPlayer()
        this.playerId = player.id
      }
    }
  }

  // Handle game over
  private handleGameOver() {
    this.gameState = GameState.GAMEOVER
    this.emit('stateChange', this.gameState)
    this.gameLoop.stop()
  }

  // Render game
  private render() {
    // Clear canvas
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    if (this.gameState === GameState.MENU) {
      // Just show black in menu
      return
    }

    // Render solid tiles (brick, steel) and base
    this.mapSystem.renderSolidTiles()

    // Render tanks
    this.tankSystem.render()

    // Render bullets
    this.bulletSystem.render()

    // Render overlay tiles (grass, water) on top
    this.mapSystem.renderOverlayTiles()
  }

  // Event system
  on(event: string, callback: GameEventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
  }

  off(event: string, callback: GameEventCallback) {
    const callbacks = this.events.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event)
    if (callbacks) {
      for (const callback of callbacks) {
        callback(...args)
      }
    }
  }

  // Get current game state
  getGameState(): GameState {
    return this.gameState
  }

  // Pause game
  pause() {
    if (this.gameState === GameState.PLAYING) {
      this.gameState = GameState.PAUSED
      this.emit('stateChange', this.gameState)
    }
  }

  // Resume game
  resume() {
    if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING
      this.emit('stateChange', this.gameState)
    }
  }

  // Destroy game engine
  destroy() {
    this.gameLoop.destroy()
    this.inputManager.destroy()
    this.mapSystem.destroy()
    this.tankSystem.destroy()
    this.bulletSystem.destroy()
    this.collision.destroy()
    this.enemyAI.destroy()
    this.scoreSystem.destroy()
    this.levelSystem.destroy()
    this.events.clear()
  }
}
