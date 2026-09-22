'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import { adminService } from '@/services/admin-service';
import { useToast } from '@/components/ui/Toast';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';

type ActivityLog = {
  id: number | string;
  created_at: string;
  admin?: { name?: string } | null;
  action?: string;
  resource_type?: string | null;
  success?: boolean;
};

export default function ActivityLogsPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await adminService.getActivityLogs({ per_page: 50 });
      const page = response?.data;
      setLogs(Array.isArray(page?.data) ? page.data : Array.isArray(page) ? page : []);
    } catch {
      showToast('error', t('failedLoadActivityLogs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadLogs(); }, []);
  useLiveRefresh(loadLogs);

  const enumLabel = (value?: string | null) => {
    if (!value) return t('notAvailable');
    const actionKey = `action_${value.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    const status = statusKey(value);
    const action = t(actionKey);
    if (action !== actionKey) return action;
    const translatedStatus = t(status);
    return translatedStatus !== status ? translatedStatus : value.replaceAll('_', ' ');
  };

  const columns = [
    { key: 'created_at', header: t('date'), render: (log: ActivityLog) => <span className="text-slate-900">{new Date(log.created_at).toLocaleString()}</span> },
    { key: 'admin', header: t('admin'), render: (log: ActivityLog) => <span className="text-slate-900">{log.admin?.name || t('system')}</span> },
    { key: 'action', header: t('actions'), sortable: true, render: (log: ActivityLog) => <span className="text-slate-900">{enumLabel(log.action)}</span> },
    { key: 'resource_type', header: t('resource'), render: (log: ActivityLog) => <span className="text-slate-900">{enumLabel(log.resource_type)}</span> },
    { key: 'success', header: t('status'), render: (log: ActivityLog) => <Badge variant={log.success ? 'success' : 'error'}>{log.success ? t('success') : t('failed')}</Badge> },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div><h1 className="mb-2 text-3xl font-bold text-slate-900">{t('activityLogs')}</h1><p className="text-slate-500">{t('activityLogsDescription')}</p></div>
        <GlassCard><DataTable data={logs} columns={columns} loading={loading} keyExtractor={(log) => log.id} /></GlassCard>
      </div>
    </AdminLayout>
  );
}
