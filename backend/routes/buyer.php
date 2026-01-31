<?php

use App\Http\Controllers\Buyer\BuyerAuthController;
use App\Http\Controllers\Buyer\BuyerAddressController;
use App\Http\Controllers\Buyer\BuyerStoreController;
use App\Http\Controllers\Buyer\BuyerUserController;
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
