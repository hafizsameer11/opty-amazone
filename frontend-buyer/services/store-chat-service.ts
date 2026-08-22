import apiClient, { getApiOrigin } from '@/lib/api-client';

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

export interface StoreChatConversation {
  id: number;
  store_id: number;
  buyer_unread_count: number;
  seller_unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
}

function resolveAttachmentUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = getApiOrigin();
  return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
}

export const storeChatService = {
  resolveAttachmentUrl,

  async getChat(storeId: number): Promise<{
    conversation: StoreChatConversation;
    messages: StoreChatMessage[];
  }> {
    const res = await apiClient.get(`/buyer/stores/${storeId}/chat`);
    return res.data.data;
  },

  async pollNewMessages(storeId: number, afterId: number): Promise<StoreChatMessage[]> {
    const res = await apiClient.get(`/buyer/stores/${storeId}/chat/messages`, {
      params: { after_id: afterId },
    });
    return res.data.data.messages ?? [];
  },

  async sendMessage(storeId: number, body: string, attachment?: File | null): Promise<StoreChatMessage> {
    if (attachment) {
      const form = new FormData();
      if (body) form.append('body', body);
      form.append('attachment', attachment);
      const res = await apiClient.post(`/buyer/stores/${storeId}/chat/messages`, form);
      return res.data.data.message;
    }
    const res = await apiClient.post(`/buyer/stores/${storeId}/chat/messages`, { body });
    return res.data.data.message;
  },
};
