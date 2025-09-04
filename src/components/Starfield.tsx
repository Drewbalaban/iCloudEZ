'use client'

import { useEffect, useRef } from 'react'

interface StarfieldProps {
  density?: number
  layers?: number
  speed?: number
}

type Star = {
  x: number
  y: number
  r: number
  layer: number
  twinklePhase: number
  twinkleAmp: number
}

export default function Starfield({ density = 0.00018, layers = 3, speed = 0.03 }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const starsRef = useRef<Star[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Regenerate stars on resize for correct coverage
      const targetCount = Math.floor(width * height * density)
      starsRef.current = new Array(targetCount).fill(0).map(() => randomStar(width, height, layers))
    }

    const randomStar = (w: number, h: number, maxLayer: number): Star => {
      const layer = Math.floor(Math.random() * maxLayer)
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * (1.1 + layer * 0.3) + 0.3,
        layer,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleAmp: 0.3 + Math.random() * 0.5,
      }
    }

    const step = () => {
      ctx.clearRect(0, 0, width, height)

      const now = performance.now() / 1000
      for (const s of starsRef.current) {
        const layerSpeed = speed * (0.3 + s.layer / Math.max(1, layers - 1))
        s.y += layerSpeed
        if (s.y > height + 2) {
          s.y = -2
          s.x = Math.random() * width
        }

        const twinkle = 0.7 + Math.sin(now * (0.8 + s.layer * 0.2) + s.twinklePhase) * 0.15 * s.twinkleAmp
        const alpha = Math.min(1, Math.max(0.15, twinkle))

        ctx.beginPath()
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(step)
    }

    resize()
    step()
    window.addEventListener('resize', resize)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [density, layers, speed])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <canvas ref={canvasRef} />
    </div>
  )
}


