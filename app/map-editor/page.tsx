'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CustomMap, TileType, Position } from '@/src/game/types'
import { CustomMapStorage } from '@/src/game/CustomMapStorage'

type EditMode = 'wall' | 'player' | 'base' | 'enemy' | 'erase'

const TILE_COLORS: Record<number, string> = {
  [TileType.EMPTY]: '#000000',
  [TileType.BRICK]: '#8B4513',
  [TileType.STEEL]: '#708090',
  [TileType.GRASS]: '#228B22',
  [TileType.WATER]: '#1E90FF',
}

function MapEditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mapId = searchParams.get('id')

  const [mapName, setMapName] = useState('新地图')
  const [mapWidth, setMapWidth] = useState(13)
  const [mapHeight, setMapHeight] = useState(13)
  const [tiles, setTiles] = useState<number[][]>([])
  const [playerSpawn, setPlayerSpawn] = useState<Position>({ x: 4, y: 11 })
  const [basePosition, setBasePosition] = useState<Position>({ x: 6, y: 11 })
  const [enemySpawns, setEnemySpawns] = useState<Position[]>([
    { x: 1, y: 1 },
    { x: 6, y: 1 },
    { x: 11, y: 1 },
  ])

  const [editMode, setEditMode] = useState<EditMode>('wall')
  const [selectedTileType, setSelectedTileType] = useState<TileType>(TileType.BRICK)
  const [isDragging, setIsDragging] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load existing map if editing
  useEffect(() => {
    if (mapId) {
      const existingMap = CustomMapStorage.getMapById(mapId)
      if (existingMap) {
        setMapName(existingMap.name)
        setMapWidth(existingMap.width)
        setMapHeight(existingMap.height)
        setTiles(existingMap.tiles)
        setPlayerSpawn(existingMap.playerSpawn)
        setBasePosition(existingMap.basePosition)
        setEnemySpawns(existingMap.enemySpawns)
        return
      }
    }
    // Initialize empty map
    initializeMap(13, 13)
  }, [mapId])

  // Initialize map
  const initializeMap = (width: number, height: number) => {
    const newTiles: number[][] = []
    for (let y = 0; y < height; y++) {
      newTiles[y] = []
      for (let x = 0; x < width; x++) {
        newTiles[y][x] = TileType.EMPTY
      }
    }
    setTiles(newTiles)
  }

  // Handle map size change
  const handleSizeChange = () => {
    if (mapWidth < 8 || mapWidth > 20 || mapHeight < 8 || mapHeight > 20) {
      alert('地图大小必须在 8 到 20 之间')
      return
    }

    // Create new tiles array preserving existing data
    const newTiles: number[][] = []
    for (let y = 0; y < mapHeight; y++) {
      newTiles[y] = []
      for (let x = 0; x < mapWidth; x++) {
        newTiles[y][x] = tiles[y]?.[x] ?? TileType.EMPTY
      }
    }
    setTiles(newTiles)

    // Adjust positions if needed
    if (playerSpawn.x >= mapWidth) setPlayerSpawn({ x: mapWidth - 1, y: playerSpawn.y })
    if (playerSpawn.y >= mapHeight) setPlayerSpawn({ x: playerSpawn.x, y: mapHeight - 1 })
    if (basePosition.x >= mapWidth) setBasePosition({ x: mapWidth - 1, y: basePosition.y })
    if (basePosition.y >= mapHeight) setBasePosition({ x: basePosition.x, y: mapHeight - 1 })

    // Filter enemy spawns
    setEnemySpawns(enemySpawns.filter(spawn => spawn.x < mapWidth && spawn.y < mapHeight))
  }

  // Render the map on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Fixed cell size: 32px (640 / 20 max cells)
    const cellSize = 32

    // Draw tiles
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = tiles[y]?.[x] ?? TileType.EMPTY
        const px = x * cellSize
        const py = y * cellSize

        ctx.fillStyle = TILE_COLORS[tile] || '#000000'
        ctx.fillRect(px, py, cellSize, cellSize)

        // Draw grid lines
        ctx.strokeStyle = '#333333'
        ctx.lineWidth = 1
        ctx.strokeRect(px, py, cellSize, cellSize)
      }
    }

    // Draw player spawn (green square)
    ctx.fillStyle = '#00FF00'
    const pspx = playerSpawn.x * cellSize + 4
    const pspy = playerSpawn.y * cellSize + 4
    ctx.fillRect(pspx, pspy, cellSize - 8, cellSize - 8)

    // Draw base (yellow square)
    ctx.fillStyle = '#FFD700'
    const bx = basePosition.x * cellSize + 4
    const by = basePosition.y * cellSize + 4
    ctx.fillRect(bx, by, cellSize - 8, cellSize - 8)

    // Draw enemy spawns (red circles)
    ctx.fillStyle = '#FF0000'
    for (const spawn of enemySpawns) {
      const esx = spawn.x * cellSize + cellSize / 2
      const esy = spawn.y * cellSize + cellSize / 2
      ctx.beginPath()
      ctx.arc(esx, esy, cellSize / 3, 0, Math.PI * 2)
      ctx.fill()
    }

  }, [tiles, mapWidth, mapHeight, playerSpawn, basePosition, enemySpawns])

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // Use the actual displayed size from getBoundingClientRect
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX / 32)  // 32 is cell size (640/20)
    const y = Math.floor((e.clientY - rect.top) * scaleY / 32)

    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return

    applyTool(x, y)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    handleCanvasClick(e)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.floor((e.clientX - rect.left) * scaleX / 32)
    const y = Math.floor((e.clientY - rect.top) * scaleY / 32)

    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return

    applyTool(x, y)
  }

  // Apply the current tool
  const applyTool = (x: number, y: number) => {
    switch (editMode) {
      case 'wall':
        const newTiles = [...tiles]
        newTiles[y] = [...newTiles[y]]
        newTiles[y][x] = selectedTileType
        setTiles(newTiles)
        break
      case 'player':
        setPlayerSpawn({ x, y })
        break
      case 'base':
        setBasePosition({ x, y })
        break
      case 'enemy':
        if (!enemySpawns.some(sp => sp.x === x && sp.y === y)) {
          setEnemySpawns([...enemySpawns, { x, y }])
        }
        break
      case 'erase':
        // Remove enemy spawn if clicked
        setEnemySpawns(enemySpawns.filter(sp => sp.x !== x || sp.y !== y))
        // Clear tile
        const erasedTiles = [...tiles]
        erasedTiles[y] = [...erasedTiles[y]]
        erasedTiles[y][x] = TileType.EMPTY
        setTiles(erasedTiles)
        break
    }
  }

  // Remove enemy spawn on right click
  const handleRightClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / 20)
    const y = Math.floor((e.clientY - rect.top) / 20)

    if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return

    setEnemySpawns(enemySpawns.filter(sp => sp.x !== x || sp.y !== y))
  }

  // Save map
  const saveMap = () => {
    if (!mapName.trim()) {
      alert('请输入地图名称')
      return
    }

    const map: CustomMap = {
      id: mapId || CustomMapStorage.generateId(),
      name: mapName,
      width: mapWidth,
      height: mapHeight,
      tiles,
      playerSpawn,
      basePosition,
      enemySpawns,
    }

    CustomMapStorage.saveMap(map)
    router.push('/custom-maps')
  }

  const goBack = () => {
    router.push('/custom-maps')
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-yellow-400">
            {mapId ? '编辑地图' : '创建地图'}
          </h1>
          <button
            onClick={goBack}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
          >
            返回
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left panel - Settings */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="text-lg font-bold mb-4">地图设置</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">地图名称</label>
                <input
                  type="text"
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">宽度 (8-20)</label>
                  <input
                    type="number"
                    min={8}
                    max={20}
                    value={mapWidth}
                    onChange={(e) => setMapWidth(Number(e.target.value))}
                    onBlur={handleSizeChange}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">高度 (8-20)</label>
                  <input
                    type="number"
                    min={8}
                    max={20}
                    value={mapHeight}
                    onChange={(e) => setMapHeight(Number(e.target.value))}
                    onBlur={handleSizeChange}
                    className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600"
                  />
                </div>
              </div>

              <button
                onClick={saveMap}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 rounded font-bold"
              >
                保存地图
              </button>
            </div>

            <h2 className="text-lg font-bold mt-6 mb-4">工具</h2>

            <div className="space-y-2">
              <button
                onClick={() => setEditMode('wall')}
                className={`w-full px-4 py-2 rounded ${editMode === 'wall' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                放置墙体
              </button>

              {editMode === 'wall' && (
                <div className="grid grid-cols-2 gap-2 ml-2">
                  <button
                    onClick={() => setSelectedTileType(TileType.BRICK)}
                    className={`px-3 py-2 rounded ${selectedTileType === TileType.BRICK ? 'bg-blue-600' : 'bg-gray-600'}`}
                    style={{ backgroundColor: selectedTileType === TileType.BRICK ? undefined : '#8B4513' }}
                  >
                    砖墙
                  </button>
                  <button
                    onClick={() => setSelectedTileType(TileType.STEEL)}
                    className={`px-3 py-2 rounded ${selectedTileType === TileType.STEEL ? 'bg-blue-600' : 'bg-gray-600'}`}
                    style={{ backgroundColor: selectedTileType === TileType.STEEL ? undefined : '#708090' }}
                  >
                    铁墙
                  </button>
                  <button
                    onClick={() => setSelectedTileType(TileType.GRASS)}
                    className={`px-3 py-2 rounded ${selectedTileType === TileType.GRASS ? 'bg-blue-600' : 'bg-gray-600'}`}
                    style={{ backgroundColor: selectedTileType === TileType.GRASS ? undefined : '#228B22' }}
                  >
                    草地
                  </button>
                  <button
                    onClick={() => setSelectedTileType(TileType.WATER)}
                    className={`px-3 py-2 rounded ${selectedTileType === TileType.WATER ? 'bg-blue-600' : 'bg-gray-600'}`}
                    style={{ backgroundColor: selectedTileType === TileType.WATER ? undefined : '#1E90FF' }}
                  >
                    水域
                  </button>
                </div>
              )}

              <button
                onClick={() => setEditMode('player')}
                className={`w-full px-4 py-2 rounded ${editMode === 'player' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                设置玩家出生点
              </button>

              <button
                onClick={() => setEditMode('base')}
                className={`w-full px-4 py-2 rounded ${editMode === 'base' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                设置基地位置
              </button>

              <button
                onClick={() => setEditMode('enemy')}
                className={`w-full px-4 py-2 rounded ${editMode === 'enemy' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                添加敌方出生点
              </button>

              <button
                onClick={() => setEditMode('erase')}
                className={`w-full px-4 py-2 rounded ${editMode === 'erase' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                橡皮擦 / 移除敌人生成点
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-400">
              <p>提示：</p>
              <ul className="list-disc list-inside mt-2">
                <li>点击画布放置</li>
                <li>按住拖动连续绘制</li>
                <li>右键点击移除敌人生成点</li>
              </ul>
            </div>
          </div>

          {/* Center - Editor canvas */}
          <div className="lg:col-span-2 bg-gray-800 p-4 rounded-lg flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={640}
              height={640}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseUp}
              onContextMenu={handleRightClick}
              className="cursor-crosshair border border-gray-600"
              style={{
                width: '100%',
                maxWidth: '640px',
                height: 'auto',
                imageRendering: 'pixelated'
              }}
            />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500"></div>
                <span>玩家出生点</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-yellow-500"></div>
                <span>基地</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-red-500"></div>
                <span>敌方出生点 ({enemySpawns.length})</span>
              </div>
            </div>

            {/* Info */}
            <div className="mt-4 text-center text-sm text-gray-400">
              <p>地图尺寸: {mapWidth} x {mapHeight}</p>
              <p>敌人生成点: {enemySpawns.length} 个</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function MapEditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">加载中...</div>}>
      <MapEditorContent />
    </Suspense>
  )
}
