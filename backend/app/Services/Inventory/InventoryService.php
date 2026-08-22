<?php

namespace App\Services\Inventory;

use App\Models\CartItem;
use App\Models\FrameSize;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductSizeVolume;
use App\Models\ProductVariant;
use App\Models\EyeHygieneVariant;

class InventoryService
{
    /**
     * Decrement inventory for a cart line (call inside an open DB transaction; locks rows).
     */
    public function decrementForCartLine(CartItem $item): void
    {
        $qty = (int) $item->quantity;
        if ($qty < 1) {
            return;
        }

        $productId = (int) $item->product_id;
        $product = Product::where('id', $productId)->lockForUpdate()->firstOrFail();
        $label = $product->name;

        if ($item->product_size_volume_id) {
            $row = ProductSizeVolume::where('product_id', $productId)
                ->where('id', $item->product_size_volume_id)
                ->lockForUpdate()
                ->firstOrFail();
            $this->assertAvailable((int) $row->stock_quantity, $qty, $label);
            $row->decrement('stock_quantity', $qty);
            $row->refresh();
            $this->applyOutOfStockIfEmpty($row);

            return;
        }

        if ($item->eye_hygiene_variant_id) {
            EyeHygieneVariant::where('product_id', $productId)
                ->where('id', $item->eye_hygiene_variant_id)
                ->firstOrFail();
            $this->assertAvailable((int) $product->stock_quantity, $qty, $label);
            $product->decrement('stock_quantity', $qty);
            $product->refresh();
            $this->applyOutOfStockIfEmpty($product);

            return;
        }

        if ($item->frame_size_id) {
            $fs = FrameSize::where('product_id', $productId)
                ->where('id', $item->frame_size_id)
                ->lockForUpdate()
                ->firstOrFail();
            $this->assertAvailable((int) $fs->stock_quantity, $qty, $label);
            $fs->decrement('stock_quantity', $qty);
            $fs->refresh();
            $this->applyOutOfStockIfEmpty($fs);
            if ($fs->product_variant_id) {
                ProductVariant::find($fs->product_variant_id)?->syncStockFromSizes();
            }

            return;
        }

        if ($item->variant_id) {
            $v = ProductVariant::where('product_id', $productId)
                ->where('id', $item->variant_id)
                ->lockForUpdate()
                ->firstOrFail();
            $this->assertAvailable((int) $v->stock_quantity, $qty, $label);
            $v->decrement('stock_quantity', $qty);
            $v->refresh();
            $this->applyOutOfStockIfEmpty($v);

            return;
        }

        $this->assertAvailable((int) $product->stock_quantity, $qty, $label);
        $product->decrement('stock_quantity', $qty);
        $product->refresh();
        $this->applyOutOfStockIfEmpty($product);
    }

    /**
     * Restore inventory when an order line is cancelled or rejected (same rules as decrement).
     */
    public function restoreForOrderLine(OrderItem $item): void
    {
        $qty = (int) $item->quantity;
        if ($qty < 1) {
            return;
        }

        $productId = (int) $item->product_id;
        $product = Product::where('id', $productId)->lockForUpdate()->firstOrFail();

        if ($item->product_size_volume_id) {
            $row = ProductSizeVolume::where('product_id', $productId)
                ->where('id', $item->product_size_volume_id)
                ->lockForUpdate()
                ->firstOrFail();
            $row->increment('stock_quantity', $qty);
            $row->refresh();
            $this->applyInStockWhenPositive($row);

            return;
        }

        if ($item->eye_hygiene_variant_id) {
            $product->increment('stock_quantity', $qty);
            $product->refresh();
            $this->applyInStockWhenPositive($product);

            return;
        }

        if ($item->frame_size_id) {
            $fs = FrameSize::where('product_id', $productId)
                ->where('id', $item->frame_size_id)
                ->lockForUpdate()
                ->firstOrFail();
            $fs->increment('stock_quantity', $qty);
            $fs->refresh();
            $this->applyInStockWhenPositive($fs);
            if ($fs->product_variant_id) {
                ProductVariant::find($fs->product_variant_id)?->syncStockFromSizes();
            }

            return;
        }

        if ($item->variant_id) {
            $v = ProductVariant::where('product_id', $productId)
                ->where('id', $item->variant_id)
                ->lockForUpdate()
                ->firstOrFail();
            $v->increment('stock_quantity', $qty);
            $v->refresh();
            $this->applyInStockWhenPositive($v);

            return;
        }

        $product->increment('stock_quantity', $qty);
        $product->refresh();
        $this->applyInStockWhenPositive($product);
    }

    private function assertAvailable(int $available, int $need, string $productName): void
    {
        if ($available < $need) {
            throw new \RuntimeException(
                'Insufficient stock for "' . $productName . '". Another customer may have purchased the last units — please refresh your cart and try again.'
            );
        }
    }

    private function applyOutOfStockIfEmpty(Product|ProductVariant|ProductSizeVolume|FrameSize $model): void
    {
        $q = max(0, (int) $model->stock_quantity);
        $model->stock_quantity = $q;
        if ($q <= 0) {
            $model->stock_status = 'out_of_stock';
        }
        $model->save();
    }

    private function applyInStockWhenPositive(Product|ProductVariant|ProductSizeVolume|FrameSize $model): void
    {
        if ((int) $model->stock_quantity > 0 && $model->stock_status === 'out_of_stock') {
            $model->stock_status = 'in_stock';
            $model->save();
        }
    }
}
