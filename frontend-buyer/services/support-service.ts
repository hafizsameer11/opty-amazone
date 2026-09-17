import apiClient from '@/lib/api-client';
export type SupportTicket = { id:number; ticket_no:string; subject:string; category:string; priority:string; status:string; description:string; user_unread_count?:number; admin_unread_count?:number; created_at:string; updated_at:string; messages?: SupportMessage[]; user?:any; order?:any; store?:any; product?:any; events?:any[] };
export type SupportMessage = { id:number; body:string; sender_role:string; sender?:{id:number;name:string}; attachment_url?:string|null; attachment_name?:string|null; created_at:string; is_internal?:boolean };
export const supportService = {
  async list(params?:any) { const r=await apiClient.get('/buyer/support/tickets',{params}); return r.data.data as {tickets:SupportTicket[];pagination:any}; },
  async create(data:FormData|Record<string,any>) { const r=await apiClient.post('/buyer/support/tickets',data,data instanceof FormData?{headers:{'Content-Type':'multipart/form-data'}}:undefined); return r.data.data.ticket as SupportTicket; },
  async show(id:number) { const r=await apiClient.get(`/buyer/support/tickets/${id}`); return r.data.data.ticket as SupportTicket; },
  async reply(id:number, data:FormData|Record<string,any>) { const r=await apiClient.post(`/buyer/support/tickets/${id}/messages`,data,data instanceof FormData?{headers:{'Content-Type':'multipart/form-data'}}:undefined); return r.data.data.message as SupportMessage; },
  async close(id:number) { await apiClient.post(`/buyer/support/tickets/${id}/close`); },
  async reopen(id:number) { await apiClient.post(`/buyer/support/tickets/${id}/reopen`); },
};
