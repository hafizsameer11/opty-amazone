import apiClient from '@/lib/api-client';
export type SellerSupportTicket = { id:number; ticket_no:string; subject:string; category:string; priority:string; status:string; description:string; user_unread_count?:number; admin_unread_count?:number; created_at:string; updated_at:string; messages?:any[]; user?:any; order?:any; store?:any; product?:any; events?:any[] };
export const supportService = {
  async list(params?:any) { const r=await apiClient.get('/seller/support/tickets',{params}); return r.data.data as {tickets:SellerSupportTicket[];pagination:any}; },
  async create(data:FormData|Record<string,any>) { const r=await apiClient.post('/seller/support/tickets',data,data instanceof FormData?{headers:{'Content-Type':'multipart/form-data'}}:undefined); return r.data.data.ticket as SellerSupportTicket; },
  async show(id:number) { const r=await apiClient.get(`/seller/support/tickets/${id}`); return r.data.data.ticket as SellerSupportTicket; },
  async reply(id:number,data:FormData|Record<string,any>) { const r=await apiClient.post(`/seller/support/tickets/${id}/messages`,data,data instanceof FormData?{headers:{'Content-Type':'multipart/form-data'}}:undefined); return r.data.data.message; },
  async close(id:number) { await apiClient.post(`/seller/support/tickets/${id}/close`); },
  async reopen(id:number) { await apiClient.post(`/seller/support/tickets/${id}/reopen`); },
};
