export class ScoreSystem {
  private score: number = 0
  private lives: number = 3
  private highScore: number = 0

  constructor() {
    // Load high score from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tankGameHighScore')
      if (saved) {
        this.highScore = parseInt(saved, 10)
      }
    }
  }

  // Add score
  addScore(points: number) {
    this.score += points
    if (this.score > this.highScore) {
      this.highScore = this.score
      this.saveHighScore()
    }
  }

  // Get current score
  getScore(): number {
    return this.score
  }

  // Set score (for game loading)
  setScore(score: number) {
    this.score = score
  }

  // Get high score
  getHighScore(): number {
    return this.highScore
  }

  // Lose a life
  loseLife(): number {
    this.lives = Math.max(0, this.lives - 1)
    return this.lives
  }

  // Get remaining lives
  getLives(): number {
    return this.lives
  }

  // Set lives
  setLives(lives: number) {
    this.lives = lives
  }

  // Reset for new game
  reset() {
    this.score = 0
    this.lives = GAME_CONFIG?.PLAYER_LIVES || 3
  }

  // Save high score to localStorage
  private saveHighScore() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tankGameHighScore', this.highScore.toString())
    }
  }

  destroy() {
    // Nothing to clean up
  }
}

// Import for default lives value
import { GAME_CONFIG } from '@/src/config/gameConfig'
