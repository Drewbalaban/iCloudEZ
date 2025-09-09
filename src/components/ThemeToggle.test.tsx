import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThemeToggle from './ThemeToggle'

// Reset DOM classes and localStorage between tests
beforeEach(() => {
  document.documentElement.className = ''
  localStorage.clear()
})

describe('ThemeToggle', () => {
  it('renders and toggles dark mode class', async () => {
    render(<ThemeToggle />)

    const button = await screen.findByRole('button', { name: /toggle dark mode/i })

    // initial effect sets dark mode
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // toggle to light
    await userEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')

    // toggle back to dark
    await userEvent.click(button)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})
