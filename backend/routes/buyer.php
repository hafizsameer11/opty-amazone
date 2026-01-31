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
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [BuyerAuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->prefix('profile')->group(function () {
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
});

Route::middleware('auth:sanctum')->prefix('addresses')->group(function () {
    Route::get('/', [BuyerAddressController::class, 'index']);
    Route::get('/{id}', [BuyerAddressController::class, 'show']);
    Route::post('/', [BuyerAddressController::class, 'store']);
    Route::put('/{id}', [BuyerAddressController::class, 'update']);
    Route::delete('/{id}', [BuyerAddressController::class, 'destroy']);
    Route::post('/{id}/set-default', [BuyerAddressController::class, 'setDefault']);
});

Route::middleware('auth:sanctum')->prefix('stores')->group(function () {
    Route::get('/followed', [BuyerStoreController::class, 'getFollowedStores']);
    Route::post('/{id}/follow', [BuyerStoreController::class, 'followStore']);
    Route::post('/{id}/unfollow', [BuyerStoreController::class, 'unfollowStore']);
    Route::get('/{id}/reviews', [BuyerStoreController::class, 'getStoreReviews']);
    Route::post('/{id}/reviews', [BuyerStoreController::class, 'createReview']);
});

// Product routes (public - no authentication required)
Route::prefix('product')->group(function () {
    Route::get('/get-all', [BuyerProductController::class, 'getAll']);
    Route::get('/product-details/{id}', [BuyerProductController::class, 'getDetails']);
    Route::get('/categories/{categorySlug}/products', [BuyerProductController::class, 'getByCategory']);
});

// Cart routes
Route::middleware('auth:sanctum')->prefix('cart')->group(function () {
    Route::get('/', [BuyerCartController::class, 'index']);
    Route::post('/items', [BuyerCartController::class, 'addItem']);
    Route::put('/items/{id}', [BuyerCartController::class, 'updateItem']);
    Route::delete('/items/{id}', [BuyerCartController::class, 'removeItem']);
    Route::post('/clear', [BuyerCartController::class, 'clear']);
});

// Checkout routes
Route::middleware('auth:sanctum')->prefix('checkout')->group(function () {
    Route::post('/preview', [BuyerCheckoutController::class, 'preview']);
    Route::post('/place', [BuyerCheckoutController::class, 'place']);
});

// Order routes
Route::middleware('auth:sanctum')->prefix('orders')->group(function () {
    Route::get('/', [BuyerOrderController::class, 'index']);
    Route::get('/{id}', [BuyerOrderController::class, 'show']);
    Route::get('/{orderId}/payment-info', [BuyerOrderController::class, 'paymentInfo']);
});

// Store order routes
Route::middleware('auth:sanctum')->prefix('store-orders')->group(function () {
    Route::get('/', [BuyerOrderController::class, 'storeOrders']);
    Route::get('/{id}', [BuyerOrderController::class, 'showStoreOrder']);
    Route::post('/{storeOrderId}/pay', [BuyerOrderController::class, 'payStoreOrder']);
    Route::post('/{storeOrderId}/cancel', [BuyerOrderController::class, 'cancelStoreOrder']);
});

// Wallet routes
Route::middleware('auth:sanctum')->prefix('wallet')->group(function () {
    Route::get('/balance', [BuyerWalletController::class, 'getBalance']);
    Route::get('/transactions', [BuyerWalletController::class, 'getTransactions']);
    Route::post('/create-checkout-session', [BuyerWalletController::class, 'createCheckoutSession']);
    Route::post('/top-up', [BuyerWalletController::class, 'topUp']);
    Route::post('/withdraw', [BuyerWalletController::class, 'withdraw']);
});
