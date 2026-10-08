import { ApiError } from './errors.ts'

export const PAGE_SIZE = 20
export const MAX_WINDOW = 10_000
export const SEARCH_GAP_MS = 800

export const SOURCE_FIELDS = [
  'id',
  'wordmark',
  'wordmarkPseudoText',
  'alive',
  'registered',
  'registrationId',
  'internationalClass',
  'filedDate',
  'registrationDate',
  'statusCode',
  'statusDescription',
  'ownerName',
  'ownerFullText',
  'ownerCity',
  'ownerStateCountryAddress',
  'ownerType',
  'ownerEntity',
  'goodsAndServices',
  'markType',
  'attorney',
  'abandonDate',
  'cancelDate',
  'drawingCode',
  'drawingCodeDescription',
  'markDescription',
  'standardCharacterClaim',
  'registrationType',
  'publishForOppositionDate',
  'currentBasis',
  'originalBasis',
  'firstUseAnyDate',
  'firstUseCommerceDate',
  'priorityDate',
  'renewalDate',
  'disclaimer',
  'designCodeDescription',
  'usClass',
  'assignmentRecorded',
] as const

export type StatusFilter = 'all' | 'live' | 'dead'
export type SortMode = 'relevance' | 'filed'

export type SearchInput = {
  keyword: string
  owner: string
  classCode: string
  serial: string
  registration: string
  status: StatusFilter
  sort: SortMode
  page: number
}

export type BuiltQuery = {
  body: Record<string, unknown>
  page: number
  pageSize: number
  sort: SortMode
  summary: string
}

function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function digits(value: string): string {
  return value.replace(/\D/g, '')
}

function normalizeClass(value: string): string | null {
  if (!value) return null
  const match = value.match(/\d+/)
  if (!match) {
    throw new ApiError(400, 'bad_request', '国际分类请填写 1 到 45 的数字，例如 9 或 25。')
  }
  const number = Number(match[0])
  if (!Number.isInteger(number) || number < 1 || number > 45) {
    throw new ApiError(400, 'bad_request', '国际分类请填写 1 到 45 的数字，例如 9 或 25。')
  }
  return String(number).padStart(3, '0')
}

export function parseSearchInput(raw: unknown): SearchInput {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError(400, 'bad_request', '请求格式不正确。')
  }
  const body = raw as Record<string, unknown>
  const status = body.status
  const sort = body.sort
  const pageNumber = Number(body.page ?? 1)
  if (status !== 'all' && status !== 'live' && status !== 'dead') {
    throw new ApiError(400, 'bad_request', '状态只能是全部、有效或失效。')
  }
  if (sort !== 'relevance' && sort !== 'filed') {
    throw new ApiError(400, 'bad_request', '排序方式不正确。')
  }
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 500) {
    throw new ApiError(400, 'bad_request', '页码不正确。')
  }
  const input: SearchInput = {
    keyword: clean(body.keyword, 80),
    owner: clean(body.owner, 120),
    classCode: clean(body.classCode, 12),
    serial: digits(clean(body.serial, 24)),
    registration: digits(clean(body.registration, 24)),
    status,
    sort,
    page: pageNumber,
  }
  if (input.serial && (input.serial.length < 7 || input.serial.length > 8)) {
    throw new ApiError(400, 'bad_request', '申请号应为 7 到 8 位数字。')
  }
  if (input.registration && (input.registration.length < 5 || input.registration.length > 8)) {
    throw new ApiError(400, 'bad_request', '注册号应为 5 到 8 位数字。有前导零时请保留。')
  }
  return input
}

export function buildSearchBody(input: SearchInput): BuiltQuery {
  const classCode = normalizeClass(input.classCode)
  const must: Record<string, unknown>[] = []
  const filter: Record<string, unknown>[] = []

  if (input.keyword) {
    must.push({
      match: {
        wordmark: {
          query: input.keyword,
          operator: 'and',
        },
      },
    })
  }
  if (input.owner) {
    must.push({ match_phrase: { ownerName: input.owner } })
  }
  if (input.serial) filter.push({ term: { id: input.serial } })
  if (input.registration) filter.push({ term: { registrationId: input.registration } })
  if (classCode) filter.push({ term: { internationalClass: classCode } })
  if (input.status === 'live') filter.push({ term: { alive: true } })
  if (input.status === 'dead') filter.push({ term: { alive: false } })

  if (must.length === 0 && filter.length === 0) {
    throw new ApiError(
      400,
      'bad_request',
      '请至少填写商标文字、权利人、国际分类、申请号或注册号中的一项。仅选择有效或失效不会发起查询。',
    )
  }

  const from = (input.page - 1) * PAGE_SIZE
  if (from + PAGE_SIZE > MAX_WINDOW) {
    throw new ApiError(
      400,
      'window',
      'USPTO 接口最多返回前 10,000 条。请用分类、状态或权利人缩小范围，或回到前面的页。',
    )
  }

  const sort: SortMode = input.sort === 'filed' || !input.keyword ? 'filed' : 'relevance'
  const bool: Record<string, unknown> = {}
  if (must.length > 0) bool.must = must
  if (filter.length > 0) bool.filter = filter

  const body: Record<string, unknown> = {
    query: { bool },
    from,
    size: PAGE_SIZE,
    track_total_hits: true,
    _source: SOURCE_FIELDS,
  }
  if (sort === 'filed') body.sort = [{ filedDate: 'desc' }]

  const summary = [
    input.keyword && `文字“${input.keyword}”`,
    input.owner && `权利人“${input.owner}”`,
    classCode && `第${Number(classCode)}类`,
    input.serial && `申请号 ${input.serial}`,
    input.registration && `注册号 ${input.registration}`,
    input.status === 'live' ? '有效' : input.status === 'dead' ? '失效' : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return { body, page: input.page, pageSize: PAGE_SIZE, sort, summary }
}
