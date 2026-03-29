import { TankType, LevelConfig } from '../game/types'

// Canvas and map settings
export const GAME_CONFIG = {
  CANVAS_WIDTH: 520,
  CANVAS_HEIGHT: 520,
  TILE_SIZE: 40,
  MAP_WIDTH: 13,
  MAP_HEIGHT: 13,

  // Player settings
  PLAYER_SPEED: 2,
  PLAYER_FIRE_COOLDOWN: 500, // ms
  PLAYER_LIVES: 3,
  PLAYER2_COLOR: '#FFFF00', // Yellow for player 2
  PLAYER2_SPAWN_X: 8,
  PLAYER2_SPAWN_Y: 11,

  // Bullet settings
  BULLET_SPEED: 5,
  BULLET_DAMAGE: 1,
  BULLET_SIZE: 6,

  // Tank sizes
  TANK_SIZE: 36,
  TANK_HITBOX: 32,

  // Enemy settings
  ENEMY_SPAWN_INTERVAL: 2000, // ms
  MAX_ENEMIES_ON_MAP: 4,

  // Tank type configurations
  TANK_CONFIGS: {
    [TankType.PLAYER]: {
      speed: 2,
      hp: 1, // Each hit kills one life
      fireCooldown: 500,
      color: '#00ff00', // Green
    },
    [TankType.ENEMY_NORMAL]: {
      speed: 1,
      hp: 1,
      fireCooldown: 1500,
      score: 100,
      color: '#ff0000', // Red
    },
    [TankType.ENEMY_FAST]: {
      speed: 2.5,
      hp: 1,
      fireCooldown: 1000,
      score: 200,
      color: '#ff8800', // Orange
    },
    [TankType.ENEMY_HEAVY]: {
      speed: 0.5,
      hp: 3,
      fireCooldown: 2000,
      score: 300,
      color: '#8800ff', // Purple
    },
    [TankType.ENEMY_ARMOR]: {
      speed: 1,
      hp: 2,
      fireCooldown: 1500,
      score: 400,
      color: '#0088ff', // Blue
    },
  },

  // Level configurations
  LEVELS: [
    {
      level: 1,
      enemyCount: 4,
      enemyTypes: [TankType.ENEMY_NORMAL],
      spawnInterval: 3000,
    },
    {
      level: 2,
      enemyCount: 6,
      enemyTypes: [TankType.ENEMY_NORMAL, TankType.ENEMY_FAST],
      spawnInterval: 2500,
    },
    {
      level: 3,
      enemyCount: 8,
      enemyTypes: [TankType.ENEMY_NORMAL, TankType.ENEMY_FAST, TankType.ENEMY_HEAVY],
      spawnInterval: 2000,
    },
    {
      level: 4,
      enemyCount: 10,
      enemyTypes: [TankType.ENEMY_FAST, TankType.ENEMY_HEAVY, TankType.ENEMY_ARMOR],
      spawnInterval: 1500,
    },
    {
      level: 5,
      enemyCount: 12,
      enemyTypes: [TankType.ENEMY_NORMAL, TankType.ENEMY_FAST, TankType.ENEMY_HEAVY, TankType.ENEMY_ARMOR],
      spawnInterval: 1000,
    },
  ] as LevelConfig[],

  // Endless mode configuration
  ENDLESS_MODE: {
    maxEnemiesOnMap: 4,
    spawnInterval: 2000,
    minSpawnInterval: 500,
    baseEnemyScore: 10000,
    difficultyScale: 1.1,
    waveSize: 8,
    livesPerScore: 1000,
    maxLives: 3,
    powerUpSpawnScore: 1000,
  },

  // Power-up configuration (all endless mode power-ups)
  POWER_UPS: {
    TILE_SIZE: 30,
    DURATION_MS: 30000, // 30 seconds
    DROP_CHANCE: 0.15, // 15% chance to drop from killed enemy
    TYPES: {
      SPEED_BOOST: {
        name: 'speed_boost',
        color: '#ffff00', // Yellow
        symbol: '⚡',
        description: '速度翻倍 30s',
      },
      TRIPLE_BULLET: {
        name: 'triple_bullet',
        color: '#00ffff', // Cyan
        symbol: '🔱',
        description: '三发子弹 30s',
      },
      SHIELD: {
        name: 'shield',
        color: '#8888ff', // Purple-blue
        symbol: '🛡️',
        description: '无敌3秒',
        duration: 3000, // 3 seconds
      },
      BOMB: {
        name: 'bomb',
        color: '#ff4444', // Red
        symbol: '💣',
        description: '清屏炸弹',
        instant: true,
      },
      MAGNET: {
        name: 'magnet',
        color: '#ff00ff', // Magenta
        symbol: '🧲',
        description: '吸引道具 15s',
        duration: 15000,
      },
      SLOW: {
        name: 'slow',
        color: '#44ff44', // Green
        symbol: '❄️',
        description: '减速敌人 10s',
        duration: 10000,
      },
      DOUBLE_SCORE: {
        name: 'double_score',
        color: '#ffa500', // Orange
        symbol: '💎',
        description: '双倍积分 10s',
        duration: 10000,
      },
    },
  },

  // Colors
  COLORS: {
    BRICK: '#8B4513',
    BRICK_DARK: '#654321',
    STEEL: '#708090',
    STEEL_BRIGHT: '#A9A9A9',
    GRASS: '#228B22',
    WATER: '#1E90FF',
    BASE: '#FFD700',
    BASE_DAMAGED: '#FF6600',
  },
}

// Get level config by level number
export function getLevelConfig(level: number): LevelConfig {
  const index = Math.min(level - 1, GAME_CONFIG.LEVELS.length - 1)
  return GAME_CONFIG.LEVELS[index]
}
