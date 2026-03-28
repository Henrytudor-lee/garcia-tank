import { supabase, DbCustomMap, convertDbCustomMap } from './supabase'
import type { CustomMap } from '../game/types'

// Get all custom maps
export async function getUserMaps(userId: string): Promise<CustomMap[]> {
  const { data, error } = await supabase
    .from('custom_maps')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user maps:', error)
    return []
  }

  return data.map(convertDbCustomMap)
}

// Get public custom maps
export async function getPublicMaps(): Promise<CustomMap[]> {
  const { data, error } = await supabase
    .from('custom_maps')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching public maps:', error)
    return []
  }

  return data.map(convertDbCustomMap)
}

// Get single map by ID
export async function getMapById(mapId: string): Promise<CustomMap | null> {
  const { data, error } = await supabase
    .from('custom_maps')
    .select('*')
    .eq('id', mapId)
    .single()

  if (error) {
    console.error('Error fetching map:', error)
    return null
  }

  return convertDbCustomMap(data)
}

// Save custom map
export async function saveCustomMap(userId: string, map: CustomMap, isPublic: boolean = false): Promise<string | null> {
  const { data, error } = await supabase
    .from('custom_maps')
    .insert({
      user_id: userId,
      name: map.name,
      width: map.width,
      height: map.height,
      tiles: map.tiles,
      player_spawn: map.playerSpawn,
      base_position: map.basePosition,
      enemy_spawns: map.enemySpawns,
      is_public: isPublic,
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error saving map:', error)
    return null
  }

  return data.id
}

// Update custom map
export async function updateCustomMap(mapId: string, userId: string, map: Partial<CustomMap>, isPublic?: boolean): Promise<boolean> {
  const updateData: any = {}

  if (map.name) updateData.name = map.name
  if (map.width) updateData.width = map.width
  if (map.height) updateData.height = map.height
  if (map.tiles) updateData.tiles = map.tiles
  if (map.playerSpawn) updateData.player_spawn = map.playerSpawn
  if (map.basePosition) updateData.base_position = map.basePosition
  if (map.enemySpawns) updateData.enemy_spawns = map.enemySpawns
  if (isPublic !== undefined) updateData.is_public = isPublic

  const { error } = await supabase
    .from('custom_maps')
    .update(updateData)
    .eq('id', mapId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating map:', error)
    return false
  }

  return true
}

// Delete custom map
export async function deleteCustomMap(mapId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('custom_maps')
    .delete()
    .eq('id', mapId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting map:', error)
    return false
  }

  return true
}
