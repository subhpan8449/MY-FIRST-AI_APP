import React, { useEffect, useRef } from 'react';
import { useFestivalTheme } from '../context/FestivalThemeContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  angle: number;
  va: number;
  type: string;
}

export const FestivalEffects: React.FC = () => {
  const { themeMeta, userAnimationOverride, config } = useFestivalTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldRender = userAnimationOverride && !prefersReducedMotion && config.particlesEnabled !== false && config.animationIntensity !== 'off' && themeMeta.effectType !== 'none';

  useEffect(() => {
    if (!shouldRender) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const isMobile = window.innerWidth < 768;
    const baseCount = config.animationIntensity === 'low' ? 14 : config.animationIntensity === 'high' ? 50 : 28;
    const count = isMobile && config.mobileThrottlingEnabled !== false ? Math.min(baseCount, 16) : baseCount;
    const particles: Particle[] = [];

    const effectType = themeMeta.effectType;

    for (let i = 0; i < count; i++) {
      particles.push(createParticle(width, height, effectType));
    }

    function createParticle(w: number, h: number, type: string): Particle {
      const angle = Math.random() * Math.PI * 2;
      let color = '#F59E0B';
      let vy = 0.5 + Math.random() * 1.2;
      let vx = (Math.random() - 0.5) * 0.8;
      let size = 3 + Math.random() * 4;

      if (type === 'snowfall') {
        color = 'rgba(255, 255, 255, 0.85)';
        vy = 0.8 + Math.random() * 1.5;
        vx = (Math.random() - 0.5) * 0.5;
        size = 2 + Math.random() * 4;
      } else if (type === 'colors') {
        const holiPalette = ['#EC4899', '#8B5CF6', '#10B981', '#F59E0B', '#06B6D4'];
        color = holiPalette[Math.floor(Math.random() * holiPalette.length)];
        vy = 0.4 + Math.random() * 0.8;
        size = 4 + Math.random() * 5;
      } else if (type === 'petals') {
        const petalPalette = ['#FB7185', '#F43F5E', '#FDA4AF', '#F59E0B'];
        color = petalPalette[Math.floor(Math.random() * petalPalette.length)];
        vy = 0.6 + Math.random() * 1.2;
        vx = Math.sin(Math.random() * Math.PI) * 0.8;
        size = 5 + Math.random() * 5;
      } else if (type === 'confetti') {
        const confPalette = ['#F59E0B', '#EC4899', '#3B82F6', '#10B981', '#8B5CF6', '#FDE047'];
        color = confPalette[Math.floor(Math.random() * confPalette.length)];
        vy = 1.0 + Math.random() * 2.0;
        size = 4 + Math.random() * 6;
      } else if (type === 'monsoon_rain') {
        color = 'rgba(186, 230, 253, 0.65)';
        vy = 4 + Math.random() * 4;
        vx = -1.2;
        size = 1.5;
      } else if (type === 'tri_color') {
        const tri = ['#EA580C', '#FFFFFF', '#059669', '#38BDF8'];
        color = tri[Math.floor(Math.random() * tri.length)];
        vy = 0.4 + Math.random() * 0.8;
      } else if (type === 'peacock') {
        const pc = ['#0284C7', '#059669', '#D97706', '#065F46', '#38BDF8'];
        color = pc[Math.floor(Math.random() * pc.length)];
        vy = 0.4 + Math.random() * 0.9;
        size = 4 + Math.random() * 4;
      } else if (type === 'diyas' || type === 'flames') {
        const flame = ['#F59E0B', '#F97316', '#FBBF24', '#EF4444'];
        color = flame[Math.floor(Math.random() * flame.length)];
        vy = -(0.5 + Math.random() * 1.0); // Floats upward like a warm ember
        size = 3 + Math.random() * 4;
      }

      return {
        x: Math.random() * w,
        y: type === 'diyas' || type === 'flames' ? h + Math.random() * 100 : Math.random() * h,
        vx,
        vy,
        size,
        color,
        alpha: 0.3 + Math.random() * 0.6,
        angle,
        va: (Math.random() - 0.5) * 0.04,
        type
      };
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.va;

        // Wrap around boundaries
        if (p.type === 'diyas' || p.type === 'flames') {
          if (p.y < -50) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }
        } else {
          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
        }

        if (p.x < -30) p.x = width + 30;
        if (p.x > width + 30) p.x = -30;

        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (p.type === 'monsoon_rain') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 3, p.y + 16);
          ctx.stroke();
        } else if (p.type === 'petals') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'confetti') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.3);
        } else if (p.type === 'diyas' || p.type === 'flames') {
          // Ember flame particle with soft glow
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Soft circular particle / dust mote / snowflake
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [shouldRender, themeMeta.effectType, config.animationIntensity]);

  if (!shouldRender) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-20 h-full w-full opacity-70"
      aria-hidden="true"
    />
  );
};
