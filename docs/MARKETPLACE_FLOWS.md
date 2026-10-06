# Marketplace financial flows

## Scope and initial findings

Inspected the Laravel routes, controllers, services, models, migrations, email templates and all three Next.js frontends before implementation. The earlier flow used product shipping fees at checkout, overloaded `accepted`, exposed delivery codes too early, and could credit seller proceeds into the shopping wallet. Admin routes and status changes did not consistently enforce role and financial transitions. Some database columns existed only in historical SQL imports.

This change implements shipping quotes, wallet payment and escrow, development wallet funding, and a separate seller earnings ledger. Existing unrelated frontend work remains in the working tree. Coupons, advertising, campaigns, banners, wishlists, reviews and support features were not developed here. The shared Stripe funding service has one compatibility change for configured development return origins.

## State and money lifecycle

1. Checkout validates address ownership and locks the address, buyer wallet and inventory in a transaction. The parent and each shipment receive the same immutable delivery-address snapshot. Each new shipment has `financial_version = 1`, `status = pending`, `payment_status = pending`, and delivery fee zero. Product shipping columns remain but are ignored.
2. The owning seller supplies delivery fee, method, estimated date and notes. A quote key and payload fingerprint make retries safe. The shipment becomes `awaiting_payment`. Item subtotal, allocated discount, delivery fee, shipment total and parent totals are synchronized in integer cents.
3. Buyer payment requires the displayed `expected_total` and an idempotency key. Stale totals return 409. A wallet debit, buyer transaction, unique payment, unique locked escrow, seller pending entry, paid state and delivery code commit together.
4. Only paid shipments can enter processing or out-for-delivery. Only verified delivery can enter delivered. Escrow then releases once, seller pending earnings become available, and eligible reward points are awarded once.
5. A buyer may cancel before dispatch; paid cancellation refunds the buyer and reverses escrow and seller records. Seller rejection applies only to unpaid shipments. Shipped/delivered buyers may open a dispute. An admin may refund or resolve through the same services.
6. A dispute holds locked escrow or delivered earnings and blocks withdrawals. Refunding released earnings deducts available funds; any already-paid-out shortfall becomes seller debt. Future settlements or released withdrawal reserves repay debt first. No money is silently discarded or made negative in spendable balances.
7. Withdrawal requests reserve available earnings. Admin transitions are `pending → approved → processing → completed`, with rejection/failure paths that free the reserve. Completion requires a unique bank payout reference. Actual bank transfers happen through the operator's payout system; this implementation records their reviewed lifecycle.

Parent payment status distinguishes pending, partially paid, paid, disputed, cancelled and refunded. Cancelled/refunded shipments are excluded from current parent totals; each shipment retains its original total and payment/refund evidence.

## Security and consistency

- Parent order is locked before its shipments in ID order. Buyer and seller wallet mutations lock their owning user/store and wallet. Operations run inside retryable database transactions.
- Database uniqueness protects payment per shipment, escrow per shipment, transaction references, seller ledger references, withdrawal requests and bank payout references.
- Delivery codes use secure random generation and a verification hash. An encrypted copy allows the authorized buyer to reopen their paid order and retrieve it. No plaintext code is stored in the legacy column; seller/admin JSON hides the hash and encrypted copy.
- Codes are issued after payment, expire after seven days or three days after a later ETA, and are hidden on terminal/disputed orders. Five invalid attempts lock verification for fifteen minutes. Buyer reissue has a one-minute cooldown and cannot bypass a lock.
- All `api/admin/*` routes are protected by the API-wide admin-role guard, including routes registered outside `routes/admin.php`. Only admin login is public. Buyer and seller groups also require their respective roles; queries enforce ownership.
- Admin parent payment overrides are rejected. Shipment actions use delivery/refund/dispute services and require a reason; delivery requires the buyer's code.
- Buyer shopping funds, seller earnings, and existing advertising funds remain in separate accounting structures.
- All three sites refresh affected screens every five seconds while visible and on focus/visibility changes. A payment still checks the displayed total atomically if a poll races a quote.

## Database changes

### Added migrations

- `backend/database/migrations/2026_09_15_000001_marketplace_financial_flow.php`: new payment and seller-ledger tables; address snapshots; explicit payment status and financial version; shipping quote idempotency; secure delivery-code fields; reward/restock/dispute tracking; unique escrow per shipment.
- `backend/database/migrations/2026_09_15_000002_restore_store_setup_schema.php`: conditionally restores `verification_submitted_at` and `store_setup_completed_at`, already required by the store model/resource and seller gate.

New tables: `marketplace_payments`, `seller_wallets`, `seller_wallet_entries`, `seller_withdrawals`. Seller balances are available, pending, reserved, disputed, debt and net total earnings. Ledger rows store signed amounts, per-balance deltas and resulting balances. Withdrawal bank details are encrypted by the model.

Modified historical migration `2026_08_22_231000_require_color_on_frame_sizes.php` supplies a missing prerequisite column on fresh installations. This is a small compatibility fix needed to run the complete migration chain; it retains the migration's existing color requirement.

### Existing installations

Existing codes are revoked; old accepted states become awaiting-payment and old rejected states become cancelled. Historical orders retain `financial_version = 0` and cannot be quoted, paid, fulfilled or financially cancelled through the new services without reconciliation. Historical paid/delivered statuses receive `legacy_review`. Existing address data is preserved as an explicitly labeled migration-time snapshot; a historical checkout address cannot be reconstructed if it was already changed or deleted.

Duplicate historical escrow rows cause migration to stop instead of deleting liabilities. Reconcile those records before upgrading. The financial migration is intentionally forward-only; rollback requires a verified database backup. No historical seller shopping-wallet funds are automatically reclassified as new seller earnings.

Only disposable test/preview databases were migrated during this task. The application's configured database and real `.env` were not changed. Deploy the code and migrations together, review historical liabilities, and run `php artisan marketplace:reconcile` after migration and periodically thereafter.

## APIs

All paths below have the `/api` prefix and require the corresponding authenticated role unless noted.

| Role | Method and path | Behavior |
| --- | --- | --- |
| Buyer | POST `/buyer/checkout/preview`, `/buyer/checkout/place` | Shipping starts at zero; checkout snapshots owned address |
| Buyer | GET `/buyer/orders`, `/buyer/orders/{id}`, `/buyer/store-orders`, `/buyer/store-orders/{id}` | Owned totals, snapshots, payment/escrow state; code only on authorized paid detail responses |
| Buyer | GET `/buyer/orders/{id}/payment-info` | Updated payable shipments and total |
| Buyer | POST `/buyer/store-orders/{id}/pay` | `payment_method`, `expected_total`, `idempotency_key`; atomic wallet payment |
| Buyer | POST `/buyer/store-orders/{id}/cancel` | Safe cancellation or wallet refund before dispatch |
| Buyer | POST `/buyer/store-orders/{id}/dispute` | `reason`; holds funds |
| Buyer | POST `/buyer/store-orders/{id}/delivery-code` | Secure, rate-limited code reissue |
| Buyer | GET `/buyer/wallet/capabilities` | Development funding, Stripe and order-card availability |
| Buyer | POST `/buyer/wallet/development-top-up` | `amount`, `idempotency_key`; development-only credit |
| Buyer | Existing wallet balance/history/Stripe/withdraw routes | Verified Stripe funding retained; withdrawal debit now locked and idempotent |
| Seller | GET `/seller/orders`, `/seller/orders/{id}`, `/seller/store-orders/pending` | Own shipments, buyer address snapshot, items and totals |
| Seller | POST `/seller/store-orders/{id}/accept` | `delivery_fee`, `delivery_method`, `estimated_delivery_date`, `delivery_notes`, `idempotency_key` |
| Seller | POST `/seller/store-orders/{id}/reject` | Unpaid cancellation; `reason` |
| Seller | POST `/seller/store-orders/{id}/processing`, `/out-for-delivery` | Paid fulfillment transitions |
| Seller | POST `/seller/store-orders/{id}/delivered` | Correct `delivery_code` required |
| Seller | GET `/seller/wallet` | Seller balance summary and locked escrow |
| Seller | GET `/seller/wallet/transactions`, `/seller/wallet/withdrawals` | Paginated complete history |
| Seller | POST `/seller/wallet/withdrawals` | `amount`, `bank_details`, `idempotency_key`; reserve funds |
| Admin | GET `/admin/orders`, `/admin/orders/{id}` | Order, snapshot, payment/refund transaction and escrow evidence |
| Admin | PUT `/admin/store-orders/{id}/status` | Domain action `status`, `reason`, optional `delivery_code` |
| Admin | GET `/admin/finance/seller-wallets`, `/seller-wallets/{storeId}` | Seller balances |
| Admin | GET `/admin/finance/seller-transactions` | Ledger, optionally `wallet_id` |
| Admin | GET `/admin/finance/buyer-transactions` | Buyer transactions, optionally `user_id` |
| Admin | GET `/admin/finance/withdrawals` | Payout requests/history |
| Admin | POST `/admin/finance/withdrawals/{id}` | `status`, `notes`, and `payout_reference` on completion |

## Configuration

`.env.example` documents:

```dotenv
MARKETPLACE_DEVELOPMENT_TOP_UP=false
MARKETPLACE_DEVELOPMENT_RETURN_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002
```

Set the flag true only for local testing. The backend additionally requires `APP_ENV=local` or `testing`; the flag cannot enable funding in production. Valid amounts are EUR 5–100,000 with cent precision. The frontend discovers capabilities and automatically uses this flow without Stripe redirects. Top-up transaction metadata records `payment_method=development`.

Stripe wallet funding still uses `STRIPE_SECRET_KEY` and exact `STRIPE_RETURN_ORIGINS`. Development origins are appended only in local/testing, so additional valid localhost ports can be configured without weakening production verification. Browser redirects alone never prove payment; backend provider retrieval must confirm session ownership, successful payment, currency and amount. Direct card order payment is explicitly unavailable, including when Stripe wallet funding is configured.

## Files changed

Paths below are relative to the project. They list this task's changes, not unrelated pre-existing working-tree edits.

### Backend

- `app/Services/Marketplace/`: `Money.php`, `OrderTotalsService.php`, `PaymentService.php`, `DeliveryVerificationService.php`, `BuyerWalletService.php`, `SellerWalletService.php`, `RefundService.php`, `WithdrawalService.php`, `OrderView.php`, `ReconciliationService.php`.
- `app/Services/Escrow/EscrowService.php`, `app/Services/Order/OrderService.php`, and the return-origin compatibility line in `app/Services/Ads/WalletFundingService.php`.
- Buyer controllers: `BuyerCheckoutController.php`, `BuyerOrderController.php`, `BuyerWalletController.php`.
- Seller controllers: `SellerOrderController.php`, new `SellerWalletController.php`.
- Admin controllers: `AdminOrderController.php`, `AdminStoreOrderController.php`, new `AdminFinanceController.php`.
- Models: `Order.php`, `StoreOrder.php`, `Escrow.php`, `Transaction.php`; new `MarketplacePayment.php`, `SellerWallet.php`, `SellerWalletEntry.php`, `SellerWithdrawal.php`.
- New middleware `AdminApiRole.php`, `MarketplaceRole.php`; `bootstrap/app.php`; `routes/buyer.php`, `routes/seller.php`, `routes/admin.php`.
- New `config/marketplace.php`, `.env.example`, three migrations listed above, new `app/Console/Commands/ReconcileMarketplace.php`.
- Email templates: `resources/views/emails/order-placed.blade.php`, `order-accepted.blade.php`, `order-out-for-delivery.blade.php`.
- Tests: `phpunit.marketplace.xml`, `tests/Feature/Marketplace/MarketplaceFlowTest.php`, `tests/Support/marketplace-race-worker.php`, `tests/Support/marketplace-preview.php`.

### Buyer frontend

- Pages: `app/checkout/page.tsx`, `app/orders/page.tsx`, `app/orders/[id]/page.tsx`, `app/store-orders/[id]/page.tsx`, `app/profile/page.tsx`, `app/profile/top-up/page.tsx`.
- Components: `components/orders/OrderDetailsModal.tsx`, new `DeliverySummary.tsx` and `OrderActions.tsx`, `components/products/ProductCheckoutModal.tsx`.
- `services/order-service.ts`, `services/wallet-service.ts`, new `hooks/useLiveRefresh.ts`.
- New `playwright.marketplace.config.ts`, `tests/marketplace-flow.spec.ts`.

### Seller frontend

- New `app/wallet/page.tsx`, `services/wallet-service.ts`; pages `app/profile/page.tsx`, `app/orders/page.tsx`, `app/orders/[id]/page.tsx`.
- `components/products/UnifiedProductForm.tsx`: removed product shipping inputs.
- `components/orders/OrderDetailsModal.tsx`, new `DeliverySummary.tsx`.
- `components/layout/Sidebar.tsx`, `BottomNav.tsx`: Seller Wallet navigation.
- `services/order-service.ts`, new `hooks/useLiveRefresh.ts`.

### Admin frontend and shared build support

- New `app/finance/page.tsx`, `services/finance-service.ts`, `components/orders/DeliverySummary.tsx`, `hooks/useLiveRefresh.ts`.
- `app/orders/page.tsx`, `app/orders/[id]/page.tsx`, `services/order-service.ts`, `components/layout/AdminSidebar.tsx`.
- Each frontend's `next.config.ts` supports optional `NEXT_BUILD_DIR` to isolate verification builds from running development servers. Root `.gitignore` excludes those outputs and browser test artifacts.
- This report: `docs/MARKETPLACE_FLOWS.md`.

## Verification

Final results (15 September 2026):

| Check | Result |
| --- | --- |
| Backend feature and concurrency suite | 27 tests, 290 assertions passed |
| Fresh migration chain | Passed on isolated MariaDB |
| Buyer, seller and admin TypeScript | All passed |
| Buyer, seller and admin production builds | All passed |
| Real browser marketplace lifecycle | 1 end-to-end test passed |
| Read-only preview reconciliation | 4 shipments and 4 seller wallets, zero issues |
| Scoped PHP formatting / diff whitespace | Passed |

Production builds used `.next-marketplace-build` and downloaded the existing Google Fonts after network access was permitted. Existing Browserslist age and Next middleware-convention notices remain; they do not prevent builds. A browser run during simultaneous builds timed out; the final run with builds finished passed.

- PHP 8.2.12, MariaDB on isolated port 3318. `php vendor/bin/phpunit -c phpunit.marketplace.xml` exercises the complete fresh migration chain and marketplace feature suite. The configuration refuses non-disposable test database names.
- The suite covers ownership, immutable snapshots, quote/payment totals and retries, insufficient funds, disabled card payment, development/production/Stripe funding checks, escrow, secure codes, cancellation/refunds/disputes, seller balances, withdrawal lifecycle, reward reversal, admin/data isolation and multi-store orders.
- Race tests launch 18 independent PHP processes, three simultaneous requests each for top-up, shipping quote, payment, delivery verification, withdrawal and refund. They verify there is one debit/credit/ledger effect per operation.
- `marketplace:reconcile` audits shipment and parent totals, snapshots, linked buyer debit/refund transactions, escrow state, seller ledger running balances, pending/disputed earnings, withdrawal reserves and conservation of funds. It reports legacy records separately and never writes repairs. A corruption test confirms it detects mismatches without changing balances.
- Each frontend passes `npx tsc --noEmit --pretty false`.
- Real Playwright browser flow uses separate buyer/seller/admin sessions against the actual Laravel API and isolated preview database, with no mocked payment or order endpoints. It covers EUR 200 development funding, EUR 80 checkout, a EUR 7.50 seller quote appearing automatically, EUR 87.50 wallet payment, delivery-code settlement, EUR 50 withdrawal through admin completion, and refund after payout. Final buyer balance is EUR 200; seller available/pending/reserved balances and net earnings are zero, with EUR 50 debt for the completed payout.
- Browser screenshots verify admin order evidence, seller wallet/history and the refunded buyer order. Fixtures are local-only and generated by `tests/Support/marketplace-preview.php`; tokens are written outside the repository.

## Practical limits

- No live Stripe charge or actual bank transfer was performed. Stripe provider responses are verified in automated tests; development funding drives the local browser flow. Direct card checkout is disabled.
- Existing historical financial records require a separate, evidence-based reconciliation before enabling them in the new flow. No live database migration or deployment was performed.
- Refunds apply to a complete store shipment; partial-item refunds and automatic bank payout execution are not implemented. One dispute per shipment is supported.
- Delivery-code retrieval depends on retaining the application's encryption key. Email/SMS transport was not exercised; the authenticated buyer order page delivers the code.
