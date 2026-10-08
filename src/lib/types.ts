export type StatusFilter = 'all' | 'live' | 'dead'
export type SortMode = 'relevance' | 'filed'

export type SearchDraft = {
  keyword: string
  owner: string
  classCode: string
  serial: string
  registration: string
  status: StatusFilter
  sort: SortMode
}

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

export type SearchResponse = {
  total: number
  totalRelation: string
  page: number
  pageSize: number
  took: number
  sort: SortMode
  windowLimited: boolean
  summary: string
  hits: TrademarkRecord[]
}

export const emptyDraft = (): SearchDraft => ({
  keyword: '',
  owner: '',
  classCode: '',
  serial: '',
  registration: '',
  status: 'all',
  sort: 'relevance',
})
