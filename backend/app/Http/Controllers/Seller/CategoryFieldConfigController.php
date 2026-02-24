<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Store;
use App\Models\Category;
use App\Models\StoreCategoryFieldConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CategoryFieldConfigController extends Controller
{
    /**
     * Get all available product fields that can be configured.
     */
    private function getAvailableFields(): array
    {
        return [
            'frame_shape',
            'frame_material',
            'frame_color',
            'gender',
            'lens_type',
            'lens_index_options',
            'treatment_options',
            'base_curve_options',
            'diameter_options',
            'powers_range',
            'replacement_frequency',
            'contact_lens_brand',
            'contact_lens_color',
            'contact_lens_material',
            'contact_lens_type',
            'has_uv_filter',
            'can_sleep_with',
            'water_content',
            'is_medical_device',
            'size_volume',
            'pack_type',
            'expiry_date',
            'model_3d_url',
            'try_on_image',
            'color_images',
            'mm_calibers',
        ];
    }

    /**
     * Get default field configuration based on product type.
     */
    private function getDefaultConfigForProductType(string $productType): array
    {
        $allFields = $this->getAvailableFields();
        $defaults = array_fill_keys($allFields, false);

        switch ($productType) {
            case 'frame':
            case 'sunglasses':
                $defaults['frame_shape'] = true;
                $defaults['frame_material'] = true;
                $defaults['frame_color'] = true;
                $defaults['gender'] = true;
                $defaults['lens_type'] = true;
                $defaults['lens_index_options'] = true;
                $defaults['treatment_options'] = true;
                $defaults['model_3d_url'] = true;
                $defaults['try_on_image'] = true;
                $defaults['color_images'] = true;
                break;
            case 'contact_lens':
                $defaults['base_curve_options'] = true;
                $defaults['diameter_options'] = true;
                $defaults['powers_range'] = true;
                $defaults['replacement_frequency'] = true;
                $defaults['contact_lens_brand'] = true;
                $defaults['contact_lens_color'] = true;
                $defaults['contact_lens_material'] = true;
                $defaults['contact_lens_type'] = true;
                $defaults['has_uv_filter'] = true;
                $defaults['can_sleep_with'] = true;
                $defaults['water_content'] = true;
                $defaults['is_medical_device'] = true;
                break;
            case 'eye_hygiene':
                $defaults['size_volume'] = true;
                $defaults['pack_type'] = true;
                $defaults['expiry_date'] = true;
                break;
            case 'accessory':
                $defaults['gender'] = true;
                break;
        }

        return $defaults;
    }

    /**
     * Get all category configurations for the authenticated seller's store.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        // Get all main categories (parent_id is null)
        $categories = Category::where('is_active', true)
            ->whereNull('parent_id')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $result = $categories->map(function ($category) use ($store) {
            $config = StoreCategoryFieldConfig::where('store_id', $store->id)
                ->where('category_id', $category->id)
                ->first();

            $fieldConfig = $config ? $config->field_config : [];

            // Determine product type from category slug
            $productType = $this->getProductTypeFromCategory($category->slug);
            
            // Merge with defaults if config is empty
            if (empty($fieldConfig)) {
                $fieldConfig = $this->getDefaultConfigForProductType($productType);
            }

            return [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'product_type' => $productType,
                'field_config' => $fieldConfig,
            ];
        });

        return ResponseHelper::success($result, 'Category field configurations retrieved successfully');
    }

    /**
     * Get configuration for a specific category.
     */
    public function show($categoryId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $category = Category::find($categoryId);
        if (!$category) {
            return ResponseHelper::error('Category not found', null, 404);
        }

        $config = StoreCategoryFieldConfig::where('store_id', $store->id)
            ->where('category_id', $categoryId)
            ->first();

        $productType = $this->getProductTypeFromCategory($category->slug);
        $defaultConfig = $this->getDefaultConfigForProductType($productType);
        $fieldConfig = $config ? $config->field_config : $defaultConfig;

        // Merge with defaults to ensure all fields are present
        $allFields = $this->getAvailableFields();
        $mergedConfig = [];
        foreach ($allFields as $field) {
            $mergedConfig[$field] = $fieldConfig[$field] ?? $defaultConfig[$field] ?? false;
        }

        return ResponseHelper::success([
            'category' => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
            ],
            'product_type' => $productType,
            'available_fields' => $allFields,
            'field_config' => $mergedConfig,
        ], 'Category field configuration retrieved successfully');
    }

    /**
     * Update field configuration for a category.
     */
    public function update(Request $request, $categoryId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $category = Category::find($categoryId);
        if (!$category) {
            return ResponseHelper::error('Category not found', null, 404);
        }

        $validated = $request->validate([
            'field_config' => 'required|array',
            'field_config.*' => 'boolean',
            'pd_options' => 'nullable|array',
            'pd_options.*' => 'string',
        ]);

        // Validate that all fields in field_config are valid
        $availableFields = $this->getAvailableFields();
        foreach (array_keys($validated['field_config']) as $field) {
            if (!in_array($field, $availableFields)) {
                return ResponseHelper::error("Invalid field: {$field}", null, 422);
            }
        }

        // Ensure all available fields are present (set missing ones to false)
        $completeConfig = [];
        foreach ($availableFields as $field) {
            $completeConfig[$field] = $validated['field_config'][$field] ?? false;
        }

        try {
            StoreCategoryFieldConfig::updateOrCreate(
                [
                    'store_id' => $store->id,
                    'category_id' => $categoryId,
                ],
                [
                    'field_config' => $completeConfig,
                    'pd_options' => $validated['pd_options'] ?? null,
                ]
            );

            return ResponseHelper::success(null, 'Category field configuration updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to update configuration: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Get enabled fields for a category (used by product creation form).
     */
    public function getFieldsForCategory($categoryId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $category = Category::find($categoryId);
        if (!$category) {
            return ResponseHelper::error('Category not found', null, 404);
        }

        $config = StoreCategoryFieldConfig::where('store_id', $store->id)
            ->where('category_id', $categoryId)
            ->first();

        $productType = $this->getProductTypeFromCategory($category->slug);
        $defaultConfig = $this->getDefaultConfigForProductType($productType);
        $fieldConfig = $config ? $config->field_config : $defaultConfig;

        // Get only enabled fields
        $enabledFields = [];
        foreach ($fieldConfig as $field => $enabled) {
            if ($enabled) {
                $enabledFields[] = $field;
            }
        }

        return ResponseHelper::success([
            'category_id' => $categoryId,
            'category_slug' => $category->slug,
            'product_type' => $productType,
            'enabled_fields' => $enabledFields,
            'field_config' => $fieldConfig,
            'pd_options' => $config ? ($config->pd_options ?? null) : null,
        ], 'Enabled fields retrieved successfully');
    }

    /**
     * Determine product type from category slug.
     */
    private function getProductTypeFromCategory(string $categorySlug): string
    {
        $slugToType = [
            'eye-glasses' => 'frame',
            'sun-glasses' => 'sunglasses',
            'contact-lenses' => 'contact_lens',
            'eye-hygiene' => 'eye_hygiene',
            'accessori' => 'accessory',
            'opty-kids' => 'frame', // Default to frame for kids
        ];

        return $slugToType[$categorySlug] ?? 'frame';
    }
}
