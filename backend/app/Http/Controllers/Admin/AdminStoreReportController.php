<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\StoreReport;
use App\Services\Admin\AdminActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminStoreReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StoreReport::with(['buyer:id,name,email', 'store:id,name,status,is_active,user_id']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        $page = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 20));

        $items = collect($page->items())->map(fn ($r) => $this->serialize($r));

        return ResponseHelper::success([
            'reports' => $items,
            'pagination' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
            'statuses' => StoreReport::STATUSES,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $report = StoreReport::with(['buyer:id,name,email', 'store:id,name,status,is_active,user_id', 'reviewer:id,name'])
            ->findOrFail($id);

        return ResponseHelper::success([
            'report' => $this->serialize($report),
            'statuses' => StoreReport::STATUSES,
        ]);
    }

    public function updateStatus(int $id, Request $request): JsonResponse
    {
        $report = StoreReport::findOrFail($id);
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(StoreReport::STATUSES)],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $updates = [
            'status' => $validated['status'],
            'admin_notes' => array_key_exists('admin_notes', $validated)
                ? $validated['admin_notes']
                : $report->admin_notes,
            'reviewed_by' => $request->user()->id,
        ];

        if (in_array($validated['status'], [
            StoreReport::STATUS_RESOLVED,
            StoreReport::STATUS_REJECTED,
            StoreReport::STATUS_CLOSED,
        ], true)) {
            $updates['reviewed_at'] = now();
        } elseif (!$report->reviewed_at) {
            $updates['reviewed_at'] = now();
        }

        $report->update($updates);

        AdminActivityLogger::log(
            $request->user(),
            'store_report.status_update',
            'store_report',
            $id,
            true,
            ['status' => $validated['status']],
            $request
        );

        return ResponseHelper::success([
            'report' => $this->serialize(
                $report->fresh(['buyer:id,name,email', 'store:id,name,status,is_active,user_id', 'reviewer:id,name'])
            ),
        ], 'Report status updated');
    }

    /**
     * @deprecated Prefer updateStatus; kept for backward compatibility.
     */
    public function markReviewed(int $id, Request $request): JsonResponse
    {
        $request->merge([
            'status' => StoreReport::STATUS_RESOLVED,
            'admin_notes' => $request->input('admin_notes'),
        ]);

        return $this->updateStatus($id, $request);
    }

    private function serialize(StoreReport $report): array
    {
        $urls = collect($report->evidence_paths ?? [])->map(
            fn ($p) => Storage::disk('public')->url($p)
        )->values()->all();

        return [
            'id' => $report->id,
            'buyer_id' => $report->buyer_id,
            'buyer' => $report->relationLoaded('buyer') && $report->buyer
                ? ['id' => $report->buyer->id, 'name' => $report->buyer->name, 'email' => $report->buyer->email]
                : null,
            'store_id' => $report->store_id,
            'store' => $report->relationLoaded('store') && $report->store
                ? [
                    'id' => $report->store->id,
                    'name' => $report->store->name,
                    'status' => $report->store->status,
                    'is_active' => (bool) $report->store->is_active,
                ]
                : null,
            'reason' => $report->reason,
            'details' => $report->details,
            'evidence_paths' => $report->evidence_paths,
            'evidence_urls' => $urls,
            'status' => $report->status,
            'admin_notes' => $report->admin_notes,
            'reviewed_by' => $report->reviewed_by,
            'reviewer' => $report->relationLoaded('reviewer') && $report->reviewer
                ? ['id' => $report->reviewer->id, 'name' => $report->reviewer->name]
                : null,
            'reviewed_at' => $report->reviewed_at?->toIso8601String(),
            'created_at' => $report->created_at?->toIso8601String(),
        ];
    }
}
