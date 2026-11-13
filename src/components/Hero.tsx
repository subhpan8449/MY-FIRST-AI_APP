import React, { useState } from 'react';
import { Calendar, Users, Waves, Baby, Eye, Sparkles, MapPin, Search, RotateCcw, Filter, Utensils, Compass, Bed, ShieldCheck } from 'lucide-react';
import { SearchFilters } from '../types';
import { SmoothImage } from './SmoothImage';

const HERO_BACKDROP_PHOTO =
  'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1600&q=85';
const HERO_POOL_PHOTO =
  'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1000&q=80';
const HERO_PLAY_AREA_PHOTO =
  'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=1000&q=80';
const HERO_ROOFTOP_PHOTO =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80';

interface HeroProps {
  onSearch: (filters: SearchFilters) => void;
  onExploreRooms: () => void;
  onExplorePlayArea: () => void;
  onExploreRooftop: () => void;
  onExploreDining?: () => void;
  onOpen3DViewer?: () => void;
  onOpenPlayAndEarn?: () => void;
  onOpenCustomerAuth?: () => void;
  onOpenAdminAuth?: () => void;
  guestName?: string | null;
  isAdmin?: boolean;
  activeFilters?: SearchFilters;
}

export const Hero: React.FC<HeroProps> = ({
  onSearch,
  onExploreRooms,
  onExplorePlayArea,
  onExploreRooftop,
  onExploreDining,
  onOpen3DViewer,
  onOpenPlayAndEarn,
  onOpenCustomerAuth,
  onOpenAdminAuth,
  guestName,
  isAdmin,
  activeFilters
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [checkIn, setCheckIn] = useState(
    activeFilters?.checkInDate || tomorrow.toISOString().split('T')[0]
  );
  const [checkOut, setCheckOut] = useState(
    activeFilters?.checkOutDate || dayAfter.toISOString().split('T')[0]
  );
  const [adults, setAdults] = useState(activeFilters?.adults || 2);
  const [childrenCount, setChildrenCount] = useState(activeFilters?.children || 0);
  const [roomsCount, setRoomsCount] = useState(activeFilters?.roomsCount || 1);
  const [category, setCategory] = useState(activeFilters?.category || 'all');
  const [maxBudget, setMaxBudget] = useState(activeFilters?.maxBudget || 2500);
  const [viewPreference, setViewPreference] = useState<'all' | 'city' | 'hill' | 'garden'>(
    activeFilters?.viewPreference || 'all'
  );
  const [sortBy, setSortBy] = useState<'recommended' | 'price_low' | 'price_high' | 'capacity'>(
    activeFilters?.sortBy || 'recommended'
  );
  const [chipFilter, setChipFilter] = useState<'all' | 'family' | 'couple' | 'budget' | 'student' | 'city' | 'top_floor'>(
    activeFilters?.chipFilter || 'all'
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch({
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults,
      children: childrenCount,
      roomsCount,
      category,
      maxBudget,
      viewPreference,
      sortBy,
      chipFilter
    });
  };

  const handleResetFilters = () => {
    const defaultIn = tomorrow.toISOString().split('T')[0];
    const defaultOut = dayAfter.toISOString().split('T')[0];
    setCheckIn(defaultIn);
    setCheckOut(defaultOut);
    setAdults(2);
    setChildrenCount(0);
    setRoomsCount(1);
    setCategory('all');
    setMaxBudget(2500);
    setViewPreference('all');
    setSortBy('recommended');
    setChipFilter('all');

    onSearch({
      checkInDate: defaultIn,
      checkOutDate: defaultOut,
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

  const handleChipClick = (filter: 'all' | 'family' | 'couple' | 'budget' | 'student' | 'city' | 'top_floor') => {
    setChipFilter(filter);
    onSearch({
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults,
      children: childrenCount,
      roomsCount,
      category,
      maxBudget,
      viewPreference: filter === 'city' || filter === 'top_floor' ? 'city' : viewPreference,
      sortBy,
      chipFilter: filter
    });
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-amber-50/70 via-stone-50 to-white pb-16 lg:pb-20 border-b border-stone-200">
      {/* Real Himalayan & Ganga Scenic Hero Backdrop Banner */}
      <div className="relative overflow-hidden pt-10 pb-20 lg:pt-14 lg:pb-24 bg-stone-900">
        <SmoothImage
          src={HERO_BACKDROP_PHOTO}
          fallbackSrc={HERO_ROOFTOP_PHOTO}
          alt="Devashish Sunlit Homestay in Tapovan, Rishikesh overlooking Himalayan foothills and the sacred Ganga"
          priority
          wrapperClassName="!absolute inset-0 w-full h-full"
          className="w-full h-full object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/75 via-stone-950/60 to-stone-950/85" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Main Hero Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-200 bg-amber-950/70 backdrop-blur-xs px-3.5 py-1 rounded-md border border-amber-500/40 shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Tapovan, Rishikesh · Himalayan Foothills</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
              Sunlit, Clean &amp; Truly Affordable Hospitality in Rishikesh
            </h1>

            <p className="text-base sm:text-lg text-stone-200 leading-relaxed max-w-2xl mx-auto drop-shadow-xs">
              A welcoming homestay for students, families, couples, and solo travelers.
              Enjoy sparkling pool access, a dedicated kids play area, and panoramic top-floor city views.
            </p>

            {/* Value Badges with typographic separators */}
            <div className="pt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-amber-100 font-medium">
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <Waves className="w-4 h-4 text-cyan-300" /> Swimming Pool Included
              </span>
              <span aria-hidden="true" className="text-stone-400">·</span>
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <Baby className="w-4 h-4 text-amber-300" /> Kids Play Area (3 Sessions Daily)
              </span>
              <span aria-hidden="true" className="text-stone-400">·</span>
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <Eye className="w-4 h-4 text-orange-300" /> Top-Floor City Vista
              </span>
              <span aria-hidden="true" className="text-stone-400">·</span>
              <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Sparkles className="w-4 h-4 text-amber-300" /> Direct Rates: ₹599 – ₹1,599
              </span>
            </div>

            {/* Super-App Quick Action Launchpad */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onExploreRooms}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Explore Rooms</span>
              </button>

              {onExploreDining && (
                <button
                  type="button"
                  onClick={onExploreDining}
                  className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-xs font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Utensils className="w-3.5 h-3.5 text-amber-300" />
                  <span>CookNow Food</span>
                </button>
              )}

              {onOpen3DViewer && (
                <button
                  type="button"
                  onClick={onOpen3DViewer}
                  className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-xs font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-300" />
                  <span>3D Room Tour</span>
                </button>
              )}

              {onOpenPlayAndEarn && (
                <button
                  type="button"
                  onClick={onOpenPlayAndEarn}
                  className="px-4 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-500/40 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Play &amp; Earn</span>
                </button>
              )}

              {!guestName && onOpenCustomerAuth && (
                <button
                  type="button"
                  onClick={onOpenCustomerAuth}
                  className="px-4 py-2 rounded-xl bg-white text-stone-900 hover:bg-stone-100 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Customer Google Login</span>
                </button>
              )}

              {guestName && (
                <span className="px-3.5 py-2 rounded-xl bg-emerald-950/75 text-emerald-200 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 backdrop-blur-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Welcome, {guestName.split(' ')[0]}</span>
                </span>
              )}

              {onOpenAdminAuth && (
                <button
                  type="button"
                  onClick={onOpenAdminAuth}
                  className="px-3.5 py-2 rounded-xl bg-stone-900/80 hover:bg-stone-950 text-amber-200 border border-amber-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAdmin ? 'Open Admin Corner' : 'Admin Google Login'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 -mt-10">
        {/* COMPREHENSIVE ADVANCED ROOM SEARCH PANEL */}
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-stone-200/90 overflow-hidden">
          <div className="bg-amber-900 px-6 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-300" />
              <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase">
                Find Available Rooms & Instant Direct Booking
              </h2>
            </div>
            <span className="text-[11px] text-amber-200 hidden sm:inline">
              Real-time availability · No booking fee
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} className="p-4 sm:p-6 space-y-4">
            {/* Row 1: Check-in, Check-out, Adults/Children, Rooms Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Check-In */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Check-In Date</span>
                </label>
                <input
                  type="date"
                  value={checkIn}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    if (new Date(e.target.value) >= new Date(checkOut)) {
                      const next = new Date(e.target.value);
                      next.setDate(next.getDate() + 1);
                      setCheckOut(next.toISOString().split('T')[0]);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
                  required
                />
              </div>

              {/* Check-Out */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Check-Out Date</span>
                </label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
                  required
                />
              </div>

              {/* Guests (Adults & Children) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  <span>Guests Capacity</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-1/2 px-2 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                  <select
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(Number(e.target.value))}
                    className="w-1/2 px-2 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  >
                    {[0, 1, 2, 3].map(n => (
                      <option key={n} value={n}>{n} Child{n > 1 ? 'ren' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rooms Count */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  Number of Rooms
                </label>
                <select
                  value={roomsCount}
                  onChange={(e) => setRoomsCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  {[1, 2, 3, 4].map(n => (
                    <option key={n} value={n}>{n} Room{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Room Category, View Preference, Budget Range, Sort */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2 border-t border-stone-100">
              {/* Category */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">Room Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  <option value="all">All Room Categories</option>
                  <option value="budget">Budget Standard (₹599 - ₹999)</option>
                  <option value="deluxe">Deluxe & Balcony (₹1,099 - ₹1,299)</option>
                  <option value="family">Family Rooms & Suites</option>
                  <option value="city">Top Floor City View</option>
                  <option value="student">Student Budget Trainee</option>
                </select>
              </div>

              {/* View Preference */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">View Preference</label>
                <select
                  value={viewPreference}
                  onChange={(e) => setViewPreference(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  <option value="all">Any View (All Rooms)</option>
                  <option value="city">Panoramic City View (Top Floor)</option>
                  <option value="hill">Himalayan Hill / Mountain View</option>
                  <option value="garden">Courtyard Green Garden</option>
                </select>
              </div>

              {/* Budget Range Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-700">Budget Range</span>
                  <span className="font-bold text-amber-900">Up to ₹{maxBudget}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="2500"
                  step="100"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(Number(e.target.value))}
                  className="w-full accent-amber-700 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>₹500</span>
                  <span>₹1,500</span>
                  <span>₹2,500+</span>
                </div>
              </div>

              {/* Search Actions */}
              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 h-[38px] px-4 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Check Availability</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  title="Reset Search Filters"
                  className="h-[38px] px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Row 3: Quick Filter Chips */}
            <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-stone-400" />
                <span>Filters:</span>
              </span>

              <button
                type="button"
                onClick={() => handleChipClick('all')}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                  chipFilter === 'all'
                    ? 'bg-amber-800 text-white font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                All Rooms
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('city')}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                  chipFilter === 'city'
                    ? 'bg-amber-800 text-white font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                ★ City View
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('top_floor')}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                  chipFilter === 'top_floor'
                    ? 'bg-amber-800 text-white font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Top Floor
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('family')}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                  chipFilter === 'family'
                    ? 'bg-amber-800 text-white font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Family Rooms
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('couple')}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                  chipFilter === 'couple'
                    ? 'bg-amber-800 text-white font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Couple Special
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('student')}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                  chipFilter === 'student'
                    ? 'bg-amber-800 text-white font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Student Friendly (₹500-₹600)
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('budget')}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors cursor-pointer ${
                  chipFilter === 'budget'
                    ? 'bg-amber-800 text-white font-bold'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Budget Economy
              </button>
            </div>
          </form>

          <div className="px-6 py-2 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span>Free cancellation up to 48 hours prior · Pay at property option available</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-amber-800 font-bold hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        </div>

        {/* Feature Cards Grid (Pool, Play Area, City View) with Real Photos */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Card 1: Pool */}
          <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-amber-400 transition-all duration-300 shadow-xs hover:shadow-md flex flex-col group">
            <div className="relative aspect-[16/9] overflow-hidden">
              <SmoothImage
                src={HERO_POOL_PHOTO}
                alt="Outdoor freshwater swimming pool at Devashish Sunlit Homestay"
                wrapperClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 bg-cyan-950/80 backdrop-blur-xs text-cyan-200 text-[10px] font-bold px-2.5 py-1 rounded-md border border-cyan-500/30">
                <Waves className="w-3.5 h-3.5" />
                <span>Complimentary Pool</span>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">Leisure Swimming Pool</h3>
                <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                  Included with all room bookings. Clean freshwater open daily with scheduled maintenance intervals for peak hygiene.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">7:00 AM – 7:30 PM</span>
                <button onClick={onExploreRooms} className="text-amber-800 font-semibold hover:underline cursor-pointer">
                  View Rooms →
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Play Area */}
          <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-amber-400 transition-all duration-300 shadow-xs hover:shadow-md flex flex-col group">
            <div className="relative aspect-[16/9] overflow-hidden">
              <SmoothImage
                src={HERO_PLAY_AREA_PHOTO}
                alt="Dedicated children soft-mat play area and activity zone"
                wrapperClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 bg-amber-950/80 backdrop-blur-xs text-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-md border border-amber-500/30">
                <Baby className="w-3.5 h-3.5" />
                <span>3 Sessions Daily</span>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">Dedicated Kids Play Area</h3>
                <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                  Safe, shaded soft-mat playground with mini-slide and activity stations. Three structured sessions daily for ages 2–12.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">Morning, Noon &amp; Evening</span>
                <button onClick={onExplorePlayArea} className="text-amber-800 font-semibold hover:underline cursor-pointer">
                  View Schedule →
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Top Floor City View */}
          <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-amber-400 transition-all duration-300 shadow-xs hover:shadow-md flex flex-col group">
            <div className="relative aspect-[16/9] overflow-hidden">
              <SmoothImage
                src={HERO_ROOFTOP_PHOTO}
                alt="3rd-floor panoramic city view terrace and sunset dining setup"
                wrapperClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 bg-orange-950/80 backdrop-blur-xs text-orange-200 text-[10px] font-bold px-2.5 py-1 rounded-md border border-orange-500/30">
                <Eye className="w-3.5 h-3.5" />
                <span>3rd-Floor Terrace</span>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900">3rd-Floor City View Terrace</h3>
                <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                  Panoramic view of Rishikesh city lights and Himalayan foothill ridges. Sunset tea and private date celebration packages available.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">Rooftop Experiences</span>
                <button onClick={onExploreRooftop} className="text-amber-800 font-semibold hover:underline cursor-pointer">
                  Explore Packages →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
