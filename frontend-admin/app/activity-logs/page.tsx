'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { adminService } from '@/services/admin-service';
import { useToast } from '@/components/ui/Toast';

export default function ActivityLogsPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await adminService.getActivityLogs();
      setLogs(data.data || []);
    } catch (error) {
      showToast('error', 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'created_at',
      header: 'Date',
      render: (log: any) => (
        <span className="text-white">{new Date(log.created_at).toLocaleString()}</span>
      ),
    },
    {
      key: 'admin',
      header: 'Admin',
      render: (log: any) => (
        <span className="text-white">{log.admin?.name || 'System'}</span>
      ),
    },
    { key: 'action', header: 'Action', sortable: true },
    {
      key: 'resource_type',
      header: 'Resource',
      render: (log: any) => (
        <span className="text-white">{log.resource_type || 'N/A'}</span>
      ),
    },
    {
      key: 'success',
      header: 'Status',
      render: (log: any) => (
        <Badge variant={log.success ? 'success' : 'error'}>
          {log.success ? 'Success' : 'Failed'}
        </Badge>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Activity Logs</h1>
          <p className="text-white/70">View all admin activities</p>
        </div>

        <GlassCard>
          <DataTable
            data={logs}
            columns={columns}
            loading={loading}
            keyExtractor={(log) => log.id}
          />
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
