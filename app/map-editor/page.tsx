'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CustomMap, TileType, Position } from '@/src/game/types'
import { useAuth } from '@/src/lib/auth-context'
import { useLanguage } from '@/src/lib/i18n'
import { getMapById, saveCustomMap, updateCustomMap } from '@/src/lib/maps'
import { LanguageToggle } from '@/src/components/LanguageToggle'

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
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()

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
  const [loading, setLoading] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Load existing map if editing
  useEffect(() => {
    if (authLoading) return

    const loadMap = async () => {
      if (mapId) {
        if (user) {
          // Load from database
          const dbMap = await getMapById(mapId)
          if (dbMap) {
            setMapName(dbMap.name)
            setMapWidth(dbMap.width)
            setMapHeight(dbMap.height)
            setTiles(dbMap.tiles)
            setPlayerSpawn(dbMap.playerSpawn)
            setBasePosition(dbMap.basePosition)
            setEnemySpawns(dbMap.enemySpawns)
            setLoading(false)
            return
          }
        } else {
          // Load from localStorage
          const stored = localStorage.getItem('customMaps')
          if (stored) {
            const allMaps: CustomMap[] = JSON.parse(stored)
            const existingMap = allMaps.find(m => m.id === mapId)
            if (existingMap) {
              setMapName(existingMap.name)
              setMapWidth(existingMap.width)
              setMapHeight(existingMap.height)
              setTiles(existingMap.tiles)
              setPlayerSpawn(existingMap.playerSpawn)
              setBasePosition(existingMap.basePosition)
              setEnemySpawns(existingMap.enemySpawns)
              setLoading(false)
              return
            }
          }
        }
      }
      // Initialize empty map
      initializeMap(13, 13)
      setLoading(false)
    }

    loadMap()
  }, [mapId, user, authLoading])

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
      alert(t('mapSizeError'))
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
  const saveMap = async () => {
    if (!mapName.trim()) {
      alert(t('enterMapName'))
      return
    }

    const map: CustomMap = {
      id: mapId || generateId(),
      name: mapName,
      width: mapWidth,
      height: mapHeight,
      tiles,
      playerSpawn,
      basePosition,
      enemySpawns,
    }

    if (user) {
      // Save to database
      if (mapId) {
        // Update existing
        await updateCustomMap(mapId, user.id, map)
      } else {
        // Save new
        await saveCustomMap(user.id, map)
      }
    } else {
      // Save to localStorage
      const stored = localStorage.getItem('customMaps')
      let allMaps: CustomMap[] = stored ? JSON.parse(stored) : []

      if (mapId) {
        // Update existing
        allMaps = allMaps.map(m => m.id === mapId ? map : m)
      } else {
        // Add new
        allMaps.push(map)
      }

      localStorage.setItem('customMaps', JSON.stringify(allMaps))
    }

    router.push('/custom-maps')
  }

  const goBack = () => {
    router.push('/custom-maps')
  }

  // Generate unique ID for localStorage maps
  const generateId = (): string => {
    return 'map_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">{t('loading')}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 border-b border-neon-cyan/30 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-neon-yellow drop-shadow-[0_0_10px_#ffff00]">
              {mapId ? t('editMap') : t('createMap')}
            </h1>
            {user && (
              <p className="text-gray-400 text-sm">{t('loggedInAs')}: <span className="text-neon-cyan">{user.email}</span></p>
            )}
          </div>
          <div className="flex gap-2">
            <LanguageToggle />
            <button
              onClick={goBack}
              className="px-4 py-2 bg-neon-cyan/20 hover:bg-neon-cyan/40 border border-neon-cyan/50 text-neon-cyan rounded transition-all duration-300 hover:shadow-neon-cyan"
            >
              {t('returnToMenu')}
            </button>
          </div>
        </div>

        {!user && (
          <div className="bg-neon-yellow/10 border border-neon-yellow/50 p-4 rounded mb-4">
            <p className="text-neon-yellow text-sm">
              {t('guestModeNotice')}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left panel - Settings */}
          <div className="bg-black/80 p-4 rounded-lg border-2 border-neon-cyan/30">
            <h2 className="text-lg font-bold text-neon-cyan mb-4">{t('mapSettings')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neon-cyan/80 mb-1">{t('mapName')}</label>
                <input
                  type="text"
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  className="w-full px-3 py-2 bg-black/80 rounded border-2 border-neon-cyan/50 text-white focus:border-neon-cyan focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neon-cyan/80 mb-1">{t('width')} (8-20)</label>
                  <input
                    type="number"
                    min={8}
                    max={20}
                    value={mapWidth}
                    onChange={(e) => setMapWidth(Number(e.target.value))}
                    onBlur={handleSizeChange}
                    className="w-full px-3 py-2 bg-black/80 rounded border-2 border-neon-cyan/50 text-white focus:border-neon-cyan focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-neon-cyan/80 mb-1">{t('height')} (8-20)</label>
                  <input
                    type="number"
                    min={8}
                    max={20}
                    value={mapHeight}
                    onChange={(e) => setMapHeight(Number(e.target.value))}
                    onBlur={handleSizeChange}
                    className="w-full px-3 py-2 bg-black/80 rounded border-2 border-neon-cyan/50 text-white focus:border-neon-cyan focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={saveMap}
                className="w-full px-4 py-3 bg-neon-green/20 hover:bg-neon-green/40 border-2 border-neon-green text-neon-green font-bold rounded transition-all duration-300 hover:shadow-neon-green"
              >
                {t('saveMap')}
              </button>
            </div>

            <h2 className="text-lg font-bold text-neon-cyan mt-6 mb-4">{t('tools')}</h2>

            <div className="space-y-2">
              <button
                onClick={() => setEditMode('wall')}
                className={`w-full px-4 py-2 rounded transition-all duration-300 ${editMode === 'wall' ? 'bg-neon-cyan/40 border-2 border-neon-cyan text-neon-cyan' : 'bg-black/60 border-2 border-neon-cyan/30 text-neon-cyan/70 hover:border-neon-cyan/60'}`}
              >
                {t('placeWall')}
              </button>

              {editMode === 'wall' && (
                <div className="grid grid-cols-2 gap-2 ml-2">
                  <button
                    onClick={() => setSelectedTileType(TileType.BRICK)}
                    className={`px-3 py-2 rounded border-2 transition-all duration-300 ${selectedTileType === TileType.BRICK ? 'bg-neon-cyan/40 border-neon-cyan text-neon-cyan' : 'border-neon-cyan/30 text-gray-300 hover:border-neon-cyan/60'}`}
                    style={{ backgroundColor: selectedTileType === TileType.BRICK ? undefined : '#8B4513' }}
                  >
                    {t('brick')}
                  </button>
                  <button
                    onClick={() => setSelectedTileType(TileType.STEEL)}
                    className={`px-3 py-2 rounded border-2 transition-all duration-300 ${selectedTileType === TileType.STEEL ? 'bg-neon-cyan/40 border-neon-cyan text-neon-cyan' : 'border-neon-cyan/30 text-gray-300 hover:border-neon-cyan/60'}`}
                    style={{ backgroundColor: selectedTileType === TileType.STEEL ? undefined : '#708090' }}
                  >
                    {t('steel')}
                  </button>
                  <button
                    onClick={() => setSelectedTileType(TileType.GRASS)}
                    className={`px-3 py-2 rounded border-2 transition-all duration-300 ${selectedTileType === TileType.GRASS ? 'bg-neon-cyan/40 border-neon-cyan text-neon-cyan' : 'border-neon-cyan/30 text-gray-300 hover:border-neon-cyan/60'}`}
                    style={{ backgroundColor: selectedTileType === TileType.GRASS ? undefined : '#228B22' }}
                  >
                    {t('grass')}
                  </button>
                  <button
                    onClick={() => setSelectedTileType(TileType.WATER)}
                    className={`px-3 py-2 rounded border-2 transition-all duration-300 ${selectedTileType === TileType.WATER ? 'bg-neon-cyan/40 border-neon-cyan text-neon-cyan' : 'border-neon-cyan/30 text-gray-300 hover:border-neon-cyan/60'}`}
                    style={{ backgroundColor: selectedTileType === TileType.WATER ? undefined : '#1E90FF' }}
                  >
                    {t('water')}
                  </button>
                </div>
              )}

              <button
                onClick={() => setEditMode('player')}
                className={`w-full px-4 py-2 rounded transition-all duration-300 ${editMode === 'player' ? 'bg-neon-cyan/40 border-2 border-neon-cyan text-neon-cyan' : 'bg-black/60 border-2 border-neon-cyan/30 text-neon-cyan/70 hover:border-neon-cyan/60'}`}
              >
                {t('setPlayerSpawn')}
              </button>

              <button
                onClick={() => setEditMode('base')}
                className={`w-full px-4 py-2 rounded transition-all duration-300 ${editMode === 'base' ? 'bg-neon-cyan/40 border-2 border-neon-cyan text-neon-cyan' : 'bg-black/60 border-2 border-neon-cyan/30 text-neon-cyan/70 hover:border-neon-cyan/60'}`}
              >
                {t('setBasePosition')}
              </button>

              <button
                onClick={() => setEditMode('enemy')}
                className={`w-full px-4 py-2 rounded transition-all duration-300 ${editMode === 'enemy' ? 'bg-neon-cyan/40 border-2 border-neon-cyan text-neon-cyan' : 'bg-black/60 border-2 border-neon-cyan/30 text-neon-cyan/70 hover:border-neon-cyan/60'}`}
              >
                {t('addEnemySpawn')}
              </button>

              <button
                onClick={() => setEditMode('erase')}
                className={`w-full px-4 py-2 rounded transition-all duration-300 ${editMode === 'erase' ? 'bg-neon-red/40 border-2 border-neon-red text-neon-red' : 'bg-black/60 border-2 border-neon-red/30 text-neon-red/70 hover:border-neon-red/60'}`}
              >
                {t('eraser')}
              </button>
            </div>

            <div className="mt-6 text-sm text-neon-cyan/60">
              <p className="text-neon-cyan/80">{t('tips')}</p>
              <ul className="list-disc list-inside mt-2">
                <li>{t('tip1')}</li>
                <li>{t('tip2')}</li>
                <li>{t('tip3')}</li>
              </ul>
            </div>
          </div>

          {/* Center - Editor canvas */}
          <div className="lg:col-span-2 bg-black/80 p-4 rounded-lg border-2 border-neon-cyan/30 flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={640}
              height={640}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseUp}
              onContextMenu={handleRightClick}
              className="cursor-crosshair border-2 border-neon-cyan/50"
              style={{
                width: '100%',
                maxWidth: '640px',
                height: 'auto',
                imageRendering: 'pixelated'
              }}
            />

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm text-neon-cyan/80">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-neon-green"></div>
                <span>{t('playerSpawn')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-neon-yellow"></div>
                <span>{t('basePosition')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-neon-red"></div>
                <span>{t('enemySpawns')} ({enemySpawns.length})</span>
              </div>
            </div>

            {/* Info */}
            <div className="mt-4 text-center text-sm text-gray-400">
              <p>{t('mapSize')}: <span className="text-neon-cyan">{mapWidth} x {mapHeight}</span></p>
              <p>{t('enemySpawns')}: <span className="text-neon-red">{enemySpawns.length}</span> {t('enemies')}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function MapEditorPage() {
  const { t } = useLanguage()
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">{t('loading')}</div>}>
      <MapEditorContent />
    </Suspense>
  )
}
