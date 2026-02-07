'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import AdminLayout from '@/components/layout/AdminLayout';

export default function NotFound() {
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-white/90 mb-4">Page Not Found</h2>
          <p className="text-white/70 mb-8">The page you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
