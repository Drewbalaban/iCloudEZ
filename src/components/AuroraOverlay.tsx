'use client'

export default function AuroraOverlay() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full opacity-30 blur-3xl aurora-a" />
      <div className="absolute top-10 -left-40 w-[800px] h-[800px] rounded-full opacity-25 blur-3xl aurora-b" />
      <div className="absolute -bottom-40 right-[-120px] w-[900px] h-[900px] rounded-full opacity-25 blur-3xl aurora-c" />
    </div>
  )
}


