<?php

use App\Http\Controllers\Admin\AdminAuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Admin API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    Route::post('/login', [AdminAuthController::class, 'login']);
    
    Route::middleware(['auth:sanctum', 'marketplace.role:admin'])->group(function () {
        Route::post('/logout', [AdminAuthController::class, 'logout']);
    });
});

Route::middleware(['auth:sanctum', 'marketplace.role:admin'])->group(function () {
    Route::get('/live-summary', [\App\Http\Controllers\Admin\AdminLiveSummaryController::class, '__invoke']);
    Route::put('/store-orders/{id}/status', [\App\Http\Controllers\Admin\AdminStoreOrderController::class, 'updateStatus']);
    Route::get('/dashboard', [\App\Http\Controllers\Admin\AdminDashboardController::class, 'index']);
    
    Route::prefix('users')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminUserController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\Admin\AdminUserController::class, 'store']);
        Route::get('/{id}', [\App\Http\Controllers\Admin\AdminUserController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Admin\AdminUserController::class, 'update']);
        Route::delete('/{id}', [\App\Http\Controllers\Admin\AdminUserController::class, 'destroy']);
        Route::post('/{id}/toggle-status', [\App\Http\Controllers\Admin\AdminUserController::class, 'toggleStatus']);
    });

    Route::prefix('sellers')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminSellerController::class, 'index']);
        Route::get('/{id}', [\App\Http\Controllers\Admin\AdminSellerController::class, 'show']);
        Route::post('/{id}/approve', [\App\Http\Controllers\Admin\AdminSellerController::class, 'approve']);
        Route::post('/{id}/reject', [\App\Http\Controllers\Admin\AdminSellerController::class, 'reject']);
    });

    Route::prefix('products')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminProductController::class, 'index']);
        Route::get('/{id}', [\App\Http\Controllers\Admin\AdminProductController::class, 'show']);
        Route::post('/{id}/approve', [\App\Http\Controllers\Admin\AdminProductController::class, 'approve']);
        Route::post('/{id}/reject', [\App\Http\Controllers\Admin\AdminProductController::class, 'reject']);
        Route::post('/{id}/toggle-active', [\App\Http\Controllers\Admin\AdminProductController::class, 'toggleActive']);
        Route::post('/{id}/toggle-mute', [\App\Http\Controllers\Admin\AdminProductController::class, 'toggleMute']);
        Route::post('/{id}/toggle-boost', [\App\Http\Controllers\Admin\AdminProductController::class, 'toggleBoost']);
        Route::post('/{id}/approve-boost', [\App\Http\Controllers\Admin\AdminProductController::class, 'approveBoost']);
        Route::delete('/{id}', [\App\Http\Controllers\Admin\AdminProductController::class, 'destroy']);
    });

    Route::prefix('orders')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminOrderController::class, 'index']);
        Route::get('/{id}', [\App\Http\Controllers\Admin\AdminOrderController::class, 'show']);
        Route::put('/{id}/status', [\App\Http\Controllers\Admin\AdminOrderController::class, 'updateStatus']);
    });

    Route::prefix('categories')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminCategoryController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\Admin\AdminCategoryController::class, 'store']);
        Route::get('/{id}', [\App\Http\Controllers\Admin\AdminCategoryController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Admin\AdminCategoryController::class, 'update']);
        Route::delete('/{id}', [\App\Http\Controllers\Admin\AdminCategoryController::class, 'destroy']);
    });

    Route::prefix('coupons')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminCouponController::class, 'index']);
        Route::get('/{id}', [\App\Http\Controllers\Admin\AdminCouponController::class, 'show']);
        Route::get('/{id}/usage-history', [\App\Http\Controllers\Admin\AdminCouponController::class, 'usageHistory']);
        Route::get('/{id}/audit-history', [\App\Http\Controllers\Admin\AdminCouponController::class, 'auditHistory']);
        Route::post('/{id}/toggle-status', [\App\Http\Controllers\Admin\AdminCouponController::class, 'toggleStatus']);
        Route::post('/{id}/disable', [\App\Http\Controllers\Admin\AdminCouponController::class, 'disable']);
        Route::post('/{id}/enable', [\App\Http\Controllers\Admin\AdminCouponController::class, 'enable']);
        Route::delete('/{id}', [\App\Http\Controllers\Admin\AdminCouponController::class, 'destroy']);
    });

    Route::prefix('analytics')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminAnalyticsController::class, 'index']);
    });

    Route::prefix('settings')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminSettingsController::class, 'index']);
        Route::put('/', [\App\Http\Controllers\Admin\AdminSettingsController::class, 'update']);
    });

    Route::prefix('activity-logs')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminActivityLogController::class, 'index']);
    });
    
    Route::prefix('points')->group(function () {
        Route::get('/rules', [\App\Http\Controllers\Admin\AdminPointsController::class, 'getRules']);
        Route::post('/rules', [\App\Http\Controllers\Admin\AdminPointsController::class, 'saveRule']);
        Route::put('/rules/{id}', [\App\Http\Controllers\Admin\AdminPointsController::class, 'saveRule']);
        Route::get('/transactions', [\App\Http\Controllers\Admin\AdminPointsController::class, 'getTransactions']);
    });

    Route::prefix('referrals')->group(function () {
        Route::get('/settings', [\App\Http\Controllers\Admin\AdminReferralController::class, 'settings']);
        Route::put('/settings', [\App\Http\Controllers\Admin\AdminReferralController::class, 'updateSettings']);
        Route::get('/campaigns', [\App\Http\Controllers\Admin\AdminReferralController::class, 'campaigns']);
        Route::post('/campaigns/{id}/action', [\App\Http\Controllers\Admin\AdminReferralController::class, 'campaignAction']);
        Route::get('/conversions', [\App\Http\Controllers\Admin\AdminReferralController::class, 'conversions']);
        Route::get('/rewards', [\App\Http\Controllers\Admin\AdminReferralController::class, 'rewards']);
        Route::post('/rewards/{id}/action', [\App\Http\Controllers\Admin\AdminReferralController::class, 'rewardAction']);
        Route::get('/audit', [\App\Http\Controllers\Admin\AdminReferralController::class, 'audit']);
        Route::get('/export', [\App\Http\Controllers\Admin\AdminReferralController::class, 'export']);
    });

    Route::prefix('store-chat')->group(function () {
        Route::get('/unread-count', [\App\Http\Controllers\Admin\AdminStoreChatController::class, 'unreadCount']);
        Route::get('/conversations', [\App\Http\Controllers\Admin\AdminStoreChatController::class, 'index']);
        Route::post('/conversations', [\App\Http\Controllers\Admin\AdminStoreChatController::class, 'startConversation']);
        Route::get('/conversations/{id}', [\App\Http\Controllers\Admin\AdminStoreChatController::class, 'show']);
        Route::get('/conversations/{id}/messages', [\App\Http\Controllers\Admin\AdminStoreChatController::class, 'messages']);
        Route::post('/conversations/{id}/messages', [\App\Http\Controllers\Admin\AdminStoreChatController::class, 'storeMessage']);
    });

    Route::prefix('support/tickets')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminSupportTicketController::class, 'index']);
        Route::get('/{id}', [\App\Http\Controllers\Admin\AdminSupportTicketController::class, 'show']);
        Route::post('/{id}/messages', [\App\Http\Controllers\Admin\AdminSupportTicketController::class, 'reply']);
        Route::put('/{id}', [\App\Http\Controllers\Admin\AdminSupportTicketController::class, 'update']);
    });
    Route::get('/support/messages/{id}/attachment', [\App\Http\Controllers\Support\SupportAttachmentController::class, 'show']);

    Route::prefix('store-reports')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminStoreReportController::class, 'index']);
        Route::get('/{id}', [\App\Http\Controllers\Admin\AdminStoreReportController::class, 'show']);
        Route::post('/{id}/status', [\App\Http\Controllers\Admin\AdminStoreReportController::class, 'updateStatus']);
    });

    Route::prefix('store-banners')->group(function () {
        Route::get('/', [\App\Http\Controllers\Admin\AdminStoreBannerController::class, 'index']);
        Route::get('/{id}', [\App\Http\Controllers\Admin\AdminStoreBannerController::class, 'show']);
        Route::post('/{id}/approve', [\App\Http\Controllers\Admin\AdminStoreBannerController::class, 'approve']);
        Route::post('/{id}/reject', [\App\Http\Controllers\Admin\AdminStoreBannerController::class, 'reject']);
        Route::post('/{id}/toggle-active', [\App\Http\Controllers\Admin\AdminStoreBannerController::class, 'toggleActive']);
        Route::delete('/{id}', [\App\Http\Controllers\Admin\AdminStoreBannerController::class, 'destroy']);
    });
});

Route::middleware(['auth:sanctum', 'marketplace.role:admin'])->prefix('finance')->group(function () {
    Route::get('/seller-wallets', [\App\Http\Controllers\Admin\AdminFinanceController::class, 'wallets']);
    Route::get('/seller-wallets/{storeId}', [\App\Http\Controllers\Admin\AdminFinanceController::class, 'wallet']);
    Route::get('/seller-transactions', [\App\Http\Controllers\Admin\AdminFinanceController::class, 'entries']);
    Route::get('/platform-revenue', [\App\Http\Controllers\Admin\AdminFinanceController::class, 'platformRevenue']);
    Route::get('/buyer-transactions', [\App\Http\Controllers\Admin\AdminFinanceController::class, 'buyers']);
    Route::get('/withdrawals', [\App\Http\Controllers\Admin\AdminFinanceController::class, 'withdrawals']);
    Route::post('/withdrawals/{id}', [\App\Http\Controllers\Admin\AdminFinanceController::class, 'updateWithdrawal']);
});
