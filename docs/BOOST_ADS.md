# Boost Ads / Product Campaigns

## What changed

Product promotion is now a campaign ledger, not a collection of mutable product
flags. A campaign reserves real seller wallet funds, records every change to the
reservation, and may deliver only after successful reservation, review (when
enabled), its start time, and product-eligibility checks.

The original product fields (`is_boosted`, legacy budget/date/location/payment
fields) remain untouched. They are neither used for buyer delivery nor removed.
`php artisan ads:import-legacy` reports records only; add `--apply` to create a
non-delivering `legacy_review` snapshot for each historic product. That command
does not charge, refund, or activate legacy boosts because the old implementation
has no trustworthy payment or spend receipt to reconcile against.

Store/home banner boosting remains the existing, separate banner system.

## Data migration

`2026_09_13_000001_create_ad_campaign_system.php` creates:

- `ad_campaigns` — campaign dates, targeting, placements, fixed financial terms,
  lifecycle/payment state, counters, legacy snapshot, funding source and
  idempotency key.
- `ad_events` — signed-delivery impressions, clicks, product views, carts and
  attributed conversions.
- `ad_budget_transactions` — reservation, spend, release, refund and adjustment
  ledger entries, each with a unique idempotency key.
- `ad_audit_logs` — seller, admin and automated lifecycle decisions.
- `ad_daily_metrics` — idempotent aggregated reporting slices.
- `transactions.payment_reference` — provider payment de-duplication.
- `seller_wallet_entries.ad_campaign_id` and metadata — the seller-visible
  campaign payment, spend, release and development-top-up ledger links.
- `platform_ledger_entries` — platform advertising revenue earned only from
  billable campaign spend, never from a held reservation.

It also conditionally provides `products.is_muted` where a historic schema lacks
the field already used by buyer visibility checks.

Run in a deployment window after a database backup:

```sh
php artisan migrate --force
php artisan ads:import-legacy
# Review the count and payment evidence before choosing the following:
php artisan ads:import-legacy --apply
```

## Lifecycle and financial rules

1. Seller creates campaign with a client idempotency key. The product, campaign
   and **store-level Seller Wallet** rows are locked in one transaction.
2. New campaigns use `seller_wallets.available_balance` as their only funding
   source. A reservation moves money to `ad_reserved_balance`; insufficient
   funds leave the campaign in `payment_failed` and never activate it.
3. A billable click moves its CPC amount from `ad_reserved_balance` to the
   platform revenue ledger. It is not platform revenue at reservation time.
   Cancellation, rejection, expiry or refund returns unspent reservation money
   to `available_balance`.
4. Historic campaigns retain `funding_source=legacy_user_wallet` and continue
   to release into their original `wallets.ad_credit`/`shopping_balance` split.
   Those balances are not used by any new Boost campaign.
5. A reservation becomes `pending_review` by default (`ADS_REVIEW_REQUIRED=true`).
   An admin approval makes it `scheduled` or `active` depending on the dates.
6. Scheduler checks activate scheduled campaigns, expire ended campaigns, stop
   budget-exhausted or invalid products, aggregate analytics, reconcile ledgers,
   and repair missed order attribution. Repeating a job is safe.
7. Pause stops delivery/spend immediately. Resume rechecks dates, balance, stock,
   product approval and seller state. Cancel/reject/terminate/refund returns only
   the unused reservation to the Seller Wallet once.

The delivery, campaign and wallet rows are locked for spending. This prevents
negative wallet balances, spending over a budget, duplicate reservation/refund,
or a successful-looking activation after failed payment. Reconciliation mismatch
puts the campaign in `reconciliation_hold` rather than inventing a correction.

## Required runtime configuration

```dotenv
ADS_REVIEW_REQUIRED=true
STRIPE_SECRET_KEY=sk_live_... # Buyer shopping wallet only
STRIPE_RETURN_ORIGINS=https://buyer.example.com
MARKETPLACE_SELLER_WALLET_TOP_UP_ENABLED=true # temporary direct funding until a gateway is connected
QUEUE_CONNECTION=database
```

During local/testing, Seller Wallet top-ups use the development top-up endpoint.
It executes the normal Seller Wallet ledger transaction with an idempotency key;
it is blocked outside `local` and `testing`. Stripe is not used by Boost Ads.
The existing Stripe checkout flow remains for the separate buyer shopping wallet.

Run a queue worker and scheduler in production:

```sh
php artisan queue:work --tries=3
php artisan schedule:work
```

## API surface

All seller/admin endpoints require Sanctum authentication plus the campaign
policy. Admin endpoints additionally require the existing `admin` role.

| Audience | Endpoint | Purpose |
| --- | --- | --- |
| Seller | `GET /api/seller/ad-campaigns/options` | Eligible products, Seller Wallet balance, locations and placements |
| Seller | `GET, POST /api/seller/ad-campaigns` | List/create campaigns |
| Seller | `GET /api/seller/ad-campaigns/{id}` | Campaign detail |
| Seller | `POST /api/seller/ad-campaigns/{id}/actions` | Pay, pause, resume, cancel |
| Seller | `GET /api/seller/ad-campaigns/{id}/{analytics,transactions}` | Analytics and ledger |
| Seller | `POST /api/seller/ad-campaigns/{id}/duplicate` | Return a reviewable, unpaid template |
| Seller | `GET /api/seller/wallet` | Seller Wallet balances, including advertising reservation/spend totals |
| Seller | `POST /api/seller/wallet/top-ups` | Seller Wallet top-up through the real ledger |
| Admin | `GET /api/admin/ad-campaigns` | Filter by seller, product, status, payment and date |
| Admin | `GET /api/admin/ad-campaigns/{id}` | Detail |
| Admin | `POST /api/admin/ad-campaigns/{id}/actions` | Approve, reject, pause, resume, terminate, refund |
| Admin | `GET /api/admin/ad-campaigns/{id}/{analytics,transactions,audits}` | Reporting, ledger and audit history |
| Admin | `GET /api/admin/finance/platform-revenue` | Billable Boost Ads revenue ledger |
| Buyer | `GET /api/buyer/ads` | Active sponsored products for a placement |
| Buyer | `POST /api/buyer/ads/events` | Signed impression/click/product-view tracking |

Buyer ad delivery supports `homepage`, `categories`, `search`, and
`recommendations`. It ranks only eligible active campaigns using target match,
placement/category/search relevance, CPC bid, product quality and remaining
budget. It returns at most three distinct products, limits a visitor from seeing
the same campaign repeatedly across placements for 30 minutes, and never replaces
organic results. Sponsored cards are labelled “Sponsored” and “Ads”.

Tokens are encrypted, short-lived, visitor-bound delivery claims; the frontend
never submits a campaign ID for billable tracking. One visitor can produce one
billable click per campaign/day, only after a matching counted impression. Seller
and admin self-clicks, blocked users, expired/invalid tokens and invalid products
are rejected. IP addresses are HMAC-fingerprinted and never stored raw.

## UI locations

- Seller: `/boost-ads` campaign list, Seller Wallet development top-up, and four-step Boost
  Product wizard; `/boost-ads/{id}` analytics, transactions and lifecycle actions.
- Admin: `/ad-campaigns` filters and `/ad-campaigns/{id}` review, financial
  actions, analytics, ledger and audit history.
- Buyer: sponsored sections on home, category, search and product recommendation
  pages. Product views and cart additions carry the signed token for attribution.

## Automated verification

The advertising suite uses a dedicated MySQL test database configured in
`phpunit.ads.xml`; it must never point at a production database.

```sh
php vendor/bin/phpunit -c phpunit.ads.xml
```

Coverage includes campaign creation/ownership/eligibility/dates/budgets, wallet
reservation and payment failure, activation/expiry/pause/resume/cancel/refund,
seller/admin permissions, placement/location/ranking, signed event de-duplication,
daily caps, attribution/reversals, audit/ledger reconciliation, legacy import,
wallet checkout verification, variant stock, and concurrent reservation/click/refund
workers.
