import { ApiError, sleep } from './errors.ts'

/** Spaces out upstream calls. Node is single-threaded, so the waiting check is race-free. */
export class RequestGate {
  private tail: Promise<void> = Promise.resolve()
  private waiting = 0
  private lastStarted = 0
  private readonly gapMs: number
  private readonly maxWaiting: number
  private readonly limitedMessage: string

  constructor(gapMs: number, maxWaiting: number, limitedMessage: string) {
    this.gapMs = gapMs
    this.maxWaiting = maxWaiting
    this.limitedMessage = limitedMessage
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.waiting >= this.maxWaiting) {
      throw new ApiError(429, 'rate_limit', this.limitedMessage)
    }
    this.waiting += 1
    const previous = this.tail
    let release = (): void => {}
    this.tail = new Promise<void>((resolve) => {
      release = resolve
    })
    try {
      await previous
      const delay = this.lastStarted + this.gapMs - Date.now()
      if (delay > 0) await sleep(delay)
      this.lastStarted = Date.now()
      release()
      return await task()
    } finally {
      release()
      this.waiting -= 1
    }
  }
}
