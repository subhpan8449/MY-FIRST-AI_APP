import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { FestivalThemeId, FestivalThemeMeta, FestivalThemeConfig } from '../types';

export const FESTIVAL_THEMES: Record<FestivalThemeId, FestivalThemeMeta> = {
  diwali: {
    id: 'diwali',
    name: 'Diwali — Festival of Lights',
    badge: '🪔 Deepawali Shubhkaamnayein',
    tagline: 'Warm golden lamps illuminate the Holy Ganga & Devashish Homestay',
    primaryColor: '#F59E0B',
    secondaryColor: '#B45309',
    accentColor: '#FDE047',
    bgGradient: 'from-amber-950/60 via-amber-900/30 to-amber-950/70',
    bannerMessage: '✨ Shubh Deepawali! Enjoy special festive sweet platters & serene Ganga aarti moments at Devashish Homestay.',
    effectType: 'diyas',
    defaultDateWindow: { startMonth: 10, startDay: 20, endMonth: 11, endDay: 15 } // Oct-Nov
  },
  holi: {
    id: 'holi',
    name: 'Holi — Festival of Vibrant Colors',
    badge: '🎨 Rang Barse in Rishikesh',
    tagline: 'Play natural herbal gulal in the foothills of the Himalayas',
    primaryColor: '#EC4899',
    secondaryColor: '#8B5CF6',
    accentColor: '#10B981',
    bgGradient: 'from-pink-950/60 via-purple-900/30 to-emerald-950/60',
    bannerMessage: '🌈 Happy Holi! Organic herbal colors, fresh gujiya, and thandai welcome all our guests!',
    effectType: 'colors',
    defaultDateWindow: { startMonth: 3, startDay: 10, endMonth: 3, endDay: 30 } // March
  },
  janmashtami: {
    id: 'janmashtami',
    name: 'Krishna Janmashtami',
    badge: '🦚 Radhe Krishna Blessings',
    tagline: 'Devotional serenity, flute melodies & peaceful Ganga breeze',
    primaryColor: '#0284C7',
    secondaryColor: '#0369A1',
    accentColor: '#FBBF24',
    bgGradient: 'from-sky-950/60 via-cyan-900/30 to-blue-950/70',
    bannerMessage: '🦚 Jai Shree Krishna! Experience peaceful meditation and devotional chants in Tapovan.',
    effectType: 'peacock',
    defaultDateWindow: { startMonth: 8, startDay: 15, endMonth: 9, endDay: 5 } // Aug-Sept
  },
  christmas: {
    id: 'christmas',
    name: 'Christmas & Winter Solstice',
    badge: '🎄 Merry Christmas',
    tagline: 'Cozy Himalayan mountain air, bonfire evenings & warm drinks',
    primaryColor: '#DC2626',
    secondaryColor: '#15803D',
    accentColor: '#FBBF24',
    bgGradient: 'from-red-950/60 via-emerald-950/30 to-slate-950/70',
    bannerMessage: '❄️ Merry Christmas! Warm cinnamon herbal tea and rooftop holiday cheer in Tapovan.',
    effectType: 'snowfall',
    defaultDateWindow: { startMonth: 12, startDay: 18, endMonth: 12, endDay: 28 } // Dec 18-28
  },
  newyear: {
    id: 'newyear',
    name: 'New Year Celebration',
    badge: '✨ Happy New Year 2026',
    tagline: 'Begin the new year with sunrise views over the holy Ganga river',
    primaryColor: '#7C3AED',
    secondaryColor: '#C026D3',
    accentColor: '#FCD34D',
    bgGradient: 'from-violet-950/70 via-fuchsia-950/30 to-slate-950/80',
    bannerMessage: '🎉 Welcome 2026! Book your tranquil mountain retreat and spiritual reset in Rishikesh.',
    effectType: 'confetti',
    defaultDateWindow: { startMonth: 12, startDay: 29, endMonth: 1, endDay: 6 } // Dec 29 - Jan 6
  },
  navratri: {
    id: 'navratri',
    name: 'Navratri Divine Nights',
    badge: '🌺 Jai Mata Di',
    tagline: 'Nine nights of spiritual vibration, fasting satvik menus & devotion',
    primaryColor: '#EA580C',
    secondaryColor: '#C2410C',
    accentColor: '#FDE047',
    bgGradient: 'from-orange-950/60 via-amber-950/30 to-red-950/60',
    bannerMessage: '🌸 Shubh Navratri! Special Vrat Satvik Bhojan prepared fresh for guests upon request.',
    effectType: 'petals',
    defaultDateWindow: { startMonth: 9, startDay: 25, endMonth: 10, endDay: 15 } // Sept-Oct
  },
  dussehra: {
    id: 'dussehra',
    name: 'Vijayadashami / Dussehra',
    badge: '🏹 Victory of Light',
    tagline: 'Celebrate the triumph of righteousness and courage',
    primaryColor: '#D97706',
    secondaryColor: '#991B1B',
    accentColor: '#FEF08A',
    bgGradient: 'from-amber-950/60 via-red-950/30 to-orange-950/60',
    bannerMessage: '🏹 Shubh Vijayadashami! May peace, courage, and harmony flourish in your life.',
    effectType: 'flames',
    defaultDateWindow: { startMonth: 10, startDay: 10, endMonth: 10, endDay: 25 }
  },
  rakshabandhan: {
    id: 'rakshabandhan',
    name: 'Raksha Bandhan',
    badge: '🧵 Sacred Thread of Love',
    tagline: 'Cherishing timeless bonds with family and loved ones in serene hills',
    primaryColor: '#059669',
    secondaryColor: '#D97706',
    accentColor: '#FDE68A',
    bgGradient: 'from-emerald-950/60 via-amber-950/30 to-teal-950/60',
    bannerMessage: '💛 Happy Raksha Bandhan! Special family suite rates and sweet welcomes.',
    effectType: 'subtle_glow',
    defaultDateWindow: { startMonth: 8, startDay: 10, endMonth: 8, endDay: 22 }
  },
  independenceday: {
    id: 'independenceday',
    name: 'Independence Day',
    badge: '🇮🇳 Azadi Ka Amrit',
    tagline: 'Proudly celebrating India from the crown of Devbhoomi Uttarakhand',
    primaryColor: '#EA580C',
    secondaryColor: '#059669',
    accentColor: '#FFFFFF',
    bgGradient: 'from-orange-950/60 via-slate-900/40 to-emerald-950/60',
    bannerMessage: '🇮🇳 Happy Independence Day! Honouring our nation amidst the Himalayan grandeur.',
    effectType: 'tri_color',
    defaultDateWindow: { startMonth: 8, startDay: 12, endMonth: 8, endDay: 16 }
  },
  republicday: {
    id: 'republicday',
    name: 'Republic Day',
    badge: '🇮🇳 Jai Hind',
    tagline: 'Celebrating unity, democracy and culture in the spiritual capital',
    primaryColor: '#0284C7',
    secondaryColor: '#EA580C',
    accentColor: '#059669',
    bgGradient: 'from-blue-950/60 via-slate-900/40 to-orange-950/60',
    bannerMessage: '🇮🇳 Happy Republic Day! Celebrating our nation’s heritage from Rishikesh.',
    effectType: 'tri_color',
    defaultDateWindow: { startMonth: 1, startDay: 24, endMonth: 1, endDay: 28 }
  },
  valentines: {
    id: 'valentines',
    name: "Valentine's & Romantic Getaway",
    badge: '🌹 Mountain Romance',
    tagline: 'Candlelight rooftop dinners, mountain sunsets & couple escapes',
    primaryColor: '#E11D48',
    secondaryColor: '#9F1239',
    accentColor: '#FECDD3',
    bgGradient: 'from-rose-950/70 via-pink-950/30 to-red-950/70',
    bannerMessage: '💖 Celebrate togetherness! Romantic rooftop dining and serene sunset view rooms available.',
    effectType: 'petals',
    defaultDateWindow: { startMonth: 2, startDay: 7, endMonth: 2, endDay: 16 }
  },
  summer: {
    id: 'summer',
    name: 'Summer Mountain Breeze',
    badge: '☀️ Refreshing River Escape',
    tagline: 'Cool off in our clean swimming pool & chilled Himalayan air',
    primaryColor: '#0EA5E9',
    secondaryColor: '#0284C7',
    accentColor: '#38BDF8',
    bgGradient: 'from-cyan-950/60 via-sky-900/30 to-blue-950/60',
    bannerMessage: '🏊‍♂️ Beat the heat! Freshwater pool access included with every room stay.',
    effectType: 'subtle_glow',
    defaultDateWindow: { startMonth: 4, startDay: 1, endMonth: 6, endDay: 30 }
  },
  monsoon: {
    id: 'monsoon',
    name: 'Lush Monsoon Mist',
    badge: '🌧️ Misty Rishikesh',
    tagline: 'Fresh petrichor, cascading waterfalls and foggy mountain peaks',
    primaryColor: '#0D9488',
    secondaryColor: '#047857',
    accentColor: '#99F6E4',
    bgGradient: 'from-teal-950/70 via-emerald-950/30 to-slate-950/70',
    bannerMessage: '🌧️ Monsoon bliss! Hot ginger chai, pakoras, and mist-wrapped Himalayan hill views.',
    effectType: 'monsoon_rain',
    defaultDateWindow: { startMonth: 7, startDay: 1, endMonth: 8, endDay: 31 }
  },
  winter: {
    id: 'winter',
    name: 'Crisp Himalayan Winter',
    badge: '❄️ Cozy Winter Retreat',
    tagline: 'Clear blue skies, sunlit balconies & brisk Himalayan mornings',
    primaryColor: '#3B82F6',
    secondaryColor: '#1D4ED8',
    accentColor: '#BAE6FD',
    bgGradient: 'from-blue-950/70 via-indigo-950/30 to-slate-950/80',
    bannerMessage: '🏔️ Winter sunshine in Tapovan! Crisp mountain views and sun-drenched private balconies.',
    effectType: 'snowfall',
    defaultDateWindow: { startMonth: 12, startDay: 1, endMonth: 2, endDay: 20 }
  },
  regular: {
    id: 'regular',
    name: 'Devashish Sunlit Classic',
    badge: '☀️ Divine Tapovan Stay',
    tagline: 'Peaceful hotel & homestay in Tapovan, Rishikesh with pool & play area',
    primaryColor: '#F59E0B',
    secondaryColor: '#D97706',
    accentColor: '#FBBF24',
    bgGradient: 'from-amber-950/40 via-slate-900/40 to-slate-950/70',
    bannerMessage: 'Namaste! Welcome to Devashish Sunlit Homestay — peaceful rooms with complimentary pool and kids play area in Tapovan.',
    effectType: 'none'
  }
};

interface FestivalThemeContextType {
  activeTheme: FestivalThemeId;
  themeMeta: FestivalThemeMeta;
  config: FestivalThemeConfig;
  userAnimationOverride: boolean;
  toggleUserAnimation: () => void;
  setUserThemeOverride: (theme: FestivalThemeId | null) => void;
  updateAdminThemeConfig: (newConfig: Partial<FestivalThemeConfig>) => Promise<boolean>;
  allThemes: FestivalThemeMeta[];
}

const FestivalThemeContext = createContext<FestivalThemeContextType | undefined>(undefined);

// Helper: Calculate automatic calendar festival based on current month/day in Asia/Kolkata
export function detectScheduledFestival(date: Date = new Date()): FestivalThemeId {
  // Use Asia/Kolkata date
  const kolkataDateStr = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const d = new Date(kolkataDateStr);
  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate();

  // Check windows in order of specific celebrations
  if ((month === 12 && day >= 29) || (month === 1 && day <= 5)) return 'newyear';
  if (month === 12 && day >= 18 && day <= 28) return 'christmas';
  if (month === 1 && day >= 24 && day <= 28) return 'republicday';
  if (month === 2 && day >= 7 && day <= 16) return 'valentines';
  if (month === 3 && day >= 10 && day <= 28) return 'holi';
  if (month === 8 && day >= 12 && day <= 16) return 'independenceday';
  if (month === 8 && day >= 18 && day <= 24) return 'rakshabandhan';
  if (month === 8 && day >= 25 || (month === 9 && day <= 4)) return 'janmashtami';
  if (month === 9 && day >= 20 || (month === 10 && day <= 5)) return 'navratri';
  if (month === 10 && day >= 8 && day <= 16) return 'dussehra';
  if (month === 10 && day >= 22 || (month === 11 && day <= 15)) return 'diwali';
  
  // Seasonal
  if (month >= 7 && month <= 8) return 'monsoon';
  if (month >= 4 && month <= 6) return 'summer';
  if (month >= 11 || month <= 2) return 'winter';

  return 'regular';
}

export const FestivalThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<FestivalThemeConfig>({
    activeTheme: 'regular',
    isAutoScheduled: true,
    animationIntensity: 'medium',
    soundEnabled: false
  });

  const [userThemeOverride, setUserThemeOverrideState] = useState<FestivalThemeId | null>(() => {
    try {
      return (localStorage.getItem('devashish_theme_pref') as FestivalThemeId) || null;
    } catch {
      return null;
    }
  });

  const [userAnimationOverride, setUserAnimationOverride] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('devashish_theme_anim');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  // Listen to Firestore festivalThemeConfig/current
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'festivalThemeConfig', 'current'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FestivalThemeConfig;
          setConfig(data);
        } else {
          // If not configured, auto-schedule
          const autoTheme = detectScheduledFestival();
          setConfig({
            activeTheme: autoTheme,
            isAutoScheduled: true,
            animationIntensity: 'medium',
            soundEnabled: false
          });
        }
      },
      (err) => {
        console.warn('Festival config listener notice (using local auto-schedule):', err.message);
      }
    );

    return () => unsub();
  }, []);

  const activeThemeId: FestivalThemeId = useMemo(() => {
    if (userThemeOverride && FESTIVAL_THEMES[userThemeOverride]) {
      return userThemeOverride;
    }
    if (config.isAutoScheduled) {
      return detectScheduledFestival();
    }
    return config.activeTheme || 'regular';
  }, [config.isAutoScheduled, config.activeTheme, userThemeOverride]);

  const themeMeta = FESTIVAL_THEMES[activeThemeId] || FESTIVAL_THEMES.regular;

  const toggleUserAnimation = useCallback(() => {
    setUserAnimationOverride((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('devashish_theme_anim', String(next));
      } catch {}
      return next;
    });
  }, []);

  const setUserThemeOverride = useCallback((theme: FestivalThemeId | null) => {
    setUserThemeOverrideState(theme);
    try {
      if (theme) {
        localStorage.setItem('devashish_theme_pref', theme);
      } else {
        localStorage.removeItem('devashish_theme_pref');
      }
    } catch {}
  }, []);

  const updateAdminThemeConfig = useCallback(async (newConfig: Partial<FestivalThemeConfig>): Promise<boolean> => {
    try {
      const docRef = doc(db, 'festivalThemeConfig', 'current');
      await setDoc(docRef, {
        ...config,
        ...newConfig,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Failed to update admin festival config:', err);
      return false;
    }
  }, [config]);

  const allThemes = useMemo(() => Object.values(FESTIVAL_THEMES), []);

  return (
    <FestivalThemeContext.Provider
      value={{
        activeTheme: activeThemeId,
        themeMeta,
        config,
        userAnimationOverride,
        toggleUserAnimation,
        setUserThemeOverride,
        updateAdminThemeConfig,
        allThemes
      }}
    >
      {children}
    </FestivalThemeContext.Provider>
  );
};

export function useFestivalTheme() {
  const context = useContext(FestivalThemeContext);
  if (!context) {
    throw new Error('useFestivalTheme must be used within a FestivalThemeProvider');
  }
  return context;
}
