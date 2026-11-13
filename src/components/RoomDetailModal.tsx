import React, { useState, useEffect } from 'react';
import { Room } from '../types';
import { X, Check, Bed, Users, Eye, Waves, Baby, ShieldCheck, Compass, Sparkles, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { SmoothImage, DEFAULT_FALLBACK_PHOTO } from './SmoothImage';

const EXTRA_ROOM_GALLERY_PHOTOS: Record<string, string[]> = {
  city: [
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
  ],
  hill: [
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'
  ],
  garden: [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
  ],
  standard: [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    DEFAULT_FALLBACK_PHOTO
  ]
};

interface RoomDetailModalProps {
  room: Room | null;
  onClose: () => void;
  onBook: (room: Room) => void;
  onView3D?: (room: Room) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ room, onClose, onBook, onView3D }) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    setActivePhotoIndex(0);
  }, [room?.id]);

  if (!room) return null;

  const basePhotos = (room.images || []).filter(Boolean);
  const supplement = EXTRA_ROOM_GALLERY_PHOTOS[room.viewType] || EXTRA_ROOM_GALLERY_PHOTOS.standard;
  const galleryPhotos = Array.from(new Set([...basePhotos, ...supplement])).slice(0, 4);
  const activePhoto = galleryPhotos[activePhotoIndex] || DEFAULT_FALLBACK_PHOTO;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
        {/* Header Breadcrumb */}
        <div className="bg-stone-100 px-6 py-2 border-b border-stone-200 flex items-center justify-between text-xs text-stone-600 sticky top-0 z-20">
          <div className="flex items-center gap-1.5 font-medium">
            <span onClick={onClose} className="hover:text-amber-800 cursor-pointer">Home</span>
            <span>&gt;</span>
            <span onClick={onClose} className="hover:text-amber-800 cursor-pointer">Rooms</span>
            <span>&gt;</span>
            <span className="text-stone-900 font-bold">Room #{room.roomNumber} ({room.category})</span>
          </div>
          <button
            onClick={onClose}
            className="text-amber-800 hover:text-amber-950 font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            ← Back to Rooms
          </button>
        </div>

        {/* Header Visual with Smooth Multi-Photo Carousel */}
        <div className="relative h-72 bg-stone-900 overflow-hidden flex items-center justify-center border-b border-stone-200">
          <SmoothImage
            src={activePhoto}
            fallbackSrc={DEFAULT_FALLBACK_PHOTO}
            alt={`${room.name} - Photo ${activePhotoIndex + 1}`}
            priority
            wrapperClassName="absolute inset-0 w-full h-full"
            className="w-full h-full object-cover"
          />

          {/* Gradient Overlay for legibility */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-black/30" />

          {/* Top Back and Close Controls */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-900 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 border border-white/20 backdrop-blur-xs"
          >
            ← Back to Rooms
          </button>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-stone-900/80 hover:bg-stone-900 text-white shadow-md transition-colors cursor-pointer border border-white/20 backdrop-blur-xs"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Carousel Prev/Next Controls */}
          {galleryPhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActivePhotoIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white border border-white/20 backdrop-blur-xs transition cursor-pointer"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActivePhotoIndex((prev) => (prev + 1) % galleryPhotos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white border border-white/20 backdrop-blur-xs transition cursor-pointer"
                aria-label="Next photo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="relative z-10 text-center p-6 space-y-2 text-white pointer-events-none">
            <span className="inline-block text-xs font-bold uppercase tracking-wider text-amber-200 bg-amber-950/80 px-3 py-1 rounded-md border border-amber-500/30 shadow-xs">
              Room #{room.roomNumber} · {room.floor}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold drop-shadow-md">{room.name}</h2>
            <p className="text-xs text-amber-100 drop-shadow-xs">Devashish Sunlit Homestay · Tapovan, Rishikesh</p>
          </div>

          {room.viewType === 'city' && (
            <div className="absolute bottom-3 left-3 z-20 bg-stone-900/90 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-md border border-amber-400/30">
              <Eye className="w-4 h-4" />
              <span>Panoramic Top-Floor City View</span>
            </div>
          )}

          {onView3D && (
            <button
              onClick={() => {
                onClose();
                onView3D(room);
              }}
              className="absolute bottom-3 right-3 z-20 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-md flex items-center gap-1.5 shadow-md cursor-pointer border border-amber-500"
            >
              <Compass className="w-4 h-4 text-amber-200" />
              <span>Launch 3D Room Tour</span>
            </button>
          )}
        </div>

        {/* Interactive Multi-Photo Thumbnail Strip */}
        {galleryPhotos.length > 1 && (
          <div className="px-6 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {galleryPhotos.map((photoUrl, idx) => (
                <button
                  key={photoUrl}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`relative w-16 h-11 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    idx === activePhotoIndex
                      ? 'border-amber-600 ring-2 ring-amber-500/30 scale-105'
                      : 'border-stone-200 opacity-75 hover:opacity-100'
                  }`}
                >
                  <SmoothImage
                    src={photoUrl}
                    fallbackSrc={DEFAULT_FALLBACK_PHOTO}
                    alt={`${room.name} view ${idx + 1}`}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            <span className="text-[11px] font-semibold text-stone-500 shrink-0 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-amber-700" />
              <span>{activePhotoIndex + 1} / {galleryPhotos.length}</span>
            </span>
          </div>
        )}

        {/* Body content */}
        <div className="p-6 space-y-6">
          {/* Key Specs Row */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-900/10 text-center">
            <div>
              <span className="block text-[11px] text-stone-500 font-medium">Beds</span>
              <span className="text-sm font-bold text-stone-900 flex items-center justify-center gap-1 mt-0.5">
                <Bed className="w-4 h-4 text-amber-700" />
                <span>{room.bedType}</span>
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-stone-500 font-medium">Capacity</span>
              <span className="text-sm font-bold text-stone-900 flex items-center justify-center gap-1 mt-0.5">
                <Users className="w-4 h-4 text-amber-700" />
                <span>{room.adultCapacity} Adults, {room.childCapacity} Child</span>
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-stone-500 font-medium">View</span>
              <span className="text-sm font-bold text-stone-900 capitalize flex items-center justify-center gap-1 mt-0.5">
                <Eye className="w-4 h-4 text-amber-700" />
                <span>{room.viewType} View</span>
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              Room Description
            </h4>
            <p className="text-sm text-stone-700 leading-relaxed">
              {room.description}
            </p>
          </div>

          {/* Amenities Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Verified Amenities & Privileges
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {room.amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-stone-700">
                  <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Recommendation Fit & Loyalty Rewards Callout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-1.5 text-xs">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Smart Traveler Recommendation</span>
              </span>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                {room.viewType === 'city'
                  ? 'Top pick for travelers seeking panoramic sunset city views from the highest vantage point in Tapovan.'
                  : room.totalCapacity >= 3
                  ? 'Highly recommended for families & groups desiring generous multi-bed comfort and ground/lift convenience.'
                  : 'Perfect for spiritual seekers, yogis, and remote workers looking for serene natural morning light.'}
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-1.5 text-xs">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Sunlit Rewards Club Privileges</span>
              </span>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Earn <strong className="text-emerald-900 font-bold">+{Math.floor((room.specialPrice || room.basePrice) / 10)} Points</strong> on this stay. Redeemable for instant billing discounts, late check-outs, and rooftop tea.
              </p>
            </div>
          </div>

          {/* Homestay Free Amenities Callout */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-800" />
              <span>Complimentary Facilities Included With Your Booking</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700 pt-1">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-amber-700" />
                <span>Swimming Pool Access (7 AM - 7 PM)</span>
              </div>
              <div className="flex items-center gap-2">
                <Baby className="w-4 h-4 text-amber-700" />
                <span>Kids Play Area (3 Sessions Daily)</span>
              </div>
            </div>
          </div>

          {/* Footer with Price and Book button */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold text-amber-950 tabular-nums">
                  ₹{room.specialPrice || room.basePrice}
                </span>
                <span className="text-xs text-stone-500">/ night</span>
              </div>
              <span className="text-[11px] text-stone-500">
                Transparent homestay pricing · Taxes included
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors cursor-pointer"
              >
                ← Back to Rooms
              </button>
              <button
                onClick={() => {
                  onClose();
                  onBook(room);
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Proceed to Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
