<?php

namespace App\Services\Vista360;

use App\Models\Store;
use App\Models\User;
use App\Models\Vista360Plan;
use App\Models\Vista360PlanPrice;
use App\Models\Vista360Subscription;
use App\Models\Vista360SubscriptionEvent;
use App\Models\Vista360SubscriptionPayment;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Arr;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Owns the paid Vista Express 360 entitlement lifecycle.
 *
 * The marketplace's legacy Subscription/SubscriptionPlan records intentionally
 * remain untouched: they do not grant CRM access and cannot bypass this
 * service.  Every amount comes from a versioned plan price on the server.
 */
class Vista360SubscriptionService
{
    public const DURATIONS = [1, 6, 12];

    /** @return \Illuminate\Database\Eloquent\Collection<int, Vista360Plan> */
    public function plans(bool $activeOnly = true)
    {
        $query = Vista360Plan::query()
            ->with([
                'features' => fn ($q) => $q->when($activeOnly, fn ($inner) => $inner->where('is_active', true))->orderBy('sort_order'),
                'prices' => fn ($q) => $q->when($activeOnly, fn ($inner) => $inner->where('is_active', true))->orderBy('duration_months')->orderByDesc('version'),
            ])
            ->orderBy('sort_order')
            ->orderBy('id');

        if ($activeOnly) {
            $query->where('is_active', true);
        }

        return $query->get();
    }

    /** @return array<string, mixed> */
    public function current(User $seller, Store $store): array
    {
        $this->reconcileDue($seller->id, $store->id);

        $subscription = $this->activeSubscription($seller, $store)
            ?? Vista360Subscription::query()
                ->where('seller_id', $seller->id)
                ->where('store_id', $store->id)
                ->latest('id')
                ->first();

        // Paid future terms are deliberately separate records so an upgrade,
        // renewal or cancellation never changes the terms already purchased.
        // Returning them lets the seller see a scheduled renewal instead of
        // accidentally buying the same future term again.
        $future = Vista360Subscription::query()
            ->where('seller_id', $seller->id)
            ->where('store_id', $store->id)
            ->where('status', Vista360Subscription::SCHEDULED)
            ->where('expires_at', '>', now())
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Vista360Subscription $item) => $this->subscriptionPayload($item))
            ->values()
            ->all();

        return [
            'subscription' => $subscription ? $this->subscriptionPayload($subscription) : null,
            'future_subscriptions' => $future,
            'entitlement' => $this->entitlement($seller, $store, false),
        ];
    }

    /** @return array<string, mixed> */
    public function entitlement(User $seller, Store $store, bool $reconcile = true): array
    {
        if ($reconcile) {
            $this->reconcileDue($seller->id, $store->id);
        }

        $activeSubscription = $this->activeSubscription($seller, $store);
        // Keep the most recent inactive record in the entitlement response.
        // `active` remains false, but the CRM and Seller UI can accurately
        // explain whether the seller is expired, suspended, cancelled or has
        // a future scheduled term instead of reporting the misleading
        // generic `none` state.
        $subscription = $activeSubscription
            ?? Vista360Subscription::query()
                ->where('seller_id', $seller->id)
                ->where('store_id', $store->id)
                ->latest('id')
                ->first();
        $features = is_array($subscription?->features_snapshot) ? $subscription->features_snapshot : [];

        return [
            'active' => $activeSubscription !== null,
            'status' => $subscription?->status ?? 'none',
            'subscription_id' => $subscription?->uuid,
            'plan' => $subscription?->plan_snapshot,
            'features' => $features,
            'starts_at' => $subscription?->starts_at?->toIso8601String(),
            'expires_at' => $subscription?->expires_at?->toIso8601String(),
            'entitlement_version' => $subscription?->entitlement_version ?? 0,
            'renewal_url' => rtrim((string) config('vista360.seller_url'), '/').'/vista-express-360',
        ];
    }

    /** @param array<string,mixed> $entitlement */
    public function allows(array $entitlement, string $feature): bool
    {
        if (! ($entitlement['active'] ?? false)) {
            return false;
        }

        foreach ((array) ($entitlement['features'] ?? []) as $entry) {
            $key = is_array($entry) ? ($entry['key'] ?? null) : $entry;
            if ($key === $feature) {
                return true;
            }
        }

        return false;
    }

    /** @return array{checkout: array<string,mixed>|null, subscription: Vista360Subscription, payment: Vista360SubscriptionPayment, test_mode: bool} */
    public function createCheckout(User $seller, Store $store, int $planId, int $durationMonths, string $successUrl, string $cancelUrl, ?string $idempotencyKey = null): array
    {
        abort_unless(config('vista360.enabled'), 503, 'Vista Express 360 subscriptions are unavailable.');
        $this->assertReturnUrl($successUrl);
        $this->assertReturnUrl($cancelUrl);

        if (! in_array($durationMonths, self::DURATIONS, true)) {
            throw ValidationException::withMessages(['duration_months' => 'Choose a 1, 6 or 12 month billing duration.']);
        }
        $idempotencyKey ??= (string) Str::uuid();

        // Direct activation is deliberately constrained to an explicit seller
        // allow-list. It makes controlled production acceptance testing
        // possible before Stripe is configured without silently granting CRM
        // access to every Marketplace seller.
        if ($this->canUseTestCheckout($seller)) {
            return $this->createTestCheckout($seller, $store, $planId, $durationMonths, $idempotencyKey);
        }

        try {
            [$subscription, $payment, $created] = DB::transaction(function () use ($seller, $store, $planId, $durationMonths, $idempotencyKey) {
                Store::whereKey($store->id)->lockForUpdate()->firstOrFail();
                $existing = Vista360SubscriptionPayment::where('idempotency_key', $idempotencyKey)->lockForUpdate()->first();
                if ($existing) {
                    return [$existing->subscription()->firstOrFail(), $existing, false];
                }

                $plan = Vista360Plan::query()->with('features')->where('is_active', true)->findOrFail($planId);
                $price = $this->activePrice($plan, $durationMonths);
                $startsAt = $this->nextStartAt($seller, $store);
                $subscription = Vista360Subscription::create([
                    'uuid' => (string) Str::uuid(),
                    'seller_id' => $seller->id,
                    'store_id' => $store->id,
                    'vista360_plan_id' => $plan->id,
                    'status' => Vista360Subscription::PENDING,
                    'source' => 'stripe',
                    'plan_snapshot' => $this->planSnapshot($plan),
                    'features_snapshot' => $this->featuresSnapshot($plan),
                    'price_snapshot' => $this->priceSnapshot($price),
                    'starts_at' => $startsAt,
                    'expires_at' => $startsAt->copy()->addMonthsNoOverflow($durationMonths),
                    'entitlement_version' => 1,
                ]);
                $payment = Vista360SubscriptionPayment::create([
                    'uuid' => (string) Str::uuid(),
                    'vista360_subscription_id' => $subscription->id,
                    'seller_id' => $seller->id,
                    'store_id' => $store->id,
                    'vista360_plan_price_id' => $price->id,
                    'provider' => 'stripe',
                    'status' => Vista360Subscription::PENDING,
                    'amount_cents' => $price->amount_cents,
                    'currency' => strtolower($price->currency),
                    'idempotency_key' => $idempotencyKey,
                ]);
                $this->event($subscription, 'checkout.created', $seller->id, [
                    'payment_id' => $payment->uuid,
                    'duration_months' => $durationMonths,
                ]);

                return [$subscription, $payment, true];
            }, 3);
        } catch (QueryException $exception) {
            // The unique database key closes the small race between two
            // identical browser retries. Re-read the safely owned request
            // rather than opening a second charge.
            $payment = Vista360SubscriptionPayment::where('idempotency_key', $idempotencyKey)->first();
            if (! $payment) {
                throw $exception;
            }
            $subscription = $payment->subscription()->firstOrFail();
            $created = false;
        }

        if (! $created) {
            abort_unless(
                $payment->seller_id === $seller->id
                && $payment->store_id === $store->id
                && $subscription->vista360_plan_id === $planId
                && (int) data_get($subscription->price_snapshot, 'duration_months') === $durationMonths,
                409,
                'This checkout key belongs to a different subscription request.'
            );
            $existingUrl = data_get($payment->provider_payload, 'url');
            if ($payment->status === Vista360Subscription::PENDING && $payment->provider_session_id && is_string($existingUrl)) {
                return [
                    'checkout' => ['id' => $payment->provider_session_id, 'url' => $existingUrl],
                    'subscription' => $subscription->fresh(),
                    'payment' => $payment->fresh(),
                    'test_mode' => false,
                ];
            }
            abort(409, $payment->status === 'paid'
                ? 'This checkout has already completed. Refresh your subscription.'
                : 'This checkout is still being prepared or has failed. Start a new checkout request.');
        }

        // Validate provider configuration only after an earlier valid checkout
        // has had a chance to be safely reused.
        $stripe = $this->stripe();

        try {
            $checkout = $stripe->withHeaders(['Idempotency-Key' => $payment->idempotency_key])->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode' => 'payment',
                'payment_method_types' => ['card'],
                'customer_email' => $seller->email,
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'metadata' => [
                    'type' => 'vista360_subscription',
                    'subscription_uuid' => $subscription->uuid,
                    'payment_uuid' => $payment->uuid,
                    'seller_id' => (string) $seller->id,
                    'store_id' => (string) $store->id,
                ],
                // PaymentIntent events do not necessarily include Checkout
                // metadata. Mirror the immutable ownership metadata so a
                // payment-failure webhook can be matched safely as well.
                'payment_intent_data' => ['metadata' => [
                    'type' => 'vista360_subscription',
                    'subscription_uuid' => $subscription->uuid,
                    'payment_uuid' => $payment->uuid,
                    'seller_id' => (string) $seller->id,
                    'store_id' => (string) $store->id,
                ]],
                'line_items' => [[
                    'price_data' => [
                        'currency' => strtolower($payment->currency),
                        'unit_amount' => $payment->amount_cents,
                        'product_data' => [
                            'name' => sprintf('Vista Express 360 — %s (%s months)', $subscription->plan_snapshot['name'], $subscription->price_snapshot['duration_months']),
                            'description' => 'Pre-paid CRM access term for the selected Vista Express seller account.',
                        ],
                    ],
                    'quantity' => 1,
                ]],
            ]);
        } catch (\Throwable $e) {
            $this->markPaymentFailed($payment, 'checkout_creation_failed', 'Stripe Checkout could not be created.');
            throw $e;
        }

        if (! $checkout->successful() || ! is_string($checkout->json('id')) || ! is_string($checkout->json('url'))) {
            $this->markPaymentFailed($payment, 'checkout_creation_failed', 'Stripe Checkout could not be created.');
            abort(502, 'Payment provider could not create checkout.');
        }

        $payment->update([
            'provider_session_id' => $checkout->json('id'),
            'provider_payload' => Arr::only($checkout->json(), ['id', 'url', 'payment_status', 'status']),
        ]);

        return [
            'checkout' => Arr::only($checkout->json(), ['id', 'url']),
            'subscription' => $subscription->fresh(),
            'payment' => $payment->fresh(),
            'test_mode' => false,
        ];
    }

    /**
     * Creates an auditable, no-charge test term for a specifically allowlisted
     * seller. This method must only be reachable through canUseTestCheckout().
     *
     * @return array{checkout: null, subscription: Vista360Subscription, payment: Vista360SubscriptionPayment, test_mode: true}
     */
    private function createTestCheckout(User $seller, Store $store, int $planId, int $durationMonths, string $idempotencyKey): array
    {
        try {
            [$subscription, $payment, $created] = DB::transaction(function () use ($seller, $store, $planId, $durationMonths, $idempotencyKey) {
                Store::whereKey($store->id)->lockForUpdate()->firstOrFail();
                $existing = Vista360SubscriptionPayment::where('idempotency_key', $idempotencyKey)->lockForUpdate()->first();
                if ($existing) {
                    return [$existing->subscription()->firstOrFail(), $existing, false];
                }

                $plan = Vista360Plan::query()->with('features')->where('is_active', true)->findOrFail($planId);
                $price = $this->activePrice($plan, $durationMonths);
                $startsAt = $this->nextStartAt($seller, $store);
                $status = $startsAt->isFuture() ? Vista360Subscription::SCHEDULED : Vista360Subscription::ACTIVE;

                $subscription = Vista360Subscription::create([
                    'uuid' => (string) Str::uuid(),
                    'seller_id' => $seller->id,
                    'store_id' => $store->id,
                    'vista360_plan_id' => $plan->id,
                    'status' => $status,
                    'source' => 'test',
                    'plan_snapshot' => $this->planSnapshot($plan),
                    'features_snapshot' => $this->featuresSnapshot($plan),
                    'price_snapshot' => $this->priceSnapshot($price),
                    'starts_at' => $startsAt,
                    'expires_at' => $startsAt->copy()->addMonthsNoOverflow($durationMonths),
                    'activated_at' => $status === Vista360Subscription::ACTIVE ? now() : null,
                    'entitlement_version' => 1,
                ]);
                $payment = Vista360SubscriptionPayment::create([
                    'uuid' => (string) Str::uuid(),
                    'vista360_subscription_id' => $subscription->id,
                    'seller_id' => $seller->id,
                    'store_id' => $store->id,
                    'vista360_plan_price_id' => $price->id,
                    'provider' => 'test',
                    'status' => 'paid',
                    // Preserve the selected plan's actual price for audit
                    // clarity, even though no money is collected in test mode.
                    'amount_cents' => $price->amount_cents,
                    'currency' => strtolower($price->currency),
                    'idempotency_key' => $idempotencyKey,
                    'paid_at' => now(),
                    'provider_payload' => [
                        'mode' => 'test_checkout',
                        'activated_without_gateway' => true,
                    ],
                ]);
                $this->event($subscription, 'test_checkout.activated', $seller->id, [
                    'payment_id' => $payment->uuid,
                    'duration_months' => $durationMonths,
                    'no_charge' => true,
                ]);

                return [$subscription, $payment, true];
            }, 3);
        } catch (QueryException $exception) {
            $payment = Vista360SubscriptionPayment::where('idempotency_key', $idempotencyKey)->first();
            if (! $payment) {
                throw $exception;
            }
            $subscription = $payment->subscription()->firstOrFail();
            $created = false;
        }

        abort_unless(
            $payment->provider === 'test'
            && $payment->status === 'paid'
            && $payment->seller_id === $seller->id
            && $payment->store_id === $store->id
            && $subscription->vista360_plan_id === $planId
            && (int) data_get($subscription->price_snapshot, 'duration_months') === $durationMonths,
            409,
            'This test checkout key belongs to a different subscription request.'
        );

        if ($created && $subscription->status === Vista360Subscription::ACTIVE) {
            $this->notifyCrm($subscription);
        }

        return [
            'checkout' => null,
            'subscription' => $subscription->fresh(),
            'payment' => $payment->fresh(),
            'test_mode' => true,
        ];
    }

    /** @return array<string,mixed> */
    public function confirmCheckout(User $seller, Store $store, string $sessionId): array
    {
        $response = $this->stripe()->get('https://api.stripe.com/v1/checkout/sessions/'.rawurlencode($sessionId));
        abort_unless($response->successful(), 502, 'Unable to verify payment with Stripe.');

        $payment = Vista360SubscriptionPayment::query()
            ->where('provider', 'stripe')
            ->where('provider_session_id', $sessionId)
            ->where('seller_id', $seller->id)
            ->where('store_id', $store->id)
            ->firstOrFail();

        $subscription = $this->activatePaidPayment($payment, $response->json());

        return ['subscription' => $this->subscriptionPayload($subscription), 'entitlement' => $this->entitlement($seller, $store)];
    }

    /** @return array<string,mixed> */
    public function handleStripeEvent(array $event): array
    {
        $type = (string) ($event['type'] ?? '');
        $object = $event['data']['object'] ?? [];
        if (! is_array($object)) {
            return ['handled' => false];
        }
        $externalId = is_string($event['id'] ?? null) ? $event['id'] : null;
        $payment = null;
        if (is_string($object['id'] ?? null)) {
            $payment = Vista360SubscriptionPayment::where('provider_session_id', $object['id'])->first();
        }
        if (! $payment && is_string(data_get($object, 'metadata.payment_uuid'))) {
            $payment = Vista360SubscriptionPayment::where('uuid', data_get($object, 'metadata.payment_uuid'))->first();
        }
        if (! $payment) {
            return ['handled' => false];
        }

        if ($externalId && Vista360SubscriptionEvent::where('external_event_id', $externalId)->exists()) {
            return ['handled' => true, 'duplicate' => true];
        }

        if ($type === 'checkout.session.completed') {
            $subscription = $this->activatePaidPayment($payment, $object, $externalId);
            return ['handled' => true, 'subscription' => $subscription->uuid];
        }
        if (in_array($type, ['checkout.session.expired', 'payment_intent.payment_failed'], true)) {
            $this->markPaymentFailed($payment, $type, (string) ($object['last_payment_error']['message'] ?? 'Payment was not completed.'), $externalId);
            return ['handled' => true];
        }

        return ['handled' => false];
    }

    public function grantManual(User $seller, Store $store, Vista360Plan $plan, int $durationMonths, ?User $actor = null, ?string $reason = null): Vista360Subscription
    {
        if (! in_array($durationMonths, self::DURATIONS, true)) {
            throw ValidationException::withMessages(['duration_months' => 'Choose a 1, 6 or 12 month duration.']);
        }

        $subscription = DB::transaction(function () use ($seller, $store, $plan, $durationMonths, $actor, $reason) {
            Store::whereKey($store->id)->lockForUpdate()->firstOrFail();
            $plan->loadMissing('features');
            $price = $this->activePrice($plan, $durationMonths, false);
            $startsAt = $this->nextStartAt($seller, $store);
            $status = $startsAt->isFuture() ? Vista360Subscription::SCHEDULED : Vista360Subscription::ACTIVE;
            $subscription = Vista360Subscription::create([
                'uuid' => (string) Str::uuid(),
                'seller_id' => $seller->id,
                'store_id' => $store->id,
                'vista360_plan_id' => $plan->id,
                'status' => $status,
                'source' => 'admin',
                'plan_snapshot' => $this->planSnapshot($plan),
                'features_snapshot' => $this->featuresSnapshot($plan),
                'price_snapshot' => $this->priceSnapshot($price),
                'starts_at' => $startsAt,
                'expires_at' => $startsAt->copy()->addMonthsNoOverflow($durationMonths),
                'activated_at' => $status === Vista360Subscription::ACTIVE ? now() : null,
                'status_reason' => $reason,
            ]);
            Vista360SubscriptionPayment::create([
                'uuid' => (string) Str::uuid(),
                'vista360_subscription_id' => $subscription->id,
                'seller_id' => $seller->id,
                'store_id' => $store->id,
                'vista360_plan_price_id' => $price->id,
                'provider' => 'manual',
                'status' => 'paid',
                'amount_cents' => 0,
                'currency' => strtolower($price->currency),
                'idempotency_key' => (string) Str::uuid(),
                'paid_at' => now(),
                'provider_payload' => ['reason' => $reason],
            ]);
            $this->event($subscription, 'subscription.manual_grant', $actor?->id, ['duration_months' => $durationMonths, 'reason' => $reason]);

            return $subscription;
        }, 3);

        if ($subscription->status === Vista360Subscription::ACTIVE) {
            $this->notifyCrm($subscription);
        }

        return $subscription;
    }

    public function extend(Vista360Subscription $subscription, int $months, ?User $actor = null, ?string $reason = null): Vista360Subscription
    {
        if (! in_array($months, self::DURATIONS, true)) {
            throw ValidationException::withMessages(['months' => 'Choose a 1, 6 or 12 month extension.']);
        }
        $subscription = DB::transaction(function () use ($subscription, $months, $actor, $reason) {
            $locked = Vista360Subscription::lockForUpdate()->findOrFail($subscription->id);
            $base = $locked->expires_at && $locked->expires_at->isFuture() ? $locked->expires_at : now();
            $locked->update([
                'expires_at' => $base->copy()->addMonthsNoOverflow($months),
                'status' => $locked->status === Vista360Subscription::EXPIRED ? Vista360Subscription::ACTIVE : $locked->status,
                'activated_at' => $locked->activated_at ?? now(),
                'expired_at' => null,
                'status_reason' => $reason ?? $locked->status_reason,
                'entitlement_version' => $locked->entitlement_version + 1,
            ]);
            $this->event($locked, 'subscription.extended', $actor?->id, ['months' => $months, 'reason' => $reason]);
            return $locked->fresh();
        }, 3);
        $this->notifyCrm($subscription);
        return $subscription;
    }

    public function changeStatus(Vista360Subscription $subscription, string $status, ?User $actor = null, ?string $reason = null): Vista360Subscription
    {
        if (! in_array($status, [Vista360Subscription::ACTIVE, Vista360Subscription::SUSPENDED, Vista360Subscription::CANCELLED], true)) {
            throw ValidationException::withMessages(['status' => 'Unsupported subscription status.']);
        }
        $subscription = DB::transaction(function () use ($subscription, $status, $actor, $reason) {
            $locked = Vista360Subscription::lockForUpdate()->findOrFail($subscription->id);
            $updates = [
                'status' => $status,
                'status_reason' => $reason,
                'entitlement_version' => $locked->entitlement_version + 1,
            ];
            if ($status === Vista360Subscription::ACTIVE) {
                $updates['starts_at'] = $locked->starts_at ?? now();
                $updates['activated_at'] = $locked->activated_at ?? now();
                $updates['expires_at'] = $locked->expires_at && $locked->expires_at->isFuture() ? $locked->expires_at : now()->addMonth();
                $updates['suspended_at'] = null;
                $updates['cancelled_at'] = null;
                $updates['expired_at'] = null;
            } elseif ($status === Vista360Subscription::SUSPENDED) {
                $updates['suspended_at'] = now();
            } else {
                $updates['cancelled_at'] = now();
            }
            $locked->update($updates);
            $this->event($locked, 'subscription.'.$status, $actor?->id, ['reason' => $reason]);
            return $locked->fresh();
        }, 3);
        $this->notifyCrm($subscription);
        return $subscription;
    }

    /**
     * Checkout is one-time rather than an automatic recurring debit.  A seller
     * cancellation therefore removes a future paid term, while any currently
     * paid active term remains usable through its saved expiry date.
     */
    public function cancelFutureRenewals(User $seller, Store $store, ?string $reason = null): int
    {
        $scheduled = Vista360Subscription::query()
            ->where('seller_id', $seller->id)
            ->where('store_id', $store->id)
            ->where('status', Vista360Subscription::SCHEDULED)
            ->get();
        foreach ($scheduled as $subscription) {
            $this->changeStatus($subscription, Vista360Subscription::CANCELLED, $seller, $reason ?? 'Cancelled by seller.');
        }
        return $scheduled->count();
    }

    public function reconcileDue(?int $sellerId = null, ?int $storeId = null): int
    {
        $changed = 0;
        $base = Vista360Subscription::query();
        if ($sellerId) {
            $base->where('seller_id', $sellerId);
        }
        if ($storeId) {
            $base->where('store_id', $storeId);
        }
        $due = (clone $base)
            ->where(function ($q) {
                $q->where(fn ($inner) => $inner->where('status', Vista360Subscription::ACTIVE)->where('expires_at', '<=', now()))
                    ->orWhere(fn ($inner) => $inner->where('status', Vista360Subscription::SCHEDULED)->where('starts_at', '<=', now()));
            })
            ->orderBy('id')
            ->get();

        foreach ($due as $candidate) {
            $updated = DB::transaction(function () use ($candidate) {
                $subscription = Vista360Subscription::lockForUpdate()->find($candidate->id);
                if (! $subscription) {
                    return null;
                }
                if ($subscription->status === Vista360Subscription::ACTIVE && $subscription->expires_at?->isPast()) {
                    $subscription->update([
                        'status' => Vista360Subscription::EXPIRED,
                        'expired_at' => now(),
                        'entitlement_version' => $subscription->entitlement_version + 1,
                    ]);
                    $this->event($subscription, 'subscription.expired', null, []);
                    return $subscription->fresh();
                }
                if ($subscription->status === Vista360Subscription::SCHEDULED && $subscription->starts_at?->isPast()) {
                    $hasOtherActive = Vista360Subscription::where('seller_id', $subscription->seller_id)
                        ->where('store_id', $subscription->store_id)
                        ->where('status', Vista360Subscription::ACTIVE)
                        ->where('id', '!=', $subscription->id)
                        ->where('expires_at', '>', now())
                        ->exists();
                    if ($hasOtherActive) {
                        return null;
                    }
                    $subscription->update([
                        'status' => Vista360Subscription::ACTIVE,
                        'activated_at' => now(),
                        'entitlement_version' => $subscription->entitlement_version + 1,
                    ]);
                    $this->event($subscription, 'subscription.activated', null, []);
                    return $subscription->fresh();
                }
                return null;
            }, 3);
            if ($updated) {
                ++$changed;
                $this->notifyCrm($updated);
            }
        }
        return $changed;
    }

    private function activeSubscription(User $seller, Store $store): ?Vista360Subscription
    {
        return Vista360Subscription::query()
            ->where('seller_id', $seller->id)
            ->where('store_id', $store->id)
            ->where('status', Vista360Subscription::ACTIVE)
            ->where('starts_at', '<=', now())
            ->where('expires_at', '>', now())
            ->latest('expires_at')
            ->first();
    }

    private function nextStartAt(User $seller, Store $store)
    {
        $latest = Vista360Subscription::query()
            ->where('seller_id', $seller->id)
            ->where('store_id', $store->id)
            ->whereIn('status', [Vista360Subscription::ACTIVE, Vista360Subscription::SCHEDULED])
            ->where('expires_at', '>', now())
            ->orderByDesc('expires_at')
            ->first();
        return $latest?->expires_at?->copy() ?? now();
    }

    private function canUseTestCheckout(User $seller): bool
    {
        if (! config('vista360.test_checkout_enabled', false)) {
            return false;
        }

        // Configuration is parsed into positive integers. An empty list, an
        // invalid value and a wildcard therefore all fail closed.
        return in_array($seller->id, (array) config('vista360.test_checkout_allowed_seller_ids', []), true);
    }

    private function activePrice(Vista360Plan $plan, int $durationMonths, bool $requireActive = true): Vista360PlanPrice
    {
        $price = $plan->prices()
            ->when($requireActive, fn ($q) => $q->where('is_active', true))
            ->where('duration_months', $durationMonths)
            ->where(fn ($q) => $q->whereNull('available_from')->orWhere('available_from', '<=', now()))
            ->where(fn ($q) => $q->whereNull('available_until')->orWhere('available_until', '>=', now()))
            ->orderByDesc('version')
            ->first();
        if (! $price) {
            throw ValidationException::withMessages(['duration_months' => 'This billing duration is unavailable for the selected plan.']);
        }
        return $price;
    }

    /** @return array<string,mixed> */
    private function planSnapshot(Vista360Plan $plan): array
    {
        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'description' => $plan->description,
            'display_details' => $plan->display_details,
        ];
    }

    /** @return array<int,array<string,mixed>> */
    private function featuresSnapshot(Vista360Plan $plan): array
    {
        $plan->loadMissing('features');
        return $plan->features
            ->where('is_active', true)
            ->sortBy('sort_order')
            ->values()
            ->map(fn ($feature) => [
                'key' => $feature->feature_key,
                'title' => $feature->title,
                'description' => $feature->description,
                'value' => $feature->value,
            ])->all();
    }

    /** @return array<string,mixed> */
    private function priceSnapshot(Vista360PlanPrice $price): array
    {
        return [
            'price_id' => $price->id,
            'duration_months' => $price->duration_months,
            'amount_cents' => $price->amount_cents,
            'currency' => strtoupper($price->currency),
            'version' => $price->version,
        ];
    }

    /** @return array<string,mixed> */
    public function subscriptionPayload(Vista360Subscription $subscription): array
    {
        $subscription->loadMissing(['payments' => fn ($q) => $q->latest(), 'events' => fn ($q) => $q->latest('occurred_at')]);
        return [
            'id' => $subscription->uuid,
            'status' => $subscription->status,
            'source' => $subscription->source,
            'plan' => $subscription->plan_snapshot,
            'features' => $subscription->features_snapshot,
            'price' => $subscription->price_snapshot,
            'starts_at' => $subscription->starts_at?->toIso8601String(),
            'expires_at' => $subscription->expires_at?->toIso8601String(),
            'activated_at' => $subscription->activated_at?->toIso8601String(),
            'cancelled_at' => $subscription->cancelled_at?->toIso8601String(),
            'suspended_at' => $subscription->suspended_at?->toIso8601String(),
            'expired_at' => $subscription->expired_at?->toIso8601String(),
            'status_reason' => $subscription->status_reason,
            'entitlement_version' => $subscription->entitlement_version,
            'payments' => $subscription->payments->map(fn ($payment) => [
                'id' => $payment->uuid,
                'provider' => $payment->provider,
                'status' => $payment->status,
                'amount_cents' => $payment->amount_cents,
                'currency' => strtoupper($payment->currency),
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'created_at' => $payment->created_at?->toIso8601String(),
            ])->values(),
            'history' => $subscription->events->map(fn ($event) => [
                'event' => $event->event,
                'data' => $event->data,
                'occurred_at' => $event->occurred_at?->toIso8601String(),
            ])->values(),
        ];
    }

    private function stripe(): PendingRequest
    {
        abort_unless(config('services.stripe.secret'), 503, 'Stripe is not configured for Vista Express 360 payments.');
        return Http::withToken(config('services.stripe.secret'))->asForm()->timeout(20);
    }

    private function assertReturnUrl(string $url): void
    {
        $parts = parse_url($url);
        $origin = ($parts['scheme'] ?? '').'://'.($parts['host'] ?? '');
        if (! empty($parts['port'])) {
            $origin .= ':'.$parts['port'];
        }
        abort_unless(in_array($origin, config('vista360.checkout_return_origins', []), true), 422, 'Unsupported checkout return origin.');
    }

    private function activatePaidPayment(Vista360SubscriptionPayment $payment, array $session, ?string $externalEventId = null): Vista360Subscription
    {
        $subscription = DB::transaction(function () use ($payment, $session, $externalEventId) {
            $payment = Vista360SubscriptionPayment::lockForUpdate()->findOrFail($payment->id);
            $subscription = Vista360Subscription::lockForUpdate()->findOrFail($payment->vista360_subscription_id);
            $metadata = is_array($session['metadata'] ?? null) ? $session['metadata'] : [];
            $valid = ($session['payment_status'] ?? '') === 'paid'
                && ($session['status'] ?? '') === 'complete'
                && ($session['mode'] ?? '') === 'payment'
                && strtolower((string) ($session['currency'] ?? '')) === strtolower($payment->currency)
                && (int) ($session['amount_total'] ?? -1) === (int) $payment->amount_cents
                && ($metadata['type'] ?? '') === 'vista360_subscription'
                && ($metadata['subscription_uuid'] ?? '') === $subscription->uuid
                && ($metadata['payment_uuid'] ?? '') === $payment->uuid
                && (string) ($metadata['seller_id'] ?? '') === (string) $payment->seller_id
                && (string) ($metadata['store_id'] ?? '') === (string) $payment->store_id;
            if (! $valid) {
                throw ValidationException::withMessages(['stripe_session_id' => 'A completed payment for this Vista Express 360 subscription is required.']);
            }
            if ($payment->status === 'paid') {
                return $subscription;
            }
            $status = $subscription->starts_at?->isFuture() ? Vista360Subscription::SCHEDULED : Vista360Subscription::ACTIVE;
            $payment->update([
                'status' => 'paid',
                'provider_session_id' => $session['id'] ?? $payment->provider_session_id,
                'provider_payment_id' => $session['payment_intent'] ?? $payment->provider_payment_id,
                'provider_payload' => Arr::only($session, ['id', 'payment_intent', 'payment_status', 'status', 'amount_total', 'currency', 'metadata']),
                'paid_at' => now(),
                'failure_code' => null,
                'failure_message' => null,
            ]);
            $subscription->update([
                'status' => $status,
                'activated_at' => $status === Vista360Subscription::ACTIVE ? now() : null,
                'status_reason' => null,
                'entitlement_version' => $subscription->entitlement_version + 1,
            ]);
            $this->event($subscription, 'payment.paid', null, ['payment_id' => $payment->uuid], $externalEventId);
            return $subscription->fresh();
        }, 3);
        if ($subscription->status === Vista360Subscription::ACTIVE) {
            $this->notifyCrm($subscription);
        }
        return $subscription;
    }

    private function markPaymentFailed(Vista360SubscriptionPayment $payment, string $code, string $message, ?string $externalEventId = null): void
    {
        $subscription = DB::transaction(function () use ($payment, $code, $message, $externalEventId) {
            $payment = Vista360SubscriptionPayment::lockForUpdate()->find($payment->id);
            if (! $payment || $payment->status === 'paid') {
                return null;
            }
            $subscription = Vista360Subscription::lockForUpdate()->findOrFail($payment->vista360_subscription_id);
            $payment->update(['status' => 'failed', 'failure_code' => $code, 'failure_message' => $message]);
            if ($subscription->status === Vista360Subscription::PENDING) {
                $subscription->update(['status' => Vista360Subscription::PAYMENT_FAILED, 'status_reason' => $message]);
            }
            $this->event($subscription, 'payment.failed', null, ['code' => $code, 'message' => $message], $externalEventId);
            return $subscription->fresh();
        }, 3);
        if ($subscription) {
            $this->notifyCrm($subscription);
        }
    }

    private function event(Vista360Subscription $subscription, string $event, ?int $actorId, array $data, ?string $externalEventId = null): void
    {
        $attributes = [
            'uuid' => (string) Str::uuid(),
            'vista360_subscription_id' => $subscription->id,
            'seller_id' => $subscription->seller_id,
            'store_id' => $subscription->store_id,
            'actor_id' => $actorId,
            'event' => $event,
            'data' => $data,
            'occurred_at' => now(),
        ];

        // Stripe retries a webhook until it receives a successful response.
        // The provider event ID is our idempotency key; locally generated
        // events intentionally receive a fresh UUID every time.
        if ($externalEventId) {
            Vista360SubscriptionEvent::firstOrCreate(
                ['external_event_id' => $externalEventId],
                $attributes,
            );

            return;
        }

        Vista360SubscriptionEvent::create($attributes);
    }

    private function notifyCrm(Vista360Subscription $subscription): void
    {
        $url = config('vista360.crm_webhook_url');
        $secret = config('vista360.crm_webhook_secret');
        if (! is_string($url) || $url === '' || ! is_string($secret) || strlen($secret) < 32) {
            return;
        }
        $seller = User::find($subscription->seller_id);
        $store = Store::find($subscription->store_id);
        if (! $seller || ! $store) {
            return;
        }
        $payload = [
            'event_id' => (string) Str::uuid(),
            'event' => 'vista360.subscription.changed',
            'occurred_at' => now()->toIso8601String(),
            'seller_subject' => (string) $seller->id,
            'store_id' => (string) $store->id,
            'entitlement' => $this->entitlement($seller, $store, false),
        ];
        $body = json_encode($payload, JSON_THROW_ON_ERROR);
        $timestamp = (string) time();
        try {
            Http::timeout(10)->withHeaders([
                'Content-Type' => 'application/json',
                'X-Vista360-Timestamp' => $timestamp,
                'X-Vista360-Signature' => hash_hmac('sha256', $timestamp.'.'.$body, $secret),
            ])->withBody($body, 'application/json')->post($url);
        } catch (\Throwable) {
            // CRM cache refresh is an optimisation. The CRM still checks the
            // signed provider entitlement before it grants a protected API.
        }
    }
}
