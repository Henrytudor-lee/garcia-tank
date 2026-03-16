'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/src/lib/auth-context'
import { getLeaderboard } from '@/src/lib/leaderboard'
import type { CustomMap } from '@/src/game/types'


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
}

export default function LeaderboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<LeaderboardEntry[]>([])
  const [customMaps, setCustomMaps] = useState<CustomMap[]>([])
  const [selectedMap, setSelectedMap] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Check if user is a legacy user - do this synchronously
  const isLegacyUser = (() => {
    if (!user) return false
    const storedUser = localStorage.getItem('tank_user')
    if (!storedUser) return false
    try {
      return JSON.parse(storedUser).isLegacy === true
    } catch {
      return false
    }
  })()

  useEffect(() => {
    if (!authLoading) {
      loadData()
    }
  }, [user, authLoading, isLegacyUser])

  useEffect(() => {
    filterEntries()
  }, [entries, selectedMap])

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
      mapName: e.map_name || '默认地图',
      email: e.email || undefined,
      userId: e.user_id || undefined,
      username: e.username || undefined,
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
    if (selectedMap === 'all') {
      setFilteredEntries(entries)
    } else if (selectedMap === 'default') {
      setFilteredEntries(entries.filter(e => !e.mapId || e.mapName === '默认地图'))
    } else {
      setFilteredEntries(entries.filter(e => e.mapId === selectedMap))
    }
  }

  const clearLeaderboard = async () => {
    if (!confirm('确定要清空排行榜吗？')) return

    if (user) {
      // Note: In production, you'd want a server-side function to clear
      alert('请联系管理员清空云端排行榜')
    } else {
      localStorage.removeItem('leaderboard')
      setEntries([])
    }
  }

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
        <div className="text-white">加载中...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">排行榜</h1>
            {user && (
              <p className="text-gray-400 text-sm mt-1">
                登录账号: {user.email}
              </p>
            )}
          </div>
          <button
            onClick={goBack}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
          >
            返回
          </button>
        </div>

        {(!user || isLegacyUser) && (
          <div className="bg-yellow-900/30 border border-yellow-600 p-4 rounded mb-6">
            <p className="text-yellow-400">
              {isLegacyUser ? '您当前是本地登录模式，只显示本地排行榜。' : '您当前是游客模式，只显示本地排行榜。登录后可参与全球排行榜！'}
            </p>
            {!isLegacyUser && (
              <button
                onClick={() => router.push('/login')}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm"
              >
                登录
              </button>
            )}
          </div>
        )}

        {/* Map Filter */}
        <div className="mb-4 flex items-center gap-4 flex-wrap">
          <label className="text-gray-400">筛选地图:</label>
          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-600"
          >
            <option value="all">全部地图</option>
            <option value="default">默认地图</option>
            {customMaps.map(map => (
              <option key={map.id} value={map.id}>{map.name}</option>
            ))}
          </select>
          <span className="text-gray-400 text-sm">
            共 {filteredEntries.length} 条记录
          </span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-xl mb-4">暂无记录</p>
            <p>开始游戏来创造你的最高分吧！</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-2 py-3 text-left w-16">排名</th>
                    <th className="px-2 py-3 text-right">分数</th>
                    <th className="px-2 py-3 text-center w-24">地图</th>
                    <th className="px-2 py-3 text-center w-48">邮箱</th>
                    <th className="px-2 py-3 text-right hidden lg:table-cell">日期</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry, index) => (
                    <tr
                      key={entry.id || index}
                      className={`border-t border-gray-700 ${
                        index === 0 ? 'bg-yellow-900/30' :
                        index === 1 ? 'bg-gray-600/50' :
                        index === 2 ? 'bg-orange-900/30' : ''
                      }`}
                    >
                      <td className="px-2 py-3">
                        <span className="flex items-center gap-1">
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index > 2 && `#${index + 1}`}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right font-bold text-yellow-400">
                        {entry.score.toLocaleString()}
                      </td>
                      <td className="px-2 py-3 text-center text-sm">
                        <span className="px-2 py-1 bg-gray-700 rounded text-gray-300">
                          {entry.mapName || '默认地图'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-gray-300 text-sm">
                        {entry.email || '游客'}
                      </td>
                      <td className="px-2 py-3 text-right text-gray-400 text-sm hidden lg:table-cell">
                        {formatDate(entry.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={clearLeaderboard}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded"
              >
                清空排行榜
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
