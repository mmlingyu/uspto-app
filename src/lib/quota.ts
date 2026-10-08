import { DAILY_LIMIT, mergeQuota, remainingOf, todayKey, type QuotaSnapshot } from './quota-logic.ts'

const PEPPER = 'tm-quota-v1'
const DEVICE_KEY = 'tm-device-v1'
const STATE_KEY = 'tm-quota-v1'
const IDB_NAME = 'tm-quota'
const IDB_STORE = 'kv'

type Saved = {
  day: string
  count: number
  unlocked: boolean
  device: string
  mac: string
}

let memory: Saved | null = null

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sign(device: string, day: string, count: number, unlocked: boolean): Promise<string> {
  return sha256Hex(`${device}|${day}|${count}|${unlocked ? 1 : 0}|${PEPPER}`)
}

function sameHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return diff === 0
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

function deviceId(): string {
  const existing = readLocal(DEVICE_KEY)
  if (existing && /^[a-zA-Z0-9-]{16,80}$/.test(existing)) return existing
  const created = crypto.randomUUID()
  writeLocal(DEVICE_KEY, created)
  return created
}

function parseSaved(raw: string | null): { present: boolean; value: Saved | null } {
  if (!raw) return { present: false, value: null }
  try {
    const parsed = JSON.parse(raw) as Partial<Saved>
    if (
      typeof parsed.day !== 'string' ||
      typeof parsed.count !== 'number' ||
      typeof parsed.unlocked !== 'boolean' ||
      typeof parsed.device !== 'string' ||
      typeof parsed.mac !== 'string'
    ) {
      return { present: true, value: null }
    }
    return { present: true, value: parsed as Saved }
  } catch {
    return { present: true, value: null }
  }
}

async function slotFrom(raw: string | null, device: string) {
  const parsed = parseSaved(raw)
  if (!parsed.present || !parsed.value) {
    return { present: parsed.present, valid: false, day: '', count: 0, unlocked: false }
  }
  const record = parsed.value
  const mac = await sign(record.device, record.day, record.count, record.unlocked)
  const valid = record.device === device && sameHex(mac, record.mac)
  return {
    present: true,
    valid,
    day: record.day,
    count: record.count,
    unlocked: record.unlocked,
  }
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const request = indexedDB.open(IDB_NAME, 1)
    const timer = setTimeout(() => resolve(null), 500)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_STORE)) {
        request.result.createObjectStore(IDB_STORE)
      }
    }
    request.onsuccess = () => {
      clearTimeout(timer)
      resolve(request.result)
    }
    request.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

async function readIdb(): Promise<string | null> {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const request = tx.objectStore(IDB_STORE).get(STATE_KEY)
    const timer = setTimeout(() => resolve(null), 500)
    request.onsuccess = () => {
      clearTimeout(timer)
      resolve(typeof request.result === 'string' ? request.result : null)
    }
    request.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
  })
}

async function writeIdb(value: string): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(value, STATE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
    tx.onabort = () => resolve()
  })
}

async function loadSnapshot(): Promise<{ snapshot: QuotaSnapshot; device: string }> {
  const device = deviceId()
  const localRaw = readLocal(STATE_KEY)
  const idbRaw = await readIdb()
  const memoryRaw = memory ? JSON.stringify(memory) : null
  const slots = await Promise.all([
    slotFrom(localRaw, device),
    slotFrom(idbRaw, device),
    slotFrom(memoryRaw, device),
  ])
  return { snapshot: mergeQuota(todayKey(), slots), device }
}

async function persist(snapshot: QuotaSnapshot, device: string): Promise<void> {
  const day = todayKey()
  const saved: Saved = {
    day,
    count: snapshot.count,
    unlocked: snapshot.unlocked,
    device,
    mac: await sign(device, day, snapshot.count, snapshot.unlocked),
  }
  memory = saved
  const raw = JSON.stringify(saved)
  writeLocal(STATE_KEY, raw)
  await writeIdb(raw)
}

export async function readQuota(): Promise<QuotaSnapshot & { remaining: number | null }> {
  const { snapshot } = await loadSnapshot()
  return { ...snapshot, remaining: remainingOf(snapshot) }
}

export async function recordSuccessfulSearch(): Promise<QuotaSnapshot & { remaining: number | null }> {
  const { snapshot, device } = await loadSnapshot()
  if (!snapshot.unlocked && snapshot.count < DAILY_LIMIT) {
    snapshot.count += 1
    await persist(snapshot, device)
  }
  return { ...snapshot, remaining: remainingOf(snapshot) }
}

export async function unlockWithCode(code: string): Promise<boolean> {
  const digest = await sha256Hex(code.trim())
  const expected = __UNLOCK_SHA256__
  if (!sameHex(digest, expected)) return false
  const { snapshot, device } = await loadSnapshot()
  snapshot.unlocked = true
  await persist(snapshot, device)
  return true
}
