import type { SearchDraft } from './types.ts'

const KEY = 'tm-search-history-v1'
const MAX = 8

export type HistoryEntry = {
  id: string
  at: number
  draft: SearchDraft
  label: string
}

export function historyLabel(draft: SearchDraft): string {
  const parts = [
    draft.keyword,
    draft.owner && `权利人 ${draft.owner}`,
    draft.classCode && `第${draft.classCode.replace(/\D/g, '')}类`,
    draft.serial && `申请号 ${draft.serial}`,
    draft.registration && `注册号 ${draft.registration}`,
    draft.status === 'live' ? '有效' : draft.status === 'dead' ? '失效' : '',
  ].filter(Boolean)
  return parts.join(' · ') || '未命名查询'
}

export function readHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item.label === 'string' && item.draft)
  } catch {
    return []
  }
}

export function rememberHistory(draft: SearchDraft): HistoryEntry[] {
  const label = historyLabel(draft)
  const next: HistoryEntry = { id: `${Date.now()}`, at: Date.now(), draft, label }
  const existing = readHistory().filter((item) => item.label !== label)
  const saved = [next, ...existing].slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    /* ignore quota */
  }
  return saved
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
