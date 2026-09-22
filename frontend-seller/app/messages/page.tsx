'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import { getAxiosErrorMessage } from '@/lib/api-client';
import {
  storeChatService,
  type AdminChatMessage,
  type SellerChatConversationListItem,
  type StoreChatMessage,
} from '@/services/store-chat-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t, language } = useLanguage();
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
            <img src={attachmentUrl} alt={attachmentName || t('messages.attachment')} className="max-h-40 rounded-lg" />
          </a>
        )}
        {attachmentUrl && attachmentType !== 'image' && (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-1 inline-flex text-xs underline ${mine ? 'text-blue-100' : 'text-[#0066CC]'}`}
          >
            {attachmentName || t('messages.downloadFile')}
          </a>
        )}
        <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
          {new Date(createdAt).toLocaleString(language === 'it' ? 'it-IT' : 'en-US')}
        </p>
      </div>
    </div>
  );
}

function MessagesPageContent() {
  const { isAuthenticated, loading, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'buyers' | 'admin'>('buyers');
  const [conversations, setConversations] = useState<SellerChatConversationListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [thread, setThread] = useState<StoreChatMessage[]>([]);
  const [adminThread, setAdminThread] = useState<AdminChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef(0);
  const lastAdminIdRef = useRef(0);
  const openedQueryConversationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setListLoading(true);
    setError(null);
    try {
      const data = await storeChatService.listConversations(1, 50);
      setConversations(data.conversations || []);
    } catch (e) {
      setError(getAxiosErrorMessage(e));
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadConversations();
    }
  }, [isAuthenticated, loadConversations]);

  useLiveRefresh(() => loadConversations(true), isAuthenticated, 5000);

  const scrollThread = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const openConversation = async (id: number) => {
    setSelectedId(id);
    setThreadLoading(true);
    setError(null);
    setDraft('');
    setFile(null);
    try {
      const data = await storeChatService.getConversation(id);
      const list = data.messages || [];
      setThread(list);
      lastMessageIdRef.current = list.length ? Math.max(...list.map((m) => m.id)) : 0;
      scrollThread();
      void loadConversations();
    } catch (e) {
      setError(getAxiosErrorMessage(e));
      setSelectedId(null);
      setThread([]);
    } finally {
      setThreadLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || mode !== 'buyers') return;
    const requestedId = Number(searchParams.get('conversation_id'));
    if (!Number.isFinite(requestedId) || requestedId <= 0) return;
    if (openedQueryConversationRef.current === requestedId) return;
    if (!conversations.some((conversation) => conversation.id === requestedId)) return;

    openedQueryConversationRef.current = requestedId;
    void openConversation(requestedId);
  }, [conversations, isAuthenticated, mode, searchParams]);

  const loadAdminChat = useCallback(async () => {
    setThreadLoading(true);
    setError(null);
    try {
      const data = await storeChatService.getAdminChat();
      const list = data.messages || [];
      setAdminThread(list);
      lastAdminIdRef.current = list.length ? Math.max(...list.map((m) => m.id)) : 0;
      scrollThread();
    } catch (e) {
      setError(getAxiosErrorMessage(e));
    } finally {
      setThreadLoading(false);
    }
  }, [scrollThread]);

  useEffect(() => {
    if (mode === 'admin' && isAuthenticated) {
      void loadAdminChat();
    }
  }, [mode, isAuthenticated, loadAdminChat]);

  useEffect(() => {
    if (!selectedId || !isAuthenticated || mode !== 'buyers') return;
    const t = setInterval(async () => {
      try {
        const after = lastMessageIdRef.current;
        if (!after) return;
        const next = await storeChatService.pollNewMessages(selectedId, after);
        if (next.length > 0) {
          setThread((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const m of next) {
              if (!ids.has(m.id)) merged.push(m);
            }
            lastMessageIdRef.current = Math.max(...merged.map((m) => m.id));
            return merged;
          });
          scrollThread();
        }
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(t);
  }, [selectedId, isAuthenticated, mode, scrollThread]);

  useEffect(() => {
    if (mode !== 'admin' || !isAuthenticated) return;
    const t = setInterval(async () => {
      try {
        const after = lastAdminIdRef.current;
        if (!after) {
          await loadAdminChat();
          return;
        }
        const next = await storeChatService.pollAdminMessages(after);
        if (next.length > 0) {
          setAdminThread((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            for (const m of next) {
              if (!ids.has(m.id)) merged.push(m);
            }
            lastAdminIdRef.current = Math.max(...merged.map((m) => m.id));
            return merged;
          });
          scrollThread();
        }
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(t);
  }, [mode, isAuthenticated, scrollThread, loadAdminChat]);

  useEffect(() => {
    scrollThread();
  }, [thread, adminThread, scrollThread]);

  const handleSend = async () => {
    if (sending) return;
    const text = draft.trim();
    if (!text && !file) return;

    setSending(true);
    setError(null);
    try {
      if (mode === 'admin') {
        const msg = await storeChatService.sendAdminMessage(text, file);
        setAdminThread((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const merged = [...prev, msg];
          lastAdminIdRef.current = Math.max(...merged.map((m) => m.id));
          return merged;
        });
      } else {
        if (!selectedId) return;
        const msg = await storeChatService.sendMessage(selectedId, text, file);
        setThread((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const merged = [...prev, msg];
          lastMessageIdRef.current = Math.max(...merged.map((m) => m.id));
          return merged;
        });
        void loadConversations();
      }
      setDraft('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      scrollThread();
    } catch (e) {
      setError(getAxiosErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('messages.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const composer = (
    <div className="shrink-0 border-t border-gray-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      {file && (
        <p className="text-xs text-gray-600">
          Attached: {file.name}{' '}
          <button type="button" className="text-red-600 underline" onClick={() => setFile(null)}>
            {t('messages.remove')}
          </button>
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={mode === 'admin' ? t('messages.adminPlaceholder') : t('messages.replyPlaceholder')}
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
            {t('messages.file')}
          </Button>
          <Button
            variant="primary"
            disabled={sending || (!draft.trim() && !file) || (mode === 'buyers' && !selectedId)}
            onClick={() => void handleSend()}
          >
            {sending ? t('messages.sending') : t('messages.send')}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="seller-message-page min-h-screen overflow-x-hidden bg-gray-50">
      <div className="flex min-w-0">
        <Sidebar />
        <div className="seller-message-layout flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
          <Header />
          <main className="seller-message-shell flex-1 min-h-[calc(100dvh-6.25rem)] min-w-0 overflow-hidden lg:min-h-0">
            <div className="min-h-[calc(100dvh-6.25rem)] flex flex-col py-4 lg:h-full lg:min-h-0 lg:py-6">
              <div className="mx-auto flex min-h-[calc(100dvh-6.25rem)] w-full max-w-7xl flex-col px-3 sm:px-6 lg:h-full lg:min-h-0 lg:px-8">
                <div className="shrink-0 mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('messages.title')}</h1>
                    <p className="text-gray-600 mt-1">{t('messages.subtitle')}</p>
                  </div>
                  <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white">
                    <button
                      type="button"
                      onClick={() => setMode('buyers')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                        mode === 'buyers' ? 'bg-[#0066CC] text-white' : 'text-gray-600'
                      }`}
                    >
                      {t('messages.buyers')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('admin')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                        mode === 'admin' ? 'bg-[#0066CC] text-white' : 'text-gray-600'
                      }`}
                    >
                      {t('messages.contactAdmin')}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                    {error}
                  </p>
                )}

                {mode === 'admin' ? (
                  <div className="flex-1 min-h-0 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="shrink-0 px-4 py-3 border-b border-gray-100 font-semibold text-gray-900">
                      {t('messages.contactAdmin')}
                    </div>
                    <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-gray-50">
                      {threadLoading ? (
                        <p className="text-sm text-gray-500 text-center py-12">{t('common.loading')}</p>
                      ) : adminThread.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-12">
                          {t('messages.adminEmpty')}
                        </p>
                      ) : (
                        adminThread.map((m) => (
                          <MessageBubble
                            key={m.id}
                            mine={m.sender_id === user?.id}
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
                    {composer}
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-0 lg:gap-4 lg:items-stretch">
                    <aside className={`w-full lg:w-80 shrink-0 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-none lg:max-h-none lg:h-full ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
                      <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('messages.conversations')}</p>
                      </div>
                      <div className="min-h-0 overflow-y-auto flex-1">
                        {listLoading ? (
                          <div className="p-6 text-center text-sm text-gray-500">{t('common.loading')}</div>
                        ) : conversations.length === 0 ? (
                          <div className="p-6 text-center text-sm text-gray-500">
                            No conversations yet. When a signed-in buyer messages your store, it will appear here.
                          </div>
                        ) : (
                          <ul className="divide-y divide-gray-100">
                            {conversations.map((c) => (
                              <li key={c.id}>
                                <button
                                  type="button"
                                  onClick={() => void openConversation(c.id)}
                                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                    selectedId === c.id ? 'bg-[#0066CC]/5 border-l-4 border-l-[#0066CC]' : ''
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-gray-900 truncate">{c.buyer?.name || t('messages.buyers')}</p>
                                    {c.seller_unread_count > 0 && (
                                      <span className="shrink-0 text-[10px] font-bold text-white bg-[#0066CC] rounded-full min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center">
                                        {c.seller_unread_count > 9 ? '9+' : c.seller_unread_count}
                                      </span>
                                    )}
                                  </div>
                                  {c.last_message_preview && (
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.last_message_preview}</p>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </aside>

                    <section className={`flex-1 min-h-0 min-w-0 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col ${selectedId ? 'seller-mobile-thread fixed inset-x-0 bottom-0 top-[6.25rem] z-40 h-auto rounded-none border-x-0 shadow-none lg:static lg:z-auto lg:h-auto lg:rounded-2xl lg:border-x lg:shadow-sm' : 'hidden lg:flex'}`}>
                      {!selectedId ? (
                        <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-500 text-sm">
                          {t('messages.selectConversation')}
                        </div>
                      ) : (
                        <>
                          <div className="shrink-0 px-3 py-3 border-b border-gray-100 flex items-center justify-between gap-2 sm:px-4">
                            <button type="button" onClick={() => setSelectedId(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 lg:hidden" aria-label={t('messages.conversations')}><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 18l-6-6 6-6" /></svg></button>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">
                                {conversations.find((x) => x.id === selectedId)?.buyer?.name || t('messages.buyers')}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {conversations.find((x) => x.id === selectedId)?.buyer?.email || ''}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => void loadConversations()}>
                              {t('messages.refreshList')}
                            </Button>
                          </div>
                          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 bg-gray-50">
                            {threadLoading ? (
                              <div className="flex items-center justify-center h-40 text-sm text-gray-500">{t('common.loading')}</div>
                            ) : thread.length === 0 ? (
                              <div className="flex items-center justify-center h-40 text-sm text-gray-500">{t('messages.noMessages')}</div>
                            ) : (
                              thread.map((m) => (
                                <MessageBubble
                                  key={m.id}
                                  mine={m.sender_id === user?.id}
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
                          {composer}
                        </>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default function MessagesPage() {
  return <Suspense fallback={<main className="p-8">Loading messages…</main>}><MessagesPageContent /></Suspense>;
}
