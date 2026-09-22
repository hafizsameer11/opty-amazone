'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminChatService, type AdminStoreChatConversation, type AdminStoreChatMessage } from '@/services/store-moderation-service';
import { sellerService, type Seller } from '@/services/seller-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

function MessageBubble({ mine, body, attachmentUrl, attachmentType, attachmentName, senderName, createdAt }: { mine: boolean; body?: string | null; attachmentUrl?: string | null; attachmentType?: string | null; attachmentName?: string | null; senderName?: string | null; createdAt: string }) {
  const { t } = useLanguage();
  return <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-[#0066CC] text-white rounded-br-md' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'}`}>
    {!mine && senderName && <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">{senderName}</p>}
    {body && body !== '[Attachment]' && <p className="whitespace-pre-wrap break-words">{body}</p>}
    {attachmentUrl && attachmentType === 'image' && <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mt-1"><img src={attachmentUrl} alt={attachmentName || t('attachment')} className="max-h-40 rounded-lg" /></a>}
    {attachmentUrl && attachmentType !== 'image' && <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className={`mt-1 inline-flex text-xs underline ${mine ? 'text-blue-100' : 'text-[#0066CC]'}`}>{attachmentName || t('downloadFile')}</a>}
    <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>{new Date(createdAt).toLocaleString()}</p>
  </div></div>;
}

export default function AdminMessagesPage() {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<AdminStoreChatConversation[]>([]); const [listLoading, setListLoading] = useState(true); const [selectedId, setSelectedId] = useState<number | null>(null); const [thread, setThread] = useState<AdminStoreChatMessage[]>([]); const [threadLoading, setThreadLoading] = useState(false); const [draft, setDraft] = useState(''); const [file, setFile] = useState<File | null>(null); const [sending, setSending] = useState(false); const [sellers, setSellers] = useState<Seller[]>([]); const [newStoreId, setNewStoreId] = useState(''); const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null); const fileInputRef = useRef<HTMLInputElement>(null); const lastMessageIdRef = useRef(0);
  const scrollThread = useCallback(() => { const element = listRef.current; if (element) element.scrollTop = element.scrollHeight; }, []);
  const loadConversations = useCallback(async () => { setListLoading(true); setError(null); try { const data = await adminChatService.listConversations(1, 50); setConversations(data.conversations || []); } catch { setError(t('couldNotLoadConversations')); } finally { setListLoading(false); } }, [t]);
  useLiveRefresh(loadConversations);
  useEffect(() => { void loadConversations(); void sellerService.getAll({ per_page: 200 }).then(response => { const rows = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []; setSellers(rows as Seller[]); }).catch(() => {}); }, [loadConversations]);
  const loadThread = useCallback(async (conversationId: number) => { setThreadLoading(true); setError(null); try { const data = await adminChatService.getConversation(conversationId); setThread(data.messages || []); lastMessageIdRef.current = data.messages?.length ? data.messages[data.messages.length - 1].id : 0; setTimeout(scrollThread, 50); void loadConversations(); } catch { setError(t('couldNotLoadMessages')); } finally { setThreadLoading(false); } }, [loadConversations, scrollThread, t]);
  useEffect(() => { if (selectedId) void loadThread(selectedId); else setThread([]); }, [selectedId, loadThread]);
  useEffect(() => { if (!selectedId) return; const timer = window.setInterval(async () => { try { const newMessages = await adminChatService.pollMessages(selectedId, lastMessageIdRef.current); if (newMessages.length) { setThread(previous => [...previous, ...newMessages]); lastMessageIdRef.current = newMessages[newMessages.length - 1].id; setTimeout(scrollThread, 50); void loadConversations(); } } catch {} }, 5000); return () => window.clearInterval(timer); }, [selectedId, loadConversations, scrollThread]);
  const handleSend = async () => { if (!selectedId || sending || (!draft.trim() && !file)) return; setSending(true); setError(null); try { const message = await adminChatService.sendMessage(selectedId, draft.trim(), file); setThread(previous => [...previous, message]); lastMessageIdRef.current = message.id; setDraft(''); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setTimeout(scrollThread, 50); void loadConversations(); } catch { setError(t('failedSendMessage')); } finally { setSending(false); } };
  const handleStartConversation = async () => { if (!newStoreId) return; setError(null); try { const data = await adminChatService.startConversation(Number(newStoreId)); await loadConversations(); setSelectedId(data.conversation.id); setNewStoreId(''); } catch { setError(t('couldNotStartConversation')); } };
  const selectedConversation = conversations.find(conversation => conversation.id === selectedId);

  return <AdminLayout><div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-8rem)]">
    <div className="glass-card rounded-xl border border-white/20 overflow-hidden flex flex-col min-w-0">
      <div className="p-4 border-b border-white/10 space-y-3"><h3 className="font-semibold text-slate-900">{t('sellerConversations')}</h3><div className="flex flex-col sm:flex-row gap-2 items-stretch">
        <select aria-label={t('messageSeller')} value={newStoreId} onChange={event => setNewStoreId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-sm bg-white"><option value="">{t('messageSeller')}</option>{sellers.map(seller => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select>
        <Button type="button" className="w-full sm:w-auto shrink-0 whitespace-nowrap" onClick={() => void handleStartConversation()} disabled={!newStoreId}>{t('startConversation')}</Button>
      </div></div>
      <div className="flex-1 overflow-y-auto">{listLoading ? <div className="p-6 flex justify-center"><LoadingSpinner /></div> : conversations.length === 0 ? <p className="p-4 text-sm text-slate-500">{t('noConversations')}</p> : conversations.map(conversation => <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} className={`w-full text-left px-4 py-3 border-b border-white/10 hover:bg-white/40 transition-colors ${selectedId === conversation.id ? 'bg-white/50' : ''}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-medium text-slate-900 truncate">{conversation.store?.name || `${t('store')} #${conversation.store_id}`}</p><p className="text-xs text-slate-500 truncate">{conversation.last_message_preview || t('noMessagesYet')}</p></div>{conversation.admin_unread_count > 0 && <span className="bg-red-500 text-white text-[10px] font-bold min-w-[1.25rem] h-5 px-1.5 rounded-full flex items-center justify-center shrink-0">{conversation.admin_unread_count > 9 ? '9+' : conversation.admin_unread_count}</span>}</div></button>)}</div>
    </div>
    <div className="glass-card rounded-xl border border-white/20 overflow-hidden flex flex-col min-w-0">{!selectedId ? <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">{t('selectConversation')}</div> : <><div className="p-4 border-b border-white/10"><h3 className="font-semibold text-slate-900">{selectedConversation?.store?.name || `${t('store')} #${selectedConversation?.store_id}`}</h3></div><div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">{threadLoading ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : thread.map(message => <MessageBubble key={message.id} mine={message.sender_role === 'admin'} body={message.body} attachmentUrl={message.attachment_url} attachmentType={message.attachment_type} attachmentName={message.attachment_name} senderName={message.sender?.name} createdAt={message.created_at} />)}</div><div className="p-4 border-t border-white/10 space-y-2 bg-white/60">{error && <p className="text-sm text-red-600">{error}</p>}<textarea aria-label={t('typeMessage')} value={draft} onChange={event => setDraft(event.target.value)} rows={2} placeholder={t('typeMessage')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /><div className="flex flex-wrap items-center gap-2"><input ref={fileInputRef} aria-label={t('attachment')} type="file" accept="image/*,.pdf" onChange={event => setFile(event.target.files?.[0] || null)} className="min-w-0 max-w-full text-xs" /><Button type="button" onClick={() => void handleSend()} disabled={sending || (!draft.trim() && !file)}>{sending ? t('sending') : t('send')}</Button></div></div></>}</div>
  </div></AdminLayout>;
}
