export class Throttler {
  private static instance: Throttler
  private queue: (() => void)[] = []
  private processing = false
  private intervalMs: number

  private constructor(intervalMs: number) {
    this.intervalMs = intervalMs
  }

  static getInstance(intervalMs: number = 500): Throttler {
    if (!Throttler.instance) {
      Throttler.instance = new Throttler(intervalMs)
    }
    return Throttler.instance
  }

  /**
   * Run a function with rate limiting.
   */
  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (e) {
          reject(e)
        }
      })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const task = this.queue.shift()
      if (task) {
        task() // Trigger the task, don't wait for completion to maintain rate
        await new Promise(r => setTimeout(r, this.intervalMs))
      }
    }

    this.processing = false
  }
}
