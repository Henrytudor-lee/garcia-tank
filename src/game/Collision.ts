import { BulletData } from './BulletSystem'
import { Tank } from './types'
import { MapSystem } from './MapSystem'
import { GAME_CONFIG } from '@/src/config/gameConfig'

export interface CollisionResult {
  hit: boolean
  type: 'tank' | 'brick' | 'steel' | 'base' | 'boundary'
  targetId?: string
  targetX?: number
  targetY?: number
}

export class Collision {
  private mapSystem: MapSystem

  constructor(mapSystem: MapSystem) {
    this.mapSystem = mapSystem
  }

  // Check bullet collision with everything
  checkBulletCollisions(
    bullets: BulletData[],
    tanks: Tank[]
  ): Map<string, CollisionResult[]> {
    const results = new Map<string, CollisionResult[]>()

    for (const bullet of bullets) {
      const bulletResults: CollisionResult[] = []

      // Check boundary collision
      if (this.checkBoundaryCollision(bullet)) {
        bulletResults.push({ hit: true, type: 'boundary' })
      }

      // Check map tile collision
      const tileHit = this.checkMapTileCollision(bullet)
      if (tileHit) {
        bulletResults.push(tileHit)
      }

      // Check tank collision
      for (const tank of tanks) {
        if (tank.id !== bullet.ownerId && this.checkTankBulletCollision(bullet, tank)) {
          bulletResults.push({
            hit: true,
            type: 'tank',
            targetId: tank.id,
          })
        }
      }

      // Check base collision
      if (this.checkBaseCollision(bullet)) {
        bulletResults.push({ hit: true, type: 'base' })
      }

      if (bulletResults.length > 0) {
        results.set(bullet.id, bulletResults)
      }
    }

    return results
  }

  // Check if bullet hits boundaries
  checkBoundaryCollision(bullet: BulletData): boolean {
    const { x, y } = bullet.position
    const { width, height } = bullet.size

    // Get dynamic map dimensions from MapSystem
    const mapData = this.mapSystem.getMapData()
    const mapWidth = mapData.width * mapData.tileSize
    const mapHeight = mapData.height * mapData.tileSize

    return x < 0 || x + width > mapWidth ||
           y < 0 || y + height > mapHeight
  }

  // Check bullet vs map tiles
  checkMapTileCollision(bullet: BulletData): CollisionResult | null {
    const { position: { x, y }, size } = bullet

    // Check all four corners of bullet
    const corners = [
      { x: x, y: y },
      { x: x + size.width, y: y },
      { x: x, y: y + size.height },
      { x: x + size.width, y: y + size.height },
    ]

    for (const corner of corners) {
      const tile = this.mapSystem.getTileAt(corner.x, corner.y)
      if (tile) {
        if (tile.type === 1) { // BRICK
          return {
            hit: true,
            type: 'brick',
            targetX: tile.x * GAME_CONFIG.TILE_SIZE,
            targetY: tile.y * GAME_CONFIG.TILE_SIZE,
          }
        }
        if (tile.type === 2) { // STEEL
          return {
            hit: true,
            type: 'steel',
            targetX: tile.x * GAME_CONFIG.TILE_SIZE,
            targetY: tile.y * GAME_CONFIG.TILE_SIZE,
          }
        }
      }
    }

    return null
  }

  // Check bullet vs tank
  checkTankBulletCollision(bullet: BulletData, tank: Tank): boolean {
    const bx = bullet.position.x
    const by = bullet.position.y
    const bs = bullet.size
    const tx = tank.position.x
    const ty = tank.position.y
    const ts = tank.size

    return (
      bx < tx + ts.width &&
      bx + bs.width > tx &&
      by < ty + ts.height &&
      by + bs.height > ty
    )
  }

  // Check bullet vs base
  checkBaseCollision(bullet: BulletData): boolean {
    return this.mapSystem.checkBaseHit(
      bullet.position.x,
      bullet.position.y,
      bullet.size.width
    )
  }

  // Check tank vs tank collision
  checkTankTankCollision(tank1: Tank, tank2: Tank): boolean {
    const x1 = tank1.position.x
    const y1 = tank1.position.y
    const s1 = tank1.size
    const x2 = tank2.position.x
    const y2 = tank2.position.y
    const s2 = tank2.size

    return (
      x1 < x2 + s2.width &&
      x1 + s1.width > x2 &&
      y1 < y2 + s2.height &&
      y1 + s1.height > y2
    )
  }

  // Check if position collides with any enemy tank
  checkPositionAgainstEnemies(x: number, y: number, size: number, excludeId: string, enemies: Tank[]): boolean {
    for (const enemy of enemies) {
      if (enemy.id === excludeId) continue

      const ex = enemy.position.x
      const ey = enemy.position.y
      const es = enemy.size.width

      if (
        x < ex + es &&
        x + size > ex &&
        y < ey + es &&
        y + size > ey
      ) {
        return true
      }
    }
    return false
  }

  destroy() {
    // Nothing to clean up
  }
}
