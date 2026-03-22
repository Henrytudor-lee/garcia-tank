'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CustomMap, TileType } from '@/src/game/types'
import { useAuth } from '@/src/lib/auth-context'
import { useLanguage } from '@/src/lib/i18n'
import { getUserMaps, deleteCustomMap } from '@/src/lib/maps'
import { LanguageToggle } from '@/src/components/LanguageToggle'

export default function CustomMapsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const [maps, setMaps] = useState<CustomMap[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      loadMaps()
    }
  }, [user, authLoading])

  const loadMaps = async () => {
    if (user) {
      // Load from database
      const dbMaps = await getUserMaps(user.id)
      setMaps(dbMaps)
    } else {
      // Load from localStorage
      const stored = localStorage.getItem('customMaps')
      if (stored) {
        setMaps(JSON.parse(stored))
      }
    }
    setLoading(false)
  }

  const deleteMap = async (mapId: string) => {
    if (!confirm(t('confirmDelete'))) return

    if (user) {
      // Delete from database
      await deleteCustomMap(mapId, user.id)
    } else {
      // Delete from localStorage
      const stored = localStorage.getItem('customMaps')
      if (stored) {
        const allMaps: CustomMap[] = JSON.parse(stored)
        const filtered = allMaps.filter(m => m.id !== mapId)
        localStorage.setItem('customMaps', JSON.stringify(filtered))
      }
    }
    loadMaps()
  }

  const createNewMap = () => {
    if (!user) {
      alert(t('pleaseLoginToCreateMap'))
      router.push('/login')
      return
    }
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

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">{t('loading')}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">{t('customMapsTitle')}</h1>
            {user && (
              <p className="text-gray-400 text-sm mt-1">
                {t('loggedInAs')}: {user.email}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <LanguageToggle />
            <button
              onClick={goBack}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
            >
              {t('returnToMenu')}
            </button>
          </div>
        </div>

        {!user && (
          <div className="bg-yellow-900/30 border border-yellow-600 p-4 rounded mb-6">
            <p className="text-yellow-400">
              {t('guestModeNotice')}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
            >
              {t('login')}
            </button>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <button
            onClick={createNewMap}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded font-bold"
          >
            {t('createNewMap')}
          </button>
        </div>

        {maps.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-xl mb-4">{t('noCustomMaps')}</p>
            <p>{t('clickToCreate')}</p>
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
                      {t('size')}: {map.width} x {map.height} |
                      {t('walls')}: {getTileCount(map)} |
                      {t('playerSpawn')}: ({map.playerSpawn.x}, {map.playerSpawn.y}) |
                      {t('basePosition')}: ({map.basePosition.x}, {map.basePosition.y})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editMap(map.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => deleteMap(map.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded"
                    >
                      {t('delete')}
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
