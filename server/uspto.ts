import { ApiError } from './errors.ts'
import { buildSearchBody, type SearchInput } from './query.ts'

const DEFAULT_ENDPOINT = 'https://tmsearch.uspto.gov/prod-stage-v1-0-0/tmsearch'
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

export type TrademarkRecord = {
  serial: string
  wordmark: string | null
  wordmarkPseudo: string | null
  alive: boolean | null
  registered: boolean | null
  registrationNumber: string | null
  internationalClass: string[]
  filedDate: string | null
  registrationDate: string | null
  statusCode: number | null
  statusDescription: string | null
  owners: string[]
  ownerFullText: string[]
  ownerCity: string | null
  ownerAddress: string | null
  ownerType: string | null
  ownerEntity: string | null
  goodsAndServices: string[]
  markTypes: string[]
  attorney: string | null
  abandonDate: string | null
  cancelDate: string | null
  drawingCode: number | null
  drawingDescription: string | null
  markDescription: string[]
  standardCharacter: boolean | null
  registrationType: string[]
  publishDate: string | null
  currentBasis: string[]
  originalBasis: string[]
  firstUseAny: string | null
  firstUseCommerce: string | null
  priorityDate: string | null
  renewalDate: string | null
  disclaimer: string | null
  designDescriptions: string[]
  usClass: string[]
  assignmentRecorded: boolean | null
  tsdrUrl: string
}

export type SearchResult = {
  total: number
  totalRelation: string
  page: number
  pageSize: number
  took: number
  sort: 'relevance' | 'filed'
  windowLimited: boolean
  summary: string
  hits: TrademarkRecord[]
}

type EsHit = { id?: string; source?: Record<string, unknown> }
type EsResponse = {
  took?: number
  hits?: { totalValue?: number; totalRelation?: string; hits?: EsHit[] }
  error?: unknown
  message?: unknown
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(asText).filter((item): item is string => Boolean(item))
  }
  const single = asText(value)
  return single ? [single] : []
}

function asBool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function asInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value)
  return null
}

export function tsdrUrl(serial: string): string {
  const params = new URLSearchParams({
    caseNumber: serial,
    caseType: 'SERIAL_NO',
    searchType: 'statusSearch',
  })
  return `https://tsdr.uspto.gov/#${params.toString()}`
}

function normalizeHit(hit: EsHit): TrademarkRecord | null {
  const source = hit.source ?? {}
  const serial = asText(source.id) ?? asText(hit.id)
  if (!serial) return null
  return {
    serial,
    wordmark: asText(source.wordmark),
    wordmarkPseudo: asText(source.wordmarkPseudoText),
    alive: asBool(source.alive),
    registered: asBool(source.registered),
    registrationNumber: asText(source.registrationId),
    internationalClass: asList(source.internationalClass),
    filedDate: asText(source.filedDate),
    registrationDate: asText(source.registrationDate),
    statusCode: asInt(source.statusCode),
    statusDescription: asText(source.statusDescription),
    owners: asList(source.ownerName),
    ownerFullText: asList(source.ownerFullText),
    ownerCity: asText(source.ownerCity),
    ownerAddress: asText(source.ownerStateCountryAddress),
    ownerType: asText(source.ownerType),
    ownerEntity: asText(source.ownerEntity),
    goodsAndServices: asList(source.goodsAndServices),
    markTypes: asList(source.markType),
    attorney: asText(source.attorney),
    abandonDate: asText(source.abandonDate),
    cancelDate: asText(source.cancelDate),
    drawingCode: asInt(source.drawingCode),
    drawingDescription: asText(source.drawingCodeDescription),
    markDescription: asList(source.markDescription),
    standardCharacter: asBool(source.standardCharacterClaim),
    registrationType: asList(source.registrationType),
    publishDate: asText(source.publishForOppositionDate),
    currentBasis: asList(source.currentBasis),
    originalBasis: asList(source.originalBasis),
    firstUseAny: asText(source.firstUseAnyDate),
    firstUseCommerce: asText(source.firstUseCommerceDate),
    priorityDate: asText(source.priorityDate),
    renewalDate: asText(source.renewalDate),
    disclaimer: asText(source.disclaimer),
    designDescriptions: asList(source.designCodeDescription),
    usClass: asList(source.usClass),
    assignmentRecorded: asBool(source.assignmentRecorded),
    tsdrUrl: tsdrUrl(serial),
  }
}

function endpoint(): string {
  return process.env.TMSEARCH_URL?.trim() || DEFAULT_ENDPOINT
}

function upstreamHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
    Origin: 'https://tmsearch.uspto.gov',
    Referer: 'https://tmsearch.uspto.gov/search/search-results',
  }
  const token = process.env.TMSEARCH_WAF_TOKEN?.trim()
  if (token) headers.Cookie = `aws-waf-token=${token}`
  return headers
}

function upstreamFailure(status: number, payload: EsResponse | null, raw: string): ApiError {
  const errorText = typeof payload?.error === 'string' ? payload.error : raw.slice(0, 300)
  const lowered = `${errorText} ${raw}`.toLowerCase()
  if (status === 403 || status === 202 || lowered.includes('aws-waf') || lowered.includes('captcha') || lowered.includes('challenge.js')) {
    return new ApiError(
      503,
      'waf',
      'USPTO 的访问防护拦截了这次查询。当前接口通常不需要账号；若持续出现，说明防护已收紧。请稍后再试，不要连续重试。',
    )
  }
  if (status === 429) {
    return new ApiError(429, 'rate_limit', 'USPTO 暂时限制了查询频率。请等一会儿再查，不要连续翻页。')
  }
  if (errorText.includes('Result window is too large')) {
    return new ApiError(400, 'window', 'USPTO 接口最多返回前 10,000 条。请缩小查询范围。')
  }
  if (status >= 500) {
    return new ApiError(502, 'upstream', 'USPTO 检索服务暂时不可用，请稍后再试。')
  }
  if (status === 400) {
    return new ApiError(400, 'bad_query', 'USPTO 无法解析这次查询。请缩短商标文字或权利人后重试。')
  }
  return new ApiError(502, 'upstream', 'USPTO 返回了无法识别的结果，请稍后再试。')
}

export async function searchTrademarks(input: SearchInput): Promise<SearchResult> {
  const built = buildSearchBody(input)
  let response: Response
  try {
    response = await fetch(endpoint(), {
      method: 'POST',
      headers: upstreamHeaders(),
      body: JSON.stringify(built.body),
      signal: AbortSignal.timeout(25_000),
    })
  } catch {
    throw new ApiError(502, 'network', '连接 USPTO 失败。请检查网络后重试。')
  }

  const raw = await response.text()
  let payload: EsResponse | null = null
  try {
    payload = JSON.parse(raw) as EsResponse
  } catch {
    payload = null
  }
  if (!response.ok || !payload?.hits) {
    throw upstreamFailure(response.status, payload, raw)
  }

  const total = payload.hits.totalValue ?? 0
  const hits = (payload.hits.hits ?? [])
    .map(normalizeHit)
    .filter((hit): hit is TrademarkRecord => hit !== null)

  return {
    total,
    totalRelation: payload.hits.totalRelation ?? 'eq',
    page: built.page,
    pageSize: built.pageSize,
    took: payload.took ?? 0,
    sort: built.sort,
    windowLimited: total > 10_000,
    summary: built.summary,
    hits,
  }
}

const imageCache = new Map<string, { body: Uint8Array; type: string }>()

export async function fetchMarkImage(serial: string): Promise<{ body: Uint8Array; type: string } | null> {
  if (!/^\d{7,8}$/.test(serial)) {
    throw new ApiError(400, 'bad_request', '图样只接受 7 到 8 位申请号。')
  }
  const cached = imageCache.get(serial)
  if (cached) return cached

  let response: Response
  try {
    response = await fetch(`https://tsdr.uspto.gov/img/${serial}/large`, {
      headers: {
        Accept: 'image/png,image/jpeg,image/*',
        'User-Agent': USER_AGENT,
        Referer: 'https://tsdr.uspto.gov/',
      },
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    throw new ApiError(502, 'network', '商标图样暂时无法获取。')
  }
  if (response.status === 404) return null
  if (!response.ok) {
    throw new ApiError(502, 'upstream', '商标图样暂时无法获取。')
  }
  const type = response.headers.get('content-type') ?? 'image/png'
  if (!type.startsWith('image/')) return null
  const body = new Uint8Array(await response.arrayBuffer())
  if (imageCache.size > 80) {
    const oldest = imageCache.keys().next().value
    if (oldest) imageCache.delete(oldest)
  }
  imageCache.set(serial, { body, type })
  return { body, type }
}
