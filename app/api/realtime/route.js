import { getSessionUser } from '../../../lib/auth'
import { subscribeRealtime } from '../../../lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()

function encodeEvent(eventName, payload) {
  return encoder.encode(
    `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`,
  )
}

export async function GET(request) {
  const user = await getSessionUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  let heartbeat
  let unsubscribe
  const stream = new ReadableStream({
    start(controller) {
      const send = (eventName, payload) => {
        controller.enqueue(encodeEvent(eventName, payload))
      }
      send('connected', {
        userId: user.id,
        connectedAt: new Date().toISOString(),
      })
      unsubscribe = subscribeRealtime((event) => {
        send('change', event)
      })
      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'))
      }, 20000)
      request.signal.addEventListener(
        'abort',
        () => {
          clearInterval(heartbeat)
          unsubscribe?.()
          controller.close()
        },
        { once: true },
      )
    },
    cancel() {
      clearInterval(heartbeat)
      unsubscribe?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
