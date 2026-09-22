'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import { getAxiosErrorMessage } from '@/lib/api-client';
import { getFullImageUrl } from '@/lib/image-utils';
import {
  storeChatService,
  type StoreChatMessage,
} from '@/services/store-chat-service';
import { orderService } from '@/services/order-service';

interface StoreChatPanelProps {
  storeId: number;
  storeName: string;
}

export default function StoreChatPanel({ storeId, storeName }: StoreChatPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<StoreChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [deliveryPrompt, setDeliveryPrompt] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, []);

  const loadChat = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'buyer') return;
    setLoading(true);
    setError(null);
    try {
      const data = await storeChatService.getChat(storeId);
      const list = data.messages || [];
      setMessages(list);
      lastMessageIdRef.current = list.length ? Math.max(...list.map((m) => m.id)) : 0;
      scrollToBottom();
    } catch (e) {
      setError(getAxiosErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role, storeId, scrollToBottom]);

  const refreshChatSilent = useCallback(async () => {
    try {
      const data = await storeChatService.getChat(storeId);
      const list = data.messages || [];
      setMessages(list);
      lastMessageIdRef.current = list.length ? Math.max(...list.map((m) => m.id)) : 0;
      scrollToBottom();
    } catch {
      // ignore background refresh errors
    }
  }, [storeId, scrollToBottom]);

  useEffect(() => {
    if (open && isAuthenticated && user?.role === 'buyer') {
      void loadChat();
    }
  }, [open, isAuthenticated, user?.role, loadChat]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'buyer' || searchParams.get('chat') !== '1') return;
    setOpen(true);
  }, [isAuthenticated, searchParams, user?.role]);

  useEffect(() => {
    const orderId = Number(searchParams.get('delivery_order_id'));
    if (!isAuthenticated || user?.role !== 'buyer' || !Number.isFinite(orderId) || orderId <= 0) return;

    void orderService.getStoreOrder(orderId).then((order) => {
      if (Number(order.store_id) !== Number(storeId) || !order.delivery_code) return;
      setDraft(`Delivery confirmation code for order #${order.id}: ${order.delivery_code}`);
      setDeliveryPrompt(true);
    }).catch(() => {
      // The notification still opens the correct chat if the order has expired.
    });
  }, [isAuthenticated, searchParams, storeId, user?.role]);

  useEffect(() => {
    if (!open || !isAuthenticated || user?.role !== 'buyer') {
      return;
    }
    const t = setInterval(async () => {
      try {
        const after = lastMessageIdRef.current;
        if (!after) {
          await refreshChatSilent();
          return;
        }
        const next = await storeChatService.pollNewMessages(storeId, after);
        if (next.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const m of next) {
              if (!ids.has(m.id)) merged.push(m);
            }
            lastMessageIdRef.current = Math.max(...merged.map((m) => m.id));
            return merged;
          });
          scrollToBottom();
        }
      } catch {
        // ignore transient poll errors
      }
    }, 5000);
    return () => clearInterval(t);
  }, [open, isAuthenticated, user?.role, storeId, scrollToBottom, refreshChatSilent]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const loginHref = `/auth/login?redirect=${encodeURIComponent(pathname || `/stores/${storeId}`)}`;

  const handleSend = async () => {
    const text = draft.trim();
    if ((!text && !file) || sending) return;
    setSending(true);
    setError(null);
    try {
      const msg = await storeChatService.sendMessage(storeId, text, file);
      setDraft('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const merged = [...prev, msg];
        lastMessageIdRef.current = Math.max(...merged.map((m) => m.id));
        return merged;
      });
      scrollToBottom();
    } catch (e) {
      setError(getAxiosErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Message the store</h3>
            <p className="text-sm text-gray-600 mt-1">
              Sign in to chat with <span className="font-medium">{storeName}</span> about products or orders.
            </p>
          </div>
          <Link
            href={loginHref}
            className="inline-flex items-center justify-center font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 shadow-sm hover:shadow-md bg-[#0066CC] text-white hover:bg-[#0052a3] focus:ring-blue-300 active:bg-[#004080] px-5 py-2.5 text-base shrink-0"
          >
            Sign in to chat
          </Link>
        </div>
      </div>
    );
  }

  if (user?.role !== 'buyer') {
    return (
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">
          Only buyer accounts can message stores. You are signed in as a {user?.role ?? 'user'}.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 sm:px-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#0066CC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="font-semibold text-gray-900">Chat with store</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="text-xs text-gray-500 pt-3 pb-2">
            Messages are between you and {storeName}. Replies appear here and in the seller&apos;s inbox.
          </p>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">{error}</p>
          )}
          {deliveryPrompt && (
            <p className="mb-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              The seller requested your delivery confirmation code. Review the prepared message below and send it to the seller.
            </p>
          )}
          <div
            ref={listRef}
            className="h-56 sm:h-64 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2 mb-3"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-500">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-gray-500 text-center px-4">
                No messages yet. Say hello to the seller.
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === user?.id;
                const attachmentUrl = m.attachment_url ? getFullImageUrl(m.attachment_url) : null;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? 'bg-[#0066CC] text-white rounded-br-md' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                      }`}
                    >
                      {!mine && m.sender?.name && (
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">
                          {m.sender.name}
                        </p>
                      )}
                      {m.body && m.body !== '[Attachment]' && (
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      )}
                      {attachmentUrl && m.attachment_type === 'image' && (
                        <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={attachmentUrl}
                            alt={m.attachment_name || 'Attachment'}
                            className="max-h-40 rounded-lg"
                          />
                        </a>
                      )}
                      {attachmentUrl && m.attachment_type !== 'image' && (
                        <a
                          href={attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-1 inline-flex text-xs underline ${mine ? 'text-blue-100' : 'text-[#0066CC]'}`}
                        >
                          {m.attachment_name || 'Download file'}
                        </a>
                      )}
                      <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex flex-col gap-2">
            {file && (
              <p className="text-xs text-gray-600">
                Attached: {file.name}{' '}
                <button type="button" className="text-red-600 underline" onClick={() => setFile(null)}>
                  Remove
                </button>
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a message…"
                rows={2}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#0066CC]/30 focus:border-[#0066CC] outline-none resize-none"
                maxLength={5000}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <div className="flex sm:flex-col gap-2 sm:self-end shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={sending}>
                  File
                </Button>
                <Button
                  variant="primary"
                  disabled={sending || (!draft.trim() && !file)}
                  onClick={() => void handleSend()}
                >
                  {sending ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
