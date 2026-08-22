'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  adminChatService,
  type AdminStoreChatConversation,
  type AdminStoreChatMessage,
} from '@/services/store-moderation-service';
import { sellerService, type Seller } from '@/services/seller-service';

function MessageBubble({
  mine,
  body,
  attachmentUrl,
  attachmentType,
  attachmentName,
  senderName,
  createdAt,
}: {
  mine: boolean;
  body?: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  senderName?: string | null;
  createdAt: string;
}) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          mine ? 'bg-[#0066CC] text-white rounded-br-md' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
        }`}
      >
        {!mine && senderName && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">{senderName}</p>
        )}
        {body && body !== '[Attachment]' && <p className="whitespace-pre-wrap break-words">{body}</p>}
        {attachmentUrl && attachmentType === 'image' && (
          <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachmentUrl} alt={attachmentName || 'Attachment'} className="max-h-40 rounded-lg" />
          </a>
        )}
        {attachmentUrl && attachmentType !== 'image' && (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-1 inline-flex text-xs underline ${mine ? 'text-blue-100' : 'text-[#0066CC]'}`}
          >
            {attachmentName || 'Download file'}
          </a>
        )}
        <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
          {new Date(createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<AdminStoreChatConversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<AdminStoreChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [newStoreId, setNewStoreId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef(0);

  const scrollThread = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const data = await adminChatService.listConversations(1, 50);
      setConversations(data.conversations || []);
    } catch {
      setError('Could not load conversations.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    void sellerService.getAll({ per_page: 200 }).then((response) => {
      const rows = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      setSellers(rows as Seller[]);
    }).catch(() => {});
  }, [loadConversations]);

  const loadThread = useCallback(async (conversationId: number) => {
    setThreadLoading(true);
    setError(null);
    try {
      const data = await adminChatService.getConversation(conversationId);
      setThread(data.messages || []);
      lastMessageIdRef.current = data.messages?.length
        ? data.messages[data.messages.length - 1].id
        : 0;
      setTimeout(scrollThread, 50);
      void loadConversations();
    } catch {
      setError('Could not load messages.');
    } finally {
      setThreadLoading(false);
    }
  }, [loadConversations, scrollThread]);

  useEffect(() => {
    if (selectedId) {
      void loadThread(selectedId);
    } else {
      setThread([]);
    }
  }, [selectedId, loadThread]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setInterval(async () => {
      try {
        const newMsgs = await adminChatService.pollMessages(selectedId, lastMessageIdRef.current);
        if (newMsgs.length) {
          setThread((prev) => [...prev, ...newMsgs]);
          lastMessageIdRef.current = newMsgs[newMsgs.length - 1].id;
          setTimeout(scrollThread, 50);
          void loadConversations();
        }
      } catch {
        /* ignore poll errors */
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadConversations, scrollThread]);

  const handleSend = async () => {
    if (!selectedId || sending) return;
    if (!draft.trim() && !file) return;
    setSending(true);
    setError(null);
    try {
      const msg = await adminChatService.sendMessage(selectedId, draft.trim(), file);
      setThread((prev) => [...prev, msg]);
      lastMessageIdRef.current = msg.id;
      setDraft('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(scrollThread, 50);
      void loadConversations();
    } catch {
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleStartConversation = async () => {
    if (!newStoreId) return;
    setError(null);
    try {
      const data = await adminChatService.startConversation(Number(newStoreId));
      await loadConversations();
      setSelectedId(data.conversation.id);
      setNewStoreId('');
    } catch {
      setError('Could not start conversation with that seller.');
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-8rem)]">
        <div className="glass-card rounded-xl border border-white/20 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/10 space-y-3">
            <h3 className="font-semibold text-slate-900">Seller conversations</h3>
            <div className="flex gap-2">
              <select
                value={newStoreId}
                onChange={(e) => setNewStoreId(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm bg-white"
              >
                <option value="">Message a seller…</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={() => void handleStartConversation()} disabled={!newStoreId}>
                Start
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="p-6 flex justify-center"><LoadingSpinner /></div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/10 hover:bg-white/40 transition-colors ${
                    selectedId === c.id ? 'bg-white/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{c.store?.name || `Store #${c.store_id}`}</p>
                      <p className="text-xs text-slate-500 truncate">{c.last_message_preview || 'No messages yet'}</p>
                    </div>
                    {c.admin_unread_count > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center shrink-0">
                        {c.admin_unread_count > 9 ? '9+' : c.admin_unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl border border-white/20 overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Select a seller conversation
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-white/10">
                <h3 className="font-semibold text-slate-900">
                  {selectedConversation?.store?.name || `Store #${selectedConversation?.store_id}`}
                </h3>
              </div>
              <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                {threadLoading ? (
                  <div className="flex justify-center py-8"><LoadingSpinner /></div>
                ) : (
                  thread.map((m) => (
                    <MessageBubble
                      key={m.id}
                      mine={m.sender_role === 'admin'}
                      body={m.body}
                      attachmentUrl={m.attachment_url}
                      attachmentType={m.attachment_type}
                      attachmentName={m.attachment_name}
                      senderName={m.sender?.name}
                      createdAt={m.created_at}
                    />
                  ))
                )}
              </div>
              <div className="p-4 border-t border-white/10 space-y-2 bg-white/60">
                {error && <p className="text-sm text-red-600">{error}</p>}
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder="Type a message…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                  <Button type="button" onClick={() => void handleSend()} disabled={sending || (!draft.trim() && !file)}>
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
