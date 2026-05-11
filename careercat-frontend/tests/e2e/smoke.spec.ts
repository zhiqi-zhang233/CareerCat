import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).not.toHaveTitle('Error');
});

test('dashboard page loads', async ({ page }) => {
  await page.goto('/dashboard');
  // 未登录时应跳转到登录页或显示内容
  await expect(page.locator('body')).toBeVisible();
});

test('no console errors on homepage', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/');
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
