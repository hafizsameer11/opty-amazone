# Vista Express 360 subscriptions — deployment and acceptance

Vista Express 360 is a CRM entitlement for a Marketplace seller. During the
current rollout, an authenticated seller activates an enabled plan directly;
no payment gateway or card collection is used. It is
separate from the existing Marketplace subscription feature: legacy
Marketplace subscriptions do not open the CRM, and a successful Marketplace
login alone does not create access.

## What is stored

The Marketplace backend is the entitlement source of truth.

- `vista360_plans`, `vista360_plan_prices`, and `vista360_plan_features` are
  configurable plan definitions. The seeded Go, Pro and Pro Plus rows are
  editable defaults.
- An activation copies its plan, feature and reference-price data into a
  `vista360_subscriptions` record. Changing a plan later therefore never
  changes an already purchased term.
- `vista360_subscription_payments` records the activation provider and amount
  actually collected. Complimentary activations use provider `complimentary`,
  status `waived` and amount `0`; no card data is stored.
- Terms are activated for 1, 6 or 12 months. A renewal or upgrade becomes a
  separately scheduled term and never modifies the active term.

## Required environment configuration

Set the following values privately on the appropriate servers; do not commit
them to Git:

```dotenv
# Marketplace backend
VISTA360_ENABLED=true
VISTA360_SELLER_URL=https://seller.vistaexpress.it
VISTA360_CRM_URL=https://vistaexpressbusiness.com
VISTA360_SELF_SERVICE_ENABLED=true
VISTA360_CRM_WEBHOOK_URL=https://api.vistaexpressbusiness.com/api/v1/integrations/vista/subscription-webhook
VISTA360_CRM_WEBHOOK_SECRET=one-long-shared-random-secret

# Vista Express 360 CRM backend
VISTA360_CRM_WEBHOOK_SECRET=the-same-shared-random-secret
VISTA360_ENTITLEMENT_TTL_SECONDS=15
VISTA360_ENTITLEMENT_MAX_STALE_SECONDS=0
```

`VISTA360_ENTITLEMENT_MAX_STALE_SECONDS=0` is the secure production default:
when the CRM cannot re-check a Vista seller entitlement, protected paid APIs
fail closed instead of allowing a cancelled user to continue.

The CRM webhook variables are two separate `.env` entries, never one URL or a
Markdown link:

```dotenv
VISTA360_CRM_WEBHOOK_URL=https://api.vistaexpressbusiness.com/api/v1/integrations/vista/subscription-webhook
VISTA360_CRM_WEBHOOK_SECRET=one-long-separate-shared-random-secret
```

## Marketplace release

From the Marketplace backend release checkout:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan db:seed --class=Vista360PlanSeeder --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan queue:restart
```

Ensure the Marketplace scheduler runs every minute. It moves a scheduled term
into active status at its start time and expires completed terms. For
example, use one existing scheduler service or a single cron entry:

```cron
* * * * * cd /var/www/vistaexpress/optyamazone/backend && /usr/bin/php artisan schedule:run >> /var/www/vistaexpress/optyamazone/backend/storage/logs/scheduler.log 2>&1
```

Rebuild/deploy the Marketplace Seller and Admin panels after the backend
release. The Seller panel provides the dashboard promotion, plan page and My
Subscription view; the Marketplace Admin panel owns plan/subscription
administration.

## CRM release

Release the matching CRM backend after the Marketplace source of truth is
available:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
sudo supervisorctl restart 'vistaexpressbusiness-worker:*'
```

The CRM worker and scheduler must remain active. Rebuild/release the CRM Shop
and CRM Admin portals, including their shared `contracts` directory, in the
usual versioned release workflow.

## Acceptance checklist

1. As Marketplace Admin, verify the seeded plans and the active 1/6/12-month
   price rows. Change a test plan description/feature only; confirm existing
   subscription snapshots do not change.
2. As a test seller without a subscription, click **Sign in with Vista
   Express** in the CRM. Authentication may complete, but CRM access must be
   denied with a safe subscription/renewal handoff.
3. In Marketplace Seller, choose a plan and duration, then press **Activate**.
   Verify a `complimentary` / `waived` €0 activation record, audit event,
   active term and **Open Vista Express 360 CRM** action. There is no payment
   redirect.
4. Open CRM through that action. Verify only the plan's permitted module APIs
   work. Directly opening a restricted route/API must still return the plan
   feature denial.
5. Activate a renewal/upgrade. Verify it becomes a scheduled future term and the
   active term's saved feature/price snapshot remains unchanged. Cancel future
   renewal and confirm the active term remains usable.
6. Suspend or cancel through Marketplace Admin. Verify CRM navigation is
   blocked and protected CRM APIs return a subscription-required response,
   even for an already logged-in browser. Restore/extend and verify access
   returns.
7. Test expiry with a controlled short-lived record only in a safe test
   environment. Confirm data is preserved while CRM access is denied.
8. For product receipt parity, add an iHygiene pack/variation and an eyewear
   frame size from Buyer. Confirm the Buyer price/image, cart, order and Seller
   order all show the same selected pack or exact frame dimensions.

## Support boundaries

- Marketplace product data remains owned by Marketplace. CRM publishing uses
  the same Marketplace product/option structures and must not create a
  parallel buyer representation.
- Payment-gateway collection, disputes/refunds, fiscal invoicing, taxes and
  recurring automatic charges are not enabled for Vista Express 360 during
  this rollout.
- Never bypass server-side subscription checks in frontend code. The original
  provider and CRM each independently enforce access.
