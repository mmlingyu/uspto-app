import { Button } from '@/components/ui/button'
import { Dialog } from 'radix-ui'
import { useRef } from 'react'

const VERSION = '1.0.0'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVersionGesture: () => void
}

export function AboutDialog({ open, onOpenChange, onVersionGesture }: Props) {
  const clicks = useRef(0)
  const timer = useRef<number | null>(null)

  function pressVersion() {
    clicks.current += 1
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      clicks.current = 0
    }, 2000)
    if (clicks.current >= 7) {
      clicks.current = 0
      onVersionGesture()
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        clicks.current = 0
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-popover p-5 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
          <Dialog.Title className="font-serif text-xl">关于商标查询</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            检索美国专利商标局（USPTO）的联邦商标登记。这里查的是商标，不是著作权（版权）。数据来自 USPTO 公开检索接口，仅供对照，权利状态以官方记录为准。本工具不隶属于 USPTO。
          </Dialog.Description>
          <p className="mt-4 text-sm text-muted-foreground">
            版本{' '}
            <span className="cursor-text select-none" onMouseDown={(event) => event.preventDefault()} onClick={pressVersion}>
              {VERSION}
            </span>
          </p>
          <div className="mt-5 flex justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="outline">
                关闭
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
