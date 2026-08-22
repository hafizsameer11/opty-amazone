<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Category;
use App\Models\Product;
use App\Models\PrescriptionDropdownValue;
use Illuminate\Support\Collection;

class PrescriptionOptionsController extends Controller
{
    /**
     * Get prescription options for a product.
     * Contact lens products use rows scoped to product_id when present; otherwise category-level CL config.
     * Other product types use category-level rows only (excluding contact_lens form_type).
     */
    public function getForProduct($productId)
    {
        $product = Product::with(['category.parent', 'store'])->find($productId);

        if (!$product) {
            return ResponseHelper::error('Product not found', null, 404);
        }

        if (!$product->category_id || !$product->store_id) {
            return ResponseHelper::success($this->getEmptyStructure(), 'No prescription options configured');
        }

        $store = $product->store;
        $category = $product->category;

        if ($product->product_type === 'contact_lens') {
            $scoped = $this->queryContactLensProductScoped($store->id, $product->id)->get();
            if ($scoped->isNotEmpty()) {
                return ResponseHelper::success(
                    $this->structurePrescriptionOptions($scoped),
                    'Prescription options retrieved successfully'
                );
            }

            $fromCategory = $this->firstCategoryConfig(
                $store->id,
                $category,
                fn ($q) => $q->whereNull('product_id')->where(function ($q2) {
                    $q2->where('form_type', 'contact_lens')->orWhereNull('form_type');
                })
            );

            if ($fromCategory !== null) {
                return ResponseHelper::success(
                    $this->structurePrescriptionOptions($fromCategory),
                    'Prescription options retrieved successfully'
                );
            }

            return ResponseHelper::success($this->getEmptyStructure(), 'No prescription options configured');
        }

        $fromCategory = $this->firstCategoryConfig(
            $store->id,
            $category,
            fn ($q) => $q->whereNull('product_id')->where(function ($q2) {
                $q2->whereNull('form_type')->orWhere('form_type', '!=', 'contact_lens');
            })
        );

        if ($fromCategory !== null) {
            return ResponseHelper::success(
                $this->structurePrescriptionOptions($fromCategory),
                'Prescription options retrieved successfully'
            );
        }

        return ResponseHelper::success($this->getEmptyStructure(), 'No prescription options configured');
    }

    private function queryContactLensProductScoped(int $storeId, int $productId)
    {
        return PrescriptionDropdownValue::where('store_id', $storeId)
            ->where('product_id', $productId)
            ->where('is_active', true)
            ->where(function ($q) {
                $q->where('form_type', 'contact_lens')->orWhereNull('form_type');
            })
            ->orderBy('field_type')
            ->orderBy('sort_order')
            ->orderBy('value');
    }

    /**
     * @param  \Closure(\Illuminate\Database\Eloquent\Builder):void  $extraConstraints
     */
    private function firstCategoryConfig(int $storeId, ?Category $category, \Closure $extraConstraints): ?Collection
    {
        if (!$category) {
            return null;
        }

        foreach ($this->categoryIdsLeafToRoot($category) as $categoryId) {
            $query = PrescriptionDropdownValue::where('store_id', $storeId)
                ->where('category_id', $categoryId)
                ->where('is_active', true);
            $extraConstraints($query);

            if (!$query->exists()) {
                continue;
            }

            return $query->orderBy('field_type')
                ->orderBy('sort_order')
                ->orderBy('value')
                ->get();
        }

        return null;
    }

    private function categoryIdsLeafToRoot(Category $category): array
    {
        $ids = [];
        $currentId = $category->id;

        while ($currentId) {
            $ids[] = $currentId;
            $current = Category::find($currentId);
            $currentId = $current?->parent_id;
        }

        return $ids;
    }

    private function structurePrescriptionOptions($values)
    {
        $result = [
            'pd' => [],
            'pwr' => ['left' => [], 'right' => [], 'both' => []],
            'sph' => ['left' => [], 'right' => [], 'both' => []],
            'cyl' => ['left' => [], 'right' => [], 'both' => []],
            'axis' => ['left' => [], 'right' => [], 'both' => []],
            'h' => [],
            'year_of_birth' => [],
            'add' => [],
            'base_curve' => [],
            'diameter' => [],
        ];

        foreach ($values as $value) {
            $fieldValue = $this->formatPrescriptionFieldValue((string) $value->field_type, (string) $value->value);

            switch ($value->field_type) {
                case 'pd':
                case 'h':
                case 'year_of_birth':
                case 'add':
                case 'base_curve':
                case 'diameter':
                    if (!in_array($fieldValue, $result[$value->field_type], true)) {
                        $result[$value->field_type][] = $fieldValue;
                    }
                    break;

                case 'sph':
                case 'pwr':
                case 'cyl':
                case 'axis':
                    $eyeType = $value->eye_type ?? 'both';
                    // DB stores contact-lens power as `sph`; buyer UI expects `pwr` for lenses.
                    $typesToFill = [$value->field_type];
                    if ($value->field_type === 'sph' && $value->form_type === 'contact_lens') {
                        $typesToFill[] = 'pwr';
                    }
                    if ($value->field_type === 'pwr') {
                        $typesToFill[] = 'sph';
                    }
                    foreach (array_unique($typesToFill) as $ft) {
                        if (!isset($result[$ft]['left'])) {
                            continue;
                        }
                        if (!in_array($fieldValue, $result[$ft][$eyeType], true)) {
                            $result[$ft][$eyeType][] = $fieldValue;
                        }
                        // Values saved as "both" must also appear for left/right eyes on the buyer UI.
                        if ($eyeType === 'both') {
                            foreach (['left', 'right'] as $side) {
                                if (!in_array($fieldValue, $result[$ft][$side], true)) {
                                    $result[$ft][$side][] = $fieldValue;
                                }
                            }
                        } elseif (!in_array($fieldValue, $result[$ft]['both'], true)) {
                            $result[$ft]['both'][] = $fieldValue;
                        }
                    }
                    break;
            }
        }

        foreach ($result as $key => $value) {
            if (is_array($value) && isset($value['left'])) {
                $result[$key]['left'] = $this->sortPrescriptionNumericStrings(array_values(array_unique($result[$key]['left'])));
                $result[$key]['right'] = $this->sortPrescriptionNumericStrings(array_values(array_unique($result[$key]['right'])));
                $result[$key]['both'] = $this->sortPrescriptionNumericStrings(array_values(array_unique($result[$key]['both'])));
            } else {
                $result[$key] = $this->sortPrescriptionNumericStrings(array_values(array_unique($result[$key])));
            }
        }

        return $result;
    }

    /**
     * Normalize power / diameter / BC display (e.g. 14 → 14.00, 14.5 → 14.50).
     */
    private function formatPrescriptionFieldValue(string $fieldType, string $raw): string
    {
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return $trimmed;
        }

        if (!in_array($fieldType, ['sph', 'pwr', 'cyl', 'base_curve', 'diameter'], true)) {
            return $trimmed;
        }

        $normalized = str_replace(',', '.', $trimmed);
        if (!is_numeric($normalized)) {
            return $trimmed;
        }

        return number_format((float) $normalized, 2, '.', '');
    }

    /**
     * @param  array<int, string>  $values
     * @return array<int, string>
     */
    private function sortPrescriptionNumericStrings(array $values): array
    {
        usort($values, function ($a, $b) {
            $na = is_numeric(str_replace(',', '.', (string) $a)) ? (float) str_replace(',', '.', (string) $a) : null;
            $nb = is_numeric(str_replace(',', '.', (string) $b)) ? (float) str_replace(',', '.', (string) $b) : null;
            if ($na !== null && $nb !== null && $na != $nb) {
                return $na <=> $nb;
            }

            return strcmp((string) $a, (string) $b);
        });

        return $values;
    }

    private function getEmptyStructure()
    {
        return [
            'pd' => [],
            'pwr' => ['left' => [], 'right' => [], 'both' => []],
            'sph' => ['left' => [], 'right' => [], 'both' => []],
            'cyl' => ['left' => [], 'right' => [], 'both' => []],
            'axis' => ['left' => [], 'right' => [], 'both' => []],
            'h' => [],
            'year_of_birth' => [],
            'add' => [],
            'base_curve' => [],
            'diameter' => [],
        ];
    }
}
