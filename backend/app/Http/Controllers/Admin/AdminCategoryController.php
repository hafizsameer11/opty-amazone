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
     * Full category tree: roots with children and grandchildren (sub / sub-sub).
     */
    public function index(): JsonResponse
    {
        $categories = Category::whereNull('parent_id')
            ->with([
                'children' => function ($q) {
                    $q->orderBy('sort_order')->orderBy('name')
                        ->with(['children' => function ($q2) {
                            $q2->orderBy('sort_order')->orderBy('name');
                        }]);
                },
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return ResponseHelper::success($categories, 'Categories retrieved successfully');
    }

    public function show($id): JsonResponse
    {
        $category = Category::with([
            'parent',
            'children' => function ($q) {
                $q->orderBy('sort_order')->orderBy('name')
                    ->with(['children' => function ($q2) {
                        $q2->orderBy('sort_order')->orderBy('name');
                    }]);
            },
        ])->findOrFail($id);

        return ResponseHelper::success($category, 'Category retrieved successfully');
    }

    /**
     * Create a new category (English name/slug required at creation).
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|unique:categories,slug',
            'name_it' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'parent_id' => 'nullable|exists:categories,id',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $category = Category::create($validator->safe()->only([
            'name',
            'slug',
            'name_it',
            'description',
            'image',
            'parent_id',
            'sort_order',
            'is_active',
        ]));

        return ResponseHelper::success($category->fresh(), 'Category created successfully', 201);
    }

    /**
     * Update: Italian title and non-English fields only — name and slug cannot be changed.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name_it' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $category->update($validator->validated());

        return ResponseHelper::success($category->fresh(), 'Category updated successfully');
    }

    /**
     * Category deletion is disabled to protect catalog integrity.
     */
    public function destroy(int $_id): JsonResponse
    {
        return ResponseHelper::error(
            'Deleting categories is disabled. You can deactivate a category instead.',
            null,
            403
        );
    }
}
