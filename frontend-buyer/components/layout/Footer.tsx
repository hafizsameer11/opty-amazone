'use client';

import Link from 'next/link';

export default function Footer() {
  return (
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
}
