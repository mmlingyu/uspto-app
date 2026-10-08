import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { HistoryEntry } from '@/lib/history.ts'
import { classHint } from '@/lib/nice.ts'
import type { SearchDraft, SortMode, StatusFilter } from '@/lib/types.ts'

type Props = {
  draft: SearchDraft
  loading: boolean
  history: HistoryEntry[]
  onChange: (draft: SearchDraft) => void
  onSubmit: () => void
  onHistory: (entry: HistoryEntry) => void
  onClearHistory: () => void
}

export function SearchPanel({ draft, loading, history, onChange, onSubmit, onHistory, onClearHistory }: Props) {
  const hint = classHint(draft.classCode)
  return (
    <form
      className="space-y-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="keyword">文字商标</Label>
        <Input
          id="keyword"
          value={draft.keyword}
          placeholder="例如 apple"
          autoComplete="off"
          className="h-10"
          onChange={(event) => onChange({ ...draft, keyword: event.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="status">状态</Label>
          <Select
            value={draft.status}
            onValueChange={(value) => onChange({ ...draft, status: value as StatusFilter })}
          >
            <SelectTrigger id="status" className="!h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="live">有效（Live）</SelectItem>
              <SelectItem value="dead">失效（Dead）</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort">排序</Label>
          <Select value={draft.sort} onValueChange={(value) => onChange({ ...draft, sort: value as SortMode })}>
            <SelectTrigger id="sort" className="!h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="relevance">相关度</SelectItem>
              <SelectItem value="filed">申请日新到旧</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="owner">申请人 / 权利人</Label>
        <Input
          id="owner"
          value={draft.owner}
          placeholder="例如 Apple Inc"
          autoComplete="off"
          className="h-10"
          onChange={(event) => onChange({ ...draft, owner: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="classCode">国际分类</Label>
        <Input
          id="classCode"
          inputMode="numeric"
          value={draft.classCode}
          placeholder="1–45，不填则不限"
          autoComplete="off"
          className="h-10"
          onChange={(event) => onChange({ ...draft, classCode: event.target.value })}
        />
        <p className="text-xs text-muted-foreground">{hint ?? '尼斯分类。只填分类时结果会很多，建议同时写商标文字。'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="serial">申请号</Label>
          <Input
            id="serial"
            inputMode="numeric"
            value={draft.serial}
            placeholder="8 位"
            autoComplete="off"
            className="h-10"
            onChange={(event) => onChange({ ...draft, serial: event.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registration">注册号</Label>
          <Input
            id="registration"
            inputMode="numeric"
            value={draft.registration}
            placeholder="保留前导零"
            autoComplete="off"
            className="h-10"
            onChange={(event) => onChange({ ...draft, registration: event.target.value })}
          />
        </div>
      </div>
      <Button type="submit" className="h-10 w-full" disabled={loading}>
        {loading ? '正在查询 USPTO…' : '查询'}
      </Button>
      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">最近查询</p>
            <button type="button" className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={onClearHistory}>
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="max-w-full truncate rounded-full bg-secondary px-2.5 py-1 text-left text-xs text-secondary-foreground"
                onClick={() => onHistory(entry)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  )
}
