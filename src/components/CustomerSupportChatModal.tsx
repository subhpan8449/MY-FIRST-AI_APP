import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  ShieldCheck, 
  PhoneCall, 
  Sparkles,
  Globe,
  ExternalLink,
  Bot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFestivalTheme } from '../context/FestivalThemeContext';
import { MessagingService } from '../services/messagingService';
import { SupportMessage, SupportTopic } from '../types';
import { renderRichAiMessage } from '../utils/formatAiText';

interface CustomerSupportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: SupportTopic;
  bookingReference?: string;
  roomNumber?: string;
}

const SUPPORT_TOPICS: SupportTopic[] = [
  'Room Availability',
  'Pricing & Offers',
  'Facilities & Pool',
  'Booking Support',
  'CookNow Food',
  'Rishikesh Sightseeing',
  'General Query'
];

const QUICK_PROMPTS = [
  'Can I request early check-in around 10 AM?',
  'Which room is best for a family of 4 with promo discount?',
  'What is the evening Triveni Ghat Ganga Aarti timing today?',
  'How do I order CookNow satvik thali to my room?',
  'Can reception help arrange pickup from Dehradun Airport?'
];

export const CustomerSupportChatModal: React.FC<CustomerSupportChatModalProps> = ({
  isOpen,
  onClose,
  initialTopic = 'General Query',
  bookingReference,
  roomNumber
}) => {
  const { currentUser, userProfile, loginWithGoogle } = useAuth();
  const { themeMeta } = useFestivalTheme();
  const [topic, setTopic] = useState<SupportTopic>(initialTopic);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isAutoReplying, setIsAutoReplying] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAutoReplying]);

  // Load or create conversation on open
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    let unsubMessages: (() => void) | undefined;
    setLoadingConv(true);

    const init = async () => {
      try {
        const convId = await MessagingService.getOrCreateConversation(
          {
            uid: currentUser.uid,
            fullName: userProfile?.fullName || currentUser.displayName || 'Guest',
            email: currentUser.email || '',
            phone: userProfile?.phone || ''
          },
          topic,
          bookingReference,
          roomNumber
        );

        setConversationId(convId);
        await MessagingService.markReadByCustomer(convId);

        unsubMessages = MessagingService.subscribeMessages(convId, (msgs) => {
          setMessages(msgs);
          setLoadingConv(false);
        });
      } catch (err) {
        console.error('Failed to init conversation:', err);
        setLoadingConv(false);
      }
    };

    init();

    return () => {
      if (unsubMessages) unsubMessages();
    };
  }, [isOpen, currentUser, topic, bookingReference, roomNumber, userProfile?.fullName, userProfile?.phone]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !conversationId || !currentUser || sending) return;

    const snapshotHistory = [...messages];
    if (!textToSend) setInputMessage('');

    try {
      setSending(true);
      await MessagingService.sendMessage(
        conversationId,
        {
          id: currentUser.uid,
          name: userProfile?.fullName || currentUser.displayName || 'Guest',
          role: 'guest'
        },
        text
      );
      setSending(false);

      // Immediately generate and deliver the best personalized Admin reply using live homestay + world data
      setIsAutoReplying(true);
      await MessagingService.triggerAdminAutoReply({
        conversationId,
        topic,
        customerName: userProfile?.fullName || currentUser.displayName || 'Guest',
        lastMessage: text,
        history: snapshotHistory,
        userId: currentUser.uid,
        userProfile,
        bookingReference,
        roomNumber,
        activeThemeName: themeMeta.name
      });
    } catch (err) {
      console.error('Failed to send support message:', err);
    } finally {
      setSending(false);
      setIsAutoReplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn">
      <div className="relative flex h-[90vh] max-h-[720px] w-full max-w-2xl flex-col rounded-3xl border border-amber-500/30 bg-slate-900 shadow-2xl shadow-black/80 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-white text-base sm:text-lg">Message Admin · Host Desk</h3>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Instant Smart Desk
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Subhashish Pandey &amp; Team · Powered by Live Homestay &amp; World Data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Not Logged In Banner */}
        {!currentUser ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h4 className="text-xl font-bold text-white">Sign In to Message Host Admin</h4>
            <p className="text-sm text-slate-300 max-w-md">
              Sign in securely with your Google account to message host Subhashish Pandey directly and receive instant smart desk replies + personalized booking support.
            </p>
            <button
              onClick={() => loginWithGoogle()}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 transition cursor-pointer"
            >
              Sign in with Google
            </button>
            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <PhoneCall className="h-3.5 w-3.5 text-amber-400" />
              Urgent query? Call host desk directly at <span className="text-amber-300 font-mono">+91 9897335265</span>
            </div>
          </div>
        ) : (
          <>
            {/* Topic & Room Filter Ribbon */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800/80 bg-slate-950/40 px-4 py-2.5 scrollbar-none">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                Topic:
              </span>
              {SUPPORT_TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                    topic === t
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {loadingConv ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  Connecting to Devashish host desk...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-amber-400">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-base">Direct Line to Devashish Admin Desk</h5>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Send any message — you will receive an automatic smart host reply immediately, backed by live room data, CookNow menu, promo offers &amp; real-time travel info.
                    </p>
                  </div>

                  {/* Quick Prompts */}
                  <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-md">
                    {QUICK_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt)}
                        className="rounded-xl border border-slate-800 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-300 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-white transition text-left cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.uid || msg.senderRole === 'guest';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                        <span>{isMe ? 'You' : msg.senderName || 'Subhashish Pandey · Host Desk'}</span>
                        {!isMe && msg.suggestedByAI && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] text-emerald-300 font-semibold">
                            <Sparkles className="h-2.5 w-2.5" />
                            Auto Host Reply
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-none shadow-md shadow-amber-500/20'
                            : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {isMe ? (
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        ) : (
                          renderRichAiMessage(msg.text, 'dark')
                        )}

                        {!isMe && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-700/80 flex flex-wrap gap-1.5">
                            {msg.sources.map((src, idx) => (
                              <a
                                key={idx}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-slate-900/90 hover:bg-slate-950 border border-slate-700 px-2 py-0.5 rounded-md max-w-[200px] truncate transition"
                                title={src.title}
                              >
                                <Globe className="w-2.5 h-2.5 shrink-0 text-emerald-400" />
                                <span className="truncate">{src.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {isAutoReplying && (
                <div className="flex items-start gap-2 text-xs text-emerald-300/90 bg-slate-800/60 border border-emerald-500/20 rounded-2xl px-3.5 py-2.5 max-w-[80%]">
                  <Bot className="w-4 h-4 text-emerald-400 animate-spin shrink-0 mt-0.5" />
                  <span>Subhashish Pandey · Host Desk is preparing your instant smart reply...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <div className="border-t border-slate-800 bg-slate-950/60 p-3 sm:p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Message Devashish Admin Desk (auto-replied instantly)..."
                  disabled={sending}
                  className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={sending || !inputMessage.trim()}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 font-bold transition hover:brightness-110 disabled:opacity-40 shrink-0 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Instant Smart Desk + Direct Human Follow-up (Subhashish Pandey)</span>
                <span>Tapovan, Rishikesh</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
