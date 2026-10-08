import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildSearchBody } from '../server/query.ts'
import { DAILY_LIMIT, mergeQuota, remainingOf } from '../src/lib/quota-logic.ts'

const built = buildSearchBody({
  keyword: 'apple',
  owner: '',
  classCode: '9',
  serial: '',
  registration: '',
  status: 'live',
  sort: 'relevance',
  page: 1,
})
const body = built.body
const query = body.query as { bool: { must: unknown[]; filter: unknown[] } }
assert.equal(body.size, 20)
assert.equal(body.from, 0)
assert.equal(body.track_total_hits, true)
assert.equal(built.sort, 'relevance')
assert.deepEqual(query.bool.filter, [{ term: { internationalClass: '009' } }, { term: { alive: true } }])

const rolled = mergeQuota('2026-10-08', [
  { present: true, valid: true, day: '2026-10-07', count: 5, unlocked: false },
])
assert.equal(rolled.count, 0)
assert.equal(remainingOf(rolled), DAILY_LIMIT)

const tampered = mergeQuota('2026-10-08', [
  { present: true, valid: false, day: '', count: 0, unlocked: false },
])
assert.equal(tampered.tampered, true)
assert.equal(remainingOf(tampered), 0)

const unlocked = mergeQuota('2026-10-08', [
  { present: true, valid: true, day: '2026-10-01', count: 5, unlocked: true },
])
assert.equal(unlocked.unlocked, true)
assert.equal(remainingOf(unlocked), null)

const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
assert.match(vite, /DEFAULT_UNLOCK_SHA256 = '[a-f0-9]{64}'/)
assert.equal(vite.includes('mark-open'), false)

console.log('self-check ok')
