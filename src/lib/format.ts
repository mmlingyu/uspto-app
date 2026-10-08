import { NICE_CLASSES } from './nice.ts'

const MARK_TYPES: Record<string, string> = {
  TRADEMARK: '商标',
  'SERVICE MARK': '服务商标',
  'COLLECTIVE MARK': '集体商标',
  'CERTIFICATION MARK': '证明商标',
  'COLLECTIVE MEMBERSHIP MARK': '集体成员商标',
}

const BASIS: Record<string, string> = {
  '1a': '实际使用（1(a)）',
  '1b': '意图使用（1(b)）',
  '44d': '外国申请（44(d)）',
  '44e': '外国注册（44(e)）',
  '66a': '马德里议定书（66(a)）',
}

const DRAWINGS: Record<number, string> = {
  1: '打字图样',
  2: '纯图形',
  3: '图形加文字、字母或数字',
  4: '标准字符',
}

const REGISTER: Record<string, string> = {
  PRINCIPAL: '主注册簿',
  SUPPLEMENTAL: '副注册簿',
}

const ENTITIES: Record<string, string> = {
  INDIVIDUAL: '个人',
  CORPORATION: '公司',
  OTHER: '其他',
}

export function formatDay(value: string | null): string {
  if (!value) return '—'
  const day = value.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : value
}

export function formatClasses(values: string[]): string {
  if (values.length === 0) return '—'
  return values
    .map((value) => {
      const match = value.match(/\d+/)
      if (!match) return value
      const number = Number(match[0])
      const name = NICE_CLASSES[number]
      return name ? `第${number}类 ${name}` : value
    })
    .join('、')
}

export function joinText(values: string[]): string {
  return values.length > 0 ? values.join('、') : '—'
}

export function formatMarkTypes(values: string[]): string {
  if (values.length === 0) return '—'
  return values.map((value) => MARK_TYPES[value.toUpperCase()] ?? value).join('、')
}

export function formatBasis(values: string[]): string {
  if (values.length === 0) return '—'
  return values.map((value) => BASIS[value.toLowerCase()] ?? value).join('、')
}

export function formatDrawing(code: number | null, description: string | null): string {
  const known = code != null ? DRAWINGS[code] : undefined
  if (known && description) return `${known}（${description}）`
  if (known) return known
  return description ?? '—'
}

export function formatRegister(values: string[]): string {
  if (values.length === 0) return '—'
  return values.map((value) => REGISTER[value.toUpperCase()] ?? value).join('、')
}

export function formatEntity(value: string | null): string {
  if (!value) return '—'
  return ENTITIES[value.toUpperCase()] ?? value
}

export function snippet(value: string, max = 140): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max)}…`
}

export function formatTotal(total: number, relation: string): string {
  const text = total.toLocaleString('zh-CN')
  return relation === 'gte' ? `至少 ${text}` : text
}
