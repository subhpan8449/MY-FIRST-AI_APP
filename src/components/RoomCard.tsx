import React from 'react';
import { Room, RoomSmartMatch } from '../types';
import { Bed, Users, Eye, Check, Calendar, Sparkles, Compass, ShieldCheck, Award } from 'lucide-react';
import { SmoothImage, DEFAULT_FALLBACK_PHOTO } from './SmoothImage';

const getRoomFallbackPhoto = (room: Room): string => {
  if (room.viewType === 'city') {
    return 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80';
  }
  if (room.viewType === 'hill') {
    return 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80';
  }
  if (room.totalCapacity >= 4) {
    return 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80';
  }
  return DEFAULT_FALLBACK_PHOTO;
};

interface RoomCardProps {
  room: Room;
  smartMatch?: RoomSmartMatch;
  onBook: (room: Room) => void;
  onViewDetails: (room: Room) => void;
  onView3D?: (room: Room) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, smartMatch, onBook, onViewDetails, onView3D }) => {
  const isCityView = room.viewType === 'city';
  const isAvailable = room.availabilityStatus === 'available';
  const loyaltyPointsEarned = Math.floor((room.specialPrice || room.basePrice || 999) / 10);
  const fallbackPhoto = getRoomFallbackPhoto(room);
  const primaryPhoto = room.images && room.images.length > 0 && room.images[0]?.trim() ? room.images[0] : fallbackPhoto;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-all flex flex-col group">
      {/* Real Homestay Room Photography Header */}
      <div className="relative h-52 bg-stone-200 overflow-hidden border-b border-stone-100">
        <SmoothImage
          src={primaryPhoto}
          fallbackSrc={fallbackPhoto}
          alt={`${room.name} - Room #${room.roomNumber} at Devashish Sunlit Homestay`}
          wrapperClassName="w-full h-full"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/50 via-transparent to-black/20" />

        {/* Room Photo Badge */}
        <div className="absolute top-3 left-3 z-10 bg-stone-900/80 backdrop-blur-xs text-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>{room.images && room.images.length > 1 ? `${room.images.length} Room Photos` : 'Real Room Photo'}</span>
        </div>

        {/* City View Highlight Badge */}
        {isCityView && (
          <div className="absolute bottom-3 right-3 z-10 bg-stone-900/85 backdrop-blur-xs text-amber-300 text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs">
            <Eye className="w-3.5 h-3.5" />
            <span>Top Floor City View</span>
          </div>
        )}

        {/* 3D Preview Quick Trigger Badge */}
        {onView3D && (
          <button
            type="button"
            onClick={() => onView3D(room)}
            className="absolute bottom-3 left-3 z-10 bg-amber-800/90 hover:bg-amber-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-amber-300" />
            <span>View in 3D</span>
          </button>
        )}

        {/* Room Number & Availability Indicator */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase backdrop-blur-xs ${
              isAvailable ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}
          >
            {room.availabilityStatus}
          </span>
          <span className="bg-white/95 backdrop-blur-xs text-stone-800 text-xs font-bold px-2 py-0.5 rounded border border-stone-200 shadow-xs">
            #{room.roomNumber}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Smart Recommendation Match Badge */}
          {smartMatch && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                smartMatch.isTopMatch ? 'bg-amber-600 text-white border-amber-700 shadow-2xs' : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}>
                <Sparkles className="w-3 h-3" />
                <span>{smartMatch.matchScore}% Match</span>
              </span>
              <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                {smartMatch.personaBadge}
              </span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                {room.category}
              </span>
              <h3 className="text-lg font-bold text-stone-900 group-hover:text-amber-800 transition-colors">
                {room.name}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {room.floor} · {room.bedType} · {room.viewType} View
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {room.description}
          </p>

          {/* Smart Match Reason Highlight */}
          {smartMatch?.matchReasons && smartMatch.matchReasons.length > 0 && (
            <div className="mt-2.5 p-2 bg-amber-50/70 rounded-lg border border-amber-200/60 text-[11px] text-amber-950 font-medium flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="truncate">{smartMatch.matchReasons[0]}</span>
            </div>
          )}

          {/* Capacity and specs */}
          <div className="mt-3 flex items-center gap-3 text-xs text-stone-600 font-medium">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              <span>Up to {room.totalCapacity} Guests ({room.adultCapacity} Adults)</span>
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-stone-400" />
              <span>{room.beds} Bed{room.beds > 1 ? 's' : ''}</span>
            </span>
          </div>

          {/* Amenities snippet */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {room.amenities.slice(0, 3).map((amenity, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-[11px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded"
              >
                <Check className="w-3 h-3 text-amber-700" />
                <span>{amenity}</span>
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="text-[11px] text-stone-400 self-center">
                +{room.amenities.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Pricing & CTA Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold text-amber-950 tabular-nums">
                ₹{room.specialPrice || room.basePrice}
              </span>
              <span className="text-xs text-stone-500 font-medium">/ night</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 ml-1">
                <Award className="w-3 h-3 text-amber-700" />
                +{loyaltyPointsEarned} Pts
              </span>
            </div>
            {room.specialPrice && room.specialPrice < room.basePrice && (
              <span className="text-[11px] text-stone-400 line-through tabular-nums">
                ₹{room.basePrice}
              </span>
            )}
            <span className="block text-[10px] text-emerald-700 font-medium">
              Free Pool & Kids Play Area Included · No Hidden Fees
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onViewDetails(room)}
              className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              Details
            </button>
            <button
              onClick={() => onBook(room)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
