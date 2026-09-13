<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Campaigns\{DiscountCampaignController, BannerCampaignController, CampaignBuyerController};

foreach (['seller','admin'] as $role) {
    foreach (['discount-campaigns'=>DiscountCampaignController::class,'banner-campaigns'=>BannerCampaignController::class] as $path=>$controller) {
        Route::prefix($role.'/'.$path)->middleware(['auth:sanctum','throttle:120,1'])->group(function () use ($role,$controller) {
            Route::get('/',[$controller,'index']);
            if ($role==='seller') {
                Route::post('/',[$controller,'store']); Route::put('/{campaign}',[$controller,'update']);
                if ($controller===DiscountCampaignController::class) {
                    Route::get('/options',[$controller,'options']); Route::post('/preview',[$controller,'preview']);
                }
            }
            Route::get('/{campaign}',[$controller,'show']); Route::post('/{campaign}/actions',[$controller,'action']);
            Route::get('/{campaign}/analytics',[$controller,'analytics']); Route::get('/{campaign}/audits',[$controller,'audits']);
        });
    }
}
Route::middleware('throttle:120,1')->prefix('buyer/campaigns')->group(function () {
    Route::post('/products/{product}/price',[CampaignBuyerController::class,'price']);
    Route::get('/discounts/{campaign}',[CampaignBuyerController::class,'discount']);
    Route::get('/banners/{placement}',[CampaignBuyerController::class,'banners']);
    Route::post('/banner-events',[CampaignBuyerController::class,'event']);
});
