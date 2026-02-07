'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BottomNav from '@/components/layout/BottomNav';
import { cartService } from '@/services/cart-service';
import { orderService } from '@/services/order-service';
import { userService, type Address } from '@/services/user-service';
import { useToast } from '@/components/ui/Toast';
import Loader from '@/components/ui/Loader';
import Button from '@/components/ui/Button';
import CouponInput from '@/components/checkout/CouponInput';
import PointsRedeemInput from '@/components/checkout/PointsRedeemInput';
import { type CouponValidation } from '@/services/coupon-service';
import Link from 'next/link';

export default function CheckoutPage() {
  const { isAuthenticated, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('wallet');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [appliedPoints, setAppliedPoints] = useState<number | null>(null);
  const [pointsDiscount, setPointsDiscount] = useState<number>(0);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?redirect=/checkout');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [cartData, addressesData] = await Promise.all([
        cartService.getCart(),
        userService.getAddresses(),
      ]);
      setCart(cartData);
      setAddresses(addressesData);
      const defaultAddress = addressesData.find((addr) => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      }
    } catch (error) {
      console.error('Failed to load checkout data:', error);
      showToast('error', 'Failed to load checkout data');
    } finally {
      setLoadingData(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      showToast('warning', 'Please select a delivery address');
      return;
    }

    try {
      setPlacingOrder(true);
      const result = await orderService.placeOrder({
        delivery_address_id: selectedAddressId,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.valid ? appliedCoupon.coupon?.code : undefined,
        points_to_redeem: appliedPoints || undefined,
      });
      showToast('success', 'Order placed successfully! Redirecting...');
      setTimeout(() => router.push(`/orders/${result.order.id}`), 1000);
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to place order');
      setPlacingOrder(false);
    }
  };

  const handleCouponApplied = (validation: CouponValidation) => {
    setAppliedCoupon(validation);
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
  };

  const calculateTotal = () => {
    let total = Number(cart.total || 0);
    if (appliedCoupon?.valid && appliedCoupon.discount_amount) {
      total -= appliedCoupon.discount_amount;
    }
    if (pointsDiscount > 0) {
      total -= pointsDiscount;
    }
    return Math.max(0, total);
  };

  const handlePointsRedeemed = (discountAmount: number, pointsUsed: number) => {
    setAppliedPoints(pointsUsed);
    setPointsDiscount(discountAmount);
  };

  const handlePointsRemoved = () => {
    setAppliedPoints(null);
    setPointsDiscount(0);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
        <Header />
        <Loader fullScreen text="Loading checkout..." />
        <Footer />
        <BottomNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !cart) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>
              {addresses.length === 0 ? (
                <div>
                  <p className="text-gray-600 mb-4">No addresses found.</p>
                  <Link
                    href="/profile/addresses/new"
                    className="text-[#0066CC] hover:underline"
                  >
                    Add Address
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`block border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedAddressId === address.id
                          ? 'border-[#0066CC] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                        className="sr-only"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{address.full_name}</p>
                        <p className="text-sm text-gray-600">{address.address_line_1}</p>
                        {address.address_line_2 && (
                          <p className="text-sm text-gray-600">{address.address_line_2}</p>
                        )}
                        {address.phone && (
                          <p className="text-sm text-gray-600">Phone: {address.phone}</p>
                        )}
                      </div>
                    </label>
                  ))}
                  <Link
                    href="/profile/addresses/new"
                    className="text-[#0066CC] hover:underline text-sm"
                  >
                    + Add New Address
                  </Link>
                </div>
              )}
            </div>

            {/* Coupon Code */}
            <div className="bg-white rounded-lg shadow p-6">
              <CouponInput
                orderTotal={Number(cart.total || 0)}
                onCouponApplied={handleCouponApplied}
                onCouponRemoved={handleCouponRemoved}
                appliedCoupon={appliedCoupon || undefined}
              />
            </div>

            {/* Points Redemption */}
            <div className="bg-white rounded-lg shadow p-6">
              <PointsRedeemInput
                orderTotal={Number(cart.total || 0)}
                onPointsRedeemed={handlePointsRedeemed}
                onPointsRemoved={handlePointsRemoved}
                appliedPoints={appliedPoints || undefined}
              />
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center border-2 rounded-lg p-4 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="wallet"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                    className="mr-3"
                  />
                  <span className="font-medium">Wallet</span>
                </label>
                <label className="flex items-center border-2 rounded-lg p-4 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="mr-3"
                  />
                  <span className="font-medium">Card</span>
                </label>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                {cart.breakdown?.map((store: any) => (
                  <div key={store.store_id} className="border-b pb-4">
                    <p className="font-semibold text-gray-900 mb-2">{store.store_name}</p>
                    <p className="text-sm text-gray-600">
                      {store.items.length} item{store.items.length > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      €{Number(store.subtotal || 0).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">€{Number(cart.total || 0).toFixed(2)}</span>
                </div>
                {appliedCoupon?.valid && appliedCoupon.discount_amount && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-gray-600">Discount ({appliedCoupon.coupon?.code}):</span>
                    <span className="font-semibold">-€{appliedCoupon.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-gray-600">Points Discount ({appliedPoints} pts):</span>
                    <span className="font-semibold">-€{pointsDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-semibold">€0.00</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-lg font-bold text-[#0066CC]">
                    €{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={handlePlaceOrder}
                disabled={!selectedAddressId || placingOrder}
                className="w-full"
                size="lg"
              >
                {placingOrder ? 'Placing Order...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

