<?php

namespace App\Http\Controllers\Optical;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Seller\SellerProductController;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PublicationController extends Controller
{
    public function cancel(Request $r, string $key)
    {
        $g = $r->attributes->get('optical_grant');

        return DB::transaction(function () use ($g, $key) {
            Store::whereKey($g->store_id)->lockForUpdate()->firstOrFail();
            $q = DB::table('optical_operations')->where('store_id', $g->store_id)->where('client_id', $g->client_id)->where('operation_key', $key);
            if ($old = $q->first()) {
                abort_unless((json_decode($old->result, true)['cancelled'] ?? false) === true, 409, 'Publication already accepted. Retry reconciliation before another allocation.');
            } else {
                DB::table('optical_operations')->insert(['store_id' => $g->store_id, 'client_id' => $g->client_id, 'operation_key' => $key, 'payload_hash' => str_repeat('0', 64), 'result' => json_encode(['cancelled' => true]), 'created_at' => now(), 'updated_at' => now()]);
            }

            return ['data' => ['cancelled' => true, 'operation_key' => $key]];
        });
    }

    public function image(Request $r)
    {
        $d = $r->validate(['file' => 'required|file|mimes:jpg,jpeg,png|max:10240', 'image_key' => 'required|uuid']);
        $store = $r->attributes->get('optical_store');
        $grant = $r->attributes->get('optical_grant');
        $file = $r->file('file');
        $hash = hash_file('sha256', $file->getRealPath());

        return DB::transaction(function () use ($d, $store, $grant, $file, $hash) {
            Store::whereKey($store->id)->lockForUpdate()->firstOrFail();
            $old = DB::table('optical_images')->where('id', $d['image_key'])->first();
            if ($old) {
                abort_unless($old->store_id === $store->id && $old->client_id === $grant->client_id && hash_equals($old->sha256, $hash), 409, 'Image request already used.');

                return ['data' => ['id' => $old->id]];
            }
            $info = @getimagesize($file->getRealPath());
            abort_unless($info && $info[0] > 0 && $info[1] > 0 && $info[0] * $info[1] <= 16000000, 422, 'Image exceeds safe dimensions.');
            $image = @imagecreatefromstring(file_get_contents($file->getRealPath()));
            abort_unless($image, 422, 'Image cannot be decoded.');
            ob_start();
            try {
                imagealphablending($image, false);
                imagesavealpha($image, true);
                imagepng($image, null, 6);
                $bytes = ob_get_contents();
            } finally {
                ob_end_clean();
                imagedestroy($image);
            }
            abort_unless($bytes && strlen($bytes) <= 20 * 1024 * 1024, 422);
            $path = 'optical/'.$store->id.'/'.$d['image_key'].'.png';
            abort_unless(Storage::disk('public')->put($path, $bytes), 503, 'Image storage unavailable.');
            DB::table('optical_images')->insert(['id' => $d['image_key'], 'store_id' => $store->id, 'client_id' => $grant->client_id, 'sha256' => $hash, 'storage_key' => $path, 'created_at' => now(), 'updated_at' => now()]);

            return ['data' => ['id' => $d['image_key']]];
        });
    }

    public function publish(Request $r)
    {
        $d = $r->validate(['external_key' => 'required|uuid', 'operation_key' => 'required|uuid', 'allocated_quantity' => 'required|integer|min:0|max:1000000', 'currency' => 'required|in:EUR', 'product' => 'required|array', 'images' => 'required|array|min:1|max:10', 'images.*' => 'required|uuid', 'expected_version' => 'nullable|string|size:64']);
        $store = $r->attributes->get('optical_store');
        $grant = $r->attributes->get('optical_grant');
        $actor = $r->attributes->get('optical_user');
        $hash = hash('sha256', json_encode($d, JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($d, $store, $grant, $actor, $hash) {
            Store::whereKey($store->id)->lockForUpdate()->firstOrFail();
            $existing = DB::table('optical_operations')->where('store_id', $store->id)->where('client_id', $grant->client_id)->where('operation_key', $d['operation_key'])->first();
            if ($existing) {
                abort_unless(hash_equals($existing->payload_hash, $hash), 409, 'Operation already used with different data.');

                return ['data' => json_decode($existing->result, true)];
            }
            $link = DB::table('optical_product_links')->where('store_id', $store->id)->where('client_id', $grant->client_id)->where('external_key', $d['external_key'])->first();
            $images = DB::table('optical_images')->whereIn('id', $d['images'])->where('store_id', $store->id)->where('client_id', $grant->client_id)->get();
            abort_unless($images->count() === count(array_unique($d['images'])), 422, 'Use images uploaded by this seller connection.');
            // Allowlisted seller fields only. Price/stock/admin moderation cannot be supplied indirectly.
            $allowed = ['name', 'sku', 'description', 'short_description', 'category_id', 'sub_category_id', 'product_type', 'price', 'frame_shape', 'frame_material', 'frame_color', 'gender', 'lens_type', 'base_curve_options', 'diameter_options', 'powers_range', 'replacement_frequency', 'contact_lens_brand', 'contact_lens_color', 'contact_lens_material', 'contact_lens_type', 'has_uv_filter', 'can_sleep_with', 'water_content', 'is_medical_device', 'size_volume', 'pack_type', 'expiry_date'];
            abort_if(count(array_diff(array_keys($d['product']), $allowed)) > 0, 422, 'Unsupported product fields.');
            $fields = $d['product'];
            if (! $link) {
                $enabled = \App\Models\StoreCategoryFieldConfig::where('store_id', $store->id)->where('category_id', $fields['category_id'] ?? 0)->value('field_config');
                if (is_array($enabled) && count(array_filter($enabled))) {
                    $base = ['name', 'sku', 'description', 'short_description', 'category_id', 'sub_category_id', 'product_type', 'price'];
                    foreach ($fields as $field => $value) {
                        if (! in_array($field, $base) && $value !== null && $value !== '' && ! ($enabled[$field] ?? false)) {
                            throw \Illuminate\Validation\ValidationException::withMessages(['product.'.$field => 'This field is disabled in the seller category configuration. Enable it there or select a compatible category.']);
                        }
                    }
                }
            }
            $category = Category::where('is_active', true)->findOrFail($fields['category_id'] ?? 0);
            if (! empty($fields['sub_category_id'])) {
                abort_unless(Category::where('is_active', true)->where('parent_id', $category->id)->whereKey($fields['sub_category_id'])->exists(), 422, 'Invalid subcategory.');
            }
            $fields['images'] = collect($d['images'])->map(fn ($id) => url(Storage::disk('public')->url($images->firstWhere('id', $id)->storage_key)))->all();
            if ($link) {
                $p = Product::where('store_id', $store->id)->lockForUpdate()->findOrFail($link->product_id);
                abort_unless(isset($d['expected_version']) && hash_equals(self::version($p), $d['expected_version']), 409, 'Vista product changed. Refresh and review before publishing an update.');
                abort_if($p->variants()->exists() || $p->frameSizes()->exists() || $p->sizeVolumeVariants()->exists(), 409, 'This Vista product now has independently managed variants. Update it in the seller panel.');
                $fields['stock_quantity'] = $p->stock_quantity + (int) $d['allocated_quantity'];
            } else {
                abort_if(! empty($d['expected_version']), 409, 'No existing publication for this product.');
                $fields['stock_quantity'] = (int) $d['allocated_quantity'];
            }
            $fields['stock_status'] = $fields['stock_quantity'] > 0 ? 'in_stock' : 'out_of_stock';
            $method = $link ? 'PUT' : 'POST';
            $input = Request::create('/api/seller/products'.($link ? '/'.$p->id : ''), $method, $fields);
            $input->setUserResolver(fn () => $actor);
            $guard = Auth::guard();
            $previous = $guard->user();
            $guard->setUser($actor);
            try {
                $controller = app(SellerProductController::class);
                $response = $link ? $controller->update($input, $p->id) : $controller->store($input);
            } finally {
                $previous ? $guard->setUser($previous) : $guard->forgetUser();
            }
            $result = $response->getData(true);
            abort_unless(($result['success'] ?? false) && $response->getStatusCode() < 400, 422, 'Vista seller product validation failed. Check the mapped product fields and SKU.');
            $p = Product::where('store_id', $store->id)->findOrFail($result['data']['id']);
            if (! $link) {
                DB::table('optical_product_links')->insert(['store_id' => $store->id, 'client_id' => $grant->client_id, 'external_key' => $d['external_key'], 'product_id' => $p->id, 'created_at' => now(), 'updated_at' => now()]);
            }
            DB::table('optical_images')->whereIn('id', $d['images'])->where('store_id', $store->id)->update(['product_id' => $p->id, 'updated_at' => now()]);
            $result = $this->result($p, $d['external_key']);
            DB::table('optical_operations')->insert(['store_id' => $store->id, 'client_id' => $grant->client_id, 'operation_key' => $d['operation_key'], 'payload_hash' => $hash, 'result' => json_encode($result, JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);

            return ['data' => $result];
        });
    }

    public static function version(Product $p): string
    {
        return hash('sha256', json_encode($p->only(['name', 'sku', 'description', 'short_description', 'category_id', 'sub_category_id', 'product_type', 'price', 'images', 'frame_shape', 'frame_material', 'frame_color', 'gender', 'lens_type', 'base_curve_options', 'diameter_options', 'powers_range', 'replacement_frequency', 'contact_lens_brand', 'contact_lens_color', 'contact_lens_material', 'contact_lens_type', 'has_uv_filter', 'can_sleep_with', 'water_content', 'is_medical_device', 'size_volume', 'pack_type', 'expiry_date', 'is_active', 'is_approved', 'is_muted', 'updated_at']), JSON_THROW_ON_ERROR));
    }

    private function result(Product $p, string $key): array
    {
        return ['external_key' => $key, 'product_id' => $p->id, 'version' => self::version($p), 'stock_quantity' => $p->stock_quantity, 'visible' => Product::visibleToBuyers()->whereKey($p->id)->exists(), 'source' => 'vista_express'];
    }

    public function show(Request $r, string $key)
    {
        $grant = $r->attributes->get('optical_grant');
        $link = DB::table('optical_product_links')->where('store_id', $grant->store_id)->where('client_id', $grant->client_id)->where('external_key', $key)->first();
        abort_unless($link, 404);

        return ['data' => $this->result(Product::where('store_id', $grant->store_id)->findOrFail($link->product_id), $key)];
    }
}
