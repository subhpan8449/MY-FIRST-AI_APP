import React from 'react';
import { Home, Bed, Waves, Utensils, CalendarCheck, Shield, UserCheck } from 'lucide-react';

interface MobileBottomNavProps {
  onOpenBookings: () => void;
  onOpenPlayAndEarn: () => void;
  onOpenAdmin?: () => void;
  onOpenAuth?: () => void;
  unreadCount?: number;
  isAdmin?: boolean;
  isSignedIn?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenBookings,
  onOpenPlayAndEarn,
  onOpenAdmin,
  onOpenAuth,
  unreadCount = 0,
  isAdmin = false,
  isSignedIn = false
}) => {
  const scrollTo = (id: string) => {
    let el = document.getElementById(id);
    if (!el && (id === 'dining' || id === 'cooknow')) {
      el = document.getElementById('dining') || document.getElementById('cooknow') || document.getElementById('food');
    }
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-1.5 shadow-lg flex items-center justify-around"
    >
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex flex-col items-center gap-0.5 text-stone-600 hover:text-amber-800 transition p-1 cursor-pointer"
      >
        <Home className="w-4 h-4" />
        <span className="text-[10px] font-semibold">Home</span>
      </button>

      <button
        onClick={() => scrollTo('rooms')}
        className="flex flex-col items-center gap-0.5 text-stone-600 hover:text-amber-800 transition p-1 cursor-pointer"
      >
        <Bed className="w-4 h-4" />
        <span className="text-[10px] font-semibold">Rooms</span>
      </button>

      <button
        onClick={onOpenPlayAndEarn}
        className="flex flex-col items-center gap-0.5 text-amber-700 hover:text-amber-900 transition p-1 cursor-pointer relative"
      >
        <span className="absolute -top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
        <Waves className="w-4 h-4" />
        <span className="text-[10px] font-bold">Play</span>
      </button>

      <button
        onClick={() => scrollTo('dining')}
        className="flex flex-col items-center gap-0.5 text-stone-600 hover:text-amber-800 transition p-1 cursor-pointer"
        aria-label="Dining and CookNow satvik meals"
      >
        <Utensils className="w-4 h-4" />
        <span className="text-[10px] font-semibold">Dining</span>
      </button>

      <button
        onClick={onOpenBookings}
        className="flex flex-col items-center gap-0.5 text-stone-600 hover:text-amber-800 transition p-1 cursor-pointer relative"
      >
        {unreadCount > 0 && (
          <span className="absolute -top-1 right-2 bg-amber-600 text-white rounded-full text-[9px] font-bold px-1 min-w-[14px] text-center">
            {unreadCount}
          </span>
        )}
        <CalendarCheck className="w-4 h-4" />
        <span className="text-[10px] font-semibold">Bookings</span>
      </button>

      {isAdmin && onOpenAdmin ? (
        <button
          onClick={onOpenAdmin}
          className="flex flex-col items-center gap-0.5 text-amber-800 hover:text-amber-950 transition p-1 cursor-pointer"
        >
          <Shield className="w-4 h-4 text-amber-700" />
          <span className="text-[10px] font-bold">Admin</span>
        </button>
      ) : (
        onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="flex flex-col items-center gap-0.5 text-stone-700 hover:text-amber-900 transition p-1 cursor-pointer"
          >
            <UserCheck className={`w-4 h-4 ${isSignedIn ? 'text-emerald-600' : 'text-amber-700'}`} />
            <span className="text-[10px] font-semibold">{isSignedIn ? 'Account' : 'Sign In'}</span>
          </button>
        )
      )}
    </nav>
  );
};
