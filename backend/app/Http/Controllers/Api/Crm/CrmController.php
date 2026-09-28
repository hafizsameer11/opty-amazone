<?php

namespace App\Http\Controllers\Api\Crm;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Shared behaviour for the read-only CRM endpoints.
 *
 * Every list endpoint in this namespace is paginated and clamped, exposes an
 * optional created_at window, and never returns a raw Eloquent model — only
 * explicitly whitelisted fields, so internal columns (wallet balances, hashed
 * credentials, delivery codes, referral tokens) cannot leak by accident.
 */
abstract class CrmController extends Controller
{
    /**
     * Validate the window shared by every CRM list endpoint.
     *
     * @return array{from: ?string, to: ?string}
     */
    protected function validateWindow(Request $request): array
    {
        $validated = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
        ]);

        return [
            'from' => $validated['from'] ?? null,
            'to' => $validated['to'] ?? null,
        ];
    }

    /**
     * Clamp pagination parameters to the configured ceiling.
     *
     * @return array{page: int, per_page: int}
     */
    protected function validatePagination(Request $request): array
    {
        $validated = $request->validate([
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:'.(int) config('crm.max_page_size', 100),
        ]);

        return [
            'page' => (int) ($validated['page'] ?? 1),
            'per_page' => (int) ($validated['per_page'] ?? config('crm.default_page_size', 25)),
        ];
    }

    /**
     * Apply an optional created_at window to a query.
     */
    protected function applyWindow($query, ?string $from, ?string $to, string $column = 'created_at'): void
    {
        if ($from) {
            $query->where($column, '>=', $from);
        }

        if ($to) {
            $query->where($column, '<=', $to);
        }
    }

    /**
     * Normalise a Laravel paginator into the envelope the CRM expects, always
     * including the filter facets so the CRM can populate dropdowns without a
     * second round trip.
     *
     * @param  array<string, mixed>  $extra
     * @param  array<string, mixed>  $facets
     */
    protected function paginated(
        LengthAwarePaginator $paginator,
        array $extra = [],
        array $facets = []
    ): JsonResponse {
        return ResponseHelper::success(array_merge([
            'rows' => $paginator->items(),
            'pagination' => [
                'page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'filter_options' => $facets,
        ], $extra));
    }

    /**
     * Cast a money column to a float so the CRM never has to reason about
     * decimal strings. Note that the ads subsystem stores integer *cents*;
     * those are converted explicitly at the call site, never here.
     *
     * @param  array<string, mixed>  $row
     * @param  array<int, string>  $keys
     * @return array<string, mixed>
     */
    protected function castMoney(array $row, array $keys): array
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $row)) {
                $row[$key] = $row[$key] === null ? null : round((float) $row[$key], 2);
            }
        }

        return $row;
    }
}
