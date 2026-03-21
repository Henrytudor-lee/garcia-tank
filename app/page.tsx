'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GameEngine } from '@/src/game/GameEngine'
import { CustomMap } from '@/src/game/types'
import { useAuth } from '@/src/lib/auth-context'
import { getUserMaps, saveCustomMap } from '@/src/lib/maps'
import { addScore } from '@/src/lib/leaderboard'

const TILE_SIZE = 40
const DEFAULT_MAP_SIZE = 13

export default function Home() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GameEngine | null>(null)
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover' | 'victory'>('menu')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [selectedMap, setSelectedMap] = useState<CustomMap | null>(null)
  const [customMaps, setCustomMaps] = useState<CustomMap[]>([])
  const [canvasSize, setCanvasSize] = useState(DEFAULT_MAP_SIZE * TILE_SIZE)
  const [currentMapName, setCurrentMapName] = useState('默认地图')
  const [currentMapId, setCurrentMapId] = useState<string | undefined>(undefined)

  // Use refs to store current values for callbacks
  const scoreRef = useRef(0)
  const levelRef = useRef(1)
  const userRef = useRef(user)
  const currentMapNameRef = useRef('默认地图')
  const currentMapIdRef = useRef<string | undefined>(undefined)

  // Keep refs in sync with state
  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    levelRef.current = level
  }, [level])

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    currentMapNameRef.current = currentMapName
  }, [currentMapName])

  useEffect(() => {
    currentMapIdRef.current = currentMapId
  }, [currentMapId])

  // Load maps from database if logged in, otherwise from localStorage
  useEffect(() => {
    const loadMaps = async () => {
      if (user) {
        // Load from database
        const dbMaps = await getUserMaps(user.id)
        setCustomMaps(dbMaps)
      } else {
        // Load from localStorage
        const storedMaps = localStorage.getItem('customMaps')
        if (storedMaps) {
          setCustomMaps(JSON.parse(storedMaps))
        }
      }
    }
    loadMaps()
  }, [user])

  useEffect(() => {
    if (!canvasRef.current) return

    const game = new GameEngine(canvasRef.current)
    gameRef.current = game

    game.on('scoreUpdate', (newScore: number) => {
      setScore(newScore)
    })
    game.on('livesUpdate', (newLives: number) => setLives(newLives))
    game.on('levelUpdate', (newLevel: number) => setLevel(newLevel))
    game.on('stateChange', (state: string) => {
      console.log('Game state changed:', state, 'current score:', scoreRef.current)
      setGameState(state as any)
      // Save score to leaderboard on game over (always save, even if 0)
      if (state === 'gameover') {
        console.log('Calling saveToLeaderboard, score:', scoreRef.current, 'level:', levelRef.current)
        saveToLeaderboard(scoreRef.current, levelRef.current, currentMapNameRef.current, currentMapIdRef.current)
      }
      // Save score on victory too
      if (state === 'victory') {
        saveToLeaderboard(scoreRef.current, 5, currentMapNameRef.current, currentMapIdRef.current)
      }
    })

    game.init()

    return () => {
      game.destroy()
    }
  }, [])

  // Save score to leaderboard (database if logged in, localStorage otherwise)
  const saveToLeaderboard = async (finalScore: number, levelsCompleted: number, mapName?: string, mapId?: string) => {
    console.log('saveToLeaderboard called:', { finalScore, levelsCompleted, mapName, user: userRef.current?.email, userId: userRef.current?.id })

    // Don't save if score is 0
    if (finalScore <= 0) {
      console.log('Score is 0, not saving to leaderboard')
      return
    }

    const saveToLocalStorage = () => {
      console.log('Saving to localStorage')
      const entry = {
        score: finalScore,
        date: Date.now(),
        levelsCompleted,
        mapId,
        mapName: mapName || '默认地图',
        email: userRef.current?.email || null
      }
      const stored = localStorage.getItem('leaderboard')
      let leaderboard: any[] = stored ? JSON.parse(stored) : []
      leaderboard.push(entry)
      leaderboard.sort((a, b) => b.score - a.score)
      leaderboard = leaderboard.slice(0, 10)
      localStorage.setItem('leaderboard', JSON.stringify(leaderboard))
      console.log('Saved to localStorage:', entry)
    }

    if (userRef.current) {
      // Save to database
      console.log('Saving to database, userId:', userRef.current.id)
      const result = await addScore(finalScore, levelsCompleted, {
        userId: userRef.current.id,
        email: userRef.current.email,
        mapId,
        mapName: mapName || '默认地图',
      })
      console.log('addScore result:', result)
      // If database save failed (e.g., session expired), fallback to localStorage
      if (!result) {
        saveToLocalStorage()
      }
    } else {
      // Save to localStorage
      saveToLocalStorage()
    }
  }

  const startGame = async (customMap?: CustomMap) => {
    if (gameRef.current) {
      const mapSize = customMap ? Math.max(customMap.width, customMap.height) : DEFAULT_MAP_SIZE
      const newSize = mapSize * TILE_SIZE
      setCanvasSize(newSize)

      if (customMap) {
        // If logged in and it's a new map (no id), save to database
        if (user && !customMap.id) {
          const mapId = await saveCustomMap(user.id, customMap)
          if (mapId) {
            customMap.id = mapId
          }
        }
        setCurrentMapName(customMap.name)
        setCurrentMapId(customMap.id)
        gameRef.current.startWithCustomMap(customMap, newSize)
      } else {
        setCurrentMapName('默认地图')
        setCurrentMapId(undefined)
        gameRef.current.start(newSize)
      }
    }
  }

  const restartGame = () => {
    if (gameRef.current) {
      gameRef.current.restart()
    }
  }

  const resumeGame = () => {
    if (gameRef.current) {
      gameRef.current.resume()
    }
  }

  const goToCustomMaps = () => {
    if (!user) {
      alert('请先登录后才能创建和管理自定义地图')
      router.push('/login')
      return
    }
    router.push('/custom-maps')
  }

  const goToLeaderboard = () => {
    router.push('/leaderboard')
  }

  const goToMainMenu = () => {
    if (gameRef.current) {
      gameRef.current.init()
    }
    setGameState('menu')
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black">
      {/* User info bar - always visible at top */}
      <div className="w-full max-w-2xl flex justify-between items-center text-white px-4 py-2 bg-gray-800/50 mb-11">
        <div>
          {user ? (
            <span className="text-green-400">欢迎, {user.email}</span>
          ) : (
            <span className="text-gray-400">游客模式</span>
          )}
        </div>
        <div className="flex gap-2">
          {user ? (
            <button
              onClick={handleSignOut}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 rounded"
            >
              退出登录
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded"
            >
              登录
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        {/* Game Header - show when playing, paused, gameover, or victory */}
        {(gameState === 'playing' || gameState === 'paused' || gameState === 'gameover' || gameState === 'victory') && (
          <div className="absolute -top-12 left-0 right-0 flex justify-between items-center text-white px-4 z-10 bg-black/60 py-1">
            <div className="flex items-center gap-4">
              <span className="text-yellow-400 font-bold">SCORE: {score}</span>
              <span className="text-green-400 font-bold">LEVEL: {level}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-red-400 font-bold">LIVES: {lives === 0 ? '0' : '❤️'.repeat(lives)}</span>
            </div>
          </div>
        )}

        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="border-4 border-gray-700 bg-black"
          style={{ maxWidth: '100%', height: 'auto' }}
        />

        {/* Menu Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <h1 className="text-4xl font-bold text-yellow-400 mb-8" style={{ textShadow: '2px 2px 0 #ff0000' }}>
              坦克大战
            </h1>
            <p className="text-gray-400 mb-2">WASD / 方向键 移动</p>
            <p className="text-gray-400 mb-8">空格键 射击 | P键 暂停</p>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => startGame()}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-xl transition"
              >
                开始游戏
              </button>

              {customMaps.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-gray-400 text-center text-sm">选择自定义地图:</p>
                  <select
                    onChange={(e) => {
                      const map = customMaps.find(m => m.id === e.target.value)
                      setSelectedMap(map || null)
                    }}
                    className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-600"
                    value={selectedMap?.id || ''}
                  >
                    <option value="">-- 选择地图 --</option>
                    {customMaps.map(map => (
                      <option key={map.id} value={map.id}>{map.name}</option>
                    ))}
                  </select>
                  {selectedMap && (
                    <button
                      onClick={() => startGame(selectedMap)}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xl transition"
                    >
                      使用此地图开始
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={goToCustomMaps}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded text-xl transition"
              >
                自定义地图
              </button>

              <button
                onClick={goToLeaderboard}
                className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded text-xl transition"
              >
                排行榜
              </button>
            </div>
          </div>
        )}

        {/* Pause Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <h1 className="text-4xl font-bold text-blue-400 mb-8">暂停</h1>
            <div className="flex flex-col gap-4">
              <button
                onClick={resumeGame}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-xl transition"
              >
                继续游戏
              </button>
              <button
                onClick={goToMainMenu}
                className="px-8 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded text-xl transition"
              >
                返回主菜单
              </button>
            </div>
            <p className="text-gray-400 mt-4">按 P 键继续</p>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <h1 className="text-4xl font-bold text-red-500 mb-4">游戏结束</h1>
            <p className="text-white mb-2">最终得分: {score}</p>
            <p className="text-gray-400 mb-8">到达关卡: {level}</p>
            <div className="flex flex-col gap-4">
              <button
                onClick={restartGame}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-xl transition"
              >
                重新开始
              </button>
              <button
                onClick={goToMainMenu}
                className="px-8 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded text-xl transition"
              >
                返回主菜单
              </button>
            </div>
          </div>
        )}

        {/* Victory Overlay */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <h1 className="text-4xl font-bold text-yellow-400 mb-4">恭喜过关!</h1>
            <p className="text-white mb-2">最终得分: {score}</p>
            <div className="flex flex-col gap-4">
              <button
                onClick={restartGame}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-xl transition"
              >
                再玩一次
              </button>
              <button
                onClick={goToMainMenu}
                className="px-8 py-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded text-xl transition"
              >
                返回主菜单
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
