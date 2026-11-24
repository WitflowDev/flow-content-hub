import { expect, test } from '@playwright/test'

test('the landing page presents the Content Day', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('New content.')
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
})

test('the login page asks for the library', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
})

test('a share link that cannot be opened says so', async ({ page }) => {
  await page.goto('/share/not-a-real-share-link')
  await expect(page.getByRole('heading', { name: 'This link is not available.' })).toBeVisible()
  await expect(page.getByText('The collection may have been removed, or this link has expired.')).toBeVisible()
})
