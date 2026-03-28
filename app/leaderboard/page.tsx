'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/lib/auth-context'
import { useLanguage } from '@/src/lib/i18n'
import { getLeaderboard } from '@/src/lib/leaderboard'
import type { CustomMap } from '@/src/game/types'
import { LanguageToggle } from '@/src/components/LanguageToggle'


interface LeaderboardEntry {
  id?: string
  score: number
  date: number
  levelsCompleted?: number
  mapId?: string
  mapName?: string
  email?: string
  userId?: string
  username?: string
  gameMode?: 'single' | 'multiplayer'
}

export default function LeaderboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<LeaderboardEntry[]>([])
  const [customMaps, setCustomMaps] = useState<CustomMap[]>([])
  const [selectedMap, setSelectedMap] = useState<string>('all')
  const [selectedMode, setSelectedMode] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [pageSize, setPageSize] = useState<number>(50)
  const [currentPage, setCurrentPage] = useState<number>(1)

  useEffect(() => {
    if (!authLoading) {
      loadData()
    }
  }, [user, authLoading])

  useEffect(() => {
    filterEntries()
  }, [entries, selectedMap, selectedMode, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedMap, selectedMode, pageSize])

  const loadData = async () => {
    setLoading(true)

    // Always try to load from database first
    const dbEntries = await getLeaderboard(50)
    const formattedEntries: LeaderboardEntry[] = dbEntries.map(e => ({
      id: e.id,
      score: e.score,
      date: new Date(e.created_at).getTime(),
      levelsCompleted: e.levels_completed,
      mapId: e.map_id || undefined,
      mapName: e.map_name || t('defaultMap'),
      email: e.email || undefined,
      userId: e.user_id || undefined,
      username: e.username || undefined,
      gameMode: (e.game_mode as 'single' | 'multiplayer') || 'single',
    }))

    // If database has entries, use them
    if (formattedEntries.length > 0) {
      setEntries(formattedEntries)

      // Load custom maps for filter if user is logged in
      if (user) {
        const { getUserMaps } = await import('@/src/lib/maps')
        const maps = await getUserMaps(user.id)
        setCustomMaps(maps)
      }
    } else {
      // Fallback to localStorage if database is empty
      const stored = localStorage.getItem('leaderboard')
      if (stored) {
        setEntries(JSON.parse(stored))
      }

      // Load custom maps from localStorage
      const storedMaps = localStorage.getItem('customMaps')
      if (storedMaps) {
        setCustomMaps(JSON.parse(storedMaps))
      }
    }

    setLoading(false)
  }

  const filterEntries = () => {
    let filtered = entries

    // Filter by mode
    if (selectedMode !== 'all') {
      filtered = filtered.filter(e => e.gameMode === selectedMode)
    }

    // Filter by map
    if (selectedMap === 'all') {
      setFilteredEntries(filtered)
    } else if (selectedMap === 'default') {
      setFilteredEntries(filtered.filter(e => !e.mapId || e.mapName === t('defaultMap')))
    } else {
      setFilteredEntries(filtered.filter(e => e.mapId === selectedMap))
    }
  }

  // Get paginated entries
  const getPaginatedEntries = () => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredEntries.slice(start, end)
  }

  const totalPages = Math.ceil(filteredEntries.length / pageSize)

  const goBack = () => {
    router.push('/')
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neon-cyan">{t('loading')}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 border-b border-neon-cyan/30 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-neon-yellow drop-shadow-[0_0_10px_#ffff00]">{t('leaderboardTitle')}</h1>
            {user && (
              <p className="text-gray-400 text-sm mt-1">
                {t('loggedInAs')}: <span className="text-neon-cyan">{user.email}</span>
              </p>
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


        {/* Map and Mode Filter */}
        <div className="mb-4 flex items-center gap-4 flex-wrap">
          <label className="text-neon-cyan/80">{t('filterMap')}:</label>
          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value)}
            className="px-4 py-2 bg-black/80 text-white rounded border-2 border-neon-cyan/50 focus:border-neon-cyan focus:outline-none transition-colors"
          >
            <option value="all">{t('allMaps')}</option>
            <option value="default">{t('defaultMap')}</option>
            {customMaps.map(map => (
              <option key={map.id} value={map.id}>{map.name}</option>
            ))}
          </select>
          <label className="text-neon-cyan/80">{t('filterMode') || '模式'}:</label>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="px-4 py-2 bg-black/80 text-white rounded border-2 border-neon-cyan/50 focus:border-neon-cyan focus:outline-none transition-colors"
          >
            <option value="all">{t('allModes') || '全部'}</option>
            <option value="single">{t('singlePlayer') || '单人'}</option>
            <option value="multiplayer">{t('multiplayer') || '双人'}</option>
          </select>
          <span className="text-neon-cyan/70 text-sm">
            {filteredEntries.length} {t('totalRecords')}
          </span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-xl mb-4">{t('noRecords')}</p>
            <p>{t('startGameToRecord')}</p>
          </div>
        ) : (
          <>
            {/* Page size selector */}
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="text-neon-cyan/80">{t('pageSize') || '每页显示'}:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-3 py-1.5 bg-black/80 text-white rounded border-2 border-neon-cyan/50 focus:border-neon-cyan focus:outline-none transition-colors"
                >
                  <option value={10}>10 {t('records') || '条'}</option>
                  <option value={20}>20 {t('records') || '条'}</option>
                  <option value={50}>50 {t('records') || '条'}</option>
                  <option value={100}>100 {t('records') || '条'}</option>
                </select>
              </div>
              <div className="text-neon-cyan/70 text-sm">
                {t('page')} {currentPage} / {totalPages}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-black/90 border-b border-neon-cyan/30">
                      <th className="px-2 py-3 text-left w-14 text-neon-cyan">{t('rank')}</th>
                      <th className="px-2 py-3 text-right text-neon-cyan min-w-[80px]">{t('score')}</th>
                      <th className="px-2 py-3 text-center text-neon-cyan min-w-[100px]">{t('map')}</th>
                      <th className="px-2 py-3 text-center w-20 text-neon-cyan">{t('mode') || '模式'}</th>
                      <th className="px-2 py-3 text-center w-40 text-neon-cyan">{t('email')}</th>
                      <th className="px-2 py-3 text-right hidden lg:table-cell w-32 text-neon-cyan">{t('date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPaginatedEntries().map((entry, index) => {
                      const rank = (currentPage - 1) * pageSize + index + 1
                      return (
                        <tr
                          key={entry.id || rank}
                          className={`border-t border-gray-700 ${
                            rank === 1 ? 'bg-yellow-900/30' :
                            rank === 2 ? 'bg-gray-600/50' :
                            rank === 3 ? 'bg-orange-900/30' : ''
                          }`}
                        >
                          <td className="px-2 py-3">
                            <span className="flex items-center gap-1">
                              {rank === 1 && '🥇'}
                              {rank === 2 && '🥈'}
                              {rank === 3 && '🥉'}
                              {rank > 3 && `#${rank}`}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-right font-bold text-yellow-400">
                            {entry.score.toLocaleString()}
                          </td>
                          <td className="px-2 py-3 text-center text-sm min-w-[100px]">
                            <span className="inline-block max-w-[150px] px-2 py-1 bg-black/60 border border-neon-cyan/30 rounded text-neon-cyan/80 truncate" title={entry.mapName || t('defaultMap')}>
                              {entry.mapName || t('defaultMap')}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center text-sm whitespace-nowrap">
                            <span className={`inline-block px-2 py-1 rounded ${
                              entry.gameMode === 'multiplayer'
                                ? 'bg-neon-yellow/20 border border-neon-yellow/50 text-neon-yellow'
                                : 'bg-neon-green/20 border border-neon-green/50 text-neon-green'
                            }`}>
                              {entry.gameMode === 'multiplayer' ? (t('multiplayer') || '双人') : (t('singlePlayer') || '单人')}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-center text-gray-300 text-sm">
                            {entry.email || '游客'}
                          </td>
                          <td className="px-2 py-3 text-right text-gray-400 text-sm hidden lg:table-cell">
                            {formatDate(entry.date)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-neon-cyan/20 hover:bg-neon-cyan/40 border border-neon-cyan/50 text-neon-cyan rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  ««
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-neon-cyan/20 hover:bg-neon-cyan/40 border border-neon-cyan/50 text-neon-cyan rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  «
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded border transition-all ${
                          currentPage === pageNum
                            ? 'bg-neon-cyan/40 border-neon-cyan text-neon-cyan'
                            : 'bg-black/60 border-neon-cyan/30 text-neon-cyan/70 hover:bg-neon-cyan/20'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-neon-cyan/20 hover:bg-neon-cyan/40 border border-neon-cyan/50 text-neon-cyan rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  »
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-neon-cyan/20 hover:bg-neon-cyan/40 border border-neon-cyan/50 text-neon-cyan rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  »»
                </button>
              </div>
            )}

                      </>
        )}
      </div>
    </main>
  )
}
