import React, { useState, useEffect } from 'react';
import { Facility } from '../types';
import { getFacilities } from '../services/db';
import { Waves, Baby, Eye, Wifi, Zap, Clock, ShieldCheck, Check } from 'lucide-react';
import { SmoothImage } from './SmoothImage';

const POOL_HIGHLIGHT_PHOTO =
  'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?auto=format&fit=crop&w=1200&q=80';

const getFacilityPhoto = (fac: Facility): string => {
  const name = fac.name.toLowerCase();
  if (name.includes('pool') || fac.category === 'Recreation') {
    return 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1000&q=80';
  }
  if (name.includes('play') || fac.category === 'Family & Kids') {
    return 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=1000&q=80';
  }
  if (name.includes('terrace') || name.includes('rooftop') || fac.category === 'View & Relaxation') {
    return 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1000&q=80';
  }
  if (name.includes('wi-fi') || name.includes('wifi') || fac.category === 'Connectivity') {
    return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80';
  }
  if (name.includes('power') || name.includes('solar') || fac.category === 'Utility') {
    return 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1000&q=80';
  }
  return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80';
};

export const FacilitiesSection: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    getFacilities()
      .then(facs => setFacilities(facs.filter(f => f.isActive)))
      .catch(console.error);
  }, []);

  return (
    <section id="facilities" className="py-16 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-100/70 px-3 py-1 rounded-md border border-amber-200">
            <Waves className="w-3.5 h-3.5 text-amber-700" />
            <span>Homestay Inclusions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Swimming Pool, Play Area &amp; Guest Amenities
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            All staying guests enjoy complimentary leisure pool access and dedicated play zones.
            Everything you need for an easy, pleasant, and rejuvenating stay in Tapovan.
          </p>
        </div>

        {/* Highlight Banner: Swimming Pool Deep Dive with Real Pool Photo */}
        <div className="mt-10 bg-stone-900 rounded-3xl text-white shadow-lg overflow-hidden relative grid grid-cols-1 lg:grid-cols-12 border border-stone-800">
          <div className="lg:col-span-7 p-6 sm:p-10 space-y-4 relative z-10 flex flex-col justify-center bg-gradient-to-r from-cyan-950 via-sky-950/95 to-stone-900">
            <span className="self-start text-xs font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-md border border-cyan-700/60">
              Complimentary Facility
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold">
              Leisure Outdoor Swimming Pool
            </h3>
            <p className="text-sm text-cyan-100/90 leading-relaxed">
              Our crystal-clear swimming pool offers a refreshing respite after river rafting or exploring Himalayan trails. Cleaned daily with filtered water and surrounded by calming greenery.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-cyan-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Operating Hours: 7:00 AM – 7:30 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Zero extra charge for staying guests</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Daily maintenance: 1:00 PM – 2:30 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Children must be supervised (No lifeguard)</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-full">
            <SmoothImage
              src={POOL_HIGHLIGHT_PHOTO}
              alt="Crystal-clear outdoor leisure swimming pool surrounded by greenery"
              wrapperClassName="w-full h-full"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-stone-900/70 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Facilities Grid with Real Photos */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((fac) => (
            <div
              key={fac.id}
              className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Facility Real Photo Header */}
                <div className="relative aspect-[16/9] overflow-hidden border-b border-stone-100">
                  <SmoothImage
                    src={getFacilityPhoto(fac)}
                    alt={fac.name}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/90 backdrop-blur-xs flex items-center justify-center text-amber-800 shadow-xs">
                    {fac.category === 'Family & Kids' ? (
                      <Baby className="w-4 h-4" />
                    ) : fac.category === 'View & Relaxation' ? (
                      <Eye className="w-4 h-4" />
                    ) : fac.category === 'Connectivity' ? (
                      <Wifi className="w-4 h-4" />
                    ) : fac.category === 'Utility' ? (
                      <Zap className="w-4 h-4" />
                    ) : (
                      <Waves className="w-4 h-4" />
                    )}
                  </div>
                  <span className="absolute bottom-2.5 left-3 text-[10px] font-bold uppercase tracking-wider text-amber-200 bg-stone-900/75 backdrop-blur-xs px-2 py-0.5 rounded">
                    {fac.category}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">{fac.name}</h3>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">{fac.description}</p>

                  <div className="text-xs text-stone-500 pt-1">
                    <span className="font-semibold text-stone-700">Timings: </span>
                    <span>{fac.timings}</span>
                  </div>

                  {fac.rules && fac.rules.length > 0 && (
                    <div className="pt-2 border-t border-stone-100 space-y-1">
                      <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                        Guidelines:
                      </span>
                      {fac.rules.slice(0, 3).map((r, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-stone-600">
                          <Check className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-stone-100 flex items-center justify-between text-xs bg-stone-50/50">
                <span className="text-emerald-700 font-semibold">
                  {fac.includedInBooking ? 'Included in Room Rate' : 'Configurable'}
                </span>
                <span className="text-stone-400 font-mono text-[11px]">Devashish Homestay</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

