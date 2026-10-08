import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from 'radix-ui'
import { useState } from 'react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (code: string) => Promise<boolean>
}

export function CodeDialog({ open, onOpenChange, onSubmit }: Props) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  function reset() {
    setCode('')
    setError('')
    setDone(false)
    setPending(false)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-popover p-5 text-popover-foreground shadow-lg ring-1 ring-foreground/10">
          <Dialog.Title className="font-serif text-xl">输入代码</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">请输入代码。</Dialog.Description>
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (pending || done) return
              setPending(true)
              setError('')
              void onSubmit(code).then((ok) => {
                setPending(false)
                if (ok) {
                  setDone(true)
                  return
                }
                setError('代码不正确')
              })
            }}
          >
            <Input
              type="password"
              autoComplete="off"
              value={code}
              aria-invalid={error ? true : undefined}
              className="h-10"
              onChange={(event) => setCode(event.target.value)}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {done && <p className="text-sm">已生效</p>}
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  关闭
                </Button>
              </Dialog.Close>
              {!done && (
                <Button type="submit" disabled={pending}>
                  确认
                </Button>
              )}
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
