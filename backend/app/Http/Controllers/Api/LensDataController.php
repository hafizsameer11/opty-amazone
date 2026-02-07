<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\LensType;
use App\Models\LensTreatment;
use App\Models\LensCoating;
use App\Models\LensThicknessMaterial;
use App\Models\LensThicknessOption;

class LensDataController extends Controller
{
    /**
     * Get all active lens types.
     */
    public function getLensTypes()
    {
        $lensTypes = LensType::active()->orderBy('index')->get();

        return ResponseHelper::success($lensTypes, 'Lens types retrieved successfully');
    }

    /**
     * Get all active lens treatments.
     */
    public function getLensTreatments()
    {
        $treatments = LensTreatment::active()->get();

        return ResponseHelper::success($treatments, 'Lens treatments retrieved successfully');
    }

    /**
     * Get all active lens coatings.
     */
    public function getLensCoatings()
    {
        $coatings = LensCoating::active()->get();

        return ResponseHelper::success($coatings, 'Lens coatings retrieved successfully');
    }

    /**
     * Get all active lens thickness materials.
     */
    public function getThicknessMaterials()
    {
        $materials = LensThicknessMaterial::active()->get();

        return ResponseHelper::success($materials, 'Lens thickness materials retrieved successfully');
    }

    /**
     * Get all active lens thickness options.
     */
    public function getThicknessOptions()
    {
        $options = LensThicknessOption::active()->get();

        return ResponseHelper::success($options, 'Lens thickness options retrieved successfully');
    }

    /**
     * Get lens configuration for a product based on its category.
     * Returns category-specific lens options if configured, otherwise returns global options.
     */
    public function getLensConfigForProduct($productId)
    {
        $product = \App\Models\Product::with(['category', 'store'])->find($productId);
        
        if (!$product) {
            return ResponseHelper::error('Product not found', null, 404);
        }

        // If product has a category and store, check for category-specific config
        if ($product->category_id && $product->store_id) {
            $store = $product->store;
            $categoryId = $product->category_id;

            // Check if category has lens configuration
            $hasCategoryConfig = \Illuminate\Support\Facades\DB::table('store_category_lens_types')
                ->where('store_id', $store->id)
                ->where('category_id', $categoryId)
                ->exists();

            if ($hasCategoryConfig) {
                // Get category-specific lens options
                $lensTypes = \Illuminate\Support\Facades\DB::table('store_category_lens_types')
                    ->join('lens_types', 'store_category_lens_types.lens_type_id', '=', 'lens_types.id')
                    ->where('store_category_lens_types.store_id', $store->id)
                    ->where('store_category_lens_types.category_id', $categoryId)
                    ->where('lens_types.is_active', true)
                    ->select('lens_types.*')
                    ->orderBy('lens_types.index')
                    ->get();

                $treatments = \Illuminate\Support\Facades\DB::table('store_category_lens_treatments')
                    ->join('lens_treatments', 'store_category_lens_treatments.lens_treatment_id', '=', 'lens_treatments.id')
                    ->where('store_category_lens_treatments.store_id', $store->id)
                    ->where('store_category_lens_treatments.category_id', $categoryId)
                    ->where('lens_treatments.is_active', true)
                    ->select('lens_treatments.*')
                    ->orderBy('lens_treatments.sort_order')
                    ->get();

                $coatings = \Illuminate\Support\Facades\DB::table('store_category_lens_coatings')
                    ->join('lens_coatings', 'store_category_lens_coatings.lens_coating_id', '=', 'lens_coatings.id')
                    ->where('store_category_lens_coatings.store_id', $store->id)
                    ->where('store_category_lens_coatings.category_id', $categoryId)
                    ->where('lens_coatings.is_active', true)
                    ->select('lens_coatings.*')
                    ->get();

                $thicknessMaterials = \Illuminate\Support\Facades\DB::table('store_category_lens_thickness_materials')
                    ->join('lens_thickness_materials', 'store_category_lens_thickness_materials.lens_thickness_material_id', '=', 'lens_thickness_materials.id')
                    ->where('store_category_lens_thickness_materials.store_id', $store->id)
                    ->where('store_category_lens_thickness_materials.category_id', $categoryId)
                    ->where('lens_thickness_materials.is_active', true)
                    ->select('lens_thickness_materials.*')
                    ->orderBy('lens_thickness_materials.sort_order')
                    ->get();

                $thicknessOptions = \Illuminate\Support\Facades\DB::table('store_category_lens_thickness_options')
                    ->join('lens_thickness_options', 'store_category_lens_thickness_options.lens_thickness_option_id', '=', 'lens_thickness_options.id')
                    ->where('store_category_lens_thickness_options.store_id', $store->id)
                    ->where('store_category_lens_thickness_options.category_id', $categoryId)
                    ->where('lens_thickness_options.is_active', true)
                    ->select('lens_thickness_options.*')
                    ->orderBy('lens_thickness_options.sort_order')
                    ->get();

                return ResponseHelper::success([
                    'lens_types' => $lensTypes,
                    'treatments' => $treatments,
                    'coatings' => $coatings,
                    'thickness_materials' => $thicknessMaterials,
                    'thickness_options' => $thicknessOptions,
                    'source' => 'category',
                ], 'Category lens configuration retrieved successfully');
            }
        }

        // Fallback to global lens options
        $lensTypes = LensType::active()->orderBy('index')->get();
        $treatments = LensTreatment::active()->get();
        $coatings = LensCoating::active()->get();
        $thicknessMaterials = LensThicknessMaterial::active()->get();
        $thicknessOptions = LensThicknessOption::active()->get();

        return ResponseHelper::success([
            'lens_types' => $lensTypes,
            'treatments' => $treatments,
            'coatings' => $coatings,
            'thickness_materials' => $thicknessMaterials,
            'thickness_options' => $thicknessOptions,
            'source' => 'global',
        ], 'Global lens configuration retrieved successfully');
    }
}

