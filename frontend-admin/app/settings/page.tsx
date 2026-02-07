'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { adminService } from '@/services/admin-service';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSettings();
      setSettings(data);
    } catch (error) {
      showToast('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await adminService.updateSettings(settings);
      showToast('success', 'Settings updated successfully');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center text-white/70 py-12">Loading settings...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/70">Platform configuration</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSave} className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">General Settings</h2>
            <Input
              label="Platform Name"
              value={settings.platform_name || ''}
              onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
            />
            <Input
              label="Platform Email"
              type="email"
              value={settings.platform_email || ''}
              onChange={(e) => setSettings({ ...settings, platform_email: e.target.value })}
            />
            <Input
              label="Currency"
              value={settings.currency || 'EUR'}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
            />

            <h2 className="text-xl font-bold text-white mt-8 mb-4">Points System</h2>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="points_enabled"
                checked={settings.points_enabled || false}
                onChange={(e) => setSettings({ ...settings, points_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="points_enabled" className="text-sm text-white/90">Enable Points System</label>
            </div>
            <Input
              label="Points Per Euro"
              type="number"
              step="0.01"
              value={settings.points_per_euro || 1}
              onChange={(e) => setSettings({ ...settings, points_per_euro: parseFloat(e.target.value) })}
            />
            <Input
              label="Points Redemption Rate (points per €1)"
              type="number"
              step="0.01"
              value={settings.points_redemption_rate || 100}
              onChange={(e) => setSettings({ ...settings, points_redemption_rate: parseFloat(e.target.value) })}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
