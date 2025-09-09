import { test, expect } from '@playwright/test'

test.describe('Smoke', () => {
  test('home page renders and has CTAs', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('header')).toBeVisible()
    // Ensure the top nav "Sign in" link is visible (avoid matching multiple links)
    await expect(page.locator('header nav').getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
    // Ensure hero CTA exists
    await expect(page.getByRole('link', { name: 'Get Started', exact: true })).toBeVisible()
  })

  test('sign in page loads', async ({ page }) => {
    await page.goto('/auth/signin')
    await expect(page.getByRole('heading', { name: /welcome to cloudez/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
})
