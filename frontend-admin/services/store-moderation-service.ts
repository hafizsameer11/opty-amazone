import apiClient from '@/lib/api-client';

export interface AdminStoreChatConversation {
  id: number;
  store_id: number;
  store?: { id: number; name: string } | null;
  admin_unread_count: number;
  seller_unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
}

export interface AdminStoreChatMessage {
  id: number;
  admin_store_chat_conversation_id: number;
  sender_id: number;
  sender_role: 'admin' | 'seller' | string;
  body: string;
  attachment_path?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  created_at: string;
  sender?: { id: number; name: string } | null;
}

export interface StoreReportRow {
  id: number;
  store_id?: number;
  reason: string;
  details?: string | null;
  status: StoreReportStatus | string;
  evidence_urls?: string[];
  admin_notes?: string | null;
  store?: { id: number; name: string; status?: string; is_active?: boolean } | null;
  buyer?: { id: number; name: string; email?: string } | null;
  created_at: string;
  reviewed_at?: string | null;
}

export type StoreReportStatus =
  | 'submitted'
  | 'under_review'
  | 'waiting_for_customer_response'
  | 'waiting_for_seller_response'
  | 'resolved'
  | 'rejected'
  | 'closed';

export const STORE_REPORT_STATUSES: { value: StoreReportStatus; label: string }[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'waiting_for_customer_response', label: 'Waiting for Customer Response' },
  { value: 'waiting_for_seller_response', label: 'Waiting for Seller Response' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'closed', label: 'Closed' },
];

export const adminChatService = {
  async listConversations(page = 1, perPage = 30) {
    const res = await apiClient.get('/admin/store-chat/conversations', {
      params: { page, per_page: perPage },
    });
    return res.data.data as {
      conversations: AdminStoreChatConversation[];
      pagination: { current_page: number; last_page: number; total: number };
    };
  },

  async unreadCount(): Promise<number> {
    const res = await apiClient.get('/admin/store-chat/unread-count');
    return Number(res.data?.data?.messages) || 0;
  },

  async startConversation(storeId: number) {
    const res = await apiClient.post('/admin/store-chat/conversations', { store_id: storeId });
    return res.data.data as { conversation: AdminStoreChatConversation };
  },

  async getConversation(id: number) {
    const res = await apiClient.get(`/admin/store-chat/conversations/${id}`);
    return res.data.data as {
      conversation: AdminStoreChatConversation;
      messages: AdminStoreChatMessage[];
    };
  },

  async pollMessages(id: number, afterId: number) {
    const res = await apiClient.get(`/admin/store-chat/conversations/${id}/messages`, {
      params: { after_id: afterId },
    });
    return (res.data.data.messages ?? []) as AdminStoreChatMessage[];
  },

  async sendMessage(id: number, body: string, attachment?: File | null) {
    if (attachment) {
      const form = new FormData();
      if (body) form.append('body', body);
      form.append('attachment', attachment);
      const res = await apiClient.post(`/admin/store-chat/conversations/${id}/messages`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data.message as AdminStoreChatMessage;
    }
    const res = await apiClient.post(`/admin/store-chat/conversations/${id}/messages`, { body });
    return res.data.data.message as AdminStoreChatMessage;
  },
};

export const adminReportService = {
  async list(params?: { status?: string; page?: number; per_page?: number }) {
    const res = await apiClient.get('/admin/store-reports', { params });
    return res.data.data as {
      reports: StoreReportRow[];
      pagination: { current_page: number; last_page: number; total: number };
      statuses?: string[];
    };
  },

  async show(id: number) {
    const res = await apiClient.get(`/admin/store-reports/${id}`);
    return res.data.data.report as StoreReportRow;
  },

  async updateStatus(id: number, status: StoreReportStatus | string, admin_notes?: string) {
    const res = await apiClient.post(`/admin/store-reports/${id}/status`, {
      status,
      admin_notes,
    });
    return res.data.data.report as StoreReportRow;
  },

  async markReviewed(id: number, admin_notes?: string) {
    return this.updateStatus(id, 'resolved', admin_notes);
  },
};
