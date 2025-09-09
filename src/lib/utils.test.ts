import { describe, it, expect } from 'vitest'
import { cn, formatFileSize, formatDate } from './utils'

describe('utils', () => {
  it('cn merges class names with tailwind-merge', () => {
    expect(cn('px-2', 'py-2', 'px-4')).toBe('py-2 px-4')
  })

  it('formatFileSize handles zero bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })

  it('formatFileSize formats KB/MB/GB', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
  })

  it('formatDate returns readable date', () => {
    const d = new Date('2023-01-01T12:34:00Z').toISOString()
    const formatted = formatDate(d)
    expect(formatted).toMatch(/2023/)
  })
})
