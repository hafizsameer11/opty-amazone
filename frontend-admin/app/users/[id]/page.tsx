'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { userService, type User } from '@/services/user-service';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

export default function UserDetailsPage() {
  const { t } = useLanguage();
  const params = useParams();
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
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

  useLiveRefresh(loadUser, Boolean(params.id));

  const handleToggleBlock = async () => {
    if (!user) return;
    if (authUser?.id === user.id) {
      showToast('error', t('cannotBlockSelf'));
      return;
    }
    try {
      await userService.toggleStatus(user.id);
      showToast('success', user.is_blocked ? t('userUnblocked') : t('userBlocked'));
      loadUser();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', t('failedUpdateUser'));
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
        <div className="text-center text-slate-500 py-12">{t('userNotFound')}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('userDetails')}</h1>
            <p className="text-slate-500">{user.name}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleToggleBlock}
            disabled={authUser?.id === user.id}
          >
            {user.is_blocked ? t('unblockAccount') : t('blockAccount')}
          </Button>
        </div>

        <GlassCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-bold text-slate-900">{t('profile')}</h2>
              <div className="flex gap-2">
                <Badge variant={user.role === 'admin' ? 'info' : user.role === 'seller' ? 'success' : 'default'}>
                  {t(user.role === 'buyer' ? 'buyer' : user.role === 'seller' ? 'seller' : 'admin')}
                </Badge>
                <Badge variant={user.is_blocked ? 'error' : 'success'}>
                  {user.is_blocked ? t('blocked') : t('active')}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('email')}</p>
                <p className="text-slate-900">{user.email}</p>
              </div>
              {user.phone && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t('phone')}</p>
                  <p className="text-slate-900">{user.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('created')}</p>
                <p className="text-slate-900">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
              {user.email_verified_at && (
                <div>
                  <p className="text-sm text-slate-500 mb-1">{t('emailVerified')}</p>
                  <p className="text-slate-900">{new Date(user.email_verified_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
