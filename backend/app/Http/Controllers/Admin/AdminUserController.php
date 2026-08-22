<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with('addresses', 'store');

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('is_blocked')) {
            $blocked = filter_var($request->is_blocked, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($blocked !== null) {
                $query->where('is_blocked', $blocked);
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate($request->integer('per_page', 15));

        return ResponseHelper::success($users, 'Users retrieved successfully');
    }

    public function show($id): JsonResponse
    {
        $user = User::with('addresses', 'store', 'followedStores')
            ->findOrFail($id);

        return ResponseHelper::success($user, 'User retrieved successfully');
    }

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
            'is_blocked' => false,
        ]);

        return ResponseHelper::success($user, 'User created successfully', 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8',
            'role' => 'sometimes|in:buyer,seller,admin',
            'is_blocked' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $updateData = $request->only(['name', 'email', 'phone', 'role', 'is_blocked']);
        if ($request->has('password') && $request->password) {
            $updateData['password'] = Hash::make($request->password);
        }

        if (array_key_exists('is_blocked', $updateData) && $updateData['is_blocked'] && (int) $id === (int) Auth::id()) {
            return ResponseHelper::error('You cannot block your own account.', null, 422);
        }

        $user->update($updateData);

        if ($request->boolean('is_blocked')) {
            $user->tokens()->delete();
        }

        return ResponseHelper::success($user->fresh(), 'User updated successfully');
    }

    public function destroy($id): JsonResponse
    {
        if ((int) $id === (int) Auth::id()) {
            return ResponseHelper::error('You cannot delete your own account.', null, 422);
        }

        $user = User::findOrFail($id);

        if ($user->isAdmin()) {
            $admins = User::where('role', 'admin')->count();
            if ($admins <= 1) {
                return ResponseHelper::error('Cannot delete the last admin user.', null, 422);
            }
        }

        $user->tokens()->delete();
        $user->delete();

        return ResponseHelper::success(null, 'User deleted successfully');
    }

    public function toggleStatus($id): JsonResponse
    {
        if ((int) $id === (int) Auth::id()) {
            return ResponseHelper::error('You cannot change block status on your own account.', null, 422);
        }

        $user = User::findOrFail($id);

        if ($user->isAdmin()) {
            $admins = User::where('role', 'admin')->where('is_blocked', false)->count();
            if (!$user->is_blocked && $admins <= 1) {
                return ResponseHelper::error('Cannot block the last active admin.', null, 422);
            }
        }

        $user->is_blocked = !$user->is_blocked;
        $user->save();

        if ($user->is_blocked) {
            $user->tokens()->delete();
        }

        return ResponseHelper::success($user->fresh(), $user->is_blocked ? 'User blocked' : 'User unblocked');
    }
}
