<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Category;
use App\Models\Product;
use App\Models\PrescriptionDropdownValue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SellerProductPrescriptionDropdownController extends Controller
{
    private const CONTACT_LENS_FIELDS = ['pwr', 'sph', 'cyl', 'axis', 'base_curve', 'diameter'];

    public function show(int $productId)
    {
        $store = Auth::user()?->store;
        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::with(['category.parent.parent.parent', 'subCategory.parent.parent.parent'])
            ->where('store_id', $store->id)
            ->find($productId);
        if (!$product) {
            return ResponseHelper::error('Product not found', null, 404);
        }

        if ($product->product_type !== 'contact_lens') {
            return ResponseHelper::error(
                'Contact lens prescription options can only be managed for contact lens products.',
                null,
                422
            );
        }

        $values = PrescriptionDropdownValue::where('store_id', $store->id)
            ->where('product_id', $product->id)
            ->orderBy('field_type')
            ->orderBy('sort_order')
            ->orderBy('value')
            ->get();

        // DB enum uses `sph` for sphere power; UI may send/read `pwr` for contact lenses.
        $grouped = [];
        foreach (self::CONTACT_LENS_FIELDS as $fieldType) {
            if (in_array($fieldType, ['pwr', 'sph'], true)) {
                $grouped[$fieldType] = $values
                    ->whereIn('field_type', ['sph', 'pwr'])
                    ->values();
            } else {
                $grouped[$fieldType] = $values->where('field_type', $fieldType)->values();
            }
        }

        return ResponseHelper::success([
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category_id' => $product->category_id,
            ],
            // SPH tab only for toric/astigmatism; spherical (daily/weekly/monthly) uses PWR only.
            'show_sph_tab' => $this->isAstigmatismContactLensCategory($product),
            'values' => $grouped,
        ], 'Contact lens prescription values retrieved successfully');
    }

    public function store(Request $request, int $productId)
    {
        $store = Auth::user()?->store;
        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->find($productId);
        if (!$product) {
            return ResponseHelper::error('Product not found', null, 404);
        }

        if ($product->product_type !== 'contact_lens') {
            return ResponseHelper::error(
                'Contact lens prescription options can only be saved for contact lens products.',
                null,
                422
            );
        }

        if (!$product->category_id) {
            return ResponseHelper::error('Product must have a category before saving prescription options.', null, 422);
        }

        $validated = $request->validate([
            'values' => 'required|array',
            'values.*.field_type' => 'required|in:pwr,sph,cyl,axis,base_curve,diameter',
            'values.*.value' => 'required|string|max:50',
            'values.*.label' => 'nullable|string|max:100',
            'values.*.eye_type' => 'nullable|in:left,right,both',
            'values.*.is_active' => 'nullable|boolean',
            'values.*.sort_order' => 'nullable|integer',
        ]);

        if ($this->requiresPowerField($product) && !$this->hasPowerValue($validated['values'])) {
            return ResponseHelper::error(
                'Spherical contact lens products must include at least one PWR value.',
                null,
                422
            );
        }

        DB::beginTransaction();
        try {
            PrescriptionDropdownValue::where('store_id', $store->id)
                ->where('product_id', $product->id)
                ->delete();

            $insertData = [];
            foreach ($validated['values'] as $value) {
                $dbFieldType = $value['field_type'] === 'pwr' ? 'sph' : $value['field_type'];
                $normalizedValue = $this->normalizeContactLensFieldValue($dbFieldType, (string) $value['value']);
                $insertData[] = [
                    'store_id' => $store->id,
                    'category_id' => $product->category_id,
                    'product_id' => $product->id,
                    'field_type' => $dbFieldType,
                    'value' => $normalizedValue,
                    'label' => $value['label'] ?? null,
                    'eye_type' => $value['eye_type'] ?? null,
                    'form_type' => 'contact_lens',
                    'is_active' => $value['is_active'] ?? true,
                    'sort_order' => $value['sort_order'] ?? 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            // Client may send the same option twice (e.g. PWR + SPH tabs both map to `sph` in DB).
            $insertData = $this->dedupePrescriptionRowsForUniqueConstraint($insertData);

            if (!empty($insertData)) {
                PrescriptionDropdownValue::insert($insertData);
            }

            DB::commit();

            return ResponseHelper::success(null, 'Contact lens prescription values updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();

            return ResponseHelper::error('Failed to update values: '.$e->getMessage(), null, 500);
        }
    }

    /**
     * Matches prescription_dropdown_unique_v2:
     * (store_id, category_id, product_id, field_type, value, eye_type, form_type).
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function dedupePrescriptionRowsForUniqueConstraint(array $rows): array
    {
        $seen = [];
        $out = [];

        foreach ($rows as $row) {
            $eye = $row['eye_type'] ?? '';
            $key = implode("\0", [
                (string) $row['store_id'],
                (string) $row['category_id'],
                (string) $row['product_id'],
                (string) $row['field_type'],
                (string) $row['value'],
                (string) $eye,
                (string) $row['form_type'],
            ]);

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $out[] = $row;
        }

        return $out;
    }

    private function hasPowerValue(array $values): bool
    {
        foreach ($values as $value) {
            $fieldType = $value['field_type'] ?? null;
            if (in_array($fieldType, ['pwr', 'sph'], true) && trim((string) ($value['value'] ?? '')) !== '') {
                return true;
            }
        }

        return false;
    }

    /**
     * Persist DIA/PWR/SPH/CYL/BC with two decimal places when numeric (14.5 → 14.50).
     */
    private function normalizeContactLensFieldValue(string $fieldType, string $raw): string
    {
        $trimmed = trim($raw);
        if ($trimmed === '' || ! in_array($fieldType, ['sph', 'pwr', 'cyl', 'base_curve', 'diameter'], true)) {
            return $trimmed;
        }

        $normalized = str_replace(',', '.', $trimmed);
        if (! is_numeric($normalized)) {
            return $trimmed;
        }

        return number_format((float) $normalized, 2, '.', '');
    }

    private function walkCategoryChain(?Category $start, callable $predicate): bool
    {
        $current = $start;
        while ($current instanceof Category) {
            if ($predicate($current)) {
                return true;
            }
            $current = $current->parent;
        }

        return false;
    }

    private function requiresPowerField(Product $product): bool
    {
        if ($product->product_type !== 'contact_lens') {
            return false;
        }

        $hasContactLensRoot = $this->walkCategoryChain($product->category, fn (Category $c) => strtolower((string) $c->slug) === 'contact-lenses')
            || $this->walkCategoryChain($product->subCategory, fn (Category $c) => strtolower((string) $c->slug) === 'contact-lenses');

        $hasSpherical = $this->walkCategoryChain($product->subCategory, function (Category $c) {
            $slug = strtolower((string) $c->slug);
            $name = strtolower((string) $c->name);

            return str_contains($slug, 'spherical') || $name === 'spherical';
        }) || $this->walkCategoryChain($product->category, function (Category $c) {
            $slug = strtolower((string) $c->slug);
            $name = strtolower((string) $c->name);

            return str_contains($slug, 'spherical') || $name === 'spherical';
        });

        return $hasContactLensRoot && $hasSpherical;
    }

    /**
     * True when product sits under Contact lenses and an astigmatism/toric subcategory (slug or name).
     * Spherical branches (daily/weekly/monthly) use PWR only — no SPH tab.
     */
    private function isAstigmatismContactLensCategory(Product $product): bool
    {
        if ($product->product_type !== 'contact_lens') {
            return false;
        }

        $hasContactLensRoot = $this->walkCategoryChain($product->category, fn (Category $c) => strtolower((string) $c->slug) === 'contact-lenses')
            || $this->walkCategoryChain($product->subCategory, fn (Category $c) => strtolower((string) $c->slug) === 'contact-lenses');

        $hasAstigmatism = $this->walkCategoryChain($product->subCategory, function (Category $c) {
            $slug = strtolower((string) $c->slug);
            $name = strtolower((string) $c->name);

            return str_contains($slug, 'astigmatism')
                || str_contains($name, 'astigmatism')
                || str_contains($slug, 'toric')
                || str_contains($name, 'toric');
        }) || $this->walkCategoryChain($product->category, function (Category $c) {
            $slug = strtolower((string) $c->slug);
            $name = strtolower((string) $c->name);

            return str_contains($slug, 'astigmatism')
                || str_contains($name, 'astigmatism')
                || str_contains($slug, 'toric')
                || str_contains($name, 'toric');
        });

        return $hasContactLensRoot && $hasAstigmatism;
    }
}
