<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Category;
use App\Models\StoreCategoryFieldConfig;
use App\Http\Requests\Seller\Store\UploadImageRequest;
use App\Services\Product\EyeHygieneVariantService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SellerProductController extends Controller
{
    public function __construct(private EyeHygieneVariantService $eyeHygieneVariantService)
    {
    }

    /** @return array<string, mixed> */
    private function eyeHygieneVariantRules(): array
    {
        return [
            'size_volume_variants' => 'nullable|array',
            'size_volume_variants.*.id' => 'nullable|integer',
            'size_volume_variants.*.size_volume' => 'required_with:size_volume_variants|string|max:50',
            'size_volume_variants.*.pack_type' => 'nullable|string|max:50',
            'size_volume_variants.*.price' => 'nullable|numeric|min:0',
            'size_volume_variants.*.compare_at_price' => 'nullable|numeric|min:0',
            'size_volume_variants.*.cost_price' => 'nullable|numeric|min:0',
            'size_volume_variants.*.stock_quantity' => 'nullable|integer|min:0',
            'size_volume_variants.*.stock_status' => 'nullable|in:in_stock,out_of_stock,backorder',
            'size_volume_variants.*.sku' => 'nullable|string|max:255',
            'size_volume_variants.*.expiry_date' => 'nullable|date',
            'size_volume_variants.*.image_url' => 'nullable|string|max:2048',
            'size_volume_variants.*.is_active' => 'nullable|boolean',
            'size_volume_variants.*.sort_order' => 'nullable|integer|min:0',
            'eye_hygiene_variants' => 'nullable|array',
            'eye_hygiene_variants.*.id' => 'nullable|integer',
            'eye_hygiene_variants.*.name' => 'required_with:eye_hygiene_variants|string|max:255',
            'eye_hygiene_variants.*.description' => 'nullable|string',
            'eye_hygiene_variants.*.price' => 'nullable|numeric|min:0',
            'eye_hygiene_variants.*.image_url' => 'nullable|string|max:2048',
            'eye_hygiene_variants.*.is_active' => 'nullable|boolean',
            'eye_hygiene_variants.*.sort_order' => 'nullable|integer|min:0',
        ];
    }

    /** @param array<string, mixed> $validated */
    private function persistEyeHygieneVariants(Product $product, array $validated): void
    {
        if ($product->product_type !== 'eye_hygiene') {
            return;
        }

        if (array_key_exists('size_volume_variants', $validated)) {
            $this->eyeHygieneVariantService->syncSizeVolumeVariants(
                $product,
                $validated['size_volume_variants'] ?? []
            );
        }

        if (array_key_exists('eye_hygiene_variants', $validated)) {
            $this->eyeHygieneVariantService->syncEyeHygieneVariants(
                $product,
                $validated['eye_hygiene_variants'] ?? []
            );
        }
    }

    private function productDetailRelations(): array
    {
        return ['category', 'subCategory', 'frameSizes', 'sizeVolumeVariants', 'eyeHygieneVariants'];
    }
    /**
     * Get all products for the authenticated seller's store.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $query = Product::where('store_id', $store->id)
            ->with(['category', 'subCategory']);

        // Filter by status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active === 'true' || $request->is_active === true);
        }

        // Filter by product type
        if ($request->has('product_type')) {
            $query->where('product_type', $request->product_type);
        }

        // Filter by category
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by featured
        if ($request->has('is_featured')) {
            $query->where('is_featured', $request->is_featured === 'true' || $request->is_featured === true);
        }

        // Filter by on sale (has compare_at_price)
        if ($request->has('on_sale')) {
            if ($request->on_sale === 'true' || $request->on_sale === true) {
                $query->whereNotNull('compare_at_price')
                      ->where('compare_at_price', '>', \DB::raw('price'));
            }
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $products = $query->paginate($request->get('per_page', 15));

        // Add product metrics (sales count and revenue)
        $products->getCollection()->transform(function ($product) use ($store) {
            $salesData = \DB::table('order_items')
                ->join('store_orders', 'order_items.store_order_id', '=', 'store_orders.id')
                ->where('order_items.product_id', $product->id)
                ->where('store_orders.store_id', $store->id)
                ->whereIn('store_orders.status', ['paid', 'delivered'])
                ->selectRaw('SUM(order_items.quantity) as total_sold, SUM(order_items.line_total) as total_revenue')
                ->first();

            $product->total_sold = (int) ($salesData->total_sold ?? 0);
            $product->total_revenue = (float) ($salesData->total_revenue ?? 0);
            
            return $product;
        });

        return ResponseHelper::success($products, 'Products retrieved successfully');
    }

    /**
     * Get product details.
     */
    public function show($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)
            ->with($this->productDetailRelations())
            ->findOrFail($id);

        return ResponseHelper::success($product, 'Product retrieved successfully');
    }

    /**
     * Get enabled fields for a category.
     */
    private function getEnabledFieldsForCategory($storeId, $categoryId): array
    {
        $config = StoreCategoryFieldConfig::where('store_id', $storeId)
            ->where('category_id', $categoryId)
            ->first();

        if (!$config || empty($config->field_config)) {
            // Return all fields as enabled if no config exists (backward compatibility)
            return [];
        }

        $enabledFields = [];
        foreach ($config->field_config as $field => $enabled) {
            if ($enabled) {
                $enabledFields[] = $field;
            }
        }

        return $enabledFields;
    }

    /**
     * Create a new product.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        // Base validation rules (always required)
        $baseRules = [
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'sub_category_id' => 'nullable|exists:categories,id',
            'sku' => 'nullable|string|max:255|unique:products,sku',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'product_type' => 'required|in:frame,sunglasses,contact_lens,eye_hygiene,accessory',
            'price' => 'required|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'sale_start_date' => 'nullable|date',
            'sale_end_date' => 'nullable|date|after_or_equal:sale_start_date',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'stock_status' => 'required|in:in_stock,out_of_stock,backorder',
            'images' => 'nullable|array',
            'images.*' => 'string|url',
            'is_featured' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'shipping_type' => 'nullable|in:free,fixed',
            'shipping_fee' => 'nullable|numeric|min:0',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
        ];

        // Get enabled fields for category if category_id is provided
        $enabledFields = [];
        if ($request->has('category_id') && $request->category_id) {
            $enabledFields = $this->getEnabledFieldsForCategory($store->id, $request->category_id);
        }

        // Define all possible field rules
        $allFieldRules = [
            'frame_shape' => 'nullable|string|max:255',
            'frame_material' => 'nullable|string|max:255',
            'frame_color' => 'nullable|string|max:255',
            'gender' => 'nullable|in:men,women,unisex,kids',
            'lens_type' => 'nullable|string',
            'lens_index_options' => 'nullable|array',
            'treatment_options' => 'nullable|array',
            'base_curve_options' => 'nullable|array',
            'base_curve_options.*' => 'string',
            'diameter_options' => 'nullable|array',
            'diameter_options.*' => 'string',
            'powers_range' => 'nullable|string',
            'replacement_frequency' => 'nullable|string|max:50',
            'contact_lens_brand' => 'nullable|string|max:100',
            'contact_lens_color' => 'nullable|string|max:100',
            'contact_lens_material' => 'nullable|string|max:100',
            'contact_lens_type' => 'nullable|string|max:50',
            'has_uv_filter' => 'nullable|boolean',
            'can_sleep_with' => 'nullable|boolean',
            'water_content' => 'nullable|string|max:50',
            'is_medical_device' => 'nullable|boolean',
            'size_volume' => 'nullable|string|max:50',
            'pack_type' => 'nullable|string|max:50',
            'expiry_date' => 'nullable|date',
            'model_3d_url' => 'nullable|string|max:500|url',
            'try_on_image' => 'nullable|string|max:500|url',
            'color_images' => 'nullable|array',
            'color_images.*' => 'string|url',
            'mm_calibers' => 'nullable|array',
            'lens_colors' => 'nullable|array',
            'lens_colors.*.id' => 'nullable|integer',
            'lens_colors.*.name' => 'required_with:lens_colors|string|max:100',
            'lens_colors.*.color_code' => 'nullable|string|max:20',
            'lens_colors.*.description' => 'nullable|string|max:255',
        ];

        // Build validation rules: include base rules + only enabled fields
        $validationRules = array_merge($baseRules, $this->eyeHygieneVariantRules());
        
        if (empty($enabledFields)) {
            // If no config exists, allow all fields (backward compatibility)
            $validationRules = array_merge($validationRules, $allFieldRules);
        } else {
            // Only include enabled fields
            foreach ($enabledFields as $field) {
                if (isset($allFieldRules[$field])) {
                    $validationRules[$field] = $allFieldRules[$field];
                }
            }
        }

        $validated = $request->validate($validationRules);

        // Remove disabled fields from validated data
        if (!empty($enabledFields)) {
            $filteredValidated = [];
            foreach ($validated as $key => $value) {
                // Keep base fields, enabled fields, and eye hygiene variant arrays
                if (
                    in_array($key, array_keys($baseRules))
                    || in_array($key, $enabledFields)
                    || in_array($key, ['size_volume_variants', 'eye_hygiene_variants'], true)
                ) {
                    $filteredValidated[$key] = $value;
                }
            }
            $validated = $filteredValidated;
        }

        $variantPayload = [
            'size_volume_variants' => $validated['size_volume_variants'] ?? null,
            'eye_hygiene_variants' => $validated['eye_hygiene_variants'] ?? null,
        ];
        unset($validated['size_volume_variants'], $validated['eye_hygiene_variants']);

        try {
            $validated['store_id'] = $store->id;
            $sku = trim((string) ($validated['sku'] ?? ''));
            $validated['sku'] = $sku !== '' ? $sku : $this->generateUniqueSku($store->id);
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
            
            // Ensure slug is unique
            while (Product::where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
            }

            // Auto-publish: no admin approval gate for new listings
            $validated['is_approved'] = true;
            $validated['rejection_reason'] = null;
            if (!array_key_exists('is_active', $validated)) {
                $validated['is_active'] = true;
            }

            $product = Product::create($validated);

            $this->persistEyeHygieneVariants($product, array_filter($variantPayload, fn ($v) => $v !== null));

            return ResponseHelper::success(
                $product->load($this->productDetailRelations()),
                'Product created successfully'
            );
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to create product: ' . $e->getMessage());
        }
    }

    /**
     * Update a product.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($id);

        $validated = $request->validate(array_merge([
            'name' => 'sometimes|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'sub_category_id' => 'nullable|exists:categories,id',
            'sku' => 'sometimes|string|max:255|unique:products,sku,' . $id,
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'product_type' => 'sometimes|in:frame,sunglasses,contact_lens,eye_hygiene,accessory',
            'price' => 'sometimes|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'sale_start_date' => 'nullable|date',
            'sale_end_date' => 'nullable|date|after_or_equal:sale_start_date',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'stock_status' => 'sometimes|in:in_stock,out_of_stock,backorder',
            'images' => 'nullable|array',
            'images.*' => 'string|url',
            'frame_shape' => 'nullable|string|max:255',
            'frame_material' => 'nullable|string|max:255',
            'frame_color' => 'nullable|string|max:255',
            'gender' => 'nullable|in:men,women,unisex,kids',
            'lens_type' => 'nullable|string',
            'lens_index_options' => 'nullable|array',
            'treatment_options' => 'nullable|array',
            'is_featured' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'shipping_type' => 'nullable|in:free,fixed',
            'shipping_fee' => 'nullable|numeric|min:0',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
            // Contact Lens Specific Fields
            'base_curve_options' => 'nullable|array',
            'base_curve_options.*' => 'string',
            'diameter_options' => 'nullable|array',
            'diameter_options.*' => 'string',
            'powers_range' => 'nullable|string',
            'replacement_frequency' => 'nullable|string|max:50',
            'contact_lens_brand' => 'nullable|string|max:100',
            'contact_lens_color' => 'nullable|string|max:100',
            'contact_lens_material' => 'nullable|string|max:100',
            'contact_lens_type' => 'nullable|string|max:50',
            'has_uv_filter' => 'nullable|boolean',
            'can_sleep_with' => 'nullable|boolean',
            'water_content' => 'nullable|string|max:50',
            'is_medical_device' => 'nullable|boolean',
            // Eye Hygiene Specific Fields
            'size_volume' => 'nullable|string|max:50',
            'pack_type' => 'nullable|string|max:50',
            'expiry_date' => 'nullable|date',
            // Additional Fields
            'model_3d_url' => 'nullable|string|max:500|url',
            'try_on_image' => 'nullable|string|max:500|url',
            'color_images' => 'nullable|array',
            'color_images.*' => 'string|url',
            'mm_calibers' => 'nullable|array',
            'lens_colors' => 'nullable|array',
            'lens_colors.*.id' => 'nullable|integer',
            'lens_colors.*.name' => 'required_with:lens_colors|string|max:100',
            'lens_colors.*.color_code' => 'nullable|string|max:20',
            'lens_colors.*.description' => 'nullable|string|max:255',
            'shipping_type' => 'nullable|in:free,fixed',
            'shipping_fee' => 'nullable|numeric|min:0',
        ], $this->eyeHygieneVariantRules()));

        $variantPayload = [
            'size_volume_variants' => $validated['size_volume_variants'] ?? null,
            'eye_hygiene_variants' => $validated['eye_hygiene_variants'] ?? null,
        ];
        unset($validated['size_volume_variants'], $validated['eye_hygiene_variants']);

        try {
            // Update slug if name changed
            if (isset($validated['name']) && $validated['name'] !== $product->name) {
                $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
                while (Product::where('slug', $validated['slug'])->where('id', '!=', $id)->exists()) {
                    $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
                }
            }

            $product->update($validated);

            $this->persistEyeHygieneVariants($product, array_filter($variantPayload, fn ($v) => $v !== null));

            return ResponseHelper::success(
                $product->load($this->productDetailRelations()),
                'Product updated successfully'
            );
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to update product: ' . $e->getMessage());
        }
    }

    /**
     * Delete a product.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($id);

        try {
            $product->delete();

            return ResponseHelper::success(null, 'Product deleted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to delete product: ' . $e->getMessage());
        }
    }

    /**
     * Toggle product active status.
     */
    public function toggleStatus($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($id);

        try {
            $product->is_active = !$product->is_active;
            $product->save();

            return ResponseHelper::success(
                $product->load(['category', 'subCategory']),
                'Product status updated successfully'
            );
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to update product status: ' . $e->getMessage());
        }
    }

    /**
     * Boost a product (wallet or checkout stub pending payment).
     */
    public function boost(Request $request, $id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($id);

        $validated = $request->validate([
            'location' => 'required|string|max:100',
            'budget' => 'required|numeric|min:0.01',
            'start_at' => 'nullable|date',
            'end_at' => 'nullable|date|after_or_equal:start_at',
            'pay_method' => 'required|in:wallet,checkout_stub',
        ]);

        $budget = (float) $validated['budget'];
        $product->boost_location = $validated['location'];
        $product->boost_budget = $budget;
        $product->boost_start_at = $validated['start_at'] ?? now();
        $product->boost_end_at = $validated['end_at'] ?? null;

        if ($validated['pay_method'] === 'wallet') {
            $wallet = \App\Models\Wallet::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'shopping_balance' => 0,
                    'reward_balance' => 0,
                    'referral_balance' => 0,
                    'loyality_points' => 0,
                    'ad_credit' => 0,
                ]
            );

            $available = (float) $wallet->ad_credit + (float) $wallet->shopping_balance;
            if ($available < $budget) {
                $product->is_boosted = false;
                $product->boost_payment_status = 'pending_payment';
                $product->boosted_at = null;
                $product->save();

                return ResponseHelper::success(
                    [
                        'product' => $product->fresh()->load(['category', 'subCategory']),
                        'message' => 'Insufficient wallet balance. Boost is pending payment.',
                    ],
                    'Boost pending payment'
                );
            }

            $remaining = $budget;
            $fromAd = min((float) $wallet->ad_credit, $remaining);
            $wallet->ad_credit = (float) $wallet->ad_credit - $fromAd;
            $remaining -= $fromAd;
            if ($remaining > 0) {
                $wallet->shopping_balance = (float) $wallet->shopping_balance - $remaining;
            }
            $wallet->save();

            $product->is_boosted = true;
            $product->boosted_at = now();
            $product->boost_payment_status = 'paid';
            $product->save();

            return ResponseHelper::success(
                [
                    'product' => $product->fresh()->load(['category', 'subCategory']),
                    'message' => 'Product boosted successfully (wallet charged).',
                ],
                'Product boosted successfully'
            );
        }

        // checkout_stub: mark pending until completeBoostPayment or admin approve
        $product->is_boosted = false;
        $product->boosted_at = null;
        $product->boost_payment_status = 'pending_payment';
        $product->save();

        return ResponseHelper::success(
            [
                'product' => $product->fresh()->load(['category', 'subCategory']),
                'message' => 'Boost created with checkout stub. Complete payment to activate.',
            ],
            'Boost pending payment'
        );
    }

    /**
     * Complete pending boost payment (checkout stub).
     */
    public function completeBoostPayment($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($id);

        if ($product->boost_payment_status !== 'pending_payment') {
            return ResponseHelper::error('No pending boost payment for this product', null, 400);
        }

        $product->is_boosted = true;
        $product->boosted_at = now();
        $product->boost_payment_status = 'paid';
        $product->save();

        return ResponseHelper::success(
            [
                'product' => $product->fresh()->load(['category', 'subCategory']),
                'message' => 'Boost payment completed. Product is now boosted.',
            ],
            'Boost payment completed'
        );
    }

    /**
     * Toggle / remove product boost.
     */
    public function toggleBoost($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($id);

        if ($product->is_boosted) {
            $product->is_boosted = false;
            $product->boosted_at = null;
            $product->boost_payment_status = null;
            $product->boost_location = null;
            $product->boost_budget = null;
            $product->boost_start_at = null;
            $product->boost_end_at = null;
            $product->save();

            return ResponseHelper::success(
                $product->fresh()->load(['category', 'subCategory']),
                'Boost removed'
            );
        }

        $product->is_boosted = true;
        $product->boosted_at = now();
        $product->boost_payment_status = 'paid';
        $product->save();

        return ResponseHelper::success(
            $product->fresh()->load(['category', 'subCategory']),
            'Product boosted'
        );
    }

    /**
     * Toggle product muted status (hidden from buyers, still visible to seller).
     */
    public function toggleMute($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($id);

        try {
            $product->is_muted = !$product->is_muted;
            $product->save();

            return ResponseHelper::success(
                $product->load($this->productDetailRelations()),
                $product->is_muted ? 'Product muted for buyers' : 'Product unmuted for buyers'
            );
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to update mute status: ' . $e->getMessage());
        }
    }

    /**
     * Get categories for product creation.
     */
    public function getCategories()
    {
        $categories = Category::where('is_active', true)
            ->whereNull('parent_id')
            ->with(['children' => function ($query) {
                $query->where('is_active', true);
            }])
            ->get();

        return ResponseHelper::success($categories, 'Categories retrieved successfully');
    }

    /**
     * Get all variants for a product.
     */
    public function getVariants($productId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($productId);

        $variants = $product->variants()->orderBy('sort_order')->orderBy('id')->get();

        return ResponseHelper::success($variants, 'Variants retrieved successfully');
    }

    /**
     * Create a new variant for a product.
     */
    public function createVariant(Request $request, $productId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($productId);

        $validated = $request->validate([
            'color_name' => 'required|string|max:255',
            'color_code' => ['nullable', 'string', 'max:7', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'images' => 'nullable|array',
            'images.*' => 'string|max:2048',
            'price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'stock_status' => 'required|in:in_stock,out_of_stock,backorder',
            'is_default' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            'sizes' => 'nullable|array',
            'sizes.*.size_label' => 'nullable|string|max:100',
            'sizes.*.lens_width' => 'required_with:sizes|numeric|min:0',
            'sizes.*.bridge_width' => 'required_with:sizes|numeric|min:0',
            'sizes.*.temple_length' => 'required_with:sizes|numeric|min:0',
            'sizes.*.stock_quantity' => 'required_with:sizes|integer|min:0',
            'sizes.*.stock_status' => 'nullable|in:in_stock,out_of_stock,backorder',
        ]);

        if (isset($validated['images']) && is_array($validated['images'])) {
            $validated['images'] = array_values(array_map(
                fn ($u) => \App\Support\MediaUrl::absolute((string) $u) ?? (string) $u,
                $validated['images']
            ));
        }

        $sizesPayload = $validated['sizes'] ?? null;
        unset($validated['sizes']);

        try {
            DB::beginTransaction();

            // If this is set as default, unset other defaults
            if ($validated['is_default'] ?? false) {
                $product->variants()->update(['is_default' => false]);
            }

            if (is_array($sizesPayload) && count($sizesPayload) > 0) {
                $total = array_sum(array_map(fn ($s) => (int) ($s['stock_quantity'] ?? 0), $sizesPayload));
                $validated['stock_quantity'] = $total;
                $validated['stock_status'] = $total > 0 ? 'in_stock' : 'out_of_stock';
            }

            $variant = $product->variants()->create($validated);

            if (is_array($sizesPayload)) {
                foreach ($sizesPayload as $row) {
                    $qty = (int) ($row['stock_quantity'] ?? 0);
                    $product->frameSizes()->create([
                        'product_variant_id' => $variant->id,
                        'lens_width' => $row['lens_width'],
                        'bridge_width' => $row['bridge_width'],
                        'temple_length' => $row['temple_length'],
                        'size_label' => $row['size_label'] ?? null,
                        'stock_quantity' => $qty,
                        'stock_status' => $row['stock_status'] ?? ($qty > 0 ? 'in_stock' : 'out_of_stock'),
                    ]);
                }
            }

            DB::commit();

            return ResponseHelper::success(
                $variant->fresh()->load('frameSizes'),
                'Variant created successfully'
            );
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error('Failed to create variant: ' . $e->getMessage());
        }
    }

    /**
     * Update a variant.
     */
    public function updateVariant(Request $request, $variantId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $variant = ProductVariant::whereHas('product', function ($query) use ($store) {
            $query->where('store_id', $store->id);
        })->findOrFail($variantId);

        $validated = $request->validate([
            'color_name' => 'sometimes|string|max:255',
            'color_code' => ['nullable', 'string', 'max:7', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'images' => 'nullable|array',
            'images.*' => 'string|max:2048',
            'price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'stock_status' => 'sometimes|in:in_stock,out_of_stock,backorder',
            'is_default' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        if (isset($validated['images']) && is_array($validated['images'])) {
            $validated['images'] = array_values(array_map(
                fn ($u) => \App\Support\MediaUrl::absolute((string) $u) ?? (string) $u,
                $validated['images']
            ));
        }

        try {
            DB::beginTransaction();

            // If this is set as default, unset other defaults
            if (isset($validated['is_default']) && $validated['is_default']) {
                $variant->product->variants()->where('id', '!=', $variantId)->update(['is_default' => false]);
            }

            $variant->update($validated);

            DB::commit();

            return ResponseHelper::success($variant, 'Variant updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error('Failed to update variant: ' . $e->getMessage());
        }
    }

    /**
     * Delete a variant.
     */
    public function deleteVariant($variantId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $variant = ProductVariant::whereHas('product', function ($query) use ($store) {
            $query->where('store_id', $store->id);
        })->findOrFail($variantId);

        try {
            $variant->delete();

            return ResponseHelper::success(null, 'Variant deleted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to delete variant: ' . $e->getMessage());
        }
    }

    /**
     * Set a variant as default.
     */
    public function setDefaultVariant($variantId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $variant = ProductVariant::whereHas('product', function ($query) use ($store) {
            $query->where('store_id', $store->id);
        })->findOrFail($variantId);

        try {
            DB::beginTransaction();

            // Unset all other defaults for this product
            $variant->product->variants()->update(['is_default' => false]);

            // Set this variant as default
            $variant->is_default = true;
            $variant->save();

            DB::commit();

            return ResponseHelper::success($variant, 'Default variant set successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error('Failed to set default variant: ' . $e->getMessage());
        }
    }

    /**
     * Suggest a unique SKU for a new product (seller can keep or edit before save).
     */
    public function suggestSku()
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        return ResponseHelper::success(
            ['sku' => $this->generateUniqueSku($store->id)],
            'SKU generated successfully'
        );
    }

    /**
     * Upload product image.
     */
    public function uploadImage(UploadImageRequest $request)
    {
        try {
            $user = Auth::user();
            $store = $user->store;

            if (!$store) {
                return ResponseHelper::error('Store not found', null, 404);
            }

            $file = $request->file('image');
            
            // Store image in public disk
            $path = $file->store("products/{$store->id}", 'public');
            
            $url = \App\Support\MediaUrl::absolute($path);

            return ResponseHelper::success([
                'url' => $url,
                'path' => $path,
            ], 'Image uploaded successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to upload image: ' . $e->getMessage());
        }
    }

    private function generateUniqueSku(int $storeId): string
    {
        do {
            $sku = sprintf('VX-%d-%s', $storeId, strtoupper(Str::random(8)));
        } while (Product::where('sku', $sku)->exists());

        return $sku;
    }
}

