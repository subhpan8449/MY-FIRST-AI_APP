// Procedural Web Audio API sound synthesizer for crisp arcade FX without external MP3 dependencies

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getCtx(): AudioContext | null {
  if (isMuted || typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function setGameAudioMuted(muted: boolean) {
  isMuted = muted;
}

export function isGameAudioMuted(): boolean {
  return isMuted;
}

function playTone(
  freq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal = 0.08,
  delay = 0
) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), startTime + duration);
    }
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  } catch {
    // Ignore audio context edge cases
  }
}

export function playCollectSound(combo = 1) {
  const base = 520 + Math.min(combo, 6) * 55;
  playTone(base, base * 1.35, 0.12, 'triangle', 0.09);
}

export function playPowerUpSound() {
  playTone(440, 660, 0.12, 'sine', 0.09, 0);
  playTone(660, 880, 0.16, 'triangle', 0.09, 0.08);
}

export function playJumpSound(isDouble = false) {
  playTone(isDouble ? 360 : 240, isDouble ? 680 : 480, 0.14, 'sine', 0.08);
}

export function playHitSound() {
  playTone(190, 65, 0.22, 'sawtooth', 0.09);
}

export function playShieldBreakSound() {
  playTone(720, 300, 0.18, 'triangle', 0.08);
}

export function playFlipSound() {
  playTone(340, 520, 0.08, 'sine', 0.05);
}

export function playMatchSound(streak = 1) {
  const root = 480 + Math.min(streak, 5) * 40;
  playTone(root, root, 0.1, 'triangle', 0.08, 0);
  playTone(root * 1.25, root * 1.25, 0.16, 'triangle', 0.09, 0.07);
}

export function playVictorySound() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((n, idx) => playTone(n, n, 0.2, 'triangle', 0.08, idx * 0.09));
}
