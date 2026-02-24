<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\PrescriptionDropdownValue;
use Illuminate\Http\Request;

class PrescriptionOptionsController extends Controller
{
    /**
     * Get prescription options for a product based on its category.
     * Traverses up the category tree to find the most specific configuration.
     */
    public function getForProduct($productId)
    {
        $product = Product::with(['category.parent', 'store'])->find($productId);
        
        if (!$product) {
            return ResponseHelper::error('Product not found', null, 404);
        }

        // If product has a category and store, check for category-specific config
        if ($product->category_id && $product->store_id) {
            $store = $product->store;
            $category = $product->category;
            
            // Traverse up the category tree to find prescription configuration
            $categoryIds = [];
            $currentCategoryId = $category->id;
            
            // Build category path from child to parent
            while ($currentCategoryId) {
                $categoryIds[] = $currentCategoryId;
                $currentCategory = \App\Models\Category::find($currentCategoryId);
                $currentCategoryId = $currentCategory ? $currentCategory->parent_id : null;
            }
            
            // Check categories from most specific to least specific (child to parent)
            foreach ($categoryIds as $categoryId) {
                // Check if this category has prescription configuration
                $hasConfig = PrescriptionDropdownValue::where('store_id', $store->id)
                    ->where('category_id', $categoryId)
                    ->where('is_active', true)
                    ->exists();

                if ($hasConfig) {
                    // Get all prescription dropdown values for this category
                    $values = PrescriptionDropdownValue::where('store_id', $store->id)
                        ->where('category_id', $categoryId)
                        ->where('is_active', true)
                        ->orderBy('field_type')
                        ->orderBy('sort_order')
                        ->orderBy('value')
                        ->get();

                    // Structure the response
                    $result = $this->structurePrescriptionOptions($values);

                    return ResponseHelper::success($result, 'Prescription options retrieved successfully');
                }
            }
        }

        // No configuration found - return empty structure
        return ResponseHelper::success($this->getEmptyStructure(), 'No prescription options configured');
    }

    /**
     * Structure prescription options for frontend consumption.
     */
    private function structurePrescriptionOptions($values)
    {
        $result = [
            'pd' => [],
            'sph' => ['left' => [], 'right' => [], 'both' => []],
            'cyl' => ['left' => [], 'right' => [], 'both' => []],
            'axis' => ['left' => [], 'right' => [], 'both' => []],
            'h' => [],
            'year_of_birth' => [],
            'add' => [],
            'base_curve' => [],
            'diameter' => [],
        ];

        foreach ($values as $value) {
            $fieldValue = $value->value;
            
            switch ($value->field_type) {
                case 'pd':
                case 'h':
                case 'year_of_birth':
                case 'add':
                case 'base_curve':
                case 'diameter':
                    // These fields don't have eye_type
                    if (!in_array($fieldValue, $result[$value->field_type])) {
                        $result[$value->field_type][] = $fieldValue;
                    }
                    break;
                
                case 'sph':
                case 'cyl':
                case 'axis':
                    // These fields can have eye_type
                    $eyeType = $value->eye_type ?? 'both';
                    if (!in_array($fieldValue, $result[$value->field_type][$eyeType])) {
                        $result[$value->field_type][$eyeType][] = $fieldValue;
                    }
                    // Also add to 'both' if eye_type is specified
                    if ($eyeType !== 'both' && !in_array($fieldValue, $result[$value->field_type]['both'])) {
                        $result[$value->field_type]['both'][] = $fieldValue;
                    }
                    break;
            }
        }

        // Sort all arrays
        foreach ($result as $key => $value) {
            if (is_array($value) && isset($value['left'])) {
                // Nested structure (sph, cyl, axis)
                $result[$key]['left'] = array_unique($result[$key]['left']);
                $result[$key]['right'] = array_unique($result[$key]['right']);
                $result[$key]['both'] = array_unique($result[$key]['both']);
                sort($result[$key]['left']);
                sort($result[$key]['right']);
                sort($result[$key]['both']);
            } else {
                // Simple array
                $result[$key] = array_unique($result[$key]);
                sort($result[$key]);
            }
        }

        return $result;
    }

    /**
     * Get empty structure for when no configuration exists.
     */
    private function getEmptyStructure()
    {
        return [
            'pd' => [],
            'sph' => ['left' => [], 'right' => [], 'both' => []],
            'cyl' => ['left' => [], 'right' => [], 'both' => []],
            'axis' => ['left' => [], 'right' => [], 'both' => []],
            'h' => [],
            'year_of_birth' => [],
            'add' => [],
            'base_curve' => [],
            'diameter' => [],
        ];
    }
}
