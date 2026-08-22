<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class BuyerStoreReportController extends Controller
{
    public function store(int $storeId, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isBuyer()) {
            return ResponseHelper::error('Only buyers can report stores.', null, 403);
        }

        $store = Store::where('is_active', true)->findOrFail($storeId);

        try {
            $validated = $request->validate([
                'reason' => ['required', 'string', 'max:255'],
                'details' => ['nullable', 'string', 'max:5000'],
                'evidence' => ['nullable', 'array', 'max:5'],
                'evidence.*' => ['file', 'max:5120', 'mimes:jpg,jpeg,png,gif,webp,pdf'],
            ]);
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        }

        $paths = [];
        if ($request->hasFile('evidence')) {
            foreach ($request->file('evidence') as $file) {
                $paths[] = $file->store("store-reports/{$store->id}/buyer-{$user->id}", 'public');
            }
        }

        $report = StoreReport::create([
            'buyer_id' => $user->id,
            'store_id' => $store->id,
            'reason' => $validated['reason'],
            'details' => $validated['details'] ?? null,
            'evidence_paths' => $paths ?: null,
            'status' => StoreReport::STATUS_SUBMITTED,
        ]);

        return ResponseHelper::success([
            'report' => $this->serialize($report),
        ], 'Store reported successfully', 201);
    }

    private function serialize(StoreReport $report): array
    {
        $urls = collect($report->evidence_paths ?? [])->map(
            fn ($p) => Storage::disk('public')->url($p)
        )->values()->all();

        return [
            'id' => $report->id,
            'store_id' => $report->store_id,
            'reason' => $report->reason,
            'details' => $report->details,
            'evidence_paths' => $report->evidence_paths,
            'evidence_urls' => $urls,
            'status' => $report->status,
            'created_at' => $report->created_at?->toIso8601String(),
        ];
    }
}
