import apiClient from '@/lib/api-client';

export interface StoreChatMessage {
  id: number;
  store_chat_conversation_id: number;
  sender_id: number;
  body: string;
  attachment_path?: string | null;
  attachment_type?: 'image' | 'file' | string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  created_at: string;
  sender?: { id: number; name: string } | null;
}

export interface SellerChatConversationListItem {
  id: number;
  store_id: number;
  buyer: { id: number; name: string; email?: string } | null;
  buyer_unread_count: number;
  seller_unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
}

export interface AdminChatMessage {
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

export const storeChatService = {
  async listConversations(page = 1, perPage = 30): Promise<{
    conversations: SellerChatConversationListItem[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    const res = await apiClient.get('/seller/chat/conversations', {
      params: { page, per_page: perPage },
    });
    return res.data.data;
  },

  async getConversation(conversationId: number): Promise<{
    conversation: SellerChatConversationListItem;
    messages: StoreChatMessage[];
  }> {
    const res = await apiClient.get(`/seller/chat/conversations/${conversationId}`);
    return res.data.data;
  },

  async pollNewMessages(conversationId: number, afterId: number): Promise<StoreChatMessage[]> {
    const res = await apiClient.get(`/seller/chat/conversations/${conversationId}/messages`, {
      params: { after_id: afterId },
    });
    return res.data.data.messages ?? [];
  },

  async sendMessage(conversationId: number, body: string, attachment?: File | null): Promise<StoreChatMessage> {
    if (attachment) {
      const form = new FormData();
      if (body) form.append('body', body);
      form.append('attachment', attachment);
      const res = await apiClient.post(`/seller/chat/conversations/${conversationId}/messages`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data.message;
    }
    const res = await apiClient.post(`/seller/chat/conversations/${conversationId}/messages`, { body });
    return res.data.data.message;
  },

  async getAdminChat(): Promise<{
    conversation: {
      id: number;
      store_id: number;
      seller_unread_count: number;
      admin_unread_count: number;
      last_message_preview: string | null;
    };
    messages: AdminChatMessage[];
  }> {
    const res = await apiClient.get('/seller/admin-chat');
    return res.data.data;
  },

  async pollAdminMessages(afterId: number): Promise<AdminChatMessage[]> {
    const res = await apiClient.get('/seller/admin-chat/messages', {
      params: { after_id: afterId },
    });
    return res.data.data.messages ?? [];
  },

  async sendAdminMessage(body: string, attachment?: File | null): Promise<AdminChatMessage> {
    if (attachment) {
      const form = new FormData();
      if (body) form.append('body', body);
      form.append('attachment', attachment);
      const res = await apiClient.post('/seller/admin-chat/messages', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data.message;
    }
    const res = await apiClient.post('/seller/admin-chat/messages', { body });
    return res.data.data.message;
  },
};
