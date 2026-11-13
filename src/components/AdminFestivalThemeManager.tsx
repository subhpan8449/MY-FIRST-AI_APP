import React, { useState } from 'react';
import { useFestivalTheme } from '../context/FestivalThemeContext';
import { FestivalThemeId } from '../types';
import { 
  Sparkles, 
  Calendar, 
  Sliders, 
  CheckCircle, 
  Flame, 
  Eye, 
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';

export const AdminFestivalThemeManager: React.FC = () => {
  const { 
    activeTheme, 
    themeMeta, 
    config, 
    allThemes, 
    updateAdminThemeConfig,
    setUserThemeOverride
  } = useFestivalTheme();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<FestivalThemeId>(config.activeTheme || 'regular');
  const [isAuto, setIsAuto] = useState(config.isAutoScheduled);
  const [intensity, setIntensity] = useState(config.animationIntensity || 'medium');
  const [customGreeting, setCustomGreeting] = useState(config.customGreeting || '');
  const [particlesEnabled, setParticlesEnabled] = useState(config.particlesEnabled !== false);
  const [parallaxEnabled, setParallaxEnabled] = useState(config.parallaxEnabled !== false);
  const [mobileThrottlingEnabled, setMobileThrottlingEnabled] = useState(config.mobileThrottlingEnabled !== false);
  const [soundEnabled, setSoundEnabled] = useState(Boolean(config.soundEnabled));

  const handleApply = async () => {
    setSaving(true);
    setSaveSuccess(false);

    const ok = await updateAdminThemeConfig({
      activeTheme: selectedTheme,
      isAutoScheduled: isAuto,
      animationIntensity: intensity,
      customGreeting: customGreeting.trim(),
      particlesEnabled,
      parallaxEnabled,
      mobileThrottlingEnabled,
      soundEnabled
    });

    setSaving(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleResetToAuto = async () => {
    setIsAuto(true);
    setUserThemeOverride(null);
    setSaving(true);
    await updateAdminThemeConfig({
      isAutoScheduled: true
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-bold text-white">Sunlit Festival Magic (15 Dynamic Themes)</h2>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                Live & Festival-Aware
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300">
              Transform Devashish Sunlit Homestay across India's sacred festivals and seasons with ambient lighting, greetings, and visual accents.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResetToAuto}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4 text-amber-400" />
              Reset to Auto-Schedule
            </button>
            <button
              onClick={handleApply}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? 'Publishing...' : 'Save & Publish Live'}
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-sm font-medium text-emerald-300">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
            Theme settings updated across all devices for visitors and guests!
          </div>
        )}
      </div>

      {/* Control Bar: Auto vs Manual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scheduling Mode</label>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAuto(true)}
              className={`flex-1 rounded-xl p-3 text-left border transition ${
                isAuto 
                  ? 'border-amber-500/60 bg-amber-500/10 text-white' 
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Calendar className="h-4 w-4 text-amber-400" />
                Automatic (Asia/Kolkata)
              </div>
              <p className="mt-1 text-xs text-slate-400">Switches dynamically on festival dates</p>
            </button>

            <button
              type="button"
              onClick={() => setIsAuto(false)}
              className={`flex-1 rounded-xl p-3 text-left border transition ${
                !isAuto 
                  ? 'border-amber-500/60 bg-amber-500/10 text-white' 
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Sliders className="h-4 w-4 text-amber-400" />
                Manual Override
              </div>
              <p className="mt-1 text-xs text-slate-400">Lock to your chosen theme</p>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Animation Intensity</label>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {(['off', 'low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setIntensity(level)}
                className={`rounded-xl py-2.5 text-xs font-semibold capitalize border transition ${
                  intensity === level
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-white'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Floating diyas, snowflakes, petals or rain particles</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Live Theme</label>
          <div className="mt-2 flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white shadow-inner"
              style={{ backgroundColor: themeMeta.primaryColor }}
            >
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">{themeMeta.name}</div>
              <div className="text-xs text-amber-400 font-medium">{themeMeta.badge}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {isAuto ? '🟢 Active via calendar auto-detection' : '🟡 Active via manual override'}
          </div>
        </div>
      </div>

      {/* Custom Greeting Banner Input */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Custom Top Greeting Message (Optional)
        </label>
        <p className="mt-1 text-xs text-slate-400">
          Leave blank to use the default festival blessing or type a custom notice for guests.
        </p>
        <div className="mt-3 flex gap-3">
          <input
            type="text"
            value={customGreeting}
            onChange={(e) => setCustomGreeting(e.target.value)}
            placeholder={`Default: ${themeMeta.bannerMessage}`}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
          {customGreeting && (
            <button
              onClick={() => setCustomGreeting('')}
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* MOTION & VISUAL CONTROL CENTER */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-amber-400" />
              <span>Motion &amp; Visual Control Center</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Fine-tune animation rendering, ambient canvas effects, mobile battery throttling, and sensory audio.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
            GPU Transform Optimized
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Toggle: Ambient Canvas Particles */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Ambient Particles</span>
              <button
                type="button"
                onClick={() => setParticlesEnabled(!particlesEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  particlesEnabled ? 'bg-amber-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Diyas, Holi gulal, snowflakes, flower petals, or festival confetti.
            </p>
          </div>

          {/* Toggle: Parallax & Section Transitions */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Parallax Transitions</span>
              <button
                type="button"
                onClick={() => setParallaxEnabled(!parallaxEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  parallaxEnabled ? 'bg-amber-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Controlled viewport image scaling and smooth section reveals.
            </p>
          </div>

          {/* Toggle: Mobile Performance Throttling */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Mobile Throttling</span>
              <button
                type="button"
                onClick={() => setMobileThrottlingEnabled(!mobileThrottlingEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  mobileThrottlingEnabled ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Caps particle density on smartphone screens to protect battery.
            </p>
          </div>

          {/* Toggle: Ambient Festival Sound */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Festival Audio</span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  soundEnabled ? 'bg-amber-600 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <span className="bg-white w-4 h-4 rounded-full shadow-md" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Optional subtle temple bells and Himalayan breeze soundscapes.
            </p>
          </div>
        </div>
      </div>

      {/* 15 Theme Grid */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Selectable Themes (15 Complete Festival Archetypes)</h3>
            <p className="text-xs text-slate-400">Click any card to select for manual override or click "Preview" to inspect immediately.</p>
          </div>
          <div className="text-xs font-semibold text-slate-400">
            15 Themes Available
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allThemes.map((t) => {
            const isSelected = selectedTheme === t.id;
            const isLive = activeTheme === t.id;

            return (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTheme(t.id);
                  if (isAuto) setIsAuto(false);
                }}
                className={`group relative cursor-pointer rounded-2xl border p-4 transition duration-200 ${
                  isSelected
                    ? 'border-amber-500 bg-slate-800/90 ring-2 ring-amber-500/20'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="h-4 w-4 rounded-full ring-2 ring-white/10"
                      style={{ backgroundColor: t.primaryColor }}
                    />
                    <h4 className="font-semibold text-sm text-white group-hover:text-amber-300 transition">
                      {t.name}
                    </h4>
                  </div>
                  {isLive && (
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      LIVE
                    </span>
                  )}
                </div>

                <div className="mt-2 text-xs font-medium text-amber-400/90">{t.badge}</div>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{t.tagline}</p>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Effect: {t.effectType}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserThemeOverride(t.id);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300"
                  >
                    <Eye className="h-3 w-3" />
                    Instant Preview
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
