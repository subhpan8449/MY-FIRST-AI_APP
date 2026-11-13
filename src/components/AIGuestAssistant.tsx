import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ChevronDown,
  Compass,
  Bed,
  Utensils,
  Sun,
  ShieldCheck
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'What are the check-in and check-out times?',
  'How far is Ram Jhula from Devashish Homestay?',
  'What meals and Satvik options are available?',
  'Tell me about the swimming pool & kids play area',
  'What rooftop sunset packages do you offer?'
];

export const AIGuestAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! Welcome to Devashish Sunlit Homestay in Tapovan, Rishikesh. I am your 24/7 AI Guest Concierge. How can I assist your Himalayan stay today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question })
      });

      const data = await res.json();
      const replyText = data.reply || 'Thank you for asking. Our front desk in Tapovan is always delighted to assist you directly!';

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI Concierge error:', err);
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Devashish Sunlit Homestay is located in scenic Tapovan, Rishikesh. Standard check-in is 12:00 PM and check-out is 11:00 AM. Please reach out to our front desk team for personalized help!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI Guest Concierge"
        className="fixed bottom-20 sm:bottom-6 right-5 z-40 p-3.5 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white rounded-full shadow-2xl border-2 border-amber-300/40 cursor-pointer transition transform hover:scale-105 active:scale-95 flex items-center gap-2 group"
      >
        <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
        <span className="hidden sm:inline text-xs font-bold tracking-wide pr-1">
          AI Concierge
        </span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 sm:bottom-20 right-4 sm:right-6 z-50 w-[92vw] sm:w-[390px] h-[520px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-stone-900 p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs sm:text-sm tracking-tight text-white flex items-center gap-1.5">
                  <span>Sunlit AI Concierge</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </h4>
                <p className="text-[10px] text-amber-200/80">Devashish Homestay · Tapovan, Rishikesh</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/10 text-stone-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/70 text-xs">
            {messages.map((msg) => (
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
                  className={`max-w-[82%] rounded-2xl p-3 shadow-2xs leading-relaxed ${
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

            {isLoading && (
              <div className="flex gap-2 items-center text-stone-400 text-xs py-1">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 animate-spin" />
                </div>
                <span className="italic">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-stone-100 border-t border-stone-200 overflow-x-auto shrink-0 flex gap-1.5 text-[11px] no-scrollbar">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                onClick={() => handleSend(qp)}
                className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-300 rounded-full font-medium transition cursor-pointer"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about rooms, services or Rishikesh..."
              className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-amber-800 hover:bg-amber-900 disabled:bg-stone-300 text-white rounded-xl cursor-pointer transition shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
