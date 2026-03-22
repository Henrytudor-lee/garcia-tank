import { GameLoop } from './GameLoop'
import { InputManager } from './InputManager'
import { MapSystem } from './MapSystem'
import { TankSystem } from './TankSystem'
import { BulletSystem, BulletData } from './BulletSystem'
import { Collision } from './Collision'
import { EnemyAI } from './EnemyAI'
import { ScoreSystem } from './ScoreSystem'
import { LevelSystem } from './LevelSystem'
import { GameState, GameMode, TankType, Direction, CustomMap } from './types'
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
  private gameMode: GameMode = GameMode.SINGLE
  private playerId: string | null = null
  private player2Id: string | null = null
  private player1Lives: number = 3 // Player 1 remaining lives
  private player2Lives: number = 3 // Player 2 remaining lives
  private player1Dead: boolean = false // Player 1 permanently dead (lost all lives)
  private player2Dead: boolean = false // Player 2 permanently dead (lost all lives)
  private events: Map<string, GameEventCallback[]> = new Map()
  private lastPlayerFireCheck: number = 0
  private pauseKeyWasPressed: boolean = false

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

  // Set game mode (single or multiplayer)
  setGameMode(mode: GameMode) {
    this.gameMode = mode
  }

  // Get game mode
  getGameMode(): GameMode {
    return this.gameMode
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

    // Initialize player lives and death status
    this.player1Lives = GAME_CONFIG.PLAYER_LIVES
    this.player2Lives = GAME_CONFIG.PLAYER_LIVES
    this.player1Dead = false
    this.player2Dead = false

    // Create player(s)
    const player = this.tankSystem.createPlayer()
    this.playerId = player.id

    // Create player 2 for multiplayer mode
    if (this.gameMode === GameMode.MULTIPLAYER) {
      const player2 = this.tankSystem.createPlayer2()
      this.player2Id = player2.id
    }

    // Update UI
    this.emit('scoreUpdate', this.scoreSystem.getScore())
    this.emit('livesUpdate', this.scoreSystem.getLives())
    this.emit('multiplayerLivesUpdate', { player1: this.player1Lives, player2: this.player2Lives })
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

    // Set custom spawn positions (including player2 if available)
    const player2Spawn = (customMap as any).player2Spawn
    this.tankSystem.setCustomSpawns(customMap.playerSpawn, customMap.enemySpawns, player2Spawn)

    // Create player
    const player = this.tankSystem.createPlayer()
    this.playerId = player.id

    // Create player 2 for multiplayer mode
    if (this.gameMode === GameMode.MULTIPLAYER) {
      const player2 = this.tankSystem.createPlayer2()
      this.player2Id = player2.id
    }

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
    // Handle pause/resume with P key (only toggle once per key press)
    const isPausePressed = this.inputManager.isPausePressed()
    if (isPausePressed && !this.pauseKeyWasPressed) {
      this.pauseKeyWasPressed = true
      if (this.gameState === GameState.PLAYING) {
        this.pause()
        return
      } else if (this.gameState === GameState.PAUSED) {
        this.resume()
        return
      }
    } else if (!isPausePressed) {
      this.pauseKeyWasPressed = false
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

  // Update player(s)
  private updatePlayer() {
    // Update player 1 (controlled by WASD + Space)
    if (this.playerId) {
      const player1 = this.tankSystem.getTank(this.playerId)
      if (player1) {
        // Get movement direction for player 1 (WASD)
        const direction = this.inputManager.getMovementDirectionForPlayer(1)
        if (direction !== null) {
          this.tankSystem.moveTank(player1.id, direction)
        } else {
          player1.isMoving = false
        }

        // Handle firing for player 1 (Space)
        if (this.inputManager.isFiringForPlayer(1)) {
          const result = this.tankSystem.fire(player1.id)
          if (result.success && result.bullet) {
            this.bulletSystem.addBullet(result.bullet)
          }
        }
      }
    }

    // Update player 2 (controlled by Arrow keys + 0)
    if (this.gameMode === GameMode.MULTIPLAYER && this.player2Id) {
      const player2 = this.tankSystem.getTank(this.player2Id)
      if (player2) {
        // Get movement direction for player 2 (Arrow keys)
        const direction = this.inputManager.getMovementDirectionForPlayer(2)
        if (direction !== null) {
          this.tankSystem.moveTank(player2.id, direction)
        } else {
          player2.isMoving = false
        }

        // Handle firing for player 2 (0 key)
        if (this.inputManager.isFiringForPlayer(2)) {
          const result = this.tankSystem.fire(player2.id)
          if (result.success && result.bullet) {
            this.bulletSystem.addBullet(result.bullet)
          }
        }
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
      // Determine which player died
      const isPlayer1 = tankId === this.playerId
      const isPlayer2 = tankId === this.player2Id

      // Decrease the corresponding player's lives
      if (isPlayer1) {
        this.player1Lives = Math.max(0, this.player1Lives - 1)
        if (this.player1Lives <= 0) {
          this.player1Dead = true // Permanently dead
        }
      } else if (isPlayer2) {
        this.player2Lives = Math.max(0, this.player2Lives - 1)
        if (this.player2Lives <= 0) {
          this.player2Dead = true // Permanently dead
        }
      }

      // Check if this player can respawn (must have lives remaining)
      const canRespawn = (isPlayer1 && this.player1Lives > 0) || (isPlayer2 && this.player2Lives > 0)

      if (canRespawn) {
        // Respawn the player that died
        if (isPlayer1) {
          const player = this.tankSystem.createPlayer()
          this.playerId = player.id
        } else if (isPlayer2) {
          const player2 = this.tankSystem.createPlayer2()
          this.player2Id = player2.id
        }
      }

      // Update UI with new lives
      if (this.gameMode === GameMode.MULTIPLAYER) {
        this.emit('multiplayerLivesUpdate', { player1: this.player1Lives, player2: this.player2Lives })
      } else {
        this.emit('livesUpdate', this.player1Lives)
      }

      // Check game over condition
      if (this.gameMode === GameMode.MULTIPLAYER) {
        // Game over only if both players are dead
        const players = this.tankSystem.getPlayers()
        if (players.length === 0) {
          this.handleGameOver()
        }
      } else {
        // Single player - game over when lives run out
        if (this.player1Lives <= 0) {
          this.handleGameOver()
        }
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

        // Respawn player(s) only if they are not permanently dead
        if (!this.player1Dead) {
          const player = this.tankSystem.createPlayer()
          this.playerId = player.id
        } else {
          this.playerId = null
        }

        // Create player 2 for multiplayer mode (only if not permanently dead)
        if (this.gameMode === GameMode.MULTIPLAYER && !this.player2Dead) {
          const player2 = this.tankSystem.createPlayer2()
          this.player2Id = player2.id
        } else {
          this.player2Id = null
        }

        // Update UI with lives
        if (this.gameMode === GameMode.MULTIPLAYER) {
          this.emit('multiplayerLivesUpdate', { player1: this.player1Lives, player2: this.player2Lives })
        } else {
          this.emit('livesUpdate', this.player1Lives)
        }
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
      this.gameLoop.stop()
      this.emit('stateChange', this.gameState)
    }
  }

  // Resume game
  resume() {
    if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING
      this.gameLoop.start()
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
