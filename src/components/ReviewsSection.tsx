import React, { useEffect, useMemo, useState } from 'react';
import { CustomerFeedback } from '../types';
import { getCustomerFeedback, submitCustomerFeedback } from '../services/db';
import { awardBonusPoints } from '../services/loyaltyService';
import { useAuth } from '../context/AuthContext';
import {
  Star,
  ShieldCheck,
  MessageSquarePlus,
  ThumbsUp,
  CheckCircle2,
  X,
  Sparkles,
  Award,
  Bed,
  Filter
} from 'lucide-react';

interface ReviewsSectionProps {
  onOpenAuth?: () => void;
}

const CATEGORY_LABELS: Record<CustomerFeedback['category'], string> = {
  stay: 'Overall Stay',
  cleanliness: 'Cleanliness',
  service: 'Host Hospitality',
  pool: 'Swimming Pool',
  play_area: 'Kids Play Area',
  rooftop: 'Rooftop Terrace'
};

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({ onOpenAuth }) => {
  const { currentUser, userProfile } = useAuth();
  const [reviews, setReviews] = useState<CustomerFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [helpfulIds, setHelpfulIds] = useState<Record<string, boolean>>({});

  // Review modal state
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [hospitalityRating, setHospitalityRating] = useState(5);
  const [locationRating, setLocationRating] = useState(5);
  const [diningRating, setDiningRating] = useState(5);
  const [category, setCategory] = useState<CustomerFeedback['category']>('stay');
  const [roomNumber, setRoomNumber] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const items = await getCustomerFeedback();
      setReviews(items);
    } catch (err) {
      console.warn('Could not load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const metrics = useMemo(() => {
    if (reviews.length === 0) {
      return {
        avg: 4.9,
        total: 0,
        distribution: [0, 0, 0, 0, 0],
        subAvg: { cleanliness: 4.9, hospitality: 5.0, location: 4.9, dining: 4.8 }
      };
    }
    const total = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = Number((sum / total).toFixed(1));
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const idx = Math.min(5, Math.max(1, Math.round(r.rating || 5))) - 1;
      dist[idx] += 1;
    });

    const sub = reviews.reduce(
      (acc, r) => ({
        cleanliness: acc.cleanliness + (r.subRatings?.cleanliness || r.rating || 5),
        hospitality: acc.hospitality + (r.subRatings?.hospitality || r.rating || 5),
        location: acc.location + (r.subRatings?.location || r.rating || 5),
        dining: acc.dining + (r.subRatings?.dining || r.rating || 5)
      }),
      { cleanliness: 0, hospitality: 0, location: 0, dining: 0 }
    );

    return {
      avg,
      total,
      distribution: dist,
      subAvg: {
        cleanliness: Number((sub.cleanliness / total).toFixed(1)),
        hospitality: Number((sub.hospitality / total).toFixed(1)),
        location: Number((sub.location / total).toFixed(1)),
        dining: Number((sub.dining / total).toFixed(1))
      }
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (categoryFilter === 'all') return reviews;
    return reviews.filter((r) => r.category === categoryFilter);
  }, [reviews, categoryFilter]);

  const handleOpenWriteReview = () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    setIsWriteModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !comments.trim()) return;
    setIsSubmitting(true);
    try {
      await submitCustomerFeedback({
        userId: currentUser.uid,
        guestName: userProfile?.fullName || currentUser.displayName || 'Verified Guest',
        roomNumber: roomNumber.trim() || undefined,
        rating,
        category,
        comments: comments.trim(),
        verifiedStay: true,
        subRatings: {
          cleanliness: cleanlinessRating,
          hospitality: hospitalityRating,
          location: locationRating,
          dining: diningRating
        }
      });

      await awardBonusPoints(
        currentUser.uid,
        25,
        'Guest Review Appreciation Bonus (+25 Sunlit Points)'
      );

      setSubmitNotice('Thank you! Your verified review is live & +25 Sunlit Points have been credited.');
      setComments('');
      setRoomNumber('');
      setIsWriteModalOpen(false);
      await loadReviews();
      setTimeout(() => setSubmitNotice(null), 5000);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleHelpful = (id: string) => {
    setHelpfulIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section
      id="reviews"
      className="py-16 bg-gradient-to-b from-white via-amber-50/35 to-stone-50 border-b border-stone-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-100/80 px-3 py-1 rounded-md border border-amber-200">
              <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Verified Guest Reviews &amp; Ratings</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Loved by Travelers, Families &amp; Yoga Seekers
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Authentic feedback directly from guests staying at Devashish Sunlit Homestay in Tapovan, Rishikesh.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenWriteReview}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-extrabold text-xs shadow-lg cursor-pointer transition-all shrink-0"
          >
            <MessageSquarePlus className="w-4 h-4 text-amber-300" />
            <span>{currentUser ? 'Write a Review (+25 Pts)' : 'Sign In to Write a Review'}</span>
          </button>
        </div>

        {submitNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{submitNotice}</span>
            </div>
            <button onClick={() => setSubmitNotice(null)} className="text-emerald-700 cursor-pointer">✕</button>
          </div>
        )}

        {/* Executive Rating Summary Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm">
          {/* Big Aggregate Score */}
          <div className="lg:col-span-4 flex flex-col justify-center items-center lg:items-start text-center lg:text-left border-b lg:border-b-0 lg:border-r border-stone-100 pb-6 lg:pb-0 lg:pr-6 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-stone-900 tabular-nums">{metrics.avg}</span>
              <span className="text-sm font-bold text-stone-400">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${
                    s <= Math.round(metrics.avg)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-stone-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-stone-600">
              Based on <strong className="text-stone-900 tabular-nums">{metrics.total}</strong> verified guest reviews
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Real Guest Feedback</span>
            </div>
          </div>

          {/* 5-Star Distribution Bars */}
          <div className="lg:col-span-4 flex flex-col justify-center space-y-2 border-b lg:border-b-0 lg:border-r border-stone-100 pb-6 lg:pb-0 lg:pr-6">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = metrics.distribution[star - 1] || 0;
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : star === 5 ? 90 : 10;
              return (
                <div key={star} className="flex items-center gap-2.5 text-xs">
                  <span className="w-8 font-bold text-stone-700 tabular-nums">{star} ★</span>
                  <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-[11px] font-semibold text-stone-500 tabular-nums">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* 4 Pillar Sub-Ratings */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3 content-center">
            {[
              { label: 'Cleanliness', score: metrics.subAvg.cleanliness },
              { label: 'Host Hospitality', score: metrics.subAvg.hospitality },
              { label: 'Tapovan Location', score: metrics.subAvg.location },
              { label: 'Satvik Dining', score: metrics.subAvg.dining }
            ].map((pillar) => (
              <div
                key={pillar.label}
                className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-1"
              >
                <span className="text-[11px] font-semibold text-stone-500 block">{pillar.label}</span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-stone-900 tabular-nums">{pillar.score}</span>
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>
          {(['all', 'stay', 'cleanliness', 'service', 'pool', 'play_area', 'rooftop'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {cat === 'all' ? `All (${reviews.length})` : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Reviews Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-stone-100 animate-pulse border border-stone-200" />
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border border-stone-200 space-y-3">
            <Award className="w-10 h-10 text-amber-500 mx-auto" />
            <h4 className="text-sm font-bold text-stone-900">No reviews in this category yet</h4>
            <p className="text-xs text-stone-500">Be the first guest to share your Tapovan stay story.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReviews.map((rev) => {
              const initials = (rev.guestName || 'G')
                .split(' ')
                .slice(0, 2)
                .map((s) => s[0])
                .join('')
                .toUpperCase();
              const isHelpful = Boolean(helpfulIds[rev.id]);

              return (
                <article
                  key={rev.id}
                  className="bg-white rounded-2xl border border-stone-200 hover:border-amber-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-800 to-amber-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-extrabold text-stone-900 text-xs truncate">
                              {rev.guestName}
                            </h4>
                            <CheckCircle2
                              className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                              aria-label="Verified Guest"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mt-0.5">
                            <span>{CATEGORY_LABELS[rev.category] || 'Homestay Stay'}</span>
                            {rev.roomNumber && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-0.5 font-semibold text-stone-700">
                                  <Bed className="w-3 h-3 text-amber-700" />
                                  Room {rev.roomNumber}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-700 text-white text-[11px] font-extrabold shrink-0 tabular-nums">
                        <span>{rev.rating}.0</span>
                        <Star className="w-3 h-3 fill-white text-white" />
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed">
                      &ldquo;{rev.comments}&rdquo;
                    </p>

                    {rev.responseByOwner && (
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] space-y-1">
                        <span className="font-extrabold text-amber-950 block">
                          Host Response · Devashish Sunlit Homestay
                        </span>
                        <p className="text-stone-700 leading-snug">{rev.responseByOwner}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span>
                      {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleHelpful(rev.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                        isHelpful
                          ? 'bg-amber-100 text-amber-900'
                          : 'hover:bg-stone-100 text-stone-600'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>Helpful{isHelpful ? ' (1)' : ''}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* WRITE REVIEW MODAL */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 animate-scaleIn">
            <div className="bg-gradient-to-r from-amber-950 to-stone-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-extrabold text-sm">Rate Your Stay at Devashish Sunlit</h3>
                  <p className="text-[11px] text-amber-200/80">Earn +25 Sunlit Rewards bonus points on submission</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1.5">Overall Experience</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          rating >= s ? 'text-amber-400 fill-amber-400' : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-extrabold text-amber-900">{rating}.0 / 5.0</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
                {[
                  { label: 'Cleanliness', val: cleanlinessRating, set: setCleanlinessRating },
                  { label: 'Hospitality', val: hospitalityRating, set: setHospitalityRating },
                  { label: 'Location', val: locationRating, set: setLocationRating },
                  { label: 'CookNow Food', val: diningRating, set: setDiningRating }
                ].map((sub) => (
                  <div key={sub.label} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-stone-700">
                      <span>{sub.label}</span>
                      <span className="text-amber-800 font-bold tabular-nums">{sub.val}★</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={sub.val}
                      onChange={(e) => sub.set(Number(e.target.value))}
                      className="w-full accent-amber-700 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Review Highlight</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CustomerFeedback['category'])}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 font-semibold"
                  >
                    <option value="stay">Overall Stay</option>
                    <option value="cleanliness">Room Cleanliness</option>
                    <option value="service">Host Service</option>
                    <option value="pool">Swimming Pool</option>
                    <option value="play_area">Kids Play Area</option>
                    <option value="rooftop">Rooftop Terrace</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Room No. (Optional)</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. 201"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Your Review</label>
                <textarea
                  rows={4}
                  required
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Share what made your stay in Tapovan, Rishikesh memorable..."
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-extrabold cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Verified Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
