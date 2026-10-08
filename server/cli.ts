import { startServer } from './index.ts'

const port = Number(process.env.PORT ?? 43123)
const host = process.env.HOST ?? '127.0.0.1'
const staticDir = process.env.STATIC_DIR

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('PORT 不正确')
  process.exit(1)
}

const running = await startServer({
  port,
  host,
  staticDir: staticDir || undefined,
})

console.log(`商标查询已启动 http://${host}:${running.port}`)
