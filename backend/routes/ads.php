<?php

use App\Http\Controllers\Ads\AdCampaignController;
use App\Http\Controllers\Ads\AdDeliveryController;
use Illuminate\Support\Facades\Route;

Route::prefix('buyer/ads')->middleware('throttle:120,1')->group(function () {
    Route::get('/', [AdDeliveryController::class, 'index']);
    Route::post('/events', [AdDeliveryController::class, 'event']);
});
foreach (['seller', 'admin'] as $role) {
    Route::prefix($role.'/ad-campaigns')->middleware(['auth:sanctum', 'throttle:120,1'])->group(function () use ($role) {
        Route::get('/', [AdCampaignController::class, 'index']);
        if ($role === 'seller') {
            Route::get('/options', [AdCampaignController::class, 'options']);
            Route::post('/', [AdCampaignController::class, 'store']);
            Route::post('/{campaign}/duplicate', [AdCampaignController::class, 'duplicate']);
            Route::delete('/{campaign}', [AdCampaignController::class, 'destroy']);
        } else {
            Route::get('/{campaign}/audits', [AdCampaignController::class, 'audits']);
        }
        Route::get('/{campaign}', [AdCampaignController::class, 'show']);
        Route::post('/{campaign}/actions', [AdCampaignController::class, 'action']);
        Route::get('/{campaign}/analytics', [AdCampaignController::class, 'analytics']);
        Route::get('/{campaign}/transactions', [AdCampaignController::class, 'transactions']);
    });
}
