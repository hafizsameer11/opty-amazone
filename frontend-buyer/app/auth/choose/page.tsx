'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function RegisterChoosePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <Image src="/vistaexpress-logo.png" alt="VistaExpress" width={280} height={120} className="mx-auto h-16 w-auto object-contain mb-4" priority />
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-600 mt-2">Choose how you want to use VistaExpress</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/auth/register/buyer"
            className="block bg-white rounded-2xl border-2 border-blue-100 p-8 shadow-lg hover:border-[#0066CC] hover:shadow-xl transition-all"
          >
            <div className="text-4xl mb-4">🛒</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">I want to shop</h2>
            <p className="text-sm text-gray-600">Browse glasses, lenses, and eye care. Track orders and prescriptions.</p>
          </Link>

          <a
            href="https://seller.vistaexpress.it/auth/register"
            className="block bg-white rounded-2xl border-2 border-green-100 p-8 shadow-lg hover:border-[#00CC66] hover:shadow-xl transition-all"
          >
            <div className="text-4xl mb-4">🏪</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">I want to sell</h2>
            <p className="text-sm text-gray-600">Open your optical store, list products, and manage orders on the seller dashboard.</p>
          </a>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-[#0066CC] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
