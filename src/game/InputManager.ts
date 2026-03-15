import { Direction } from './types'

export class InputManager {
  private keys: Set<string> = new Set()
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void

  constructor() {
    this.boundKeyDown = this.handleKeyDown.bind(this)
    this.boundKeyUp = this.handleKeyUp.bind(this)
    this.bindEvents()
  }

  private bindEvents() {
    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keyup', this.boundKeyUp)
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Prevent default for game keys
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'p', 'P']
    if (gameKeys.includes(e.key)) {
      e.preventDefault()
    }
    // Store both lowercase and original
    this.keys.add(e.key.toLowerCase())
    this.keys.add(e.key)
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase())
    this.keys.delete(e.key)
  }

  // Check if pause key is pressed
  isPausePressed(): boolean {
    return this.keys.has('p') || this.keys.has('P')
  }

  // Check if a key is pressed
  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase()) || this.keys.has(key) || this.keys.has(key.toUpperCase())
  }

  // Get movement direction from keyboard
  getMovementDirection(): Direction | null {
    const dir = this.isKeyPressed('w') || this.isKeyPressed('W') || this.isKeyPressed('arrowup')
      ? Direction.UP
      : this.isKeyPressed('s') || this.isKeyPressed('S') || this.isKeyPressed('arrowdown')
        ? Direction.DOWN
        : this.isKeyPressed('a') || this.isKeyPressed('A') || this.isKeyPressed('arrowleft')
          ? Direction.LEFT
          : this.isKeyPressed('d') || this.isKeyPressed('D') || this.isKeyPressed('arrowright')
            ? Direction.RIGHT
            : null

    return dir
  }

  // Check if fire key is pressed
  isFiring(): boolean {
    return this.keys.has(' ') || this.keys.has('space') || this.keys.has('spacebar')
  }

  // Get all currently pressed keys (for debugging)
  getPressedKeys(): Set<string> {
    return new Set(this.keys)
  }

  destroy() {
    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keyup', this.boundKeyUp)
    this.keys.clear()
  }
}
