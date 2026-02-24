'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
// Layout components are now handled by app/template.tsx
import { cartService, type Cart, type CartItem } from '@/services/cart-service';
import Button from '@/components/ui/Button';
import Loader from '@/components/ui/Loader';
import ProductDetailsModal from '@/components/products/ProductDetailsModal';
import Image from 'next/image';
import Link from 'next/link';

export default function CartPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<number | null>(null);
  const [removingItem, setRemovingItem] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?redirect=/cart');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    }
  }, [isAuthenticated]);

  const loadCart = async () => {
    try {
      setLoadingCart(true);
      const data = await cartService.getCart();
      setCart(data);
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setLoadingCart(false);
    }
  };

  const handleUpdateQuantity = async (itemId: number, quantity: number) => {
    if (quantity < 1) return;
    
    setUpdatingItem(itemId);
    try {
      await cartService.updateItem(itemId, quantity);
      await loadCart();
      showToast('success', 'Cart updated successfully');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to update quantity');
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    setRemovingItem(itemId);
    try {
      await cartService.removeItem(itemId);
      await loadCart();
      showToast('success', 'Item removed from cart');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to remove item');
      setRemovingItem(null);
    }
  };

  const handleProductClick = (productId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProductId(productId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProductId(null);
  };

  if (loading || loadingCart) {
    return <Loader fullScreen text="Loading your cart..." />;
  }

  if (!isAuthenticated || !cart) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Shopping Cart</h1>

        {cart.items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">Your cart is empty. Start shopping to add items!</p>
            <Link
              href="/"
              className="inline-block bg-[#0066CC] text-white px-6 py-2 rounded-lg hover:bg-[#0052a3] transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {cart.breakdown?.map((store: any) => (
                <div key={store.store_id} className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {store.store_name}
                  </h2>
                  <div className="space-y-4">
                    {store.items.map((item: CartItem) => (
                      <div key={item.id} className="flex gap-4 border-b border-gray-200 pb-4 last:border-0 hover:bg-gray-50/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                        <button
                          onClick={(e) => handleProductClick(item.product_id, e)}
                          className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-[#0066CC]/50 hover:shadow-md transition-all group cursor-pointer"
                          title="Click to view product details"
                        >
                          {(item.variant?.images && item.variant.images[0]) || (item.product.images && item.product.images[0]) ? (
                            <Image
                              src={item.variant?.images?.[0] || item.product.images[0]}
                              alt={item.product.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg"></div>
                        </button>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={(e) => handleProductClick(item.product_id, e)}
                            className="font-semibold text-gray-900 hover:text-[#0066CC] transition-colors text-left w-full group/item cursor-pointer"
                            title="Click to view product details"
                          >
                            <span className="flex items-center gap-2">
                              {item.product.name}
                              <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover/item:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </span>
                          </button>
                          {item.variant && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-600">Color:</span>
                              <div
                                className="w-4 h-4 rounded-full border border-gray-300"
                                style={{
                                  backgroundColor: item.variant.color_code || '#ccc',
                                }}
                                title={item.variant.color_name}
                              />
                              <span className="text-xs text-gray-600">{item.variant.color_name}</span>
                            </div>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            €{Number(item.price || 0).toFixed(2)} each
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Quantity: {item.quantity}
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
                                }
                                disabled={updatingItem === item.id || item.quantity <= 1}
                                className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                {updatingItem === item.id ? (
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  '−'
                                )}
                              </button>
                              <span className="w-12 text-center font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={updatingItem === item.id}
                                className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                {updatingItem === item.id ? (
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  '+'
                                )}
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={removingItem === item.id}
                              className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                            >
                              {removingItem === item.id ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Removing...</span>
                                </>
                              ) : (
                                'Remove'
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#0066CC]">
                            €{(Number(item.price || 0) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md border border-gray-100 p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">€{Number(cart.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-semibold">€0.00</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-lg font-bold text-[#0066CC]">
                      €{Number(cart.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <Link href="/checkout">
                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Product Details Modal */}
        {selectedProductId && (
          <ProductDetailsModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            productId={selectedProductId}
          />
        )}
    </div>
  );
}
