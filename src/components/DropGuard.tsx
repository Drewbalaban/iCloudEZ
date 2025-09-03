'use client'

import { useEffect } from 'react'

export default function DropGuard() {
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'
    }

    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)

    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  return null
}
