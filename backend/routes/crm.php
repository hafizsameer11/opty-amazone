<?php

use App\Http\Controllers\Api\Crm\CrmAdsController;
use App\Http\Controllers\Api\Crm\CrmLeadsController;
use App\Http\Controllers\Api\Crm\CrmOrdersController;
use App\Http\Controllers\Api\Crm\CrmOverviewController;
use App\Http\Controllers\Api\Crm\CrmProductsController;
use App\Http\Controllers\Api\Crm\CrmSellersController;
use App\Http\Controllers\Api\Crm\CrmUsersController;
use App\Http\Controllers\Api\Crm\CrmWarehouseController;
use App\Http\Middleware\AuthenticateCrmClient;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| CRM read-only routes
|--------------------------------------------------------------------------
|
| Mounted at /api/crm by routes/api.php. This namespace is authenticated by
| AuthenticateCrmClient (an X-CRM-API-Key header), completely independent of
| the `sanctum` guard used by /api/admin, /api/seller and /api/buyer.
|
| Every route below is a GET. Nothing in this file can mutate state, and a key
| issued here cannot be replayed against any other part of the API.
|
| Route names are the unit of authorisation: AuthenticateCrmClient derives the
| required ability from the name after the "crm." prefix, so a client can be
| granted e.g. ["overview", "orders"] and nothing else.
|
*/

Route::middleware(AuthenticateCrmClient::class)->name('crm.')->group(function () {
    // Aggregated platform totals, revenue decomposition, trends and operations.
    Route::get('overview', [CrmOverviewController::class, 'index'])->name('overview');

    // Buyers, sellers and administrators.
    Route::get('users', [CrmUsersController::class, 'index'])->name('users');

    // Seller stores, including per-seller revenue and subscription state.
    Route::get('sellers', [CrmSellersController::class, 'index'])->name('sellers');

    // Product catalogue with aggregated sales figures.
    Route::get('products', [CrmProductsController::class, 'index'])->name('products');
    Route::get('products/{product}', [CrmProductsController::class, 'show'])
        ->whereNumber('product')
        ->name('products.show');

    // Buyer orders with the per-seller shipment split.
    Route::get('orders', [CrmOrdersController::class, 'index'])->name('orders');
    Route::get('orders/{order}', [CrmOrdersController::class, 'show'])
        ->whereNumber('order')
        ->name('orders.show');

    // Warehouse stock, low-stock alerts, purchases and revenue.
    Route::get('warehouse', [CrmWarehouseController::class, 'overview'])->name('warehouse');
    Route::get('warehouse/products', [CrmWarehouseController::class, 'products'])->name('warehouse.products');
    Route::get('warehouse/orders', [CrmWarehouseController::class, 'orders'])->name('warehouse.orders');

    // Boost ad spend and performance. Money is converted from cents to EUR.
    Route::get('ads', [CrmAdsController::class, 'index'])->name('ads');

    // Derived lead register: registrations plus the referral funnel.
    Route::get('leads', [CrmLeadsController::class, 'index'])->name('leads');
});
