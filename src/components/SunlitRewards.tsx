import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../types';
import { getUserBookings } from '../services/db';
import {
  getUserLoyaltySummary,
  UserLoyaltySummary,
  LOYALTY_TIERS,
  LOYALTY_REWARD_OPTIONS
} from '../services/loyaltyService';
import rewardsCardArt from '../assets/images/sunlit_rewards_emblem_1794715804188.jpg';
import {
  Award,
  Coins,
  Gift,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  X,
  ArrowUpRight,
  Gamepad2,
  Bed,
  Crown,
  History
} from 'lucide-react';

interface SunlitRewardsProps {
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onBookRoom?: () => void;
  onOpenPlayAndEarn?: () => void;
  onOpenAuth?: () => void;
  initialBookings?: Booking[];
  initialSummary?: UserLoyaltySummary | null;
}

export const SunlitRewards: React.FC<SunlitRewardsProps> = ({
  isModal = false,
  isOpen = true,
  onClose,
  onBookRoom,
  onOpenPlayAndEarn,
  onOpenAuth,
  initialBookings,
  initialSummary
}) => {
  const { currentUser, userProfile } = useAuth();
  const [summary, setSummary] = useState<UserLoyaltySummary | null>(initialSummary || null);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings || []);
  const [loading, setLoading] = useState<boolean>(!initialSummary);

  useEffect(() => {
    if (initialSummary) setSummary(initialSummary);
  }, [initialSummary]);

  useEffect(() => {
    if (initialBookings) setBookings(initialBookings);
  }, [initialBookings]);

  useEffect(() => {
    if (!currentUser || !isOpen) {
      setLoading(false);
      return;
    }
    let mounted = true;
    const load = async () => {
      if (!initialSummary) setLoading(true);
      try {
        const [lSum, bList] = await Promise.all([
          getUserLoyaltySummary(currentUser.uid),
          initialBookings ? Promise.resolve(initialBookings) : getUserBookings(currentUser.uid)
        ]);
        if (!mounted) return;
        setSummary(lSum);
        setBookings(bList);
      } catch (err) {
        console.warn('SunlitRewards load notice:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [currentUser, isOpen, initialBookings, initialSummary]);

  const stayStats = useMemo(() => {
    const completed = bookings.filter(
      (b) => b.status === 'completed' || b.status === 'checked_out'
    );
    const activeOrUpcoming = bookings.filter(
      (b) => !['completed', 'checked_out', 'cancelled', 'rejected'].includes(b.status)
    );
    const totalNights = completed.reduce((acc, b) => acc + Math.max(1, b.nights || 1), 0);
    const pointsFromCompletedStays = completed.reduce(
      (acc, b) => acc + (b.loyaltyPointsEarned || Math.floor(((b.totalAmount || 0) / 100) * 10)),
      0
    );
    return {
      completed,
      activeOrUpcoming,
      totalNights,
      pointsFromCompletedStays
    };
  }, [bookings]);

  if (isModal && !isOpen) return null;

  const displayName = userProfile?.fullName || currentUser?.displayName || 'Valued Guest';
  const avatarPhoto = currentUser?.photoURL || userProfile?.photoURL;
  const currentPoints = summary?.points ?? userProfile?.loyaltyPoints ?? 150;
  const lifetimePoints = summary?.lifetimePoints ?? currentPoints;
  const currentTier = summary?.tier ?? userProfile?.loyaltyTier ?? 'explorer';
  const tierInfo = LOYALTY_TIERS[currentTier] || LOYALTY_TIERS.explorer;
  const rupeeValue = Math.round(currentPoints * 0.5);
  const progressPct = Math.min(100, Math.max(8, Math.round((lifetimePoints / 1500) * 100)));

  const bodyContent = (
    <div className="space-y-6">
      {/* Guest Sign-In Prompt if not logged in */}
      {!currentUser ? (
        <div className="rounded-3xl bg-gradient-to-br from-stone-900 via-amber-950 to-stone-950 p-7 text-white text-center space-y-4 border border-amber-500/30 shadow-xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
            <Crown className="w-7 h-7 text-amber-300" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="text-xl font-black tracking-tight">Join Sunlit Rewards Club</h4>
            <p className="text-xs text-stone-300 leading-relaxed">
              Sign in with Google to receive <strong>150 welcome points</strong> immediately and earn up to{' '}
              <strong>15 points per ₹100</strong> on every completed Devashish Sunlit Homestay booking.
            </p>
          </div>
          {onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs shadow-lg cursor-pointer transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sign In with Google to Unlock Profile</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* USER PROFILE + LUXURY MEMBERSHIP CARD (Blinkit / Zomato-Gold caliber) */}
          <div className="relative rounded-3xl overflow-hidden bg-stone-950 text-white shadow-2xl border border-amber-500/30">
            <img
              src={rewardsCardArt}
              alt="Sunlit Rewards Membership Card Artwork"
              className="absolute inset-0 w-full h-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-950/92 via-stone-950/75 to-amber-950/70" />

            <div className="relative z-10 p-5 sm:p-7 space-y-5">
              {/* Top Profile Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {avatarPhoto ? (
                    <img
                      src={avatarPhoto}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 shadow-lg shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 font-black text-xl flex items-center justify-center border-2 border-amber-300 shadow-lg shrink-0">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
                        {displayName}
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-400/40">
                        <Crown className="w-3 h-3 text-amber-300" />
                        {tierInfo.name}
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 truncate mt-0.5">{currentUser.email}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-amber-200/90 font-semibold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="tabular-nums">{stayStats.completed.length}</span> Completed Stay{stayStats.completed.length === 1 ? '' : 's'}
                      </span>
                      <span className="text-stone-500">·</span>
                      <span className="tabular-nums">{stayStats.totalNights} Total Nights</span>
                      <span className="text-stone-500">·</span>
                      <span>Earn Rate: {tierInfo.pointsRate} pts / ₹100</span>
                      {(summary?.gamePointsTotal ?? 0) > 0 && (
                        <>
                          <span className="text-stone-500">·</span>
                          <span className="text-emerald-300 tabular-nums">
                            +{summary?.gamePointsTotal} Arcade Game Pts Included
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Points Wallet Pill */}
                <div className="bg-stone-900/85 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-amber-400/35 text-left sm:text-right shrink-0 shadow-lg">
                  <span className="text-[10px] text-amber-300 uppercase font-extrabold tracking-wider block">
                    Sunlit Rewards Balance
                  </span>
                  <div className="flex items-baseline sm:justify-end gap-1.5 mt-0.5">
                    <span className="text-3xl font-black text-amber-300 tabular-nums">
                      {loading ? '—' : currentPoints.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-bold text-amber-200">PTS</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300 block tabular-nums">
                    = ₹{rupeeValue.toLocaleString('en-IN')} Instant Stay Credit
                  </span>
                </div>
              </div>

              {/* Tier Progress Meter */}
              <div className="bg-black/35 backdrop-blur-xs rounded-2xl p-4 border border-white/10 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                  <span className="text-amber-100 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Lifetime Points: <strong className="text-white tabular-nums">{lifetimePoints.toLocaleString('en-IN')} pts</strong>
                    </span>
                  </span>
                  {summary && summary.nextTierPointsNeeded > 0 ? (
                    <span className="text-amber-300 text-[11px] tabular-nums">
                      {summary.nextTierPointsNeeded} more pts to reach{' '}
                      <strong>{currentTier === 'explorer' ? 'Ganga Pioneer' : 'Himalayan Patron'}</strong>
                    </span>
                  ) : (
                    <span className="text-emerald-300 text-[11px] font-bold">
                      Top Tier Unlocked · Himalayan Patron VIP
                    </span>
                  )}
                </div>

                <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-amber-300 to-yellow-200 rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-bold text-stone-400">
                  <span className={currentTier === 'explorer' ? 'text-amber-300' : ''}>Sunlit Explorer (0+)</span>
                  <span className={currentTier === 'pioneer' ? 'text-emerald-300' : ''}>Ganga Pioneer (500+)</span>
                  <span className={currentTier === 'patron' ? 'text-amber-200' : ''}>Himalayan Patron (1,500+)</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOOKING COMPLETION POINTS TRACKER */}
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-700" />
                <h5 className="font-extrabold text-stone-900 text-xs sm:text-sm">
                  Points Earned Per Booking Completion
                </h5>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full tabular-nums">
                +{stayStats.pointsFromCompletedStays} pts from completed stays
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="p-6 text-center space-y-2.5">
                <Bed className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-xs font-bold text-stone-800">No Stays Recorded Yet</p>
                <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                  Every time you complete a stay at Devashish Sunlit Homestay, {tierInfo.pointsRate} Sunlit Points per ₹100 are automatically added to your profile.
                </p>
                {onBookRoom && (
                  <button
                    type="button"
                    onClick={onBookRoom}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <span>Book Your First Stay</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-stone-100 max-h-64 overflow-y-auto">
                {bookings.map((b) => {
                  const isCompleted = b.status === 'completed' || b.status === 'checked_out';
                  const isCancelled = b.status === 'cancelled' || b.status === 'rejected';
                  const pts = b.loyaltyPointsEarned || Math.floor(((b.totalAmount || 0) / 100) * tierInfo.pointsRate);

                  return (
                    <div
                      key={b.id}
                      className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-stone-50/80 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-900 text-xs truncate">{b.roomName}</span>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                            {b.bookingReference}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {b.checkInDate} → {b.checkOutDate} · {b.nights} Night{b.nights > 1 ? 's' : ''} · ₹{(b.totalAmount || 0).toLocaleString('en-IN')}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {isCancelled ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-500">
                            {b.status.toUpperCase()}
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 tabular-nums">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            +{pts} pts Credited
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 tabular-nums">
                            <Clock className="w-3.5 h-3.5" />
                            +{pts} pts on Completion
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* INSTANT REWARD CATALOG */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-extrabold text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-700" />
                <span>Instant Stay Discounts &amp; Rewards</span>
              </h5>
              {onOpenPlayAndEarn && (
                <button
                  type="button"
                  onClick={onOpenPlayAndEarn}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                >
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>Earn Extra in Arcade →</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {LOYALTY_REWARD_OPTIONS.map((rew) => {
                const canAfford = currentPoints >= rew.pointsRequired;
                return (
                  <div
                    key={rew.id}
                    className={`rounded-2xl p-4 border flex flex-col justify-between transition-all ${
                      canAfford
                        ? 'bg-gradient-to-b from-amber-50/70 to-white border-amber-300 shadow-xs hover:shadow-md'
                        : 'bg-stone-50 border-stone-200 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-stone-900 text-xs">{rew.name}</span>
                        {rew.badge && (
                          <span className="text-[9px] bg-amber-700 text-white font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0">
                            {rew.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600 mt-1 leading-snug">{rew.description}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex items-center justify-between">
                      <span className="text-xs font-mono font-extrabold text-amber-900 tabular-nums">
                        {rew.pointsRequired} pts
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          canAfford ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {canAfford ? 'Ready in Checkout' : `Need ${rew.pointsRequired - currentPoints}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TIER PRIVILEGES COMPARISON */}
          <div className="space-y-3">
            <h5 className="font-extrabold text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Sunlit Membership Tiers &amp; Perks</span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(['explorer', 'pioneer', 'patron'] as const).map((tierKey) => {
                const t = LOYALTY_TIERS[tierKey];
                const isCurrent = currentTier === tierKey;
                return (
                  <div
                    key={tierKey}
                    className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                      isCurrent
                        ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300/40 shadow-xs'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h6 className="font-extrabold text-xs text-stone-900">{t.name}</h6>
                      {isCurrent && (
                        <span className="text-[10px] bg-amber-800 text-amber-100 font-bold px-2 py-0.5 rounded-full">
                          Your Tier
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono font-bold text-amber-900">
                      {t.minPoints === 0 ? '0+ pts' : `${t.minPoints}+ pts`} · {t.pointsRate} pts/₹100
                    </div>
                    <ul className="space-y-1.5 text-[11px] text-stone-600">
                      {t.perks.map((p, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CHRONOLOGICAL POINTS LEDGER */}
          <div className="space-y-2.5">
            <h5 className="font-extrabold text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
              <History className="w-4 h-4 text-stone-700" />
              <span>Sunlit Points History Ledger</span>
            </h5>
            {summary && summary.transactions.length > 0 ? (
              <div className="border border-stone-200 rounded-2xl divide-y divide-stone-100 overflow-hidden bg-white shadow-xs">
                {summary.transactions.map((tx) => {
                  const isPositive = tx.type === 'earned' || tx.type === 'bonus' || tx.points > 0;
                  return (
                    <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-stone-800 truncate">{tx.description}</p>
                        <span className="text-[10px] text-stone-400">
                          {new Date(tx.timestamp).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-extrabold tabular-nums shrink-0 ${
                          isPositive ? 'text-emerald-700' : 'text-purple-700'
                        }`}
                      >
                        {isPositive ? `+${Math.abs(tx.points)}` : `-${Math.abs(tx.points)}`} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-500 text-center">
                No loyalty transactions recorded yet. Complete a stay or post a verified review to earn points!
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (!isModal) {
    return bodyContent;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-stone-50 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-amber-500/30 flex flex-col max-h-[92vh] animate-scaleIn">
        <div className="bg-gradient-to-r from-stone-950 via-amber-950 to-stone-900 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                Guest Profile &amp; Sunlit Rewards Club
              </h3>
              <p className="text-[11px] text-amber-200/80">
                Stay completions + Play &amp; Earn Arcade points automatically unified · Redeem directly at booking checkout
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-stone-300 hover:text-white transition cursor-pointer"
              aria-label="Close Sunlit Rewards"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">{bodyContent}</div>
      </div>
    </div>
  );
};
