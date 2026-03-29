import { supabase, DbLeaderboard } from './supabase'

// Get top leaderboard entries
export async function getLeaderboard(limit: number = 10): Promise<DbLeaderboard[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }

  return data || []
}

// Get leaderboard filtered by map
export async function getLeaderboardByMap(mapId: string, limit: number = 10): Promise<DbLeaderboard[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('map_id', mapId)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching leaderboard by map:', error)
    return []
  }

  return data || []
}

// Add score to leaderboard - 使用 API 路由（更安全）
export async function addScore(
  score: number,
  levelsCompleted: number,
  options: {
    userId?: string
    email?: string
    mapId?: string
    mapName?: string
    gameMode?: 'single' | 'multiplayer' | 'endless'
  }
): Promise<boolean> {
  // Don't save if score is 0 or negative
  if (score <= 0) {
    console.log('Score is 0, not saving to leaderboard')
    return false
  }

  console.log('addScore - userId:', options.userId, 'email:', options.email, 'gameMode:', options.gameMode)

  // 优先使用 API 路由（更安全）
  try {
    const response = await fetch('/api/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        score,
        levelsCompleted,
        userId: options.userId,
        email: options.email,
        mapId: options.mapId,
        mapName: options.mapName,
        gameMode: options.gameMode,
      }),
    })

    if (response.ok) {
      console.log('Score saved via API successfully')
      return true
    }

    const errorData = await response.json()
    console.error('API error:', errorData.error)

    // 如果是配置错误（service key 未配置），降级到直接 Supabase 调用
    if (response.status === 500 && errorData.error === 'Server configuration error') {
      console.log('Falling back to direct Supabase insert')
      return await addScoreDirect(score, levelsCompleted, options)
    }

    return false
  } catch (error) {
    console.error('API call failed, falling back to direct Supabase:', error)
    return await addScoreDirect(score, levelsCompleted, options)
  }
}

// 直接写入数据库（降级方案，风险更高）
async function addScoreDirect(
  score: number,
  levelsCompleted: number,
  options: {
    userId?: string
    email?: string
    mapId?: string
    mapName?: string
    gameMode?: 'single' | 'multiplayer' | 'endless'
  }
): Promise<boolean> {
  const userIdToUse = options.userId || null

  const { error } = await supabase
    .from('leaderboard')
    .insert({
      user_id: userIdToUse,
      email: options.email || null,
      score,
      levels_completed: levelsCompleted,
      map_id: options.mapId || null,
      map_name: options.mapName || '默认地图',
      game_mode: options.gameMode || 'single',
    })

  if (error) {
    console.error('Error adding score to database:', error)
    return false
  }

  console.log('Score saved to database successfully (direct)')
  return true
}

// Get user's best score
export async function getUserBestScore(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('score')
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return null
  }

  return data?.score || null
}

// Get user's rank
export async function getUserRank(userId: string): Promise<number | null> {
  // Count how many users have higher score than this user
  const { data: userScore } = await supabase
    .from('leaderboard')
    .select('score')
    .eq('user_id', userId)
    .order('score', { ascending: false })
    .limit(1)
    .single()

  if (!userScore) return null

  const { count } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .gt('score', userScore.score)

  return (count || 0) + 1
}
