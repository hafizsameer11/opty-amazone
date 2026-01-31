'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
// Footer component (inline due to module resolution issue)
const Footer = () => (
  <footer className="bg-gray-900 text-gray-300 mt-auto">
    <div className="w-full px-2 sm:px-3 lg:px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white font-semibold mb-4">Get to Know Us</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
            <li><Link href="/press" className="hover:text-white transition-colors">Press Releases</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Make Money with Us</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/sell" className="hover:text-white transition-colors">Sell on OpticalMarket</Link></li>
            <li><Link href="/affiliate" className="hover:text-white transition-colors">Affiliate Program</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Customer Service</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
            <li><Link href="/returns" className="hover:text-white transition-colors">Returns</Link></li>
            <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Legal</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} OpticalMarket. All rights reserved.</p>
      </div>
    </div>
  </footer>
);
import { orderService, type Order } from '@/services/order-service';
import { OrderSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

export default function OrdersPage() {
  const { isAuthenticated, loading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login?redirect=/orders');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated]);

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const dataPromise = orderService.getOrders({ per_page: 20 });
      const data = await Promise.race([dataPromise, timeoutPromise]) as any;
      setOrders(data.data || []);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      if (error.message === 'Request timeout') {
        showToast('error', 'Request took too long. Please try again.');
      } else {
        showToast('error', 'Failed to load orders. Please refresh the page.');
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  // Show page structure immediately, only show loading for content
  if (!isAuthenticated && !loading) {
    return null;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      out_for_delivery: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Orders</h1>

        {loadingOrders ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <OrderSkeleton key={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
            <Link
              href="/"
              className="inline-block bg-[#0066CC] text-white px-6 py-2 rounded-lg hover:bg-[#0052a3] transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Order #{order.order_no}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#0066CC]">
                      €{Number(order.grand_total || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {order.store_orders.length} store{order.store_orders.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.store_orders.map((storeOrder) => (
                    <Link
                      key={storeOrder.id}
                      href={`/store-orders/${storeOrder.id}`}
                      className="block border border-gray-200 rounded-lg p-4 hover:border-[#0066CC] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{storeOrder.store.name}</p>
                          <p className="text-sm text-gray-600">
                            {storeOrder.items.length} item{storeOrder.items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                              storeOrder.status
                            )}`}
                          >
                            {storeOrder.status.replace('_', ' ')}
                          </span>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            €{Number(storeOrder.total || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <Link
                  href={`/orders/${order.id}`}
                  className="mt-4 inline-block text-[#0066CC] hover:underline text-sm font-medium"
                >
                  View Order Details →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

