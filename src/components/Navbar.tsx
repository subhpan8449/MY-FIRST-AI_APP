import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Shield,
  CalendarCheck,
  LogOut,
  Menu,
  X,
  Sparkles,
  Compass,
  Waves,
  Baby,
  Eye,
  ChevronDown,
  Lock,
  Search,
  Utensils,
  RefreshCw,
  Award,
  Headphones
} from 'lucide-react';

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenAuth: (accountType?: 'customer' | 'admin') => void;
  onOpenAdminLogin: () => void;
  onOpenMyBookings: () => void;
  onOpenCustomerService?: () => void;
  onOpen3DViewer?: () => void;
  onOpenPlayAndEarn?: () => void;
  onOpenSupportChat?: () => void;
  onOpenSearch?: () => void;
  activeSection: string;
  onNavigate: (section: string) => void;
}

const MiniGoogleIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBooking,
  onOpenAuth,
  onOpenAdminLogin,
  onOpenMyBookings,
  onOpenCustomerService,
  onOpen3DViewer,
  onOpenPlayAndEarn,
  onOpenSupportChat,
  onOpenSearch,
  activeSection,
  onNavigate,
}) => {
  const { currentUser, userProfile, isAdmin, loginWithGoogle, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = userProfile?.fullName || currentUser?.displayName || 'Guest';
  const firstName = displayName.split(' ')[0];
  const avatarPhoto = currentUser?.photoURL || userProfile?.photoURL;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-amber-900/10 shadow-xs">
      {/* Topmost Executive Strip with Dedicated Customer & Admin Google Sign-In Controls */}
      <div className="bg-amber-950 text-stone-200 text-[11px] py-1.5 px-4 sm:px-6 lg:px-8 border-b border-amber-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-amber-400 font-bold truncate">Devashish Sunlit Homestay</span>
          <span className="text-stone-400 hidden sm:inline truncate">· Tapovan, Rishikesh, Uttarakhand, India</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-stone-300 hidden lg:inline">Direct Desk: +91 9897335265</span>

          {!currentUser && (
            <button
              type="button"
              onClick={() => onOpenAuth('customer')}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded text-[11px] border border-white/15 transition-colors cursor-pointer"
              title="Customer Google Login"
            >
              <MiniGoogleIcon />
              <span>Customer Login</span>
            </button>
          )}

          {/* VISIBLE ADMIN GOOGLE LOGIN BUTTON IN HEADER */}
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-800 hover:bg-amber-700 text-amber-100 hover:text-white font-bold rounded text-[11px] border border-amber-600 transition-colors cursor-pointer shadow-xs"
            title="Admin & Owner Google Portal Access"
          >
            <Lock className="w-3 h-3 text-amber-300" />
            <span>{isAdmin ? 'ADMIN CORNER' : 'ADMIN LOGIN'}</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand wordmark */}
        <button
          onClick={() => {
            onNavigate('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 text-left cursor-pointer group whitespace-nowrap shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-950 via-amber-800 to-amber-600 flex items-center justify-center text-amber-200 shadow-xs border border-amber-500/40 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <span className="text-sm sm:text-base font-black tracking-tight text-amber-950 group-hover:text-amber-800 transition-colors block leading-tight font-serif">
              DEVASHISH SUNLIT
            </span>
            <span className="block text-[10px] font-bold text-amber-800/90 tracking-widest uppercase">
              Home Stay · Tapovan, Rishikesh
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-5 text-xs font-semibold text-stone-700">
          <button
            onClick={() => onNavigate('home')}
            className={`hover:text-amber-800 transition-colors cursor-pointer ${
              activeSection === 'home' ? 'text-amber-800 font-bold border-b-2 border-amber-600 pb-0.5' : ''
            }`}
          >
            Home
          </button>

          <button
            onClick={() => onNavigate('rooms')}
            className={`hover:text-amber-800 transition-colors cursor-pointer ${
              activeSection === 'rooms' ? 'text-amber-800 font-bold border-b-2 border-amber-600 pb-0.5' : ''
            }`}
          >
            Rooms
          </button>

          <button
            onClick={() => {
              if (onOpen3DViewer) onOpen3DViewer();
              else onNavigate('rooms');
            }}
            className="hover:text-amber-800 transition-colors cursor-pointer text-amber-900 font-bold flex items-center gap-1"
          >
            <Compass className="w-3.5 h-3.5 text-amber-700" />
            <span>3D Room View</span>
          </button>

          {/* Facilities Dropdown */}
          <div className="relative group">
            <button
              onClick={() => onNavigate('facilities')}
              className="flex items-center gap-1 hover:text-amber-800 transition-colors cursor-pointer py-1"
            >
              <span>Facilities</span>
              <ChevronDown className="w-3 h-3 text-stone-400 group-hover:rotate-180 transition-transform" />
            </button>
            <div className="absolute top-full left-0 hidden group-hover:flex flex-col bg-white border border-stone-200 rounded-xl shadow-xl py-2 w-48 z-50">
              <button
                onClick={() => onNavigate('facilities')}
                className="px-4 py-2 text-left hover:bg-stone-50 text-stone-700 cursor-pointer"
              >
                All Facilities
              </button>
              <button
                onClick={() => onNavigate('facilities')}
                className="px-4 py-2 text-left hover:bg-stone-50 text-stone-700 cursor-pointer flex items-center gap-1.5"
              >
                <Waves className="w-3.5 h-3.5 text-amber-700" />
                <span>Swimming Pool</span>
              </button>
              <button
                onClick={() => onNavigate('play-area')}
                className="px-4 py-2 text-left hover:bg-stone-50 text-stone-700 cursor-pointer flex items-center gap-1.5"
              >
                <Baby className="w-3.5 h-3.5 text-amber-700" />
                <span>Kids Play Area</span>
              </button>
              <button
                onClick={() => onNavigate('rooftop')}
                className="px-4 py-2 text-left hover:bg-stone-50 text-stone-700 cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-amber-700" />
                <span>City View &amp; Rooftop</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => onNavigate('offers')}
            className={`hover:text-amber-800 transition-colors cursor-pointer ${
              activeSection === 'offers' ? 'text-amber-800 font-bold border-b-2 border-amber-600 pb-0.5' : ''
            }`}
          >
            Special Offers
          </button>

          {onOpenPlayAndEarn && (
            <button
              onClick={onOpenPlayAndEarn}
              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
              <span>Play &amp; Earn</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('tourism')}
            className={`hover:text-amber-800 transition-colors cursor-pointer ${
              activeSection === 'tourism' ? 'text-amber-800 font-bold border-b-2 border-amber-600 pb-0.5' : ''
            }`}
          >
            Tourism
          </button>

          <button
            onClick={() => onNavigate('dining')}
            className={`hover:text-amber-800 transition-colors cursor-pointer flex items-center gap-1 ${
              activeSection === 'dining' ? 'text-amber-800 font-bold border-b-2 border-amber-600 pb-0.5' : ''
            }`}
            title="CookNow In-Room Satvik Dining"
          >
            <Utensils className="w-3.5 h-3.5 text-amber-700" />
            <span>Dining</span>
          </button>

          <button
            onClick={() => {
              if (onOpenCustomerService) onOpenCustomerService();
              else onNavigate('services');
            }}
            className="hover:text-amber-800 transition-colors cursor-pointer text-stone-700"
          >
            Services
          </button>

          {onOpenSupportChat && (
            <button
              onClick={onOpenSupportChat}
              className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 border border-amber-500/40 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <span>Message Desk</span>
            </button>
          )}
        </nav>

        {/* Right Action Buttons & Big-App Profile Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg cursor-pointer transition-colors"
              title="Search Homestay & Food (⌘K)"
            >
              <Search className="w-3.5 h-3.5 text-amber-800" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden lg:inline text-[9px] bg-white border border-stone-300 rounded px-1 font-mono text-stone-500">⌘K</kbd>
            </button>
          )}

          {currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setAccountDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200/80 border border-stone-200 transition-all cursor-pointer"
              >
                {avatarPhoto ? (
                  <img
                    src={avatarPhoto}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover border border-amber-500/50"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-800 text-white text-xs font-bold flex items-center justify-center">
                    {firstName[0]?.toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left leading-tight">
                  <span className="text-xs font-bold text-stone-900 block max-w-[95px] truncate">
                    {firstName}
                  </span>
                  <span className={`text-[9px] font-extrabold uppercase tracking-wider block ${isAdmin ? 'text-amber-800' : 'text-emerald-700'}`}>
                    {isAdmin ? 'Owner / Admin' : 'Verified Guest'}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-stone-500 transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {accountDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-stone-200 shadow-2xl overflow-hidden z-50 animate-slideDown">
                  {/* Account Card Header */}
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-stone-50 border-b border-stone-200 flex items-center gap-3">
                    {avatarPhoto ? (
                      <img
                        src={avatarPhoto}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border-2 border-amber-600/40 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-amber-800 text-white font-bold flex items-center justify-center shrink-0">
                        {firstName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full mb-0.5 ${
                        isAdmin ? 'bg-amber-950 text-amber-200' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isAdmin ? 'Administrator · Google Verified' : 'Guest Member · Google Verified'}
                      </span>
                      <p className="text-xs font-extrabold text-stone-900 truncate">{displayName}</p>
                      <p className="text-[11px] text-stone-500 truncate">{currentUser.email}</p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="p-2 space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        onOpenMyBookings();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-100 text-stone-800 font-semibold flex items-center gap-2.5 cursor-pointer"
                    >
                      <CalendarCheck className="w-4 h-4 text-amber-700" />
                      <span>My Bookings &amp; Digital Receipts</span>
                    </button>

                    {onOpenPlayAndEarn && (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountDropdownOpen(false);
                          onOpenPlayAndEarn();
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-100 text-stone-800 font-semibold flex items-center gap-2.5 cursor-pointer"
                      >
                        <Award className="w-4 h-4 text-amber-700" />
                        <span>Play &amp; Earn Rewards</span>
                      </button>
                    )}

                    {onOpenCustomerService && (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountDropdownOpen(false);
                          onOpenCustomerService();
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-100 text-stone-800 font-semibold flex items-center gap-2.5 cursor-pointer"
                      >
                        <Headphones className="w-4 h-4 text-amber-700" />
                        <span>Concierge &amp; Room Services</span>
                      </button>
                    )}

                    <div className="my-1 border-t border-stone-100" />

                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountDropdownOpen(false);
                          onOpenAdminLogin();
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-extrabold flex items-center gap-2.5 cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-amber-800" />
                        <span>Open 25-Module Admin Corner</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAccountDropdownOpen(false);
                          onOpenAuth('admin');
                        }}
                        className="w-full px-3 py-2 text-left rounded-xl hover:bg-amber-50 text-amber-900 font-semibold flex items-center gap-2.5 cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-amber-700" />
                        <span>Switch to Admin Google Login</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        loginWithGoogle().catch(() => {});
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-stone-100 text-stone-700 font-medium flex items-center gap-2.5 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-stone-500" />
                      <span>Switch Google Account</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAccountDropdownOpen(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-50 text-red-700 font-semibold flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onOpenAuth('customer')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-stone-800 hover:text-amber-950 bg-white border border-stone-300 rounded-xl cursor-pointer hover:bg-stone-50 shadow-2xs transition-all"
            >
              <MiniGoogleIcon />
              <span>Sign In</span>
            </button>
          )}

          <button
            onClick={onOpenBooking}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 shadow-sm rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            Book Now
          </button>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-stone-200 px-6 py-4 space-y-3 text-xs font-medium animate-slideDown">
          {/* Dedicated Customer & Admin Google Login Actions on Mobile */}
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-stone-100">
            <button
              onClick={() => {
                onOpenAuth('customer');
                setMobileMenuOpen(false);
              }}
              className="py-2.5 px-3 bg-white hover:bg-stone-50 text-stone-900 font-bold rounded-xl border border-stone-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <MiniGoogleIcon />
              <span>{currentUser ? 'Customer Account' : 'Customer Login'}</span>
            </button>

            <button
              onClick={() => {
                onOpenAdminLogin();
                setMobileMenuOpen(false);
              }}
              className="py-2.5 px-3 bg-amber-950 hover:bg-stone-900 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAdmin ? 'Admin Corner' : 'Admin Login'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => {
                onNavigate('rooms');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer font-bold text-amber-950"
            >
              Rooms &amp; Pricing
            </button>
            <button
              onClick={() => {
                if (onOpen3DViewer) onOpen3DViewer();
                else onNavigate('rooms');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 text-amber-800 font-bold cursor-pointer flex items-center gap-1"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>3D Room View</span>
            </button>
            <button
              onClick={() => {
                onNavigate('facilities');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer"
            >
              Facilities
            </button>
            <button
              onClick={() => {
                onNavigate('facilities');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer flex items-center gap-1"
            >
              <Waves className="w-3.5 h-3.5 text-amber-700" />
              <span>Swimming Pool</span>
            </button>
            <button
              onClick={() => {
                onNavigate('play-area');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer flex items-center gap-1"
            >
              <Baby className="w-3.5 h-3.5 text-amber-700" />
              <span>Kids Play Area</span>
            </button>
            <button
              onClick={() => {
                onNavigate('rooms');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer"
            >
              City View Rooms
            </button>
            <button
              onClick={() => {
                onNavigate('rooftop');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer"
            >
              Rooftop Experience
            </button>
            <button
              onClick={() => {
                onNavigate('offers');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer"
            >
              Special Offers
            </button>
            {onOpenPlayAndEarn && (
              <button
                onClick={() => {
                  onOpenPlayAndEarn();
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 text-amber-850 font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>Play &amp; Earn</span>
              </button>
            )}
            <button
              onClick={() => {
                onNavigate('tourism');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer font-bold text-stone-900"
            >
              Rishikesh Tourism
            </button>
            <button
              onClick={() => {
                onNavigate('dining');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer flex items-center gap-1.5 font-bold text-amber-900"
            >
              <Utensils className="w-3.5 h-3.5 text-amber-700" />
              <span>Dining &amp; CookNow</span>
            </button>
            <button
              onClick={() => {
                if (onOpenCustomerService) onOpenCustomerService();
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 text-amber-800 font-semibold cursor-pointer"
            >
              Guest Services
            </button>
            <button
              onClick={() => {
                onNavigate('contact');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1.5 hover:text-amber-800 cursor-pointer"
            >
              Contact
            </button>

            {onOpenSupportChat && (
              <button
                onClick={() => {
                  onOpenSupportChat();
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 text-amber-800 font-bold cursor-pointer"
              >
                Message Desk / Support
              </button>
            )}
          </div>

          {currentUser && (
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  onOpenMyBookings();
                  setMobileMenuOpen(false);
                }}
                className="text-stone-800 font-bold truncate"
              >
                My Bookings ({currentUser.email})
              </button>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-red-700 font-bold shrink-0"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
