<?php

use App\Http\Controllers\Seller\SellerAuthController;
use App\Http\Controllers\Seller\SellerUserController;
use App\Http\Controllers\Seller\Store\SellerStoreController;
use App\Http\Controllers\Seller\Store\SellerStoreSettingsController;
use App\Http\Controllers\Seller\Store\SellerStoreSocialLinksController;
use App\Http\Controllers\Seller\Store\SellerStoreUsersController;
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
