'use client';

import { useState } from 'react';
import { Product } from '@/services/product-service';
import Button from '@/components/ui/Button';

interface EyeHygieneDetailsProps {
  product: Product;
  onAddToCart: (config: {
    product_id: number;
    variant_id?: number;
    quantity: number;
  }) => Promise<void>;
  addingToCart?: boolean;
}

export default function EyeHygieneDetails({
  product,
  onAddToCart,
  addingToCart = false,
}: EyeHygieneDetailsProps) {
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    await onAddToCart({
      product_id: product.id,
      quantity: quantity,
    });
  };

  return (
    <div className="space-y-6">
      {/* Eye Hygiene Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Product Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {product.size_volume && (
            <div>
              <span className="text-gray-600 font-medium">Size/Volume:</span>
              <span className="ml-2">{product.size_volume}</span>
            </div>
          )}
          {product.pack_type && (
            <div>
              <span className="text-gray-600 font-medium">Pack Type:</span>
              <span className="ml-2 capitalize">{product.pack_type}</span>
            </div>
          )}
          {product.expiry_date && (
            <div>
              <span className="text-gray-600 font-medium">Expiry Date:</span>
              <span className="ml-2">
                {new Date(product.expiry_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quantity Selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Quantity
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
          >
            −
          </button>
          <span className="text-lg font-semibold w-12 text-center">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() =>
              setQuantity(
                Math.min(product.stock_quantity || 999, quantity + 1)
              )
            }
            className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
          >
            +
          </button>
        </div>
        {product.stock_quantity && (
          <p className="text-xs text-gray-500 mt-1">
            {product.stock_quantity} available in stock
          </p>
        )}
      </div>

      {/* Total Price */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Subtotal:</span>
          <span className="text-lg font-bold text-[#0066CC]">
            €{(Number(product.price || 0) * quantity).toFixed(2)}
          </span>
        </div>
        {product.compare_at_price && Number(product.compare_at_price) > Number(product.price || 0) && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Regular Price:</span>
            <span className="text-xs text-gray-500 line-through">
              €{(Number(product.compare_at_price || 0) * quantity).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Add to Cart Button */}
      <Button
        onClick={handleAddToCart}
        disabled={addingToCart || product.stock_status !== 'in_stock'}
        className="w-full"
        size="lg"
      >
        {addingToCart ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Adding to Cart...
          </span>
        ) : product.stock_status !== 'in_stock' ? (
          'Out of Stock'
        ) : (
          'Add to Cart'
        )}
      </Button>

      {/* Additional Information */}
      {product.description && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
          <p className="text-sm text-gray-600 whitespace-pre-line">
            {product.description}
          </p>
        </div>
      )}
    </div>
  );
}
