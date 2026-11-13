import React from 'react';
import { ShieldCheck, MapPin, Phone, Mail, Heart } from 'lucide-react';

interface FooterProps {
  onOpenPolicy: (type: 'privacy' | 'terms' | 'cancellation') => void;
  onOpenAdmin: () => void;
  onNavigate: (section: string) => void;
  onOpenPlayAndEarn?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenPolicy, onOpenAdmin, onNavigate, onOpenPlayAndEarn }) => {
  return (
    <footer className="bg-stone-900 text-stone-300 text-xs">
      {/* Top Footer Banner: Integration & Architecture Status */}
      <div className="border-b border-stone-800 bg-stone-950/70 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-stone-200">System Status:</span>
            <span>Firebase Firestore & Auth Active · Security Rules Enforced</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-amber-400/90 hidden md:inline">CookNow Integration: Needs API Credentials</span>
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-stone-950" />
              <span>ADMIN LOGIN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Bio */}
          <div className="space-y-3 md:col-span-1">
            <span className="text-lg font-bold text-white tracking-tight">
              Devashish Sunlit Homestay
            </span>
            <p className="text-stone-400 leading-relaxed text-xs">
              A clean, comfortable, safe, friendly and truly affordable homestay located in Tapovan, Rishikesh, Uttarakhand. Welcoming students, families, couples, and pilgrims.
            </p>
            <div className="pt-2 text-stone-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Tapovan, Rishikesh, Uttarakhand, India</span>
              </div>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-2">
            <span className="block font-bold uppercase tracking-wider text-white text-[11px]">
              Guest Navigation
            </span>
            <ul className="space-y-1.5 text-stone-400">
              <li>
                <button onClick={() => onNavigate('rooms')} className="hover:text-amber-400 cursor-pointer">
                  Rooms & Dynamic Pricing
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('facilities')} className="hover:text-amber-400 cursor-pointer">
                  Swimming Pool & Facilities
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('play-area')} className="hover:text-amber-400 cursor-pointer">
                  Kids Play Area Schedule
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('rooftop')} className="hover:text-amber-400 cursor-pointer">
                  Rooftop & City View Deck
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('offers')} className="hover:text-amber-400 cursor-pointer">
                  Student & Group Offers
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('attractions')} className="hover:text-amber-400 cursor-pointer">
                  Rishikesh Local Guide
                </button>
              </li>
              {onOpenPlayAndEarn && (
                <li>
                  <button onClick={onOpenPlayAndEarn} className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer">
                    ★ Sunlit Play &amp; Earn (4 Games &amp; Rewards)
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 3: Policies & Compliance */}
          <div className="space-y-2">
            <span className="block font-bold uppercase tracking-wider text-white text-[11px]">
              House Policies & Legal
            </span>
            <ul className="space-y-1.5 text-stone-400">
              <li>
                <button onClick={() => onOpenPolicy('terms')} className="hover:text-amber-400 cursor-pointer">
                  House Rules & Pool Policy
                </button>
              </li>
              <li>
                <button onClick={() => onOpenPolicy('cancellation')} className="hover:text-amber-400 cursor-pointer">
                  Cancellation & Pay-at-Property
                </button>
              </li>
              <li>
                <button onClick={() => onOpenPolicy('privacy')} className="hover:text-amber-400 cursor-pointer">
                  Privacy & Guest Data Security
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('cooknow')} className="hover:text-amber-400 cursor-pointer">
                  CookNow Food Partnership Status
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-amber-400 cursor-pointer">
                  Host Assistance & Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Ownership & Integrity */}
          <div className="space-y-3">
            <span className="block font-bold uppercase tracking-wider text-white text-[11px]">
              Property Ownership
            </span>
            <p className="text-stone-400 leading-relaxed text-xs">
              Primary Owner: <strong className="text-stone-200">Subhashish Pandey</strong><br />
              Co-Partner: <strong className="text-stone-200">Vivek Singh Negi</strong>
            </p>
            <div className="p-3 bg-stone-800/80 rounded-xl border border-stone-700/60 text-[11px] text-stone-400 leading-relaxed">
              Transparent hospitality. No hidden fees or fabricated awards. Dedicated to genuine guest comfort in Rishikesh.
            </div>
            <div className="pt-2">
              <button
                onClick={onOpenAdmin}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 font-semibold text-xs tracking-wide transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Authorized Administrator Login</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="mt-12 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-stone-500 text-[11px]">
          <div>
            © {new Date().getFullYear()} Devashish Sunlit Homestay. Tapovan, Rishikesh. All rights reserved.
          </div>
          <div className="flex items-center gap-3">
            <span>Built for GitHub & Vercel Production Deployment</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
