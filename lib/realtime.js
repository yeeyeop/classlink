import { EventEmitter } from 'node:events'

const globalKey = '__classlink_realtime_bus__'
const bus =
  globalThis[globalKey] ||
  (() => {
    const instance = new EventEmitter()
    instance.setMaxListeners(0)
    globalThis[globalKey] = instance
    return instance
  })()

export function publishRealtime(type, payload = {}) {
  const event = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    at: new Date().toISOString(),
    ...payload,
  }
  bus.emit('event', event)
  return event
}

export function subscribeRealtime(listener) {
  bus.on('event', listener)
  return () => bus.off('event', listener)
}
