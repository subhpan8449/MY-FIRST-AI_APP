import React, { useState, useEffect } from 'react';
import { Offer } from '../types';
import { getOffers } from '../services/db';
import { Tag, Copy, Check, GraduationCap, Heart, Home, Sparkles } from 'lucide-react';
import { SmoothImage } from './SmoothImage';

const getOfferPhoto = (offer: Offer): string => {
  const code = (offer.code || '').toUpperCase();
  const name = offer.name.toLowerCase();
  if (code.includes('STUDENT') || name.includes('student')) {
    return 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=80';
  }
  if (code.includes('LONG') || name.includes('long-stay') || name.includes('yoga')) {
    return 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1000&q=80';
  }
  if (code.includes('COUPLE') || name.includes('couple')) {
    return 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80';
  }
  if (code.includes('PILGRIM') || name.includes('pilgrim') || name.includes('senior')) {
    return 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?auto=format&fit=crop&w=1000&q=80';
  }
  return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80';
};

interface OffersSectionProps {
  onSelectOffer: (code: string) => void;
}

export const OffersSection: React.FC<OffersSectionProps> = ({ onSelectOffer }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    getOffers()
      .then(off => setOffers(off.filter(o => o.isActive)))
      .catch(console.error);
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
    onSelectOffer(code);
  };

  return (
    <section id="offers" className="py-16 bg-gradient-to-b from-stone-50 via-white to-amber-50/40 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 bg-amber-100/70 px-3 py-1 rounded-md border border-amber-200">
            <Tag className="w-3.5 h-3.5 text-amber-700" />
            <span>Competitive &amp; Transparent Pricing</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Special Deals for Students, Families &amp; Long Stays
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            We believe peaceful Himalayan accommodation should be accessible to all.
            Enjoy special approved discounts verified directly at check-in.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Real Photo Banner */}
                <div className="relative aspect-[16/9] overflow-hidden border-b border-stone-100">
                  <SmoothImage
                    src={getOfferPhoto(offer)}
                    alt={offer.name}
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950 bg-amber-300 px-2.5 py-0.5 rounded shadow-xs">
                      {offer.discountType === 'fixed' ? `Save ₹${offer.discountValue}` : `${offer.discountValue}% OFF`}
                    </span>
                  </div>
                  {offer.requiresIdVerification && (
                    <span className="absolute top-2.5 right-2.5 text-[10px] text-white bg-stone-900/75 backdrop-blur-xs px-2 py-0.5 rounded font-medium">
                      ID Req.
                    </span>
                  )}
                </div>

                <div className="p-5 space-y-2.5">
                  <h3 className="text-base font-bold text-stone-900 leading-snug">{offer.name}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{offer.description}</p>
                  <div className="text-[11px] text-stone-500 space-y-0.5 pt-1">
                    <div>Min stay: {offer.minStay} night{offer.minStay > 1 ? 's' : ''}</div>
                    <div>Valid on: {offer.eligibleCategories.join(', ')}</div>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-stone-100 flex items-center justify-between">
                <div className="font-mono text-xs font-bold text-amber-950 bg-stone-100 px-2.5 py-1 rounded border border-dashed border-stone-300">
                  {offer.code}
                </div>
                <button
                  onClick={() => handleCopy(offer.code)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                >
                  {copiedCode === offer.code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Use Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
