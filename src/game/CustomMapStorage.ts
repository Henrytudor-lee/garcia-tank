import { CustomMap, CustomLevel } from '../game/types'

const CUSTOM_MAPS_KEY = 'customMaps'
const CUSTOM_LEVELS_KEY = 'customLevels'

export class CustomMapStorage {
  // Get all custom maps
  static getMaps(): CustomMap[] {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(CUSTOM_MAPS_KEY)
    return stored ? JSON.parse(stored) : []
  }

  // Save a custom map
  static saveMap(map: CustomMap): void {
    const maps = this.getMaps()
    const existingIndex = maps.findIndex(m => m.id === map.id)

    if (existingIndex >= 0) {
      maps[existingIndex] = map
    } else {
      maps.push(map)
    }

    localStorage.setItem(CUSTOM_MAPS_KEY, JSON.stringify(maps))
  }

  // Delete a custom map
  static deleteMap(mapId: string): void {
    const maps = this.getMaps().filter(m => m.id !== mapId)
    localStorage.setItem(CUSTOM_MAPS_KEY, JSON.stringify(maps))
  }

  // Get a single map by ID
  static getMapById(mapId: string): CustomMap | null {
    const maps = this.getMaps()
    return maps.find(m => m.id === mapId) || null
  }

  // Get all custom levels
  static getLevels(): CustomLevel[] {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(CUSTOM_LEVELS_KEY)
    return stored ? JSON.parse(stored) : []
  }

  // Save a custom level
  static saveLevel(level: CustomLevel): void {
    const levels = this.getLevels()
    const existingIndex = levels.findIndex(l => l.id === level.id)

    if (existingIndex >= 0) {
      levels[existingIndex] = level
    } else {
      levels.push(level)
    }

    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(levels))
  }

  // Delete a custom level
  static deleteLevel(levelId: string): void {
    const levels = this.getLevels().filter(l => l.id !== levelId)
    localStorage.setItem(CUSTOM_LEVELS_KEY, JSON.stringify(levels))
  }

  // Generate a unique ID
  static generateId(): string {
    return `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
