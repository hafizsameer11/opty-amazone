import apiClient from '@/lib/api-client';

export type SupportTicketStatus = 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportTicketCategory = 'order' | 'payment' | 'shipping' | 'refund' | 'product' | 'account' | 'seller_store' | 'technical' | 'other';

export type SupportMessage = { id: number; body: string; sender_role: string; sender?: { id: number; name: string } | null; attachment_url?: string | null; attachment_name?: string | null; created_at: string; is_internal?: boolean };
export type SupportTicketEvent = { id: number; type?: string; event?: string; created_at: string; actor?: { id: number; name: string } | null };
export type SupportTicket = { id: number; ticket_no: string; subject: string; category: SupportTicketCategory; priority: SupportTicketPriority; status: SupportTicketStatus; description: string; user_unread_count?: number; admin_unread_count?: number; created_at: string; updated_at: string; messages?: SupportMessage[]; order?: { id: number; order_no?: string } | null; store?: { id: number; name?: string } | null; product?: { id: number; name?: string } | null; events?: SupportTicketEvent[] };
export type TicketPagination = { current_page: number; last_page: number; per_page: number; total: number };
export type TicketFilters = { status?: SupportTicketStatus | ''; category?: SupportTicketCategory | ''; priority?: SupportTicketPriority | ''; per_page?: number };
type TicketPayload = FormData | Record<string, string | number | undefined>;

const requestConfig = (data: TicketPayload) => data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;

export const supportService = {
  async list(params?: TicketFilters) { const response = await apiClient.get('/buyer/support/tickets', { params }); return response.data.data as { tickets: SupportTicket[]; pagination: TicketPagination }; },
  async create(data: TicketPayload) { const response = await apiClient.post('/buyer/support/tickets', data, requestConfig(data)); return response.data.data.ticket as SupportTicket; },
  async show(id: number) { const response = await apiClient.get(`/buyer/support/tickets/${id}`); return response.data.data.ticket as SupportTicket; },
  async reply(id: number, data: TicketPayload) { const response = await apiClient.post(`/buyer/support/tickets/${id}/messages`, data, requestConfig(data)); return response.data.data.message as SupportMessage; },
  async close(id: number) { const response = await apiClient.post(`/buyer/support/tickets/${id}/close`); return response.data.data.ticket as SupportTicket; },
  async reopen(id: number) { const response = await apiClient.post(`/buyer/support/tickets/${id}/reopen`); return response.data.data.ticket as SupportTicket; },
};
