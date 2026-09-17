import apiClient from '@/lib/api-client';
export type AdminSupportTicket = { id:number; ticket_no:string; subject:string; category:string; priority:string; status:string; description:string; user_role?:string; user_unread_count?:number; admin_unread_count?:number; created_at:string; updated_at:string; messages?:any[]; user?:any; order?:any; store?:any; product?:any; events?:any[] };
export const adminSupportService = {
  async list(params?:any) { const r=await apiClient.get('/admin/support/tickets',{params}); return r.data.data as {tickets:AdminSupportTicket[];pagination:any}; },
  async show(id:number) { const r=await apiClient.get(`/admin/support/tickets/${id}`); return r.data.data.ticket as AdminSupportTicket; },
  async reply(id:number,data:FormData|Record<string,any>) { const r=await apiClient.post(`/admin/support/tickets/${id}/messages`,data,data instanceof FormData?{headers:{'Content-Type':'multipart/form-data'}}:undefined); return r.data.data.message; },
  async update(id:number,data:any) { const r=await apiClient.put(`/admin/support/tickets/${id}`,data); return r.data.data.ticket as AdminSupportTicket; },
};
