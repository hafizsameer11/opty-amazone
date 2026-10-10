<?php

use App\Http\Controllers\Optical\AuthorizationController;
use App\Http\Controllers\Optical\DataController;
use App\Http\Controllers\Optical\PublicationController;
use App\Http\Middleware\OpticalGrant;
use Illuminate\Support\Facades\Route;

Route::post('token', [AuthorizationController::class, 'token'])->middleware('throttle:30,1');
Route::get('identity', [AuthorizationController::class, 'identity'])->middleware(OpticalGrant::class.':identity');
Route::post('revoke', [AuthorizationController::class, 'revoke'])->middleware(OpticalGrant::class.':identity');
Route::get('catalog-metadata', [DataController::class, 'metadata'])->middleware(OpticalGrant::class.':catalog.read');
Route::get('products', [DataController::class, 'products'])->middleware(OpticalGrant::class.':catalog.read');
Route::get('orders', [DataController::class, 'orders'])->middleware(OpticalGrant::class.':orders.read');
Route::get('customers', [DataController::class, 'customers'])->middleware(OpticalGrant::class.':customers.read');
Route::post('images', [PublicationController::class, 'image'])->middleware([OpticalGrant::class.':catalog.publish', 'throttle:30,1']);
Route::post('publications', [PublicationController::class, 'publish'])->middleware([OpticalGrant::class.':catalog.publish', 'throttle:30,1']);
Route::get('publications/{key}', [PublicationController::class, 'show'])->whereUuid('key')->middleware(OpticalGrant::class.':catalog.read');
Route::post('operations/{key}/cancel', [PublicationController::class, 'cancel'])->whereUuid('key')->middleware(OpticalGrant::class.':catalog.publish');
