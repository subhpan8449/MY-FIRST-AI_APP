import { Room, TravelerPersona, RoomSmartMatch, SearchFilters } from '../types';

export const TRAVELER_PERSONAS: { id: TravelerPersona; label: string; icon: string; description: string }[] = [
  {
    id: 'all',
    label: 'All Rooms',
    icon: '✨',
    description: 'Explore all available clean & sunlit rooms in Tapovan, Rishikesh'
  },
  {
    id: 'couple',
    label: 'Couples & Romantic',
    icon: '💑',
    description: 'King beds, private balconies, scenic sunset & Rishikesh city view'
  },
  {
    id: 'family',
    label: 'Families with Kids',
    icon: '👨‍👩‍👧',
    description: 'Spacious suites, multiple beds, close to play area & swimming pool'
  },
  {
    id: 'student_remote',
    label: 'Remote Work & Students',
    icon: '💻',
    description: 'High-speed Wi-Fi, work desks, kettle, quiet atmosphere & student discounts'
  },
  {
    id: 'spiritual_yoga',
    label: 'Yogi & Spiritual Seekers',
    icon: '🧘',
    description: 'Quiet sunlit rooms, morning natural light, walking distance to Parmarth & Ganga'
  },
  {
    id: 'budget_solo',
    label: 'Solo & Budget Travelers',
    icon: '🎒',
    description: 'Affordable homestay rates, hot water, free pool access, secure lockers'
  }
];

export function computeSmartMatch(
  room: Room,
  persona: TravelerPersona = 'all',
  filters?: Partial<SearchFilters>
): RoomSmartMatch {
  let score = 75; // baseline
  const reasons: string[] = [];
  const highlightedAmenities: string[] = [];
  let badge = '';

  const nameLower = room.name.toLowerCase();
  const descLower = room.description.toLowerCase();
  const catLower = room.category.toLowerCase();
  const price = room.specialPrice || room.basePrice;
  const isCityView = room.viewType === 'city';
  const hasBalcony = catLower.includes('balcony') || descLower.includes('balcony') || isCityView;

  switch (persona) {
    case 'couple':
      badge = 'Best Match for Couples';
      if (room.bedType.toLowerCase().includes('king') || room.bedType.toLowerCase().includes('queen')) {
        score += 12;
        reasons.push('Comfortable King/Queen-size bed with premium linens');
      }
      if (hasBalcony) {
        score += 15;
        reasons.push('Private balcony with sunset view over Tapovan hills');
        highlightedAmenities.push('Private Balcony');
      }
      if (isCityView) {
        score += 10;
        reasons.push('Panoramic Rishikesh city view from upper floor');
        highlightedAmenities.push('Panoramic City View');
      }
      if (catLower.includes('deluxe') || catLower.includes('suite')) {
        score += 8;
      }
      break;

    case 'family':
      badge = 'Top Pick for Families';
      if (room.totalCapacity >= 3) {
        score += 15;
        reasons.push(`Accommodates up to ${room.totalCapacity} guests comfortably`);
      }
      if (room.childCapacity >= 1) {
        score += 10;
        reasons.push('Child-friendly bedding with complimentary play area access');
        highlightedAmenities.push('Kids Play Area Access');
      }
      if (room.floor.toLowerCase().includes('ground') || room.floor.toLowerCase().includes('1st')) {
        score += 8;
        reasons.push('Easy ground or first-floor accessibility for family luggage');
      }
      reasons.push('Free family leisure swimming pool privileges included');
      highlightedAmenities.push('Complimentary Swimming Pool');
      break;

    case 'student_remote':
      badge = 'Ideal for Remote Work & Study';
      if (room.amenities.some(a => a.toLowerCase().includes('wi-fi') || a.toLowerCase().includes('wifi'))) {
        score += 15;
        reasons.push('High-speed Wi-Fi router coverage for video calls and study');
        highlightedAmenities.push('High-Speed Wi-Fi');
      }
      if (room.studentPrice || room.basePrice <= 1500) {
        score += 14;
        reasons.push('Eligible for STUDENT500 promo code discounts');
        highlightedAmenities.push('Student Discount Eligible');
      }
      if (room.amenities.some(a => a.toLowerCase().includes('kettle') || a.toLowerCase().includes('tea'))) {
        score += 6;
        reasons.push('In-room electric kettle for tea and coffee while working');
      }
      reasons.push('Quiet residential lane away from main highway noise');
      break;

    case 'spiritual_yoga':
      badge = 'Yogi & Pilgrim Favorite';
      if (descLower.includes('sunlit') || nameLower.includes('sunlit') || descLower.includes('morning')) {
        score += 16;
        reasons.push('Generous natural morning sunlight ideal for pranayama and meditation');
        highlightedAmenities.push('Natural Morning Sunlight');
      }
      if (room.floor.toLowerCase().includes('2nd') || room.floor.toLowerCase().includes('top') || isCityView) {
        score += 10;
        reasons.push('Top floor serenity with peaceful mountain breezes');
      }
      reasons.push('10-minute walk to Swarg Ashram, Ram Jhula and Ganga Ghats');
      highlightedAmenities.push('Near Ganga Ghats');
      break;

    case 'budget_solo':
      badge = 'Best Value for Solo Travelers';
      if (price <= 1200) {
        score += 18;
        reasons.push(`Budget-friendly rate of ₹${price}/night with all homestay facilities`);
      } else if (price <= 1600) {
        score += 10;
        reasons.push('Transparent all-inclusive rate with zero hidden resort fees');
      }
      reasons.push('Hot shower 24/7, clean filtered drinking water, and secure room');
      highlightedAmenities.push('Hot Shower 24/7');
      highlightedAmenities.push('24/7 RO Drinking Water');
      break;

    default: // 'all'
      badge = isCityView ? 'Panoramic City View' : hasBalcony ? 'Balcony Retreat' : 'Sunlit Comfort';
      if (room.specialPrice && room.specialPrice < room.basePrice) {
        score += 12;
        reasons.push(`Special rate active: Save ₹${room.basePrice - room.specialPrice} per night`);
      }
      if (isCityView) reasons.push('Scenic Rishikesh city view');
      reasons.push('Includes swimming pool and kids play area access');
      highlightedAmenities.push('Swimming Pool Access');
      break;
  }

  // Filter adjustments if user has specific constraints
  if (filters) {
    if (filters.adults && room.adultCapacity >= filters.adults) {
      score += 5;
    }
    if (filters.viewPreference && filters.viewPreference !== 'all') {
      if (room.viewType === filters.viewPreference) {
        score += 10;
        reasons.push(`Matches your requested ${filters.viewPreference} view preference`);
      }
    }
    if (filters.maxBudget && price <= filters.maxBudget) {
      score += 5;
    }
  }

  // Cap score between 70 and 99
  const finalScore = Math.min(99, Math.max(70, score));

  return {
    room,
    matchScore: finalScore,
    isTopMatch: finalScore >= 92,
    personaBadge: badge,
    matchReasons: reasons.slice(0, 3),
    highlightedAmenities: highlightedAmenities.slice(0, 2)
  };
}

export function computeSmartMatches(
  rooms: Room[],
  persona: TravelerPersona = 'all',
  filters?: Partial<SearchFilters>
): RoomSmartMatch[] {
  return rooms
    .map(r => computeSmartMatch(r, persona, filters))
    .sort((a, b) => b.matchScore - a.matchScore);
}
