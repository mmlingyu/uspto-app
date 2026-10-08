import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatClasses, formatDay, formatTotal, snippet } from '@/lib/format.ts'
import { limitMessage } from '@/lib/quota-logic.ts'
import { aliveLabel, translateStatus } from '@/lib/status.ts'
import type { SearchResponse, TrademarkRecord } from '@/lib/types.ts'

type Props = {
  loading: boolean
  error: string | null
  result: SearchResponse | null
  blocked: boolean
  onExample: (kind: 'apple' | 'class' | 'serial') => void
  onOpen: (hit: TrademarkRecord) => void
  onPage: (page: number) => void
  onCsv: () => void
  onXlsx: () => void
}

export function ResultsPane({ loading, error, result, blocked, onExample, onOpen, onPage, onCsv, onXlsx }: Props) {
  return (
    <section className="min-w-0 space-y-3" aria-live="polite">
      {blocked && (
        <div className="rounded-xl border border-amber-800/20 bg-amber-100/80 px-4 py-3 text-sm text-amber-950">
          {limitMessage()}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {!result && !loading && !error && <EmptyState onExample={onExample} />}
      {loading && !result && <Skeleton />}
      {result && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{result.summary}</p>
              <h2 className="font-serif text-xl text-foreground">
                {formatTotal(result.total, result.totalRelation)} 条
                <span className="ml-2 text-sm font-sans text-muted-foreground">
                  {result.sort === 'filed' ? '按申请日' : '按相关度'} · 用时 {result.took} 毫秒
                </span>
              </h2>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={result.hits.length === 0} onClick={onCsv}>
                导出 CSV
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={result.hits.length === 0} onClick={onXlsx}>
                导出 Excel
              </Button>
            </div>
          </div>
          {result.windowLimited && (
            <p className="text-xs text-muted-foreground">接口最多翻到前 10,000 条。请用分类、状态或权利人缩小范围。</p>
          )}
          {result.hits.length === 0 ? (
            <div className="rounded-2xl bg-card px-4 py-10 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
              没有符合条件的美国商标。可以换一个写法，或去掉分类、状态后再查。纯图形商标往往没有文字名称，请改用申请号或权利人。
            </div>
          ) : (
            <ul className="space-y-2">
              {result.hits.map((hit) => (
                <li key={hit.serial}>
                  <ResultRow hit={hit} onOpen={onOpen} />
                </li>
              ))}
            </ul>
          )}
          <Pager result={result} disabled={loading || blocked} onPage={onPage} />
        </>
      )}
      {loading && result && <p className="text-sm text-muted-foreground">正在查询 USPTO…</p>}
    </section>
  )
}

function ResultRow({ hit, onOpen }: { hit: TrademarkRecord; onOpen: (hit: TrademarkRecord) => void }) {
  const status = translateStatus(hit.statusCode, hit.statusDescription)
  const goods = hit.goodsAndServices[0]
  return (
    <button
      type="button"
      className="flex w-full gap-3 rounded-2xl bg-card p-3 text-left shadow-sm ring-1 ring-foreground/10 transition hover:ring-primary/40"
      onClick={() => onOpen(hit)}
    >
      <img
        src={`/api/mark-image/${hit.serial}`}
        alt=""
        width={56}
        height={56}
        loading="lazy"
        className="size-14 shrink-0 rounded-lg bg-muted object-contain"
        onError={(event) => {
          event.currentTarget.style.visibility = 'hidden'
        }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-lg leading-tight">{hit.wordmark ?? '（无文字，可能是图形商标）'}</span>
          <Badge variant={hit.alive ? 'default' : 'secondary'}>{aliveLabel(hit.alive)}</Badge>
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {status.zh ?? (status.en ? `原文：${status.en}` : '状态未提供')}
          {status.zh && status.en ? ` · ${status.en}` : ''}
        </span>
        <span className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <span>申请号 {hit.serial}</span>
          <span>注册号 {hit.registrationNumber ?? '—'}</span>
          <span className="truncate">权利人 {hit.owners[0] ?? '—'}</span>
          <span className="truncate">{formatClasses(hit.internationalClass)}</span>
          <span>申请日 {formatDay(hit.filedDate)}</span>
          <span>注册日 {formatDay(hit.registrationDate)}</span>
        </span>
        {goods && <span className="mt-2 block text-xs text-muted-foreground">{snippet(goods)}</span>}
      </span>
    </button>
  )
}

function Pager({ result, disabled, onPage }: { result: SearchResponse; disabled: boolean; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(Math.min(result.total, 10_000) / result.pageSize))
  if (result.total <= result.pageSize) return null
  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <Button type="button" variant="outline" disabled={disabled || result.page <= 1} onClick={() => onPage(result.page - 1)}>
        上一页
      </Button>
      <p className="text-sm text-muted-foreground">
        第 {result.page} / {pages.toLocaleString('zh-CN')} 页
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || result.page >= pages}
        onClick={() => onPage(result.page + 1)}
      >
        下一页
      </Button>
    </div>
  )
}

function EmptyState({ onExample }: { onExample: (kind: 'apple' | 'class' | 'serial') => void }) {
  return (
    <div className="rounded-2xl bg-card px-5 py-10 text-center ring-1 ring-foreground/10">
      <p className="font-serif text-2xl">查一条美国商标</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        输入文字商标、权利人、尼斯分类或申请号。结果来自 USPTO 实时检索，不会使用样例数据。
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button type="button" variant="secondary" onClick={() => onExample('apple')}>
          查 apple
        </Button>
        <Button type="button" variant="secondary" onClick={() => onExample('class')}>
          有效的 apple，第 9 类
        </Button>
        <Button type="button" variant="secondary" onClick={() => onExample('serial')}>
          申请号 97087321
        </Button>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-2xl bg-card ring-1 ring-foreground/10" />
      ))}
    </div>
  )
}
