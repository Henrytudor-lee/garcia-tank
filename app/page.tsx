'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GameEngine } from '@/src/game/GameEngine'
import { CustomMap, GameMode } from '@/src/game/types'
import { useAuth } from '@/src/lib/auth-context'
import { useLanguage } from '@/src/lib/i18n'
import { getUserMaps, saveCustomMap } from '@/src/lib/maps'
import { addScore } from '@/src/lib/leaderboard'
import { LanguageToggle } from '@/src/components/LanguageToggle'

const TILE_SIZE = 40
const DEFAULT_MAP_SIZE = 13

export default function Home() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GameEngine | null>(null)
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover' | 'victory'>('menu')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [playerLives, setPlayerLives] = useState({ player1: 3, player2: 3 }) // For multiplayer mode
  const [level, setLevel] = useState(1)
  const [selectedMap, setSelectedMap] = useState<CustomMap | null>(null)
  const [customMaps, setCustomMaps] = useState<CustomMap[]>([])
  const [canvasSize, setCanvasSize] = useState(DEFAULT_MAP_SIZE * TILE_SIZE)
  const [currentMapName, setCurrentMapName] = useState('')
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.SINGLE)

  // Initialize after mount to avoid hydration mismatch
  useEffect(() => {
    setCurrentMapName(t('defaultMap'))
  }, [t])
  const [currentMapId, setCurrentMapId] = useState<string | undefined>(undefined)

  // Use refs to store current values for callbacks
  const scoreRef = useRef(0)
  const levelRef = useRef(1)
  const userRef = useRef(user)
  const currentMapNameRef = useRef(t('defaultMap'))
  const currentMapIdRef = useRef<string | undefined>(undefined)
  const gameModeRef = useRef<GameMode>(GameMode.SINGLE)

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

  useEffect(() => {
    gameModeRef.current = gameMode
  }, [gameMode])

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
    game.on('multiplayerLivesUpdate', ({ player1, player2 }: { player1: number, player2: number }) => {
      setPlayerLives({ player1, player2 })
    })
    game.on('levelUpdate', (newLevel: number) => setLevel(newLevel))
    game.on('stateChange', (state: string) => {
      console.log('Game state changed:', state, 'current score:', scoreRef.current)
      setGameState(state as any)
      // Save score to leaderboard on game over (always save, even if 0)
      if (state === 'gameover') {
        console.log('Calling saveToLeaderboard, score:', scoreRef.current, 'level:', levelRef.current)
        saveToLeaderboard(scoreRef.current, levelRef.current, currentMapNameRef.current, currentMapIdRef.current, gameModeRef.current)
      }
      // Save score on victory too
      if (state === 'victory') {
        saveToLeaderboard(scoreRef.current, 5, currentMapNameRef.current, currentMapIdRef.current, gameModeRef.current)
      }
    })

    game.init()

    return () => {
      game.destroy()
    }
  }, [])

  // Save score to leaderboard (database if logged in, localStorage otherwise)
  const saveToLeaderboard = async (finalScore: number, levelsCompleted: number, mapName?: string, mapId?: string, gameMode: GameMode = GameMode.SINGLE) => {
    console.log('saveToLeaderboard called:', { finalScore, levelsCompleted, mapName, user: userRef.current?.email, userId: userRef.current?.id, gameMode })

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
        email: userRef.current?.email || null,
        gameMode: gameMode || 'single'
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
        gameMode: gameMode || 'single'
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

  const startGame = async (customMap?: CustomMap, mode: GameMode = GameMode.SINGLE) => {
    if (gameRef.current) {
      // Set game mode before starting
      gameRef.current.setGameMode(mode)
      setGameMode(mode)
      gameModeRef.current = mode  // Update ref immediately

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
        setCurrentMapName(t('defaultMap'))
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
      alert(t('pleaseLoginFirst'))
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
    <main className="min-h-screen flex flex-col items-center justify-center bg-black py-8">
      {/* User info bar - always visible at top */}
      <div className="w-full max-w-2xl flex justify-between items-center text-white px-4 py-3 bg-black/80 border-b border-neon-cyan/30 mb-8 rounded-b-lg">
        <div>
          {user ? (
            <span className="text-neon-green">{t('welcome')}, <span className="text-neon-cyan">{user.email}</span></span>
          ) : (
            <span className="text-gray-400">{t('guestMode')}</span>
          )}
        </div>
        <div className="flex gap-2">
          <LanguageToggle />
          {user ? (
            <button
              onClick={handleSignOut}
              className="px-3 py-1 text-sm bg-neon-red/80 hover:bg-neon-red border border-neon-red rounded transition-all duration-300 hover:shadow-neon-red"
            >
              {t('logout')}
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="px-3 py-1 text-sm bg-neon-cyan/20 hover:bg-neon-cyan/40 border border-neon-cyan rounded transition-all duration-300 hover:shadow-neon-cyan"
            >
              {t('login')}
            </button>
          )}
        </div>
      </div>

      <div className="relative px-4">
        {/* Game Header - show when playing, paused, gameover, or victory */}
        {(gameState === 'playing' || gameState === 'paused' || gameState === 'gameover' || gameState === 'victory') && (
          <div className="absolute -top-12 left-0 right-0 flex justify-between items-center text-white px-4 z-10 bg-black/80 border-b-2 border-neon-cyan/50 py-2">
            <div className="flex items-center gap-6">
              <span className="text-neon-yellow font-bold text-lg drop-shadow-[0_0_5px_#ffff00]">SCORE: {score}</span>
              <span className="text-neon-cyan font-bold text-lg drop-shadow-[0_0_5px_#00ffff]">LEVEL: {level}</span>
            </div>
            <div className="flex items-center gap-4">
              {gameMode === GameMode.MULTIPLAYER ? (
                <div className="flex items-center gap-4">
                  <span className="text-neon-green font-bold drop-shadow-[0_0_5px_#00ff00]">P1: {playerLives.player1 === 0 ? '☠️' : '❤️'.repeat(playerLives.player1)}</span>
                  <span className="text-neon-yellow font-bold drop-shadow-[0_0_5px_#ffff00]">P2: {playerLives.player2 === 0 ? '☠️' : '❤️'.repeat(playerLives.player2)}</span>
                </div>
              ) : (
                <span className="text-neon-red font-bold drop-shadow-[0_0_5px_#ff0000]">LIVES: {lives === 0 ? '☠️' : '❤️'.repeat(lives)}</span>
              )}
            </div>
          </div>
        )}

        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="border-4 border-neon-cyan/60 bg-black shadow-[0_0_15px_rgba(0,255,255,0.3)]"
          style={{ maxWidth: '100%', height: 'auto' }}
        />

        {/* Menu Overlay */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
            <h1 className="text-5xl font-bold text-neon-yellow mb-8 drop-shadow-[0_0_10px_#ffff00,0_0_20px_#ff0000]" style={{ textShadow: '0 0 10px #ffff00, 0 0 20px #ff0000, 0 0 30px #ff0000' }}>
              {t('tankBattle')}
            </h1>
            <p className="text-neon-cyan/80 mb-2">{t('controls')}</p>
            <p className="text-neon-cyan/80 mb-2">{t('controls2')}</p>
            <p className="text-neon-magenta/80 mb-6 text-sm">
              {t('multiplayerControls') || '双人模式: 玩家1(WASD+空格) 玩家2(方向键+0)'}
            </p>

            {/* Left-Right Layout */}
            <div className="flex gap-6 items-start">
              {/* Left Column - Map, Single, Multiplayer */}
              <div className="flex flex-col gap-3 w-44">
                {/* Map Selection */}
                <div className="flex flex-col gap-1">
                  <p className="text-neon-cyan/80 text-center text-xs">{t('selectMap')}:</p>
                  <select
                    onChange={(e) => {
                      if (e.target.value === 'default') {
                        setSelectedMap(null)
                      } else {
                        const map = customMaps.find(m => m.id === e.target.value)
                        setSelectedMap(map || null)
                      }
                    }}
                    className="px-2 py-1.5 bg-black/80 text-white rounded border border-neon-cyan/50 focus:border-neon-cyan focus:outline-none transition-colors text-sm w-full"
                    value={selectedMap?.id || 'default'}
                  >
                    <option value="default">{t('defaultMap')}</option>
                    {customMaps.map(map => (
                      <option key={map.id} value={map.id}>{map.name}</option>
                    ))}
                  </select>
                </div>

                {/* Single Player Mode */}
                <button
                  onClick={() => startGame(selectedMap || undefined, GameMode.SINGLE)}
                  className="px-3 py-2 bg-neon-green/20 hover:bg-neon-green/40 border border-neon-green text-neon-green font-bold rounded text-sm transition-all duration-300 hover:shadow-neon-green whitespace-nowrap"
                >
                  {t('singlePlayer')}
                </button>

                {/* Multiplayer Mode */}
                <button
                  onClick={() => startGame(selectedMap || undefined, GameMode.MULTIPLAYER)}
                  className="px-3 py-2 bg-neon-yellow/20 hover:bg-neon-yellow/40 border border-neon-yellow text-neon-yellow font-bold rounded text-sm transition-all duration-300 hover:shadow-neon-yellow whitespace-nowrap"
                >
                  {t('multiplayer')}
                </button>
              </div>

              {/* Right Column - Endless on top, Custom Maps and Leaderboard on bottom */}
              <div className="flex flex-col gap-3 w-52">
                {/* Endless Mode - Top */}
                <button
                  onClick={() => startGame(selectedMap || undefined, GameMode.ENDLESS)}
                  className="px-3 py-2 bg-neon-orange/20 hover:bg-neon-orange/40 border border-neon-orange text-neon-orange font-bold rounded text-sm transition-all duration-300 hover:shadow-neon-orange whitespace-nowrap"
                >
                  {t('endlessMode')}
                </button>

                {/* Bottom row - Custom Maps and Leaderboard with icons */}
                <div className="flex gap-2">
                  {/* Custom Maps - Bottom Left */}
                  <button
                    onClick={goToCustomMaps}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-neon-purple/20 hover:bg-neon-purple/40 border border-neon-purple text-neon-purple font-bold rounded text-xs transition-all duration-300 hover:shadow-neon-purple whitespace-nowrap"
                  >
                    <span>🗺️</span>
                    <span>{t('customMaps')}</span>
                  </button>

                  {/* Leaderboard - Bottom Right */}
                  <button
                    onClick={goToLeaderboard}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-neon-magenta/20 hover:bg-neon-magenta/40 border border-neon-magenta text-neon-magenta font-bold rounded text-xs transition-all duration-300 hover:shadow-neon-magenta whitespace-nowrap"
                  >
                    <span>🏆</span>
                    <span>{t('leaderboard')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pause Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
            <h1 className="text-4xl font-bold text-neon-cyan mb-8 drop-shadow-[0_0_10px_#00ffff]">{t('paused')}</h1>
            <div className="flex flex-col gap-4">
              <button
                onClick={resumeGame}
                className="px-8 py-3 bg-neon-green/20 hover:bg-neon-green/40 border-2 border-neon-green text-neon-green font-bold rounded text-xl transition-all duration-300 hover:shadow-neon-green"
              >
                {t('resumeGame')}
              </button>
              <button
                onClick={goToMainMenu}
                className="px-8 py-3 bg-gray-800/50 hover:bg-gray-700/50 border-2 border-gray-600 text-gray-300 font-bold rounded text-xl transition-all duration-300"
              >
                {t('returnToMenu')}
              </button>
            </div>
            <p className="text-gray-400 mt-4">{t('pressPToResume')}</p>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
            <h1 className="text-4xl font-bold text-neon-red mb-4 drop-shadow-[0_0_10px_#ff0000]">{t('gameOver')}</h1>
            <p className="text-white mb-2">{t('finalScore')}: <span className="text-neon-yellow">{score}</span></p>
            <p className="text-neon-cyan/70 mb-8">{t('reachedLevel')}: {level}</p>
            <div className="flex flex-col gap-4">
              <button
                onClick={restartGame}
                className="px-8 py-3 bg-neon-green/20 hover:bg-neon-green/40 border-2 border-neon-green text-neon-green font-bold rounded text-xl transition-all duration-300 hover:shadow-neon-green"
              >
                {t('restart')}
              </button>
              <button
                onClick={goToMainMenu}
                className="px-8 py-3 bg-gray-800/50 hover:bg-gray-700/50 border-2 border-gray-600 text-gray-300 font-bold rounded text-xl transition-all duration-300"
              >
                {t('returnToMenu')}
              </button>
            </div>
          </div>
        )}

        {/* Victory Overlay */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90">
            <h1 className="text-4xl font-bold text-neon-yellow mb-4 drop-shadow-[0_0_10px_#ffff00,0_0_20px_#ffff00]">{t('victory')}</h1>
            <p className="text-white mb-2">{t('finalScore')}: <span className="text-neon-yellow">{score}</span></p>
            <div className="flex flex-col gap-4">
              <button
                onClick={restartGame}
                className="px-8 py-3 bg-neon-green/20 hover:bg-neon-green/40 border-2 border-neon-green text-neon-green font-bold rounded text-xl transition-all duration-300 hover:shadow-neon-green"
              >
                {t('playAgain')}
              </button>
              <button
                onClick={goToMainMenu}
                className="px-8 py-3 bg-gray-800/50 hover:bg-gray-700/50 border-2 border-gray-600 text-gray-300 font-bold rounded text-xl transition-all duration-300"
              >
                {t('returnToMenu')}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
