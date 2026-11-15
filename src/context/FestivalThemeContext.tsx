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
    secondaryColor: '#92400E',
    accentColor: '#FDE047',
    bgGradient: 'from-amber-950/80 via-stone-950/60 to-amber-950/85',
    bannerMessage: '✨ Shubh Deepawali! Enjoy special festive sweet platters & serene Ganga aarti moments at Devashish Homestay.',
    effectType: 'diyas',
    defaultDateWindow: { startMonth: 10, startDay: 20, endMonth: 11, endDay: 15 },
    palette: {
      surfaceTint: '#FFFBEB',
      cardTint: '#FEF3C7',
      cardBorder: '#F59E0B',
      headerBg: '#1C140A',
      headerText: '#FDE68A',
      buttonBg: '#D97706',
      buttonHover: '#B45309',
      adminHeaderBg: '#231507',
      adminSidebarBg: '#181009',
      adminAccentBg: '#D97706',
      adminAccentText: '#FDE68A',
      adminBannerGradient: 'linear-gradient(135deg, #271506 0%, #522807 55%, #1F1208 100%)',
      glowHex: '#F59E0B'
    }
  },
  holi: {
    id: 'holi',
    name: 'Holi — Festival of Vibrant Colors',
    badge: '🎨 Rang Barse in Rishikesh',
    tagline: 'Play natural herbal gulal in the foothills of the Himalayas',
    primaryColor: '#EC4899',
    secondaryColor: '#7C3AED',
    accentColor: '#10B981',
    bgGradient: 'from-fuchsia-950/75 via-purple-950/55 to-teal-950/70',
    bannerMessage: '🌈 Happy Holi! Organic herbal colors, fresh gujiya, and thandai welcome all our guests!',
    effectType: 'colors',
    defaultDateWindow: { startMonth: 3, startDay: 10, endMonth: 3, endDay: 30 },
    palette: {
      surfaceTint: '#FDF2F8',
      cardTint: '#FCE7F3',
      cardBorder: '#EC4899',
      headerBg: '#4A044E',
      headerText: '#FBCFE8',
      buttonBg: '#DB2777',
      buttonHover: '#BE185D',
      adminHeaderBg: '#4A044E',
      adminSidebarBg: '#2E0738',
      adminAccentBg: '#DB2777',
      adminAccentText: '#F9A8D4',
      adminBannerGradient: 'linear-gradient(135deg, #4A044E 0%, #6D28D9 52%, #0F766E 100%)',
      glowHex: '#EC4899'
    }
  },
  janmashtami: {
    id: 'janmashtami',
    name: 'Krishna Janmashtami',
    badge: '🦚 Radhe Krishna Blessings',
    tagline: 'Devotional serenity, flute melodies & peaceful Ganga breeze',
    primaryColor: '#0284C7',
    secondaryColor: '#0F766E',
    accentColor: '#FBBF24',
    bgGradient: 'from-sky-950/80 via-cyan-950/55 to-indigo-950/80',
    bannerMessage: '🦚 Jai Shree Krishna! Experience peaceful meditation and devotional chants in Tapovan.',
    effectType: 'peacock',
    defaultDateWindow: { startMonth: 8, startDay: 15, endMonth: 9, endDay: 5 },
    palette: {
      surfaceTint: '#F0F9FF',
      cardTint: '#E0F2FE',
      cardBorder: '#0284C7',
      headerBg: '#082F49',
      headerText: '#BAE6FD',
      buttonBg: '#0284C7',
      buttonHover: '#0369A1',
      adminHeaderBg: '#082F49',
      adminSidebarBg: '#062033',
      adminAccentBg: '#0284C7',
      adminAccentText: '#7DD3FC',
      adminBannerGradient: 'linear-gradient(135deg, #082F49 0%, #0F766E 55%, #1E1B4B 100%)',
      glowHex: '#0284C7'
    }
  },
  christmas: {
    id: 'christmas',
    name: 'Christmas & Winter Solstice',
    badge: '🎄 Merry Christmas',
    tagline: 'Cozy Himalayan mountain air, bonfire evenings & warm drinks',
    primaryColor: '#DC2626',
    secondaryColor: '#15803D',
    accentColor: '#FBBF24',
    bgGradient: 'from-red-950/75 via-emerald-950/45 to-slate-950/80',
    bannerMessage: '❄️ Merry Christmas! Warm cinnamon herbal tea and rooftop holiday cheer in Tapovan.',
    effectType: 'snowfall',
    defaultDateWindow: { startMonth: 12, startDay: 18, endMonth: 12, endDay: 28 },
    palette: {
      surfaceTint: '#FEF2F2',
      cardTint: '#FEE2E2',
      cardBorder: '#DC2626',
      headerBg: '#14532D',
      headerText: '#BBF7D0',
      buttonBg: '#B91C1C',
      buttonHover: '#991B1B',
      adminHeaderBg: '#14532D',
      adminSidebarBg: '#0D331C',
      adminAccentBg: '#DC2626',
      adminAccentText: '#FDE68A',
      adminBannerGradient: 'linear-gradient(135deg, #14532D 0%, #7F1D1D 55%, #0F172A 100%)',
      glowHex: '#DC2626'
    }
  },
  newyear: {
    id: 'newyear',
    name: 'New Year Celebration',
    badge: '✨ Happy New Year 2026',
    tagline: 'Begin the new year with sunrise views over the holy Ganga river',
    primaryColor: '#7C3AED',
    secondaryColor: '#C026D3',
    accentColor: '#FCD34D',
    bgGradient: 'from-violet-950/80 via-fuchsia-950/45 to-slate-950/85',
    bannerMessage: '🎉 Welcome 2026! Book your tranquil mountain retreat and spiritual reset in Rishikesh.',
    effectType: 'confetti',
    defaultDateWindow: { startMonth: 12, startDay: 29, endMonth: 1, endDay: 6 },
    palette: {
      surfaceTint: '#F5F3FF',
      cardTint: '#EDE9FE',
      cardBorder: '#7C3AED',
      headerBg: '#2E1065',
      headerText: '#DDD6FE',
      buttonBg: '#7C3AED',
      buttonHover: '#6D28D9',
      adminHeaderBg: '#2E1065',
      adminSidebarBg: '#1E0B4B',
      adminAccentBg: '#7C3AED',
      adminAccentText: '#FDE68A',
      adminBannerGradient: 'linear-gradient(135deg, #2E1065 0%, #86198F 55%, #0F172A 100%)',
      glowHex: '#8B5CF6'
    }
  },
  navratri: {
    id: 'navratri',
    name: 'Navratri Divine Nights',
    badge: '🌺 Jai Mata Di',
    tagline: 'Nine nights of spiritual vibration, fasting satvik menus & devotion',
    primaryColor: '#EA580C',
    secondaryColor: '#C2410C',
    accentColor: '#FDE047',
    bgGradient: 'from-orange-950/75 via-amber-950/45 to-red-950/75',
    bannerMessage: '🌸 Shubh Navratri! Special Vrat Satvik Bhojan prepared fresh for guests upon request.',
    effectType: 'petals',
    defaultDateWindow: { startMonth: 9, startDay: 25, endMonth: 10, endDay: 15 },
    palette: {
      surfaceTint: '#FFF7ED',
      cardTint: '#FFEDD5',
      cardBorder: '#EA580C',
      headerBg: '#431407',
      headerText: '#FED7AA',
      buttonBg: '#EA580C',
      buttonHover: '#C2410C',
      adminHeaderBg: '#431407',
      adminSidebarBg: '#2A0D05',
      adminAccentBg: '#EA580C',
      adminAccentText: '#FED7AA',
      adminBannerGradient: 'linear-gradient(135deg, #431407 0%, #9A3412 55%, #7F1D1D 100%)',
      glowHex: '#EA580C'
    }
  },
  dussehra: {
    id: 'dussehra',
    name: 'Vijayadashami / Dussehra',
    badge: '🏹 Victory of Light',
    tagline: 'Celebrate the triumph of righteousness and courage',
    primaryColor: '#D97706',
    secondaryColor: '#991B1B',
    accentColor: '#FEF08A',
    bgGradient: 'from-amber-950/75 via-red-950/45 to-orange-950/75',
    bannerMessage: '🏹 Shubh Vijayadashami! May peace, courage, and harmony flourish in your life.',
    effectType: 'flames',
    defaultDateWindow: { startMonth: 10, startDay: 10, endMonth: 10, endDay: 25 },
    palette: {
      surfaceTint: '#FFFBEB',
      cardTint: '#FEF3C7',
      cardBorder: '#D97706',
      headerBg: '#450A0A',
      headerText: '#FECACA',
      buttonBg: '#B45309',
      buttonHover: '#92400E',
      adminHeaderBg: '#450A0A',
      adminSidebarBg: '#2B0707',
      adminAccentBg: '#D97706',
      adminAccentText: '#FEF08A',
      adminBannerGradient: 'linear-gradient(135deg, #450A0A 0%, #92400E 55%, #2A1205 100%)',
      glowHex: '#D97706'
    }
  },
  rakshabandhan: {
    id: 'rakshabandhan',
    name: 'Raksha Bandhan',
    badge: '🧵 Sacred Thread of Love',
    tagline: 'Cherishing timeless bonds with family and loved ones in serene hills',
    primaryColor: '#059669',
    secondaryColor: '#D97706',
    accentColor: '#FDE68A',
    bgGradient: 'from-emerald-950/75 via-amber-950/40 to-teal-950/75',
    bannerMessage: '💛 Happy Raksha Bandhan! Special family suite rates and sweet welcomes.',
    effectType: 'subtle_glow',
    defaultDateWindow: { startMonth: 8, startDay: 10, endMonth: 8, endDay: 22 },
    palette: {
      surfaceTint: '#ECFDF5',
      cardTint: '#D1FAE5',
      cardBorder: '#059669',
      headerBg: '#064E3B',
      headerText: '#A7F3D0',
      buttonBg: '#059669',
      buttonHover: '#047857',
      adminHeaderBg: '#064E3B',
      adminSidebarBg: '#042F25',
      adminAccentBg: '#059669',
      adminAccentText: '#FDE68A',
      adminBannerGradient: 'linear-gradient(135deg, #064E3B 0%, #0F766E 55%, #78350F 100%)',
      glowHex: '#10B981'
    }
  },
  independenceday: {
    id: 'independenceday',
    name: 'Independence Day',
    badge: '🇮🇳 Azadi Ka Amrit',
    tagline: 'Proudly celebrating India from the crown of Devbhoomi Uttarakhand',
    primaryColor: '#EA580C',
    secondaryColor: '#059669',
    accentColor: '#FFFFFF',
    bgGradient: 'from-orange-950/70 via-slate-900/50 to-emerald-950/70',
    bannerMessage: '🇮🇳 Happy Independence Day! Honouring our nation amidst the Himalayan grandeur.',
    effectType: 'tri_color',
    defaultDateWindow: { startMonth: 8, startDay: 12, endMonth: 8, endDay: 16 },
    palette: {
      surfaceTint: '#FFF7ED',
      cardTint: '#ECFDF5',
      cardBorder: '#EA580C',
      headerBg: '#1E293B',
      headerText: '#F8FAFC',
      buttonBg: '#EA580C',
      buttonHover: '#059669',
      adminHeaderBg: '#172554',
      adminSidebarBg: '#0F172A',
      adminAccentBg: '#EA580C',
      adminAccentText: '#FDBA74',
      adminBannerGradient: 'linear-gradient(135deg, #9A3412 0%, #1E293B 50%, #065F46 100%)',
      glowHex: '#EA580C'
    }
  },
  republicday: {
    id: 'republicday',
    name: 'Republic Day',
    badge: '🇮🇳 Jai Hind',
    tagline: 'Celebrating unity, democracy and culture in the spiritual capital',
    primaryColor: '#0284C7',
    secondaryColor: '#EA580C',
    accentColor: '#059669',
    bgGradient: 'from-blue-950/75 via-slate-900/50 to-orange-950/70',
    bannerMessage: '🇮🇳 Happy Republic Day! Celebrating our nation’s heritage from Rishikesh.',
    effectType: 'tri_color',
    defaultDateWindow: { startMonth: 1, startDay: 24, endMonth: 1, endDay: 28 },
    palette: {
      surfaceTint: '#EFF6FF',
      cardTint: '#DBEAFE',
      cardBorder: '#1D4ED8',
      headerBg: '#1E3A8A',
      headerText: '#DBEAFE',
      buttonBg: '#1D4ED8',
      buttonHover: '#1E40AF',
      adminHeaderBg: '#1E3A8A',
      adminSidebarBg: '#0F172A',
      adminAccentBg: '#0284C7',
      adminAccentText: '#BAE6FD',
      adminBannerGradient: 'linear-gradient(135deg, #1E3A8A 0%, #0F766E 50%, #9A3412 100%)',
      glowHex: '#0284C7'
    }
  },
  valentines: {
    id: 'valentines',
    name: "Valentine's & Romantic Getaway",
    badge: '🌹 Mountain Romance',
    tagline: 'Candlelight rooftop dinners, mountain sunsets & couple escapes',
    primaryColor: '#E11D48',
    secondaryColor: '#9F1239',
    accentColor: '#FECDD3',
    bgGradient: 'from-rose-950/80 via-pink-950/45 to-red-950/80',
    bannerMessage: '💖 Celebrate togetherness! Romantic rooftop dining and serene sunset view rooms available.',
    effectType: 'petals',
    defaultDateWindow: { startMonth: 2, startDay: 7, endMonth: 2, endDay: 16 },
    palette: {
      surfaceTint: '#FFF1F2',
      cardTint: '#FFE4E6',
      cardBorder: '#E11D48',
      headerBg: '#4C0519',
      headerText: '#FECDD3',
      buttonBg: '#E11D48',
      buttonHover: '#BE123C',
      adminHeaderBg: '#4C0519',
      adminSidebarBg: '#310412',
      adminAccentBg: '#E11D48',
      adminAccentText: '#FECDD3',
      adminBannerGradient: 'linear-gradient(135deg, #4C0519 0%, #9F1239 55%, #3B0764 100%)',
      glowHex: '#E11D48'
    }
  },
  summer: {
    id: 'summer',
    name: 'Summer Mountain Breeze',
    badge: '☀️ Refreshing River Escape',
    tagline: 'Cool off in our clean swimming pool & chilled Himalayan air',
    primaryColor: '#0EA5E9',
    secondaryColor: '#0284C7',
    accentColor: '#38BDF8',
    bgGradient: 'from-cyan-950/70 via-sky-900/40 to-blue-950/75',
    bannerMessage: '🏊‍♂️ Beat the heat! Freshwater pool access included with every room stay.',
    effectType: 'subtle_glow',
    defaultDateWindow: { startMonth: 4, startDay: 1, endMonth: 6, endDay: 30 },
    palette: {
      surfaceTint: '#F0F9FF',
      cardTint: '#E0F2FE',
      cardBorder: '#0EA5E9',
      headerBg: '#0C4A6E',
      headerText: '#BAE6FD',
      buttonBg: '#0284C7',
      buttonHover: '#0369A1',
      adminHeaderBg: '#0C4A6E',
      adminSidebarBg: '#082F49',
      adminAccentBg: '#0EA5E9',
      adminAccentText: '#E0F2FE',
      adminBannerGradient: 'linear-gradient(135deg, #0C4A6E 0%, #0369A1 55%, #0F766E 100%)',
      glowHex: '#0EA5E9'
    }
  },
  monsoon: {
    id: 'monsoon',
    name: 'Lush Monsoon Mist',
    badge: '🌧️ Misty Rishikesh',
    tagline: 'Fresh petrichor, cascading waterfalls and foggy mountain peaks',
    primaryColor: '#0D9488',
    secondaryColor: '#047857',
    accentColor: '#99F6E4',
    bgGradient: 'from-teal-950/80 via-emerald-950/45 to-slate-950/80',
    bannerMessage: '🌧️ Monsoon bliss! Hot ginger chai, pakoras, and mist-wrapped Himalayan hill views.',
    effectType: 'monsoon_rain',
    defaultDateWindow: { startMonth: 7, startDay: 1, endMonth: 8, endDay: 31 },
    palette: {
      surfaceTint: '#F0FDFA',
      cardTint: '#CCFBF1',
      cardBorder: '#0D9488',
      headerBg: '#134E4A',
      headerText: '#99F6E4',
      buttonBg: '#0D9488',
      buttonHover: '#0F766E',
      adminHeaderBg: '#134E4A',
      adminSidebarBg: '#0A2E2B',
      adminAccentBg: '#0D9488',
      adminAccentText: '#99F6E4',
      adminBannerGradient: 'linear-gradient(135deg, #134E4A 0%, #065F46 55%, #0F172A 100%)',
      glowHex: '#14B8A6'
    }
  },
  winter: {
    id: 'winter',
    name: 'Crisp Himalayan Winter',
    badge: '❄️ Cozy Winter Retreat',
    tagline: 'Clear blue skies, sunlit balconies & brisk Himalayan mornings',
    primaryColor: '#3B82F6',
    secondaryColor: '#1D4ED8',
    accentColor: '#BAE6FD',
    bgGradient: 'from-blue-950/80 via-indigo-950/45 to-slate-950/85',
    bannerMessage: '🏔️ Winter sunshine in Tapovan! Crisp mountain views and sun-drenched private balconies.',
    effectType: 'snowfall',
    defaultDateWindow: { startMonth: 12, startDay: 1, endMonth: 2, endDay: 20 },
    palette: {
      surfaceTint: '#EFF6FF',
      cardTint: '#DBEAFE',
      cardBorder: '#3B82F6',
      headerBg: '#1E1B4B',
      headerText: '#C7D2FE',
      buttonBg: '#2563EB',
      buttonHover: '#1D4ED8',
      adminHeaderBg: '#1E1B4B',
      adminSidebarBg: '#0F172A',
      adminAccentBg: '#3B82F6',
      adminAccentText: '#DBEAFE',
      adminBannerGradient: 'linear-gradient(135deg, #1E1B4B 0%, #1D4ED8 55%, #0F172A 100%)',
      glowHex: '#3B82F6'
    }
  },
  regular: {
    id: 'regular',
    name: 'Devashish Sunlit Classic',
    badge: '☀️ Divine Tapovan Stay',
    tagline: 'Peaceful hotel & homestay in Tapovan, Rishikesh with pool & play area',
    primaryColor: '#D97706',
    secondaryColor: '#92400E',
    accentColor: '#FBBF24',
    bgGradient: 'from-amber-950/50 via-stone-900/50 to-stone-950/75',
    bannerMessage: 'Namaste! Welcome to Devashish Sunlit Homestay — peaceful rooms with complimentary pool and kids play area in Tapovan.',
    effectType: 'none',
    palette: {
      surfaceTint: '#FAFAF9',
      cardTint: '#FEF3C7',
      cardBorder: '#F59E0B',
      headerBg: '#451A03',
      headerText: '#FDE68A',
      buttonBg: '#B45309',
      buttonHover: '#92400E',
      adminHeaderBg: '#451A03',
      adminSidebarBg: '#1C1917',
      adminAccentBg: '#B45309',
      adminAccentText: '#FDE68A',
      adminBannerGradient: 'linear-gradient(135deg, #292524 0%, #451A03 55%, #1C1917 100%)',
      glowHex: '#D97706'
    }
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
  if ((month === 8 && day >= 25) || (month === 9 && day <= 4)) return 'janmashtami';
  if ((month === 9 && day >= 20) || (month === 10 && day <= 5)) return 'navratri';
  if (month === 10 && day >= 8 && day <= 16) return 'dussehra';
  if ((month === 10 && day >= 22) || (month === 11 && day <= 15)) return 'diwali';
  
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

  // Sync live festival CSS variables across entire DOM (Storefront + Customer + Admin Dashboards)
  useEffect(() => {
    const root = document.documentElement;
    const p = themeMeta.palette;
    root.style.setProperty('--sunlit-primary', themeMeta.primaryColor);
    root.style.setProperty('--sunlit-secondary', themeMeta.secondaryColor);
    root.style.setProperty('--sunlit-accent', themeMeta.accentColor);
    if (p) {
      root.style.setProperty('--sunlit-surface-tint', p.surfaceTint);
      root.style.setProperty('--sunlit-card-tint', p.cardTint);
      root.style.setProperty('--sunlit-card-border', p.cardBorder);
      root.style.setProperty('--sunlit-header-bg', p.headerBg);
      root.style.setProperty('--sunlit-header-text', p.headerText);
      root.style.setProperty('--sunlit-button-bg', p.buttonBg);
      root.style.setProperty('--sunlit-button-hover', p.buttonHover);
      root.style.setProperty('--sunlit-admin-header', p.adminHeaderBg);
      root.style.setProperty('--sunlit-admin-sidebar', p.adminSidebarBg);
      root.style.setProperty('--sunlit-admin-accent', p.adminAccentBg);
      root.style.setProperty('--sunlit-glow', p.glowHex);
    }
  }, [themeMeta]);

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
