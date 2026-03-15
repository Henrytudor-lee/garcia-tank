import { LevelConfig, TankType } from './types'
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

  // Check if should spawn more enemies
  shouldSpawnEnemy(): boolean {
    if (!this.levelConfig) return false
    if (this.enemiesSpawned >= this.totalEnemies) return false
    if (this.getEnemiesRemainingOnMap() >= GAME_CONFIG.MAX_ENEMIES_ON_MAP) return false

    const now = Date.now()
    if (now - this.lastSpawnTime >= this.levelConfig.spawnInterval) {
      this.lastSpawnTime = now
      return true
    }

    return false
  }

  // Get enemy types for current level
  getEnemyTypes(): TankType[] {
    return this.levelConfig?.enemyTypes || [TankType.ENEMY_NORMAL]
  }

  // Get random enemy type
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
    return (
      this.enemiesSpawned >= this.totalEnemies &&
      this.enemiesDestroyed >= this.totalEnemies
    )
  }

  // Check if can spawn more
  canSpawnMore(): boolean {
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

  // Advance to next level
  advanceLevel(): number {
    const nextLevel = this.currentLevel + 1
    this.loadLevel(nextLevel)
    if (this.onNextLevelCallback) {
      this.onNextLevelCallback(nextLevel)
    }
    return nextLevel
  }

  // Check if game is complete (no more levels)
  isGameComplete(): boolean {
    return this.currentLevel >= GAME_CONFIG.LEVELS.length && this.isLevelComplete()
  }

  // Get total levels
  getTotalLevels(): number {
    return GAME_CONFIG.LEVELS.length
  }

  // Reset level system
  reset() {
    this.loadLevel(1)
  }

  destroy() {
    // Nothing to clean up
  }
}
