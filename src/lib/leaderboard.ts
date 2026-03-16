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

// Add score to leaderboard
export async function addScore(
  score: number,
  levelsCompleted: number,
  options: {
    userId?: string
    mapId?: string
    mapName?: string
    ipAddress?: string
    country?: string
    countryName?: string
  }
): Promise<boolean> {
  console.log('addScore - userId:', options.userId)

  // Use the provided userId directly (trusted from login)
  const userIdToUse = options.userId || null

  const { error } = await supabase
    .from('leaderboard')
    .insert({
      user_id: userIdToUse,
      score,
      levels_completed: levelsCompleted,
      map_id: options.mapId || null,
      map_name: options.mapName || '默认地图',
      ip_address: options.ipAddress || null,
      country: options.country || null,
      country_name: options.countryName || null,
    })

  if (error) {
    console.error('Error adding score to database:', error)
    return false
  }

  console.log('Score saved to database successfully')
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
