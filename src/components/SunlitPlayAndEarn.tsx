import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserGameProgress, GameRewardVoucher } from '../types';
import { getUserGameProgress, getUserRewardVouchers } from '../services/db';
import {
  playCollectSound,
  playPowerUpSound,
  playJumpSound,
  playHitSound,
  playShieldBreakSound,
  playFlipSound,
  playMatchSound,
  playVictorySound,
  setGameAudioMuted
} from '../utils/gameAudio';
import gangaRapidsArt from '../assets/images/arcade_ganga_rapids_1794715804175.jpg';
import jhulaRunnerArt from '../assets/images/arcade_jhula_runner_1794715804564.jpg';
import tapovanTriviaArt from '../assets/images/arcade_tapovan_trivia_1794715805537.jpg';
import rewardsCardArt from '../assets/images/sunlit_rewards_emblem_1794715804188.jpg';
import {
  Waves,
  Award,
  Sparkles,
  Trophy,
  Play,
  RotateCcw,
  CheckCircle2,
  Copy,
  Gift,
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Zap,
  Compass,
  Grid,
  Brain,
  Timer,
  ArrowUp,
  ArrowDown,
  Volume2,
  VolumeX,
  Eye,
  Flame,
  Star,
  Shield,
  Magnet
} from 'lucide-react';

interface SunlitPlayAndEarnProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVoucherForBooking?: (code: string) => void;
}

// ==========================================
// EXPANDED TRIVIA QUESTION BANK (12 QUESTIONS)
// ==========================================
interface TriviaItem {
  q: string;
  options: string[];
  correct: number;
  fact: string;
  hint: string;
}

const TRIVIA_BANK: TriviaItem[] = [
  {
    q: 'Which holy river flows past Tapovan and emerges into the plains right at Rishikesh?',
    options: ['Yamuna', 'Sacred Ganga', 'Narmada', 'Alaknanda'],
    correct: 1,
    fact: 'The sacred Ganga descends from Devprayag through Himalayan gorges to meet the plains in Rishikesh.',
    hint: 'Worshipped each evening during Maha Aarti at Triveni Ghat.'
  },
  {
    q: 'Which two iconic pedestrian suspension bridges span the Ganga near Tapovan?',
    options: ['Howrah & Vidyasagar', 'Ram Jhula & Lakshman Jhula', 'Bandli & Bhakra', 'Laxmi & Ganga Bridge'],
    correct: 1,
    fact: 'Ram Jhula and Lakshman Jhula connect Tapovan with Swarg Ashram on opposite banks.',
    hint: 'Named after the two brothers of the Ramayana.'
  },
  {
    q: 'What historic 1968 visit put Rishikesh on the world map as the Yoga Capital?',
    options: ['Rolling Stones Retreat', 'The Beatles at Maharishi Ashram', 'Woodstock India', 'Elvis Mountain Tour'],
    correct: 1,
    fact: 'The Beatles lived at Chaurasi Kutia (Beatles Ashram) in 1968 and wrote songs for the White Album.',
    hint: 'The Fab Four from Liverpool.'
  },
  {
    q: 'What mindful vegetarian culinary style is freshly served by CookNow at Devashish Homestay?',
    options: ['Fast-Food Fry', 'Wholesome Satvik Cuisine', 'Frozen Meal Packs', 'Canned Curry'],
    correct: 1,
    fact: 'Satvik dishes emphasize fresh mountain ingredients, purity, lightness, and digestive balance.',
    hint: 'Traditional yoga & wellness lifestyle cuisine.'
  },
  {
    q: 'Which hilltop temple near Rishikesh is famous for panoramic sunrise views over snowy peaks?',
    options: ['Kunjapuri Devi Temple', 'Brihadeeswarar Temple', 'Konark Sun Temple', 'Meenakshi Temple'],
    correct: 0,
    fact: 'Sitting at 1,676 meters above sea level, Kunjapuri Devi rewards early risers with views of Chaukhamba.',
    hint: 'Located in Tehri Garhwal district overlooking Tapovan.'
  },
  {
    q: 'Which leisure amenities are complimentary for every room guest at Devashish Sunlit Homestay?',
    options: ['Golf & Helipad', 'Freshwater Pool & Kids Play Area', 'Casino Lounge', 'Ski Slope'],
    correct: 1,
    fact: 'Guests enjoy full access to the sparkling freshwater pool and 3 daily kids play area sessions.',
    hint: 'Perfect for cooling off in summer and keeping families happy.'
  },
  {
    q: 'Which ashram near Ram Jhula hosts one of the most celebrated daily evening Ganga Aartis?',
    options: ['Parmarth Niketan', 'Sabarmati Ashram', 'Auroville', 'Belur Math'],
    correct: 0,
    fact: 'Parmarth Niketan offers soul-stirring Vedic chants, lamps, and community prayers at sunset.',
    hint: 'Famous ashram directly across Ram Jhula on the eastern bank.'
  },
  {
    q: 'What adventure sport makes Shivpuri-to-Tapovan on the Ganga famous across Asia?',
    options: ['Ice Hockey', 'Whitewater River Rafting', 'Desert Camel Polo', 'Deep-Sea Diving'],
    correct: 1,
    fact: 'Grade II–IV rapids like Roller Coaster and Golf Course draw thrill-seekers year-round.',
    hint: 'Navigated with paddles and life jackets!'
  },
  {
    q: 'Which cascading forest waterfall lies just off Neelkanth Road near Tapovan?',
    options: ['Jog Falls', 'Neer Garh Waterfall', 'Dudhsagar Falls', 'Athirappilly'],
    correct: 1,
    fact: 'Neer Garh Waterfall features crystal-clear emerald rock pools nested in pine forest.',
    hint: 'Its name begins with "Neer" (meaning water).'
  },
  {
    q: 'At which temple perched atop forested hills is the sacred blue-throated Shiva worshipped near Rishikesh?',
    options: ['Neelkanth Mahadev Temple', 'Somnath Temple', 'Puri Jagannath', 'Modhera'],
    correct: 0,
    fact: 'Surrounded by Nar and Narayan valleys, Neelkanth Mahadev sits ~32 km through lush forest from Tapovan.',
    hint: 'Another name for Lord Shiva meaning "Blue Throat".'
  },
  {
    q: 'What sacred confluence 70 km upstream of Rishikesh merges the Alaknanda and Bhagirathi rivers to form the Ganga?',
    options: ['Prayagraj', 'Devprayag', 'Haridwar', 'Rudraprayag'],
    correct: 1,
    fact: 'You can literally watch the jade Bhagirathi and turquoise Alaknanda waters unite at Devprayag.',
    hint: 'First of the Panch Prayag heading up toward Badrinath.'
  },
  {
    q: 'How do Devashish Sunlit Homestay guests earn points into their Sunlit Rewards Club wallet?',
    options: ['Monthly paid subscription', 'Every completed booking & Play & Earn challenge', 'Bank wire fee', 'Lottery ticket'],
    correct: 1,
    fact: 'Each completed booking credits tier-multiplied Sunlit Points straight to your guest profile!',
    hint: 'Automatically triggered when your stay completes or when you play here.'
  }
];

// ==========================================
// MEMORY MATCH CARDS (12 PAIRS FOR UP TO 6x4)
// ==========================================
interface MemoryCard {
  id: number;
  pairId: number;
  label: string;
  subtitle: string;
  icon: string;
  accent: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MEMORY_PAIRS = [
  { pairId: 1, label: 'Holy Ganga', subtitle: 'Sacred River', icon: '🌊', accent: 'from-cyan-500/30 to-sky-600/20' },
  { pairId: 2, label: 'Ram Jhula', subtitle: 'Iconic Bridge', icon: '🌉', accent: 'from-amber-500/30 to-orange-600/20' },
  { pairId: 3, label: 'Ganga Aarti', subtitle: 'Evening Diyas', icon: '🪔', accent: 'from-yellow-500/30 to-amber-600/20' },
  { pairId: 4, label: 'Beatles Ashram', subtitle: '1968 Heritage', icon: '🎸', accent: 'from-purple-500/30 to-indigo-600/20' },
  { pairId: 5, label: 'Kunjapuri Dawn', subtitle: 'Himalayan Peaks', icon: '🏔️', accent: 'from-rose-500/30 to-orange-500/20' },
  { pairId: 6, label: 'Tapovan Yoga', subtitle: 'Zen Sanctuary', icon: '🧘', accent: 'from-emerald-500/30 to-teal-600/20' },
  { pairId: 7, label: 'Sunlit Pool', subtitle: 'Freshwater Swim', icon: '🏊', accent: 'from-blue-500/30 to-cyan-500/20' },
  { pairId: 8, label: 'Neelkanth', subtitle: 'Sacred Shrine', icon: '🛕', accent: 'from-orange-500/30 to-red-600/20' },
  { pairId: 9, label: 'Neer Falls', subtitle: 'Jungle Cascade', icon: '💧', accent: 'from-teal-500/30 to-emerald-500/20' },
  { pairId: 10, label: 'Satvik Thali', subtitle: 'CookNow Fresh', icon: '🍲', accent: 'from-lime-500/30 to-emerald-600/20' },
  { pairId: 11, label: 'Rafting Camp', subtitle: 'Whitewater', icon: '🛶', accent: 'from-sky-500/30 to-blue-600/20' },
  { pairId: 12, label: '3rd Floor Rooftop', subtitle: 'Sunset Vista', icon: '🌅', accent: 'from-fuchsia-500/30 to-amber-500/20' }
];

// Canvas Particle & Floating Text helpers
interface CanvasParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
}

export const SunlitPlayAndEarn: React.FC<SunlitPlayAndEarnProps> = ({
  isOpen,
  onClose,
  onSelectVoucherForBooking
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'games_menu' | 'ganga_quest' | 'runner' | 'memory' | 'brain_quest' | 'store' | 'vouchers'
  >('games_menu');

  // Sound state
  const [isMuted, setIsMuted] = useState(false);

  // Backend state
  const [progress, setProgress] = useState<UserGameProgress | null>(null);
  const [vouchers, setVouchers] = useState<GameRewardVoucher[]>([]);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Session state
  const sessionStartRef = useRef<number>(Date.now());
  const [pointsAwardedThisSession, setPointsAwardedThisSession] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ----------------------------------------------------
  // GAME 1: SUNLIT GANGA RAPIDS PRO STATE
  // ----------------------------------------------------
  const [g1Score, setG1Score] = useState(0);
  const [g1Distance, setG1Distance] = useState(0);
  const [g1Health, setG1Health] = useState(3);
  const [g1Combo, setG1Combo] = useState(1);
  const [g1Shield, setG1Shield] = useState(false);
  const [g1MagnetSec, setG1MagnetSec] = useState(0);
  const [g1Zone, setG1Zone] = useState('Tapovan Stream');
  const [g1State, setG1State] = useState<'idle' | 'playing' | 'trivia' | 'gameover'>('idle');
  const [currentTrivia, setCurrentTrivia] = useState<TriviaItem | null>(null);
  const [triviaResult, setTriviaResult] = useState<'correct' | 'wrong' | null>(null);
  const canvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const raftRef = useRef({
    x: 205,
    y: 380,
    targetX: 205,
    width: 50,
    height: 68,
    tilt: 0,
    invulnFrames: 0,
    shield: false,
    magnetTimer: 0,
    combo: 1,
    comboDecay: 0
  });
  const g1ScoreRef = useRef(0);
  const g1DistRef = useRef(0);
  const g1HpRef = useRef(3);
  const riverItemsRef = useRef<
    {
      id: number;
      x: number;
      y: number;
      type: 'lotus' | 'diya' | 'shield' | 'magnet' | 'log' | 'rock' | 'whirlpool';
      size: number;
      speed: number;
      rot: number;
    }[]
  >([]);
  const g1ParticlesRef = useRef<CanvasParticle[]>([]);
  const g1FloatsRef = useRef<FloatingText[]>([]);
  const g1ShakeRef = useRef(0);
  const lastSpawnRef1 = useRef(0);
  const lastTriviaDistanceRef = useRef(0);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // ----------------------------------------------------
  // GAME 2: LAKSHMAN JHULA SKY RUNNER PRO STATE
  // ----------------------------------------------------
  const [runnerState, setRunnerState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [runnerScore, setRunnerScore] = useState(0);
  const [runnerDistance, setRunnerDistance] = useState(0);
  const [runnerCombo, setRunnerCombo] = useState(1);
  const [runnerShield, setRunnerShield] = useState(false);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const runnerRef = useRef({
    y: 258,
    vy: 0,
    jumpsUsed: 0,
    isDucking: false,
    shield: false,
    invulnFrames: 0,
    stridePhase: 0,
    combo: 1
  });
  const runnerScoreRef = useRef(0);
  const runnerDistRef = useRef(0);
  const runnerObstacles = useRef<
    { id: number; x: number; type: 'bell' | 'crate' | 'lamp'; width: number; height: number; y: number; speed: number }[]
  >([]);
  const runnerPickups = useRef<
    { id: number; x: number; y: number; kind: 'coin' | 'diya' | 'shield'; collected: boolean; phase: number }[]
  >([]);
  const runnerParticlesRef = useRef<CanvasParticle[]>([]);
  const runnerFloatsRef = useRef<FloatingText[]>([]);
  const runnerShakeRef = useRef(0);
  const lastRunnerSpawn = useRef(0);

  // ----------------------------------------------------
  // GAME 3: HIMALAYAN SANCTUARY MATCH 3D STATE
  // ----------------------------------------------------
  const [memoryDifficulty, setMemoryDifficulty] = useState<'classic' | 'master'>('classic');
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryMatches, setMemoryMatches] = useState(0);
  const [memoryStreak, setMemoryStreak] = useState(0);
  const [memoryBestStreak, setMemoryBestStreak] = useState(0);
  const [memorySeconds, setMemorySeconds] = useState(0);
  const [memoryPeeking, setMemoryPeeking] = useState(false);
  const [memoryPeekUsed, setMemoryPeekUsed] = useState(false);
  const [memoryHintIds, setMemoryHintIds] = useState<number[]>([]);
  const [memoryHintUsed, setMemoryHintUsed] = useState(false);
  const [memoryState, setMemoryState] = useState<'idle' | 'playing' | 'completed'>('idle');

  // ----------------------------------------------------
  // GAME 4: TAPOVAN GRAND TRIVIA SHOWDOWN STATE
  // ----------------------------------------------------
  const [quizDeck, setQuizDeck] = useState<TriviaItem[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState(15);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [used5050, setUsed5050] = useState(false);
  const [usedTimeFreeze, setUsedTimeFreeze] = useState(false);
  const [usedSageHint, setUsedSageHint] = useState(false);
  const [showSageHintText, setShowSageHintText] = useState(false);
  const [quizState, setQuizState] = useState<'idle' | 'playing' | 'completed'>('idle');

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      setGameAudioMuted(next);
      return next;
    });
  };

  // Load user game data
  const loadUserGameData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [prog, vouch] = await Promise.all([
        getUserGameProgress(currentUser.uid),
        getUserRewardVouchers(currentUser.uid)
      ]);
      setProgress(prog);
      setVouchers(vouch);
    } catch (err) {
      console.warn('Game progress load notice:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isOpen) {
      loadUserGameData();
    }
  }, [isOpen, loadUserGameData]);

  // Memory elapsed timer
  useEffect(() => {
    if (activeTab !== 'memory' || memoryState !== 'playing') return;
    const t = setInterval(() => setMemorySeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [activeTab, memoryState]);

  // Trivia countdown timer
  useEffect(() => {
    if (activeTab !== 'brain_quest' || quizState !== 'playing' || quizSelectedOption !== null) return;
    const t = setInterval(() => {
      setQuizTimeLeft((prev) => {
        if (prev <= 1) {
          handleQuizAnswer(-1); // Time up!
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [activeTab, quizState, quizSelectedOption, quizIndex]);

  // Keyboard controls for Canvas games
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;

      if (activeTab === 'runner' && runnerState === 'playing') {
        if (['ArrowUp', ' ', 'w', 'W'].includes(e.key)) {
          e.preventDefault();
          triggerRunnerJump();
        }
        if (['ArrowDown', 's', 'S'].includes(e.key)) {
          e.preventDefault();
          runnerRef.current.isDucking = true;
          if (runnerRef.current.vy < 4) runnerRef.current.vy = 8; // fast-fall
        }
      }

      if (activeTab === 'ganga_quest' && g1State === 'playing') {
        if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) {
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
      if (activeTab === 'runner' && ['ArrowDown', 's', 'S'].includes(e.key)) {
        runnerRef.current.isDucking = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTab, runnerState, g1State]);

  // Submit verified session points
  const finishSession = useCallback(
    async (tokensEarned: number, durationSec: number) => {
      if (!currentUser) return;
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/game/award-points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.uid,
            tokensCollected: Math.max(2, Math.round(tokensEarned)),
            durationSeconds: Math.max(7, Math.round(durationSec))
          })
        });
        const data = await res.json();
        if (data.success) {
          setPointsAwardedThisSession(data.pointsAwarded || 0);
          setStatusNotice(data.message || `Awarded ${data.pointsAwarded} points!`);
          await loadUserGameData();
        } else {
          setStatusNotice(data.message || 'Could not verify points.');
        }
      } catch (err: any) {
        console.error('Points submission failed:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentUser, loadUserGameData]
  );

  // ----------------------------------------------------
  // GAME 1: SUNLIT GANGA RAPIDS PRO ENGINE
  // ----------------------------------------------------
  const startGangaQuest = () => {
    g1ScoreRef.current = 0;
    g1DistRef.current = 0;
    g1HpRef.current = 3;
    setG1Score(0);
    setG1Distance(0);
    setG1Health(3);
    setG1Combo(1);
    setG1Shield(false);
    setG1MagnetSec(0);
    setG1Zone('Tapovan Stream');
    setPointsAwardedThisSession(0);
    setCurrentTrivia(null);
    setTriviaResult(null);
    raftRef.current = {
      x: 205,
      y: 390,
      targetX: 205,
      width: 50,
      height: 68,
      tilt: 0,
      invulnFrames: 0,
      shield: false,
      magnetTimer: 0,
      combo: 1,
      comboDecay: 0
    };
    riverItemsRef.current = [];
    g1ParticlesRef.current = [];
    g1FloatsRef.current = [];
    g1ShakeRef.current = 0;
    lastSpawnRef1.current = Date.now();
    lastTriviaDistanceRef.current = 0;
    sessionStartRef.current = Date.now();
    setG1State('playing');
  };

  useEffect(() => {
    if (activeTab !== 'ganga_quest' || g1State !== 'playing') return;
    const canvas = canvasRef1.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 440;
    const H = 480;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let animId: number;
    let frame = 0;

    const spawnBurst = (x: number, y: number, color: string, count = 12) => {
      for (let k = 0; k < count; k++) {
        const ang = (Math.PI * 2 * k) / count + Math.random() * 0.4;
        const spd = 1.5 + Math.random() * 3.5;
        g1ParticlesRef.current.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          radius: 2.2 + Math.random() * 3,
          color,
          alpha: 1,
          life: 0,
          maxLife: 24 + Math.random() * 14
        });
      }
    };

    const addFloat = (x: number, y: number, text: string, color: string) => {
      g1FloatsRef.current.push({ x, y, vy: -1.4, text, color, life: 36 });
    };

    const loop = () => {
      frame++;
      const raft = raftRef.current;

      // Zone difficulty scaling
      const speedMult = 1 + Math.min(1.1, g1DistRef.current / 1200);
      if (g1DistRef.current > 900) setG1Zone('Shivpuri Whitewater');
      else if (g1DistRef.current > 400) setG1Zone('Lakshman Rapids');

      ctx.save();
      if (g1ShakeRef.current > 0) {
        g1ShakeRef.current--;
        ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      }

      // Rich Turquoise Ganga River Gradient
      const rGrad = ctx.createLinearGradient(0, 0, 0, H);
      rGrad.addColorStop(0, '#0369a1');
      rGrad.addColorStop(0.5, '#0891b2');
      rGrad.addColorStop(1, '#0c4a6e');
      ctx.fillStyle = rGrad;
      ctx.fillRect(0, 0, W, H);

      // Sunbeams & animated foaming current lanes
      const waveOff = (frame * 3.2 * speedMult) % 60;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.22)';
      ctx.lineWidth = 2;
      for (let y = waveOff - 60; y < H + 40; y += 60) {
        ctx.beginPath();
        ctx.moveTo(36, y);
        ctx.bezierCurveTo(W * 0.3, y + 14, W * 0.7, y - 14, W - 36, y);
        ctx.stroke();
      }
      // Subtle foam streaks
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      for (let s = 0; s < 6; s++) {
        const sy = ((s * 95 + frame * 5.2 * speedMult) % (H + 60)) - 30;
        const sx = 65 + ((s * 73) % (W - 140));
        ctx.beginPath();
        ctx.roundRect(sx, sy, 4, 24, 2);
        ctx.fill();
      }

      // Layered Himalayan pine & stone riverbanks
      ctx.fillStyle = '#14532d';
      ctx.fillRect(0, 0, 32, H);
      ctx.fillRect(W - 32, 0, 32, H);
      ctx.fillStyle = '#0f3d22';
      ctx.fillRect(0, 0, 16, H);
      ctx.fillRect(W - 16, 0, 16, H);
      // Scrolling bank boulders/trees
      for (let t = -40; t < H + 40; t += 72) {
        const ty = ((t + frame * 3 * speedMult) % (H + 72)) - 36;
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(18, ty, 11, 0, Math.PI * 2);
        ctx.arc(W - 18, ty + 30, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a8a29e';
        ctx.beginPath();
        ctx.arc(31, ty + 18, 6, 0, Math.PI * 2);
        ctx.arc(W - 31, ty - 10, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Steering (Keyboard + Pointer Target)
      let moveVx = 0;
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A']) {
        moveVx = -5.5;
        raft.targetX = raft.x + moveVx;
      } else if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D']) {
        moveVx = 5.5;
        raft.targetX = raft.x + moveVx;
      } else {
        moveVx = (raft.targetX - raft.x) * 0.22;
      }
      raft.x = Math.max(36, Math.min(W - raft.width - 36, raft.x + moveVx));
      raft.tilt = Math.max(-0.28, Math.min(0.28, moveVx * 0.045));

      if (raft.invulnFrames > 0) raft.invulnFrames--;
      if (raft.magnetTimer > 0) {
        raft.magnetTimer--;
        if (raft.magnetTimer % 30 === 0) setG1MagnetSec(Math.ceil(raft.magnetTimer / 60));
      } else {
        setG1MagnetSec(0);
      }
      if (raft.comboDecay > 0) {
        raft.comboDecay--;
        if (raft.comboDecay === 0 && raft.combo > 1) {
          raft.combo = 1;
          setG1Combo(1);
        }
      }

      // Dynamic Spawning
      const now = Date.now();
      const spawnInterval = Math.max(460, 860 - Math.floor(g1DistRef.current * 0.28));
      if (now - lastSpawnRef1.current > spawnInterval) {
        lastSpawnRef1.current = now;
        const r = Math.random();
        const sx = 46 + Math.random() * (W - 125);
        if (r < 0.42) {
          riverItemsRef.current.push({ id: now, x: sx, y: -32, type: 'lotus', size: 28, speed: 3.4 * speedMult, rot: 0 });
        } else if (r < 0.52) {
          riverItemsRef.current.push({ id: now, x: sx, y: -32, type: 'diya', size: 30, speed: 3.7 * speedMult, rot: 0 });
        } else if (r < 0.57 && !raft.shield) {
          riverItemsRef.current.push({ id: now, x: sx, y: -32, type: 'shield', size: 30, speed: 3.1 * speedMult, rot: 0 });
        } else if (r < 0.61) {
          riverItemsRef.current.push({ id: now, x: sx, y: -32, type: 'magnet', size: 30, speed: 3.1 * speedMult, rot: 0 });
        } else if (r < 0.78) {
          riverItemsRef.current.push({ id: now, x: sx, y: -32, type: 'log', size: 52, speed: 3.8 * speedMult, rot: 0 });
        } else if (r < 0.90) {
          riverItemsRef.current.push({ id: now, x: sx, y: -32, type: 'rock', size: 36, speed: 3.6 * speedMult, rot: 0 });
        } else {
          riverItemsRef.current.push({ id: now, x: sx, y: -32, type: 'whirlpool', size: 42, speed: 3.1 * speedMult, rot: 0 });
        }
      }

      // Raft Wake Foam Trail
      if (frame % 3 === 0) {
        g1ParticlesRef.current.push({
          x: raft.x + raft.width / 2 + (Math.random() - 0.5) * 20,
          y: raft.y + raft.height - 4,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 1.8,
          radius: 3 + Math.random() * 3,
          color: '#e0f2fe',
          alpha: 0.65,
          life: 0,
          maxLife: 18
        });
      }

      // Items Loop
      for (let i = riverItemsRef.current.length - 1; i >= 0; i--) {
        const it = riverItemsRef.current[i];
        it.y += it.speed;
        it.rot += 0.06;

        // Magnet attraction for collectibles
        if (raft.magnetTimer > 0 && (it.type === 'lotus' || it.type === 'diya')) {
          const cx = raft.x + raft.width / 2;
          const cy = raft.y + raft.height / 2;
          const dx = cx - (it.x + it.size / 2);
          const dy = cy - (it.y + it.size / 2);
          const d = Math.hypot(dx, dy);
          if (d < 175 && d > 1) {
            it.x += (dx / d) * 4.5;
            it.y += (dy / d) * 3.5;
          }
        }

        const itH = it.type === 'log' ? 18 : it.size;
        const hit =
          it.x < raft.x + raft.width - 6 &&
          it.x + it.size > raft.x + 6 &&
          it.y < raft.y + raft.height - 6 &&
          it.y + itH > raft.y + 6;

        if (hit) {
          if (it.type === 'lotus' || it.type === 'diya') {
            const basePts = it.type === 'diya' ? 12 : 5;
            const gained = basePts * raft.combo;
            g1ScoreRef.current += gained;
            setG1Score(g1ScoreRef.current);
            raft.combo = Math.min(5, raft.combo + 1);
            raft.comboDecay = 160;
            setG1Combo(raft.combo);
            playCollectSound(raft.combo);
            spawnBurst(it.x + it.size / 2, it.y + it.size / 2, it.type === 'diya' ? '#f59e0b' : '#f472b6', 14);
            addFloat(
              raft.x + raft.width / 2,
              raft.y - 10,
              `+${gained}${raft.combo > 1 ? ` · x${raft.combo}` : ''}`,
              '#fde047'
            );
          } else if (it.type === 'shield') {
            raft.shield = true;
            setG1Shield(true);
            playPowerUpSound();
            spawnBurst(it.x + 15, it.y + 15, '#38bdf8', 16);
            addFloat(raft.x + raft.width / 2, raft.y - 12, 'SHIELD ACTIVE!', '#38bdf8');
          } else if (it.type === 'magnet') {
            raft.magnetTimer = 420;
            setG1MagnetSec(7);
            playPowerUpSound();
            spawnBurst(it.x + 15, it.y + 15, '#a855f7', 16);
            addFloat(raft.x + raft.width / 2, raft.y - 12, 'LOTUS MAGNET!', '#d8b4fe');
          } else if (raft.invulnFrames === 0) {
            if (raft.shield) {
              raft.shield = false;
              setG1Shield(false);
              raft.invulnFrames = 45;
              g1ShakeRef.current = 8;
              playShieldBreakSound();
              spawnBurst(raft.x + raft.width / 2, raft.y + raft.height / 2, '#38bdf8', 18);
              addFloat(raft.x + raft.width / 2, raft.y - 10, 'SHIELD SAVED!', '#7dd3fc');
            } else {
              g1HpRef.current -= 1;
              raft.combo = 1;
              setG1Combo(1);
              setG1Health(g1HpRef.current);
              raft.invulnFrames = 55;
              g1ShakeRef.current = 14;
              playHitSound();
              spawnBurst(raft.x + raft.width / 2, raft.y + raft.height / 2, '#ef4444', 18);
              addFloat(raft.x + raft.width / 2, raft.y - 10, '-1 LIFE!', '#fca5a5');
              if (g1HpRef.current <= 0) {
                setG1State('gameover');
                const durSec = Math.floor((Date.now() - sessionStartRef.current) / 1000);
                finishSession(g1ScoreRef.current, durSec);
                ctx.restore();
                return;
              }
            }
          }
          riverItemsRef.current.splice(i, 1);
          continue;
        }

        // Draw high-detail game objects
        const cx = it.x + it.size / 2;
        const cy = it.y + it.size / 2;
        ctx.save();
        ctx.translate(cx, cy);

        if (it.type === 'lotus') {
          ctx.shadowColor = '#f472b6';
          ctx.shadowBlur = 12;
          for (let p = 0; p < 6; p++) {
            ctx.save();
            ctx.rotate(it.rot + (p * Math.PI) / 3);
            ctx.fillStyle = p % 2 === 0 ? '#f472b6' : '#fbcfe8';
            ctx.beginPath();
            ctx.ellipse(0, -7, 4.5, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (it.type === 'diya') {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 16;
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.ellipse(0, 5, 13, 6, 0, 0, Math.PI);
          ctx.fill();
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, -3 + Math.sin(frame * 0.25) * 1.5, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(0, -3, 2.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (it.type === 'shield') {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🛡', 0, 1);
        } else if (it.type === 'magnet') {
          ctx.shadowColor = '#c084fc';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#7e22ce';
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f3e8ff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🧲', 0, 1);
        } else if (it.type === 'log') {
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.roundRect(-it.size / 2, -9, it.size, 18, 7);
          ctx.fill();
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.arc(-it.size / 2 + 5, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (it.type === 'rock') {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.moveTo(-16, 10);
          ctx.lineTo(-10, -14);
          ctx.lineTo(8, -12);
          ctx.lineTo(17, 9);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.moveTo(-8, -11);
          ctx.lineTo(6, -9);
          ctx.lineTo(2, 2);
          ctx.closePath();
          ctx.fill();
        } else {
          // Animated Swirling Whirlpool
          ctx.rotate(it.rot * 2.2);
          for (let ring = 3; ring >= 1; ring--) {
            ctx.strokeStyle = ring === 1 ? '#bae6fd' : '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, ring * 6, 0, Math.PI * 1.45);
            ctx.stroke();
          }
        }
        ctx.restore();

        if (it.y > H + 50) riverItemsRef.current.splice(i, 1);
      }

      // Draw Detailed Whitewater Expedition Raft & Paddlers
      if (raft.invulnFrames % 6 < 4) {
        ctx.save();
        ctx.translate(raft.x + raft.width / 2, raft.y + raft.height / 2);
        ctx.rotate(raft.tilt);

        // Shield Aura Bubble
        if (raft.shield) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
          ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, raft.width * 0.8, raft.height * 0.72, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Animated Oars
        const oarSwing = Math.sin(frame * 0.25) * 0.35;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-20, -4);
        ctx.lineTo(-34, 8 + oarSwing * 14);
        ctx.moveTo(20, -4);
        ctx.lineTo(34, 8 - oarSwing * 14);
        ctx.stroke();

        // Outer Raft Tube
        ctx.fillStyle = '#ea580c';
        ctx.strokeStyle = '#9a3412';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-raft.width / 2, -raft.height / 2, raft.width, raft.height, 18);
        ctx.fill();
        ctx.stroke();

        // Inner Floor
        ctx.fillStyle = '#fdba74';
        ctx.beginPath();
        ctx.roundRect(-raft.width / 2 + 8, -raft.height / 2 + 10, raft.width - 16, raft.height - 20, 10);
        ctx.fill();

        // Two Helmeted Paddlers
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, -10, 7, 0, Math.PI * 2);
        ctx.arc(0, 12, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(0, -10, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 12, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Update Particles & Floating Score Popups
      for (let i = g1ParticlesRef.current.length - 1; i >= 0; i--) {
        const pt = g1ParticlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.maxLife) * pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (pt.life >= pt.maxLife) g1ParticlesRef.current.splice(i, 1);
      }

      for (let i = g1FloatsRef.current.length - 1; i >= 0; i--) {
        const fl = g1FloatsRef.current[i];
        fl.y += fl.vy;
        fl.life--;
        ctx.save();
        ctx.globalAlpha = Math.min(1, fl.life / 12);
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#020617';
        ctx.fillText(fl.text, fl.x + 1, fl.y + 1);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, fl.x, fl.y);
        ctx.restore();
        if (fl.life <= 0) g1FloatsRef.current.splice(i, 1);
      }

      ctx.restore();

      g1DistRef.current += 1;
      if (frame % 3 === 0) setG1Distance(g1DistRef.current);

      // Knowledge Checkpoint every 450m
      if (g1DistRef.current - lastTriviaDistanceRef.current >= 450) {
        lastTriviaDistanceRef.current = g1DistRef.current;
        const q = TRIVIA_BANK[Math.floor(Math.random() * TRIVIA_BANK.length)];
        setCurrentTrivia(q);
        setTriviaResult(null);
        setG1State('trivia');
        return;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, g1State, finishSession]);

  // ----------------------------------------------------
  // GAME 2: LAKSHMAN JHULA SKY RUNNER PRO ENGINE
  // ----------------------------------------------------
  const triggerRunnerJump = () => {
    const p = runnerRef.current;
    if (p.jumpsUsed < 2) {
      const isDouble = p.jumpsUsed === 1;
      p.vy = isDouble ? -11.2 : -12.6;
      p.jumpsUsed += 1;
      p.isDucking = false;
      playJumpSound(isDouble);
      for (let k = 0; k < (isDouble ? 14 : 8); k++) {
        runnerParticlesRef.current.push({
          x: 78,
          y: p.y + 42,
          vx: -1 - Math.random() * 2.5,
          vy: (Math.random() - 0.5) * 2,
          radius: 2.5 + Math.random() * 2,
          color: isDouble ? '#38bdf8' : '#fde68a',
          alpha: 0.9,
          life: 0,
          maxLife: 20
        });
      }
    }
  };

  const startRunner = () => {
    runnerScoreRef.current = 0;
    runnerDistRef.current = 0;
    setRunnerScore(0);
    setRunnerDistance(0);
    setRunnerCombo(1);
    setRunnerShield(false);
    setPointsAwardedThisSession(0);
    runnerRef.current = {
      y: 255,
      vy: 0,
      jumpsUsed: 0,
      isDucking: false,
      shield: false,
      invulnFrames: 0,
      stridePhase: 0,
      combo: 1
    };
    runnerObstacles.current = [];
    runnerPickups.current = [];
    runnerParticlesRef.current = [];
    runnerFloatsRef.current = [];
    runnerShakeRef.current = 0;
    lastRunnerSpawn.current = Date.now();
    sessionStartRef.current = Date.now();
    setRunnerState('playing');
  };

  useEffect(() => {
    if (activeTab !== 'runner' || runnerState !== 'playing') return;
    const canvas = canvasRef2.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 440;
    const H = 360;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let animId: number;
    let frame = 0;
    const groundY = 300;

    const runnerLoop = () => {
      frame++;
      const p = runnerRef.current;
      const worldSpeed = 5.4 + Math.min(4.2, runnerDistRef.current / 350);

      ctx.save();
      if (runnerShakeRef.current > 0) {
        runnerShakeRef.current--;
        ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
      }

      // Dynamic Sky (Sunset -> Twilight transition based on distance)
      const nightFactor = Math.min(1, runnerDistRef.current / 1400);
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      skyGrad.addColorStop(0, nightFactor > 0.5 ? '#020617' : '#0f172a');
      skyGrad.addColorStop(0.55, nightFactor > 0.5 ? '#1e1b4b' : '#7c2d12');
      skyGrad.addColorStop(1, nightFactor > 0.5 ? '#312e81' : '#f59e0b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, groundY);

      // Sun / Moon & Stars
      if (nightFactor > 0.3) {
        ctx.fillStyle = `rgba(255,255,255,${nightFactor * 0.7})`;
        for (let s = 0; s < 18; s++) {
          ctx.fillRect((s * 73) % W, (s * 41) % 140, 2, 2);
        }
      }
      ctx.fillStyle = nightFactor > 0.5 ? '#fef3c7' : '#fde047';
      ctx.beginPath();
      ctx.arc(340, 82 + nightFactor * 10, 24, 0, Math.PI * 2);
      ctx.fill();

      // Parallax Himalayan Mountains (Far + Near layers)
      const farOff = (frame * 0.6) % 240;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      for (let x = -240; x <= W + 240; x += 120) {
        ctx.lineTo(x - farOff + 60, 145);
        ctx.lineTo(x - farOff + 120, groundY);
      }
      ctx.fill();

      const nearOff = (frame * 1.4) % 180;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      for (let x = -180; x <= W + 180; x += 90) {
        ctx.lineTo(x - nearOff + 45, 195);
        ctx.lineTo(x - nearOff + 90, groundY);
      }
      ctx.fill();

      // Glowing Emerald Ganga under the Bridge
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(0, groundY + 12, W, H - groundY - 12);

      // Scrolling Lakshman Jhula Steel Pylons & Suspension Cables
      const towerOffset = (frame * worldSpeed) % 340;
      for (let tx = -towerOffset; tx < W + 120; tx += 340) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(tx, 58, 12, groundY - 58);
        ctx.fillRect(tx - 4, 58, 20, 10);
        // Swooping cable
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tx + 6, 65);
        ctx.quadraticCurveTo(tx + 176, 175, tx + 346, 65);
        ctx.stroke();
      }

      // Bridge Deck with scrolling planks
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, groundY, W, 18);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, groundY, W, 4);
      const plankOff = (frame * worldSpeed) % 28;
      ctx.fillStyle = '#64748b';
      for (let px = -plankOff; px < W; px += 28) {
        ctx.fillRect(px, groundY + 6, 14, 4);
      }

      // Physics Update
      p.vy += 0.68;
      p.y += p.vy;
      if (p.y >= groundY - 45) {
        p.y = groundY - 45;
        p.vy = 0;
        p.jumpsUsed = 0;
      }
      if (p.invulnFrames > 0) p.invulnFrames--;
      p.stridePhase += 0.34;

      const pHeight = p.isDucking ? 24 : 45;
      const pWidth = 26;
      const pX = 65;
      const pDrawY = p.isDucking ? groundY - 24 : p.y;

      // Draw Articulated Runner with Flowing Scarf & Shield Bubble
      if (p.invulnFrames % 6 < 4) {
        ctx.save();
        if (p.shield) {
          ctx.strokeStyle = '#38bdf8';
          ctx.fillStyle = 'rgba(56,189,248,0.18)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(pX + pWidth / 2, pDrawY + pHeight / 2 - 4, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        // Flowing saffron scarf
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pX + 6, pDrawY + 8);
        ctx.quadraticCurveTo(pX - 12, pDrawY + 4 + Math.sin(frame * 0.4) * 5, pX - 24, pDrawY + 12);
        ctx.stroke();

        // Torso
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.roundRect(pX, pDrawY, pWidth, pHeight - 10, 7);
        ctx.fill();

        // Animated legs
        if (!p.isDucking) {
          const swing = p.jumpsUsed > 0 ? 6 : Math.sin(p.stridePhase) * 9;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(pX + 8, pDrawY + pHeight - 12);
          ctx.lineTo(pX + 8 + swing, groundY);
          ctx.moveTo(pX + 18, pDrawY + pHeight - 12);
          ctx.lineTo(pX + 18 - swing, groundY);
          ctx.stroke();
        }

        // Head
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(pX + pWidth / 2 + 2, pDrawY - 7, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Spawn Obstacles & Arcs of Coins/Orbs
      const now = Date.now();
      const gap = Math.max(760, 1180 - Math.floor(runnerDistRef.current * 0.25));
      if (now - lastRunnerSpawn.current > gap) {
        lastRunnerSpawn.current = now;
        const kind = Math.random();
        if (kind < 0.36) {
          // Swinging Brass Temple Bell (DUCK!)
          runnerObstacles.current.push({
            id: now,
            x: W + 10,
            y: groundY - 58,
            width: 30,
            height: 28,
            type: 'bell',
            speed: worldSpeed
          });
        } else if (kind < 0.72) {
          // Wooden Cargo Crate (JUMP!)
          runnerObstacles.current.push({
            id: now,
            x: W + 10,
            y: groundY - 30,
            width: 30,
            height: 30,
            type: 'crate',
            speed: worldSpeed
          });
        } else {
          // Tall Temple Aarti Stand (HIGH/DOUBLE JUMP!)
          runnerObstacles.current.push({
            id: now,
            x: W + 10,
            y: groundY - 44,
            width: 22,
            height: 44,
            type: 'lamp',
            speed: worldSpeed
          });
        }

        // Coin arc or Shield Orb
        const spawnShield = Math.random() < 0.14 && !p.shield;
        if (spawnShield) {
          runnerPickups.current.push({
            id: now + 2,
            x: W + 90,
            y: groundY - 95,
            kind: 'shield',
            collected: false,
            phase: 0
          });
        } else {
          for (let c = 0; c < 3; c++) {
            runnerPickups.current.push({
              id: now + 10 + c,
              x: W + 55 + c * 28,
              y: kind < 0.36 ? groundY - 16 : groundY - 72 - (c === 1 ? 18 : 0),
              kind: c === 1 && Math.random() < 0.35 ? 'diya' : 'coin',
              collected: false,
              phase: c
            });
          }
        }
      }

      // Obstacles
      for (let i = runnerObstacles.current.length - 1; i >= 0; i--) {
        const obs = runnerObstacles.current[i];
        obs.x -= obs.speed;

        ctx.save();
        if (obs.type === 'bell') {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(obs.x + 15, 0);
          ctx.lineTo(obs.x + 15, obs.y);
          ctx.stroke();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(obs.x + 4, obs.y + 24);
          ctx.lineTo(obs.x + 10, obs.y);
          ctx.lineTo(obs.x + 20, obs.y);
          ctx.lineTo(obs.x + 26, obs.y + 24);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(obs.x + 15, obs.y + 25, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === 'crate') {
          ctx.fillStyle = '#92400e';
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
          ctx.fill();
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(obs.x + 3, obs.y + 3, obs.width - 6, obs.height - 6);
        } else {
          // Glowing Aarti Pillar
          ctx.fillStyle = '#b45309';
          ctx.fillRect(obs.x + 6, obs.y + 10, 10, obs.height - 10);
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(obs.x + 11, obs.y + 8, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        const hit =
          pX + 4 < obs.x + obs.width - 3 &&
          pX + pWidth - 4 > obs.x + 3 &&
          pDrawY + 4 < obs.y + obs.height - 3 &&
          pDrawY + pHeight - 2 > obs.y + 3;

        if (hit && p.invulnFrames === 0) {
          if (p.shield) {
            p.shield = false;
            p.invulnFrames = 45;
            setRunnerShield(false);
            runnerShakeRef.current = 8;
            playShieldBreakSound();
            runnerFloatsRef.current.push({ x: pX + 12, y: pDrawY - 12, vy: -1.4, text: 'SHIELDED!', color: '#7dd3fc', life: 36 });
            runnerObstacles.current.splice(i, 1);
            continue;
          } else {
            playHitSound();
            runnerShakeRef.current = 14;
            setRunnerState('gameover');
            const durSec = Math.floor((Date.now() - sessionStartRef.current) / 1000);
            finishSession(runnerScoreRef.current, durSec);
            ctx.restore();
            return;
          }
        }
        if (obs.x < -50) runnerObstacles.current.splice(i, 1);
      }

      // Pickups Loop
      for (let i = runnerPickups.current.length - 1; i >= 0; i--) {
        const pk = runnerPickups.current[i];
        pk.x -= worldSpeed;
        const bobY = pk.y + Math.sin(frame * 0.14 + pk.phase) * 3;

        ctx.save();
        if (pk.kind === 'shield') {
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(pk.x, bobY, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🛡', pk.x, bobY);
        } else {
          ctx.shadowColor = pk.kind === 'diya' ? '#fb923c' : '#fde047';
          ctx.shadowBlur = 10;
          ctx.fillStyle = pk.kind === 'diya' ? '#f97316' : '#fde047';
          ctx.beginPath();
          ctx.arc(pk.x, bobY, pk.kind === 'diya' ? 10 : 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.restore();

        const dist = Math.hypot(pX + pWidth / 2 - pk.x, pDrawY + pHeight / 2 - bobY);
        if (dist < 26 && !pk.collected) {
          pk.collected = true;
          if (pk.kind === 'shield') {
            p.shield = true;
            setRunnerShield(true);
            playPowerUpSound();
            runnerFloatsRef.current.push({ x: pk.x, y: bobY - 12, vy: -1.4, text: 'SHIELD!', color: '#38bdf8', life: 34 });
          } else {
            const pts = pk.kind === 'diya' ? 12 : 5;
            runnerScoreRef.current += pts;
            setRunnerScore(runnerScoreRef.current);
            p.combo = Math.min(4, p.combo + 1);
            setRunnerCombo(p.combo);
            playCollectSound(p.combo);
            runnerFloatsRef.current.push({ x: pk.x, y: bobY - 12, vy: -1.4, text: `+${pts}`, color: '#fde047', life: 28 });
          }
          for (let k = 0; k < 8; k++) {
            runnerParticlesRef.current.push({
              x: pk.x,
              y: bobY,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              radius: 2.5,
              color: pk.kind === 'shield' ? '#38bdf8' : '#fde047',
              alpha: 1,
              life: 0,
              maxLife: 18
            });
          }
          runnerPickups.current.splice(i, 1);
          continue;
        }
        if (pk.x < -30) runnerPickups.current.splice(i, 1);
      }

      // Particles & Floating Popups
      for (let i = runnerParticlesRef.current.length - 1; i >= 0; i--) {
        const pt = runnerParticlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.maxLife) * pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (pt.life >= pt.maxLife) runnerParticlesRef.current.splice(i, 1);
      }
      for (let i = runnerFloatsRef.current.length - 1; i >= 0; i--) {
        const fl = runnerFloatsRef.current[i];
        fl.y += fl.vy;
        fl.life--;
        ctx.save();
        ctx.globalAlpha = Math.min(1, fl.life / 12);
        ctx.font = '900 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, fl.x, fl.y);
        ctx.restore();
        if (fl.life <= 0) runnerFloatsRef.current.splice(i, 1);
      }

      ctx.restore();

      runnerDistRef.current += 1;
      if (frame % 3 === 0) setRunnerDistance(runnerDistRef.current);

      animId = requestAnimationFrame(runnerLoop);
    };

    animId = requestAnimationFrame(runnerLoop);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, runnerState, finishSession]);

  // ----------------------------------------------------
  // GAME 3: HIMALAYAN SANCTUARY MATCH 3D ENGINE
  // ----------------------------------------------------
  const startMemoryMatch = (diff: 'classic' | 'master' = memoryDifficulty) => {
    const pairCount = diff === 'master' ? 12 : 8;
    const selectedPairs = MEMORY_PAIRS.slice(0, pairCount);
    const cards: MemoryCard[] = [];
    let idCounter = 1;
    selectedPairs.forEach((p) => {
      cards.push({ id: idCounter++, pairId: p.pairId, label: p.label, subtitle: p.subtitle, icon: p.icon, accent: p.accent, isFlipped: false, isMatched: false });
      cards.push({ id: idCounter++, pairId: p.pairId, label: p.label, subtitle: p.subtitle, icon: p.icon, accent: p.accent, isFlipped: false, isMatched: false });
    });
    cards.sort(() => Math.random() - 0.5);

    setMemoryDifficulty(diff);
    setMemoryCards(cards);
    setFlippedCards([]);
    setMemoryMoves(0);
    setMemoryMatches(0);
    setMemoryStreak(0);
    setMemoryBestStreak(0);
    setMemorySeconds(0);
    setMemoryPeeking(false);
    setMemoryPeekUsed(false);
    setMemoryHintIds([]);
    setMemoryHintUsed(false);
    setPointsAwardedThisSession(0);
    sessionStartRef.current = Date.now();
    setMemoryState('playing');
  };

  const handleMemoryPeek = () => {
    if (memoryPeekUsed || memoryState !== 'playing') return;
    setMemoryPeekUsed(true);
    setMemoryPeeking(true);
    playPowerUpSound();
    setTimeout(() => setMemoryPeeking(false), 1500);
  };

  const handleMemoryHint = () => {
    if (memoryHintUsed || memoryState !== 'playing') return;
    const unmatched = memoryCards.filter((c) => !c.isMatched);
    if (unmatched.length < 2) return;
    const targetPairId = unmatched[0].pairId;
    const matchingPair = unmatched.filter((c) => c.pairId === targetPairId).map((c) => c.id);
    setMemoryHintUsed(true);
    setMemoryHintIds(matchingPair);
    playPowerUpSound();
    setTimeout(() => setMemoryHintIds([]), 2400);
  };

  const handleCardClick = (cardId: number) => {
    if (memoryPeeking || flippedCards.length === 2) return;
    const card = memoryCards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    playFlipSound();
    const newCards = memoryCards.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c));
    setMemoryCards(newCards);
    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMemoryMoves((m) => m + 1);
      const [firstId, secondId] = newFlipped;
      const c1 = newCards.find((c) => c.id === firstId);
      const c2 = newCards.find((c) => c.id === secondId);
      const targetTotalPairs = memoryDifficulty === 'master' ? 12 : 8;

      if (c1 && c2 && c1.pairId === c2.pairId) {
        const nextStreak = memoryStreak + 1;
        setMemoryStreak(nextStreak);
        setMemoryBestStreak((b) => Math.max(b, nextStreak));
        playMatchSound(nextStreak);

        setTimeout(() => {
          setMemoryCards((prev) =>
            prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c))
          );
          setFlippedCards([]);
          setMemoryMatches((matches) => {
            const next = matches + 1;
            if (next === targetTotalPairs) {
              setMemoryState('completed');
              playVictorySound();
              const bonusTokens = (memoryDifficulty === 'master' ? 50 : 30) + nextStreak * 4;
              const dur = Math.max(8, Math.floor((Date.now() - sessionStartRef.current) / 1000));
              finishSession(bonusTokens, dur);
            }
            return next;
          });
        }, 420);
      } else {
        setMemoryStreak(0);
        setTimeout(() => {
          setMemoryCards((prev) =>
            prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c))
          );
          setFlippedCards([]);
        }, 780);
      }
    }
  };

  // ----------------------------------------------------
  // GAME 4: TAPOVAN GRAND TRIVIA SHOWDOWN ENGINE
  // ----------------------------------------------------
  const startBrainQuest = () => {
    const shuffled = [...TRIVIA_BANK].sort(() => Math.random() - 0.5).slice(0, 8);
    setQuizDeck(shuffled);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizStreak(0);
    setQuizTimeLeft(15);
    setQuizSelectedOption(null);
    setEliminatedOptions([]);
    setUsed5050(false);
    setUsedTimeFreeze(false);
    setUsedSageHint(false);
    setShowSageHintText(false);
    setPointsAwardedThisSession(0);
    sessionStartRef.current = Date.now();
    setQuizState('playing');
  };

  const handleUse5050 = () => {
    if (used5050 || quizSelectedOption !== null || !quizDeck[quizIndex]) return;
    const q = quizDeck[quizIndex];
    const wrongIndices = [0, 1, 2, 3].filter((i) => i !== q.correct).sort(() => Math.random() - 0.5);
    setEliminatedOptions(wrongIndices.slice(0, 2));
    setUsed5050(true);
    playPowerUpSound();
  };

  const handleUseTimeFreeze = () => {
    if (usedTimeFreeze || quizSelectedOption !== null) return;
    setQuizTimeLeft((t) => t + 10);
    setUsedTimeFreeze(true);
    playPowerUpSound();
  };

  const handleUseSageHint = () => {
    if (usedSageHint || quizSelectedOption !== null) return;
    setShowSageHintText(true);
    setUsedSageHint(true);
    playPowerUpSound();
  };

  const handleQuizAnswer = (optionIdx: number) => {
    if (quizSelectedOption !== null || !quizDeck[quizIndex]) return;
    setQuizSelectedOption(optionIdx);

    const currentQ = quizDeck[quizIndex];
    const isCorrect = optionIdx === currentQ.correct;
    const speedBonus = quizTimeLeft >= 10 ? 5 : 0;
    const streakMult = quizStreak >= 2 ? 15 : 10;
    const delta = isCorrect ? streakMult + speedBonus : 0;

    if (isCorrect) {
      setQuizScore((s) => s + delta);
      setQuizStreak((st) => st + 1);
      playMatchSound(quizStreak + 1);
    } else {
      setQuizStreak(0);
      playHitSound();
    }

    setTimeout(() => {
      if (quizIndex + 1 < quizDeck.length) {
        setQuizIndex((i) => i + 1);
        setQuizSelectedOption(null);
        setEliminatedOptions([]);
        setShowSageHintText(false);
        setQuizTimeLeft(15);
      } else {
        setQuizState('completed');
        playVictorySound();
        const dur = Math.max(8, Math.floor((Date.now() - sessionStartRef.current) / 1000));
        finishSession(quizScore + delta, dur);
      }
    }, 1500);
  };

  // Reward redemption
  const handleRedeemVoucher = async (pointsCost: number, discountAmount: number) => {
    if (!currentUser) return;
    if (!progress || progress.pointsBalance < pointsCost) {
      setStatusNotice(`You need ${pointsCost} points to redeem this voucher.`);
      return;
    }

    try {
      const res = await fetch('/api/game/redeem-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          discountAmount,
          minBookingAmount: discountAmount >= 250 ? 2000 : 800
        })
      });
      const data = await res.json();
      if (data.success) {
        playVictorySound();
        setStatusNotice(`Redeemed voucher ${data.code} for ₹${discountAmount} off!`);
        await loadUserGameData();
        setActiveTab('vouchers');
      } else {
        setStatusNotice(data.message || 'Could not redeem voucher.');
      }
    } catch (err: any) {
      setStatusNotice(err.message || 'Failed to redeem voucher.');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-amber-500/35 flex flex-col max-h-[94vh] animate-scaleIn">
        {/* ARCADE STUDIO TOP HEADER */}
        <div className="bg-gradient-to-r from-slate-950 via-amber-950/80 to-slate-950 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-amber-500/25">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg tracking-tight text-white">
                  Sunlit Play &amp; Earn Arcade
                </h3>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">
                  Pro Edition
                </span>
              </div>
              <p className="text-xs text-slate-300">
                60FPS Interactive Rishikesh Games · Unlock Instant Room Discount Vouchers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? 'Enable Arcade Sound FX' : 'Mute Arcade Sound FX'}
              className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-slate-700 transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
              aria-label="Close Arcade"
            >
              ✕
            </button>
          </div>
        </div>

        {/* WALLET & NAVIGATION STRIP */}
        <div className="bg-slate-950 px-5 sm:px-6 py-2.5 text-white flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Arcade Balance:</span>
              <span className="font-black text-amber-300 text-sm tabular-nums">
                {progress?.pointsBalance ?? 0} pts
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Daily Cap:</span>
              <span className="text-emerald-400 font-bold tabular-nums">
                {progress?.dailyPointsEarned ?? 0} / 100 pts
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('games_menu')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                ['games_menu', 'ganga_quest', 'runner', 'memory', 'brain_quest'].includes(activeTab)
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Arcade Lobby</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('store')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'store' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Reward Store</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vouchers')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'vouchers' ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Vouchers ({vouchers.filter((v) => !v.isUsed).length})
            </button>
          </div>
        </div>

        {statusNotice && (
          <div className="bg-amber-500/15 px-5 py-2 border-b border-amber-500/25 text-amber-200 text-xs flex items-center justify-between">
            <span className="font-semibold">{statusNotice}</span>
            <button onClick={() => setStatusNotice(null)} className="text-slate-300 hover:text-white cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 1: FLAGSHIP ARCADE LOBBY */}
        {/* ==================================================== */}
        {activeTab === 'games_menu' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Choose Your Himalayan Arcade Game
                </h4>
                <p className="text-xs text-slate-400">
                  Play any game to earn arcade points and redeem them for real ₹50 – ₹250 stay vouchers.
                </p>
              </div>
              {!currentUser && (
                <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
                  Sign in with Google to save rewards
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Game 1 Card */}
              <div
                onClick={() => {
                  setActiveTab('ganga_quest');
                  startGangaQuest();
                }}
                className="group cursor-pointer rounded-3xl overflow-hidden border border-sky-500/35 bg-slate-950 hover:border-sky-400 transition-all duration-300 hover:-translate-y-0.5 shadow-xl flex flex-col justify-between"
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={gangaRapidsArt}
                    alt="Sunlit Ganga Rapids Whitewater Game"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-sky-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                    Action · Power-Ups
                  </span>
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-slate-950/80 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                    Up to 5x Combo
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-white text-base group-hover:text-sky-300 transition">
                      Sunlit Ganga Rapids
                    </h5>
                    <Waves className="w-4 h-4 text-sky-400" />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pilot your whitewater raft through foaming Himalayan rapids. Grab Shields, Lotus Magnets &amp; Golden Diyas!
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-400">60FPS Physics + Drag/Key</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-500 text-slate-950 font-black">
                      <Play className="w-3 h-3 fill-current" /> Play
                    </span>
                  </div>
                </div>
              </div>

              {/* Game 2 Card */}
              <div
                onClick={() => {
                  setActiveTab('runner');
                  startRunner();
                }}
                className="group cursor-pointer rounded-3xl overflow-hidden border border-amber-500/35 bg-slate-950 hover:border-amber-400 transition-all duration-300 hover:-translate-y-0.5 shadow-xl flex flex-col justify-between"
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={jhulaRunnerArt}
                    alt="Lakshman Jhula Sky Runner"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                    Double-Jump Runner
                  </span>
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-slate-950/80 text-amber-200 text-[10px] font-bold border border-amber-400/30">
                    Day → Night Sky
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-white text-base group-hover:text-amber-300 transition">
                      Lakshman Jhula Sky Runner
                    </h5>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Dash across the iconic Ganga suspension bridge! Time double-jumps &amp; slides beneath swinging temple bells.
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                    <span className="text-amber-400">Parallax Bridge + Shield</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-black">
                      <Play className="w-3 h-3 fill-current" /> Play
                    </span>
                  </div>
                </div>
              </div>

              {/* Game 3 Card */}
              <div
                onClick={() => {
                  setActiveTab('memory');
                  startMemoryMatch('classic');
                }}
                className="group cursor-pointer rounded-3xl overflow-hidden border border-emerald-500/35 bg-slate-950 hover:border-emerald-400 transition-all duration-300 hover:-translate-y-0.5 shadow-xl flex flex-col justify-between"
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={rewardsCardArt}
                    alt="Himalayan Sanctuary Match 3D"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                    3D Puzzle Arena
                  </span>
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-slate-950/80 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                    8 / 12 Pairs
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-white text-base group-hover:text-emerald-300 transition">
                      Himalayan Sanctuary Match 3D
                    </h5>
                    <Grid className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Smooth 3D card-flip challenge with Classic &amp; Master modes, streak multipliers &amp; Sunlit Peek power-ups.
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-400">Up to +50 Tokens/Run</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-400 text-slate-950 font-black">
                      <Play className="w-3 h-3 fill-current" /> Play
                    </span>
                  </div>
                </div>
              </div>

              {/* Game 4 Card */}
              <div
                onClick={() => {
                  setActiveTab('brain_quest');
                  startBrainQuest();
                }}
                className="group cursor-pointer rounded-3xl overflow-hidden border border-purple-500/35 bg-slate-950 hover:border-purple-400 transition-all duration-300 hover:-translate-y-0.5 shadow-xl flex flex-col justify-between"
              >
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={tapovanTriviaArt}
                    alt="Tapovan Grand Trivia Showdown"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-purple-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                    Showdown Quiz
                  </span>
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-slate-950/80 text-purple-200 text-[10px] font-bold border border-purple-400/30">
                    3 Lifelines
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-white text-base group-hover:text-purple-300 transition">
                      Tapovan Grand Trivia Showdown
                    </h5>
                    <Brain className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Beat the 15-second countdown with 50/50, Time Freeze &amp; Sage Hint lifelines across Rishikesh mysteries.
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                    <span className="text-purple-400">Speed + Fire Streak</span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-400 text-slate-950 font-black">
                      <Play className="w-3 h-3 fill-current" /> Play
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* GAME 1: SUNLIT GANGA RAPIDS PRO */}
        {/* ==================================================== */}
        {activeTab === 'ganga_quest' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center space-y-3">
            {/* Pro Arcade HUD */}
            <div className="w-full max-w-[440px] grid grid-cols-4 gap-2 bg-slate-950/90 p-2.5 rounded-2xl border border-slate-800 text-xs">
              <div className="px-2 py-1 rounded-xl bg-slate-900">
                <span className="text-[9px] text-slate-400 uppercase block">Score</span>
                <span className="font-black text-amber-300 text-sm tabular-nums">{g1Score}</span>
              </div>
              <div className="px-2 py-1 rounded-xl bg-slate-900">
                <span className="text-[9px] text-slate-400 uppercase block">Combo</span>
                <span className="font-black text-sky-300 text-sm tabular-nums">x{g1Combo}</span>
              </div>
              <div className="px-2 py-1 rounded-xl bg-slate-900">
                <span className="text-[9px] text-slate-400 uppercase block">Zone ({g1Distance}m)</span>
                <span className="font-bold text-emerald-300 text-[10px] truncate block">{g1Zone}</span>
              </div>
              <div className="px-2 py-1 rounded-xl bg-slate-900 text-right">
                <span className="text-[9px] text-slate-400 uppercase block">Hull HP</span>
                <span className="font-black text-rose-400 text-sm">{'❤️'.repeat(Math.max(0, g1Health))}</span>
              </div>
            </div>

            {/* Active Power-Up Strip */}
            {(g1Shield || g1MagnetSec > 0) && (
              <div className="flex items-center gap-2 text-[11px] font-bold">
                {g1Shield && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40">
                    <Shield className="w-3 h-3" /> Shield Ready
                  </span>
                )}
                {g1MagnetSec > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40 tabular-nums">
                    <Magnet className="w-3 h-3" /> Magnet {g1MagnetSec}s
                  </span>
                )}
              </div>
            )}

            {/* HiDPI Canvas Viewport (supports direct pointer/touch drag) */}
            <div className="relative border-2 border-sky-500/40 rounded-3xl overflow-hidden shadow-2xl bg-sky-900 w-full max-w-[440px] aspect-[440/480]">
              <canvas
                ref={canvasRef1}
                onPointerMove={(e) => {
                  if (g1State !== 'playing') return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = ((e.clientX - rect.left) / rect.width) * 440;
                  raftRef.current.targetX = relX - raftRef.current.width / 2;
                }}
                onPointerDown={(e) => {
                  if (g1State !== 'playing') return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = ((e.clientX - rect.left) / rect.width) * 440;
                  raftRef.current.targetX = relX - raftRef.current.width / 2;
                }}
                className="block w-full h-full touch-none cursor-ew-resize"
              />

              {/* Trivia Gate */}
              {g1State === 'trivia' && currentTrivia && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 text-white">
                  <div className="bg-slate-900 border border-amber-400/40 rounded-2xl p-5 text-center space-y-3 max-w-xs shadow-2xl">
                    <div className="flex items-center justify-center gap-1.5 text-amber-300 font-black text-xs uppercase">
                      <HelpCircle className="w-4 h-4" />
                      <span>Rapid Gate Bonus (+15 Pts)</span>
                    </div>
                    <h5 className="font-bold text-sm text-white">{currentTrivia.q}</h5>
                    <div className="space-y-1.5">
                      {currentTrivia.options.map((opt, idx) => (
                        <button
                          key={opt}
                          disabled={triviaResult !== null}
                          onClick={() => {
                            if (idx === currentTrivia.correct) {
                              setTriviaResult('correct');
                              g1ScoreRef.current += 15;
                              setG1Score(g1ScoreRef.current);
                              playVictorySound();
                            } else {
                              setTriviaResult('wrong');
                              playHitSound();
                            }
                            setTimeout(() => {
                              setG1State('playing');
                              setCurrentTrivia(null);
                              setTriviaResult(null);
                            }, 1400);
                          }}
                          className="w-full py-2 px-3 rounded-xl text-xs font-semibold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-left transition cursor-pointer"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {triviaResult === 'correct' && <div className="text-emerald-400 font-bold text-xs">Brilliant! +15 Pts!</div>}
                    {triviaResult === 'wrong' && <div className="text-rose-300 text-xs">{currentTrivia.fact}</div>}
                  </div>
                </div>
              )}

              {/* End Screen */}
              {g1State === 'gameover' && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 text-white animate-fadeIn">
                  <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 text-center space-y-3 max-w-xs w-full shadow-2xl">
                    <Trophy className="w-11 h-11 text-amber-400 mx-auto" />
                    <h4 className="text-lg font-black text-white">Expedition Complete!</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Distance</span>
                        <strong className="text-sky-300 tabular-nums">{g1Distance}m</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Score</span>
                        <strong className="text-amber-300 tabular-nums">{g1Score} pts</strong>
                      </div>
                    </div>
                    <div className="bg-emerald-500/15 border border-emerald-500/30 p-2.5 rounded-xl text-xs text-emerald-300 font-bold tabular-nums">
                      {isSubmitting ? 'Verifying score...' : `Reward Credited: +${pointsAwardedThisSession} pts`}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={startGangaQuest} className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs cursor-pointer">
                        Raft Again
                      </button>
                      <button onClick={() => setActiveTab('games_menu')} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                        Arcade Lobby
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Touch/Arrow Steering Hint + Quick Buttons */}
            <div className="flex items-center gap-3 w-full max-w-[440px]">
              <button
                onPointerDown={() => (keysPressed.current['ArrowLeft'] = true)}
                onPointerUp={() => (keysPressed.current['ArrowLeft'] = false)}
                onPointerLeave={() => (keysPressed.current['ArrowLeft'] = false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" /> Left
              </button>
              <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">Drag/Slide or A/D</span>
              <button
                onPointerDown={() => (keysPressed.current['ArrowRight'] = true)}
                onPointerUp={() => (keysPressed.current['ArrowRight'] = false)}
                onPointerLeave={() => (keysPressed.current['ArrowRight'] = false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                Right <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* GAME 2: LAKSHMAN JHULA SKY RUNNER PRO */}
        {/* ==================================================== */}
        {activeTab === 'runner' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col items-center space-y-3">
            <div className="w-full max-w-[440px] grid grid-cols-4 gap-2 bg-slate-950/90 p-2.5 rounded-2xl border border-slate-800 text-xs">
              <div className="px-2 py-1 rounded-xl bg-slate-900">
                <span className="text-[9px] text-slate-400 uppercase block">Coins</span>
                <span className="font-black text-amber-300 text-sm tabular-nums">{runnerScore}</span>
              </div>
              <div className="px-2 py-1 rounded-xl bg-slate-900">
                <span className="text-[9px] text-slate-400 uppercase block">Bridge</span>
                <span className="font-black text-sky-300 text-sm tabular-nums">{runnerDistance}m</span>
              </div>
              <div className="px-2 py-1 rounded-xl bg-slate-900">
                <span className="text-[9px] text-slate-400 uppercase block">Flow</span>
                <span className="font-black text-orange-300 text-sm tabular-nums">x{runnerCombo}</span>
              </div>
              <div className="px-2 py-1 rounded-xl bg-slate-900 text-right">
                <span className="text-[9px] text-slate-400 uppercase block">Shield</span>
                <span className={`font-black text-xs ${runnerShield ? 'text-sky-300' : 'text-slate-500'}`}>
                  {runnerShield ? 'ACTIVE' : 'NONE'}
                </span>
              </div>
            </div>

            <div className="relative border-2 border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl bg-slate-950 w-full max-w-[440px] aspect-[440/360]">
              <canvas
                ref={canvasRef2}
                onPointerDown={() => {
                  if (runnerState === 'playing') triggerRunnerJump();
                }}
                className="block w-full h-full touch-none cursor-pointer"
              />

              {runnerState === 'gameover' && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 text-white animate-fadeIn">
                  <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 text-center space-y-3 max-w-xs w-full shadow-2xl">
                    <Trophy className="w-11 h-11 text-amber-400 mx-auto" />
                    <h4 className="text-lg font-black text-white">Bridge Sprint Ended!</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Distance</span>
                        <strong className="text-sky-300 tabular-nums">{runnerDistance}m</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Score</span>
                        <strong className="text-amber-300 tabular-nums">{runnerScore} pts</strong>
                      </div>
                    </div>
                    <div className="bg-emerald-500/15 border border-emerald-500/30 p-2.5 rounded-xl text-xs text-emerald-300 font-bold tabular-nums">
                      {isSubmitting ? 'Verifying run...' : `Reward Credited: +${pointsAwardedThisSession} pts`}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={startRunner} className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs cursor-pointer">
                        Run Again
                      </button>
                      <button onClick={() => setActiveTab('games_menu')} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer">
                        Arcade Lobby
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full max-w-[440px]">
              <button
                onPointerDown={triggerRunnerJump}
                className="flex-1 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowUp className="h-4 w-4" /> Jump / Double Jump
              </button>
              <button
                onPointerDown={() => (runnerRef.current.isDucking = true)}
                onPointerUp={() => (runnerRef.current.isDucking = false)}
                onPointerLeave={() => (runnerRef.current.isDucking = false)}
                className="flex-1 py-3 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowDown className="h-4 w-4" /> Slide (Duck Bells)
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* GAME 3: HIMALAYAN SANCTUARY MATCH 3D */}
        {/* ==================================================== */}
        {activeTab === 'memory' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Pro Memory HUD */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">
                  Pairs:{' '}
                  <strong className="text-emerald-400 tabular-nums">
                    {memoryMatches}/{memoryDifficulty === 'master' ? 12 : 8}
                  </strong>
                </span>
                <span className="text-slate-300">
                  Moves: <strong className="text-amber-300 tabular-nums">{memoryMoves}</strong>
                </span>
                <span className="text-slate-300 flex items-center gap-1 tabular-nums">
                  <Timer className="w-3.5 h-3.5 text-sky-400" /> {memorySeconds}s
                </span>
                {memoryStreak >= 2 && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-extrabold text-[10px]">
                    🔥 {memoryStreak}x Streak
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleMemoryPeek}
                  disabled={memoryPeekUsed || memoryState !== 'playing'}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-35 text-sky-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" /> Peek
                </button>
                <button
                  type="button"
                  onClick={handleMemoryHint}
                  disabled={memoryHintUsed || memoryState !== 'playing'}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 disabled:opacity-35 text-purple-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Pair Hint
                </button>
                <button
                  type="button"
                  onClick={() => startMemoryMatch(memoryDifficulty === 'classic' ? 'master' : 'classic')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] cursor-pointer"
                >
                  {memoryDifficulty === 'classic' ? 'Go 6×4 Master' : '4×4 Classic'}
                </button>
                <button
                  type="button"
                  onClick={() => startMemoryMatch(memoryDifficulty)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  title="Shuffle New Board"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3D Perspective Card Grid */}
            <div
              className={`grid gap-2.5 mx-auto ${
                memoryDifficulty === 'master' ? 'grid-cols-4 sm:grid-cols-6 max-w-2xl' : 'grid-cols-4 max-w-md'
              }`}
            >
              {memoryCards.map((c) => {
                const faceUp = c.isFlipped || c.isMatched || memoryPeeking;
                const isHinted = memoryHintIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCardClick(c.id)}
                    style={{ perspective: '900px' }}
                    className="aspect-[4/4.4] cursor-pointer text-left focus:outline-none"
                  >
                    <div
                      className={`relative w-full h-full transition-transform duration-500 rounded-2xl ${
                        isHinted ? 'ring-2 ring-purple-400 animate-pulse' : ''
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: faceUp ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {/* Card Back */}
                      <div
                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 hover:border-amber-400 flex flex-col items-center justify-center p-2 shadow-lg"
                        style={{ backfaceVisibility: 'hidden' }}
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 text-sm">
                          ☀️
                        </div>
                        <span className="text-[8px] font-extrabold uppercase tracking-widest text-amber-300/70 mt-1.5">
                          Sunlit
                        </span>
                      </div>

                      {/* Card Front */}
                      <div
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${c.accent} bg-slate-900 border ${
                          c.isMatched ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-amber-400/60'
                        } flex flex-col items-center justify-center p-2 text-center shadow-xl`}
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)'
                        }}
                      >
                        <span className="text-2xl sm:text-3xl leading-none">{c.icon}</span>
                        <span className="text-[10px] font-extrabold text-white mt-1.5 leading-tight line-clamp-1">
                          {c.label}
                        </span>
                        <span className="text-[8px] text-amber-200/80 line-clamp-1">{c.subtitle}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {memoryState === 'completed' && (
              <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/90 to-slate-900 border border-emerald-400/40 text-center space-y-2.5 max-w-lg mx-auto animate-scaleIn">
                <div className="flex justify-center gap-1">
                  {[1, 2, 3].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= (memoryMoves <= 16 ? 3 : memoryMoves <= 24 ? 2 : 1)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <h5 className="font-black text-emerald-300 text-base">
                  Sanctuary Cleared in {memoryMoves} Moves · {memorySeconds}s!
                </h5>
                <p className="text-xs text-slate-300 tabular-nums">
                  Best Streak: {memoryBestStreak}x · Credited +{pointsAwardedThisSession} Sunlit Points
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    onClick={() => startMemoryMatch(memoryDifficulty)}
                    className="px-4 py-2 bg-amber-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => setActiveTab('games_menu')}
                    className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Arcade Lobby
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* GAME 4: TAPOVAN GRAND TRIVIA SHOWDOWN */}
        {/* ==================================================== */}
        {activeTab === 'brain_quest' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Showdown HUD */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs max-w-2xl mx-auto">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-200 tabular-nums">
                  Q <strong>{quizIndex + 1}</strong> / {quizDeck.length || 8}
                </span>
                <span className="font-black text-amber-300 tabular-nums">Score: {quizScore}</span>
                {quizStreak >= 2 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 border border-orange-500/40 px-2.5 py-0.5 text-orange-300 font-extrabold text-[10px]">
                    <Flame className="w-3 h-3" /> {quizStreak}x Fire Streak
                  </span>
                )}
              </div>

              {quizState === 'playing' && (
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl font-mono font-black text-xs border tabular-nums ${
                      quizTimeLeft <= 5
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                    }`}
                  >
                    ⏱ {quizTimeLeft}s
                  </span>
                </div>
              )}
            </div>

            {quizState === 'playing' && quizDeck[quizIndex] && (
              <div className="space-y-4 max-w-2xl mx-auto">
                {/* Lifelines Bar */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleUse5050}
                    disabled={used5050 || quizSelectedOption !== null}
                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-35 text-amber-200 cursor-pointer"
                  >
                    50 / 50 Eliminate
                  </button>
                  <button
                    type="button"
                    onClick={handleUseTimeFreeze}
                    disabled={usedTimeFreeze || quizSelectedOption !== null}
                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-35 text-sky-200 cursor-pointer"
                  >
                    +10s Time Freeze
                  </button>
                  <button
                    type="button"
                    onClick={handleUseSageHint}
                    disabled={usedSageHint || quizSelectedOption !== null}
                    className="px-3 py-1.5 rounded-xl text-xs font-extrabold border border-purple-500/40 bg-purple-500/15 hover:bg-purple-500/25 disabled:opacity-35 text-purple-200 cursor-pointer"
                  >
                    Ask Ganga Sage Hint
                  </button>
                </div>

                {/* Question Studio Card */}
                <div className="relative rounded-3xl border border-amber-500/30 bg-slate-950 overflow-hidden p-6 shadow-xl">
                  <img
                    src={tapovanTriviaArt}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover opacity-20"
                  />
                  <div className="relative z-10 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                      Rishikesh Cultural Challenge
                    </span>
                    <h5 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                      {quizDeck[quizIndex].q}
                    </h5>
                    {showSageHintText && (
                      <div className="mt-2 p-2.5 rounded-xl bg-purple-950/80 border border-purple-400/40 text-xs text-purple-200">
                        <strong>Sage Whisper:</strong> {quizDeck[quizIndex].hint}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2x2 Showdown Answer Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {quizDeck[quizIndex].options.map((opt, idx) => {
                    const isEliminated = eliminatedOptions.includes(idx);
                    const isSelected = quizSelectedOption === idx;
                    const isCorrect = idx === quizDeck[quizIndex].correct;
                    const showResult = quizSelectedOption !== null;
                    const letter = ['A', 'B', 'C', 'D'][idx];

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={showResult || isEliminated}
                        onClick={() => handleQuizAnswer(idx)}
                        className={`p-3.5 rounded-2xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isEliminated
                            ? 'opacity-20 bg-slate-900 border-slate-800 cursor-not-allowed'
                            : showResult
                            ? isCorrect
                              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                              : isSelected
                              ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-500'
                            : 'bg-slate-800/80 border-slate-700 text-white hover:border-amber-400 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-950 text-amber-300 font-black flex items-center justify-center shrink-0">
                            {letter}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {showResult && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {quizSelectedOption !== null && (
                  <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs text-slate-200 animate-fadeIn">
                    <span className="font-extrabold text-amber-300">Did you know? </span>
                    {quizDeck[quizIndex].fact}
                  </div>
                )}
              </div>
            )}

            {quizState === 'completed' && (
              <div className="p-6 rounded-3xl bg-slate-950 border border-amber-500/35 text-center space-y-3 max-w-md mx-auto animate-scaleIn">
                <Trophy className="h-12 w-12 text-amber-400 mx-auto" />
                <span className="inline-block px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase">
                  {quizScore >= 85 ? 'Himalayan Grandmaster' : quizScore >= 50 ? 'Tapovan Scholar' : 'Ganga Explorer'}
                </span>
                <h4 className="text-xl font-black text-white">Showdown Complete!</h4>
                <p className="text-xs text-slate-300 tabular-nums">
                  Final Trivia Score: <strong className="text-amber-300">{quizScore} pts</strong> · Wallet Credited:{' '}
                  <strong className="text-emerald-300">+{pointsAwardedThisSession} pts</strong>
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={startBrainQuest}
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl text-xs cursor-pointer"
                  >
                    New Question Set
                  </button>
                  <button
                    onClick={() => setActiveTab('games_menu')}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Arcade Lobby
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB: REWARD STORE */}
        {/* ==================================================== */}
        {activeTab === 'store' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/15 via-amber-600/5 to-transparent p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Available Arcade Balance
                </span>
                <span className="text-2xl font-black text-white tabular-nums">
                  {progress?.pointsBalance ?? 0} Points
                </span>
              </div>
              <button
                onClick={() => setActiveTab('games_menu')}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black transition cursor-pointer"
              >
                Play Games to Earn
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {[
                { name: 'Ganga Explorer', pts: 50, disc: 50, desc: '₹50 flat discount on any room booking', badge: '' },
                { name: 'Tapovan Pilgrim', pts: 100, disc: 100, desc: '₹100 flat discount on minimum 1-night stay', badge: 'Popular' },
                { name: 'Himalayan Patron', pts: 250, disc: 250, desc: '₹250 flat discount on 2+ nights stay', badge: 'VIP Value' }
              ].map((tier) => (
                <div
                  key={tier.name}
                  className="border border-slate-800 rounded-2xl p-4 bg-slate-950 hover:border-amber-400/50 transition flex flex-col justify-between space-y-3 relative"
                >
                  {tier.badge && (
                    <span className="absolute top-2.5 right-2.5 text-[9px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase">
                      {tier.badge}
                    </span>
                  )}
                  <div>
                    <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-black text-sm mb-2">
                      ₹{tier.disc}
                    </div>
                    <h5 className="font-extrabold text-white text-sm">{tier.name}</h5>
                    <p className="text-xs text-slate-400 mt-0.5">{tier.desc}</p>
                    <div className="text-xs font-bold text-amber-400 mt-2 tabular-nums">Cost: {tier.pts} Points</div>
                  </div>
                  <button
                    disabled={(progress?.pointsBalance ?? 0) < tier.pts}
                    onClick={() => handleRedeemVoucher(tier.pts, tier.disc)}
                    className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded-xl font-black text-xs transition cursor-pointer"
                  >
                    {(progress?.pointsBalance ?? 0) < tier.pts ? `Needs ${tier.pts} Pts` : 'Redeem Voucher'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB: MY VOUCHERS */}
        {/* ==================================================== */}
        {activeTab === 'vouchers' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {vouchers.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-slate-500">
                <Gift className="w-10 h-10 mx-auto text-slate-700" />
                <h5 className="font-bold text-white text-sm">No Vouchers Redeemed Yet</h5>
                <p className="text-xs text-slate-400">Play any of the 4 arcade games to unlock room discount codes!</p>
                <button
                  onClick={() => setActiveTab('games_menu')}
                  className="px-4 py-2 bg-amber-400 text-slate-950 rounded-xl text-xs font-black cursor-pointer"
                >
                  Open Arcade Lobby
                </button>
              </div>
            ) : (
              vouchers.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                    v.isUsed ? 'bg-slate-950/40 border-slate-800 opacity-60' : 'bg-slate-950 border-amber-500/35'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-300 text-sm bg-amber-500/15 px-2.5 py-1 rounded-lg border border-amber-500/30">
                        {v.voucherCode}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">₹{v.discountAmount} OFF</span>
                      {v.isUsed && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase">
                          Used
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Expires: {new Date(v.expiresAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  {!v.isUsed && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(v.voucherCode)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedCode === v.voucherCode ? 'Copied!' : 'Copy'}</span>
                      </button>
                      {onSelectVoucherForBooking && (
                        <button
                          onClick={() => {
                            onSelectVoucherForBooking(v.voucherCode);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-black cursor-pointer"
                        >
                          Apply in Booking
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
