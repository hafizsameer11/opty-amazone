<?php

// Disposable local browser-test fixtures. Never runs against an application database.
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (! app()->environment(['local', 'testing']) || config('database.connections.mysql.database') !== 'opty_marketplace_preview') {
    throw new RuntimeException('Use the dedicated opty_marketplace_preview database in local/testing.');
}
Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
$suffix = Illuminate\Support\Str::lower(Illuminate\Support\Str::random(8));
$sessions = [];
foreach (['buyer', 'seller', 'admin'] as $role) {
    $user = App\Models\User::factory()->create(['name' => 'Marketplace '.ucfirst($role), 'email' => $role.'-'.$suffix.'@example.test', 'phone' => '+49'.random_int(1000000000, 9999999999), 'role' => $role]);
    $sessions[$role] = ['user' => $user->toArray(), 'token' => $user->createToken('local-marketplace-test')->plainTextToken];
}
$store = App\Models\Store::create(['user_id' => $sessions['seller']['user']['id'], 'name' => 'Marketplace Optics '.$suffix, 'slug' => 'marketplace-'.$suffix,
    'status' => 'active', 'is_active' => true, 'onboarding_status' => 'approved', 'verification_submitted_at' => now(), 'store_setup_completed_at' => now()]);
$product = App\Models\Product::create(['store_id' => $store->id, 'name' => 'Marketplace Test Glasses', 'slug' => 'test-glasses-'.$suffix, 'sku' => 'test-'.$suffix,
    'price' => '40.00', 'stock_quantity' => 50, 'stock_status' => 'in_stock', 'is_active' => true, 'is_approved' => true, 'product_type' => 'accessory']);
$address = App\Models\UserAddress::create(['user_id' => $sessions['buyer']['user']['id'], 'full_name' => 'Marketplace Buyer', 'phone' => '+49123456789',
    'address_line_1' => '10 Marketplace Street', 'address_line_2' => 'Apartment 7', 'postal_code' => '10115', 'is_default' => true]);
$cart = App\Models\Cart::create(['user_id' => $sessions['buyer']['user']['id']]);
App\Models\CartItem::create(['cart_id' => $cart->id, 'store_id' => $store->id, 'product_id' => $product->id, 'quantity' => 2, 'price' => '40.00']);
$sessions['store_id'] = $store->id;
$sessions['address_id'] = $address->id;
file_put_contents($argv[1] ?? sys_get_temp_dir().'/marketplace-preview.json', json_encode($sessions));
echo "Created isolated buyer/seller/admin browser fixtures.\n";
