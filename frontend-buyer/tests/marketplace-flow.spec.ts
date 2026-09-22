import { test, expect, type Browser, type Page } from '@playwright/test';
import fs from 'node:fs';

const fixturePath = process.env.MARKETPLACE_FIXTURES;
test.skip(!fixturePath, 'Generate isolated local fixtures using backend/tests/Support/marketplace-preview.php.');
const buyerURL = process.env.MARKETPLACE_BUYER_URL || 'http://127.0.0.1:3140';
const sellerURL = process.env.MARKETPLACE_SELLER_URL || 'http://127.0.0.1:3141';
const adminURL = process.env.MARKETPLACE_ADMIN_URL || 'http://127.0.0.1:3142';
const api = process.env.MARKETPLACE_API_URL || 'http://127.0.0.1:8140/api';

test('real buyer → seller → admin marketplace flow', async ({ browser, request }, info) => {
  const fixtures = JSON.parse(fs.readFileSync(fixturePath!, 'utf8'));
  const makePage = async (role: 'buyer' | 'seller' | 'admin') => {
    const context = await browser.newContext();
    await context.addInitScript(({ role, session }) => {
      localStorage.setItem(role === 'admin' ? 'admin_token' : 'auth_token', session.token);
      localStorage.setItem(role === 'admin' ? 'admin_user' : 'user', JSON.stringify(session.user));
    }, { role, session: fixtures[role] });
    return context.newPage();
  };
  const buyer = await makePage('buyer'); const seller = await makePage('seller'); const admin = await makePage('admin');
  const get = async (role: string, path: string) => {
    const res = await request.get(api + path, { headers: { Authorization: 'Bearer ' + fixtures[role].token, Accept: 'application/json' } });
    expect(res.ok(), path + ': ' + await res.text()).toBeTruthy(); return (await res.json()).data;
  };

  await buyer.goto(buyerURL + '/profile/top-up');
  await expect(buyer.getByText('Wallet top-up', { exact: true })).toBeVisible();
  await buyer.getByRole('spinbutton').fill('200');
  await buyer.getByRole('button', { name: 'Top Up €200.00' }).click();
  await expect.poll(async () => (await get('buyer', '/buyer/wallet/balance')).balance).toBe(200);
  await expect(buyer).toHaveURL(buyerURL + '/profile/top-up');
  expect((await get('buyer', '/buyer/wallet/transactions')).data[0].meta.payment_method).toBe('wallet_top_up');

  await buyer.goto(buyerURL + '/checkout');
  await expect(buyer.getByRole('button', { name: 'Place Order', exact: true })).toBeEnabled();
  await buyer.getByRole('button', { name: 'Place Order', exact: true }).click();
  await expect(buyer).toHaveURL(/\/orders\/\d+$/);
  const orderId = Number(buyer.url().split('/').pop());
  let order = await get('buyer', '/buyer/orders/' + orderId);
  const shipmentId = order.store_orders[0].id;
  expect(order.shipping_total).toBe('0.00'); expect(order.store_orders[0].delivery_code).toBeNull();
  await expect(buyer.getByText('Pending seller review.', { exact: false })).toBeVisible();

  await seller.goto(sellerURL + '/orders/' + shipmentId);
  await expect(seller.getByText('10 Marketplace Street', { exact: true })).toBeVisible();
  await expect(seller.getByText('+49123456789', { exact: true })).toBeVisible();
  await seller.getByRole('button', { name: 'Accept Order', exact: true }).click();
  await seller.getByLabel('Delivery Fee', { exact: true }).fill('7.50');
  await seller.getByLabel('Estimated Delivery Date', { exact: true }).fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  await seller.getByLabel('Delivery Method', { exact: true }).fill('Tracked courier');
  await seller.getByLabel('Delivery Notes', { exact: true }).fill('Call on arrival');
  await seller.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(seller.getByText('AWAITING PAYMENT', { exact: true })).toBeVisible();
  // Buyer has not navigated or reloaded: this verifies automatic quote refresh.
  await buyer.bringToFront();
  await expect(buyer.getByText('The seller has added the delivery fee.', { exact: false })).toBeVisible();
  await expect(buyer.getByText('€87.50', { exact: true }).first()).toBeVisible();
  await buyer.getByRole('button', { name: /Pay Now/ }).click();
  await expect.poll(async () => (await get('buyer', '/buyer/store-orders/' + shipmentId)).payment_status).toBe('paid');
  await expect(buyer.getByText(/^\d{6}$/).first()).toBeVisible();
  const code = (await buyer.getByText(/^\d{6}$/).first().textContent())!.trim();
  expect((await get('buyer', '/buyer/wallet/balance')).balance).toBe(112.5);
  let wallet = await get('seller', '/seller/wallet'); expect(wallet.pending_balance).toBe('87.50'); expect(wallet.available_balance).toBe('0.00');

  await seller.bringToFront();
  await expect(seller.getByRole('button', { name: 'Mark as Out for Delivery' })).toBeVisible();
  await seller.getByRole('button', { name: 'Mark as Out for Delivery' }).click();
  await seller.getByRole('button', { name: 'Mark as Delivered', exact: true }).click();
  await seller.getByLabel('Delivery Code (OTP)', { exact: true }).fill(code);
  await seller.getByRole('button', { name: 'Confirm Delivery', exact: true }).click();
  await expect.poll(async () => (await get('buyer', '/buyer/store-orders/' + shipmentId)).status).toBe('delivered');

  await seller.goto(sellerURL + '/wallet');
  await expect(seller.getByRole('heading', { name: 'Seller Wallet', exact: true })).toBeVisible();
  await expect(seller.getByText('Available balance', { exact: true }).locator('..')).toContainText('€87.50');
  await seller.getByLabel('amount', { exact: true }).fill('50');
  await seller.getByLabel('account name', { exact: true }).fill('Marketplace Seller');
  await seller.getByLabel('account number', { exact: true }).fill('DE123456789');
  await seller.getByLabel('bank name', { exact: true }).fill('Test Bank');
  await seller.getByRole('button', { name: 'Request withdrawal', exact: true }).click();
  await expect(seller.getByRole('status')).toContainText('Withdrawal requested');
  const withdrawalId = (await get('seller', '/seller/wallet/withdrawals')).data[0].id;

  await admin.goto(adminURL + '/orders/' + orderId);
  await expect(admin.getByText('10 Marketplace Street', { exact: true })).toBeVisible();
  await expect(admin.getByText('released', { exact: true })).toBeVisible();
  await admin.screenshot({ path: info.outputPath('admin-delivered-order.png'), fullPage: true });
  await admin.goto(adminURL + '/finance');
  await admin.getByRole('button', { name: 'Withdrawals', exact: true }).click();
  const section = admin.locator('section').filter({ has: admin.getByText(new RegExp('^#' + withdrawalId + ' ·')) });
  for (const status of ['approved', 'processing', 'completed']) {
    await section.getByLabel('Withdrawal action').selectOption(status);
    await section.getByLabel('Withdrawal notes').fill('Verified local test payout');
    if (status === 'completed') await section.getByLabel('Bank payout reference').fill('browser-payout-' + withdrawalId);
    await section.getByRole('button', { name: 'Apply withdrawal action' }).click();
    await expect.poll(async () => (await get('seller', '/seller/wallet/withdrawals')).data[0].status).toBe(status);
  }
  await seller.bringToFront();
  await expect(seller.getByText('Available balance', { exact: true }).locator('..')).toContainText('€37.50');
  await expect(seller.getByText('Reserved for withdrawal', { exact: true }).locator('..')).toContainText('€0.00');
  await seller.screenshot({ path: info.outputPath('seller-wallet.png'), fullPage: true });

  // An admin refund after payout returns the buyer's money and records seller debt.
  await admin.goto(adminURL + '/orders/' + orderId);
  await admin.getByLabel('Admin action', { exact: true }).selectOption('refunded');
  await admin.getByLabel('Action reason').fill('Verified return after payout');
  await admin.getByRole('button', { name: 'Apply action', exact: true }).click();
  await expect.poll(async () => (await get('buyer', '/buyer/store-orders/' + shipmentId)).status).toBe('refunded');
  expect((await get('buyer', '/buyer/wallet/balance')).balance).toBe(200);
  wallet = await get('seller', '/seller/wallet');
  expect(wallet.available_balance).toBe('0.00'); expect(wallet.pending_balance).toBe('0.00'); expect(wallet.reserved_balance).toBe('0.00');
  expect(wallet.debt_balance).toBe('50.00'); expect(wallet.total_earnings).toBe('0.00');
  const entries = (await get('seller', '/seller/wallet/transactions')).data;
  expect(entries.filter((e: any) => e.type === 'escrow_release')).toHaveLength(1);
  expect(entries.filter((e: any) => e.type === 'refund')).toHaveLength(1);
  expect(entries.filter((e: any) => e.type === 'withdrawal_completed')).toHaveLength(1);
  await buyer.goto(buyerURL + '/store-orders/' + shipmentId);
  await expect(buyer.getByText('REFUNDED', { exact: true })).toBeVisible();
  await expect(buyer.getByText(/^\d{6}$/)).toHaveCount(0);
  await buyer.screenshot({ path: info.outputPath('buyer-refunded-order.png'), fullPage: true });
  await Promise.all([buyer.context().close(), seller.context().close(), admin.context().close()]);
});
