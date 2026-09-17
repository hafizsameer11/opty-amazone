import { expect, test } from '@playwright/test';

test('buyer renders only placement-specific banners and records a visible click', async ({ page }) => {
  const events: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  const banner = {
    id: 41,
    name: 'Autumn frames',
    placement: 'homepage_hero',
    destination: '/products/5',
    tracking_token: 'encrypted-tracking-token',
    creative: {
      desktop_url: 'https://images.example.test/autumn-desktop.jpg',
      mobile_url: 'https://images.example.test/autumn-mobile.jpg',
      title: 'Autumn frames',
      description: 'Automatic savings on selected frames.',
      alt_text: 'Autumn glasses promotion',
      cta_text: 'Shop now',
    },
  };

  await page.route('**/api/buyer/campaigns/banners/homepage_hero**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, data: [banner] }),
  }));
  await page.route('**/api/buyer/campaigns/banners/homepage_featured**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }),
  }));
  await page.route('**/api/buyer/campaigns/banner-events', async route => {
    events.push(JSON.parse(route.request().postData() || '{}').type);
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { accepted: true } }) });
  });
  // Home makes unrelated catalog requests. Keep this test isolated from a live API.
  await page.route('**/api/**', async route => {
    const url = route.request().url();
    if (url.includes('/buyer/campaigns/banners/') || url.includes('/buyer/campaigns/banner-events')) {
      await route.fallback();
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: { data: [] } }) });
  });
  await page.route('**/api/categories**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }),
  }));

  await page.goto('/');
  await page.waitForTimeout(500);
  expect(pageErrors).toEqual([]);
  const promotion = page.getByRole('link', { name: /autumn glasses promotion/i });
  await expect(promotion).toBeVisible();
  await page.waitForTimeout(1_100);
  await promotion.click();
  await expect.poll(() => events).toEqual(expect.arrayContaining(['impression', 'click']));
});
