'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { productService, type Product } from '@/services/product-service';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  onProductUpdate?: () => void;
}

export default function ProductDetailsModal({
  isOpen,
  onClose,
  productId,
  onProductUpdate,
}: ProductDetailsModalProps) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && productId) {
      loadProduct();
    }
  }, [isOpen, productId]);

  const loadProduct = async () => {
    try {
      setLoadingProduct(true);
      setError('');
      const data = await productService.getOne(productId);
      setProduct(data);
    } catch (error) {
      console.error('Failed to load product:', error);
      setError('Failed to load product details');
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleEdit = () => {
    onClose();
    router.push(`/products/${productId}/edit`);
  };

  const handleToggleStatus = async () => {
    if (!product) return;
    try {
      await productService.toggleStatus(product.id);
      await loadProduct();
      onProductUpdate?.();
    } catch (error) {
      console.error('Failed to toggle product status:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? product.name : 'Product Details'}
      size="xl"
    >
      {loadingProduct ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading product details...</p>
          </div>
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : !product ? (
        <div className="py-12 text-center">
          <p className="text-gray-600">Product not found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Product Images */}
          {product.images && product.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                  <img
                    src={img}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Basic Information */}
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
                  {product.is_featured && (
                    <Badge variant="primary">Featured</Badge>
                  )}
                  <Badge variant={product.is_active ? 'success' : 'default'}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-4">SKU: {product.sku}</p>
                {product.short_description && (
                  <p className="text-gray-700 mb-4">{product.short_description}</p>
                )}
              </div>
            </div>

            {product.description && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500 mb-1">Product Type</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {product.product_type.replace('_', ' ')}
                </p>
              </div>
              {product.category && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="font-semibold text-gray-900">{product.category.name}</p>
                </div>
              )}
              {product.sub_category && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Sub Category</p>
                  <p className="font-semibold text-gray-900">{product.sub_category.name}</p>
                </div>
              )}
              {product.gender && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Gender</p>
                  <p className="font-semibold text-gray-900 capitalize">{product.gender}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Pricing & Inventory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Price</span>
                  <span className="text-2xl font-bold text-[#0066CC]">
                    €{Number(product.price || 0).toFixed(2)}
                  </span>
                </div>
                {product.compare_at_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Compare At Price</span>
                    <span className="text-lg font-semibold text-gray-500 line-through">
                      €{Number(product.compare_at_price).toFixed(2)}
                    </span>
                  </div>
                )}
                {product.cost_price && (
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-gray-600">Cost Price</span>
                    <span className="text-lg font-semibold text-gray-700">
                      €{Number(product.cost_price).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Inventory</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Stock Quantity</span>
                  <span className="text-xl font-bold text-gray-900">
                    {product.stock_quantity}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Stock Status</span>
                  <Badge
                    variant={
                      product.stock_status === 'in_stock'
                        ? 'success'
                        : product.stock_status === 'out_of_stock'
                        ? 'error'
                        : 'warning'
                    }
                  >
                    {product.stock_status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Product Specifications */}
          {(product.frame_shape ||
            product.frame_material ||
            product.frame_color ||
            product.lens_type) && (
            <Card>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {product.frame_shape && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Frame Shape</p>
                    <p className="font-semibold text-gray-900">{product.frame_shape}</p>
                  </div>
                )}
                {product.frame_material && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Frame Material</p>
                    <p className="font-semibold text-gray-900">{product.frame_material}</p>
                  </div>
                )}
                {product.frame_color && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Frame Color</p>
                    <p className="font-semibold text-gray-900">{product.frame_color}</p>
                  </div>
                )}
                {product.lens_type && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Lens Type</p>
                    <p className="font-semibold text-gray-900">{product.lens_type}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Statistics */}
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#0066CC]">{product.rating || 0}</p>
                <p className="text-xs text-gray-600 mt-1">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#0066CC]">{product.review_count || 0}</p>
                <p className="text-xs text-gray-600 mt-1">Reviews</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#0066CC]">{product.view_count || 0}</p>
                <p className="text-xs text-gray-600 mt-1">Views</p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button onClick={handleEdit} className="flex-1">
              Edit Product
            </Button>
            <Button
              variant="outline"
              onClick={handleToggleStatus}
              className="flex-1"
            >
              {product.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

