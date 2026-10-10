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

    public function test_scoped_publication_image_mapping_idempotency_allocated_stock_and_conflict(): void
    {
        $this->withToken($this->token);
        $category = Category::create(['name' => 'Frames', 'slug' => Str::uuid(), 'is_active' => true]);
        $image = (string) Str::uuid();
        $this->post('/api/optical/images', ['file' => UploadedFile::fake()->image('frame.png', 60, 40), 'image_key' => $image], ['Accept' => 'application/json'])->assertOk();
        $payload = ['external_key' => (string) Str::uuid(), 'operation_key' => (string) Str::uuid(), 'allocated_quantity' => 3, 'currency' => 'EUR', 'images' => [$image], 'product' => ['name' => 'Linked frame', 'sku' => 'LINKED-ONE', 'product_type' => 'frame', 'category_id' => $category->id, 'price' => '99.95', 'description' => 'Optical shop product', 'frame_color' => 'Blue']];
        $r = $this->postJson('/api/optical/publications', $payload)->assertOk()->assertJsonPath('data.stock_quantity', 3)->assertJsonPath('data.visible', true)->json('data');
        $this->postJson('/api/optical/publications', $payload)->assertOk()->assertJsonPath('data.product_id', $r['product_id']);
        $this->assertDatabaseCount('products', 1);
        $this->postJson('/api/optical/publications', [...$payload, 'allocated_quantity' => 4])->assertConflict();
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
}
