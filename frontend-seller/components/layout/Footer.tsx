'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="w-full px-2 sm:px-3 lg:px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-4">Seller Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link href="/orders" className="hover:text-white transition-colors">Orders</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">Products</Link></li>
              <li><Link href="/store" className="hover:text-white transition-colors">Store Settings</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Marketing Tools</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/promotions" className="hover:text-white transition-colors">Promotions</Link></li>
              <li><Link href="/announcements" className="hover:text-white transition-colors">Announcements</Link></li>
              <li><Link href="/banners" className="hover:text-white transition-colors">Banners</Link></li>
              <li><Link href="/subscriptions" className="hover:text-white transition-colors">Subscriptions</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/seller-agreement" className="hover:text-white transition-colors">Seller Agreement</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} OpticalMarket Seller Portal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

