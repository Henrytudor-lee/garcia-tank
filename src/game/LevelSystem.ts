import { LevelConfig, TankType, GameMode } from './types'
import { GAME_CONFIG, getLevelConfig } from '@/src/config/gameConfig'

export class LevelSystem {
  private currentLevel: number = 1
  private levelConfig: LevelConfig | null = null
  private enemiesSpawned: number = 0
  private enemiesDestroyed: number = 0
  private totalEnemies: number = 0
  private lastSpawnTime: number = 0
  private onLevelCompleteCallback: (() => void) | null = null
  private onNextLevelCallback: ((level: number) => void) | null = null

  // Endless mode properties
  private isEndlessMode: boolean = false
  private wave: number = 1
  private enemiesKilledInWave: number = 0
  private currentScore: number = 0

  constructor() {
    this.loadLevel(1)
  }

  // Load a specific level
  loadLevel(level: number) {
    this.currentLevel = level
    this.levelConfig = getLevelConfig(level)
    this.enemiesSpawned = 0
    this.enemiesDestroyed = 0
    this.totalEnemies = this.levelConfig?.enemyCount || 4
    this.lastSpawnTime = 0
  }

  // Enable endless mode
  enableEndlessMode() {
    this.isEndlessMode = true
    this.wave = 1
    this.enemiesKilledInWave = 0
    this.enemiesSpawned = 0
    this.enemiesDestroyed = 0
    this.totalEnemies = GAME_CONFIG.ENDLESS_MODE.waveSize
    this.lastSpawnTime = 0
  }

  // Disable endless mode
  disableEndlessMode() {
    this.isEndlessMode = false
    this.wave = 1
    this.enemiesKilledInWave = 0
    this.currentScore = 0
  }

  // Update current score (for difficulty scaling in endless mode)
  updateScore(score: number) {
    this.currentScore = score
  }

  // Get current wave
  getWave(): number {
    return this.wave
  }

  // Check if should spawn more enemies
  shouldSpawnEnemy(): boolean {
    if (!this.isEndlessMode) {
      // Normal mode logic
      if (!this.levelConfig) return false
      if (this.enemiesSpawned >= this.totalEnemies) return false
      if (this.getEnemiesRemainingOnMap() >= GAME_CONFIG.MAX_ENEMIES_ON_MAP) return false

      const now = Date.now()
      if (now - this.lastSpawnTime >= this.levelConfig.spawnInterval) {
        this.lastSpawnTime = now
        return true
      }
      return false
    } else {
      // Endless mode logic - always spawn if under max
      if (this.getEnemiesRemainingOnMap() >= GAME_CONFIG.ENDLESS_MODE.maxEnemiesOnMap) return false

      const now = Date.now()
      const spawnInterval = this.getEndlessSpawnInterval()
      if (now - this.lastSpawnTime >= spawnInterval) {
        this.lastSpawnTime = now
        return true
      }
      return false
    }
  }

  // Get dynamic spawn interval based on score
  private getEndlessSpawnInterval(): number {
    const config = GAME_CONFIG.ENDLESS_MODE
    const scoreFactor = Math.min(this.currentScore / config.baseEnemyScore, 1)
    const interval = config.spawnInterval - (config.spawnInterval - config.minSpawnInterval) * scoreFactor
    return Math.max(interval, config.minSpawnInterval)
  }

  // Get enemy types based on score (difficulty scaling)
  getEnemyTypes(): TankType[] {
    if (!this.isEndlessMode) {
      return this.levelConfig?.enemyTypes || [TankType.ENEMY_NORMAL]
    }

    // Endless mode difficulty scaling
    if (this.currentScore < 1000) {
      return [TankType.ENEMY_NORMAL]
    } else if (this.currentScore < 5000) {
      return [TankType.ENEMY_NORMAL, TankType.ENEMY_FAST]
    } else if (this.currentScore < 10000) {
      return [TankType.ENEMY_NORMAL, TankType.ENEMY_FAST, TankType.ENEMY_HEAVY]
    } else {
      return [TankType.ENEMY_NORMAL, TankType.ENEMY_FAST, TankType.ENEMY_HEAVY, TankType.ENEMY_ARMOR]
    }
  }

  // Get random enemy type with weighted selection based on score
  getRandomEnemyType(): TankType {
    const types = this.getEnemyTypes()
    return types[Math.floor(Math.random() * types.length)]
  }

  // Record enemy spawn
  recordSpawn() {
    this.enemiesSpawned++
  }

  // Record enemy destroyed
  recordEnemyDestroyed() {
    this.enemiesDestroyed++
    if (this.isEndlessMode) {
      this.enemiesKilledInWave++
    }
  }

  // Get enemies remaining to spawn
  getEnemiesRemainingToSpawn(): number {
    return Math.max(0, this.totalEnemies - this.enemiesSpawned)
  }

  // Get enemies remaining on map
  getEnemiesRemainingOnMap(): number {
    return this.enemiesSpawned - this.enemiesDestroyed
  }

  // Check if level is complete
  isLevelComplete(): boolean {
    if (this.isEndlessMode) {
      // In endless mode, wave is complete when enough enemies killed
      return this.enemiesKilledInWave >= this.totalEnemies
    }
    return (
      this.enemiesSpawned >= this.totalEnemies &&
      this.enemiesDestroyed >= this.totalEnemies
    )
  }

  // Check if can spawn more
  canSpawnMore(): boolean {
    if (this.isEndlessMode) {
      return this.getEnemiesRemainingOnMap() < GAME_CONFIG.ENDLESS_MODE.maxEnemiesOnMap
    }
    return this.enemiesSpawned < this.totalEnemies
  }

  // Get current level number
  getCurrentLevel(): number {
    return this.currentLevel
  }

  // Get level config
  getLevelConfig(): LevelConfig | null {
    return this.levelConfig
  }

  // Check if should advance to next level
  shouldAdvanceLevel(): boolean {
    return this.isLevelComplete()
  }

  // Advance to next level (or next wave in endless mode)
  advanceLevel(): number {
    if (this.isEndlessMode) {
      this.wave++
      this.enemiesKilledInWave = 0
      this.enemiesSpawned = 0
      this.enemiesDestroyed = 0
      this.totalEnemies = GAME_CONFIG.ENDLESS_MODE.waveSize + Math.floor(this.wave / 3)
      if (this.onNextLevelCallback) {
        this.onNextLevelCallback(this.wave)
      }
      return this.wave
    } else {
      const nextLevel = this.currentLevel + 1
      this.loadLevel(nextLevel)
      if (this.onNextLevelCallback) {
        this.onNextLevelCallback(nextLevel)
      }
      return nextLevel
    }
  }

  // Check if game is complete (no more levels)
  isGameComplete(): boolean {
    if (this.isEndlessMode) {
      return false // Endless mode never completes
    }
    return this.currentLevel >= GAME_CONFIG.LEVELS.length && this.isLevelComplete()
  }

  // Check if endless mode is active
  isEndless(): boolean {
    return this.isEndlessMode
  }

  // Get total levels
  getTotalLevels(): number {
    return GAME_CONFIG.LEVELS.length
  }

  // Reset level system
  reset() {
    this.loadLevel(1)
    this.disableEndlessMode()
  }

  destroy() {
    // Nothing to clean up
  }
}
