<?php

namespace App\Services\Email;

use App\Mail\MarketplaceTransactionalMail;
use App\Models\Order;
use App\Models\SellerWallet;
use App\Models\SellerWalletEntry;
use App\Models\StoreOrder;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * One delivery point for every marketplace email.  Individual features only
 * supply event data; SMTP configuration and the brand layout stay central.
 */
class MarketplaceEmailService
{
    public function buyerVerificationCode(User $buyer, string $code, Carbon $expiresAt): bool
    {
        return $this->send($buyer, new MarketplaceTransactionalMail(
            'Verify your VistaExpress email address',
            'Verify your email address',
            'Use the verification code below to finish creating your buyer account.',
            ['Code expires' => $expiresAt->timezone(config('app.timezone'))->format('d M Y, H:i'), 'Validity' => '15 minutes'],
            ctaLabel: 'Open VistaExpress', ctaUrl: $this->buyerUrl('/auth/verify-email'),
            notice: 'For your security, never share this code with anyone.', code: $code, recipientName: $buyer->name,
        ));
    }

    public function buyerWelcome(User $buyer): void
    {
        $this->send($buyer, new MarketplaceTransactionalMail(
            'Welcome to VistaExpress', 'Welcome to VistaExpress',
            'Your email is verified and your buyer account is ready. Discover optical products, follow stores, and keep every order in one place.',
            ctaLabel: 'Start shopping', ctaUrl: $this->buyerUrl('/'), recipientName: $buyer->name,
        ));
    }

    public function sellerApproved(User $seller): void
    {
        $this->send($seller, new MarketplaceTransactionalMail(
            'Your VistaExpress seller account is approved', 'Your seller account is approved',
            'Welcome to VistaExpress. Your store can now be completed and prepared for selling.',
            ['Next step' => 'Complete your store profile', 'Then' => 'Add products and start managing orders'],
            ctaLabel: 'Open Seller Hub', ctaUrl: $this->sellerUrl('/dashboard?setup=1'), recipientName: $seller->name,
        ));
    }

    public function orderPlacedBuyer(Order $order): void
    {
        $order->loadMissing('user', 'storeOrders.items', 'storeOrders.store');
        $this->send($order->user, new MarketplaceTransactionalMail(
            "Order {$order->order_no} received", 'Thank you for your order',
            'We have received your order. Each store will review its items and provide any required shipping quote.',
            $this->orderDetails($order), $this->items($order->storeOrders->flatMap->items),
            'View your orders', $this->buyerUrl("/orders/{$order->id}"), recipientName: $order->user?->name,
        ));
    }

    public function orderPlacedSeller(StoreOrder $storeOrder): void
    {
        $storeOrder->loadMissing('order.user', 'store.user', 'items');
        $buyer = $storeOrder->order?->user;
        $this->send($storeOrder->store?->user, new MarketplaceTransactionalMail(
            "New order {$storeOrder->order?->order_no}", 'A buyer placed an order',
            'A new order is ready for your review. Add a shipping quote when you are ready.',
            $this->storeOrderDetails($storeOrder) + [
                'Buyer' => $buyer?->name, 'Buyer email' => $buyer?->email, 'Buyer phone' => $buyer?->phone,
                'Delivery address' => $this->address($storeOrder),
            ], $this->items($storeOrder->items), 'Review order', $this->sellerUrl("/orders/{$storeOrder->id}"), recipientName: $storeOrder->store?->user?->name,
        ));
    }

    public function shippingFeeAdded(StoreOrder $storeOrder): void
    {
        $storeOrder->loadMissing('order.user', 'store', 'items');
        $this->send($storeOrder->order?->user, new MarketplaceTransactionalMail(
            "Shipping quote added for {$storeOrder->order?->order_no}", 'Your order is ready for payment',
            'The seller has added the shipping fee. Review the updated total and complete payment to begin fulfillment.',
            $this->storeOrderDetails($storeOrder), $this->items($storeOrder->items),
            'Review and pay', $this->buyerUrl("/store-orders/{$storeOrder->id}"), recipientName: $storeOrder->order?->user?->name,
        ));
    }

    public function paymentReceivedSeller(StoreOrder $storeOrder): void
    {
        $storeOrder->loadMissing('order.user', 'store.user', 'items', 'payment');
        $this->send($storeOrder->store?->user, new MarketplaceTransactionalMail(
            "Payment received for {$storeOrder->order?->order_no}", 'Buyer payment confirmed',
            'The buyer has successfully paid. Funds are securely held while you fulfil this order.',
            $this->storeOrderDetails($storeOrder) + ['Payment status' => 'Paid'], $this->items($storeOrder->items),
            'Manage fulfilment', $this->sellerUrl("/orders/{$storeOrder->id}"), recipientName: $storeOrder->store?->user?->name,
        ));
    }

    public function paymentReceiptBuyer(StoreOrder $storeOrder): void
    {
        $storeOrder->loadMissing('order.user', 'store', 'items');
        $this->send($storeOrder->order?->user, new MarketplaceTransactionalMail(
            "Payment confirmed for {$storeOrder->order?->order_no}", 'Your payment was successful',
            'Your payment has been confirmed. The seller can now prepare your order for delivery.',
            $this->storeOrderDetails($storeOrder), $this->items($storeOrder->items),
            'Track your order', $this->buyerUrl("/store-orders/{$storeOrder->id}"), recipientName: $storeOrder->order?->user?->name,
        ));
    }

    public function deliveryCodeRequested(StoreOrder $storeOrder, string $code): void
    {
        $storeOrder->loadMissing('order.user', 'store');
        $this->send($storeOrder->order?->user, new MarketplaceTransactionalMail(
            "Delivery code requested for {$storeOrder->order?->order_no}", 'Share your code only after delivery',
            'The seller has requested your delivery confirmation code. Give it to the seller only after you have received the order and checked that it is correct.',
            $this->storeOrderDetails($storeOrder), ctaLabel: 'Open order details', ctaUrl: $this->buyerUrl("/store-orders/{$storeOrder->id}"),
            notice: 'Do not share this code before the order is in your possession.', code: $code, recipientName: $storeOrder->order?->user?->name,
        ));
    }

    /** @param array<string, string|int|float|null> $details */
    public function reviewSubmitted(User $seller, string $reviewType, array $details): void
    {
        $this->send($seller, new MarketplaceTransactionalMail(
            "New {$reviewType} review received", "A new {$reviewType} review was submitted",
            'A buyer has shared feedback about your store. Review it in Seller Hub when convenient.',
            $details, ctaLabel: 'Open Seller Hub', ctaUrl: $this->sellerUrl('/profile?tab=reviews'), recipientName: $seller->name,
        ));
    }

    public function sellerWalletTransaction(User $seller, SellerWalletEntry $entry, SellerWallet $wallet): void
    {
        $balances = (array) $entry->balances_after;
        $this->send($seller, new MarketplaceTransactionalMail(
            'Seller wallet transaction', 'Your seller wallet changed',
            $entry->description ?: 'A transaction was recorded on your seller wallet.',
            [
                'Transaction type' => $this->label($entry->type), 'Amount' => $this->money($entry->amount),
                'Direction' => ((float) $entry->amount >= 0 ? 'Credit' : 'Debit'), 'Reference' => $entry->reference,
                'Available balance' => $this->money($balances['available_balance'] ?? $wallet->available_balance),
                'Status' => 'Completed', 'Date and time' => $entry->created_at?->timezone(config('app.timezone'))->format('d M Y, H:i'),
            ], ctaLabel: 'View wallet', ctaUrl: $this->sellerUrl('/wallet'), recipientName: $seller->name,
        ));
    }

    public function buyerWalletTransaction(User $buyer, Transaction $transaction): void
    {
        $meta = (array) $transaction->meta;
        $this->send($buyer, new MarketplaceTransactionalMail(
            'Buyer wallet transaction', 'Your wallet changed',
            $transaction->description ?: 'A transaction was recorded on your buyer wallet.',
            [
                'Transaction type' => $this->label($transaction->type), 'Amount' => $this->money($transaction->amount),
                'Direction' => ((float) $transaction->amount >= 0 ? 'Credit' : 'Debit'), 'Reference' => $transaction->payment_reference,
                'Previous balance' => isset($meta['balance_before']) ? $this->money($meta['balance_before']) : null,
                'Updated balance' => isset($meta['balance_after']) ? $this->money($meta['balance_after']) : null,
                'Status' => $this->label($transaction->status), 'Date and time' => $transaction->created_at?->timezone(config('app.timezone'))->format('d M Y, H:i'),
            ], ctaLabel: 'View wallet', ctaUrl: $this->buyerUrl('/profile?tab=wallet'), recipientName: $buyer->name,
        ));
    }

    private function send(?User $recipient, MarketplaceTransactionalMail $mail): bool
    {
        if (! $recipient?->email || ! filter_var($recipient->email, FILTER_VALIDATE_EMAIL)) return false;
        $deliver = function () use ($recipient, $mail): bool {
            try {
                Mail::to($recipient->email, $recipient->name)->send($mail);
                return true;
            } catch (\Throwable $exception) {
                Log::error('Marketplace email delivery failed.', ['event' => $mail->subjectLine, 'user_id' => $recipient->id, 'exception' => $exception->getMessage()]);
                return false;
            }
        };
        if (DB::transactionLevel() > 0) {
            DB::afterCommit($deliver);
            return true;
        }
        return $deliver();
    }

    /** @param iterable<\App\Models\OrderItem> $items @return array<int, array<string, string|int|float|null>> */
    private function items(iterable $items): array
    {
        $rows = [];
        foreach ($items as $item) $rows[] = [
            'name' => $item->product_name ?: 'Product', 'sku' => $item->product_sku,
            'quantity' => $item->quantity, 'price' => $this->money($item->price), 'total' => $this->money($item->line_total),
        ];
        return $rows;
    }

    /** @return array<string, string> */
    private function orderDetails(Order $order): array
    {
        return ['Order number' => $order->order_no, 'Items subtotal' => $this->money($order->items_total),
            'Discounts' => $this->money($order->discount_total), 'Total' => $this->money($order->grand_total),
            'Payment status' => $this->label($order->payment_status)];
    }

    /** @return array<string, string> */
    private function storeOrderDetails(StoreOrder $order): array
    {
        return ['Order number' => $order->order?->order_no, 'Store' => $order->store?->name,
            'Items subtotal' => $this->money($order->subtotal), 'Coupon discount' => $this->money($order->coupon_discount),
            'Shipping fee' => $this->money($order->delivery_fee), 'Total' => $this->money($order->total),
            'Order status' => $this->label($order->status)];
    }

    private function address(StoreOrder $order): ?string
    {
        $address = (array) ($order->delivery_address_snapshot ?: $order->order?->delivery_address_snapshot ?: []);
        return $address ? implode(', ', array_filter([$address['full_name'] ?? null, $address['address_line_1'] ?? null, $address['address_line_2'] ?? null, $address['city_name'] ?? null, $address['postal_code'] ?? null, $address['country_name'] ?? null])) : null;
    }

    private function money(mixed $amount): string { return '€'.number_format((float) ($amount ?? 0), 2, '.', ','); }
    private function label(?string $value): string { return ucwords(str_replace(['_', '-'], ' ', (string) $value)); }
    private function buyerUrl(string $path): string { return $this->url((string) (env('BUYER_FRONTEND_URL') ?: config('app.url') ?: 'http://localhost:3000'), $path); }
    private function sellerUrl(string $path): string { return $this->url((string) (env('SELLER_FRONTEND_URL') ?: config('app.url') ?: 'http://localhost:3001'), $path); }
    private function url(string $base, string $path): string { return rtrim($base, '/').'/'.ltrim($path, '/'); }
}
