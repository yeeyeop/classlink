'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const ModelBackground = dynamic(() => import('./ModelBackground'), {
  ssr: false,
})

const ENABLE_GLB_BACKDROP =
  process.env.NEXT_PUBLIC_ENABLE_GLB_BACKDROP !== 'false'

export default function VideoBackdrop({ className = '' }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const schedule =
      window.requestIdleCallback ||
      ((callback) => window.setTimeout(callback, 300))
    const cancel = window.cancelIdleCallback || window.clearTimeout
    const handle = schedule(() => setReady(true))
    return () => cancel(handle)
  }, [])

  return (
    <>
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_62%_42%,#1b304a_0%,#080d15_42%,#020305_100%)]"
        aria-hidden="true"
      />
      <video
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
        src={ready ? '/background.mp4?v=3' : undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        aria-hidden="true"
      />
      {ENABLE_GLB_BACKDROP && ready && <ModelBackground />}
    </>
  )
}
