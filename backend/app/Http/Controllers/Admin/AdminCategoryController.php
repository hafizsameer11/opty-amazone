<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminCategoryController extends Controller
{
    /**
     * Get all categories.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Category::with('subcategories');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%");
        }

        $categories = $query->orderBy('sort_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return ResponseHelper::success($categories, 'Categories retrieved successfully');
    }

    /**
     * Get category details.
     */
    public function show($id): JsonResponse
    {
        $category = Category::with('subcategories')->findOrFail($id);
        return ResponseHelper::success($category, 'Category retrieved successfully');
    }

    /**
     * Create category.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:categories,slug',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $category = Category::create($request->all());

        return ResponseHelper::success($category, 'Category created successfully', 201);
    }

    /**
     * Update category.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|unique:categories,slug,' . $category->id,
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $category->update($request->all());

        return ResponseHelper::success($category, 'Category updated successfully');
    }

    /**
     * Delete category.
     */
    public function destroy($id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $category->delete();

        return ResponseHelper::success(null, 'Category deleted successfully');
    }
}
