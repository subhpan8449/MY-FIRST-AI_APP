import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Headphones, 
  MessageSquareText, 
  X, 
  Send, 
  User, 
  Clock, 
  CheckCheck, 
  ShieldCheck, 
  ChevronDown, 
  Maximize2, 
  Minimize2,
  PhoneCall,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFestivalTheme } from '../context/FestivalThemeContext';
import { CustomerSupportChatModal } from './CustomerSupportChatModal';
import { SupportTopic } from '../types';

interface FloatingActionsManagerProps {
  onOpenBooking?: () => void;
  bookingReference?: string;
  roomNumber?: string;
}

interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const AI_SUGGESTED_QUESTIONS = [
  'Which room should I book for a couple or family?',
  'What are the check-in (12 PM) and check-out (10 AM) rules?',
  'How far is Ram Jhula & Parmarth Niketan from homestay?',
  'How do I order CookNow fresh satvik meals to my room?',
  'Tell me about the swimming pool & kids play area',
  'How do I redeem Sunlit Reward points for room discounts?'
];

export const FloatingActionsManager: React.FC<FloatingActionsManagerProps> = ({
  onOpenBooking,
  bookingReference,
  roomNumber
}) => {
  const { currentUser, userProfile } = useAuth();
  const { activeTheme, themeMeta } = useFestivalTheme();

  // Coordinated panel state: 'none' | 'ai' | 'support'
  const [activePanel, setActivePanel] = useState<'none' | 'ai' | 'support'>('none');
  const [unreadHostCount, setUnreadHostCount] = useState<number>(0);

  // AI Assistant State
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! Welcome to Devashish Sunlit Homestay in Tapovan, Rishikesh. I am your 24/7 AI Guest Concierge. How may I assist your Himalayan stay today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll AI chat
  useEffect(() => {
    if (activePanel === 'ai') {
      aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, activePanel]);

  // Global ESC key listener to dismiss open panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePanel !== 'none') {
        setActivePanel('none');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePanel]);

  // Send message to Gemini AI Assistant endpoint
  const handleSendAi = async (textToSend?: string) => {
    const question = (textToSend || aiInput).trim();
    if (!question || isAiLoading) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question })
      });

      const data = await res.json();
      const replyText = data.reply || 'Thank you for asking. Our host desk in Tapovan (Subhashish & Vivek) is delighted to assist you directly!';

      const assistantMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setAiMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI Concierge error:', err);
      const fallbackMsg: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Devashish Sunlit Homestay is located in Tapovan, Rishikesh with scenic mountain views, swimming pool, and kids play area. Check-in is 12:00 PM and check-out is 10:00 AM. Please click "Message Admin" to speak directly with host Subhashish Pandey!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAiMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Toggle handlers with mutual exclusivity
  const toggleAiPanel = () => {
    setActivePanel(prev => (prev === 'ai' ? 'none' : 'ai'));
  };

  const toggleSupportPanel = () => {
    setActivePanel(prev => (prev === 'support' ? 'none' : 'support'));
  };

  // Theme-aware styles for buttons
  const isDiwali = activeTheme === 'diwali';
  const isHoli = activeTheme === 'holi';
  const isJanmashtami = activeTheme === 'janmashtami';
  const isChristmas = activeTheme === 'christmas';
  const isNewYear = activeTheme === 'newyear';

  return (
    <>
      {/* ============================================================== */}
      {/* SHARED FLOATING ACTION BUTTONS CONTAINER (VERTICALLY STACKED)  */}
      {/* ============================================================== */}
      <div 
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2.5 pointer-events-auto"
        role="region"
        aria-label="Customer Interaction & Support"
      >
        {/* BUTTON ONE: ASK SUNLIT AI */}
        <button
          onClick={toggleAiPanel}
          aria-expanded={activePanel === 'ai'}
          aria-label="Ask Sunlit AI Guest Assistant"
          className={`group flex items-center gap-2 rounded-full px-3.5 py-2.5 sm:px-4 sm:py-2.5 shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold border backdrop-blur-md ${
            activePanel === 'ai'
              ? 'bg-amber-600 text-white border-amber-300 ring-2 ring-amber-400/50'
              : isDiwali
              ? 'bg-gradient-to-r from-stone-950 via-amber-950 to-stone-950 text-amber-200 border-amber-400/50 shadow-amber-900/30'
              : isHoli
              ? 'bg-gradient-to-r from-pink-950 via-purple-950 to-emerald-950 text-pink-200 border-pink-400/40 shadow-pink-900/20'
              : isJanmashtami
              ? 'bg-gradient-to-r from-sky-950 via-blue-950 to-indigo-950 text-sky-200 border-amber-400/40 shadow-blue-900/30'
              : isChristmas
              ? 'bg-gradient-to-r from-red-950 via-emerald-950 to-stone-950 text-amber-200 border-emerald-400/40 shadow-red-900/20'
              : 'bg-stone-900/95 hover:bg-stone-900 text-amber-300 border-amber-500/40 shadow-black/50'
          }`}
          title="Ask Sunlit AI Concierge (24/7)"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="h-4 w-4 text-amber-300 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </div>
          <span className="tracking-wide font-sans">
            ASK SUNLIT AI
          </span>
          <Sparkles className="h-3 w-3 text-amber-400/80 animate-pulse hidden sm:inline" />
        </button>

        {/* BUTTON TWO: MESSAGE ADMIN (HUMAN HOST DESK) */}
        <button
          onClick={toggleSupportPanel}
          aria-expanded={activePanel === 'support'}
          aria-label="Message Homestay Admin & Reception"
          className={`group flex items-center gap-2 rounded-full px-3.5 py-2.5 sm:px-4 sm:py-2.5 shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold border backdrop-blur-md ${
            activePanel === 'support'
              ? 'bg-emerald-700 text-white border-emerald-300 ring-2 ring-emerald-400/50'
              : 'bg-slate-950/95 hover:bg-slate-900 text-stone-100 border-stone-600/60 shadow-black/60'
          }`}
          title="Message Admin & Host Reception Desk (Subhashish & Vivek)"
        >
          <div className="relative flex items-center justify-center">
            <Headphones className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-slate-950" />
          </div>
          <span className="tracking-wide font-sans">
            MESSAGE ADMIN
          </span>
          {unreadHostCount > 0 ? (
            <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-bounce">
              {unreadHostCount}
            </span>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 hidden sm:inline" />
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* DEDICATED PANEL ONE: ASK SUNLIT AI (CONCIERGE)                 */}
      {/* ============================================================== */}
      {activePanel === 'ai' && (
        <div 
          className="fixed bottom-36 sm:bottom-24 right-3 sm:right-6 z-50 w-[94vw] sm:w-[410px] h-[550px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
          role="dialog"
          aria-label="Ask Sunlit AI Concierge Window"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-4 text-white flex items-center justify-between shrink-0 border-b border-amber-900/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-sm tracking-tight text-white">
                    Ask Sunlit AI Concierge
                  </h4>
                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-1.5 py-0.2 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    24/7 AI
                  </span>
                </div>
                <p className="text-[10px] text-amber-200/80">
                  Devashish Homestay · Tapovan, Rishikesh
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setActivePanel('support')}
                className="p-1 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition cursor-pointer text-[10px] flex items-center gap-1 px-2"
                title="Switch to human host support"
              >
                <Headphones className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Human Help</span>
              </button>
              <button
                onClick={() => setActivePanel('none')}
                className="p-1.5 rounded-full hover:bg-white/10 text-stone-300 hover:text-white transition cursor-pointer"
                aria-label="Close AI Concierge"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/70 text-xs">
            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-amber-800 text-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3" />
                  </div>
                )}
                <div
                  className={`max-w-[84%] rounded-2xl p-3 shadow-2xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-amber-800 text-white rounded-tr-none'
                      : 'bg-white text-stone-800 border border-stone-200 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span
                    className={`block text-[9px] mt-1 ${
                      msg.sender === 'user' ? 'text-amber-200/70 text-right' : 'text-stone-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isAiLoading && (
              <div className="flex gap-2 items-center text-stone-400 text-xs py-1">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 animate-spin" />
                </div>
                <span className="italic">Grounded in Tapovan homestay data...</span>
              </div>
            )}
            <div ref={aiMessagesEndRef} />
          </div>

          {/* Suggested Quick Prompts */}
          <div className="px-3 py-2 bg-stone-100 border-t border-stone-200 overflow-x-auto shrink-0 flex gap-1.5 text-[11px] no-scrollbar">
            {AI_SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSendAi(q)}
                className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-300 rounded-full font-medium transition cursor-pointer shrink-0"
              >
                {q}
              </button>
            ))}
          </div>

          {/* AI Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendAi();
            }}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask anything about rooms, facilities, food, or Rishikesh..."
              className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-700"
            />
            <button
              type="submit"
              disabled={!aiInput.trim() || isAiLoading}
              className="p-2 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 text-white rounded-xl cursor-pointer transition shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* DEDICATED PANEL TWO: MESSAGE ADMIN (HUMAN SUPPORT)             */}
      {/* ============================================================== */}
      <CustomerSupportChatModal
        isOpen={activePanel === 'support'}
        onClose={() => setActivePanel('none')}
        bookingReference={bookingReference}
        roomNumber={roomNumber}
      />
    </>
  );
};
