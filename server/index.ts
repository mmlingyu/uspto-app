import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import path from 'node:path'
import { ApiError } from './errors.ts'
import { RequestGate } from './gate.ts'
import { parseSearchInput, SEARCH_GAP_MS } from './query.ts'
import { fetchMarkImage, searchTrademarks } from './uspto.ts'

const searchGate = new RequestGate(
  SEARCH_GAP_MS,
  3,
  '请求过于频繁，请稍候再试。每次查询至少间隔约 0.8 秒。',
)
const imageGate = new RequestGate(200, 40, '图样请求太多，请稍后再打开详情。')

export type ServerOptions = {
  port: number
  host: string
  staticDir?: string
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 32_768) {
        reject(new ApiError(400, 'bad_request', '请求内容过大。'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', () => reject(new ApiError(400, 'bad_request', '读取请求失败。')))
  })
}

function safeStaticPath(staticDir: string, urlPath: string): string | null {
  const pathname = decodeURIComponent(urlPath.split('?')[0] ?? '/')
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const root = path.resolve(staticDir)
  const full = path.resolve(root, relative)
  if (full !== root && !full.startsWith(root + path.sep)) return null
  return full
}

function serveFile(res: ServerResponse, filePath: string): boolean {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return false
  const ext = path.extname(filePath).toLowerCase()
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  })
  createReadStream(filePath).pipe(res)
  return true
}

async function handle(req: IncomingMessage, res: ServerResponse, options: ServerOptions): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const method = req.method ?? 'GET'

  if (method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, service: 'uspto-trademark-search' })
    return
  }

  if (method === 'POST' && url.pathname === '/api/search') {
    const text = await readBody(req)
    let json: unknown
    try {
      json = JSON.parse(text || '{}')
    } catch {
      throw new ApiError(400, 'bad_request', '请求格式不正确。')
    }
    const input = parseSearchInput(json)
    const result = await searchGate.run(() => searchTrademarks(input))
    sendJson(res, 200, result)
    return
  }

  const imageMatch = method === 'GET' ? url.pathname.match(/^\/api\/mark-image\/(\d{7,8})$/) : null
  if (imageMatch) {
    const serial = imageMatch[1] ?? ''
    const image = await imageGate.run(() => fetchMarkImage(serial))
    if (!image) {
      sendJson(res, 404, { error: 'not_found', message: '没有可用的商标图样。' })
      return
    }
    res.writeHead(200, {
      'Content-Type': image.type,
      'Content-Length': image.body.byteLength,
      'Cache-Control': 'private, max-age=86400',
    })
    res.end(image.body)
    return
  }

  if (method === 'GET' && options.staticDir) {
    const filePath = safeStaticPath(options.staticDir, url.pathname)
    if (filePath && serveFile(res, filePath)) return
    const indexPath = path.join(options.staticDir, 'index.html')
    if (!url.pathname.startsWith('/api') && serveFile(res, indexPath)) return
  }

  sendJson(res, 404, { error: 'not_found', message: '没有这个地址。' })
}

export async function startServer(options: ServerOptions): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createServer((req, res) => {
    handle(req, res, options).catch((error: unknown) => {
      if (res.headersSent) {
        res.destroy()
        return
      }
      if (error instanceof ApiError) {
        sendJson(res, error.status, { error: error.code, message: error.message })
        return
      }
      sendJson(res, 500, { error: 'internal', message: '查询服务出现内部错误，请稍后再试。' })
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port, options.host, () => resolve())
  })

  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : options.port
  return {
    port,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}
