import { AboutDialog } from '@/components/AboutDialog.tsx'
import { CodeDialog } from '@/components/CodeDialog.tsx'
import { DetailSheet } from '@/components/DetailSheet.tsx'
import { ResultsPane } from '@/components/ResultsPane.tsx'
import { SearchPanel } from '@/components/SearchPanel.tsx'
import { searchTrademarks } from '@/lib/api.ts'
import { exportCsv, exportXlsx } from '@/lib/export.ts'
import { clearHistory, readHistory, rememberHistory, type HistoryEntry } from '@/lib/history.ts'
import { readQuota, recordSuccessfulSearch, unlockWithCode } from '@/lib/quota.ts'
import { emptyDraft, type SearchDraft, type SearchResponse, type TrademarkRecord } from '@/lib/types.ts'
import { useEffect, useState } from 'react'

export default function App() {
  const [draft, setDraft] = useState<SearchDraft>(emptyDraft)
  const [submitted, setSubmitted] = useState<SearchDraft | null>(null)
  const [result, setResult] = useState<SearchResponse | null>(null)
  const [selected, setSelected] = useState<TrademarkRecord | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)

  useEffect(() => {
    void readQuota().then((quota) => setRemaining(quota.remaining))
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.repeat) return
      if (event.key.toLowerCase() !== 'u' || !event.altKey || event.shiftKey) return
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      setCodeOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function run(nextDraft: SearchDraft, page: number) {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const quota = await readQuota()
      setRemaining(quota.remaining)
      if (quota.remaining === 0) return
      const data = await searchTrademarks(nextDraft, page)
      const updated = await recordSuccessfulSearch()
      setRemaining(updated.remaining)
      setResult(data)
      setSubmitted(nextDraft)
      setDraft(nextDraft)
      setHistory(rememberHistory(nextDraft))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '查询失败，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  function example(kind: 'apple' | 'class' | 'serial') {
    if (kind === 'apple') {
      void run({ ...emptyDraft(), keyword: 'apple' }, 1)
      return
    }
    if (kind === 'class') {
      void run({ ...emptyDraft(), keyword: 'apple', classCode: '9', status: 'live' }, 1)
      return
    }
    void run({ ...emptyDraft(), serial: '97087321' }, 1)
  }

  const blocked = remaining === 0

  return (
    <div className="min-h-screen bg-[radial-gradient(1000px_420px_at_0%_-10%,rgba(142,29,44,0.08),transparent),radial-gradient(800px_360px_at_100%_0%,rgba(176,132,62,0.14),transparent)]">
      <header className="border-b border-border/80 bg-card/80">
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-5">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary font-serif text-lg text-primary-foreground">标</div>
          <div>
            <h1 className="font-serif text-2xl tracking-tight">商标查询</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              检索美国专利商标局（USPTO）的联邦商标。这里查的是商标，不是著作权（版权）。
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SearchPanel
          draft={draft}
          loading={loading}
          history={history}
          onChange={setDraft}
          onSubmit={() => void run(draft, 1)}
          onHistory={(entry) => void run(entry.draft, 1)}
          onClearHistory={() => {
            clearHistory()
            setHistory([])
          }}
        />
        <ResultsPane
          loading={loading}
          error={error}
          result={result}
          blocked={blocked}
          onExample={example}
          onOpen={setSelected}
          onPage={(page) => submitted && void run(submitted, page)}
          onCsv={() => result && exportCsv(result.hits)}
          onXlsx={() => result && exportXlsx(result.hits)}
        />
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-8 text-xs text-muted-foreground">
        <p>{remaining == null ? '数据来自 USPTO 公开检索' : `今日剩余 ${remaining} 次 · 查询和翻页各计 1 次`}</p>
        <div className="flex items-center gap-4">
          <a className="hover:underline" href="https://tmsearch.uspto.gov/search/search-results" target="_blank" rel="noreferrer">
            官方检索
          </a>
          <button type="button" className="hover:underline" onClick={() => setAboutOpen(true)}>
            关于
          </button>
        </div>
      </footer>
      <DetailSheet hit={selected} onClose={() => setSelected(null)} />
      <AboutDialog
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        onVersionGesture={() => {
          setAboutOpen(false)
          setCodeOpen(true)
        }}
      />
      <CodeDialog
        open={codeOpen}
        onOpenChange={setCodeOpen}
        onSubmit={async (code) => {
          const ok = await unlockWithCode(code)
          if (ok) {
            const quota = await readQuota()
            setRemaining(quota.remaining)
            if (quota.remaining !== 0) setError(null)
          }
          return ok
        }}
      />
    </div>
  )
}
