import * as XLSX from 'xlsx'
import { formatClasses, formatDay } from './format.ts'
import { aliveLabel, translateStatus } from './status.ts'
import type { TrademarkRecord } from './types.ts'

const HEADERS = [
  '商标名称',
  '申请号',
  '注册号',
  '有效性',
  '状态',
  '状态代码',
  '状态原文',
  '申请人/权利人',
  '国际分类',
  '申请日',
  '注册日',
  '商品与服务',
  'TSDR',
]

function rows(hits: TrademarkRecord[]): string[][] {
  return hits.map((hit) => {
    const status = translateStatus(hit.statusCode, hit.statusDescription)
    return [
      hit.wordmark ?? '',
      hit.serial,
      hit.registrationNumber ?? '',
      aliveLabel(hit.alive),
      status.zh ?? '',
      hit.statusCode == null ? '' : String(hit.statusCode),
      status.en ?? '',
      hit.owners.join('；'),
      formatClasses(hit.internationalClass),
      formatDay(hit.filedDate) === '—' ? '' : formatDay(hit.filedDate),
      formatDay(hit.registrationDate) === '—' ? '' : formatDay(hit.registrationDate),
      hit.goodsAndServices.join('\n'),
      hit.tsdrUrl,
    ]
  })
}

function stamp(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportCsv(hits: TrademarkRecord[]): void {
  const table = [HEADERS, ...rows(hits)]
  const csv = table
    .map((row) =>
      row
        .map((cell) => {
          const text = cell.replaceAll('"', '""')
          return /[",\n]/.test(text) ? `"${text}"` : text
        })
        .join(','),
    )
    .join('\r\n')
  download(`商标查询-${stamp()}.csv`, new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
}

export function exportXlsx(hits: TrademarkRecord[]): void {
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows(hits)])
  sheet['!cols'] = HEADERS.map(() => ({ wch: 18 }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, '商标')
  XLSX.writeFile(book, `商标查询-${stamp()}.xlsx`)
}
