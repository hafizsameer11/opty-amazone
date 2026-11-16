<?php

use App\Http\Controllers\Optical\AuthorizationController;
use App\Http\Controllers\Optical\DataController;
use App\Http\Controllers\Optical\PublicationController;
use App\Http\Controllers\Admin\AdminVista360Controller;
use App\Http\Middleware\OpticalGrant;
use Illuminate\Support\Facades\Route;

Route::post('token', [AuthorizationController::class, 'token'])->middleware('throttle:30,1');
Route::get('identity', [AuthorizationController::class, 'identity'])->middleware(OpticalGrant::class.':identity');
Route::get('subscription', [AuthorizationController::class, 'subscription'])->middleware(OpticalGrant::class.':identity');
Route::post('revoke', [AuthorizationController::class, 'revoke'])->middleware(OpticalGrant::class.':identity');
Route::get('catalog-metadata', [DataController::class, 'metadata'])->middleware(OpticalGrant::class.':catalog.read');
Route::get('products', [DataController::class, 'products'])->middleware(OpticalGrant::class.':catalog.read');
Route::get('orders', [DataController::class, 'orders'])->middleware(OpticalGrant::class.':orders.read');
Route::get('customers', [DataController::class, 'customers'])->middleware(OpticalGrant::class.':customers.read');
Route::post('images', [PublicationController::class, 'image'])->middleware([OpticalGrant::class.':catalog.publish', 'throttle:30,1']);
Route::post('publications', [PublicationController::class, 'publish'])->middleware([OpticalGrant::class.':catalog.publish', 'throttle:30,1']);
Route::get('publications/{key}', [PublicationController::class, 'show'])->whereUuid('key')->middleware(OpticalGrant::class.':catalog.read');
Route::post('operations/{key}/cancel', [PublicationController::class, 'cancel'])->whereUuid('key')->middleware(OpticalGrant::class.':catalog.publish');

// The CRM Admin calls these through a signed, short-lived server-to-server
// bridge. Marketplace browser sessions and their cookies never leave this
// application, so the CRM can offer a native page rather than an external
// redirect.
Route::prefix('admin/vista360')->middleware('vista360.admin-bridge')->group(function () {
    Route::get('plans', [AdminVista360Controller::class, 'plans']);
    Route::post('plans', [AdminVista360Controller::class, 'store']);
    Route::put('plans/{id}', [AdminVista360Controller::class, 'update'])->whereNumber('id');
    Route::post('plans/{id}/availability', [AdminVista360Controller::class, 'toggle'])->whereNumber('id');
    Route::get('subscriptions', [AdminVista360Controller::class, 'subscriptions']);
    Route::post('subscriptions/manual-grant', [AdminVista360Controller::class, 'manualGrant']);
    Route::get('subscriptions/{uuid}', [AdminVista360Controller::class, 'subscription'])->whereUuid('uuid');
    Route::post('subscriptions/{uuid}/action', [AdminVista360Controller::class, 'action'])->whereUuid('uuid');
    Route::get('payments', [AdminVista360Controller::class, 'payments']);
});
