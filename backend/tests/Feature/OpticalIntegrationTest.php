<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class OpticalIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private User $seller;

    private Store $store;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config(['optical.enabled' => true, 'optical.client_secret' => str_repeat('s', 48), 'optical.redirect_uri' => 'http://127.0.0.1:5273/pulse-ui/auth/vista/callback', 'optical.require_verified_email' => true]);
        $this->seller = User::factory()->seller()->create(['password' => 'TestingPassword123!', 'email_verified_at' => now()]);
        $this->store = Store::create(['user_id' => $this->seller->id, 'name' => 'Optical seller', 'slug' => Str::uuid(), 'status' => 'active', 'is_active' => true]);
        $this->token = 'vos_'.Str::random(64);
        DB::table('optical_grants')->insert(['token_hash' => hash('sha256', $this->token), 'user_id' => $this->seller->id, 'store_id' => $this->store->id, 'client_id' => 'optical-shop', 'scopes' => json_encode(\App\Services\Optical\OpticalIdentity::SCOPES), 'expires_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_authorization_pkce_single_use_and_existing_seller_sessions_are_preserved(): void
    {
        $existing = $this->seller->createToken('existing-seller', ['seller']);
        $verifier = Str::random(64);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
        $flow = ['client_id' => 'optical-shop', 'redirect_uri' => config('optical.redirect_uri'), 'state' => Str::random(48), 'code_challenge' => $challenge, 'code_challenge_method' => 'S256'];
        $this->get('/optical/authorize?'.http_build_query([...$flow, 'redirect_uri' => 'https://attacker.test/callback']))->assertStatus(400);
        $this->get('/optical/authorize?'.http_build_query($flow))->assertOk();
        $r = $this->post('/optical/authorize', ['email' => $this->seller->email, 'password' => 'TestingPassword123!', 'consent' => 1])->assertRedirect();
        parse_str(parse_url($r->headers->get('Location'), PHP_URL_QUERY), $returned);
        $this->assertSame($flow['state'], $returned['state']);
        $payload = ['client_id' => 'optical-shop', 'client_secret' => str_repeat('s', 48), 'redirect_uri' => $flow['redirect_uri'], 'code' => $returned['code'], 'code_verifier' => $verifier];
        $this->postJson('/api/optical/token', [...$payload, 'code_verifier' => Str::random(64)])->assertStatus(400);
        $this->postJson('/api/optical/token', $payload)->assertOk()->assertJsonPath('identity.subject', (string) $this->seller->id)->assertJsonPath('identity.store.id', (string) $this->store->id);
        $this->postJson('/api/optical/token', $payload)->assertStatus(400);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $existing->accessToken->id]);
    }

    public function test_production_loopback_requires_opt_in_exact_match_and_verified_seller(): void
    {
        $original = app()->environment();
        app()->instance('env', 'production');
        try {
            $flow = ['client_id' => 'optical-shop', 'redirect_uri' => config('optical.redirect_uri'), 'state' => Str::random(48), 'code_challenge' => str_repeat('a', 43), 'code_challenge_method' => 'S256'];
            config(['optical.allow_loopback_redirect' => false]);
            $this->get('/optical/authorize?'.http_build_query($flow))->assertStatus(503);
            config(['optical.allow_loopback_redirect' => true]);
            $this->get('/optical/authorize?'.http_build_query([...$flow, 'redirect_uri' => 'http://127.0.0.1:9999/callback']))->assertStatus(400);
            $this->get('/optical/authorize?'.http_build_query($flow))->assertOk();
            $this->seller->forceFill(['email_verified_at' => null])->save();
            config(['optical.require_verified_email' => false]);
            $csrf = Str::random(40);
            $this->withSession(['_token' => $csrf])->post('/optical/authorize', ['_token' => $csrf, 'email' => $this->seller->email, 'password' => 'TestingPassword123!', 'consent' => 1])->assertForbidden();
            foreach (['http://example.test/callback', 'http://localhost.attacker.test/callback', 'http://user@localhost/callback', 'http://localhost/callback?next=other', 'http://localhost/callback#fragment', 'https:///callback'] as $invalid) {
                config(['optical.redirect_uri' => $invalid]);
                $this->get('/optical/authorize?'.http_build_query([...$flow, 'redirect_uri' => $invalid]))->assertStatus(503);
            }
            config(['optical.allow_loopback_redirect' => false, 'optical.redirect_uri' => 'https://optical.example.test/auth/vista/callback']);
            $this->get('/optical/authorize?'.http_build_query([...$flow, 'redirect_uri' => config('optical.redirect_uri')]))->assertOk();
        } finally {
            app()->instance('env', $original);
        }
    }

    public function test_scoped_publication_image_mapping_idempotency_allocated_stock_and_conflict(): void
    {
        $this->withToken($this->token);
        $category = Category::create(['name' => 'Frames', 'slug' => 'eye-glasses', 'is_active' => true]);
        $image = (string) Str::uuid();
        $this->post('/api/optical/images', ['file' => UploadedFile::fake()->image('frame.png', 60, 40), 'image_key' => $image], ['Accept' => 'application/json'])->assertOk();
        $payload = ['external_key' => (string) Str::uuid(), 'operation_key' => (string) Str::uuid(), 'allocated_quantity' => 3, 'currency' => 'EUR', 'images' => [$image], 'product' => ['name' => 'Linked frame', 'sku' => 'LINKED-ONE', 'product_type' => 'frame', 'category_id' => $category->id, 'price' => '99.95', 'description' => 'Optical shop product', 'frame_color' => 'Blue']];
        $r = $this->postJson('/api/optical/publications', $payload)->assertOk()->assertJsonPath('data.stock_quantity', 3)->assertJsonPath('data.visible', true)->json('data');
        $this->postJson('/api/optical/publications', $payload)->assertOk()->assertJsonPath('data.product_id', $r['product_id']);
        $this->assertDatabaseCount('products', 1);
        $this->postJson('/api/optical/publications', [...$payload, 'allocated_quantity' => 4])->assertConflict();
        $this->travel(5)->seconds();
        $this->getJson('/api/products/'.$r['product_id'])->assertOk();
        $this->getJson('/api/optical/publications/'.$payload['external_key'])->assertOk()->assertJsonPath('data.version', $r['version']);
        $next = [...$payload, 'operation_key' => (string) Str::uuid(), 'allocated_quantity' => 2, 'expected_version' => $r['version']];
        $this->postJson('/api/optical/publications', $next)->assertOk()->assertJsonPath('data.stock_quantity', 5);
        $this->assertDatabaseCount('products', 1);
        Product::findOrFail($r['product_id'])->update(['name' => 'Seller panel edit']);
        $this->postJson('/api/optical/publications', [...$next, 'operation_key' => (string) Str::uuid()])->assertConflict();
        $this->getJson('/api/optical/products')->assertOk()->assertJsonPath('data.0.name', 'Seller panel edit');
        $this->store->update(['status' => 'suspended']);
        $this->getJson('/api/optical/products')->assertForbidden();
    }

    public function test_grants_cannot_access_other_sellers_or_existing_seller_endpoints_and_revoke_is_effective(): void
    {
        $other = User::factory()->seller()->create();
        $s = Store::create(['user_id' => $other->id, 'name' => 'Other', 'slug' => Str::uuid(), 'status' => 'active', 'is_active' => true]);
        Product::create(['store_id' => $s->id, 'name' => 'Private foreign product', 'slug' => Str::uuid(), 'sku' => 'FOREIGN', 'product_type' => 'frame', 'price' => 99, 'stock_quantity' => 4]);
        $this->withToken($this->token)->getJson('/api/optical/products')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/seller/products')->assertUnauthorized();
        $this->postJson('/api/optical/revoke')->assertNoContent();
        $this->getJson('/api/optical/identity')->assertUnauthorized();
    }

    public function test_cancel_is_permanent_and_cannot_release_a_successful_allocation(): void
    {
        $this->withToken($this->token);
        $key = (string) Str::uuid();
        $this->postJson('/api/optical/operations/'.$key.'/cancel')->assertOk()->assertJsonPath('data.cancelled', true);
        $this->postJson('/api/optical/operations/'.$key.'/cancel')->assertOk();
        $this->postJson('/api/optical/publications', ['external_key' => (string) Str::uuid(), 'operation_key' => $key, 'allocated_quantity' => 4, 'currency' => 'EUR', 'images' => [(string) Str::uuid()], 'product' => ['name' => 'Cancelled']])->assertConflict();
        $this->assertDatabaseCount('products', 0);
        $accepted = (string) Str::uuid();
        DB::table('optical_operations')->insert(['store_id' => $this->store->id, 'client_id' => 'optical-shop', 'operation_key' => $accepted, 'payload_hash' => str_repeat('a', 64), 'result' => json_encode(['product_id' => 1]), 'created_at' => now(), 'updated_at' => now()]);
        $this->postJson('/api/optical/operations/'.$accepted.'/cancel')->assertConflict();
    }

    public function test_all_five_forms_publish_with_category_specific_fields(): void
    {
        $this->withToken($this->token);
        $image = (string) Str::uuid();
        $this->post('/api/optical/images', ['file' => UploadedFile::fake()->image('photo.png'), 'image_key' => $image], ['Accept' => 'application/json'])->assertOk();
        foreach (['eye-glasses' => 'frame', 'sun-glasses' => 'sunglasses', 'contact-lenses' => 'contact_lens', 'eye-hygiene' => 'eye_hygiene', 'accessori' => 'accessory'] as $slug => $type) {
            $category = Category::create(['name' => $type, 'slug' => $slug, 'is_active' => true]);
            $specific = match ($type) {
                'frame','sunglasses' => ['lens_index_options' => ['1.6'], 'treatment_options' => ['blue_light']],'contact_lens' => ['has_uv_filter' => true, 'replacement_frequency' => 'daily', 'base_curve_options' => ['8.6']],'eye_hygiene' => ['size_volume' => '100ml'],default => ['gender' => 'unisex']
            };
            $product = ['category_id' => $category->id, 'product_type' => $type, 'name' => 'Category '.$type, 'sku' => 'TYPE-'.$type, 'price' => 20, ...$specific];
            $payload = ['external_key' => (string) Str::uuid(), 'operation_key' => (string) Str::uuid(), 'allocated_quantity' => 2, 'currency' => 'EUR', 'images' => [$image], 'product' => $product];
            $published = $this->postJson('/api/optical/publications', $payload)->assertOk()->json('data');
            $this->getJson('/api/optical/publications/'.$payload['external_key'])->assertOk()->assertJsonPath('data.version', $published['version']);
            $id = $published['product_id'];
            $stored = Product::findOrFail($id);
            foreach ($specific as $key => $value) {
                $this->assertEquals($value, $stored->$key);
            }
            $this->postJson('/api/optical/publications', [...$payload, 'external_key' => (string) Str::uuid(), 'operation_key' => (string) Str::uuid(), 'product' => [...$product, 'product_type' => 'wrong']])->assertUnprocessable();
        }
        $this->getJson('/api/optical/catalog-metadata')->assertOk()->assertJsonPath('data.schema_version', 3)->assertJsonCount(5, 'data.categories');
        $this->assertDatabaseCount('products', 5);
    }

    public function test_nested_allocations_are_additive_and_idempotent(): void
    {
        $this->withToken($this->token);
        $cat = Category::create(['name' => 'Frames', 'slug' => 'eye-glasses', 'is_active' => true]);
        $image = (string) Str::uuid();
        $this->post('/api/optical/images', ['file' => UploadedFile::fake()->image('photo.png'), 'image_key' => $image], ['Accept' => 'application/json'])->assertOk();
        $secondImage = (string) Str::uuid();
        $this->post('/api/optical/images', ['file' => UploadedFile::fake()->image('second.png'), 'image_key' => $secondImage], ['Accept' => 'application/json'])->assertOk();
        $variant = ['option_key' => (string) Str::uuid(), 'color_name' => 'Blue', 'color_code' => '#0000ff', 'stock_quantity' => 3, 'image_indices' => ['1', '2'], 'sizes' => [['option_key' => (string) Str::uuid(), 'size_label' => 'Medium', 'stock_quantity' => 3]]];
        $payload = ['external_key' => (string) Str::uuid(), 'operation_key' => (string) Str::uuid(), 'allocated_quantity' => 3, 'currency' => 'EUR', 'images' => [$image, $secondImage], 'product' => ['category_id' => $cat->id, 'product_type' => 'frame', 'name' => 'Sized frame', 'sku' => 'SIZED', 'price' => 25, 'variants' => [$variant]]];
        $this->postJson('/api/optical/publications', [...$payload, 'allocated_quantity' => 4])->assertUnprocessable();
        $r = $this->postJson('/api/optical/publications', $payload)->assertOk()->json('data');
        $this->postJson('/api/optical/publications', $payload)->assertOk();
        $product = Product::findOrFail($r['product_id']);
        $this->assertSame(1, $product->variants()->count());
        $this->assertSame(1, $product->frameSizes()->count());
        $this->assertCount(2, $product->variants()->first()->images);
        $next = [...$payload, 'operation_key' => (string) Str::uuid(), 'expected_version' => $r['version']];
        $this->postJson('/api/optical/publications', $next)->assertOk()->assertJsonPath('data.stock_quantity', 6);
        $this->assertSame(6, $product->variants()->first()->stock_quantity);
        $this->assertSame(6, $product->frameSizes()->first()->stock_quantity);
        $this->assertSame(1, $product->variants()->count());
    }

    public function test_hygiene_options_images_subcategories_and_store_toggles(): void
    {
        $this->withToken($this->token);
        $cat = Category::create(['name' => 'Hygiene', 'slug' => 'eye-hygiene', 'is_active' => true]);
        $sub = Category::create(['name' => 'Drops', 'slug' => 'drops', 'parent_id' => $cat->id, 'is_active' => true]);
        $leaf = Category::create(['name' => 'Dry eyes', 'slug' => 'dry-eyes', 'parent_id' => $sub->id, 'is_active' => true]);
        $image = (string) Str::uuid();
        $this->post('/api/optical/images', ['file' => UploadedFile::fake()->image('photo.png'), 'image_key' => $image], ['Accept' => 'application/json'])->assertOk();
        $product = ['category_id' => $cat->id, 'sub_category_id' => $leaf->id, 'product_type' => 'eye_hygiene', 'name' => 'Drops', 'sku' => 'DROPS', 'price' => 12, 'size_volume_variants' => [['option_key' => (string) Str::uuid(), 'size_volume' => '100ml', 'stock_quantity' => 2, 'image_index' => 1, 'is_active' => true]], 'eye_hygiene_variants' => [['option_key' => (string) Str::uuid(), 'name' => 'Dry eyes', 'image_index' => 1, 'is_active' => true]]];
        $payload = ['external_key' => (string) Str::uuid(), 'operation_key' => (string) Str::uuid(), 'allocated_quantity' => 2, 'currency' => 'EUR', 'images' => [$image], 'product' => $product];
        $result = $this->postJson('/api/optical/publications', $payload)->assertOk()->json('data');
        $p = Product::findOrFail($result['product_id']);
        $this->assertSame($leaf->id, $p->sub_category_id);
        $this->assertSame(2, $p->sizeVolumeVariants()->first()->stock_quantity);
        $this->assertSame(1, $p->eyeHygieneVariants()->count());
        $this->assertStringContainsString('/optical/', $p->sizeVolumeVariants()->first()->image_url);
        \App\Models\StoreCategoryFieldConfig::create(['store_id' => $this->store->id, 'category_id' => $cat->id, 'field_config' => ['pack_type' => false]]);
        $invalid = [...$product, 'pack_type' => 'Disabled'];
        $this->postJson('/api/optical/publications', [...$payload, 'operation_key' => (string) Str::uuid(), 'expected_version' => $result['version'], 'product' => $invalid])->assertUnprocessable();
        $foreign = Category::create(['name' => 'Other', 'slug' => 'accessori', 'is_active' => true]);
        $this->postJson('/api/optical/publications', [...$payload, 'operation_key' => (string) Str::uuid(), 'expected_version' => $result['version'], 'product' => [...$product, 'sub_category_id' => $foreign->id]])->assertUnprocessable();
        $this->assertSame(2, $p->fresh()->stock_quantity);
    }

    public function test_contact_prescriptions_pack_photos_prices_and_additive_color_stock_survive_editing(): void
    {
        $this->withToken($this->token);
        $cat = Category::create(['name' => 'Contact lenses', 'slug' => 'contact-lenses', 'is_active' => true]);
        $sub = Category::create(['name' => 'Spherical', 'slug' => 'spherical', 'parent_id' => $cat->id, 'is_active' => true]);
        $leaf = Category::create(['name' => 'Daily', 'slug' => 'daily', 'parent_id' => $sub->id, 'is_active' => true]);
        $photos = [];
        foreach (['main', 'blue', 'pack'] as $name) {
            $photos[] = $key = (string) Str::uuid();
            $this->post('/api/optical/images', ['file' => UploadedFile::fake()->image($name.'.png'), 'image_key' => $key], ['Accept' => 'application/json'])->assertOk();
        }
        $colorKey = (string) Str::uuid();
        $fields = ['category_id' => $cat->id, 'sub_category_id' => $leaf->id, 'product_type' => 'contact_lens',
            'gallery_image_ids' => [$photos[0]], 'name' => 'Daily colored lenses', 'sku' => 'DAILY-BLUE', 'price' => 24.95, 'replacement_frequency' => 'daily',
            'prescription_values' => [
                ['option_key' => (string) Str::uuid(), 'field_type' => 'pwr', 'value' => '-1.5', 'label' => '-1.50 D', 'eye_type' => 'right', 'is_active' => true],
                ['option_key' => (string) Str::uuid(), 'field_type' => 'sph', 'value' => '-1.50', 'eye_type' => 'right'],
                ['option_key' => (string) Str::uuid(), 'field_type' => 'base_curve', 'value' => '8.6', 'eye_type' => 'both'],
                ['option_key' => (string) Str::uuid(), 'field_type' => 'diameter', 'value' => '14.2', 'eye_type' => 'both'],
            ],
            'variants' => [['option_key' => $colorKey, 'color_name' => 'Blue', 'color_code' => '#0000FF', 'price' => 26, 'stock_quantity' => 3, 'image_ids' => [$photos[1]], 'is_default' => true]],
            'contact_lens_packs' => [['option_key' => (string) Str::uuid(), 'quantity' => 30, 'price' => 26, 'image_ids' => [$photos[2]], 'variant_keys' => [$colorKey]]],
            'contact_lens_qty_options' => [1, 2, 6],
            'contact_lens_colour_stock' => [['option_key' => (string) Str::uuid(), 'pack_quantity' => '30', 'variant_key' => $colorKey, 'stock_quantity' => 3]],
        ];
        $payload = ['external_key' => (string) Str::uuid(), 'operation_key' => (string) Str::uuid(), 'allocated_quantity' => 3,
            'currency' => 'EUR', 'images' => $photos, 'product' => $fields];
        $this->postJson('/api/optical/publications', [...$payload, 'product' => [...$fields, 'sub_category_id' => $sub->id]])->assertUnprocessable();
        $invalid = $fields;
        $invalid['contact_lens_colour_stock'][0]['stock_quantity'] = 2;
        $this->postJson('/api/optical/publications', [...$payload, 'product' => $invalid])->assertUnprocessable();
        $invalid = $fields;
        $invalid['variants'][0]['image_ids'] = [(string) Str::uuid()];
        $this->postJson('/api/optical/publications', [...$payload, 'product' => $invalid])->assertUnprocessable();
        $this->assertDatabaseCount('products', 0);
        $result = $this->postJson('/api/optical/publications', $payload)->assertOk()->json('data');
        $this->postJson('/api/optical/publications', $payload)->assertOk();
        $product = Product::findOrFail($result['product_id']);
        $this->assertCount(1, $product->images);
        $this->assertStringContainsString($photos[0], $product->images[0]);
        $this->assertDatabaseHas('prescription_dropdown_values', ['product_id' => $product->id, 'eye_type' => 'both', 'value' => '14.20']);
        $this->assertDatabaseCount('prescription_dropdown_values', 3);
        $this->assertDatabaseHas('prescription_dropdown_values', ['product_id' => $product->id, 'field_type' => 'sph', 'value' => '-1.50', 'eye_type' => 'right']);
        $this->assertDatabaseHas('prescription_dropdown_values', ['product_id' => $product->id, 'field_type' => 'base_curve', 'value' => '8.60']);
        $variant = $product->variants()->firstOrFail();
        $this->assertStringContainsString($photos[1], $variant->images[0]);
        $config = $product->contact_lens_unit_config;
        $this->assertStringContainsString($photos[2], $config['packs'][0]['images'][0]);
        $this->assertSame([$variant->id], $config['packs'][0]['available_variant_ids']);
        $this->assertSame([1, 2, 6], $config['qty_options']);
        $this->assertSame(3, $config['colour_stock'][0]['stock_quantity']);
        $fields['name'] = 'Updated daily lenses';
        $fields['contact_lens_packs'][0]['price'] = 28;
        $fields['prescription_values'][0]['label'] = 'Updated power';
        $next = [...$payload, 'operation_key' => (string) Str::uuid(), 'expected_version' => $result['version'], 'product' => $fields];
        $updated = $this->postJson('/api/optical/publications', $next)->assertOk()->json('data');
        $this->postJson('/api/optical/publications', $next)->assertOk();
        $this->assertSame(6, $product->fresh()->stock_quantity);
        $this->assertSame(6, $variant->fresh()->stock_quantity);
        $this->assertSame(6, $product->fresh()->contact_lens_unit_config['colour_stock'][0]['stock_quantity']);
        $this->assertEquals(28, $product->fresh()->contact_lens_unit_config['packs'][0]['price']);
        $this->assertDatabaseCount('products', 1);
        $this->assertDatabaseCount('prescription_dropdown_values', 3);
        DB::table('prescription_dropdown_values')->where('product_id', $product->id)->update(['label' => 'Seller changed']);
        $this->postJson('/api/optical/publications', [...$next, 'operation_key' => (string) Str::uuid(), 'expected_version' => $updated['version']])->assertConflict();
        $this->assertSame(6, $product->fresh()->stock_quantity);
    }

    public function test_frame_dropdowns_match_seller_and_color_photos_remain_distinct(): void
    {
        $this->withToken($this->token);
        $cat = Category::create(['name' => 'Sunglasses', 'slug' => 'sun-glasses', 'is_active' => true]);
        $photos = [];
        foreach (['red', 'blue'] as $name) {
            $photos[] = $key = (string) Str::uuid();
            $this->post('/api/optical/images', ['file' => UploadedFile::fake()->image($name.'.png'), 'image_key' => $key], ['Accept' => 'application/json'])->assertOk();
        }
        $fields = ['category_id' => $cat->id, 'product_type' => 'sunglasses', 'name' => 'Two colors', 'sku' => 'SUN-TWO', 'price' => 99,
            'gallery_image_ids' => [$photos[0]], 'short_description' => 'Clear this on edit', 'frame_shape' => 'Aviator', 'frame_material' => 'Titanium', 'frame_color' => 'Blue', 'lens_index_options' => ['1.67'],
            'treatment_options' => ['polarized'], 'variants' => []];
        foreach (['Red', 'Blue'] as $i => $color) {
            $fields['variants'][] = ['option_key' => (string) Str::uuid(), 'color_name' => $color, 'image_ids' => [$photos[$i]], 'stock_quantity' => 1,
                'sizes' => [['option_key' => (string) Str::uuid(), 'size_label' => '52-18-140', 'stock_quantity' => 1]]];
        }
        $payload = ['external_key' => (string) Str::uuid(), 'operation_key' => (string) Str::uuid(), 'allocated_quantity' => 2,
            'currency' => 'EUR', 'images' => $photos, 'product' => $fields];
        $this->postJson('/api/optical/publications', [...$payload, 'product' => [...$fields, 'frame_shape' => 'Invented dropdown value']])->assertUnprocessable();
        $result = $this->postJson('/api/optical/publications', $payload)->assertOk()->json('data');
        $product = Product::findOrFail($result['product_id']);
        foreach ($product->variants()->orderBy('id')->get() as $i => $variant) {
            $this->assertCount(1, $variant->images);
            $this->assertStringContainsString($photos[$i], $variant->images[0]);
        }
        $this->assertCount(1, $product->images);
        $this->assertStringContainsString($photos[0], $product->images[0]);
        $this->assertSame(2, $product->frameSizes()->count());
        $this->assertEquals(52, $product->frameSizes()->first()->lens_width);
        $this->assertEquals(18, $product->frameSizes()->first()->bridge_width);
        $this->assertEquals(140, $product->frameSizes()->first()->temple_length);
        $fields['short_description'] = null;
        $fields['frame_shape'] = 'Round';
        $this->postJson('/api/optical/publications', [...$payload, 'operation_key' => (string) Str::uuid(), 'expected_version' => $result['version'], 'product' => $fields])->assertOk();
        $this->assertSame('Round', $product->fresh()->frame_shape);
        $this->assertNull($product->fresh()->short_description);
        $this->assertSame(2, $product->variants()->count());
        $this->assertSame(4, $product->fresh()->stock_quantity);
    }

}
