import React, { useState, useEffect } from 'react';
import { RooftopPackage } from '../types';
import { getRooftopPackages } from '../services/db';
import { Eye, Sparkles, Clock, Users, Calendar, Check, Utensils } from 'lucide-react';
import { RooftopBookingModal } from './RooftopBookingModal';
import { SmoothImage } from './SmoothImage';

const getRooftopPackagePhoto = (pkg: RooftopPackage): string => {
  const n = pkg.name.toLowerCase();
  if (n.includes('dinner') || n.includes('sunset')) {
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80';
  }
  if (n.includes('birthday') || n.includes('anniversary') || n.includes('celebration')) {
    return 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1000&q=80';
  }
  if (n.includes('meditation') || n.includes('tea') || n.includes('morning')) {
    return 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1000&q=80';
  }
  return 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1000&q=80';
};

export const RooftopSection: React.FC = () => {
  const [packages, setPackages] = useState<RooftopPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<RooftopPackage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    getRooftopPackages()
      .then(pkgs => setPackages(pkgs.filter(p => p.isActive)))
      .catch(console.error);
  }, []);

  const handleBookPackage = (pkg: RooftopPackage) => {
    setSelectedPackage(pkg);
    setModalOpen(true);
  };

  return (
    <section id="rooftop" className="py-16 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-100/70 px-3 py-1 rounded-md border border-amber-200">
            <Eye className="w-3.5 h-3.5 text-amber-700" />
            <span>Top Floor Terrace Experience</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Panoramic City-View &amp; Private Celebrations
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Perched on the 3rd floor overlooking the Tapovan valley and Rishikesh city lights.
            Reserve private sunset dinner setups, anniversary celebrations, and morning tea experiences.
          </p>
        </div>

        {/* Packages Grid with Real Photos */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="relative aspect-[16/9] overflow-hidden border-b border-stone-100">
                  <SmoothImage
                    src={getRooftopPackagePhoto(pkg)}
                    alt={pkg.name}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 right-3 bg-stone-950/85 backdrop-blur-xs px-3 py-1 rounded-lg border border-amber-500/40 text-right">
                    <span className="text-base font-extrabold text-amber-300 tabular-nums">₹{pkg.price}</span>
                    <span className="text-[10px] text-stone-300 ml-1">/ setup</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <h3 className="text-lg font-bold text-stone-900 leading-snug">{pkg.name}</h3>

                  <p className="text-xs text-stone-600 leading-relaxed">{pkg.description}</p>

                  {/* Specs */}
                  <div className="flex items-center gap-4 text-xs text-stone-500 font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-amber-700" />
                      <span>Up to {pkg.capacity} Guests</span>
                    </span>
                    <span aria-hidden="true" className="text-stone-300">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      <span>{pkg.durationHours} Hours</span>
                    </span>
                  </div>

                  {/* Inclusions */}
                  <div className="pt-2 border-t border-stone-100 space-y-1.5">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
                      Included Amenities:
                    </span>
                    {pkg.inclusions.map((inc, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-stone-700">
                        <Check className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-stone-100">
                <button
                  onClick={() => handleBookPackage(pkg)}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Request Package Reservation
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CookNow Food Transparency Notice */}
        <div className="mt-8 max-w-4xl mx-auto bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center gap-3 text-xs text-stone-600">
          <Utensils className="w-4 h-4 text-amber-800 shrink-0" />
          <span>
            <strong className="text-stone-800">Dining Note:</strong> Refreshments and hot meals during rooftop experiences are arranged directly through our affiliated local partner CookNow or Tapovan cafes. Devashish Homestay does not operate an in-house commercial kitchen.
          </span>
        </div>
      </div>

      {modalOpen && selectedPackage && (
        <RooftopBookingModal
          isOpen={modalOpen}
          pkg={selectedPackage}
          onClose={() => setModalOpen(false)}
        />
      )}
    </section>
  );
};
