'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import AdminLayout from '@/components/layout/AdminLayout';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Admin panel error:', error);
  }, [error]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Something went wrong!</h2>
          <p className="text-white/70 mb-8">{error.message || 'An unexpected error occurred'}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={reset}>Try Again</Button>
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
