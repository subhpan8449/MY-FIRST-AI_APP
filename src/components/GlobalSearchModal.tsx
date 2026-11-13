import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  Bed,
  UtensilsCrossed,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
  Tag,
  Wifi,
  Waves
} from 'lucide-react';
import { Room } from '../types';
import { COOKNOW_CATALOG } from './CookNowSection';
import { RISHIKESH_DESTINATIONS } from './AttractionsSection';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  onSelectRoom?: (room: Room) => void;
  onNavigateSection?: (sectionId: string) => void;
  onOpenGuestGuide?: () => void;
}

interface SearchItem {
  id: string;
  type: 'room' | 'food' | 'tourism' | 'facility' | 'guide';
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  description?: string;
  actionPayload?: any;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  rooms,
  onSelectRoom,
  onNavigateSection,
  onOpenGuestGuide,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Static facilities and guest guide topics for comprehensive search
  const FACILITIES_ITEMS: SearchItem[] = [
    {
      id: 'fac-pool',
      type: 'facility',
      title: 'Himalayan Sunlit Swimming Pool',
      subtitle: 'Open 7:00 AM – 7:00 PM · Clean mountain spring water with poolside sun loungers',
      badge: 'Amenity',
      badgeColor: 'bg-blue-100 text-blue-900',
      actionPayload: 'pool-section',
    },
    {
      id: 'fac-rooftop',
      type: 'facility',
      title: 'Panoramic Ganga Rooftop Terrace',
      subtitle: 'Open 6:00 AM – 10:30 PM · 360° Himalayan valley view, evening starlight seating',
      badge: 'Amenity',
      badgeColor: 'bg-purple-100 text-purple-900',
      actionPayload: 'rooftop-section',
    },
    {
      id: 'fac-play',
      type: 'facility',
      title: 'Kids Fun & Adventure Play Area',
      subtitle: 'Safe indoor/outdoor soft play games, board games, creative corner',
      badge: 'Amenity',
      badgeColor: 'bg-amber-100 text-amber-900',
      actionPayload: 'play-area-section',
    },
    {
      id: 'guide-wifi',
      type: 'guide',
      title: 'High-Speed Guest Wi-Fi & Credentials',
      subtitle: 'SSID: Devashish_Sunlit_Guest · Password available in Guest Guide (100 Mbps fiber)',
      badge: 'Guest Guide',
      badgeColor: 'bg-emerald-100 text-emerald-900',
      actionPayload: 'guest-guide',
    },
    {
      id: 'guide-checkin',
      type: 'guide',
      title: 'Check-in (12:00 PM) & Check-out (10:00 AM) Policies',
      subtitle: 'Early check-in upon availability, secure luggage holding, digital key assistance',
      badge: 'Guest Guide',
      badgeColor: 'bg-emerald-100 text-emerald-900',
      actionPayload: 'guest-guide',
    },
  ];

  // All searchable items compiled
  const allItems: SearchItem[] = useMemo(() => {
    const list: SearchItem[] = [];

    // 1. Rooms
    rooms.forEach(r => {
      list.push({
        id: `room-${r.id}`,
        type: 'room',
        title: r.name,
        subtitle: `${r.category} · Floor ${r.floor} · ₹${r.basePrice.toLocaleString('en-IN')}/night · Up to ${r.adultCapacity + r.childCapacity} guests`,
        badge: 'Room',
        badgeColor: 'bg-amber-100 text-amber-900',
        description: r.description,
        actionPayload: r,
      });
    });

    // 2. CookNow Food items
    COOKNOW_CATALOG.forEach(f => {
      list.push({
        id: `food-${f.id}`,
        type: 'food',
        title: f.name,
        subtitle: `${f.hindiName || ''} · ${f.category} · ₹${f.price} · ${f.isVeg ? 'Pure Veg' : 'Non-Veg'} · ${f.preparationMinutes} mins`,
        badge: 'CookNow Food',
        badgeColor: 'bg-rose-100 text-rose-900',
        description: f.description,
        actionPayload: 'cooknow-section',
      });
    });

    // 3. Tourism & Rishikesh Landmarks
    RISHIKESH_DESTINATIONS.forEach(d => {
      list.push({
        id: `tour-${d.id}`,
        type: 'tourism',
        title: d.name,
        subtitle: `${d.category} · ${d.distance || 'Tapovan'} · Best: ${d.bestVisitingTime || 'All Day'}`,
        badge: 'Attraction',
        badgeColor: 'bg-cyan-100 text-cyan-900',
        description: d.description,
        actionPayload: 'attractions-section',
      });
    });

    // 4. Facilities & Guide
    list.push(...FACILITIES_ITEMS);

    return list;
  }, [rooms]);

  // Filter items matching query
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Suggest top picks when empty
      return allItems.slice(0, 8);
    }
    return allItems
      .filter(item => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.badge.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      })
      .slice(0, 12);
  }, [query, allItems]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelect(searchResults[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  const handleSelect = (item: SearchItem) => {
    onClose();
    if (item.type === 'room' && onSelectRoom) {
      onSelectRoom(item.actionPayload);
    } else if (item.type === 'guide' && onOpenGuestGuide) {
      onOpenGuestGuide();
    } else if (item.actionPayload && typeof item.actionPayload === 'string') {
      const el = document.getElementById(item.actionPayload);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (onNavigateSection) {
        onNavigateSection(item.actionPayload);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Search Bar Input */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center gap-3 bg-stone-50/50">
          <Search className="w-5 h-5 text-amber-700 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search rooms, CookNow satvik dishes, Ram Jhula, pool, Wi-Fi..."
            className="w-full bg-transparent border-none text-stone-900 text-sm sm:text-base placeholder-stone-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] font-bold text-stone-400 bg-stone-200 px-2 py-0.5 rounded border border-stone-300 hidden sm:inline">
              ESC
            </span>
          )}
        </div>

        {/* Quick Filter Badges */}
        <div className="px-4 py-2 border-b border-stone-100 bg-stone-50/30 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-stone-400 font-semibold shrink-0">Suggestions:</span>
          {['Deluxe Suite', 'Ganga View', 'Satvik Thali', 'Parmarth Aarti', 'Swimming Pool', 'Wi-Fi'].map(tag => (
            <button
              key={tag}
              onClick={() => {
                setQuery(tag);
                setSelectedIndex(0);
              }}
              className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:text-amber-900 border border-stone-200 rounded-full font-medium text-stone-700 transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-stone-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-stone-300" />
              <p className="text-sm font-bold text-stone-700">No matching results found</p>
              <p className="text-xs text-stone-400">
                Try searching for &quot;Deluxe&quot;, &quot;Aloo Paratha&quot;, &quot;Aarti&quot;, or &quot;Wi-Fi&quot;
              </p>
            </div>
          ) : (
            searchResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-50/80 border border-amber-300/80 shadow-xs'
                      : 'hover:bg-stone-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        item.type === 'room'
                          ? 'bg-amber-100 text-amber-800'
                          : item.type === 'food'
                          ? 'bg-rose-100 text-rose-800'
                          : item.type === 'tourism'
                          ? 'bg-cyan-100 text-cyan-800'
                          : item.type === 'facility'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.type === 'room' && <Bed className="w-4 h-4" />}
                      {item.type === 'food' && <UtensilsCrossed className="w-4 h-4" />}
                      {item.type === 'tourism' && <MapPin className="w-4 h-4" />}
                      {item.type === 'facility' && <Waves className="w-4 h-4" />}
                      {item.type === 'guide' && <Wifi className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm truncate">{item.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-0.5">{item.subtitle}</p>
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-amber-700 translate-x-1' : 'text-stone-300'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded font-mono text-[10px]">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded font-mono text-[10px]">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded font-mono text-[10px]">ENTER</kbd> to select
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-600 hover:text-stone-900 font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
