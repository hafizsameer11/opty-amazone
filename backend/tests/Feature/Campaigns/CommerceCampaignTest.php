<?php

namespace Tests\Feature\Campaigns;

use App\Models\{User, Store, Product, Category, ProductVariant, ProductSizeVolume, FrameSize, EyeHygieneVariant, DiscountCampaign, BannerCampaign, BannerEvent, Cart, CartItem, Order, OrderItem, StoreOrder, UserAddress, ProductPromotion, StoreBanner, Country, Escrow};
use App\Services\Campaigns\{DiscountCampaignService, DiscountPricingService, BannerCampaignService, BannerDeliveryService, LegacyCampaignImportService, CampaignAnalyticsService};
use App\Services\Order\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\{DB, Storage};
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommerceCampaignTest extends TestCase
{
    use RefreshDatabase;
    private User $seller;
    private User $buyer;
    private User $admin;
    private Store $store;
    private Product $product;

    protected function beforeRefreshingDatabase(): void
    {
        // Pre-existing migration assumes this FK exists; supply it only in the disposable test DB.
        \Illuminate\Support\Facades\Event::listen(\Illuminate\Database\Events\MigrationStarted::class, function ($event) {
            if (str_contains((new \ReflectionClass($event->migration))->getFileName(), 'require_color_on_frame_sizes')
                && !\Illuminate\Support\Facades\Schema::hasColumn('frame_sizes','product_variant_id')) {
                \Illuminate\Support\Facades\Schema::table('frame_sizes',fn ($t)=>$t->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete());
            }
        });
    }
    protected function setUp(): void
    {
        parent::setUp(); $this->travelTo(now()->setDate(2026,9,13)->setTime(12,0)); Storage::fake('public');
        $this->seller=User::factory()->create(['role'=>'seller']); $this->buyer=User::factory()->create(['role'=>'buyer']); $this->admin=User::factory()->create(['role'=>'admin']);
        $this->store=Store::create(['user_id'=>$this->seller->id,'name'=>'Optics','slug'=>(string) Str::uuid(),'is_active'=>true,'status'=>'active']);
        $this->product=Product::create(['store_id'=>$this->store->id,'name'=>'Glasses','slug'=>(string) Str::uuid(),'sku'=>(string) Str::uuid(),
            'price'=>100,'compare_at_price'=>150,'stock_quantity'=>100,'stock_status'=>'in_stock','is_active'=>true,'is_approved'=>true,'is_muted'=>false]);
    }
    private function discountData(array $overrides=[]): array
    {
        return array_replace(['name'=>'Autumn sale','description'=>'Automatic discount','scope'=>'products','product_ids'=>[$this->product->id],
            'discount_type'=>'percentage','discount_value'=>20,'starts_at'=>now()->toIso8601String(),'ends_at'=>now()->addDay()->toIso8601String(),'status'=>'draft'],$overrides);
    }
    private function discount(array $overrides=[]): DiscountCampaign
    {
        Sanctum::actingAs($this->seller);
        $id=$this->postJson('/api/seller/discount-campaigns',$this->discountData($overrides))->assertCreated()->json('data.id');
        $this->postJson('/api/seller/discount-campaigns/'.$id.'/actions',['action'=>'publish'])->assertOk();
        return DiscountCampaign::findOrFail($id);
    }
    private function quote(array $selection=[], int $quantity=1): array
    {
        return app(DiscountPricingService::class)->quote([['product'=>$this->product->fresh(),'selection'=>$selection,'quantity'=>$quantity]],$this->buyer->id)[0];
    }
    private function bannerData(array $overrides=[]): array
    {
        return array_replace(['name'=>'Autumn hero','starts_at'=>now()->toIso8601String(),'ends_at'=>now()->addDay()->toIso8601String(),'placement'=>'homepage_hero',
            'destination_type'=>'product','destination_id'=>$this->product->id,'desktop_image'=>UploadedFile::fake()->image('hero.jpg',800,400),
            'title'=>'Autumn collection','alt_text'=>'Our autumn glasses collection','cta_text'=>'Shop glasses'],$overrides);
    }
    private function banner(array $overrides=[]): BannerCampaign
    {
        Sanctum::actingAs($this->seller); $id=$this->post('/api/seller/banner-campaigns',$this->bannerData($overrides),['Accept'=>'application/json'])->assertCreated()->json('data.id');
        Sanctum::actingAs($this->admin); $this->postJson('/api/admin/banner-campaigns/'.$id.'/actions',['action'=>'approve','reason'=>'Creative and destination reviewed'])->assertOk();
        return BannerCampaign::findOrFail($id);
    }
    private function serve(string $placement='homepage_hero',array $params=[]): array
    {
        Sanctum::actingAs($this->buyer);
        return $this->withHeader('X-Campaign-Visitor','11111111-1111-4111-8111-111111111111')->getJson('/api/buyer/campaigns/banners/'.$placement.'?'.http_build_query($params))->assertOk()->json('data');
    }
    private function event(string $token,string $type='impression') { return $this->withHeader('X-Campaign-Visitor','11111111-1111-4111-8111-111111111111')->postJson('/api/buyer/campaigns/banner-events',['tracking_token'=>$token,'type'=>$type]); }

    public function test_creation_validation_ownership_and_admin_access(): void
    {
        $c=$this->discount(); $this->assertSame('100.00',$this->product->fresh()->price); $this->assertSame('150.00',$this->product->fresh()->compare_at_price);
        $this->assertEquals(80.0,$this->quote()['discounted_price']);
        Sanctum::actingAs($this->buyer); $this->postJson('/api/seller/discount-campaigns',$this->discountData())->assertForbidden();
        $this->getJson('/api/admin/discount-campaigns')->assertForbidden();
        Sanctum::actingAs(User::factory()->create(['role'=>'seller'])); $this->getJson('/api/seller/discount-campaigns/'.$c->id)->assertForbidden();
        Sanctum::actingAs($this->seller); $this->postJson('/api/seller/discount-campaigns',$this->discountData(['discount_value'=>101]))->assertUnprocessable();
        $this->putJson('/api/seller/discount-campaigns/'.$c->id,$this->discountData())->assertUnprocessable();
        Sanctum::actingAs($this->admin); $this->getJson('/api/admin/discount-campaigns/'.$c->id.'/audits')->assertOk();
        $this->postJson('/api/admin/discount-campaigns/'.$c->id.'/actions',['action'=>'pause'])->assertOk();
        $this->assertEquals(100.0,$this->quote()['discounted_price']);
        Sanctum::actingAs($this->seller);
        $this->putJson('/api/seller/discount-campaigns/'.$c->id, $this->discountData(['launch_mode'=>'schedule','starts_at'=>now()->addHour()->toIso8601String(),'ends_at'=>now()->addDay()->toIso8601String()]))
            ->assertOk()->assertJsonPath('data.status','scheduled');
    }

    public function test_seller_creation_launch_modes_start_or_schedule_without_a_second_publish_action(): void
    {
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/discount-campaigns', $this->discountData(['launch_mode'=>'run_now']))
            ->assertCreated()->assertJsonPath('data.status','active');
        $this->postJson('/api/seller/discount-campaigns', $this->discountData(['name'=>'Scheduled sale','launch_mode'=>'schedule','starts_at'=>now()->addHour()->toIso8601String(),'ends_at'=>now()->addDay()->toIso8601String()]))
            ->assertCreated()->assertJsonPath('data.status','scheduled');
    }
    public function test_category_and_store_scopes_are_store_scoped(): void
    {
        $category=Category::create(['name'=>'Frames','slug'=>'frames','is_active'=>true]); $this->product->update(['category_id'=>$category->id]);
        $this->discount(['scope'=>'categories','category_ids'=>[$category->id]]); $this->assertEquals(80.0,$this->quote()['discounted_price']);
        $this->product->update(['category_id'=>null]); $this->assertEquals(100.0,$this->quote()['discounted_price']);
        $this->discount(['scope'=>'store','discount_type'=>'fixed','discount_value'=>15]); $this->assertEquals(85.0,$this->quote()['discounted_price']);
        $other=Store::create(['user_id'=>$this->admin->id,'name'=>'Other','slug'=>'other','is_active'=>true,'status'=>'active']);
        $this->product->update(['store_id'=>$other->id]); $this->assertEquals(100.0,$this->quote()['discounted_price']);
    }
    public function test_variant_size_volume_and_named_option_prices(): void
    {
        $v=ProductVariant::create(['product_id'=>$this->product->id,'color_name'=>'Blue','price'=>120,'stock_quantity'=>20,'stock_status'=>'in_stock']);
        $size=FrameSize::create(['product_id'=>$this->product->id,'product_variant_id'=>$v->id,'lens_width'=>50,'bridge_width'=>20,'temple_length'=>140,'price'=>130,'stock_quantity'=>20]);
        $volume=ProductSizeVolume::create(['product_id'=>$this->product->id,'size_volume'=>'100ml','price'=>30,'stock_quantity'=>20,'is_active'=>true]);
        $named=EyeHygieneVariant::create(['product_id'=>$this->product->id,'name'=>'Twin pack','price'=>40,'is_active'=>true]);
        $this->discount(['scope'=>'variants','variants'=>[['variant_type'=>'variant_id','variant_id'=>$v->id]]]);
        $this->assertEquals(100.0,$this->quote()['discounted_price']); $this->assertEquals(96.0,$this->quote(['variant_id'=>$v->id])['discounted_price']);
        $this->assertEquals(104.0,$this->quote(['variant_id'=>$v->id,'frame_size_id'=>$size->id])['discounted_price']);
        $this->assertEquals(30.0,$this->quote(['product_size_volume_id'=>$volume->id])['discounted_price']);
        $this->discount(['scope'=>'store']); $this->assertEquals(24.0,$this->quote(['product_size_volume_id'=>$volume->id])['discounted_price']);
        $this->assertEquals(32.0,$this->quote(['eye_hygiene_variant_id'=>$named->id])['discounted_price']);
    }
    public function test_priority_ties_stacking_and_minimums(): void
    {
        $this->discount(['discount_value'=>40,'priority'=>1]); $c=$this->discount(['discount_value'=>10,'priority'=>2,'stacking'=>true]);
        $this->assertEquals(90.0,$this->quote()['discounted_price']);
        $other=$this->discount(['discount_type'=>'fixed','discount_value'=>20,'priority'=>2,'stacking'=>true]);
        $this->assertEquals(72.0,$this->quote()['discounted_price']); // Fixed 20 then 10%; non-stackable 40% excluded.
        $other->update(['status'=>'paused']); $c->update(['status'=>'paused']);
        DiscountCampaign::query()->update(['status'=>'paused']);
        $minimumCampaign = $this->discount(['minimum_quantity'=>2,'minimum_order_amount'=>150]);
        // Historical maximum_discount values are deliberately ignored.
        $minimumCampaign->update(['maximum_discount'=>25]);
        $this->assertEquals(100.0,$this->quote()['discounted_price']); $this->assertEquals(80.0,$this->quote([],2)['discounted_price']);
    }
    public function test_checkout_reprices_and_preserves_order_history_and_limits(): void
    {
        $c=$this->discount(['usage_limit'=>1,'per_buyer_limit'=>1]); Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/cart/items',['product_id'=>$this->product->id,'quantity'=>2])->assertOk()->assertJsonPath('data.price','80.00');
        $this->postJson('/api/buyer/checkout/preview')->assertOk()->assertJsonPath('data.items_total',160);
        $c->update(['discount_value'=>30]);
        $country=Country::create(['name'=>'Germany','code'=>'DE','is_active'=>true]);
        $address=UserAddress::create(['user_id'=>$this->buyer->id,'label'=>'Home','full_name'=>'Buyer','phone'=>'123456789','address_line_1'=>'Test street','country_id'=>$country->id,'city'=>'Berlin','postal_code'=>'10000']);
        $result=app(OrderService::class)->placeOrder($this->buyer,$address->id); $order=$result['order'];
        $item=$order->storeOrders->first()->items->first(); $this->assertSame('70.00',$item->price); $this->assertEquals(100,$item->original_price);
        $this->assertEquals(30,$item->campaign_discount_amount); $this->assertEquals($c->id,$item->campaign_pricing['campaign_id']);
        $this->assertEquals(1,$c->fresh()->usage_count); $this->assertDatabaseCount('discount_campaign_usages',1);
        app(DiscountPricingService::class)->recordUsage($order); $this->assertDatabaseCount('discount_campaign_usages',1);
        $this->assertEquals(100.0,$this->quote()['discounted_price']);
        $c->update(['name'=>'Renamed','status'=>'cancelled']); $this->assertEquals('Autumn sale',$item->fresh()->campaign_pricing['campaign_name']);
    }
    public function test_expired_campaign_price_cannot_survive_in_cart(): void
    {
        $c=$this->discount(); Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/cart/items',['product_id'=>$this->product->id,'quantity'=>1])->assertOk(); $this->travel(2)->days();
        $this->getJson('/api/buyer/cart')->assertOk()->assertJsonPath('data.total',100);
        $this->postJson('/api/buyer/checkout/preview')->assertOk()->assertJsonPath('data.items_total',100);
    }
    public function test_scheduler_is_idempotent_and_disables_invalid_products(): void
    {
        $c=$this->discount(['starts_at'=>now()->addHour()->toIso8601String()]); $this->assertSame('scheduled',$c->status);
        $this->travel(2)->hours(); app(\App\Jobs\RefreshCommerceCampaigns::class)->handle(); $this->assertSame('active',$c->fresh()->status);
        $this->product->update(['is_active'=>false]); app(\App\Jobs\RefreshCommerceCampaigns::class)->handle(); $this->assertSame('paused',$c->fresh()->status);
        $this->travel(2)->days(); app(\App\Jobs\RefreshCommerceCampaigns::class)->handle(); $this->assertSame('expired',$c->fresh()->status);
        $audits=DB::table('commerce_campaign_audits')->count(); app(\App\Jobs\RefreshCommerceCampaigns::class)->handle(); $this->assertEquals($audits,DB::table('commerce_campaign_audits')->count());
    }
    public function test_banner_creation_approval_delivery_and_placements(): void
    {
        $b=$this->banner(); $served=$this->serve(); $this->assertCount(1,$served); $this->assertSame('/products/'.$this->product->id,$served[0]['destination']);
        $this->assertSame($served[0]['creative']['desktop_url'],$served[0]['creative']['mobile_url']); $this->assertSame([],$this->serve('homepage_featured'));
        $this->store->update(['is_active'=>false]); $this->assertSame([],$this->serve()); $this->store->update(['is_active'=>true]);
        $this->travel(2)->days(); $this->assertSame([],$this->serve());
    }

    public function test_banner_schedule_uses_italy_and_pakistan_creator_timezones_at_the_exact_utc_instant(): void
    {
        $this->travelTo(\Carbon\CarbonImmutable::parse('2026-09-13 23:40:00', 'UTC'));
        Sanctum::actingAs($this->seller);
        $id = $this->post('/api/seller/banner-campaigns', $this->bannerData([
            'starts_at' => '2026-09-14T02:37:00+02:00',
            'ends_at' => '2026-09-14T03:37:00+02:00',
            'schedule_timezone' => 'Europe/Rome',
        ]), ['Accept' => 'application/json'])->assertCreated()->json('data.id');

        $banner = BannerCampaign::findOrFail($id);
        $this->assertSame('scheduled', $banner->status);
        $this->assertSame('pending', $banner->approval_status);
        $this->assertSame('Europe/Rome', $banner->schedule_timezone);
        $this->assertSame('2026-09-14 00:37', $banner->starts_at->utc()->format('Y-m-d H:i'));
        $this->assertSame('2026-09-14 02:37', $banner->starts_at->setTimezone('Europe/Rome')->format('Y-m-d H:i'));

        Sanctum::actingAs($this->admin);
        $this->postJson('/api/admin/banner-campaigns/'.$id.'/actions', ['action' => 'approve', 'reason' => 'Schedule reviewed'])->assertOk()->assertJsonPath('data.status', 'scheduled');
        $snapshot = json_decode((string) DB::table('commerce_campaign_audits')->where('campaign_type', 'banner')->where('campaign_id', $id)->latest('id')->value('snapshot'), true);
        $this->assertSame('Europe/Rome', $snapshot['schedule_timezone']);
        $auditTimestamp = $this->getJson('/api/admin/banner-campaigns/'.$id.'/audits')->assertOk()->json('data.data.0.created_at');
        $this->assertStringEndsWith('Z', $auditTimestamp);

        $this->travelTo(\Carbon\CarbonImmutable::parse('2026-09-14 00:36:00', 'UTC'));
        app(\App\Jobs\RefreshCommerceCampaigns::class)->handle();
        $this->assertSame('scheduled', $banner->fresh()->status);
        $this->travelTo(\Carbon\CarbonImmutable::parse('2026-09-14 00:37:00', 'UTC'));
        app(\App\Jobs\RefreshCommerceCampaigns::class)->handle();
        $this->assertSame('active', $banner->fresh()->status);
        $this->travelTo(\Carbon\CarbonImmutable::parse('2026-09-14 01:37:00', 'UTC'));
        app(\App\Jobs\RefreshCommerceCampaigns::class)->handle();
        $this->assertSame('expired', $banner->fresh()->status);

        Sanctum::actingAs($this->seller);
        $karachiId = $this->post('/api/seller/banner-campaigns', $this->bannerData([
            'starts_at' => '2026-09-15T02:37:00+05:00',
            'ends_at' => '2026-09-15T03:37:00+05:00',
            'schedule_timezone' => 'Asia/Karachi',
        ]), ['Accept' => 'application/json'])->assertCreated()->json('data.id');
        $karachi = BannerCampaign::findOrFail($karachiId);
        $this->assertSame('Asia/Karachi', $karachi->schedule_timezone);
        $this->assertSame('2026-09-14 21:37', $karachi->starts_at->utc()->format('Y-m-d H:i'));
        $this->assertSame('2026-09-15 02:37', $karachi->starts_at->setTimezone('Asia/Karachi')->format('Y-m-d H:i'));
    }
    public function test_banner_edits_require_reapproval_and_invalidate_tokens(): void
    {
        $b=$this->banner(); $token=$this->serve()[0]['tracking_token']; Sanctum::actingAs($this->seller);
        $data=$this->bannerData(['title'=>'Changed title']); unset($data['desktop_image']);
        $this->putJson('/api/seller/banner-campaigns/'.$b->id,$data)->assertOk()->assertJsonPath('data.approval_status','pending');
        $this->assertSame([],$this->serve()); $this->event($token)->assertUnprocessable();
        Sanctum::actingAs($this->admin); $this->postJson('/api/admin/banner-campaigns/'.$b->id.'/actions',['action'=>'reject','reason'=>'Please improve contrast'])->assertOk();
        $this->assertEquals('Please improve contrast',$b->fresh()->rejection_reason);
        Sanctum::actingAs($this->seller); $this->postJson('/api/seller/banner-campaigns/'.$b->id.'/actions',['action'=>'resume'])->assertUnprocessable();
    }

    public function test_seller_and_admin_lifecycle_controls_are_available_before_a_schedule_starts(): void
    {
        $future = now()->addDay()->toIso8601String();
        $banner = $this->banner(['starts_at' => $future]);
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/banner-campaigns/'.$banner->id.'/actions', ['action' => 'pause'])->assertOk()->assertJsonPath('data.status', 'paused');
        $this->postJson('/api/seller/banner-campaigns/'.$banner->id.'/actions', ['action' => 'resume'])->assertOk()->assertJsonPath('data.status', 'scheduled');
        $this->postJson('/api/seller/banner-campaigns/'.$banner->id.'/actions', ['action' => 'delete'])->assertOk();
        $this->assertSoftDeleted('banner_campaigns', ['id' => $banner->id]);

        $discount = $this->discount(['starts_at' => $future]);
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/admin/discount-campaigns/'.$discount->id.'/actions', ['action' => 'pause'])->assertOk()->assertJsonPath('data.status', 'paused');
        $this->postJson('/api/admin/discount-campaigns/'.$discount->id.'/actions', ['action' => 'resume'])->assertOk()->assertJsonPath('data.status', 'scheduled');
        $this->postJson('/api/admin/discount-campaigns/'.$discount->id.'/actions', ['action' => 'delete'])->assertOk();
        $this->assertSoftDeleted('discount_campaigns', ['id' => $discount->id]);
    }
    public function test_banner_image_url_destination_and_permissions_validation(): void
    {
        Sanctum::actingAs($this->seller);
        foreach ([['alt_text'=>''],['desktop_image'=>UploadedFile::fake()->create('bad.svg',10,'image/svg+xml')],['ends_at'=>now()->subDay()->toIso8601String()],['destination_type'=>'external_url','destination_url'=>'javascript:alert(1)'],['destination_type'=>'internal_url','destination_url'=>'//evil.example'],['type'=>'paid']] as $invalid) {
            $this->post('/api/seller/banner-campaigns',$this->bannerData($invalid),['Accept'=>'application/json'])->assertUnprocessable();
        }
        $b=$this->banner(); Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/banner-campaigns/'.$b->id.'/actions',['action'=>'approve','reason'=>'Self approval'])->assertForbidden();
        Sanctum::actingAs($this->buyer); $this->getJson('/api/admin/banner-campaigns')->assertForbidden();
        $this->postJson('/api/seller/banner-campaigns/'.$b->id.'/actions',['action'=>'cancel'])->assertForbidden();
    }
    public function test_tracking_replay_unique_impressions_and_forged_tokens(): void
    {
        $b=$this->banner(); $token=$this->serve()[0]['tracking_token'];
        $this->event($token,'click')->assertUnprocessable(); $this->event($token)->assertOk(); $this->event($token)->assertOk();
        $this->event($token,'click')->assertOk(); $this->event($token,'click')->assertOk(); $this->assertDatabaseCount('banner_events',2);
        $token2=$this->serve()[0]['tracking_token']; $this->event($token2)->assertOk();
        $m=app(CampaignAnalyticsService::class)->metrics($b); $this->assertEquals(2,$m['impressions']); $this->assertEquals(1,$m['unique_impressions']); $this->assertEquals(50,$m['ctr']);
        $this->event('forged')->assertUnprocessable(); $this->event($token,'conversion')->assertUnprocessable();
        $this->travel(31)->minutes(); $this->event($token)->assertForbidden();
    }
    public function test_legacy_import_preserves_prices_and_images_and_skips_ads(): void
    {
        ProductPromotion::create(['store_id'=>$this->store->id,'product_id'=>$this->product->id,'discount_type'=>'percentage','discount_value'=>20,'applies_to_price'=>true,'budget'=>0,'duration_days'=>1,'start_date'=>now(),'end_date'=>now()->addDay(),'status'=>'active']);
        ProductPromotion::create(['store_id'=>$this->store->id,'product_id'=>$this->product->id,'discount_type'=>'budget','applies_to_price'=>false,'budget'=>20,'duration_days'=>1,'start_date'=>now(),'end_date'=>now()->addDay(),'status'=>'active']);
        $legacy=StoreBanner::create(['store_id'=>$this->store->id,'image'=>'legacy/banner.jpg','title'=>'Legacy','link'=>'https://example.com/sale','position'=>'middle','sort_order'=>4,'is_active'=>true,'is_approved'=>true,'is_home_boosted'=>true]);
        app(LegacyCampaignImportService::class)->import(); app(LegacyCampaignImportService::class)->import();
        $this->assertDatabaseCount('discount_campaigns',1); $this->assertDatabaseCount('banner_campaigns',1); $this->assertDatabaseCount('product_promotions',2); $this->assertDatabaseCount('store_banners',1);
        $this->assertSame('100.00',$this->product->fresh()->price); $this->assertSame('150.00',$this->product->fresh()->compare_at_price);
        $this->assertNotNull(DiscountCampaign::first()->review_reason); $this->assertSame('draft',DiscountCampaign::first()->status);
        $b=BannerCampaign::first(); $this->assertSame('approved',$b->approval_status); $this->assertSame('legacy/banner.jpg',$b->creatives->first()->desktop_image);
        $this->assertEquals(4,$b->creatives->first()->sort_order); $this->assertEquals($legacy->link,$b->destination_url);
    }

    public function test_selected_options_are_owned_and_lens_prices_are_authoritative(): void
    {
        $this->discount(['scope'=>'store']);
        $material=\App\Models\LensThicknessMaterial::create(['name'=>'Glass','slug'=>'glass','price'=>30,'is_active'=>true]);
        $treatment=\App\Models\LensTreatment::create(['name'=>'Coat','slug'=>'coat','type'=>'anti_glare','price'=>10,'is_active'=>true]);
        $this->assertEquals(112,$this->quote(['lens_thickness_material_id'=>$material->id,'treatment_ids'=>[$treatment->id],'price'=>1])['discounted_price']);
        $this->product->update(['contact_lens_unit_config'=>['packs'=>[['quantity'=>30,'price'=>50]]]]);
        $this->assertEquals(40,$this->quote(['contact_lens_pack_quantity'=>30])['discounted_price']);
        $other=Product::create(['store_id'=>$this->store->id,'name'=>'Other','slug'=>'other-product','sku'=>'other-product','price'=>300]);
        $v=ProductVariant::create(['product_id'=>$other->id,'color_name'=>'Other','price'=>1]);
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/campaigns/products/'.$this->product->id.'/price',['selection'=>['variant_id'=>$v->id]])->assertNotFound();
        $this->postJson('/api/buyer/campaigns/products/'.$this->product->id.'/price',['selection'=>['progressive_variant_id'=>999]])->assertUnprocessable();
    }

    public function test_catalog_filters_and_lens_configuration_use_the_current_campaign_price(): void
    {
        $category = Category::create(['name' => 'Prescription frames', 'slug' => 'prescription-frames', 'is_active' => true]);
        $this->product->update(['category_id' => $category->id]);
        $allowed = \App\Models\LensType::create(['name' => 'Standard', 'slug' => 'standard', 'index' => 1.50, 'price_adjustment' => 10, 'is_active' => true]);
        $unavailable = \App\Models\LensType::create(['name' => 'Premium', 'slug' => 'premium', 'index' => 1.67, 'price_adjustment' => 30, 'is_active' => true]);
        DB::table('store_category_lens_types')->insert([
            'store_id' => $this->store->id,
            'category_id' => $category->id,
            'lens_type_id' => $allowed->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->discount();
        $this->assertEquals(88, $this->quote(['lens_type' => 'Standard'])['discounted_price']);
        try {
            $this->quote(['lens_type' => 'Premium']);
            $this->fail('An unconfigured category lens option must not be priced.');
        } catch (\Illuminate\Validation\ValidationException $exception) {
            $this->assertArrayHasKey('lens_type', $exception->errors());
        }

        Product::create(['store_id' => $this->store->id, 'name' => 'Full price', 'slug' => 'full-price', 'sku' => 'full-price', 'price' => 120,
            'stock_quantity' => 10, 'stock_status' => 'in_stock', 'is_active' => true, 'is_approved' => true, 'is_muted' => false]);
        $this->getJson('/api/buyer/product/get-all?max_price=90&sort_by=price&sort_order=asc')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $this->product->id)
            ->assertJsonPath('data.data.0.price', 80);
    }

    public function test_category_store_filtering_and_one_seller_per_placement(): void
    {
        $category=Category::create(['name'=>'Category','slug'=>'category','is_active'=>true]);
        $this->banner(['placement'=>'category_page','targeting'=>['category_id'=>$category->id]]);
        $this->assertCount(1,$this->serve('category_page',['category_id'=>$category->id]));
        $other=Category::create(['name'=>'Other','slug'=>'other-category','is_active'=>true]);
        $this->assertSame([],$this->serve('category_page',['category_id'=>$other->id]));
        $this->banner(['placement'=>'store_page']); $this->assertCount(1,$this->serve('store_page',['store_id'=>$this->store->id]));
        $this->banner(['placement'=>'homepage_featured']); $this->banner(['placement'=>'homepage_featured']);
        $this->assertCount(1,$this->serve('homepage_featured'));
    }

    public function test_conversion_requires_paid_order_evidence_and_is_idempotent(): void
    {
        $b=$this->banner(); $token=$this->serve()[0]['tracking_token']; $this->event($token)->assertOk(); $this->event($token,'click')->assertOk();
        $order=Order::create(['user_id'=>$this->buyer->id,'order_no'=>Order::generateOrderNumber(),'payment_status'=>'pending','items_total'=>100,'shipping_total'=>0,'platform_fee'=>0,'discount_total'=>0,'grand_total'=>100]);
        $so=StoreOrder::create(['order_id'=>$order->id,'store_id'=>$this->store->id,'status'=>'pending','subtotal'=>100,'total'=>100,'delivery_fee'=>0,'delivery_code'=>'123456']);
        OrderItem::create(['store_order_id'=>$so->id,'product_id'=>$this->product->id,'quantity'=>1,'price'=>100,'line_total'=>100,'product_name'=>'Glasses','product_sku'=>'glasses']);
        app(BannerDeliveryService::class)->convert($so); $this->assertEquals(0,$b->events()->where('type','conversion')->count());
        $so->update(['status'=>'paid']); $this->assertEquals(0,$b->events()->where('type','conversion')->count());
        Escrow::create(['order_id'=>$order->id,'store_order_id'=>$so->id,'amount'=>100,'shipping_fee'=>0,'status'=>'locked','locked_at'=>now()]);
        app(BannerDeliveryService::class)->convert($so); app(BannerDeliveryService::class)->convert($so);
        $this->assertEquals(1,$b->events()->where('type','conversion')->count()); $this->assertEquals(100,app(CampaignAnalyticsService::class)->metrics($b)['attributed_revenue']);
        app(\App\Jobs\AggregateCommerceCampaigns::class)->handle(); app(\App\Jobs\AggregateCommerceCampaigns::class)->handle();
        $this->assertEquals(1,DB::table('commerce_campaign_analytics')->where('campaign_type','banner')->where('campaign_id',$b->id)->count());
    }

    public function test_seller_preview_does_not_persist_and_lifecycle_actions_preserve_history(): void
    {
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/discount-campaigns/preview',$this->discountData())->assertOk()->assertJsonPath('data.prices.0.discounted_price',80);
        $this->assertDatabaseCount('discount_campaigns',0);
        $c=$this->discount(); $this->postJson('/api/seller/discount-campaigns/'.$c->id.'/actions',['action'=>'pause'])->assertOk();
        $this->postJson('/api/seller/discount-campaigns/'.$c->id.'/actions',['action'=>'resume'])->assertOk();
        $this->postJson('/api/seller/discount-campaigns/'.$c->id.'/actions',['action'=>'duplicate'])->assertOk()->assertJsonPath('data.status','draft');
        $this->postJson('/api/seller/discount-campaigns/'.$c->id.'/actions',['action'=>'cancel'])->assertOk();
        $this->assertDatabaseHas('discount_campaigns',['id'=>$c->id,'status'=>'cancelled']);
    }

    public function test_parallel_orders_cannot_exceed_total_usage_limit(): void
    {
        $c=$this->discount(['usage_limit'=>1]); $c->update(['starts_at'=>now()->subYear(),'ends_at'=>now()->addYear()]);
        $other=User::factory()->create(['role'=>'buyer']); $users=[$this->buyer,$other]; $addresses=[];
        foreach ($users as $user) {
            $cart=Cart::create(['user_id'=>$user->id]); $cart->items()->create(['product_id'=>$this->product->id,'store_id'=>$this->store->id,'quantity'=>1,'price'=>1]);
            $addresses[]=UserAddress::create(['user_id'=>$user->id,'full_name'=>'Test buyer','phone'=>'123456789','address_line_1'=>'Test street','postal_code'=>'10000'])->id;
        }
        // Commit only this disposable test's fixtures so the two independent DB connections can see them.
        DB::commit(); $barrier=storage_path('framework/testing/campaign-race-'.Str::uuid()); $processes=[];
        foreach ($users as $i=>$user) {
            $pipes=[]; $process=proc_open([PHP_BINARY,base_path('tests/Support/campaign-race-worker.php'),(string)$user->id,(string)$addresses[$i],$barrier],
                [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes,base_path());
            $processes[]=[$process,$pipes];
        }
        file_put_contents($barrier,'go');
        foreach ($processes as [$process,$pipes]) {
            fclose($pipes[0]); $out=stream_get_contents($pipes[1]); $err=stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]);
            $this->assertSame(0,proc_close($process),$out.$err);
        }
        $this->assertEquals(1,$c->fresh()->usage_count); $this->assertEquals(1,$c->usages()->count());
        $totals=Order::whereIn('user_id',[$this->buyer->id,$other->id])->orderBy('grand_total')->pluck('grand_total')->map(fn($v)=>(float)$v)->all();
        $this->assertEquals([80,100],$totals);
    }
}
