'use client'

import { useEffect, useRef } from 'react'

export default function GrainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      const imageData = ctx.createImageData(width, height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0
        data[i] = v
        data[i + 1] = v
        data[i + 2] = v
        data[i + 3] = 18 // low alpha
      }
      ctx.putImageData(imageData, 0, 0)
    }

    const resize = () => {
      width = Math.floor(window.innerWidth)
      height = Math.floor(window.innerHeight)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] mix-blend-screen opacity-20">
      <canvas ref={canvasRef} />
    </div>
  )
}


