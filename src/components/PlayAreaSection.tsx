import React, { useState, useEffect } from 'react';
import { PlayAreaSettings } from '../types';
import { getPlayAreaSettings } from '../services/db';
import { Baby, Clock, ShieldAlert, Sparkles, Check, Users, Calendar } from 'lucide-react';
import { PlayAreaModal } from './PlayAreaModal';
import { SmoothImage } from './SmoothImage';

const PLAY_MORNING_PHOTO =
  'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=1000&q=80';
const PLAY_AFTERNOON_PHOTO =
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1000&q=80';
const PLAY_EVENING_PHOTO =
  'https://images.unsplash.com/photo-1566004100631-35d015d6a491?auto=format&fit=crop&w=1000&q=80';

export const PlayAreaSection: React.FC = () => {
  const [settings, setSettings] = useState<PlayAreaSettings | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  useEffect(() => {
    getPlayAreaSettings()
      .then(setSettings)
      .catch(console.error);
  }, []);

  const handleOpenReserve = (session: 'morning' | 'afternoon' | 'evening') => {
    setSelectedSession(session);
    setModalOpen(true);
  };

  return (
    <section id="play-area" className="py-16 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-100/70 px-3 py-1 rounded-md border border-amber-200">
            <Baby className="w-3.5 h-3.5 text-amber-700" />
            <span>Dedicated Family Facility</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Children&apos;s Play Area &amp; Activity Zone
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            A safe, vibrant space for young travelers. Free access is included for all staying guests
            with structured daily sessions to ensure cleanliness, comfort, and safety.
          </p>
        </div>

        {/* Operating Sessions Grid with Real Photos */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Session 1: Morning */}
          <div className="bg-white rounded-2xl overflow-hidden border border-amber-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="relative aspect-[16/9] overflow-hidden border-b border-amber-100">
                <SmoothImage
                  src={PLAY_MORNING_PHOTO}
                  alt="Morning indoor play session with blocks and cushions"
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-wider text-amber-950 bg-amber-100/95 px-2.5 py-0.5 rounded shadow-xs">
                  Morning Session
                </span>
                <Clock className="absolute top-3 right-3 w-4 h-4 text-white drop-shadow" />
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-xl font-bold text-stone-900">
                  {settings?.morningSession || '8:00 AM – 12:00 PM'}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Energizing morning indoor playtime with soft obstacle cushions, drawing tables, and gentle movement games before daily excursions.
                </p>
                <div className="pt-2 text-xs text-stone-500 space-y-1">
                  <div>Max capacity: {settings?.maxChildrenPerSlot || 8} children</div>
                  <div>Slot length: 60 minutes</div>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => handleOpenReserve('morning')}
                className="w-full py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Reserve Morning Slot
              </button>
            </div>
          </div>

          {/* Session 2: Afternoon */}
          <div className="bg-white rounded-2xl overflow-hidden border border-amber-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="relative aspect-[16/9] overflow-hidden border-b border-amber-100">
                <SmoothImage
                  src={PLAY_AFTERNOON_PHOTO}
                  alt="Afternoon creative books and board games play zone"
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-wider text-amber-950 bg-amber-100/95 px-2.5 py-0.5 rounded shadow-xs">
                  Afternoon Session
                </span>
                <Clock className="absolute top-3 right-3 w-4 h-4 text-white drop-shadow" />
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-xl font-bold text-stone-900">
                  {settings?.afternoonSession || '3:00 PM – 6:00 PM'}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Cool indoor relaxation during the warmer hours. Equipped with picture books, soft building blocks, and family board games.
                </p>
                <div className="pt-2 text-xs text-stone-500 space-y-1">
                  <div>Max capacity: {settings?.maxChildrenPerSlot || 8} children</div>
                  <div>Slot length: 60 minutes</div>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => handleOpenReserve('afternoon')}
                className="w-full py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Reserve Afternoon Slot
              </button>
            </div>
          </div>

          {/* Session 3: Evening */}
          <div className="bg-white rounded-2xl overflow-hidden border border-amber-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
            <div>
              <div className="relative aspect-[16/9] overflow-hidden border-b border-amber-100">
                <SmoothImage
                  src={PLAY_EVENING_PHOTO}
                  alt="Evening family story nook and mini slide zone"
                  wrapperClassName="w-full h-full"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-wider text-amber-950 bg-amber-100/95 px-2.5 py-0.5 rounded shadow-xs">
                  Evening Session
                </span>
                <Clock className="absolute top-3 right-3 w-4 h-4 text-white drop-shadow" />
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-xl font-bold text-stone-900">
                  {settings?.eveningSession || '6:00 PM – 8:00 PM'}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Pre-dinner wind-down activity. Safe mini slide, story reading nook, and friendly play while parents prepare for the evening.
                </p>
                <div className="pt-2 text-xs text-stone-500 space-y-1">
                  <div>Max capacity: {settings?.maxChildrenPerSlot || 8} children</div>
                  <div>Slot length: 60 minutes</div>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => handleOpenReserve('evening')}
                className="w-full py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Reserve Evening Slot
              </button>
            </div>
          </div>
        </div>

        {/* Safety & Supervision Notice Required by Business Specification */}
        <div className="mt-8 max-w-5xl mx-auto bg-amber-50/80 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-800" />
          </div>
          <div className="text-xs text-stone-700 space-y-1">
            <h4 className="font-bold text-stone-900">Important Safety & Supervision Policy</h4>
            <p className="leading-relaxed">
              Parents or guardians remain strictly responsible for children's supervision at all times.
              Devashish Sunlit Homestay provides a joyful play facility but does not provide professional
              childcare, babysitting, or crèche services. Socks required for all children inside the soft-mat area.
            </p>
          </div>
        </div>
      </div>

      {/* Reservation Modal */}
      {modalOpen && (
        <PlayAreaModal
          isOpen={modalOpen}
          initialSession={selectedSession}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
};
