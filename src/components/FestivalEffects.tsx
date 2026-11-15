import React, { useEffect, useRef } from 'react';
import { useFestivalTheme } from '../context/FestivalThemeContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  secondaryColor?: string;
  alpha: number;
  angle: number;
  va: number;
  phase: number;
  kind: 'diya' | 'ember' | 'gulal' | 'peacock' | 'snowflake' | 'confetti' | 'petal' | 'ribbon' | 'rain' | 'bokeh' | 'spark';
  type: string;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export const FestivalEffects: React.FC = () => {
  const { themeMeta, userAnimationOverride, config } = useFestivalTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldRender =
    userAnimationOverride &&
    !prefersReducedMotion &&
    config.particlesEnabled !== false &&
    config.animationIntensity !== 'off' &&
    themeMeta.effectType !== 'none';

  useEffect(() => {
    if (!shouldRender) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const isMobile = width < 768;
    const intensityCount =
      config.animationIntensity === 'low' ? 16 : config.animationIntensity === 'high' ? 52 : 30;
    const count = isMobile && config.mobileThrottlingEnabled !== false ? Math.min(intensityCount, 18) : intensityCount;

    const effectType = themeMeta.effectType;
    const particles: Particle[] = [];
    const ripples: Ripple[] = [];

    const createParticle = (index: number, initial: boolean): Particle => {
      const phase = Math.random() * Math.PI * 2;
      let color = '#F59E0B';
      let secondaryColor = '#FDE68A';
      let vx = (Math.random() - 0.5) * 0.6;
      let vy = 0.6 + Math.random() * 1.1;
      let size = 6 + Math.random() * 8;
      let kind: Particle['kind'] = 'bokeh';
      let alpha = 0.45 + Math.random() * 0.4;

      if (effectType === 'diyas') {
        const isDiya = index % 4 === 0;
        kind = isDiya ? 'diya' : 'ember';
        color = isDiya ? '#B45309' : ['#F59E0B', '#F97316', '#FDE047'][index % 3];
        secondaryColor = '#FEF08A';
        size = isDiya ? 14 + Math.random() * 6 : 2.2 + Math.random() * 3.5;
        vy = isDiya ? -(0.35 + Math.random() * 0.45) : -(0.6 + Math.random() * 1.2);
        vx = (Math.random() - 0.5) * 0.35;
        alpha = isDiya ? 0.88 : 0.65;
      } else if (effectType === 'colors') {
        const isCloud = index % 5 === 0;
        const holi = ['#EC4899', '#8B5CF6', '#10B981', '#F59E0B', '#06B6D4', '#F43F5E'];
        color = holi[index % holi.length];
        secondaryColor = holi[(index + 2) % holi.length];
        kind = isCloud ? 'gulal' : 'confetti';
        size = isCloud ? 22 + Math.random() * 28 : 4 + Math.random() * 5;
        vy = isCloud ? 0.25 + Math.random() * 0.4 : 0.7 + Math.random() * 1.1;
        vx = (Math.random() - 0.5) * 0.7;
        alpha = isCloud ? 0.24 : 0.7;
      } else if (effectType === 'peacock') {
        const isFeather = index % 3 === 0;
        kind = isFeather ? 'peacock' : 'bokeh';
        color = isFeather ? '#0284C7' : ['#38BDF8', '#10B981', '#FBBF24'][index % 3];
        secondaryColor = '#10B981';
        size = isFeather ? 13 + Math.random() * 7 : 3 + Math.random() * 4;
        vy = 0.45 + Math.random() * 0.8;
        vx = (Math.random() - 0.5) * 0.45;
        alpha = isFeather ? 0.78 : 0.55;
      } else if (effectType === 'snowfall') {
        const isCrystal = index % 2 === 0;
        kind = isCrystal ? 'snowflake' : 'bokeh';
        color = '#FFFFFF';
        secondaryColor = '#BAE6FD';
        size = isCrystal ? 6 + Math.random() * 7 : 2 + Math.random() * 2.5;
        vy = 0.65 + Math.random() * 1.3;
        vx = (Math.random() - 0.5) * 0.45;
        alpha = isCrystal ? 0.72 : 0.5;
      } else if (effectType === 'confetti') {
        const palette = ['#F59E0B', '#EC4899', '#3B82F6', '#10B981', '#8B5CF6', '#FDE047'];
        color = palette[index % palette.length];
        kind = index % 3 === 0 ? 'spark' : 'confetti';
        size = 5 + Math.random() * 6;
        vy = 1.0 + Math.random() * 1.8;
        vx = (Math.random() - 0.5) * 1.1;
        alpha = 0.78;
      } else if (effectType === 'petals') {
        const isRose = themeMeta.id === 'valentines';
        const palette = isRose
          ? ['#E11D48', '#FB7185', '#F43F5E', '#FDA4AF']
          : ['#F97316', '#F59E0B', '#FBBF24', '#FB7185'];
        color = palette[index % palette.length];
        secondaryColor = '#FFF1F2';
        kind = 'petal';
        size = 7 + Math.random() * 6;
        vy = 0.65 + Math.random() * 1.0;
        vx = 0.25 + Math.random() * 0.55;
        alpha = 0.75;
      } else if (effectType === 'flames') {
        kind = 'ember';
        color = ['#F59E0B', '#EA580C', '#EF4444', '#FDE047'][index % 4];
        size = 2.5 + Math.random() * 4.5;
        vy = -(0.8 + Math.random() * 1.4);
        vx = (Math.random() - 0.5) * 0.6;
        alpha = 0.72;
      } else if (effectType === 'tri_color') {
        const tri = ['#EA580C', '#FFFFFF', '#059669', '#0284C7'];
        color = tri[index % tri.length];
        kind = index % 4 === 0 ? 'spark' : 'ribbon';
        size = 6 + Math.random() * 6;
        vy = 0.55 + Math.random() * 0.9;
        vx = (Math.random() - 0.5) * 0.7;
        alpha = 0.75;
      } else if (effectType === 'monsoon_rain') {
        kind = 'rain';
        color = 'rgba(186, 230, 253, 0.85)';
        size = 14 + Math.random() * 12;
        vy = 6.5 + Math.random() * 5;
        vx = -1.6;
        alpha = 0.45 + Math.random() * 0.3;
      } else {
        // subtle_glow (Sunlit bokeh fireflies)
        kind = 'bokeh';
        color = themeMeta.primaryColor || '#F59E0B';
        secondaryColor = themeMeta.accentColor || '#FDE68A';
        size = 4 + Math.random() * 8;
        vy = -(0.2 + Math.random() * 0.45);
        vx = (Math.random() - 0.5) * 0.4;
        alpha = 0.35 + Math.random() * 0.35;
      }

      const startY =
        kind === 'diya' || kind === 'ember' || (kind === 'bokeh' && vy < 0)
          ? initial
            ? Math.random() * height
            : height + 30 + Math.random() * 60
          : initial
          ? Math.random() * height
          : -30;

      return {
        x: Math.random() * width,
        y: startY,
        vx,
        vy,
        size,
        color,
        secondaryColor,
        alpha,
        angle: Math.random() * Math.PI * 2,
        va: (Math.random() - 0.5) * 0.05,
        phase,
        kind,
        type: effectType
      };
    };

    for (let i = 0; i < count; i++) {
      particles.push(createParticle(i, true));
    }

    let tick = 0;

    const drawDiya = (p: Particle, time: number) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(time * 0.03 + p.phase) * 0.06);

      // Soft warm halo
      const halo = ctx.createRadialGradient(0, -p.size * 0.7, 1, 0, -p.size * 0.5, p.size * 1.9);
      halo.addColorStop(0, 'rgba(253, 224, 71, 0.48)');
      halo.addColorStop(0.5, 'rgba(245, 158, 11, 0.16)');
      halo.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, -p.size * 0.55, p.size * 1.9, 0, Math.PI * 2);
      ctx.fill();

      // Terracotta boat bowl
      ctx.fillStyle = '#9A3412';
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.quadraticCurveTo(0, p.size * 0.72, p.size, 0);
      ctx.quadraticCurveTo(0, p.size * 0.22, -p.size, 0);
      ctx.fill();

      // Gold rim highlight
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-p.size * 0.9, 0);
      ctx.quadraticCurveTo(0, p.size * 0.2, p.size * 0.9, 0);
      ctx.stroke();

      // Animated teardrop flame
      const flicker = 1 + Math.sin(time * 0.24 + p.phase) * 0.14;
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 1.15 * flicker);
      ctx.quadraticCurveTo(p.size * 0.36, -p.size * 0.4, 0, -p.size * 0.05);
      ctx.quadraticCurveTo(-p.size * 0.36, -p.size * 0.4, 0, -p.size * 1.15 * flicker);
      ctx.fill();

      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.moveTo(0, -p.size * 0.85 * flicker);
      ctx.quadraticCurveTo(p.size * 0.18, -p.size * 0.35, 0, -p.size * 0.1);
      ctx.quadraticCurveTo(-p.size * 0.18, -p.size * 0.35, 0, -p.size * 0.85 * flicker);
      ctx.fill();

      ctx.restore();
    };

    const drawPeacockFeather = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Outer emerald halo plume
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.75, p.size, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gold ring
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.ellipse(0, -p.size * 0.1, p.size * 0.48, p.size * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deep sapphire eye
      ctx.fillStyle = '#0369A1';
      ctx.beginPath();
      ctx.ellipse(0, -p.size * 0.14, p.size * 0.28, p.size * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      // Midnight center crescent
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0, -p.size * 0.14, p.size * 0.14, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawSnowflake = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      for (let arm = 0; arm < 6; arm++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -p.size);
        ctx.moveTo(0, -p.size * 0.55);
        ctx.lineTo(-p.size * 0.25, -p.size * 0.78);
        ctx.moveTo(0, -p.size * 0.55);
        ctx.lineTo(p.size * 0.25, -p.size * 0.78);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawSparkStar = (p: Particle) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.moveTo(0, 0);
        ctx.lineTo(p.size * 0.25, -p.size * 0.25);
        ctx.lineTo(0, -p.size);
        ctx.lineTo(-p.size * 0.25, -p.size * 0.25);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const sway = Math.sin(tick * 0.025 + p.phase) * 0.35;
        p.x += p.vx + (p.kind === 'rain' ? 0 : sway * 0.4);
        p.y += p.vy;
        p.angle += p.va;

        if (p.kind === 'diya' || p.kind === 'ember' || (p.kind === 'bokeh' && p.vy < 0)) {
          if (p.y < -60) {
            particles[i] = createParticle(i, false);
          }
        } else if (p.y > height + 35) {
          if (p.kind === 'rain' && ripples.length < 18) {
            ripples.push({ x: p.x, y: height - 8 - Math.random() * 16, radius: 2, alpha: 0.5 });
          }
          particles[i] = createParticle(i, false);
        }

        if (p.x < -40) p.x = width + 40;
        if (p.x > width + 40) p.x = -40;

        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (p.kind === 'diya') {
          drawDiya(p, tick);
        } else if (p.kind === 'peacock') {
          drawPeacockFeather(p);
        } else if (p.kind === 'snowflake') {
          drawSnowflake(p);
        } else if (p.kind === 'spark') {
          drawSparkStar(p);
        } else if (p.kind === 'gulal') {
          const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === 'rain') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 4, p.y + p.size);
          ctx.stroke();
        } else if (p.kind === 'petal') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.4, p.size * 0.8, p.size * 0.7, 0, p.size);
          ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.7, -p.size * 0.9, -p.size * 0.4, 0, -p.size);
          ctx.fill();
        } else if (p.kind === 'ribbon' || p.kind === 'confetti') {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.scale(Math.cos(tick * 0.08 + p.phase), 1);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.5, -p.size * 0.7, p.size, p.size * 1.35);
        } else if (p.kind === 'ember') {
          const grad = ctx.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, p.size * 2.4);
          grad.addColorStop(0, '#FEF08A');
          grad.addColorStop(0.45, p.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Luminous sunlit bokeh orb
          const grad = ctx.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, p.size * 2);
          grad.addColorStop(0, p.secondaryColor || '#FFFFFF');
          grad.addColorStop(0.5, p.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Draw monsoon bottom surface ripples
      for (let r = ripples.length - 1; r >= 0; r--) {
        const rip = ripples[r];
        rip.radius += 0.9;
        rip.alpha -= 0.018;
        if (rip.alpha <= 0) {
          ripples.splice(r, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = rip.alpha;
        ctx.strokeStyle = 'rgba(153, 246, 228, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(rip.x, rip.y, rip.radius * 1.8, rip.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [shouldRender, themeMeta.effectType, themeMeta.id, themeMeta.primaryColor, themeMeta.accentColor, config.animationIntensity, config.mobileThrottlingEnabled]);

  if (!shouldRender) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-20 h-full w-full opacity-80"
      aria-hidden="true"
    />
  );
};
