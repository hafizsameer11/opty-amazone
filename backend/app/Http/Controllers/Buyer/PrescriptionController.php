<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Prescription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PrescriptionController extends Controller
{
    /**
     * Get all prescriptions for the authenticated user.
     */
    public function index()
    {
        $user = Auth::user();

        $prescriptions = Prescription::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return ResponseHelper::success($prescriptions, 'Prescriptions retrieved successfully');
    }

    /**
     * Get prescription details.
     */
    public function show($id)
    {
        $user = Auth::user();

        $prescription = Prescription::where('user_id', $user->id)->findOrFail($id);

        return ResponseHelper::success($prescription, 'Prescription retrieved successfully');
    }

    /**
     * Create a new prescription.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'prescription_type' => 'required|in:single_vision,bifocal,trifocal,progressive',
            'od_sphere' => 'nullable|numeric|min:-30|max:30',
            'od_cylinder' => 'nullable|numeric|min:-10|max:10',
            'od_axis' => 'nullable|integer|min:0|max:180',
            'od_add' => 'nullable|numeric|min:0|max:5',
            'os_sphere' => 'nullable|numeric|min:-30|max:30',
            'os_cylinder' => 'nullable|numeric|min:-10|max:10',
            'os_axis' => 'nullable|integer|min:0|max:180',
            'os_add' => 'nullable|numeric|min:0|max:5',
            'pd_binocular' => 'nullable|numeric|min:50|max:80',
            'pd_monocular_od' => 'nullable|numeric|min:25|max:40',
            'pd_monocular_os' => 'nullable|numeric|min:25|max:40',
            'pd_near' => 'nullable|numeric|min:50|max:80',
            'ph_od' => 'nullable|numeric',
            'ph_os' => 'nullable|numeric',
            'doctor_name' => 'nullable|string|max:255',
            'doctor_license' => 'nullable|string|max:100',
            'prescription_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after:prescription_date',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'is_verified' => 'nullable|boolean',
        ]);

        try {
            $validated['user_id'] = $user->id;
            $prescription = Prescription::create($validated);

            return ResponseHelper::success($prescription, 'Prescription created successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to create prescription: ' . $e->getMessage());
        }
    }

    /**
     * Update a prescription.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();

        $prescription = Prescription::where('user_id', $user->id)->findOrFail($id);

        $validated = $request->validate([
            'prescription_type' => 'sometimes|in:single_vision,bifocal,trifocal,progressive',
            'od_sphere' => 'nullable|numeric|min:-30|max:30',
            'od_cylinder' => 'nullable|numeric|min:-10|max:10',
            'od_axis' => 'nullable|integer|min:0|max:180',
            'od_add' => 'nullable|numeric|min:0|max:5',
            'os_sphere' => 'nullable|numeric|min:-30|max:30',
            'os_cylinder' => 'nullable|numeric|min:-10|max:10',
            'os_axis' => 'nullable|integer|min:0|max:180',
            'os_add' => 'nullable|numeric|min:0|max:5',
            'pd_binocular' => 'nullable|numeric|min:50|max:80',
            'pd_monocular_od' => 'nullable|numeric|min:25|max:40',
            'pd_monocular_os' => 'nullable|numeric|min:25|max:40',
            'pd_near' => 'nullable|numeric|min:50|max:80',
            'ph_od' => 'nullable|numeric',
            'ph_os' => 'nullable|numeric',
            'doctor_name' => 'nullable|string|max:255',
            'doctor_license' => 'nullable|string|max:100',
            'prescription_date' => 'nullable|date',
            'expiry_date' => 'nullable|date|after:prescription_date',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'is_verified' => 'nullable|boolean',
        ]);

        try {
            $prescription->update($validated);

            return ResponseHelper::success($prescription, 'Prescription updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to update prescription: ' . $e->getMessage());
        }
    }

    /**
     * Delete a prescription.
     */
    public function destroy($id)
    {
        $user = Auth::user();

        $prescription = Prescription::where('user_id', $user->id)->findOrFail($id);

        try {
            $prescription->delete();

            return ResponseHelper::success(null, 'Prescription deleted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to delete prescription: ' . $e->getMessage());
        }
    }
}

