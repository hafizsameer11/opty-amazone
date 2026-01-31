<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Get all categories.
     */
    public function index(Request $request)
    {
        $query = Category::where('is_active', true);

        // Get only parent categories or all
        if ($request->has('parent_only') && $request->parent_only) {
            $query->whereNull('parent_id');
        }

        $categories = $query->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return ResponseHelper::success($categories, 'Categories retrieved successfully');
    }
}

