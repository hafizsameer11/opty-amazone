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
use App\Http\Controllers\Seller\SellerProductPrescriptionDropdownController;
use App\Http\Controllers\Seller\SellerStoreChatController;
use App\Http\Controllers\Seller\SellerAdminChatController;
use App\Http\Controllers\Seller\SellerNotificationBadgeController;
use App\Http\Controllers\Seller\SellerReviewController;
use App\Http\Controllers\Support\SupportTicketController;
use App\Http\Controllers\Notifications\NotificationController;
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
    
    Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->group(function () {
        Route::post('/logout', [SellerAuthController::class, 'logout']);
    });
});

Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::get('/unread-count', [NotificationController::class, 'unread']);
    Route::post('/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('/{id}/read', [NotificationController::class, 'markRead']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('profile')->group(function () {
    Route::get('/', [SellerUserController::class, 'getProfile']);
    Route::put('/', [SellerUserController::class, 'updateProfile']);
    Route::post('/change-password', [SellerUserController::class, 'changePassword']);
    Route::post('/upload-image', [SellerUserController::class, 'uploadProfileImage']);
    Route::delete('/image', [SellerUserController::class, 'deleteProfileImage']);
    Route::get('/reviews', [SellerReviewController::class, 'index']);
    Route::post('/verify-email/send', [SellerUserController::class, 'sendEmailVerification']);
    Route::post('/verify-email', [SellerUserController::class, 'verifyEmail']);
    Route::post('/verify-phone/send', [SellerUserController::class, 'sendPhoneVerification']);
    Route::post('/verify-phone', [SellerUserController::class, 'verifyPhone']);
    Route::delete('/', [SellerUserController::class, 'deleteAccount']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('support')->group(function () {
    Route::get('/tickets', [SupportTicketController::class, 'index']);
    Route::post('/tickets', [SupportTicketController::class, 'store']);
    Route::get('/tickets/{id}', [SupportTicketController::class, 'show']);
    Route::post('/tickets/{id}/messages', [SupportTicketController::class, 'reply']);
    Route::post('/tickets/{id}/close', [SupportTicketController::class, 'close']);
    Route::post('/tickets/{id}/reopen', [SupportTicketController::class, 'reopen']);
    Route::get('/messages/{id}/attachment', [\App\Http\Controllers\Support\SupportAttachmentController::class, 'show']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('store')->group(function () {
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
    Route::get('/followers', [SellerStoreController::class, 'getFollowers']);
    
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
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('products')->group(function () {
    Route::get('/', [SellerProductController::class, 'index']);
    Route::get('/categories', [SellerProductController::class, 'getCategories']);
    Route::get('/suggest-sku', [SellerProductController::class, 'suggestSku']);
    Route::post('/', [SellerProductController::class, 'store']);
    Route::post('/upload-image', [SellerProductController::class, 'uploadImage']); // Must be before /{id} route
    Route::post('/{id}/toggle-status', [SellerProductController::class, 'toggleStatus']);
    Route::post('/{id}/toggle-mute', [SellerProductController::class, 'toggleMute']);
    Route::post('/{id}/boost', [SellerProductController::class, 'boost']);
    Route::post('/{id}/boost/complete-payment', [SellerProductController::class, 'completeBoostPayment']);
    Route::post('/{id}/toggle-boost', [SellerProductController::class, 'toggleBoost']);
    Route::get('/{id}', [SellerProductController::class, 'show']);
    Route::put('/{id}', [SellerProductController::class, 'update']);
    Route::delete('/{id}', [SellerProductController::class, 'destroy']);
    
    // Variant routes
    Route::get('/{id}/variants', [SellerProductController::class, 'getVariants']);
    Route::post('/{id}/variants', [SellerProductController::class, 'createVariant']);

    // Per-product contact lens prescription dropdowns
    Route::get('/{id}/prescription-dropdowns', [SellerProductPrescriptionDropdownController::class, 'show']);
    Route::post('/{id}/prescription-dropdowns', [SellerProductPrescriptionDropdownController::class, 'store']);
});

// Product variant routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('product-variant')->group(function () {
    Route::put('/{id}', [SellerProductController::class, 'updateVariant']);
    Route::delete('/{id}', [SellerProductController::class, 'deleteVariant']);
    Route::post('/{id}/set-default', [SellerProductController::class, 'setDefaultVariant']);
});

// Frame size routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('products/{productId}/frame-sizes')->group(function () {
    Route::get('/', [FrameSizeController::class, 'index']);
    Route::post('/', [FrameSizeController::class, 'store']);
});
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('frame-sizes')->group(function () {
    Route::put('/{id}', [FrameSizeController::class, 'update']);
    Route::delete('/{id}', [FrameSizeController::class, 'destroy']);
});

// Order routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('orders')->group(function () {
    Route::get('/', [SellerOrderController::class, 'index']);
    Route::get('/{id}', [SellerOrderController::class, 'show']);
});

// This separate supply channel is deliberately not part of Seller → Buyer
// orders, StoreOrders, or their delivery-code process.
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('warehouse')->group(function () {
    Route::get('/products', [\App\Http\Controllers\Seller\SellerWarehouseController::class, 'products']);
    Route::get('/products/{id}', [\App\Http\Controllers\Seller\SellerWarehouseController::class, 'product']);
    Route::get('/cart', [\App\Http\Controllers\Seller\SellerWarehouseController::class, 'cart']);
    Route::post('/cart/items', [\App\Http\Controllers\Seller\SellerWarehouseController::class, 'addCartItem']);
    Route::put('/cart/items/{id}', [\App\Http\Controllers\Seller\SellerWarehouseController::class, 'updateCartItem']);
    Route::delete('/cart/items/{id}', [\App\Http\Controllers\Seller\SellerWarehouseController::class, 'removeCartItem']);
    Route::post('/checkout', [\App\Http\Controllers\Seller\SellerWarehouseController::class, 'checkout']);
    Route::get('/orders', [\App\Http\Controllers\Seller\SellerWarehouseController::class, 'orders']);
    Route::get('/orders/{id}', [\App\Http\Controllers\Seller\SellerWarehouseController::class, 'order']);
});

// Store order routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('store-orders')->group(function () {
    Route::get('/pending', [SellerOrderController::class, 'pending']);
    Route::post('/{id}/accept', [SellerOrderController::class, 'accept']);
    Route::post('/{id}/reject', [SellerOrderController::class, 'reject']);
    Route::post('/{id}/out-for-delivery', [SellerOrderController::class, 'outForDelivery']);
    Route::post('/{id}/delivery-code-request', [SellerOrderController::class, 'requestDeliveryCode']);
    Route::post('/{id}/delivered', [SellerOrderController::class, 'delivered']);
});

// Promotion routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('promotions')->group(function () {
    Route::get('/', [SellerPromotionController::class, 'index']);
    Route::post('/', [SellerPromotionController::class, 'store']);
    Route::put('/{id}', [SellerPromotionController::class, 'update']);
    Route::delete('/{id}', [SellerPromotionController::class, 'destroy']);
    Route::post('/{id}/pause', [SellerPromotionController::class, 'pause']);
    Route::post('/{id}/resume', [SellerPromotionController::class, 'resume']);
});

// Coupon routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('coupons')->group(function () {
    Route::get('/', [SellerCouponController::class, 'index']);
    Route::get('/analytics', [SellerCouponController::class, 'analytics']);
    Route::get('/targets/{type}', [SellerCouponController::class, 'targets'])->whereIn('type', ['products', 'categories', 'variants']);
    Route::post('/', [SellerCouponController::class, 'store']);
    Route::get('/{id}', [SellerCouponController::class, 'show']);
    Route::put('/{id}', [SellerCouponController::class, 'update']);
    Route::delete('/{id}', [SellerCouponController::class, 'destroy']);
    Route::post('/{id}/toggle-status', [SellerCouponController::class, 'toggleStatus']);
    Route::post('/{id}/pause', [SellerCouponController::class, 'pause']);
    Route::post('/{id}/resume', [SellerCouponController::class, 'resume']);
    Route::get('/{id}/usage-history', [SellerCouponController::class, 'usageHistory']);
});

// Referral campaigns are intentionally independent from coupons and promotions.
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('referral-campaigns')->group(function () {
    Route::get('/', [\App\Http\Controllers\Seller\SellerReferralCampaignController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\Seller\SellerReferralCampaignController::class, 'store']);
    Route::get('/{id}', [\App\Http\Controllers\Seller\SellerReferralCampaignController::class, 'show']);
    Route::put('/{id}', [\App\Http\Controllers\Seller\SellerReferralCampaignController::class, 'update']);
    Route::post('/{id}/action', [\App\Http\Controllers\Seller\SellerReferralCampaignController::class, 'action']);
});

// Announcement routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('announcements')->group(function () {
    Route::get('/', [SellerAnnouncementController::class, 'index']);
    Route::post('/', [SellerAnnouncementController::class, 'store']);
    Route::put('/{id}', [SellerAnnouncementController::class, 'update']);
    Route::delete('/{id}', [SellerAnnouncementController::class, 'destroy']);
    Route::post('/{id}/toggle', [SellerAnnouncementController::class, 'toggle']);
});

// Banner routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('banners')->group(function () {
    Route::get('/', [SellerBannerController::class, 'index']);
    Route::post('/', [SellerBannerController::class, 'store']);
    Route::put('/{id}', [SellerBannerController::class, 'update']);
    Route::delete('/{id}', [SellerBannerController::class, 'destroy']);
    Route::post('/{id}/toggle', [SellerBannerController::class, 'toggle']);
    Route::post('/reorder', [SellerBannerController::class, 'reorder']);
});

// Subscription routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('subscription')->group(function () {
    Route::get('/plans', [SellerSubscriptionController::class, 'getPlans']);
    Route::get('/current', [SellerSubscriptionController::class, 'getCurrent']);
    Route::post('/subscribe', [SellerSubscriptionController::class, 'subscribe']);
    Route::post('/cancel', [SellerSubscriptionController::class, 'cancel']);
    Route::get('/features', [SellerSubscriptionController::class, 'getFeatures']);
});

// Category Lens Configuration routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('category-lens-config')->group(function () {
    Route::get('/', [CategoryLensConfigController::class, 'index']);
    Route::get('/{categoryId}', [CategoryLensConfigController::class, 'show']);
    Route::put('/{categoryId}', [CategoryLensConfigController::class, 'update']);
});

// Category Field Configuration routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('category-field-configs')->group(function () {
    Route::get('/', [CategoryFieldConfigController::class, 'index']);
    Route::get('/{categoryId}', [CategoryFieldConfigController::class, 'show']);
    Route::put('/{categoryId}', [CategoryFieldConfigController::class, 'update']);
    Route::get('/{categoryId}/fields', [CategoryFieldConfigController::class, 'getFieldsForCategory']);
});

// Prescription Dropdown Configuration routes
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('prescription-dropdowns')->group(function () {
    Route::get('/', [PrescriptionDropdownController::class, 'index']);
    Route::get('/{categoryId}', [PrescriptionDropdownController::class, 'show']);
    Route::post('/{categoryId}', [PrescriptionDropdownController::class, 'store']);
    Route::delete('/{id}', [PrescriptionDropdownController::class, 'destroy']);
});

// Buyer–store chat (seller inbox)
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('chat')->group(function () {
    Route::get('/conversations', [SellerStoreChatController::class, 'index']);
    Route::get('/conversations/{id}', [SellerStoreChatController::class, 'show']);
    Route::get('/conversations/{id}/messages', [SellerStoreChatController::class, 'messages']);
    Route::post('/conversations/{id}/messages', [SellerStoreChatController::class, 'storeMessage']);
});

// Seller ↔ Vista Express Admin chat
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('admin-chat')->group(function () {
    Route::get('/', [SellerAdminChatController::class, 'show']);
    Route::get('/messages', [SellerAdminChatController::class, 'messages']);
    Route::post('/messages', [SellerAdminChatController::class, 'storeMessage']);
});

// Sidebar notification badges (messages + pending orders)
Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->get('/notifications/unread', [SellerNotificationBadgeController::class, 'unread']);

Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('inventory')->group(function () {
    Route::get('/low-stock', [App\Http\Controllers\Seller\SellerInventoryController::class, 'lowStock']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->prefix('verification')->group(function () {
    Route::post('/submit', [App\Http\Controllers\Seller\SellerVerificationController::class, 'submit']);
    Route::post('/complete-store-setup', [App\Http\Controllers\Seller\SellerVerificationController::class, 'completeStoreSetup']);
});

Route::middleware(['auth:sanctum', 'marketplace.role:seller'])->group(function () {
    Route::post('/store-orders/{id}/processing', [SellerOrderController::class, 'processing']);
    Route::get('/wallet', [\App\Http\Controllers\Seller\SellerWalletController::class, 'show']);
    Route::get('/wallet/capabilities', [\App\Http\Controllers\Seller\SellerWalletController::class, 'capabilities']);
    Route::post('/wallet/top-ups', [\App\Http\Controllers\Seller\SellerWalletController::class, 'topUp'])->middleware('throttle:20,1');
    Route::get('/wallet/transactions', [\App\Http\Controllers\Seller\SellerWalletController::class, 'transactions']);
    Route::get('/wallet/withdrawals', [\App\Http\Controllers\Seller\SellerWalletController::class, 'withdrawals']);
    Route::post('/wallet/withdrawals', [\App\Http\Controllers\Seller\SellerWalletController::class, 'withdraw'])->middleware('throttle:20,1');
});
