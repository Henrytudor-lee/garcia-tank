export type UpdateCallback = (deltaTime: number) => void
export type RenderCallback = () => void

export class GameLoop {
  private running: boolean = false
  private lastTime: number = 0
  private animationFrameId: number | null = null
  private updateCallbacks: UpdateCallback[] = []
  private renderCallbacks: RenderCallback[] = []
  private targetFPS: number = 60
  private frameInterval: number = 1000 / 60

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS
    this.frameInterval = 1000 / targetFPS
  }

  // Start the game loop
  start() {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    console.log('GameLoop: Starting')
    this.tick()
  }

  // Stop the game loop
  stop() {
    this.running = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  // Main game loop
  private tick = () => {
    if (!this.running) return

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime

    // Cap delta time to prevent huge jumps
    const cappedDelta = Math.min(deltaTime, 100)

    // Only update if enough time has passed for target FPS
    if (deltaTime >= this.frameInterval - 1) {
      // Update game state
      this.update(cappedDelta)

      // Render
      this.render()

      this.lastTime = currentTime - (deltaTime % this.frameInterval)
    }

    this.animationFrameId = requestAnimationFrame(this.tick)
  }

  // Update all registered callbacks
  private update(deltaTime: number) {
    console.log('GameLoop: Updating with deltaTime:', deltaTime)
    for (const callback of this.updateCallbacks) {
      callback(deltaTime)
    }
  }

  // Render all registered callbacks
  private render() {
    for (const callback of this.renderCallbacks) {
      callback()
    }
  }

  // Register update callback
  onUpdate(callback: UpdateCallback) {
    this.updateCallbacks.push(callback)
  }

  // Register render callback
  onRender(callback: RenderCallback) {
    this.renderCallbacks.push(callback)
  }

  // Remove update callback
  removeUpdate(callback: UpdateCallback) {
    const index = this.updateCallbacks.indexOf(callback)
    if (index > -1) {
      this.updateCallbacks.splice(index, 1)
    }
  }

  // Remove render callback
  removeRender(callback: RenderCallback) {
    const index = this.renderCallbacks.indexOf(callback)
    if (index > -1) {
      this.renderCallbacks.splice(index, 1)
    }
  }

  // Check if loop is running
  isRunning(): boolean {
    return this.running
  }

  // Destroy the game loop
  destroy() {
    this.stop()
    this.updateCallbacks = []
    this.renderCallbacks = []
  }
}
