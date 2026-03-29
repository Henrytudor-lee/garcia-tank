// Direction enum
export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

// Tile types for the map
export enum TileType {
  EMPTY = 0,
  BRICK = 1,    // Can be destroyed
  STEEL = 2,    // Cannot be destroyed
  GRASS = 3,    // Decorative, no collision
  WATER = 4,    // Can swim (not implemented in basic version)
}

// Tank types
export enum TankType {
  PLAYER = 'player',
  ENEMY_NORMAL = 'enemy_normal',
  ENEMY_FAST = 'enemy_fast',
  ENEMY_HEAVY = 'enemy_heavy',
  ENEMY_ARMOR = 'enemy_armor',
}

// Game state
export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAMEOVER = 'gameover',
  VICTORY = 'victory',
}

// Game mode
export enum GameMode {
  SINGLE = 'single',
  MULTIPLAYER = 'multiplayer',
  ENDLESS = 'endless',
}

// Power-up types
export enum PowerUpType {
  SPEED_BOOST = 'speed_boost',
  TRIPLE_BULLET = 'triple_bullet',
  SHIELD = 'shield',
  BOMB = 'bomb',
  MAGNET = 'magnet',
  SLOW = 'slow',
  DOUBLE_SCORE = 'double_score',
}

// Position interface
export interface Position {
  x: number
  y: number
}

// Size interface
export interface Size {
  width: number
  height: number
}

// Base entity
export interface Entity {
  id: string
  position: Position
  size: Size
  direction: Direction
}

// Tank entity
export interface Tank extends Entity {
  type: TankType
  speed: number
  hp: number
  maxHp: number
  fireCooldown: number
  lastFireTime: number
  isPlayer: boolean
  isMoving: boolean
  spriteColor?: string
  speedBoostEndTime?: number  // End time for speed boost effect
  tripleBulletEndTime?: number // End time for triple bullet effect
}

// Power-up entity
export interface PowerUp extends Entity {
  type: PowerUpType
  color: string
  symbol: string
}

// Bullet entity
export interface Bullet extends Entity {
  speed: number
  damage: number
  ownerId: string
  isPlayerBullet: boolean
}

// Map tile
export interface Tile {
  type: TileType
  x: number
  y: number
}

// Map data
export interface MapData {
  tiles: Tile[][]
  width: number
  height: number
  tileSize: number
}

// Level configuration
export interface LevelConfig {
  level: number
  enemyCount: number
  enemyTypes: TankType[]
  spawnInterval: number
}

// Event callback type
export type EventCallback = (...args: any[]) => void

// ========== Custom Map Types ==========

// Custom map data
export interface CustomMap {
  id: string
  name: string
  width: number      // Map width (in tiles)
  height: number    // Map height (in tiles)
  tiles: number[][] // Map data (TileType array)
  playerSpawn: Position    // Player spawn point
  basePosition: Position  // Base position
  enemySpawns: Position[] // Enemy spawn points
}

// Custom level (collection of maps)
export interface CustomLevel {
  id: string
  name: string
  maps: CustomMap[]
  createdAt: number
}

// Leaderboard entry
export interface LeaderboardEntry {
  score: number
  date: number
  levelsCompleted: number
  ip?: string
  country?: string
  mapId?: string
  mapName?: string
  gameMode?: 'single' | 'multiplayer' | 'endless'
}
