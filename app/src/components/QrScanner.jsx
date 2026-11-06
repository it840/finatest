import React, { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

// Opens the camera and reads QR codes. Calls onScan(text) when it sees one.
// The camera only starts when this component is shown, and is released when it is hidden.
export default function QrScanner({ onScan }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const onScanRef = useRef(onScan)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  onScanRef.current = onScan

  useEffect(() => {
    let stream = null
    let raf = 0
    let stopped = false
    let last = { text: '', at: 0 }

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('This browser cannot open the camera. Type the Asset ID instead.')
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return }
        const video = videoRef.current
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        await video.play()
        setReady(true)

        const tick = () => {
          if (stopped) return
          const canvas = canvasRef.current
          if (canvas && video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
            const scale = Math.min(1, 640 / video.videoWidth)
            canvas.width = Math.round(video.videoWidth * scale)
            canvas.height = Math.round(video.videoHeight * scale)
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
            if (hit && hit.data) {
              const now = Date.now()
              if (hit.data !== last.text || now - last.at > 2500) {
                last = { text: hit.data, at: now }
                onScanRef.current(hit.data)
              }
            }
          }
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch (e) {
        setError(
          e && e.name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow the camera for this site, or type the Asset ID instead.'
            : (e && e.message) || 'Could not open the camera. Type the Asset ID instead.'
        )
      }
    }
    start()

    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      if (stream) stream.getTracks().forEach(t => t.stop())
    }
  }, [])

  if (error) return <div className="text-sm text-danger border border-hairline rounded p-3 bg-surface">{error}</div>

  return (
    <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-w-sm">
      <video ref={videoRef} muted className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-2/3 aspect-square border-2 border-white/80 rounded-lg" />
      </div>
      {!ready && <div className="absolute inset-0 flex items-center justify-center text-white/90 text-sm">Starting camera…</div>}
    </div>
  )
}
