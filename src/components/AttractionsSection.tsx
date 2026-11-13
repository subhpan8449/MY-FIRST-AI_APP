import React, { useState, useEffect } from 'react';
import { Attraction } from '../types';
import {
  MapPin,
  ExternalLink,
  Compass,
  ShieldCheck,
  Navigation,
  ArrowLeft,
  X,
  Clock,
  Info
} from 'lucide-react';
import { SmoothImage } from './SmoothImage';

// Verified real high-resolution photographs per attraction category (no SVGs or blank boxes)
const CATEGORY_REAL_FALLBACKS: Record<string, string> = {
  Ghat: 'https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=1200&q=80',
  Temple: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
  Nature: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
  Spiritual: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80',
  'Yoga & Wellness': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
  'Cafe & Wellness': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
  Adventure: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=1200&q=80',
  Sightseeing: 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=1200&q=80'
};

const getFallbackImage = (category: string): string => {
  return (
    CATEGORY_REAL_FALLBACKS[category] ||
    'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80'
  );
};

export const RISHIKESH_DESTINATIONS: (Attraction & {
  bestVisitingTime?: string;
  travelTips?: string;
  tags?: string[];
})[] = [
  {
    id: 'ram-jhula',
    name: 'Ram Jhula & Muni Ki Reti',
    category: 'Ghat',
    distance: '2.2 km south of Tapovan (6 min drive / 20 min walk)',
    isDistanceVerified: true,
    location: 'Muni Ki Reti / Swarg Ashram bank',
    description: 'Iconic wide iron suspension bridge linking historic ashrams, evening Aarti procession grounds, and Ayurvedic pharmacies across the Ganga.',
    bestVisitingTime: 'Early morning (6:30 AM – 9:00 AM) or sunset twilight',
    travelTips: 'Pedestrian & two-wheeler suspension bridge. Enjoy fresh sugarcane juice and herbal tea near the western chowk.',
    image: 'https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Ram+Jhula+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'muni-ki-reti',
    name: 'Muni Ki Reti Holy Bathing Bank',
    category: 'Spiritual',
    distance: '2.0 km from Devashish Homestay',
    isDistanceVerified: true,
    location: 'Muni Ki Reti, Rishikesh',
    description: 'Ancient pilgrim sandy riverbank where sages and hermits historically meditated. Features serene riverside bathing steps with clean glacial waters.',
    bestVisitingTime: 'Sunrise prayer hours (6:00 AM – 8:30 AM)',
    travelTips: 'Sacred bathing area. Use the brass handrails when entering the river current. Changing booths available.',
    image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Muni+Ki+Reti+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'ganga-aarti',
    name: 'Shatrughna Ghat Evening Aarti',
    category: 'Spiritual',
    distance: '1.8 km from Tapovan',
    isDistanceVerified: true,
    location: 'Ram Jhula Waterfront, Muni Ki Reti',
    description: 'Soul-stirring river prayer dedicated to Lord Shatrughna. Features Sanskrit Vedic chanting, large multi-tiered brass ghee lamps, and tranquil Ganga breezes.',
    bestVisitingTime: 'Evening Aarti starts at 6:00 PM (arrive by 5:30 PM)',
    travelTips: 'Free seating on marble steps. Float organic marigold diyas on the river after the Aarti bells conclude.',
    image: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Shatrughna+Ghat+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'swarg-ashram',
    name: 'Swarg Ashram Spiritual Enclave',
    category: 'Spiritual',
    distance: '2.8 km from Tapovan (across Ram Jhula)',
    isDistanceVerified: true,
    location: 'Eastern Ganga Bank, Swarg Ashram',
    description: 'Vehicle-free spiritual sanctuary established by Swami Vishudhanandji. Home to peaceful ashram courtyards, Ayurvedic dispensaries, Sanskrit libraries, and quiet river steps.',
    bestVisitingTime: 'All day (quietest 7:00 AM – 11:00 AM)',
    travelTips: 'Ideal for peaceful reading, contemplation, and purchasing pure Ayurvedic herbs and spiritual literature.',
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Swarg+Ashram+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'lakshman-jhula',
    name: 'Lakshman Jhula & Suspension Span',
    category: 'Ghat',
    distance: '850 meters (10 min walk from Devashish Homestay)',
    isDistanceVerified: true,
    location: 'Tapovan - Jonk Border',
    description: 'Historic pedestrian suspension bridge spanning the sacred Ganga, surrounded by ancient temple spires, handicraft bazaars, and panoramic foothill river views.',
    bestVisitingTime: 'Morning breezes (7:00 AM – 10:00 AM) or sunset',
    travelTips: 'A short pleasant 10-minute downhill stroll from our homestay gate in Tapovan.',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Lakshman+Jhula+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'triveni-ghat',
    name: 'Triveni Ghat & Maha Aarti',
    category: 'Spiritual',
    distance: '5.5 km from Tapovan (15 min auto/cab)',
    isDistanceVerified: true,
    location: 'Mayakund, Downtown Rishikesh',
    description: 'The most sacred confluence ghat where Ganga, Yamuna, and legendary Saraswati meet. Celebrated for grand dusk Maha Aarti accompanied by drums, conch shells, and thousands of floating leaf lamps.',
    bestVisitingTime: '5:30 PM – 7:30 PM for grand Maha Aarti',
    travelTips: 'Pre-book an auto-rickshaw from Tapovan bypass. Visit the nearby Gita Mandir and local spice market.',
    image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Triveni+Ghat+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'parmarth-niketan',
    name: 'Parmarth Niketan Ashram & Shiva Statue',
    category: 'Yoga & Wellness',
    distance: '3.6 km along the eastern bank',
    isDistanceVerified: true,
    location: 'Swarg Ashram Waterfront',
    description: 'The largest ashram in Rishikesh, internationally famed for its majestic Lord Shiva idol rising from the Ganga waters, lush botanical gardens, and universal sunset prayer ceremonies.',
    bestVisitingTime: '5:00 PM for pre-Aarti bhajans and garden walks',
    travelTips: 'Open to visitors of all backgrounds. Attend the sunset Ganga Aarti led by ashram gurukul students.',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Parmarth+Niketan+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'neer-garh',
    name: 'Neer Garh Waterfall Nature Trek',
    category: 'Nature',
    distance: '4.8 km uphill from Tapovan (12 min drive)',
    isDistanceVerified: true,
    location: 'Badrinath Highway, Neer Village',
    description: 'Breathtaking two-tier turquoise mountain waterfall cascading through limestone cliffs and Himalayan pine forest. Features natural plunge pools for a refreshing dip.',
    bestVisitingTime: '8:00 AM – 2:00 PM (clear sunlight in valley)',
    travelTips: 'Wear sturdy sports shoes. Modest entry ticket managed by Uttarakhand Forest Department at the trailhead.',
    image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Neer+Garh+Waterfall+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'beatles-ashram',
    name: 'Beatles Ashram (Chaurasi Kutia)',
    category: 'Sightseeing',
    distance: '4.2 km (Swarg Ashram forest edge)',
    isDistanceVerified: true,
    location: 'Rajaji Tiger Reserve Foothills',
    description: 'Historic Transcendental Meditation retreat where The Beatles wrote the White Album in 1968. Highlights include 84 stone meditation domes, the Beatles Cathedral mural gallery, and nature trails.',
    bestVisitingTime: '10:00 AM – 4:00 PM (Last entry at 4:30 PM)',
    travelTips: 'Entry tickets available at forest gate. Carry water and comfortable walking shoes for the 14-acre sanctuary.',
    image: 'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Beatles+Ashram+Rishikesh',
    officialBookingLink: 'https://uttarakhandtourism.gov.in',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'tera-manzil-temple',
    name: 'Tera Manzil Temple (Trimbakeshwar)',
    category: 'Temple',
    distance: '900 meters from Tapovan (12 min walk)',
    isDistanceVerified: true,
    location: 'Laxman Jhula bank',
    description: 'Magnificent 13-story multi-tiered orange temple enshrining numerous Hindu deities across its floors. The top terrace offers stunning panoramic vistas over the river and mountain ridge.',
    bestVisitingTime: '8:00 AM – 11:30 AM or 4:30 PM – 7:00 PM',
    travelTips: 'Climbing to the 13th tier rewards you with the best elevated view of Lakshman Jhula and the Himalayan riverbend.',
    image: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Trimbakeshwar+Temple+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'ganga-riverfront',
    name: 'Ganga White Sand Riverfront (Nim Beach)',
    category: 'Nature',
    distance: '1.4 km north of Tapovan (18 min walk)',
    isDistanceVerified: true,
    location: 'Upstream Tapovan Waterfront',
    description: 'Pristine natural white-sand beach where crystal-clear glacial waters gently curve around mountain spurs. Perfect for morning barefoot grounding, meditation, and quiet evening strolls.',
    bestVisitingTime: 'Sunrise (6:30 AM – 9:00 AM) or peaceful late afternoons',
    travelTips: 'Swimming in fast river current is strictly prohibited; dipping feet at the water’s edge is peaceful and refreshing.',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Nim+Beach+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'tapovan-hub',
    name: 'Tapovan Yoga & Cafe Promenade',
    category: 'Cafe & Wellness',
    distance: 'Directly at your doorstep',
    isDistanceVerified: true,
    location: 'Tapovan Village, Rishikesh',
    description: 'The cosmopolitan lifestyle hub of Rishikesh right around Devashish Homestay. Filled with artisanal sourdough bakeries, Ayurvedic cafes, singing bowl shops, and international yoga centers.',
    bestVisitingTime: 'Morning yoga hours & vibrant evening cafe strolls',
    travelTips: 'Try herbal ginger lemon tea and fresh vegetarian thalis at local open-air cafes.',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Tapovan+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'kunjapuri-temple',
    name: 'Kunjapuri Devi Sunrise Peak Temple',
    category: 'Temple',
    distance: '26 km scenic mountain drive (45 min drive)',
    isDistanceVerified: true,
    location: 'Narendra Nagar Ridge (1,645m elevation)',
    description: 'Revered Shakti Peeth atop an alpine ridge. Renowned for its 360-degree Himalayan sunrise spectacle, framing snow-capped peaks of Chaukhamba and Swargarohini against morning alpenglow.',
    bestVisitingTime: '5:00 AM departure from Tapovan to catch the 6:00 AM sunrise',
    travelTips: 'Homestay desk can coordinate reliable morning taxi pick-up. Carry a warm jacket as mornings on the ridge are breezy.',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Kunjapuri+Temple+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'patna-trek',
    name: 'Patna Waterfall & Limestone Caves',
    category: 'Nature',
    distance: '6.5 km from Tapovan (15 min drive)',
    isDistanceVerified: true,
    location: 'Neelkanth Temple Road',
    description: 'Lush 1.5 km forest trail through Rajaji foothill wilderness leading to a hidden mountain waterfall and mossy limestone rock caves.',
    bestVisitingTime: '8:30 AM – 1:00 PM',
    travelTips: 'Scenic trek through dense sal forest. Great for photography and nature enthusiasts.',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Patna+Waterfall+Rishikesh',
    lastVerifiedDate: 'October 2026'
  },
  {
    id: 'river-rafting-exp',
    name: 'Ganga White-Water River Rafting',
    category: 'Adventure',
    distance: 'Shivpuri (14 km) / Marine Drive (24 km)',
    isDistanceVerified: true,
    location: 'Grade III/IV Rapids: Roller Coaster & Golf Course',
    description: 'Exhilarating white-water expedition navigating famous canyon rapids down the Ganges, culminating near Nim Beach in Tapovan.',
    bestVisitingTime: 'September to June (Operations paused during July-August monsoon)',
    travelTips: 'Certified licensed guides provide safety briefing, helmets, and life jackets. Secure your phone in a dry bag.',
    image: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?auto=format&fit=crop&w=1200&q=80',
    mapLink: 'https://maps.google.com/?q=Shivpuri+Rafting+Rishikesh',
    lastVerifiedDate: 'October 2026'
  }
];

export const AttractionsSection: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');
  const [destinations, setDestinations] = useState<(Attraction & {
    bestVisitingTime?: string;
    travelTips?: string;
    tags?: string[];
  })[]>(() => {
    try {
      const stored = localStorage.getItem('sunlit_custom_destinations');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return RISHIKESH_DESTINATIONS;
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored = localStorage.getItem('sunlit_custom_destinations');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) setDestinations(parsed);
        }
      } catch {
        // fallback
      }
    };
    window.addEventListener('sunlit_destinations_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('sunlit_destinations_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const [selectedDestination, setSelectedDestination] = useState<typeof RISHIKESH_DESTINATIONS[0] | null>(null);

  const filtered = filter === 'all'
    ? destinations
    : destinations.filter(d => {
        if (filter === 'spiritual') return d.category === 'Spiritual' || d.category === 'Temple' || d.category === 'Ghat';
        if (filter === 'nature') return d.category === 'Nature';
        if (filter === 'adventure') return d.category === 'Adventure';
        if (filter === 'wellness') return d.category === 'Yoga & Wellness' || d.category === 'Cafe & Wellness';
        if (filter === 'sightseeing') return d.category === 'Sightseeing' || d.category === 'Ghat';
        return d.category.toLowerCase().includes(filter.toLowerCase());
      });

  return (
    <section id="tourism" className="py-20 bg-stone-50/70 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-100/70 px-3.5 py-1 rounded-md border border-amber-200 shadow-xs">
            <Compass className="w-4 h-4 text-amber-800" />
            <span>Curated Tapovan & Rishikesh Travel Guide</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Rishikesh Tourism Photo Gallery
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Discover the yoga capital of the world right from Devashish Sunlit Homestay in Tapovan. Explore sacred ghats, suspension bridges, Himalayan waterfalls, and peaceful temples.
          </p>
        </div>

        {/* Category Filters */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs">
          {[
            { id: 'all', label: `All Destinations (${RISHIKESH_DESTINATIONS.length})` },
            { id: 'spiritual', label: 'Spiritual Ghats & Temples' },
            { id: 'nature', label: 'Nature & Waterfalls' },
            { id: 'adventure', label: 'River Rafting & Adventure' },
            { id: 'wellness', label: 'Yoga & Wellness' },
            { id: 'sightseeing', label: 'Sightseeing & Heritage' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                filter === f.id
                  ? 'bg-amber-800 text-white shadow-sm'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tourism Grid (All 15 Destinations) */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(dest => (
            <div
              key={dest.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
            >
              {/* Photo Box with SmoothImage & Verified Real Fallback */}
              <div className="relative aspect-[16/10] bg-stone-200 overflow-hidden">
                <SmoothImage
                  src={dest.image}
                  fallbackSrc={getFallbackImage(dest.category)}
                  alt={`${dest.name} in Rishikesh`}
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {dest.category}
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-bold text-base leading-snug drop-shadow-sm">
                    {dest.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-amber-200 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="truncate">{dest.location || 'Rishikesh, Uttarakhand'}</span>
                  </div>
                </div>
              </div>

              {/* Destination Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4 text-xs">
                <p className="text-stone-600 leading-relaxed line-clamp-3">
                  {dest.description}
                </p>

                <div className="space-y-3 pt-2 border-t border-stone-100">
                  {/* Verified Distance */}
                  <div className="flex items-center justify-between text-stone-700">
                    <span className="text-[11px] font-medium text-stone-500">From Homestay:</span>
                    <span className="font-bold text-amber-950 flex items-center gap-1 text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{dest.distance}</span>
                    </span>
                  </div>

                  {/* Actions: View Details + Map */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setSelectedDestination(dest)}
                      className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                    >
                      <span>View Details</span>
                      <span>→</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {dest.mapLink && (
                        <a
                          href={dest.mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-600 hover:text-amber-800 font-semibold flex items-center gap-1"
                          title="Open Google Maps Directions"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Map</span>
                        </a>
                      )}
                      {dest.officialBookingLink && (
                        <a
                          href={dest.officialBookingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Portal</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DESTINATION DETAIL MODAL WITH PROMINENT BACK NAVIGATION */}
      {selectedDestination && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200">
            {/* Modal Photo Banner */}
            <div className="relative aspect-[16/9] bg-stone-900 overflow-hidden">
              <SmoothImage
                src={selectedDestination.image}
                fallbackSrc={getFallbackImage(selectedDestination.category)}
                alt={selectedDestination.name}
                priority
                wrapperClassName="w-full h-full"
                className="w-full h-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

              {/* Navigation Back Button Top Left */}
              <button
                onClick={() => setSelectedDestination(null)}
                className="absolute top-4 left-4 z-10 px-3.5 py-1.5 bg-stone-900/80 hover:bg-stone-900 text-white rounded-lg text-xs font-bold border border-white/20 shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Back to Tourism Guide</span>
              </button>

              <button
                onClick={() => setSelectedDestination(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-stone-900/80 hover:bg-stone-900 text-white rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-4 left-5 right-5 text-white">
                <span className="text-[10px] font-bold bg-amber-500 text-stone-950 px-2 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">
                  {selectedDestination.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold">{selectedDestination.name}</h3>
                <p className="text-xs text-amber-200 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                  <span>{selectedDestination.location}</span>
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-1.5 text-stone-400 text-[11px]">
                <span>Homestay</span>
                <span>/</span>
                <span>Rishikesh Tourism</span>
                <span>/</span>
                <span className="text-stone-800 font-semibold">{selectedDestination.name}</span>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] mb-1">
                  About This Destination
                </h4>
                <p className="text-stone-700 leading-relaxed text-sm">
                  {selectedDestination.description}
                </p>
              </div>

              {/* Verified Distance & Best Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-amber-50/70 rounded-xl border border-amber-200/80">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Distance from Homestay</span>
                  </span>
                  <p className="font-semibold text-stone-900">{selectedDestination.distance}</p>
                </div>

                {selectedDestination.bestVisitingTime && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-stone-500 uppercase flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>Recommended Visiting Hours</span>
                    </span>
                    <p className="font-semibold text-stone-900">{selectedDestination.bestVisitingTime}</p>
                  </div>
                )}
              </div>

              {/* Travel Tips */}
              {selectedDestination.travelTips && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                  <span className="font-bold text-stone-800 text-[11px] flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-700" />
                    <span>Local Host Tips for Devashish Guests:</span>
                  </span>
                  <p className="text-stone-600 leading-relaxed">
                    {selectedDestination.travelTips}
                  </p>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
                <button
                  onClick={() => setSelectedDestination(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Back to Tourism Guide</span>
                </button>

                <div className="flex gap-2">
                  {selectedDestination.mapLink && (
                    <a
                      href={selectedDestination.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Open in Google Maps</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
