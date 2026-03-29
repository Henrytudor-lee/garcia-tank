import { TileType, MapData, Tile, Position, CustomMap } from './types'
import { GAME_CONFIG } from '@/src/config/gameConfig'

export class MapSystem {
  private mapData: MapData
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private basePosition: Position = { x: 6, y: 12 } // Base is at bottom center
  private baseHp: number = 1
  private customMap: CustomMap | null = null
  private showBase: boolean = true

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    const { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } = GAME_CONFIG
    this.mapData = {
      tiles: [],
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      tileSize: TILE_SIZE,
    }
    // Base at tile (6, 0) - top center
    this.basePosition = { x: 6, y: 12 }
    this.generateDefaultMap()
  }

  // Load custom map
  loadCustomMap(customMap: CustomMap) {
    this.customMap = customMap

    // Update map dimensions
    this.mapData.width = customMap.width
    this.mapData.height = customMap.height

    // Calculate tile size to fit canvas (520x520)
    const canvasWidth = this.canvas.width
    const canvasHeight = this.canvas.height
    const tileSizeX = canvasWidth / customMap.width
    const tileSizeY = canvasHeight / customMap.height
    this.mapData.tileSize = Math.min(tileSizeX, tileSizeY)

    // Convert tile array to Tile objects
    const tiles: Tile[][] = []
    for (let y = 0; y < customMap.height; y++) {
      tiles[y] = []
      for (let x = 0; x < customMap.width; x++) {
        const tileType = customMap.tiles[y]?.[x] ?? TileType.EMPTY
        tiles[y][x] = { type: tileType, x, y }
      }
    }
    this.mapData.tiles = tiles

    // Set custom base position
    this.basePosition = customMap.basePosition
  }

  // Generate default Battle City style map
  private generateDefaultMap() {
    const { MAP_WIDTH, MAP_HEIGHT } = GAME_CONFIG
    const tiles: Tile[][] = []

    // Initialize empty map
    for (let y = 0; y < MAP_HEIGHT; y++) {
      tiles[y] = []
      for (let x = 0; x < MAP_WIDTH; x++) {
        tiles[y][x] = { type: TileType.EMPTY, x, y }
      }
    }

    // Add some defensive structures around the base
    const baseX = this.basePosition.x
    const baseY = this.basePosition.y

    // Add bricks around base (left, top, right only - no bottom)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 0; dy++) {  // Only top side (dy=-1) and left/right (dy=0)
        if (dx === 0 && dy === 0) continue
        const tx = baseX + dx
        const ty = baseY + dy
        if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
          if (Math.abs(dx) === 1 || Math.abs(dy) === 1) {
            tiles[ty][tx] = { type: TileType.BRICK, x: tx, y: ty }
          }
        }
      }
    }

    // Add some random structures for cover
    const structures = [
      // Left side structures
      { x: 1, y: 3 }, { x: 2, y: 3 },
      { x: 1, y: 6 }, { x: 2, y: 6 },
      { x: 1, y: 9 }, { x: 2, y: 9 },
      // Right side structures
      { x: 10, y: 3 }, { x: 11, y: 3 },
      { x: 10, y: 6 }, { x: 11, y: 6 },
      { x: 10, y: 9 }, { x: 11, y: 9 },
      // Center structures
      { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
      { x: 5, y: 5 }, { x: 7, y: 5 },
      { x: 3, y: 4 }, { x: 9, y: 4 },
    ]

    for (const pos of structures) {
      tiles[pos.y][pos.x] = { type: TileType.BRICK, x: pos.x, y: pos.y }
    }

    // Add random steel walls for variety (not blocking spawn areas)
    // Steel walls are placed in middle areas, away from player spawn (bottom) and base (top)
    const steelWallCandidates = [
      { x: 4, y: 3 }, { x: 8, y: 3 },
      { x: 3, y: 6 }, { x: 9, y: 6 },
      { x: 4, y: 9 }, { x: 8, y: 9 },
      { x: 6, y: 5 }, { x: 5, y: 7 }, { x: 7, y: 7 },
      { x: 2, y: 4 }, { x: 10, y: 4 },
      { x: 2, y: 7 }, { x: 10, y: 7 },
    ]
    // Randomly select 4-6 positions for steel walls
    const steelCount = Math.floor(Math.random() * 3) + 4 // 4-6 steel walls
    const shuffled = steelWallCandidates.sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(steelCount, shuffled.length); i++) {
      const pos = shuffled[i]
      if (tiles[pos.y][pos.x].type === TileType.EMPTY) {
        tiles[pos.y][pos.x] = { type: TileType.STEEL, x: pos.x, y: pos.y }
      }
    }

    // Add random grass patches (decorative, no collision)
    const grassCandidates = [
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 11, y: 1 }, { x: 12, y: 1 },
      { x: 0, y: 5 }, { x: 12, y: 5 },
      { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 11, y: 8 }, { x: 12, y: 8 },
    ]
    const grassCount = Math.floor(Math.random() * 3) + 3 // 3-5 grass patches
    const grassShuffled = grassCandidates.sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(grassCount, grassShuffled.length); i++) {
      const pos = grassShuffled[i]
      if (tiles[pos.y][pos.x].type === TileType.EMPTY) {
        tiles[pos.y][pos.x] = { type: TileType.GRASS, x: pos.x, y: pos.y }
      }
    }

    // Add random water areas (decorative, blocks movement)
    const waterCandidates = [
      { x: 3, y: 1 }, { x: 4, y: 1 },
      { x: 8, y: 1 }, { x: 9, y: 1 },
      { x: 6, y: 3 }, { x: 7, y: 3 },
    ]
    const waterCount = Math.floor(Math.random() * 2) + 1 // 1-2 water areas
    const waterShuffled = waterCandidates.sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(waterCount, waterShuffled.length); i++) {
      const pos = waterShuffled[i]
      if (tiles[pos.y][pos.x].type === TileType.EMPTY) {
        tiles[pos.y][pos.x] = { type: TileType.WATER, x: pos.x, y: pos.y }
      }
    }

    this.mapData.tiles = tiles
  }

  // Get tile at pixel position
  getTileAt(x: number, y: number): Tile | null {
    const tileX = Math.floor(x / this.mapData.tileSize)
    const tileY = Math.floor(y / this.mapData.tileSize)

    if (tileX < 0 || tileX >= this.mapData.width || tileY < 0 || tileY >= this.mapData.height) {
      return null
    }

    return this.mapData.tiles[tileY][tileX]
  }

  // Get tile at grid position
  getTile(tileX: number, tileY: number): Tile | null {
    if (tileX < 0 || tileX >= this.mapData.width || tileY < 0 || tileY >= this.mapData.height) {
      return null
    }
    return this.mapData.tiles[tileY][tileX]
  }

  // Check if position collides with solid tiles
  isColliding(x: number, y: number, size: number): boolean {
    // Check all four corners
    const corners = [
      { x: x, y: y },
      { x: x + size, y: y },
      { x: x, y: y + size },
      { x: x + size, y: y + size },
    ]

    for (const corner of corners) {
      const tile = this.getTileAt(corner.x, corner.y)
      if (tile && this.isSolidTile(tile.type)) {
        return true
      }
    }

    return false
  }

  // Check if tile type is solid
  isSolidTile(type: TileType): boolean {
    return type === TileType.BRICK || type === TileType.STEEL
  }

  // Destroy brick at position
  destroyBrick(x: number, y: number): boolean {
    const tileX = Math.floor(x / this.mapData.tileSize)
    const tileY = Math.floor(y / this.mapData.tileSize)

    const tile = this.getTile(tileX, tileY)
    if (tile && tile.type === TileType.BRICK) {
      this.mapData.tiles[tileY][tileX] = { type: TileType.EMPTY, x: tileX, y: tileY }
      return true
    }
    return false
  }

  // Check if base is hit
  checkBaseHit(x: number, y: number, size: number): boolean {
    const basePixelX = this.basePosition.x * this.mapData.tileSize
    const basePixelY = this.basePosition.y * this.mapData.tileSize

    // Simple AABB collision
    return (
      x < basePixelX + this.mapData.tileSize &&
      x + size > basePixelX &&
      y < basePixelY + this.mapData.tileSize &&
      y + size > basePixelY
    )
  }

  // Get base position
  getBasePosition(): Position {
    return {
      x: this.basePosition.x * this.mapData.tileSize,
      y: this.basePosition.y * this.mapData.tileSize,
    }
  }

  // Check if position is in base area
  isInBaseArea(x: number, y: number, size: number): boolean {
    const baseX = this.basePosition.x * this.mapData.tileSize
    const baseY = this.basePosition.y * this.mapData.tileSize
    const baseSize = this.mapData.tileSize

    return (
      x < baseX + baseSize &&
      x + size > baseX &&
      y < baseY + baseSize &&
      y + size > baseY
    )
  }

  // Render solid tiles (brick, steel) - rendered before tanks
  renderSolidTiles() {
    const { tileSize } = this.mapData

    for (let y = 0; y < this.mapData.height; y++) {
      for (let x = 0; x < this.mapData.width; x++) {
        const tile = this.mapData.tiles[y][x]
        const pixelX = x * tileSize
        const pixelY = y * tileSize

        switch (tile.type) {
          case TileType.BRICK:
            this.renderBrick(pixelX, pixelY, tileSize)
            break
          case TileType.STEEL:
            this.renderSteel(pixelX, pixelY, tileSize)
            break
        }
      }
    }

    // Render base
    this.renderBase()
  }

  // Render overlay tiles (grass, water) - rendered after tanks
  renderOverlayTiles() {
    const { tileSize } = this.mapData

    for (let y = 0; y < this.mapData.height; y++) {
      for (let x = 0; x < this.mapData.width; x++) {
        const tile = this.mapData.tiles[y][x]
        const pixelX = x * tileSize
        const pixelY = y * tileSize

        switch (tile.type) {
          case TileType.GRASS:
            this.renderGrass(pixelX, pixelY, tileSize)
            break
          case TileType.WATER:
            this.renderWater(pixelX, pixelY, tileSize)
            break
        }
      }
    }
  }

  // Render the map (legacy - renders everything)
  render() {
    this.renderSolidTiles()
    this.renderOverlayTiles()
  }

  private renderBrick(x: number, y: number, size: number) {
    const { COLORS } = GAME_CONFIG
    const brickWidth = size / 2
    const brickHeight = size / 4

    // Draw background
    this.ctx.fillStyle = COLORS.BRICK
    this.ctx.fillRect(x, y, size, size)

    // Draw brick pattern
    this.ctx.strokeStyle = COLORS.BRICK_DARK
    this.ctx.lineWidth = 1

    // Horizontal lines
    for (let i = 0; i < 4; i++) {
      const lineY = y + i * brickHeight
      this.ctx.beginPath()
      this.ctx.moveTo(x, lineY)
      this.ctx.lineTo(x + size, lineY)
      this.ctx.stroke()
    }

    // Vertical lines (staggered)
    this.ctx.beginPath()
    this.ctx.moveTo(x + brickWidth, y)
    this.ctx.lineTo(x + brickWidth, y + brickHeight * 2)
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.moveTo(x, y + brickHeight * 2)
    this.ctx.lineTo(x, y + brickHeight * 4)
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.moveTo(x + brickWidth, y + brickHeight * 2)
    this.ctx.lineTo(x + brickWidth, y + size)
    this.ctx.stroke()
  }

  private renderSteel(x: number, y: number, size: number) {
    const { COLORS } = GAME_CONFIG

    // Draw steel pattern (riveted metal look)
    this.ctx.fillStyle = COLORS.STEEL
    this.ctx.fillRect(x, y, size, size)

    // Draw rivets
    this.ctx.fillStyle = COLORS.STEEL_BRIGHT
    const rivetSize = 4
    const rivetPositions = [
      { x: x + 5, y: y + 5 },
      { x: x + size - 9, y: y + 5 },
      { x: x + 5, y: y + size - 9 },
      { x: x + size - 9, y: y + size - 9 },
    ]

    for (const pos of rivetPositions) {
      this.ctx.beginPath()
      this.ctx.arc(pos.x + rivetSize / 2, pos.y + rivetSize / 2, rivetSize / 2, 0, Math.PI * 2)
      this.ctx.fill()
    }

    // Draw border
    this.ctx.strokeStyle = COLORS.STEEL_BRIGHT
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(x + 2, y + 2, size - 4, size - 4)
  }

  private renderGrass(x: number, y: number, size: number) {
    const { COLORS } = GAME_CONFIG
    // Base grass color
    this.ctx.fillStyle = COLORS.GRASS
    this.ctx.fillRect(x, y, size, size)

    // Draw grass texture - alternating darker/lighter patches
    this.ctx.fillStyle = '#1a6b1a'
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if ((i + j) % 2 === 0) {
          this.ctx.fillRect(x + i * size / 4, y + j * size / 4, size / 4, size / 4)
        }
      }
    }

    // Draw grass blades
    this.ctx.fillStyle = '#3cb043'
    for (let i = 0; i < 8; i++) {
      const bladeX = x + (i + 0.5) * size / 8
      const bladeY = y + size - 2
      this.ctx.beginPath()
      this.ctx.moveTo(bladeX - 1, bladeY)
      this.ctx.lineTo(bladeX, bladeY - 8)
      this.ctx.lineTo(bladeX + 1, bladeY)
      this.ctx.fill()
    }

    // Add highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    this.ctx.fillRect(x + 2, y + 2, size - 4, size / 3)
  }

  private renderWater(x: number, y: number, size: number) {
    const { COLORS } = GAME_CONFIG
    // Base water color
    this.ctx.fillStyle = COLORS.WATER
    this.ctx.fillRect(x, y, size, size)

    // Draw water ripples
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.lineWidth = 1

    // Horizontal wave lines
    for (let i = 0; i < 3; i++) {
      const wy = y + 8 + i * 10
      this.ctx.beginPath()
      this.ctx.moveTo(x + 4, wy)
      this.ctx.quadraticCurveTo(x + size / 2, wy - 3, x + size - 4, wy)
      this.ctx.stroke()
    }

    // Add subtle reflection
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
    this.ctx.fillRect(x + 4, y + 4, size / 3, size / 4)

    // Darker patches for depth
    this.ctx.fillStyle = 'rgba(0, 50, 150, 0.2)'
    this.ctx.fillRect(x + size / 2, y + size / 2, size / 3, size / 3)
  }

  private renderBase() {
    if (!this.showBase) return
    const { COLORS } = GAME_CONFIG
    const { tileSize } = this.mapData
    const x = this.basePosition.x * tileSize
    const y = this.basePosition.y * tileSize

    // Draw base flag
    this.ctx.fillStyle = COLORS.BASE
    this.ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8)

    // Draw star in center
    this.ctx.fillStyle = '#FF0000'
    this.ctx.beginPath()
    const cx = x + tileSize / 2
    const cy = y + tileSize / 2
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
      const radius = 10
      const px = cx + Math.cos(angle) * radius
      const py = cy + Math.sin(angle) * radius
      if (i === 0) {
        this.ctx.moveTo(px, py)
      } else {
        this.ctx.lineTo(px, py)
      }
    }
    this.ctx.closePath()
    this.ctx.fill()
  }

  // Get map data
  getMapData(): MapData {
    return this.mapData
  }

  // Get tile size
  getTileSize(): number {
    return this.mapData.tileSize
  }

  // Set canvas size
  setCanvasSize(size: number) {
    // Recalculate tile size based on map dimensions
    const { width, height } = this.mapData
    const tileSizeX = size / width
    const tileSizeY = size / height
    this.mapData.tileSize = Math.min(tileSizeX, tileSizeY)
  }

  // Reset map
  reset() {
    if (this.customMap) {
      // Reload the custom map
      this.loadCustomMap(this.customMap)
    } else {
      this.generateDefaultMap()
      this.basePosition = { x: 6, y: 12 }
    }
    this.baseHp = 1
    this.showBase = true
  }

  // Set whether to show the base
  setShowBase(show: boolean) {
    this.showBase = show
  }

  destroy() {
    this.mapData.tiles = []
  }
}
