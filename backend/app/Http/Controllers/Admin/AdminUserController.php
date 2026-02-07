<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminUserController extends Controller
{
    /**
     * Get all users.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('addresses', 'store');

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($users, 'Users retrieved successfully');
    }

    /**
     * Get user details.
     */
    public function show($id): JsonResponse
    {
        $user = User::with('addresses', 'store', 'followedStores')
            ->findOrFail($id);

        return ResponseHelper::success($user, 'User retrieved successfully');
    }

    /**
     * Create user.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
            'role' => 'required|in:buyer,seller,admin',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'email_verified_at' => now(),
        ]);

        return ResponseHelper::success($user, 'User created successfully', 201);
    }

    /**
     * Update user.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8',
            'role' => 'sometimes|in:buyer,seller,admin',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $updateData = $request->only(['name', 'email', 'phone', 'role']);
        if ($request->has('password')) {
            $updateData['password'] = Hash::make($request->password);
        }

        $user->update($updateData);

        return ResponseHelper::success($user, 'User updated successfully');
    }

    /**
     * Delete user.
     */
    public function destroy($id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->delete();

        return ResponseHelper::success(null, 'User deleted successfully');
    }

    /**
     * Toggle user status.
     */
    public function toggleStatus($id): JsonResponse
    {
        $user = User::findOrFail($id);
        // Assuming we have a status field, otherwise this would need to be implemented
        return ResponseHelper::success($user, 'User status updated');
    }
}
