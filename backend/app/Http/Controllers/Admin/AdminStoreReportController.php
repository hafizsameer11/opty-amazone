<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreReinstatementRequest;
use App\Models\StoreReport;
use App\Services\Admin\AdminActivityLogger;
use App\Services\Store\StoreModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminStoreReportController extends Controller
{
    public function __construct(private StoreModerationService $moderation) {}

    public function index(Request $request): JsonResponse
    {
        $query = StoreReport::with([
            'buyer:id,name,email',
            'store' => fn ($store) => $store->select('id', 'name', 'status', 'is_active', 'user_id')->withCount('reports'),
        ]);
        if ($request->filled('status')) $query->where('status', (string) $request->input('status'));
        if ($request->filled('store_id')) $query->where('store_id', $request->integer('store_id'));
        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            $query->where(fn ($q) => $q->where('reason', 'like', "%{$term}%")
                ->orWhere('details', 'like', "%{$term}%")
                ->orWhereHas('store', fn ($store) => $store->where('name', 'like', "%{$term}%")));
        }
        $page = $query->orderByDesc('created_at')->paginate(min(100, max(1, $request->integer('per_page', 20))));

        return ResponseHelper::success([
            'reports' => collect($page->items())->map(fn (StoreReport $report) => $this->serialize($report)),
            'summary' => $this->summaryData(),
            'pagination' => $this->pagination($page),
            'statuses' => StoreReport::STATUSES,
        ]);
    }

    public function summary(): JsonResponse
    {
        return ResponseHelper::success(['summary' => $this->summaryData()]);
    }

    public function show(int $id): JsonResponse
    {
        $report = StoreReport::with([
            'buyer:id,name,email',
            'store' => fn ($store) => $store->select('id', 'name', 'status', 'is_active', 'user_id')->withCount('reports'),
            'reviewer:id,name',
        ])->findOrFail($id);
        $history = StoreReport::with('buyer:id,name,email')
            ->where('store_id', $report->store_id)->latest()->get()
            ->map(fn (StoreReport $item) => $this->serialize($item));

        return ResponseHelper::success(['report' => $this->serialize($report), 'store_reports' => $history, 'statuses' => StoreReport::STATUSES]);
    }

    public function updateStatus(int $id, Request $request): JsonResponse
    {
        $report = StoreReport::findOrFail($id);
        $validated = $request->validate(['status' => ['required', 'string', Rule::in(StoreReport::STATUSES)], 'admin_notes' => ['nullable', 'string', 'max:5000']]);
        $updates = ['status' => $validated['status'], 'admin_notes' => $validated['admin_notes'] ?? $report->admin_notes, 'reviewed_by' => $request->user()->id];
        $updates['reviewed_at'] = in_array($validated['status'], [StoreReport::STATUS_RESOLVED, StoreReport::STATUS_REJECTED, StoreReport::STATUS_CLOSED], true) || ! $report->reviewed_at ? now() : $report->reviewed_at;
        $report->update($updates);
        $this->audit($request, 'store_report.status_update', $report->id, ['status' => $validated['status']]);

        return ResponseHelper::success(['report' => $this->serialize($report->fresh(['buyer:id,name,email', 'store:id,name,status,is_active,user_id', 'reviewer:id,name']))], 'Report status updated');
    }

    public function warn(int $id, Request $request): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:2000'], 'admin_notes' => ['nullable', 'string', 'max:5000']]);
        $report = StoreReport::with('store.user')->findOrFail($id);
        $this->moderation->warn($report->store, $request->user(), $data['reason'], $data['admin_notes'] ?? null);
        $report->update(['status' => StoreReport::STATUS_WAITING_FOR_SELLER, 'admin_notes' => $data['admin_notes'] ?? $report->admin_notes, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        $this->audit($request, 'store_report.warning_sent', $report->id, ['store_id' => $report->store_id]);

        return ResponseHelper::success(['report' => $this->serialize($report->fresh(['buyer:id,name,email', 'store:id,name,status,is_active,user_id']))], 'Seller warning email sent');
    }

    public function suspend(int $id, Request $request): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:2000'], 'admin_notes' => ['nullable', 'string', 'max:5000']]);
        $report = StoreReport::with('store.user')->findOrFail($id);
        $store = $this->moderation->suspend($report->store, $request->user(), $data['reason'], $data['admin_notes'] ?? null);
        $report->update(['status' => StoreReport::STATUS_WAITING_FOR_SELLER, 'admin_notes' => $data['admin_notes'] ?? $report->admin_notes, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        $this->audit($request, 'store_report.store_suspended', $report->id, ['store_id' => $store->id]);

        return ResponseHelper::success(['store' => $this->storeSummary($store), 'report' => $this->serialize($report->fresh(['buyer:id,name,email', 'store:id,name,status,is_active,user_id']))], 'Store suspended and seller notified');
    }

    public function remove(int $id, Request $request): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:2000'], 'admin_notes' => ['nullable', 'string', 'max:5000']]);
        $report = StoreReport::with('store.user')->findOrFail($id);
        $store = $this->moderation->remove($report->store, $request->user(), $data['reason'], $data['admin_notes'] ?? null);
        $report->update(['status' => StoreReport::STATUS_RESOLVED, 'admin_notes' => $data['admin_notes'] ?? $report->admin_notes, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        $this->audit($request, 'store_report.store_removed', $report->id, ['store_id' => $store->id]);

        return ResponseHelper::success(['store' => $this->storeSummary($store), 'report' => $this->serialize($report->fresh(['buyer:id,name,email', 'store:id,name,status,is_active,user_id']))], 'Store removed from the marketplace');
    }

    public function reinstatements(Request $request): JsonResponse
    {
        $requests = StoreReinstatementRequest::with(['store:id,name,status,is_active,user_id', 'seller:id,name,email', 'reviewer:id,name'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', (string) $request->input('status')))
            ->latest()->paginate(min(100, max(1, $request->integer('per_page', 30))));

        return ResponseHelper::success(['requests' => collect($requests->items())->map(fn (StoreReinstatementRequest $item) => $this->serializeReinstatement($item)), 'pagination' => $this->pagination($requests), 'statuses' => StoreReinstatementRequest::STATUSES]);
    }

    public function decideReinstatement(int $id, Request $request): JsonResponse
    {
        $data = $request->validate(['action' => ['required', Rule::in(['approve', 'reject'])], 'admin_notes' => ['nullable', 'string', 'max:5000']]);
        $item = $this->moderation->decideReinstatement(StoreReinstatementRequest::findOrFail($id), $request->user(), $data['action'] === 'approve', $data['admin_notes'] ?? null);
        $this->audit($request, "store_reinstatement.{$data['action']}", $item->id, ['store_id' => $item->store_id]);

        return ResponseHelper::success(['request' => $this->serializeReinstatement($item)], $data['action'] === 'approve' ? 'Store reinstated' : 'Reinstatement request rejected');
    }

    private function summaryData(): array
    {
        $open = [StoreReport::STATUS_SUBMITTED, StoreReport::STATUS_UNDER_REVIEW, StoreReport::STATUS_WAITING_FOR_CUSTOMER, StoreReport::STATUS_WAITING_FOR_SELLER];
        return [
            'total_reports' => StoreReport::count(),
            'reported_stores' => StoreReport::distinct('store_id')->count('store_id'),
            'open_reports' => StoreReport::whereIn('status', $open)->count(),
            'suspended_stores' => Store::where('status', 'suspended')->count(),
            'pending_reinstatements' => StoreReinstatementRequest::where('status', StoreReinstatementRequest::STATUS_PENDING)->count(),
        ];
    }

    private function pagination($page): array
    {
        return ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()];
    }

    private function audit(Request $request, string $action, int $resourceId, array $details): void
    {
        AdminActivityLogger::log($request->user(), $action, 'store_report', $resourceId, true, $details, $request);
    }

    private function storeSummary(Store $store): array
    {
        return ['id' => $store->id, 'name' => $store->name, 'status' => $store->status, 'is_active' => (bool) $store->is_active];
    }

    private function serialize(StoreReport $report): array
    {
        return [
            'id' => $report->id, 'buyer_id' => $report->buyer_id,
            'buyer' => $report->relationLoaded('buyer') && $report->buyer ? ['id' => $report->buyer->id, 'name' => $report->buyer->name, 'email' => $report->buyer->email] : null,
            'store_id' => $report->store_id,
            'store' => $report->relationLoaded('store') && $report->store ? $this->storeSummary($report->store) + ['reports_count' => $report->store->reports_count ?? null] : null,
            'reason' => $report->reason, 'details' => $report->details, 'evidence_paths' => $report->evidence_paths,
            'evidence_urls' => collect($report->evidence_paths ?? [])->map(fn ($path) => Storage::disk('public')->url($path))->values()->all(),
            'status' => $report->status, 'admin_notes' => $report->admin_notes, 'reviewed_by' => $report->reviewed_by,
            'reviewer' => $report->relationLoaded('reviewer') && $report->reviewer ? ['id' => $report->reviewer->id, 'name' => $report->reviewer->name] : null,
            'reviewed_at' => $report->reviewed_at?->toIso8601String(), 'created_at' => $report->created_at?->toIso8601String(),
        ];
    }

    private function serializeReinstatement(StoreReinstatementRequest $item): array
    {
        return ['id' => $item->id, 'store_id' => $item->store_id, 'seller_id' => $item->seller_id, 'reason' => $item->reason, 'status' => $item->status, 'admin_notes' => $item->admin_notes, 'reviewed_at' => $item->reviewed_at?->toIso8601String(), 'created_at' => $item->created_at?->toIso8601String(), 'store' => $item->store ? $this->storeSummary($item->store) : null, 'seller' => $item->seller ? ['id' => $item->seller->id, 'name' => $item->seller->name, 'email' => $item->seller->email] : null, 'reviewer' => $item->reviewer ? ['id' => $item->reviewer->id, 'name' => $item->reviewer->name] : null];
    }
}
