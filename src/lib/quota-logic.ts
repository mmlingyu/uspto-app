export const DAILY_LIMIT = 5

export type QuotaSlot = {
  present: boolean
  valid: boolean
  day: string
  count: number
  unlocked: boolean
}

export type QuotaSnapshot = {
  count: number
  unlocked: boolean
  tampered: boolean
}

export function todayKey(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function mergeQuota(today: string, slots: QuotaSlot[]): QuotaSnapshot {
  const valid = slots.filter((slot) => slot.present && slot.valid)
  const corrupt = slots.some((slot) => slot.present && !slot.valid)
  if (valid.length === 0) {
    return { count: corrupt ? DAILY_LIMIT : 0, unlocked: false, tampered: corrupt }
  }
  const unlocked = valid.some((slot) => slot.unlocked)
  const counts = valid.filter((slot) => slot.day === today).map((slot) => slot.count)
  const count = counts.length === 0 ? 0 : Math.max(...counts)
  return {
    count: Math.min(DAILY_LIMIT, Math.max(0, Math.floor(count))),
    unlocked,
    tampered: false,
  }
}

export function remainingOf(snapshot: QuotaSnapshot): number | null {
  if (snapshot.unlocked) return null
  return Math.max(0, DAILY_LIMIT - snapshot.count)
}

export function limitMessage(): string {
  return `今日免费查询次数已用完（${DAILY_LIMIT}/${DAILY_LIMIT}），明天再来`
}
