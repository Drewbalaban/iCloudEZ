'use client'

import React from 'react'

interface PageLoaderProps {
  show: boolean
}

export default function PageLoader({ show }: PageLoaderProps) {
  if (!show) return null
  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent" />
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-2 border-blue-600/40 border-t-blue-600 animate-spin" />
      </div>
    </div>
  )
}


