<?php

use Illuminate\Support\Facades\Route;

require __DIR__.'/ads.php';
require __DIR__.'/commerce-campaigns.php';

Route::middleware('auth:sanctum')->get('/support/messages/{id}/attachment', [App\Http\Controllers\Support\SupportAttachmentController::class, 'show']);

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Geographic routes (public, no authentication required)
Route::prefix('geographic')->group(function () {
    Route::get('/countries', [App\Http\Controllers\Api\GeographicController::class, 'getCountries']);
    Route::get('/countries/{countryId}/states', [App\Http\Controllers\Api\GeographicController::class, 'getStatesByCountry']);
    Route::get('/states/{stateId}/cities', [App\Http\Controllers\Api\GeographicController::class, 'getCitiesByState']);
    Route::get('/countries/{countryId}/states/{stateId}/cities', [App\Http\Controllers\Api\GeographicController::class, 'getCitiesByCountryAndState']);
});

// Public store routes
Route::prefix('stores')->group(function () {
    Route::get('/', [App\Http\Controllers\Api\PublicStoreController::class, 'index']);
    Route::get('/{id}', [App\Http\Controllers\Api\PublicStoreController::class, 'show']);
    Route::get('/{id}/reviews', [App\Http\Controllers\Api\PublicStoreController::class, 'getStoreReviews']);
});

// Public product routes
Route::prefix('products')->group(function () {
    Route::get('/', [App\Http\Controllers\Api\PublicProductController::class, 'index']);
    Route::get('/{id}', [App\Http\Controllers\Api\PublicProductController::class, 'show']);
    Route::get('/{id}/reviews', [App\Http\Controllers\Api\PublicProductController::class, 'reviews']);
});

// Category routes
Route::prefix('categories')->group(function () {
    Route::get('/', [App\Http\Controllers\Api\CategoryController::class, 'index']);
});

// Public banners routes
Route::prefix('banners')->group(function () {
    Route::get('/', [App\Http\Controllers\Api\PublicBannerController::class, 'index']);
});

// Search routes
Route::prefix('search')->group(function () {
    Route::get('/', [App\Http\Controllers\Api\SearchController::class, 'search']);
});

// Public referral visits create a short-lived opaque attribution token. The
// browser stores the token; no raw IP/device identifier is returned or stored.
Route::post('/referrals/attributions', [App\Http\Controllers\Api\ReferralAttributionController::class, 'store'])->middleware('throttle:30,1');

// Lens data routes (public)
Route::prefix('lens')->name('lens.')->group(function () {
    Route::get('/types', [App\Http\Controllers\Api\LensDataController::class, 'getLensTypes'])->name('types');
    Route::get('/treatments', [App\Http\Controllers\Api\LensDataController::class, 'getLensTreatments'])->name('treatments');
    Route::get('/coatings', [App\Http\Controllers\Api\LensDataController::class, 'getLensCoatings'])->name('coatings');
    Route::get('/thickness-materials', [App\Http\Controllers\Api\LensDataController::class, 'getThicknessMaterials'])->name('thickness-materials');
    Route::get('/thickness-options', [App\Http\Controllers\Api\LensDataController::class, 'getThicknessOptions'])->name('thickness-options');
    Route::get('/product/{productId}/config', [App\Http\Controllers\Api\LensDataController::class, 'getLensConfigForProduct'])->name('product-config');
});

// Prescription options routes (public)
Route::prefix('prescription-options')->group(function () {
    Route::get('/product/{productId}', [App\Http\Controllers\Api\PrescriptionOptionsController::class, 'getForProduct']);
});

Route::prefix('buyer')->group(base_path('routes/buyer.php'));
Route::prefix('seller')->group(base_path('routes/seller.php'));
Route::prefix('admin')->group(base_path('routes/admin.php'));
