<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Store;
use App\Models\Category;
use App\Models\PrescriptionDropdownValue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PrescriptionDropdownController extends Controller
{
    /**
     * Get all categories with their prescription dropdown config status.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        // Get only parent categories (categories with no parent_id)
        // Sub-categories will inherit from their parent categories
        $categories = Category::where('is_active', true)
            ->whereNull('parent_id')
            ->orderBy('name')
            ->get();

        $result = $categories->map(function ($category) use ($store) {
            // Count configured values per field type
            $fieldTypes = ['sph', 'cyl', 'axis', 'pd', 'h', 'year_of_birth', 'add', 'base_curve', 'diameter'];
            $configStatus = [];
            
            foreach ($fieldTypes as $fieldType) {
                $count = PrescriptionDropdownValue::where('store_id', $store->id)
                    ->where('category_id', $category->id)
                    ->where('field_type', $fieldType)
                    ->where('is_active', true)
                    ->count();
                $configStatus[$fieldType] = $count > 0;
            }

            return [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'has_config' => in_array(true, $configStatus),
                'config_status' => $configStatus,
            ];
        });

        return ResponseHelper::success($result, 'Prescription dropdown configurations retrieved successfully');
    }

    /**
     * Get all dropdown values for a specific category.
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

        // If this is a sub-category, redirect to parent category configuration
        if ($category->parent_id) {
            $parentCategory = Category::find($category->parent_id);
            if ($parentCategory) {
                return ResponseHelper::error(
                    'Sub-categories inherit configuration from their parent category. Please configure the parent category: ' . $parentCategory->name,
                    ['parent_category_id' => $parentCategory->id, 'parent_category_name' => $parentCategory->name],
                    400
                );
            }
        }

        // Get all dropdown values for this category, grouped by field_type
        $values = PrescriptionDropdownValue::where('store_id', $store->id)
            ->where('category_id', $categoryId)
            ->orderBy('field_type')
            ->orderBy('sort_order')
            ->orderBy('value')
            ->get();

        // Group by field_type
        $grouped = [];
        $fieldTypes = ['sph', 'cyl', 'axis', 'pd', 'h', 'year_of_birth', 'add', 'base_curve', 'diameter'];
        
        foreach ($fieldTypes as $fieldType) {
            $grouped[$fieldType] = $values->where('field_type', $fieldType)->values();
        }

        return ResponseHelper::success([
            'category' => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
            ],
            'values' => $grouped,
        ], 'Prescription dropdown values retrieved successfully');
    }

    /**
     * Bulk create/update dropdown values for a category.
     */
    public function store(Request $request, $categoryId)
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

        // Prevent configuring sub-categories - only parent categories can be configured
        if ($category->parent_id) {
            $parentCategory = Category::find($category->parent_id);
            return ResponseHelper::error(
                'Sub-categories inherit configuration from their parent category. Please configure the parent category: ' . ($parentCategory ? $parentCategory->name : 'Unknown'),
                ['parent_category_id' => $category->parent_id],
                400
            );
        }

        $validated = $request->validate([
            'values' => 'required|array',
            'values.*.field_type' => 'required|in:sph,cyl,axis,pd,h,year_of_birth,add,base_curve,diameter',
            'values.*.value' => 'required|string|max:50',
            'values.*.label' => 'nullable|string|max:100',
            'values.*.eye_type' => 'nullable|in:left,right,both',
            'values.*.form_type' => 'nullable|in:distance_vision,near_vision,progressive,contact_lens',
            'values.*.is_active' => 'nullable|boolean',
            'values.*.sort_order' => 'nullable|integer',
        ]);

        DB::beginTransaction();
        try {
            // Delete existing values for this store/category combination
            PrescriptionDropdownValue::where('store_id', $store->id)
                ->where('category_id', $categoryId)
                ->delete();

            // Insert new values
            $insertData = [];
            foreach ($validated['values'] as $value) {
                $insertData[] = [
                    'store_id' => $store->id,
                    'category_id' => $categoryId,
                    'field_type' => $value['field_type'],
                    'value' => $value['value'],
                    'label' => $value['label'] ?? null,
                    'eye_type' => $value['eye_type'] ?? null,
                    'form_type' => $value['form_type'] ?? null,
                    'is_active' => $value['is_active'] ?? true,
                    'sort_order' => $value['sort_order'] ?? 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if (!empty($insertData)) {
                PrescriptionDropdownValue::insert($insertData);
            }

            DB::commit();

            return ResponseHelper::success(null, 'Prescription dropdown values updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error('Failed to update dropdown values: ' . $e->getMessage(), null, 500);
        }
    }

    /**
     * Delete a dropdown value.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $value = PrescriptionDropdownValue::where('id', $id)
            ->where('store_id', $store->id)
            ->first();

        if (!$value) {
            return ResponseHelper::error('Dropdown value not found', null, 404);
        }

        // Soft delete by setting is_active to false
        $value->update(['is_active' => false]);

        return ResponseHelper::success(null, 'Dropdown value deleted successfully');
    }
}
