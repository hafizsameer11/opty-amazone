'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { adminService } from '@/services/admin-service';
import { useToast } from '@/components/ui/Toast';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

type AdminSettings = {
  platform_name?: string;
  platform_email?: string;
  currency?: string;
  points_enabled?: boolean;
  points_per_euro?: number;
  points_redemption_rate?: number;
};

export default function SettingsPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AdminSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setSettings(await adminService.getSettings());
    } catch {
      showToast('error', t('failedLoadSettings'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSettings(); }, []);
  useLiveRefresh(loadSettings);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await adminService.updateSettings(settings);
      showToast('success', t('settingsUpdated'));
    } catch {
      showToast('error', t('failedUpdateSettings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLayout><div className="py-12 text-center text-slate-500">{t('loadingSettings')}</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div><h1 className="mb-2 text-3xl font-bold text-slate-900">{t('settings')}</h1><p className="text-slate-500">{t('settingsDescription')}</p></div>
        <GlassCard>
          <form onSubmit={handleSave} className="space-y-6">
            <h2 className="mb-4 text-xl font-bold text-slate-900">{t('generalSettings')}</h2>
            <Input label={t('platformName')} value={settings.platform_name || ''} onChange={(event) => setSettings({ ...settings, platform_name: event.target.value })} />
            <Input label={t('platformEmail')} type="email" value={settings.platform_email || ''} onChange={(event) => setSettings({ ...settings, platform_email: event.target.value })} />
            <Input label={t('currency')} value={settings.currency || 'EUR'} onChange={(event) => setSettings({ ...settings, currency: event.target.value })} />
            <h2 className="mb-4 mt-8 text-xl font-bold text-slate-900">{t('pointsSystem')}</h2>
            <div className="mb-4 flex items-center gap-2"><input type="checkbox" id="points_enabled" checked={settings.points_enabled || false} onChange={(event) => setSettings({ ...settings, points_enabled: event.target.checked })} className="h-4 w-4" /><label htmlFor="points_enabled" className="text-sm text-slate-700">{t('enablePointsSystem')}</label></div>
            <Input label={t('pointsPerEuro')} type="number" step="0.01" value={settings.points_per_euro || 1} onChange={(event) => setSettings({ ...settings, points_per_euro: parseFloat(event.target.value) })} />
            <Input label={t('redemptionRate')} type="number" step="0.01" value={settings.points_redemption_rate || 100} onChange={(event) => setSettings({ ...settings, points_redemption_rate: parseFloat(event.target.value) })} />
            <div className="flex justify-end pt-4"><Button type="submit" disabled={saving}>{saving ? t('saving') : t('saveSettings')}</Button></div>
          </form>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
