<?php

use Illuminate\Support\Facades\Route;

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
});

// Category routes
Route::prefix('categories')->group(function () {
    Route::get('/', [App\Http\Controllers\Api\CategoryController::class, 'index']);
});

// Search routes
Route::prefix('search')->group(function () {
    Route::get('/', [App\Http\Controllers\Api\SearchController::class, 'search']);
});

Route::prefix('buyer')->group(base_path('routes/buyer.php'));
Route::prefix('seller')->group(base_path('routes/seller.php'));
Route::prefix('admin')->group(base_path('routes/admin.php'));
