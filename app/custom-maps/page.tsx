'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CustomMap, TileType } from '@/src/game/types'
import { CustomMapStorage } from '@/src/game/CustomMapStorage'

export default function CustomMapsPage() {
  const router = useRouter()
  const [maps, setMaps] = useState<CustomMap[]>([])
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)

  useEffect(() => {
    loadMaps()
  }, [])

  const loadMaps = () => {
    const storedMaps = CustomMapStorage.getMaps()
    setMaps(storedMaps)
  }

  const deleteMap = (mapId: string) => {
    if (confirm('确定要删除这个地图吗？')) {
      CustomMapStorage.deleteMap(mapId)
      loadMaps()
    }
  }

  const createNewMap = () => {
    router.push('/map-editor')
  }

  const editMap = (mapId: string) => {
    router.push(`/map-editor?id=${mapId}`)
  }

  const goBack = () => {
    router.push('/')
  }

  const getTileCount = (map: CustomMap): number => {
    let count = 0
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y]?.[x]
        if (tile && tile !== TileType.EMPTY) count++
      }
    }
    return count
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-yellow-400">自定义地图</h1>
          <button
            onClick={goBack}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
          >
            返回
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={createNewMap}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded font-bold"
          >
            创建新地图
          </button>
        </div>

        {maps.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-xl mb-4">还没有自定义地图</p>
            <p>点击"创建新地图"开始制作</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {maps.map(map => (
              <div
                key={map.id}
                className="bg-gray-800 p-4 rounded-lg border border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-yellow-400">{map.name}</h3>
                    <p className="text-gray-400 text-sm">
                      大小: {map.width} x {map.height} |
                      墙体数: {getTileCount(map)} |
                      玩家出生点: ({map.playerSpawn.x}, {map.playerSpawn.y}) |
                      基地位置: ({map.basePosition.x}, {map.basePosition.y})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editMap(map.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => deleteMap(map.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* Mini map preview */}
                <div className="mt-4 flex justify-center">
                  <div
                    className="grid gap-0"
                    style={{
                      gridTemplateColumns: `repeat(${map.width}, 8px)`,
                      gridTemplateRows: `repeat(${map.height}, 8px)`,
                    }}
                  >
                    {map.tiles.map((row, y) =>
                      row.map((tile, x) => (
                        <div
                          key={`${x}-${y}`}
                          className="w-2 h-2"
                          style={{
                            backgroundColor:
                              tile === TileType.BRICK ? '#8B4513' :
                              tile === TileType.STEEL ? '#708090' :
                              tile === TileType.GRASS ? '#228B22' :
                              tile === TileType.WATER ? '#1E90FF' :
                              map.playerSpawn.x === x && map.playerSpawn.y === y ? '#00FF00' :
                              map.basePosition.x === x && map.basePosition.y === y ? '#FFD700' :
                              '#000000'
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
