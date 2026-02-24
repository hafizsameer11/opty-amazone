<?php

use App\Http\Controllers\Seller\SellerAuthController;
use App\Http\Controllers\Seller\SellerUserController;
use App\Http\Controllers\Seller\Store\SellerStoreController;
use App\Http\Controllers\Seller\Store\SellerStoreSettingsController;
use App\Http\Controllers\Seller\Store\SellerStoreSocialLinksController;
use App\Http\Controllers\Seller\Store\SellerStoreUsersController;
use App\Http\Controllers\Seller\SellerOrderController;
use App\Http\Controllers\Seller\SellerProductController;
use App\Http\Controllers\Seller\FrameSizeController;
use App\Http\Controllers\Seller\SellerPromotionController;
use App\Http\Controllers\Seller\SellerCouponController;
use App\Http\Controllers\Seller\SellerAnnouncementController;
use App\Http\Controllers\Seller\SellerBannerController;
use App\Http\Controllers\Seller\SellerSubscriptionController;
use App\Http\Controllers\Seller\CategoryLensConfigController;
use App\Http\Controllers\Seller\CategoryFieldConfigController;
use App\Http\Controllers\Seller\PrescriptionDropdownController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Seller API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    Route::post('/register', [SellerAuthController::class, 'register']);
    Route::post('/login', [SellerAuthController::class, 'login']);
    Route::post('/forgot-password', [SellerAuthController::class, 'forgotPassword']);
    
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [SellerAuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->prefix('profile')->group(function () {
    Route::get('/', [SellerUserController::class, 'getProfile']);
    Route::put('/', [SellerUserController::class, 'updateProfile']);
    Route::post('/change-password', [SellerUserController::class, 'changePassword']);
    Route::post('/upload-image', [SellerUserController::class, 'uploadProfileImage']);
    Route::delete('/image', [SellerUserController::class, 'deleteProfileImage']);
    Route::post('/verify-email/send', [SellerUserController::class, 'sendEmailVerification']);
    Route::post('/verify-email', [SellerUserController::class, 'verifyEmail']);
    Route::post('/verify-phone/send', [SellerUserController::class, 'sendPhoneVerification']);
    Route::post('/verify-phone', [SellerUserController::class, 'verifyPhone']);
    Route::delete('/', [SellerUserController::class, 'deleteAccount']);
});

Route::middleware('auth:sanctum')->prefix('store')->group(function () {
    Route::get('/', [SellerStoreController::class, 'getStore']);
    Route::put('/', [SellerStoreController::class, 'updateStore']);
    Route::post('/profile-image', [SellerStoreController::class, 'uploadProfileImage']);
    Route::post('/banner-image', [SellerStoreController::class, 'uploadBannerImage']);
    Route::delete('/profile-image', [SellerStoreController::class, 'deleteProfileImage']);
    Route::delete('/banner-image', [SellerStoreController::class, 'deleteBannerImage']);
    Route::put('/theme', [SellerStoreController::class, 'updateTheme']);
    Route::get('/statistics', [SellerStoreController::class, 'getStatistics']);
    Route::get('/overview', [SellerStoreController::class, 'getOverview']);
    Route::get('/dashboard', [SellerStoreController::class, 'getDashboard']);
    
    Route::prefix('settings')->group(function () {
        Route::get('/', [SellerStoreSettingsController::class, 'getSettings']);
        Route::put('/', [SellerStoreSettingsController::class, 'updateSettings']);
        Route::get('/phone-visibility', [SellerStoreSettingsController::class, 'getPhoneVisibility']);
        Route::put('/phone-visibility', [SellerStoreSettingsController::class, 'updatePhoneVisibility']);
    });
    
    Route::prefix('social-links')->group(function () {
        Route::get('/', [SellerStoreSocialLinksController::class, 'index']);
        Route::post('/', [SellerStoreSocialLinksController::class, 'store']);
        Route::put('/{id}', [SellerStoreSocialLinksController::class, 'update']);
        Route::delete('/{id}', [SellerStoreSocialLinksController::class, 'destroy']);
        Route::post('/{id}/toggle', [SellerStoreSocialLinksController::class, 'toggle']);
    });
    
    Route::prefix('users')->group(function () {
        Route::get('/', [SellerStoreUsersController::class, 'index']);
        Route::post('/', [SellerStoreUsersController::class, 'store']);
        Route::put('/{id}', [SellerStoreUsersController::class, 'update']);
        Route::delete('/{id}', [SellerStoreUsersController::class, 'destroy']);
    });
});

// Product routes
Route::middleware('auth:sanctum')->prefix('products')->group(function () {
    Route::get('/', [SellerProductController::class, 'index']);
    Route::get('/categories', [SellerProductController::class, 'getCategories']);
    Route::post('/', [SellerProductController::class, 'store']);
    Route::post('/upload-image', [SellerProductController::class, 'uploadImage']); // Must be before /{id} route
    Route::post('/{id}/toggle-status', [SellerProductController::class, 'toggleStatus']);
    Route::get('/{id}', [SellerProductController::class, 'show']);
    Route::put('/{id}', [SellerProductController::class, 'update']);
    Route::delete('/{id}', [SellerProductController::class, 'destroy']);
    
    // Variant routes
    Route::get('/{id}/variants', [SellerProductController::class, 'getVariants']);
    Route::post('/{id}/variants', [SellerProductController::class, 'createVariant']);
});

// Product variant routes
Route::middleware('auth:sanctum')->prefix('product-variant')->group(function () {
    Route::put('/{id}', [SellerProductController::class, 'updateVariant']);
    Route::delete('/{id}', [SellerProductController::class, 'deleteVariant']);
    Route::post('/{id}/set-default', [SellerProductController::class, 'setDefaultVariant']);
});

// Frame size routes
Route::middleware('auth:sanctum')->prefix('products/{productId}/frame-sizes')->group(function () {
    Route::get('/', [FrameSizeController::class, 'index']);
    Route::post('/', [FrameSizeController::class, 'store']);
});
Route::middleware('auth:sanctum')->prefix('frame-sizes')->group(function () {
    Route::put('/{id}', [FrameSizeController::class, 'update']);
    Route::delete('/{id}', [FrameSizeController::class, 'destroy']);
});

// Order routes
Route::middleware('auth:sanctum')->prefix('orders')->group(function () {
    Route::get('/', [SellerOrderController::class, 'index']);
    Route::get('/{id}', [SellerOrderController::class, 'show']);
});

// Store order routes
Route::middleware('auth:sanctum')->prefix('store-orders')->group(function () {
    Route::get('/pending', [SellerOrderController::class, 'pending']);
    Route::post('/{id}/accept', [SellerOrderController::class, 'accept']);
    Route::post('/{id}/reject', [SellerOrderController::class, 'reject']);
    Route::post('/{id}/out-for-delivery', [SellerOrderController::class, 'outForDelivery']);
    Route::post('/{id}/delivered', [SellerOrderController::class, 'delivered']);
});

// Promotion routes
Route::middleware('auth:sanctum')->prefix('promotions')->group(function () {
    Route::get('/', [SellerPromotionController::class, 'index']);
    Route::post('/', [SellerPromotionController::class, 'store']);
    Route::put('/{id}', [SellerPromotionController::class, 'update']);
    Route::delete('/{id}', [SellerPromotionController::class, 'destroy']);
    Route::post('/{id}/pause', [SellerPromotionController::class, 'pause']);
    Route::post('/{id}/resume', [SellerPromotionController::class, 'resume']);
});

// Coupon routes
Route::middleware('auth:sanctum')->prefix('coupons')->group(function () {
    Route::get('/', [SellerCouponController::class, 'index']);
    Route::post('/', [SellerCouponController::class, 'store']);
    Route::get('/{id}', [SellerCouponController::class, 'show']);
    Route::put('/{id}', [SellerCouponController::class, 'update']);
    Route::delete('/{id}', [SellerCouponController::class, 'destroy']);
    Route::post('/{id}/toggle-status', [SellerCouponController::class, 'toggleStatus']);
});

// Announcement routes
Route::middleware('auth:sanctum')->prefix('announcements')->group(function () {
    Route::get('/', [SellerAnnouncementController::class, 'index']);
    Route::post('/', [SellerAnnouncementController::class, 'store']);
    Route::put('/{id}', [SellerAnnouncementController::class, 'update']);
    Route::delete('/{id}', [SellerAnnouncementController::class, 'destroy']);
    Route::post('/{id}/toggle', [SellerAnnouncementController::class, 'toggle']);
});

// Banner routes
Route::middleware('auth:sanctum')->prefix('banners')->group(function () {
    Route::get('/', [SellerBannerController::class, 'index']);
    Route::post('/', [SellerBannerController::class, 'store']);
    Route::put('/{id}', [SellerBannerController::class, 'update']);
    Route::delete('/{id}', [SellerBannerController::class, 'destroy']);
    Route::post('/{id}/toggle', [SellerBannerController::class, 'toggle']);
    Route::post('/reorder', [SellerBannerController::class, 'reorder']);
});

// Subscription routes
Route::middleware('auth:sanctum')->prefix('subscription')->group(function () {
    Route::get('/plans', [SellerSubscriptionController::class, 'getPlans']);
    Route::get('/current', [SellerSubscriptionController::class, 'getCurrent']);
    Route::post('/subscribe', [SellerSubscriptionController::class, 'subscribe']);
    Route::post('/cancel', [SellerSubscriptionController::class, 'cancel']);
    Route::get('/features', [SellerSubscriptionController::class, 'getFeatures']);
});

// Category Lens Configuration routes
Route::middleware('auth:sanctum')->prefix('category-lens-config')->group(function () {
    Route::get('/', [CategoryLensConfigController::class, 'index']);
    Route::get('/{categoryId}', [CategoryLensConfigController::class, 'show']);
    Route::put('/{categoryId}', [CategoryLensConfigController::class, 'update']);
});

// Category Field Configuration routes
Route::middleware('auth:sanctum')->prefix('category-field-configs')->group(function () {
    Route::get('/', [CategoryFieldConfigController::class, 'index']);
    Route::get('/{categoryId}', [CategoryFieldConfigController::class, 'show']);
    Route::put('/{categoryId}', [CategoryFieldConfigController::class, 'update']);
    Route::get('/{categoryId}/fields', [CategoryFieldConfigController::class, 'getFieldsForCategory']);
});

// Prescription Dropdown Configuration routes
Route::middleware('auth:sanctum')->prefix('prescription-dropdowns')->group(function () {
    Route::get('/', [PrescriptionDropdownController::class, 'index']);
    Route::get('/{categoryId}', [PrescriptionDropdownController::class, 'show']);
    Route::post('/{categoryId}', [PrescriptionDropdownController::class, 'store']);
    Route::delete('/{id}', [PrescriptionDropdownController::class, 'destroy']);
});
