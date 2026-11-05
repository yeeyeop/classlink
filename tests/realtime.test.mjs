import assert from 'node:assert/strict'
import test from 'node:test'
import { publishRealtime, subscribeRealtime } from '../lib/realtime.js'

test('realtime bus publishes complete events and unsubscribes cleanly', () => {
  const received = []
  const unsubscribe = subscribeRealtime((event) => received.push(event))
  const published = publishRealtime('db:changed', {
    reason: 'unit-test',
  })
  unsubscribe()
  publishRealtime('db:changed', { reason: 'after-unsubscribe' })

  assert.equal(received.length, 1)
  assert.equal(received[0].id, published.id)
  assert.equal(received[0].type, 'db:changed')
  assert.equal(received[0].reason, 'unit-test')
  assert.ok(received[0].at)
})
