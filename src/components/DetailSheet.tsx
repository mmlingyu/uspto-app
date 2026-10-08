import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  formatBasis,
  formatClasses,
  formatDay,
  formatDrawing,
  formatEntity,
  formatMarkTypes,
  formatRegister,
  joinText,
} from '@/lib/format.ts'
import { aliveLabel, translateStatus } from '@/lib/status.ts'
import type { TrademarkRecord } from '@/lib/types.ts'
import type { ReactNode } from 'react'

type Props = {
  hit: TrademarkRecord | null
  onClose: () => void
}

export function DetailSheet({ hit, onClose }: Props) {
  const status = hit ? translateStatus(hit.statusCode, hit.statusDescription) : null
  return (
    <Sheet open={hit !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 p-0">
        {hit && status && (
          <>
            <SheetHeader className="border-b pr-12">
              <SheetTitle className="font-serif text-2xl">{hit.wordmark ?? '（无文字，可能是图形商标）'}</SheetTitle>
              <SheetDescription>
                申请号 {hit.serial}
                {hit.registrationNumber ? ` · 注册号 ${hit.registrationNumber}` : ''} · {aliveLabel(hit.alive)}
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="min-h-0 flex-1 overflow-hidden">
              <div className="space-y-5 p-4">
                <MarkImage serial={hit.serial} />
                <dl>
                  <Field label="状态">{status.zh ?? '见原文'}</Field>
                  {status.en && <Field label="状态原文">{status.en}</Field>}
                  {hit.statusCode != null && <Field label="状态代码">{hit.statusCode}</Field>}
                  <Field label="有效性">{aliveLabel(hit.alive)}</Field>
                  <Field label="申请号">{hit.serial}</Field>
                  <Field label="注册号">{hit.registrationNumber ?? '—'}</Field>
                  <Field label="国际分类">{formatClasses(hit.internationalClass)}</Field>
                  <Field label="申请日">{formatDay(hit.filedDate)}</Field>
                  <Field label="注册日">{formatDay(hit.registrationDate)}</Field>
                  <Field label="公告日">{formatDay(hit.publishDate)}</Field>
                  <Field label="放弃日">{formatDay(hit.abandonDate)}</Field>
                  <Field label="撤销日">{formatDay(hit.cancelDate)}</Field>
                  <Field label="申请人/权利人">{joinText(hit.owners)}</Field>
                  {hit.ownerFullText.length > 0 && <Field label="权利人原文">{hit.ownerFullText.join('\n')}</Field>}
                  <Field label="所在地">{[hit.ownerCity, hit.ownerAddress].filter(Boolean).join('，') || '—'}</Field>
                  <Field label="主体类型">{formatEntity(hit.ownerEntity)}</Field>
                  <Field label="商标类型">{formatMarkTypes(hit.markTypes)}</Field>
                  <Field label="注册簿">{formatRegister(hit.registrationType)}</Field>
                  <Field label="图样">{formatDrawing(hit.drawingCode, hit.drawingDescription)}</Field>
                  <Field label="当前申请基础">{formatBasis(hit.currentBasis)}</Field>
                  <Field label="律师">{hit.attorney ?? '—'}</Field>
                  <Field label="首次使用">{formatDay(hit.firstUseAny)}</Field>
                  <Field label="商业使用">{formatDay(hit.firstUseCommerce)}</Field>
                  <Field label="优先权日">{formatDay(hit.priorityDate)}</Field>
                  <Field label="续展日">{formatDay(hit.renewalDate)}</Field>
                  <Field label="标准字符">{hit.standardCharacter == null ? '—' : hit.standardCharacter ? '是' : '否'}</Field>
                  <Field label="已记录转让">{hit.assignmentRecorded == null ? '—' : hit.assignmentRecorded ? '是' : '否'}</Field>
                  {hit.disclaimer && <Field label="免责声明">{hit.disclaimer}</Field>}
                  {hit.markDescription.length > 0 && <Field label="商标描述">{hit.markDescription.join('\n')}</Field>}
                  {hit.designDescriptions.length > 0 && <Field label="设计编码说明">{hit.designDescriptions.join('\n')}</Field>}
                  {hit.goodsAndServices.length > 0 && <Field label="商品与服务">{hit.goodsAndServices.join('\n')}</Field>}
                </dl>
                <Button asChild className="h-10 w-full">
                  <a href={hit.tsdrUrl} target="_blank" rel="noreferrer">
                    打开 USPTO 官方记录（TSDR）
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground">官方页面可能仍是英文。权利状态以 TSDR 为准，本页只展示检索索引里的字段。</p>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function MarkImage({ serial }: { serial: string }) {
  return (
    <img
      src={`/api/mark-image/${serial}`}
      alt="商标图样"
      className="mx-auto max-h-48 rounded-xl bg-muted object-contain"
      onError={(event) => {
        event.currentTarget.hidden = true
      }}
    />
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-b border-border/80 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap break-words">{children}</dd>
    </div>
  )
}
