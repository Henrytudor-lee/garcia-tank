import { GameLoop } from './GameLoop'
import { InputManager } from './InputManager'
import { MapSystem } from './MapSystem'
import { TankSystem } from './TankSystem'
import { BulletSystem, BulletData } from './BulletSystem'
import { Collision } from './Collision'
import { EnemyAI } from './EnemyAI'
import { ScoreSystem } from './ScoreSystem'
import { LevelSystem } from './LevelSystem'
import { PowerUpSystem } from './PowerUpSystem'
import { EffectSystem } from './EffectSystem'
import { GameState, GameMode, TankType, Direction, CustomMap, PowerUpType, Position } from './types'
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
  private powerUpSystem: PowerUpSystem
  private effectSystem: EffectSystem

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
    this.powerUpSystem = new PowerUpSystem(canvas)
    this.powerUpSystem.setMapSystem(this.mapSystem)
    this.effectSystem = new EffectSystem(canvas)

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
    this.powerUpSystem.reset()
    this.effectSystem.reset()

    // Reset all power-up effects
    this.shieldActive = false
    this.shieldEndTime = 0
    this.slowEffectEndTime = 0
    this.doubleScoreEndTime = 0
    this.lastLifeGainScore = 0

    // Initialize player lives and death status
    this.player1Lives = this.gameMode === GameMode.ENDLESS ? 1 : GAME_CONFIG.PLAYER_LIVES
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

    // Enable endless mode if applicable
    if (this.gameMode === GameMode.ENDLESS) {
      this.levelSystem.enableEndlessMode()
      this.mapSystem.setShowBase(false)
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
    this.powerUpSystem.reset()
    this.effectSystem.reset()

    // Reset all power-up effects
    this.shieldActive = false
    this.shieldEndTime = 0
    this.slowEffectEndTime = 0
    this.doubleScoreEndTime = 0
    this.lastLifeGainScore = 0

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

    // Update power-ups
    this.powerUpSystem.update()

    // Update effects
    this.effectSystem.update()

    // Check collisions
    this.checkCollisions()

    // Spawn enemies
    this.spawnEnemies()

    // In endless mode: try spawn power-ups and check life gain
    if (this.gameMode === GameMode.ENDLESS) {
      this.handleEndlessModePowerUps()
    }

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
            // Add extra bullets for triple bullet
            if (result.extraBullets) {
              for (const extra of result.extraBullets) {
                this.bulletSystem.addBullet(extra)
              }
            }
          }
        }

        // Update player speed based on power-up effects
        this.updatePlayerSpeed(player1)
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
            if (result.extraBullets) {
              for (const extra of result.extraBullets) {
                this.bulletSystem.addBullet(extra)
              }
            }
          }
        }

        // Update player 2 speed based on power-up effects
        this.updatePlayerSpeed(player2)
      }
    }
  }

  // Update player speed based on power-up effects
  private updatePlayerSpeed(tank: any) {
    const now = Date.now()

    // Check speed boost effect
    if (tank.speedBoostEndTime) {
      if (tank.speedBoostEndTime > now) {
        // Speed boost is active
        if (tank.speed !== GAME_CONFIG.PLAYER_SPEED * 2) {
          tank.speed = GAME_CONFIG.PLAYER_SPEED * 2
        }
      } else {
        // Speed boost expired, reset to normal
        tank.speedBoostEndTime = undefined
        tank.speed = GAME_CONFIG.PLAYER_SPEED
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
            // Bullet hits base - game over (except in endless mode)
            this.bulletSystem.removeBullet(bulletId)
            bulletDestroyed = true
            if (this.gameMode !== GameMode.ENDLESS) {
              this.handleGameOver()
            }
            break

          case 'tank':
            // Bullet hits tank
            if (result.targetId) {
              const targetTank = this.tankSystem.getTank(result.targetId)
              if (targetTank) {
                // Check for shield protection
                if (targetTank.isPlayer && this.hasShield()) {
                  // Shield blocks damage, just remove bullet
                  this.bulletSystem.removeBullet(bulletId)
                  bulletDestroyed = true
                  break
                }

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

      // In endless mode, if no lives remaining, game over; otherwise respawn
      if (this.gameMode === GameMode.ENDLESS) {
        if (this.player1Lives <= 0) {
          this.handleGameOver()
          return
        }
        // Player has lives, will respawn below
      }

      // Decrease the corresponding player's lives
      if (isPlayer1) {
        this.player1Lives = Math.max(0, this.player1Lives - 1)
        this.scoreSystem.setLives(this.player1Lives) // Sync with scoreSystem for UI
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
      } else {
        // Can't respawn - game over (including endless mode when lives = 0)
        if (this.gameMode === GameMode.ENDLESS || this.gameMode === GameMode.SINGLE) {
          this.handleGameOver()
        }
      }

      // Update UI with new lives
      if (this.gameMode === GameMode.MULTIPLAYER) {
        this.emit('multiplayerLivesUpdate', { player1: this.player1Lives, player2: this.player2Lives })
      } else {
        this.emit('livesUpdate', this.player1Lives)
      }

      // Check game over condition (skip for endless mode - handled after respawn logic)
      if (this.gameMode === GameMode.MULTIPLAYER) {
        // Game over only if both players are dead
        const players = this.tankSystem.getPlayers()
        if (players.length === 0) {
          this.handleGameOver()
        }
      } else if (this.gameMode !== GameMode.ENDLESS) {
        // Single player - game over when lives run out
        if (this.player1Lives <= 0) {
          this.handleGameOver()
        }
      }
    } else {
      // Enemy destroyed - add score
      const score = EnemyAI.getScoreForType(tank.type)
      // Apply double score multiplier if active
      const scoreMultiplier = Date.now() < this.doubleScoreEndTime ? 2 : 1
      this.scoreSystem.addScore(score * scoreMultiplier)
      this.levelSystem.recordEnemyDestroyed()

      // Update endless mode score for difficulty scaling
      if (this.gameMode === GameMode.ENDLESS) {
        this.levelSystem.updateScore(this.scoreSystem.getScore())

        // Try to drop power-up at enemy death position
        this.powerUpSystem.tryDropPowerUp(
          tank.position.x,
          tank.position.y,
          tank.type
        )

        // Trigger explosion effect at enemy position
        this.effectSystem.triggerExplosion(
          tank.position.x + tank.size.width / 2,
          tank.position.y + tank.size.height / 2,
          tank.size.width
        )
      }

      // Unregister from AI
      this.enemyAI.unregisterEnemy(tankId)
    }
  }

  // Spawn enemies
  private spawnEnemies() {
    if (!this.levelSystem.shouldSpawnEnemy()) return

    const enemyType = this.levelSystem.getRandomEnemyType()

    // Get player position for random spawn (not too close to player)
    let playerPos: Position | undefined = undefined
    if (this.playerId) {
      const player = this.tankSystem.getTank(this.playerId)
      if (player) {
        playerPos = player.position
      }
    }

    const enemy = this.tankSystem.createEnemy(enemyType, playerPos)
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
      } else if (this.gameMode === GameMode.ENDLESS) {
        // Endless mode - advance to next wave
        const nextWave = this.levelSystem.advanceLevel()
        this.emit('levelUpdate', nextWave)
        // Reset bullets but keep player alive in endless mode
        this.bulletSystem.reset()
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
    this.gameLoop.stop()
    this.emit('stateChange', this.gameState)
  }

  // Handle endless mode power-ups and life gain
  private lastLifeGainScore: number = 0
  private slowEffectEndTime: number = 0
  private doubleScoreEndTime: number = 0
  private shieldActive: boolean = false
  private shieldEndTime: number = 0

  private handleEndlessModePowerUps() {
    const currentScore = this.scoreSystem.getScore()
    const config = GAME_CONFIG.ENDLESS_MODE

    // Update magnet effect
    if (this.playerId) {
      const player = this.tankSystem.getTank(this.playerId)
      if (player) {
        this.powerUpSystem.updateMagnet(player.position.x, player.position.y)
      }
    }

    // Update slow effect
    if (Date.now() > this.slowEffectEndTime && this.slowEffectEndTime > 0) {
      this.slowEffectEndTime = 0
      // Reset enemy speeds
      const enemies = this.tankSystem.getEnemies()
      for (const enemy of enemies) {
        const originalConfig = GAME_CONFIG.TANK_CONFIGS[enemy.type]
        if (originalConfig) {
          enemy.speed = originalConfig.speed
        }
      }
    }

    // Check for power-up collision with player
    if (this.playerId) {
      const player = this.tankSystem.getTank(this.playerId)
      if (player) {
        const powerUp = this.powerUpSystem.checkCollision(
          player.position.x,
          player.position.y,
          GAME_CONFIG.TANK_SIZE
        )

        if (powerUp) {
          this.applyPowerUp(player, powerUp.type)
        }
      }
    }

    // Check for power-up collision with player 2 (for multiplayer)
    if (this.player2Id) {
      const player2 = this.tankSystem.getTank(this.player2Id)
      if (player2) {
        const powerUp = this.powerUpSystem.checkCollision(
          player2.position.x,
          player2.position.y,
          GAME_CONFIG.TANK_SIZE
        )

        if (powerUp) {
          this.applyPowerUp(player2, powerUp.type)
        }
      }
    }

    // Life gain: every 1000 points = +1 life, max 3 lives
    if (currentScore - this.lastLifeGainScore >= config.livesPerScore) {
      this.lastLifeGainScore = currentScore
      if (this.player1Lives < config.maxLives) {
        this.player1Lives++
        this.emit('livesUpdate', this.player1Lives)
      }
    }
  }

  // Apply power-up effect to a tank
  private applyPowerUp(tank: any, powerUpType: PowerUpType) {
    const config = GAME_CONFIG.POWER_UPS
    const typeKey = powerUpType as unknown as keyof typeof config.TYPES
    const typeConfig = config.TYPES[typeKey] as any
    const duration = typeConfig?.duration || config.DURATION_MS

    if (powerUpType === PowerUpType.SPEED_BOOST) {
      tank.speedBoostEndTime = Date.now() + duration
      tank.speed = GAME_CONFIG.PLAYER_SPEED * 2
    } else if (powerUpType === PowerUpType.TRIPLE_BULLET) {
      tank.tripleBulletEndTime = Date.now() + duration
    } else if (powerUpType === PowerUpType.SHIELD) {
      this.shieldActive = true
      this.shieldEndTime = Date.now() + (typeConfig?.duration || 3000)
    } else if (powerUpType === PowerUpType.BOMB) {
      this.triggerBomb()
    } else if (powerUpType === PowerUpType.MAGNET) {
      this.powerUpSystem.setMagnetActive(duration)
    } else if (powerUpType === PowerUpType.SLOW) {
      this.slowEffectEndTime = Date.now() + duration
      this.applySlowEffect()
    } else if (powerUpType === PowerUpType.DOUBLE_SCORE) {
      this.doubleScoreEndTime = Date.now() + duration
    }
  }

  // Apply slow effect to all enemies
  private applySlowEffect() {
    const enemies = this.tankSystem.getEnemies()
    for (const enemy of enemies) {
      const originalConfig = GAME_CONFIG.TANK_CONFIGS[enemy.type]
      if (originalConfig) {
        enemy.speed = originalConfig.speed * 0.5
      }
    }
  }

  // Trigger bomb - destroy all enemies on screen
  private triggerBomb() {
    // Get enemy positions before removing them (for explosion effects)
    const enemyPositions = this.tankSystem.getEnemyPositions()

    // Trigger explosion effects at each enemy position
    this.effectSystem.triggerBombExplosions(enemyPositions)

    const enemies = this.tankSystem.getEnemies()
    for (const enemy of enemies) {
      const score = EnemyAI.getScoreForType(enemy.type)
      // Check for double score
      const scoreMultiplier = Date.now() < this.doubleScoreEndTime ? 2 : 1
      this.scoreSystem.addScore(score * scoreMultiplier)
      this.levelSystem.recordEnemyDestroyed()
      this.tankSystem.removeTank(enemy.id)
      this.enemyAI.unregisterEnemy(enemy.id)
    }
  }

  // Check if player has shield active
  private hasShield(): boolean {
    if (!this.shieldActive) return false
    if (Date.now() > this.shieldEndTime) {
      this.shieldActive = false
      return false
    }
    return true
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

    // Render shield effects for players with active shield
    if (this.shieldActive && Date.now() < this.shieldEndTime) {
      const players = this.tankSystem.getPlayerPositions()
      const time = Date.now()
      for (const playerPos of players) {
        const fakeTank = {
          position: { x: playerPos.x, y: playerPos.y },
          size: { width: playerPos.size, height: playerPos.size },
        }
        this.tankSystem.renderShieldEffect(fakeTank as any, time)
      }
    }

    // Render bullets
    this.bulletSystem.render()

    // Render power-ups
    this.powerUpSystem.render()

    // Render explosion effects
    this.effectSystem.render()

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
    this.powerUpSystem.destroy()
    this.effectSystem.destroy()
    this.events.clear()
  }
}
