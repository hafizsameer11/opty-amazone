<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Store;
use App\Models\Category;
use App\Models\LensType;
use App\Models\LensTreatment;
use App\Models\LensCoating;
use App\Models\LensThicknessMaterial;
use App\Models\LensThicknessOption;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CategoryLensConfigController extends Controller
{
    /**
     * Get all categories with their lens configurations for the authenticated seller's store.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        // Get all categories (or only categories used by seller's products)
        $categories = Category::where('is_active', true)
            ->orderBy('name')
            ->get();

        $result = $categories->map(function ($category) use ($store) {
            return [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'lens_types' => $store->categoryLensTypes($category->id)->get()->pluck('id')->toArray(),
                'lens_treatments' => $store->categoryLensTreatments($category->id)->get()->pluck('id')->toArray(),
                'lens_coatings' => $store->categoryLensCoatings($category->id)->get()->pluck('id')->toArray(),
                'lens_thickness_materials' => $store->categoryLensThicknessMaterials($category->id)->get()->pluck('id')->toArray(),
                'lens_thickness_options' => $store->categoryLensThicknessOptions($category->id)->get()->pluck('id')->toArray(),
            ];
        });

        return ResponseHelper::success($result, 'Category lens configurations retrieved successfully');
    }

    /**
     * Get lens configuration for a specific category.
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

        // Get all available lens options (for reference)
        $allLensTypes = LensType::active()->orderBy('index')->get();
        $allTreatments = LensTreatment::active()->get();
        $allCoatings = LensCoating::active()->get();
        $allThicknessMaterials = LensThicknessMaterial::active()->get();
        $allThicknessOptions = LensThicknessOption::active()->get();

        // Get configured IDs using direct query
        $configuredLensTypeIds = DB::table('store_category_lens_types')
            ->where('store_id', $store->id)
            ->where('category_id', $categoryId)
            ->pluck('lens_type_id')->toArray();
        
        $configuredTreatmentIds = DB::table('store_category_lens_treatments')
            ->where('store_id', $store->id)
            ->where('category_id', $categoryId)
            ->pluck('lens_treatment_id')->toArray();
        
        $configuredCoatingIds = DB::table('store_category_lens_coatings')
            ->where('store_id', $store->id)
            ->where('category_id', $categoryId)
            ->pluck('lens_coating_id')->toArray();
        
        $configuredMaterialIds = DB::table('store_category_lens_thickness_materials')
            ->where('store_id', $store->id)
            ->where('category_id', $categoryId)
            ->pluck('lens_thickness_material_id')->toArray();
        
        $configuredOptionIds = DB::table('store_category_lens_thickness_options')
            ->where('store_id', $store->id)
            ->where('category_id', $categoryId)
            ->pluck('lens_thickness_option_id')->toArray();

        return ResponseHelper::success([
            'category' => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
            ],
            'available' => [
                'lens_types' => $allLensTypes,
                'treatments' => $allTreatments,
                'coatings' => $allCoatings,
                'thickness_materials' => $allThicknessMaterials,
                'thickness_options' => $allThicknessOptions,
            ],
            'configured' => [
                'lens_types' => $configuredLensTypeIds,
                'treatments' => $configuredTreatmentIds,
                'coatings' => $configuredCoatingIds,
                'thickness_materials' => $configuredMaterialIds,
                'thickness_options' => $configuredOptionIds,
            ],
        ], 'Category lens configuration retrieved successfully');
    }

    /**
     * Update lens configuration for a specific category.
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
            'lens_type_ids' => 'nullable|array',
            'lens_type_ids.*' => 'exists:lens_types,id',
            'lens_treatment_ids' => 'nullable|array',
            'lens_treatment_ids.*' => 'exists:lens_treatments,id',
            'lens_coating_ids' => 'nullable|array',
            'lens_coating_ids.*' => 'exists:lens_coatings,id',
            'lens_thickness_material_ids' => 'nullable|array',
            'lens_thickness_material_ids.*' => 'exists:lens_thickness_materials,id',
            'lens_thickness_option_ids' => 'nullable|array',
            'lens_thickness_option_ids.*' => 'exists:lens_thickness_options,id',
        ]);

        DB::beginTransaction();
        try {
            // Sync lens types using direct DB operations
            DB::table('store_category_lens_types')
                ->where('store_id', $store->id)
                ->where('category_id', $categoryId)
                ->delete();
            
            if (isset($validated['lens_type_ids']) && !empty($validated['lens_type_ids'])) {
                $lensTypeData = array_map(function ($lensTypeId) use ($store, $categoryId) {
                    return [
                        'store_id' => $store->id,
                        'category_id' => $categoryId,
                        'lens_type_id' => $lensTypeId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }, $validated['lens_type_ids']);
                DB::table('store_category_lens_types')->insert($lensTypeData);
            }

            // Sync treatments
            DB::table('store_category_lens_treatments')
                ->where('store_id', $store->id)
                ->where('category_id', $categoryId)
                ->delete();
            
            if (isset($validated['lens_treatment_ids']) && !empty($validated['lens_treatment_ids'])) {
                $treatmentData = array_map(function ($treatmentId) use ($store, $categoryId) {
                    return [
                        'store_id' => $store->id,
                        'category_id' => $categoryId,
                        'lens_treatment_id' => $treatmentId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }, $validated['lens_treatment_ids']);
                DB::table('store_category_lens_treatments')->insert($treatmentData);
            }

            // Sync coatings
            DB::table('store_category_lens_coatings')
                ->where('store_id', $store->id)
                ->where('category_id', $categoryId)
                ->delete();
            
            if (isset($validated['lens_coating_ids']) && !empty($validated['lens_coating_ids'])) {
                $coatingData = array_map(function ($coatingId) use ($store, $categoryId) {
                    return [
                        'store_id' => $store->id,
                        'category_id' => $categoryId,
                        'lens_coating_id' => $coatingId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }, $validated['lens_coating_ids']);
                DB::table('store_category_lens_coatings')->insert($coatingData);
            }

            // Sync thickness materials
            DB::table('store_category_lens_thickness_materials')
                ->where('store_id', $store->id)
                ->where('category_id', $categoryId)
                ->delete();
            
            if (isset($validated['lens_thickness_material_ids']) && !empty($validated['lens_thickness_material_ids'])) {
                $materialData = array_map(function ($materialId) use ($store, $categoryId) {
                    return [
                        'store_id' => $store->id,
                        'category_id' => $categoryId,
                        'lens_thickness_material_id' => $materialId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }, $validated['lens_thickness_material_ids']);
                DB::table('store_category_lens_thickness_materials')->insert($materialData);
            }

            // Sync thickness options
            DB::table('store_category_lens_thickness_options')
                ->where('store_id', $store->id)
                ->where('category_id', $categoryId)
                ->delete();
            
            if (isset($validated['lens_thickness_option_ids']) && !empty($validated['lens_thickness_option_ids'])) {
                $optionData = array_map(function ($optionId) use ($store, $categoryId) {
                    return [
                        'store_id' => $store->id,
                        'category_id' => $categoryId,
                        'lens_thickness_option_id' => $optionId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }, $validated['lens_thickness_option_ids']);
                DB::table('store_category_lens_thickness_options')->insert($optionData);
            }

            DB::commit();

            return ResponseHelper::success(null, 'Category lens configuration updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error('Failed to update configuration: ' . $e->getMessage(), null, 500);
        }
    }
}

