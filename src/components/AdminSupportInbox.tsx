import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Sparkles, 
  Send, 
  User, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Bot,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MessagingService } from '../services/messagingService';
import { SupportConversation, SupportMessage } from '../types';

export const AdminSupportInbox: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'pending' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to all conversations in real time
  useEffect(() => {
    const unsub = MessagingService.subscribeAllConversations((convs) => {
      setConversations(convs);
      if (convs.length > 0 && !selectedConvId) {
        setSelectedConvId(convs[0].id);
      }
    });
    return () => unsub();
  }, [selectedConvId]);

  // Subscribe to selected conversation
  useEffect(() => {
    if (!selectedConvId) {
      setSelectedConv(null);
      setMessages([]);
      return;
    }

    const unsubConv = MessagingService.subscribeConversation(selectedConvId, (conv) => {
      setSelectedConv(conv);
      if (conv) {
        setInternalNoteText(conv.internalNotes || '');
      }
    });

    const unsubMsgs = MessagingService.subscribeMessages(selectedConvId, (msgs) => {
      setMessages(msgs);
      MessagingService.markReadByAdmin(selectedConvId).catch(() => {});
    });

    return () => {
      unsubConv();
      unsubMsgs();
    };
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedConvId) return;

    try {
      setSending(true);
      await MessagingService.sendMessage(
        selectedConvId,
        {
          id: currentUser?.uid || 'admin',
          name: userProfile?.fullName || 'Subhashish Pandey (Host)',
          role: 'admin'
        },
        replyText
      );
      setReplyText('');
    } catch (err) {
      console.error('Failed to send admin reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleGenerateAIDraft = async () => {
    if (!selectedConv) return;
    try {
      setGeneratingAI(true);
      const draft = await MessagingService.fetchAIDraftReply({
        topic: selectedConv.topic,
        customerName: selectedConv.customerName,
        lastMessage: selectedConv.lastMessage,
        bookingReference: selectedConv.bookingReference,
        roomNumber: selectedConv.roomNumber
      });
      if (draft) {
        setReplyText(draft);
      }
    } catch (err) {
      console.error('AI draft generation failed:', err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleStatusChange = async (status: 'unread' | 'pending' | 'resolved') => {
    if (!selectedConvId) return;
    await MessagingService.updateStatus(selectedConvId, status);
  };

  const handleSaveInternalNotes = async () => {
    if (!selectedConvId) return;
    await MessagingService.updateInternalNotes(selectedConvId, internalNoteText);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterStatus === 'unread' && c.status !== 'unread') return false;
    if (filterStatus === 'pending' && c.status !== 'pending') return false;
    if (filterStatus === 'resolved' && c.status !== 'resolved') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.customerName?.toLowerCase().includes(q) ||
        c.customerEmail?.toLowerCase().includes(q) ||
        c.bookingReference?.toLowerCase().includes(q) ||
        c.topic?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCountAdmin || (c.status === 'unread' ? 1 : 0)), 0);

  return (
    <div className="space-y-6">
      {/* Top Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <MessageSquare className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-white">Live Customer Support Inbox</h2>
            {totalUnread > 0 && (
              <span className="rounded-full bg-red-500/20 border border-red-500/30 px-2.5 py-0.5 text-xs font-bold text-red-400">
                {totalUnread} Unread
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Real-time inquiries from staying guests and prospective travelers in Rishikesh with AI Draft assistance.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          {(['all', 'unread', 'pending', 'resolved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                filterStatus === st
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        {/* Left: Conversation List (4 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/40">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest name, email, booking..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 max-h-[580px]">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No conversations found under this filter.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConvId === conv.id;
                const hasUnread = conv.unreadCountAdmin > 0 || conv.status === 'unread';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-4 cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-500/10 border-l-4 border-amber-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-amber-400 font-bold text-xs shrink-0">
                          {conv.customerName?.charAt(0) || 'G'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-white line-clamp-1">
                            {conv.customerName || 'Guest'}
                          </h4>
                          <span className="text-[11px] font-medium text-amber-400">
                            {conv.topic}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500">
                          {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                        </span>
                        {hasUnread && (
                          <div className="mt-1 flex justify-end">
                            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                      {conv.lastMessage || 'No messages yet'}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/40">
                      <span className="capitalize font-medium">
                        Status: <span className={conv.status === 'unread' ? 'text-amber-400' : conv.status === 'resolved' ? 'text-emerald-400' : 'text-sky-400'}>{conv.status}</span>
                      </span>
                      {conv.roomNumber && (
                        <span className="text-slate-400 font-mono">Room #{conv.roomNumber}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Thread & Reply Center (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              {/* Selected Conversation Header */}
              <div className="border-b border-slate-800 bg-slate-950/60 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">{selectedConv.customerName}</h3>
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                        {selectedConv.topic}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      {selectedConv.customerEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                          {selectedConv.customerEmail}
                        </span>
                      )}
                      {selectedConv.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          {selectedConv.customerPhone}
                        </span>
                      )}
                      {selectedConv.bookingReference && (
                        <span className="font-mono text-amber-400/90">
                          Ref: {selectedConv.bookingReference}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedConv.status}
                      onChange={(e) => handleStatusChange(e.target.value as any)}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="unread">Unread</option>
                      <option value="pending">Pending Reply</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[360px]">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No messages in this conversation yet.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.senderRole === 'admin';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1 px-1">
                          <span>{isAdmin ? 'Homestay Host' : m.senderName || 'Guest'}</span>
                          <span>•</span>
                          <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                            isAdmin
                              ? 'bg-amber-500/20 border border-amber-500/30 text-amber-100 rounded-tr-none'
                              : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Staff Internal Note Accordion / Drawer */}
              <div className="border-t border-slate-800 bg-slate-950/40 p-3">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="flex items-center gap-1 font-semibold text-slate-300">
                    <Lock className="h-3 w-3 text-amber-400" />
                    Internal Staff Note (Invisible to Guest)
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveInternalNotes}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                  >
                    Save Note
                  </button>
                </div>
                <input
                  type="text"
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  onBlur={handleSaveInternalNotes}
                  placeholder="e.g. Guest requested top floor 302; vegetarian satvik meal preference..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* AI Draft Suggestion Button + Reply Composer */}
              <div className="border-t border-slate-800 bg-slate-950/80 p-4">
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={handleGenerateAIDraft}
                    disabled={generatingAI}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    {generatingAI ? 'Drafting with Gemini...' : 'Generate AI Suggested Reply'}
                  </button>
                  <span className="text-[11px] text-slate-500">Edit draft before sending</span>
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type official response to guest..."
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="flex items-center justify-center rounded-xl bg-amber-500 px-4 text-slate-950 font-bold transition hover:brightness-110 disabled:opacity-40 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
              <MessageSquare className="h-10 w-10 text-slate-700 mb-2" />
              <p className="text-sm">Select a conversation from the left to view messages and respond.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
