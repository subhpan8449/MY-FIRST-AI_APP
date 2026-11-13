import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Room, SearchFilters, TravelerPersona } from './types';
import { getRooms, bootstrapInitialData } from './services/db';
import { testConnection } from './firebase';
import { computeSmartMatch, TRAVELER_PERSONAS } from './services/recommendationEngine';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { RoomCard } from './components/RoomCard';
import { RoomDetailModal } from './components/RoomDetailModal';
import { BookingModal } from './components/BookingModal';
import { FacilitiesSection } from './components/FacilitiesSection';
import { PlayAreaSection } from './components/PlayAreaSection';
import { RooftopSection } from './components/RooftopSection';
import { OffersSection } from './components/OffersSection';
import { AttractionsSection } from './components/AttractionsSection';
import { CookNowSection } from './components/CookNowSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { MyBookingsModal } from './components/MyBookingsModal';
import { AdminPortal } from './components/AdminPortal';
import { PolicyModals } from './components/PolicyModals';
import { Room3DViewer } from './components/Room3DViewer';
import { CustomerServiceModal } from './components/CustomerServiceModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { SunlitPlayAndEarn } from './components/SunlitPlayAndEarn';
import { FloatingActionsManager } from './components/FloatingActionsManager';
import { MobileBottomNav } from './components/MobileBottomNav';
import { FestivalThemeProvider, useFestivalTheme } from './context/FestivalThemeContext';
import { FestivalEffects } from './components/FestivalEffects';
import { CustomerSupportChatModal } from './components/CustomerSupportChatModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Bed, Filter, CheckCircle2, AlertCircle, Box, Compass, Sparkles, RotateCcw, ArrowUpDown, MessageSquare, X } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, userProfile, isAdmin, authNotice, clearAuthNotice } = useAuth();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Room | null>(null);
  const [selectedRoomForDetail, setSelectedRoomForDetail] = useState<Room | null>(null);
  const [selectedRoomFor3D, setSelectedRoomFor3D] = useState<Room | null>(null);
  const [activeSection, setActiveSection] = useState<string>('home');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [travelerPersona, setTravelerPersona] = useState<TravelerPersona>('all');

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    checkInDate: tomorrow.toISOString().split('T')[0],
    checkOutDate: dayAfter.toISOString().split('T')[0],
    adults: 2,
    children: 0,
    roomsCount: 1,
    category: 'all',
    maxBudget: 2500,
    viewPreference: 'all',
    sortBy: 'recommended',
    chipFilter: 'all'
  });

  const { themeMeta, config, userAnimationOverride, toggleUserAnimation } = useFestivalTheme();

  // Modals state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialType, setAuthInitialType] = useState<'customer' | 'admin'>('customer');
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);
  const [isCustomerServiceOpen, setIsCustomerServiceOpen] = useState(false);
  const [isPlayAndEarnOpen, setIsPlayAndEarnOpen] = useState(false);
  const [isSupportChatOpen, setIsSupportChatOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [policyModalType, setPolicyModalType] = useState<'privacy' | 'terms' | 'cancellation' | null>(null);

  useEffect(() => {
    if (!authNotice) return;
    const timer = setTimeout(() => {
      clearAuthNotice();
    }, 4500);
    return () => clearTimeout(timer);
  }, [authNotice, clearAuthNotice]);

  // Search parameters from Hero
  const [searchCheckIn, setSearchCheckIn] = useState<string>('');
  const [searchCheckOut, setSearchCheckOut] = useState<string>('');
  const [searchGuests, setSearchGuests] = useState<number>(2);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener for Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial load & Firestore connection verification
  useEffect(() => {
    const init = async () => {
      await testConnection();
      await bootstrapInitialData();
      const loadedRooms = await getRooms();
      setRooms(loadedRooms);
    };
    init().catch(console.error);
  }, []);

  const refreshRooms = async () => {
    try {
      const loadedRooms = await getRooms();
      setRooms(loadedRooms);
    } catch (err) {
      console.error('Error refreshing rooms:', err);
    }
  };

  const handleHeroSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
    setSearchCheckIn(filters.checkInDate);
    setSearchCheckOut(filters.checkOutDate);
    setSearchGuests(filters.adults + filters.children);
    // Smooth scroll to rooms section
    const elem = document.getElementById('rooms');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBookRoom = (room: Room) => {
    setSelectedRoomForBooking(room);
    setIsBookingModalOpen(true);
  };

  const handleSelectOffer = (code: string) => {
    setIsBookingModalOpen(true);
  };

  const handleOpenAdmin = () => {
    if (currentUser && isAdmin) {
      setIsAdminPortalOpen(true);
    } else {
      setIsAdminLoginModalOpen(true);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (sectionId === 'services') {
      setIsCustomerServiceOpen(true);
      return;
    }
    if (sectionId === '3d-rooms') {
      const elem = document.getElementById('3d-rooms');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' });
      } else {
        setSelectedRoomFor3D(rooms[0] || null);
      }
      return;
    }

    // Handle aliases like pool, kids, city-view, tourism, dining, cooknow
    let targetId = sectionId;
    if (sectionId === 'pool') targetId = 'facilities';
    if (sectionId === 'kids') targetId = 'play-area';
    if (sectionId === 'city-view') targetId = 'rooftop';
    if (sectionId === 'attractions') targetId = 'tourism';
    if (sectionId === 'cooknow' || sectionId === 'food' || sectionId === 'dining') targetId = 'dining';

    const elem = document.getElementById(targetId) || document.getElementById(sectionId) || document.getElementById('dining');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Comprehensive multi-criteria search filtering
  let filteredRooms = rooms.filter((r) => {
    // 1. Capacity filter
    const requiredGuests = searchFilters.adults + searchFilters.children;
    if (r.totalCapacity < requiredGuests) return false;

    // 2. Budget filter
    const roomRate = r.specialPrice || r.basePrice || 999;
    if (roomRate > searchFilters.maxBudget) return false;

    // 3. View preference
    if (searchFilters.viewPreference !== 'all' && r.viewType !== searchFilters.viewPreference) {
      return false;
    }

    // 4. Category selector
    const cat = categoryFilter !== 'all' ? categoryFilter : searchFilters.category;
    if (cat !== 'all') {
      if (cat === 'city' && r.viewType !== 'city') return false;
      if (cat === 'balcony' && !r.name.toLowerCase().includes('deluxe') && !r.name.toLowerCase().includes('balcony')) return false;
      if (cat === 'budget' && (r.specialPrice || r.basePrice) > 999) return false;
      if (cat === 'family' && r.totalCapacity < 4) return false;
      if (cat === 'student' && !r.name.toLowerCase().includes('student') && (r.specialPrice || r.basePrice) > 799) return false;
    }

    // 5. Quick chip filter
    const chip = searchFilters.chipFilter;
    if (chip === 'city' && r.viewType !== 'city') return false;
    if (chip === 'top_floor' && !r.floor.toLowerCase().includes('top') && !r.floor.includes('3')) return false;
    if (chip === 'family' && r.totalCapacity < 4) return false;
    if (chip === 'couple' && !r.name.toLowerCase().includes('couple') && r.adultCapacity < 2) return false;
    if (chip === 'student' && !r.name.toLowerCase().includes('student') && (r.specialPrice || r.basePrice) > 799) return false;
    if (chip === 'budget' && (r.specialPrice || r.basePrice) > 999) return false;

    return true;
  });

  // Sorting
  if (searchFilters.sortBy === 'price_low') {
    filteredRooms.sort((a, b) => (a.specialPrice || a.basePrice) - (b.specialPrice || b.basePrice));
  } else if (searchFilters.sortBy === 'price_high') {
    filteredRooms.sort((a, b) => (b.specialPrice || b.basePrice) - (a.specialPrice || a.basePrice));
  } else if (searchFilters.sortBy === 'capacity') {
    filteredRooms.sort((a, b) => b.totalCapacity - a.totalCapacity);
  } else if (travelerPersona !== 'all') {
    filteredRooms.sort((a, b) => {
      const scoreA = computeSmartMatch(a, travelerPersona, searchFilters).matchScore;
      const scoreB = computeSmartMatch(b, travelerPersona, searchFilters).matchScore;
      return scoreB - scoreA;
    });
  }

  const handleResetFilters = () => {
    setCategoryFilter('all');
    setTravelerPersona('all');
    setSearchFilters({
      checkInDate: tomorrow.toISOString().split('T')[0],
      checkOutDate: dayAfter.toISOString().split('T')[0],
      adults: 2,
      children: 0,
      roomsCount: 1,
      category: 'all',
      maxBudget: 2500,
      viewPreference: 'all',
      sortBy: 'recommended',
      chipFilter: 'all'
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white pb-16 md:pb-0">
      {/* Sunlit Festival Magic Ambient Particles */}
      <FestivalEffects />

      {/* Dynamic Festival Announcement Banner */}
      {themeMeta.id !== 'regular' && (
        <div 
          className="text-white text-xs py-2 px-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shadow-inner"
          style={{ background: `linear-gradient(90deg, ${themeMeta.secondaryColor}, #1e1b4b)` }}
        >
          <div className="flex items-center gap-2 max-w-4xl truncate">
            <span className="font-bold text-amber-300 shrink-0">{themeMeta.badge}</span>
            <span className="text-white/90 truncate">{config.customGreeting || themeMeta.bannerMessage}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-[11px]">
            <button 
              onClick={toggleUserAnimation}
              className="text-white/80 hover:text-white underline cursor-pointer"
            >
              {userAnimationOverride ? 'Pause Effects' : 'Play Effects'}
            </button>
          </div>
        </div>
      )}

      {/* 3-Zone Top Navigation */}
      <Navbar
        onOpenBooking={() => {
          setSelectedRoomForBooking(rooms[0] || null);
          setIsBookingModalOpen(true);
        }}
        onOpenAuth={(accountType = 'customer') => {
          setAuthInitialType(accountType);
          setIsAuthModalOpen(true);
        }}
        onOpenAdminLogin={handleOpenAdmin}
        onOpenMyBookings={() => setIsMyBookingsOpen(true)}
        onOpenCustomerService={() => setIsCustomerServiceOpen(true)}
        onOpen3DViewer={() => {
          setSelectedRoomFor3D(rooms[0] || null);
        }}
        onOpenPlayAndEarn={() => setIsPlayAndEarnOpen(true)}
        onOpenSupportChat={() => setIsSupportChatOpen(true)}
        onOpenSearch={() => setIsGlobalSearchOpen(true)}
        activeSection={activeSection}
        onNavigate={scrollToSection}
      />

      <main className="flex-1">
        {/* Hero Banner with Availability Engine */}
        <Hero
          onSearch={handleHeroSearch}
          onExploreRooms={() => scrollToSection('rooms')}
          onExplorePlayArea={() => scrollToSection('play-area')}
          onExploreRooftop={() => scrollToSection('rooftop')}
          onExploreDining={() => scrollToSection('dining')}
          onOpen3DViewer={() => setSelectedRoomFor3D(rooms[0] || null)}
          onOpenPlayAndEarn={() => setIsPlayAndEarnOpen(true)}
          onOpenCustomerAuth={() => {
            setAuthInitialType('customer');
            setIsAuthModalOpen(true);
          }}
          onOpenAdminAuth={handleOpenAdmin}
          guestName={currentUser ? (userProfile?.fullName || currentUser.displayName || 'Guest') : null}
          isAdmin={isAdmin}
          activeFilters={searchFilters}
        />

        {/* Rooms & Dynamic Inventory Section */}
        <section id="rooms" className="py-16 bg-stone-50/50 border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-100/70 px-3 py-1 rounded-md border border-amber-200">
                <Bed className="w-3.5 h-3.5 text-amber-700" />
                <span>11+ Clean & Comfortable Rooms</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                Rooms & Transparent Pricing
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                Choose from ground-floor studios, sunlit balcony rooms, and premier top-floor rooms with panoramic city views. All bookings include swimming pool and kids play area privileges.
              </p>
            </div>

            {/* Smart Traveler Persona Selector Bar */}
            <div className="mt-8 max-w-4xl mx-auto space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-500 font-semibold px-2">
                <span className="flex items-center gap-1.5 text-stone-800">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Smart Room Match for Your Journey:</span>
                </span>
                <span className="text-[11px] text-amber-800 font-medium hidden sm:inline">
                  AI-evaluated room scores tailored to your travel style
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-stone-100/80 rounded-2xl border border-stone-200">
                {TRAVELER_PERSONAS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setTravelerPersona(p.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      travelerPersona === p.id
                        ? 'bg-amber-800 text-white shadow-xs font-bold'
                        : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200/80'
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
              {travelerPersona !== 'all' && (
                <div className="text-center text-[11px] text-amber-900 bg-amber-50/80 py-1.5 px-3 rounded-lg border border-amber-200/60 max-w-2xl mx-auto">
                  💡 {TRAVELER_PERSONAS.find(p => p.id === travelerPersona)?.description}
                </div>
              )}
            </div>

            {/* Room Categories Segmented Filter */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  setCategoryFilter('all');
                  setSearchFilters(prev => ({ ...prev, category: 'all', chipFilter: 'all' }));
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  categoryFilter === 'all' && searchFilters.chipFilter === 'all'
                    ? 'bg-amber-800 text-white shadow-xs font-semibold'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                All Rooms ({rooms.length})
              </button>
              <button
                onClick={() => {
                  setCategoryFilter('city');
                  setSearchFilters(prev => ({ ...prev, category: 'city', viewPreference: 'city' }));
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  categoryFilter === 'city'
                    ? 'bg-amber-800 text-white shadow-xs font-semibold'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                ★ Top Floor City View
              </button>
              <button
                onClick={() => {
                  setCategoryFilter('balcony');
                  setSearchFilters(prev => ({ ...prev, category: 'balcony' }));
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  categoryFilter === 'balcony'
                    ? 'bg-amber-800 text-white shadow-xs font-semibold'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Deluxe Balcony
              </button>
              <button
                onClick={() => {
                  setCategoryFilter('budget');
                  setSearchFilters(prev => ({ ...prev, category: 'budget' }));
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  categoryFilter === 'budget'
                    ? 'bg-amber-800 text-white shadow-xs font-semibold'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Budget & Student Studio
              </button>
              <button
                onClick={() => {
                  setCategoryFilter('family');
                  setSearchFilters(prev => ({ ...prev, category: 'family' }));
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  categoryFilter === 'family'
                    ? 'bg-amber-800 text-white shadow-xs font-semibold'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                Family Suites
              </button>
            </div>

            {/* Live Search Status Bar */}
            <div className="mt-6 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Showing <strong className="font-extrabold text-amber-900">{filteredRooms.length} available room{filteredRooms.length === 1 ? '' : 's'}</strong> for {searchFilters.checkInDate} to {searchFilters.checkOutDate} ({searchFilters.adults} adult{searchFilters.adults > 1 ? 's' : ''}{searchFilters.children > 0 ? `, ${searchFilters.children} child` : ''})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-medium">Sort:</span>
                <select
                  value={searchFilters.sortBy || 'recommended'}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="bg-white border border-stone-300 rounded px-2 py-1 text-xs font-medium focus:outline-none"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price_low">Lowest Price First</option>
                  <option value="price_high">Highest Price First</option>
                  <option value="capacity">Guest Capacity</option>
                </select>
                <button
                  onClick={handleResetFilters}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded text-stone-700 font-semibold cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Empty State with Alternative Dates Recommendation */}
            {filteredRooms.length === 0 ? (
              <div className="mt-10 max-w-md mx-auto text-center p-8 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                <h3 className="text-base font-bold text-stone-900">No Rooms Match These Exact Criteria</h3>
                <p className="text-xs text-stone-600">
                  Try adjusting your budget limit, reducing guests count, or exploring alternative dates.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    onClick={handleResetFilters}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    View All 11+ Rooms
                  </button>
                </div>
              </div>
            ) : (
              /* Rooms Cards Grid */
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {filteredRooms.map((room) => {
                  const smartMatch = computeSmartMatch(room, travelerPersona, searchFilters);
                  return (
                    <RoomCard
                      key={room.id}
                      room={room}
                      smartMatch={smartMatch}
                      onBook={handleBookRoom}
                      onViewDetails={(r) => setSelectedRoomForDetail(r)}
                      onView3D={(r) => setSelectedRoomFor3D(r)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 3D Room Experience Showcase Section */}
        <section id="3d-rooms" className="py-14 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 text-white border-b border-stone-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 px-3 py-1 rounded-md border border-amber-700/60 shadow-xs">
                  <Box className="w-3.5 h-3.5 text-amber-400" />
                  <span>3D Interactive Architecture</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Experience Your Room in Realistic 3D Before You Arrive
                </h2>
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                  Devashish Sunlit Homestay is proud to feature interactive Three.js 3D room models for our Tapovan accommodation. Inspect bed orientations, balcony views facing the Himalayas and Rishikesh city, ensuite bathroom layouts, and day/sunset lighting shifts.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => setSelectedRoomFor3D(rooms[0] || null)}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Compass className="w-4 h-4 text-stone-950" />
                    <span>Launch 3D Room Walk</span>
                  </button>
                  <span className="text-[11px] text-stone-400">
                    Works smoothly on mobile & desktop · Zero plugin needed
                  </span>
                </div>
              </div>

              {/* 3D Showcase Quick Preview Cards */}
              <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
                {rooms.slice(0, 4).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoomFor3D(r)}
                    className="p-3.5 bg-stone-800/80 hover:bg-stone-800 rounded-xl border border-stone-700/80 text-left transition-all hover:border-amber-500 cursor-pointer space-y-1.5 group"
                  >
                    <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wider">
                      Room {r.roomNumber}
                    </span>
                    <span className="text-xs font-bold text-white group-hover:text-amber-300 block truncate">
                      {r.name}
                    </span>
                    <span className="text-[11px] text-stone-400 block font-semibold">
                      ₹{r.basePrice}/night · {r.viewType}
                    </span>
                    <span className="text-[10px] text-amber-400/90 underline pt-1 block">
                      Explore in 3D →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Swimming Pool & Facilities */}
        <FacilitiesSection />

        {/* Dedicated Kids Play Area with 3 Daily Sessions */}
        <PlayAreaSection />

        {/* Rooftop City-View & Private Date Celebrations */}
        <RooftopSection />

        {/* Promotional Offers (Students, Couples, Long Stays) */}
        <OffersSection onSelectOffer={handleSelectOffer} />

        {/* Rishikesh & Tapovan Discovery */}
        <AttractionsSection />

        {/* CookNow Food Service Integration (Status & Guidelines) */}
        <CookNowSection />

        {/* Host Contact & Enquiries */}
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer
        onOpenPolicy={(type) => setPolicyModalType(type)}
        onOpenAdmin={handleOpenAdmin}
        onNavigate={scrollToSection}
        onOpenPlayAndEarn={() => setIsPlayAndEarnOpen(true)}
      />

      {/* MODALS */}
      {isBookingModalOpen && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          selectedRoom={selectedRoomForBooking}
          rooms={rooms}
          initialCheckIn={searchFilters.checkInDate}
          initialCheckOut={searchFilters.checkOutDate}
          initialGuests={searchFilters.adults + searchFilters.children}
          onBookingSuccess={(_ref) => {
            refreshRooms();
          }}
        />
      )}

      {selectedRoomForDetail && (
        <RoomDetailModal
          room={selectedRoomForDetail}
          onClose={() => setSelectedRoomForDetail(null)}
          onBook={handleBookRoom}
          onView3D={(r) => setSelectedRoomFor3D(r)}
        />
      )}

      {/* 3D ROOM VIEWER MODAL */}
      {selectedRoomFor3D && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="max-w-5xl w-full">
            <Room3DViewer
              room={selectedRoomFor3D}
              onClose={() => setSelectedRoomFor3D(null)}
              onBookRoom={(r) => {
                setSelectedRoomFor3D(null);
                handleBookRoom(r);
              }}
            />
          </div>
        </div>
      )}

      {/* CUSTOMER SERVICE MODAL */}
      {isCustomerServiceOpen && (
        <CustomerServiceModal
          isOpen={isCustomerServiceOpen}
          onClose={() => setIsCustomerServiceOpen(false)}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialAccountType={authInitialType}
          onAdminSuccess={() => setIsAdminPortalOpen(true)}
        />
      )}

      {isMyBookingsOpen && (
        <MyBookingsModal
          isOpen={isMyBookingsOpen}
          onClose={() => setIsMyBookingsOpen(false)}
          onOpenServiceModal={() => {
            setIsMyBookingsOpen(false);
            setIsCustomerServiceOpen(true);
          }}
        />
      )}

      {isAdminLoginModalOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginModalOpen}
          onClose={() => setIsAdminLoginModalOpen(false)}
          onSuccess={() => {
            setIsAdminLoginModalOpen(false);
            setIsAdminPortalOpen(true);
          }}
        />
      )}

      {isAdminPortalOpen && (
        <AdminPortal
          isOpen={isAdminPortalOpen}
          onClose={() => setIsAdminPortalOpen(false)}
          onRefreshData={refreshRooms}
        />
      )}

      {policyModalType && (
        <PolicyModals
          type={policyModalType}
          onClose={() => setPolicyModalType(null)}
        />
      )}

      {/* Smooth Toast Feedback for Google Sign-In / Sign-Out */}
      {authNotice && (
        <div
          role="status"
          className="fixed bottom-20 md:bottom-6 left-4 right-4 sm:left-auto sm:right-24 sm:max-w-sm z-50 animate-toastIn"
        >
          <div className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-semibold backdrop-blur-md ${
            authNotice.type === 'success'
              ? 'bg-stone-900/95 text-white border-emerald-500/40'
              : authNotice.type === 'error'
              ? 'bg-red-950/95 text-red-100 border-red-500/40'
              : 'bg-stone-900/95 text-stone-100 border-stone-700'
          }`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${authNotice.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`} />
            <span className="flex-1 leading-snug">{authNotice.message}</span>
            <button
              type="button"
              onClick={clearAuthNotice}
              className="p-1 rounded-full hover:bg-white/10 text-stone-400 hover:text-white cursor-pointer"
              aria-label="Dismiss message"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onOpenBookings={() => setIsMyBookingsOpen(true)}
        onOpenPlayAndEarn={() => setIsPlayAndEarnOpen(true)}
        onOpenAdmin={handleOpenAdmin}
        onOpenAuth={() => {
          setAuthInitialType('customer');
          setIsAuthModalOpen(true);
        }}
        isAdmin={isAdmin}
        isSignedIn={!!currentUser}
      />

      {/* HEADER TRIGGERED CUSTOMER SUPPORT CHAT */}
      {isSupportChatOpen && (
        <CustomerSupportChatModal
          isOpen={isSupportChatOpen}
          onClose={() => setIsSupportChatOpen(false)}
        />
      )}

      {/* TWO SEPARATE FLOATING ACTIONS: ASK SUNLIT AI & MESSAGE ADMIN */}
      <FloatingActionsManager
        onOpenBooking={() => setIsBookingModalOpen(true)}
      />

      {/* GLOBAL SEARCH & DISCOVERY MODAL (Cmd+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        rooms={rooms}
        onSelectRoom={handleBookRoom}
        onNavigateSection={scrollToSection}
        onOpenGuestGuide={() => setIsMyBookingsOpen(true)}
      />

      {/* SUNLIT PLAY AND EARN MODAL */}
      {isPlayAndEarnOpen && (
        <SunlitPlayAndEarn
          isOpen={isPlayAndEarnOpen}
          onClose={() => setIsPlayAndEarnOpen(false)}
          onSelectVoucherForBooking={(code) => {
            setIsBookingModalOpen(true);
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FestivalThemeProvider>
        <MainAppContent />
      </FestivalThemeProvider>
    </AuthProvider>
  );
}
