'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { userService, type User } from '@/services/user-service';

export default function UserDetailsPage() {
  const params = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadUser();
    }
  }, [params.id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const data = await userService.getOne(Number(params.id));
      setUser(data);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center text-white/70 py-12">User not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Details</h1>
          <p className="text-white/70">View user information</p>
        </div>

        <GlassCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{user.name}</h2>
              <Badge variant={user.role === 'admin' ? 'info' : user.role === 'seller' ? 'success' : 'default'}>
                {user.role}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/70 mb-1">Email</p>
                <p className="text-white">{user.email}</p>
              </div>
              {user.phone && (
                <div>
                  <p className="text-sm text-white/70 mb-1">Phone</p>
                  <p className="text-white">{user.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-white/70 mb-1">Created At</p>
                <p className="text-white">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
              {user.email_verified_at && (
                <div>
                  <p className="text-sm text-white/70 mb-1">Email Verified</p>
                  <p className="text-white">{new Date(user.email_verified_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
