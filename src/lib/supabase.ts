import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Types
export interface DbUser {
  id: string
  email: string
  username: string | null
  avatar: string | null
  role: string
  status: string
  created_at: string
  updated_at: string
}

export interface DbCustomMap {
  id: string
  user_id: string
  name: string
  width: number
  height: number
  tiles: any
  player_spawn: { x: number; y: number }
  base_position: { x: number; y: number }
  enemy_spawns: { x: number; y: number }[]
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface DbLeaderboard {
  id: string
  user_id: string | null
  score: number
  levels_completed: number
  map_id: string | null
  map_name: string | null
  ip_address: string | null
  country: string | null
  country_name: string | null
  created_at: string
  username?: string
  avatar?: string
}

// Convert database custom map to frontend format
export function convertDbCustomMap(dbMap: DbCustomMap) {
  return {
    id: dbMap.id,
    name: dbMap.name,
    width: dbMap.width,
    height: dbMap.height,
    tiles: dbMap.tiles,
    playerSpawn: dbMap.player_spawn,
    basePosition: dbMap.base_position,
    enemySpawns: dbMap.enemy_spawns,
  }
}
