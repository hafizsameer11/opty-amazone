<?php

use App\Http\Controllers\Buyer\BuyerAuthController;
use App\Http\Controllers\Buyer\BuyerAddressController;
use App\Http\Controllers\Buyer\BuyerStoreController;
use App\Http\Controllers\Buyer\BuyerUserController;
use App\Http\Controllers\Buyer\BuyerProductController;
use App\Http\Controllers\Buyer\BuyerCartController;
use App\Http\Controllers\Buyer\BuyerCheckoutController;
use App\Http\Controllers\Buyer\BuyerOrderController;
use App\Http\Controllers\Buyer\BuyerWalletController;
use App\Http\Controllers\Buyer\BuyerCouponController;
use App\Http\Controllers\Buyer\BuyerStoreChatController;
use App\Http\Controllers\Buyer\BuyerWishlistController;
use App\Http\Controllers\Buyer\BuyerReviewController;
use App\Http\Controllers\Support\SupportTicketController;
use App\Http\Controllers\Buyer\PrescriptionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Buyer API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    Route::post('/register', [BuyerAuthController::class, 'register']);
    Route::post('/login', [BuyerAuthController::class, 'login']);
    Route::post('/forgot-password', [BuyerAuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [BuyerAuthController::class, 'resetPassword']);
    
    Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->group(function () {
        Route::post('/logout', [BuyerAuthController::class, 'logout']);
    });
});

Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('profile')->group(function () {
    Route::get('/', [BuyerUserController::class, 'getProfile']);
    Route::put('/', [BuyerUserController::class, 'updateProfile']);
    Route::post('/change-password', [BuyerUserController::class, 'changePassword']);
    Route::post('/upload-image', [BuyerUserController::class, 'uploadProfileImage']);
    Route::delete('/image', [BuyerUserController::class, 'deleteProfileImage']);
    Route::post('/verify-email/send', [BuyerUserController::class, 'sendEmailVerification']);
    Route::post('/verify-email', [BuyerUserController::class, 'verifyEmail']);
    Route::post('/verify-phone/send', [BuyerUserController::class, 'sendPhoneVerification']);
    Route::post('/verify-phone', [BuyerUserController::class, 'verifyPhone']);
    Route::delete('/', [BuyerUserController::class, 'deleteAccount']);
    Route::get('/reviews', [BuyerReviewController::class, 'history']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('referrals')->group(function () {
    Route::get('/', [\App\Http\Controllers\Buyer\BuyerReferralController::class, 'dashboard']);
    Route::post('/claim', [\App\Http\Controllers\Buyer\BuyerReferralController::class, 'claim'])->middleware('throttle:20,1');
    Route::get('/attributions/{attribution}', [\App\Http\Controllers\Buyer\BuyerReferralController::class, 'attribution']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('wishlist')->group(function () {
    Route::get('/', [BuyerWishlistController::class, 'index']);
    Route::post('/{productId}', [BuyerWishlistController::class, 'store']);
    Route::delete('/{productId}', [BuyerWishlistController::class, 'destroy']);
    Route::get('/{productId}/status', [BuyerWishlistController::class, 'status']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('support')->group(function () {
    Route::get('/tickets', [SupportTicketController::class, 'index']);
    Route::post('/tickets', [SupportTicketController::class, 'store']);
    Route::get('/tickets/{id}', [SupportTicketController::class, 'show']);
    Route::post('/tickets/{id}/messages', [SupportTicketController::class, 'reply']);
    Route::post('/tickets/{id}/close', [SupportTicketController::class, 'close']);
    Route::post('/tickets/{id}/reopen', [SupportTicketController::class, 'reopen']);
    Route::get('/messages/{id}/attachment', [\App\Http\Controllers\Support\SupportAttachmentController::class, 'show']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('addresses')->group(function () {
    Route::get('/', [BuyerAddressController::class, 'index']);
    Route::get('/{id}', [BuyerAddressController::class, 'show']);
    Route::post('/', [BuyerAddressController::class, 'store']);
    Route::put('/{id}', [BuyerAddressController::class, 'update']);
    Route::delete('/{id}', [BuyerAddressController::class, 'destroy']);
    Route::post('/{id}/set-default', [BuyerAddressController::class, 'setDefault']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('stores')->group(function () {
    Route::get('/followed', [BuyerStoreController::class, 'getFollowedStores']);
    Route::get('/{id}/follow-status', [BuyerStoreController::class, 'followStatus']);
    Route::post('/{id}/follow', [BuyerStoreController::class, 'followStore']);
    Route::post('/{id}/unfollow', [BuyerStoreController::class, 'unfollowStore']);
    Route::get('/{id}/reviews', [BuyerReviewController::class, 'storeIndex']);
    Route::post('/{id}/reviews', [BuyerReviewController::class, 'storeStore']);
    Route::put('/reviews/{id}', [BuyerReviewController::class, 'storeUpdate']);
    Route::delete('/reviews/{id}', [BuyerReviewController::class, 'storeDestroy']);
    Route::post('/{id}/report', [\App\Http\Controllers\Buyer\BuyerStoreReportController::class, 'store']);
    Route::get('/{id}/chat', [BuyerStoreChatController::class, 'show']);
    Route::get('/{id}/chat/messages', [BuyerStoreChatController::class, 'messages']);
    Route::post('/{id}/chat/messages', [BuyerStoreChatController::class, 'storeMessage']);
});

// Product routes (public - no authentication required)
Route::prefix('product')->group(function () {
    Route::get('/get-all', [BuyerProductController::class, 'getAll']);
    Route::get('/flash-offers', [BuyerProductController::class, 'flashOffers']);
    Route::get('/product-details/{id}', [BuyerProductController::class, 'getDetails']);
    Route::get('/categories/{categorySlug}/products', [BuyerProductController::class, 'getByCategory']);
    Route::get('/{id}/reviews', [BuyerReviewController::class, 'productIndex']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('product')->group(function () {
    Route::post('/{id}/reviews', [BuyerReviewController::class, 'productStore']);
    Route::put('/reviews/{id}', [BuyerReviewController::class, 'productUpdate']);
    Route::delete('/reviews/{id}', [BuyerReviewController::class, 'productDestroy']);
});

// Cart routes
Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('cart')->group(function () {
    Route::get('/', [BuyerCartController::class, 'index']);
    Route::get('/items', [BuyerCartController::class, 'index']);
    Route::post('/items', [BuyerCartController::class, 'addItem']);
    Route::put('/items/{id}', [BuyerCartController::class, 'updateItem']);
    Route::delete('/items/{id}', [BuyerCartController::class, 'removeItem']);
    Route::post('/clear', [BuyerCartController::class, 'clear']);
});

// Checkout routes
Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('checkout')->group(function () {
    Route::post('/preview', [BuyerCheckoutController::class, 'preview']);
    Route::post('/place', [BuyerCheckoutController::class, 'place']);
});

// Coupon routes
Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('coupons')->group(function () {
    Route::post('/validate', [BuyerCouponController::class, 'validate']);
});

// Order routes
Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('orders')->group(function () {
    Route::get('/', [BuyerOrderController::class, 'index']);
    Route::get('/{id}', [BuyerOrderController::class, 'show']);
    Route::get('/{orderId}/payment-info', [BuyerOrderController::class, 'paymentInfo']);
});

// Store order routes
Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('store-orders')->group(function () {
    Route::get('/', [BuyerOrderController::class, 'storeOrders']);
    Route::post('/{id}/delivery-code', [BuyerOrderController::class, 'deliveryCode'])->middleware('throttle:5,1');
    Route::post('/{id}/dispute', [BuyerOrderController::class, 'dispute']);
    Route::get('/{id}', [BuyerOrderController::class, 'showStoreOrder']);
    Route::post('/{storeOrderId}/pay', [BuyerOrderController::class, 'payStoreOrder']);
    Route::post('/{storeOrderId}/cancel', [BuyerOrderController::class, 'cancelStoreOrder']);
});

// Prescription routes
Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('prescriptions')->group(function () {
    Route::get('/', [PrescriptionController::class, 'index']);
    Route::post('/', [PrescriptionController::class, 'store']);
    Route::get('/{id}', [PrescriptionController::class, 'show']);
    Route::put('/{id}', [PrescriptionController::class, 'update']);
    Route::delete('/{id}', [PrescriptionController::class, 'destroy']);
});

// Wallet routes
Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('wallet')->group(function () {
    Route::get('/capabilities', [BuyerWalletController::class, 'capabilities']);
    Route::post('/development-top-up', [BuyerWalletController::class, 'developmentTopUp'])->middleware('throttle:20,1');
    Route::get('/balance', [BuyerWalletController::class, 'getBalance']);
    Route::get('/transactions', [BuyerWalletController::class, 'getTransactions']);
    Route::post('/create-checkout-session', [BuyerWalletController::class, 'createCheckoutSession']);
    Route::post('/top-up', [BuyerWalletController::class, 'topUp']);
    Route::post('/withdraw', [BuyerWalletController::class, 'withdraw']);
});

// Points routes
Route::middleware(['auth:sanctum', 'marketplace.role:buyer'])->prefix('points')->group(function () {
    Route::get('/balance', [\App\Http\Controllers\Buyer\BuyerPointsController::class, 'getBalance']);
    Route::get('/transactions', [\App\Http\Controllers\Buyer\BuyerPointsController::class, 'getTransactions']);
    Route::post('/redeem', [\App\Http\Controllers\Buyer\BuyerPointsController::class, 'redeem']);
});
