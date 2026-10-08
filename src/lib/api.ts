import type { SearchDraft, SearchResponse } from './types.ts'

export async function searchTrademarks(draft: SearchDraft, page: number): Promise<SearchResponse> {
  let response: Response
  try {
    response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...draft, page }),
    })
  } catch {
    throw new Error('无法连接查询服务。请确认本机服务已启动，然后重试。')
  }
  const payload = (await response.json().catch(() => null)) as { message?: string } | SearchResponse | null
  if (!response.ok) {
    const message =
      payload && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : '查询失败，请稍后重试。'
    throw new Error(message)
  }
  return payload as SearchResponse
}
