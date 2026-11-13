import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserGameProgress, GameRewardVoucher, PlayableGameId } from '../types';
import { getUserGameProgress, getUserRewardVouchers } from '../services/db';
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
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Zap,
  Info,
  Compass,
  Flame,
  Grid,
  Brain,
  Timer,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface SunlitPlayAndEarnProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVoucherForBooking?: (code: string) => void;
}

// ==========================================
// TRIVIA QUESTIONS FOR BRAIN QUEST & CHECKPOINTS
// ==========================================
const TRIVIA_QUESTIONS = [
  {
    q: 'Which holy river flows through Rishikesh and right past Tapovan?',
    options: ['Yamuna', 'Ganga', 'Saraswati', 'Godavari'],
    correct: 1,
    fact: 'The sacred Ganga emerges from the Himalayas onto the plains right here in Rishikesh!'
  },
  {
    q: 'What iconic suspension bridge connects Tapovan to Swarg Ashram across the Ganga?',
    options: ['Howrah Bridge', 'Ram Jhula / Lakshman Jhula', 'Golden Gate', 'Bandra-Worli'],
    correct: 1,
    fact: 'Ram Jhula and Lakshman Jhula are iconic pedestrian suspension bridges over the holy river.'
  },
  {
    q: 'What traditional evening spiritual ceremony takes place along the Ganga ghats in Rishikesh?',
    options: ['Kumbh Mela', 'Maha Ganga Aarti', 'Baisakhi Dance', 'Holi Milan'],
    correct: 1,
    fact: 'The evening Ganga Aarti at Triveni Ghat and Shatrughna Ghat is an unforgettable spiritual spectacle.'
  },
  {
    q: 'Which historic 1968 music event made Rishikesh world-famous as the Yoga Capital of the World?',
    options: ['Rolling Stones Tour', 'The Beatles Ashram Meditation', 'Pink Floyd Concert', 'Woodstock Festival'],
    correct: 1,
    fact: 'The Beatles stayed at Chaurasi Kutia (Beatles Ashram) in 1968, composing much of the White Album.'
  },
  {
    q: 'What pure, wholesome Ayurvedic cuisine is served in Tapovan & Devashish Homestay?',
    options: ['Processed Fast Food', 'Satvik Cuisine', 'Heavy Fried Street Food', 'Barbecue Meat'],
    correct: 1,
    fact: 'Satvik food is freshly prepared without onion or garlic, promoting mindfulness, energy, and peace.'
  },
  {
    q: 'What complimentary leisure facilities are included with every room stay at Devashish Homestay?',
    options: ['Casino access', 'Swimming Pool & Kids Indoor Play Area', 'Golf Course', 'Helicopter tour'],
    correct: 1,
    fact: 'Devashish Sunlit Homestay provides an outdoor freshwater pool and a dedicated safe play area for children.'
  },
  {
    q: 'Which ancient temple sits at 1,676m elevation near Rishikesh with panoramic Himalayan sunrise views?',
    options: ['Kedarnath', 'Kunjapuri Devi Temple', 'Badrinath', 'Tungnath'],
    correct: 1,
    fact: 'Kunjapuri Devi Temple is world-famous for breathtaking sunrise views over Chaukhamba and Swargarohini.'
  }
];

// ==========================================
// MEMORY MATCH CARDS (8 Unique Pairs)
// ==========================================
interface MemoryCard {
  id: number;
  pairId: number;
  label: string;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MEMORY_PAIRS = [
  { pairId: 1, label: 'Holy Ganga River', icon: '🌊' },
  { pairId: 2, label: 'Ram Jhula Bridge', icon: '🌉' },
  { pairId: 3, label: 'Evening Ganga Aarti', icon: '🪔' },
  { pairId: 4, label: 'Beatles Ashram', icon: '🎸' },
  { pairId: 5, label: 'Himalayan Sunrise', icon: '🏔️' },
  { pairId: 6, label: 'Tapovan Yoga', icon: '🧘' },
  { pairId: 7, label: 'Sunlit Homestay Pool', icon: '🏊' },
  { pairId: 8, label: 'Kunjapuri Temple', icon: '🛕' }
];

export const SunlitPlayAndEarn: React.FC<SunlitPlayAndEarnProps> = ({
  isOpen,
  onClose,
  onSelectVoucherForBooking
}) => {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'games_menu' | 'ganga_quest' | 'runner' | 'memory' | 'brain_quest' | 'store' | 'vouchers'>('games_menu');

  // Backend state
  const [progress, setProgress] = useState<UserGameProgress | null>(null);
  const [vouchers, setVouchers] = useState<GameRewardVoucher[]>([]);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // General session state
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [pointsAwardedThisSession, setPointsAwardedThisSession] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ----------------------------------------------------
  // GAME 1: GANGA QUEST RAFTING STATE
  // ----------------------------------------------------
  const [g1Score, setG1Score] = useState(0);
  const [g1Distance, setG1Distance] = useState(0);
  const [g1Health, setG1Health] = useState(3);
  const [g1State, setG1State] = useState<'idle' | 'playing' | 'trivia' | 'gameover'>('idle');
  const [currentTrivia, setCurrentTrivia] = useState<typeof TRIVIA_QUESTIONS[0] | null>(null);
  const [triviaResult, setTriviaResult] = useState<'correct' | 'wrong' | null>(null);
  const canvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const raftRef = useRef<{ x: number; y: number; width: number; height: number; speed: number }>({
    x: 180,
    y: 380,
    width: 44,
    height: 60,
    speed: 5
  });
  const riverItemsRef = useRef<{ id: number; x: number; y: number; type: 'lotus' | 'log' | 'whirlpool'; size: number; speed: number; collected?: boolean }[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastSpawnRef1 = useRef<number>(0);
  const lastTriviaDistanceRef = useRef<number>(0);

  // ----------------------------------------------------
  // GAME 2: RISHIKESH RUNNER (Lakshman Jhula Bridge)
  // ----------------------------------------------------
  const [runnerState, setRunnerState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [runnerScore, setRunnerScore] = useState(0);
  const [runnerDistance, setRunnerDistance] = useState(0);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const runnerRef = useRef<{ y: number; vy: number; isJumping: boolean; isDucking: boolean }>({
    y: 280,
    vy: 0,
    isJumping: false,
    isDucking: false
  });
  const runnerObstacles = useRef<{ id: number; x: number; type: 'bell' | 'flag' | 'monkey'; width: number; height: number; y: number; speed: number }[]>([]);
  const runnerCoins = useRef<{ id: number; x: number; y: number; collected: boolean }[]>([]);
  const lastRunnerSpawn = useRef<number>(0);

  // ----------------------------------------------------
  // GAME 3: SUNLIT MEMORY MATCH STATE
  // ----------------------------------------------------
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryMatches, setMemoryMatches] = useState(0);
  const [memorySeconds, setMemorySeconds] = useState(0);
  const [memoryState, setMemoryState] = useState<'idle' | 'playing' | 'completed'>('idle');

  // ----------------------------------------------------
  // GAME 4: RISHIKESH BRAIN QUEST (Trivia Quiz)
  // ----------------------------------------------------
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStreak, setQuizStreak] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizState, setQuizState] = useState<'idle' | 'playing' | 'completed'>('idle');

  // Load user data
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

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = true;

      // Runner controls
      if (activeTab === 'runner' && runnerState === 'playing') {
        if ((e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') && !runnerRef.current.isJumping) {
          runnerRef.current.isJumping = true;
          runnerRef.current.vy = -12;
        }
        if (e.key === 'ArrowDown' || e.key === 's') {
          runnerRef.current.isDucking = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
      if (activeTab === 'runner') {
        if (e.key === 'ArrowDown' || e.key === 's') {
          runnerRef.current.isDucking = false;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeTab, runnerState]);

  // Anti-cheat score submit
  const finishSession = useCallback(async (tokensEarned: number, durationSec: number) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/game/award-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          tokensCollected: Math.max(1, tokensEarned),
          durationSeconds: Math.max(7, durationSec)
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
  }, [currentUser, loadUserGameData]);

  // ----------------------------------------------------
  // G1: GANGA QUEST RAFTER LOOP
  // ----------------------------------------------------
  const startGangaQuest = () => {
    setG1State('playing');
    setG1Score(0);
    setG1Distance(0);
    setG1Health(3);
    setPointsAwardedThisSession(0);
    setCurrentTrivia(null);
    setTriviaResult(null);
    raftRef.current = { x: 180, y: 380, width: 44, height: 60, speed: 5 };
    riverItemsRef.current = [];
    lastSpawnRef1.current = Date.now();
    lastTriviaDistanceRef.current = 0;
    setSessionStartTime(Date.now());
  };

  useEffect(() => {
    if (activeTab !== 'ganga_quest' || g1State !== 'playing') return;

    const canvas = canvasRef1.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let localDist = g1Distance;
    let localScore = g1Score;
    let localHp = g1Health;
    let waveOffset = 0;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // River
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(0.5, '#0ea5e9');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Riverbanks
      ctx.fillStyle = '#166534';
      ctx.fillRect(0, 0, 24, canvas.height);
      ctx.fillRect(canvas.width - 24, 0, 24, canvas.height);

      // Water ripples
      waveOffset = (waveOffset + 2) % 40;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      for (let y = waveOffset - 40; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.bezierCurveTo(120, y + 10, 280, y - 10, canvas.width - 30, y);
        ctx.stroke();
      }

      // Raft keys
      const raft = raftRef.current;
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['a'] || keysPressed.current['A']) {
        raft.x = Math.max(30, raft.x - 4);
      }
      if (keysPressed.current['ArrowRight'] || keysPressed.current['d'] || keysPressed.current['D']) {
        raft.x = Math.min(canvas.width - raft.width - 30, raft.x + 4);
      }

      // Spawning
      const now = Date.now();
      if (now - lastSpawnRef1.current > 900) {
        lastSpawnRef1.current = now;
        const rand = Math.random();
        const spawnX = 35 + Math.random() * (canvas.width - 90);
        if (rand < 0.6) {
          riverItemsRef.current.push({ id: now, x: spawnX, y: -30, type: 'lotus', size: 26, speed: 3.2 });
        } else if (rand < 0.85) {
          riverItemsRef.current.push({ id: now, x: spawnX, y: -30, type: 'log', size: 38, speed: 3.6 });
        } else {
          riverItemsRef.current.push({ id: now, x: spawnX, y: -30, type: 'whirlpool', size: 34, speed: 2.8 });
        }
      }

      // Items update
      for (let i = riverItemsRef.current.length - 1; i >= 0; i--) {
        const it = riverItemsRef.current[i];
        it.y += it.speed;

        const hit =
          it.x < raft.x + raft.width &&
          it.x + it.size > raft.x &&
          it.y < raft.y + raft.height &&
          it.y + it.size > raft.y;

        if (hit && !it.collected) {
          it.collected = true;
          if (it.type === 'lotus') {
            localScore += 5;
            setG1Score(localScore);
          } else {
            localHp -= 1;
            setG1Health(localHp);
            if (localHp <= 0) {
              setG1State('gameover');
              const durSec = Math.floor((Date.now() - sessionStartTime) / 1000);
              finishSession(localScore, durSec);
              return;
            }
          }
          riverItemsRef.current.splice(i, 1);
          continue;
        }

        // Draw items
        if (it.type === 'lotus') {
          ctx.save();
          ctx.translate(it.x + it.size / 2, it.y + it.size / 2);
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 0, it.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (it.type === 'log') {
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.roundRect(it.x, it.y, it.size, 14, 6);
          ctx.fill();
        } else {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(it.x + it.size / 2, it.y + it.size / 2, it.size / 2, 0, Math.PI * 1.5);
          ctx.stroke();
        }

        if (it.y > canvas.height + 40) {
          riverItemsRef.current.splice(i, 1);
        }
      }

      // Draw Raft
      ctx.save();
      ctx.translate(raft.x + raft.width / 2, raft.y + raft.height / 2);
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(-raft.width / 2, -raft.height / 2, raft.width, raft.height, 12);
      ctx.fill();
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.roundRect(-raft.width / 2 + 5, -raft.height / 2 + 8, raft.width - 10, raft.height - 16, 6);
      ctx.fill();
      ctx.restore();

      localDist += 1;
      setG1Distance(localDist);

      // Checkpoint every 400m
      if (localDist - lastTriviaDistanceRef.current >= 400) {
        lastTriviaDistanceRef.current = localDist;
        const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
        setCurrentTrivia(q);
        setTriviaResult(null);
        setG1State('trivia');
        return;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, g1State, g1Distance, g1Score, g1Health, sessionStartTime, finishSession]);

  // ----------------------------------------------------
  // G2: RISHIKESH RUNNER (Lakshman Jhula Bridge Runner)
  // ----------------------------------------------------
  const startRunner = () => {
    setRunnerState('playing');
    setRunnerScore(0);
    setRunnerDistance(0);
    runnerRef.current = { y: 280, vy: 0, isJumping: false, isDucking: false };
    runnerObstacles.current = [];
    runnerCoins.current = [];
    lastRunnerSpawn.current = Date.now();
    setSessionStartTime(Date.now());
  };

  useEffect(() => {
    if (activeTab !== 'runner' || runnerState !== 'playing') return;

    const canvas = canvasRef2.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let localScore = runnerScore;
    let localDist = runnerDistance;

    const groundY = 320;

    const runnerLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Himalayan sky with sunrise hills
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.6, '#1e293b');
      skyGrad.addColorStop(1, '#ca8a04');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, groundY);

      // Lakshman Jhula Suspension Cables
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 60);
      ctx.bezierCurveTo(150, 180, 280, 180, canvas.width, 60);
      ctx.stroke();

      // Bridge Deck
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, groundY, canvas.width, 5);

      // Player physics
      const p = runnerRef.current;
      if (p.isJumping) {
        p.vy += 0.65; // gravity
        p.y += p.vy;
        if (p.y >= groundY - 45) {
          p.y = groundY - 45;
          p.vy = 0;
          p.isJumping = false;
        }
      }

      const pHeight = p.isDucking ? 26 : 45;
      const pWidth = 24;
      const pX = 60;
      const pDrawY = p.isDucking ? groundY - 26 : p.y;

      // Draw Runner Player
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(pX, pDrawY, pWidth, pHeight, 6);
      ctx.fill();

      // Head
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(pX + pWidth / 2, pDrawY - 6, 8, 0, Math.PI * 2);
      ctx.fill();

      // Spawning obstacles & coins
      const now = Date.now();
      if (now - lastRunnerSpawn.current > 1200) {
        lastRunnerSpawn.current = now;
        const isHigh = Math.random() < 0.4;
        if (isHigh) {
          // Temple bell hanging high (Must DUCK!)
          runnerObstacles.current.push({
            id: now,
            x: canvas.width,
            y: groundY - 55,
            width: 28,
            height: 25,
            type: 'bell',
            speed: 5
          });
        } else {
          // Temple stone / prayer log on deck (Must JUMP!)
          runnerObstacles.current.push({
            id: now,
            x: canvas.width,
            y: groundY - 24,
            width: 28,
            height: 24,
            type: 'monkey',
            speed: 5
          });
        }

        // Spawn Coin
        runnerCoins.current.push({
          id: now + 1,
          x: canvas.width + 40,
          y: isHigh ? groundY - 15 : groundY - 60,
          collected: false
        });
      }

      // Update & Draw Obstacles
      for (let i = runnerObstacles.current.length - 1; i >= 0; i--) {
        const obs = runnerObstacles.current[i];
        obs.x -= obs.speed;

        // Draw obstacle
        if (obs.type === 'bell') {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(obs.x + 14, obs.y + 12, 12, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
          ctx.fill();
        }

        // Collision Check
        const hit =
          pX < obs.x + obs.width &&
          pX + pWidth > obs.x &&
          pDrawY < obs.y + obs.height &&
          pDrawY + pHeight > obs.y;

        if (hit) {
          setRunnerState('gameover');
          const durSec = Math.floor((Date.now() - sessionStartTime) / 1000);
          finishSession(localScore, durSec);
          return;
        }

        if (obs.x < -40) {
          runnerObstacles.current.splice(i, 1);
        }
      }

      // Coins update
      for (let i = runnerCoins.current.length - 1; i >= 0; i--) {
        const coin = runnerCoins.current[i];
        coin.x -= 5;

        // Draw silver/gold coin
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Collect
        const dist = Math.hypot(pX + pWidth / 2 - coin.x, pDrawY + pHeight / 2 - coin.y);
        if (dist < 22 && !coin.collected) {
          coin.collected = true;
          localScore += 5;
          setRunnerScore(localScore);
          runnerCoins.current.splice(i, 1);
          continue;
        }

        if (coin.x < -20) {
          runnerCoins.current.splice(i, 1);
        }
      }

      localDist += 1;
      setRunnerDistance(localDist);

      animId = requestAnimationFrame(runnerLoop);
    };

    animId = requestAnimationFrame(runnerLoop);
    return () => cancelAnimationFrame(animId);
  }, [activeTab, runnerState, runnerScore, runnerDistance, sessionStartTime, finishSession]);

  // ----------------------------------------------------
  // G3: SUNLIT MEMORY MATCH (Himalayan Landmark Match)
  // ----------------------------------------------------
  const startMemoryMatch = () => {
    // Generate 16 cards (8 pairs shuffled)
    const cards: MemoryCard[] = [];
    let idCounter = 1;
    MEMORY_PAIRS.forEach((p) => {
      cards.push({ id: idCounter++, pairId: p.pairId, label: p.label, icon: p.icon, isFlipped: false, isMatched: false });
      cards.push({ id: idCounter++, pairId: p.pairId, label: p.label, icon: p.icon, isFlipped: false, isMatched: false });
    });
    // Shuffle
    cards.sort(() => Math.random() - 0.5);

    setMemoryCards(cards);
    setFlippedCards([]);
    setMemoryMoves(0);
    setMemoryMatches(0);
    setMemorySeconds(0);
    setMemoryState('playing');
    setSessionStartTime(Date.now());
  };

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length === 2) return;
    const card = memoryCards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const newCards = memoryCards.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c));
    setMemoryCards(newCards);

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMemoryMoves((m) => m + 1);
      const [firstId, secondId] = newFlipped;
      const c1 = memoryCards.find((c) => c.id === firstId);
      const c2 = memoryCards.find((c) => c.id === secondId);

      if (c1 && c2 && c1.pairId === c2.pairId) {
        // Match!
        setTimeout(() => {
          setMemoryCards((prev) =>
            prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c))
          );
          setFlippedCards([]);
          setMemoryMatches((matches) => {
            const next = matches + 1;
            if (next === MEMORY_PAIRS.length) {
              setMemoryState('completed');
              finishSession(25, 30);
            }
            return next;
          });
        }, 600);
      } else {
        // No match
        setTimeout(() => {
          setMemoryCards((prev) =>
            prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c))
          );
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  // ----------------------------------------------------
  // G4: RISHIKESH BRAIN QUEST (Trivia Quiz)
  // ----------------------------------------------------
  const startBrainQuest = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizStreak(0);
    setQuizSelectedOption(null);
    setQuizState('playing');
    setSessionStartTime(Date.now());
  };

  const handleQuizAnswer = (optionIdx: number) => {
    if (quizSelectedOption !== null) return;
    setQuizSelectedOption(optionIdx);

    const currentQ = TRIVIA_QUESTIONS[quizIndex];
    const isCorrect = optionIdx === currentQ.correct;

    if (isCorrect) {
      const bonusStreak = quizStreak >= 2 ? 15 : 10;
      setQuizScore((s) => s + bonusStreak);
      setQuizStreak((st) => st + 1);
    } else {
      setQuizStreak(0);
    }

    setTimeout(() => {
      if (quizIndex + 1 < TRIVIA_QUESTIONS.length) {
        setQuizIndex((i) => i + 1);
        setQuizSelectedOption(null);
      } else {
        setQuizState('completed');
        finishSession(quizScore + (isCorrect ? 10 : 0), 25);
      }
    }, 1600);
  };

  // ----------------------------------------------------
  // REWARD STORE REDEMPTION
  // ----------------------------------------------------
  const handleRedeemVoucher = async (pointsCost: number, discountAmount: number, codePrefix: string) => {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-amber-500/30 flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-white">Sunlit Play &amp; Earn</h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  4 Games
                </span>
              </div>
              <p className="text-xs text-slate-400">Rishikesh Adventures · Earn Real Room Booking Discounts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Balance & Daily Cap Bar */}
        <div className="bg-slate-950 px-6 py-2.5 text-white flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Balance:</span>
              <span className="font-bold text-amber-300 text-sm">{progress?.pointsBalance ?? 0} pts</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Today's Cap:</span>
              <span className="text-emerald-400 font-semibold">{progress?.dailyPointsEarned ?? 0} / 100 pts</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('games_menu')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'games_menu' || activeTab === 'ganga_quest' || activeTab === 'runner' || activeTab === 'memory' || activeTab === 'brain_quest'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>All 4 Games</span>
            </button>
            <button
              onClick={() => setActiveTab('store')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'store' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Reward Store</span>
            </button>
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'vouchers' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>My Vouchers ({vouchers.filter((v) => !v.isUsed).length})</span>
            </button>
          </div>
        </div>

        {/* Status Notice */}
        {statusNotice && (
          <div className="bg-amber-500/10 px-4 py-2 border-b border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
            <span className="font-medium">{statusNotice}</span>
            <button onClick={() => setStatusNotice(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 1: ALL 4 GAMES MENU */}
        {/* ==================================================== */}
        {activeTab === 'games_menu' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="text-center space-y-1 mb-2">
              <h4 className="text-lg font-bold text-white">Choose Your Himalayan Challenge</h4>
              <p className="text-xs text-slate-400">Play any game to earn Sunlit Rewards points redeemable on rooms!</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Game 1: Ganga Quest */}
              <div
                onClick={() => {
                  setActiveTab('ganga_quest');
                  startGangaQuest();
                }}
                className="group cursor-pointer rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900 p-5 hover:border-sky-400 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                    <Waves className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                    Fast Action
                  </span>
                </div>
                <h5 className="mt-3 font-bold text-white group-hover:text-amber-400 transition">1. Sunlit Ganga Quest</h5>
                <p className="mt-1 text-xs text-slate-400">
                  Raft through the holy river rapids, collect golden lotus flowers, dodge logs and whirlpools.
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-amber-400 font-semibold pt-2 border-t border-slate-800">
                  <span>Up to +30 pts</span>
                  <span className="flex items-center gap-1 text-sky-400 group-hover:translate-x-1 transition">
                    Play Now →
                  </span>
                </div>
              </div>

              {/* Game 2: Rishikesh Runner */}
              <div
                onClick={() => {
                  setActiveTab('runner');
                  startRunner();
                }}
                className="group cursor-pointer rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 p-5 hover:border-amber-400 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                    <Zap className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    Endless Runner
                  </span>
                </div>
                <h5 className="mt-3 font-bold text-white group-hover:text-amber-400 transition">2. Rishikesh Runner</h5>
                <p className="mt-1 text-xs text-slate-400">
                  Sprint along the iconic suspension bridge! Jump over obstacles, duck under temple bells, collect coins.
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-amber-400 font-semibold pt-2 border-t border-slate-800">
                  <span>Up to +30 pts</span>
                  <span className="flex items-center gap-1 text-amber-400 group-hover:translate-x-1 transition">
                    Play Now →
                  </span>
                </div>
              </div>

              {/* Game 3: Memory Match */}
              <div
                onClick={() => {
                  setActiveTab('memory');
                  startMemoryMatch();
                }}
                className="group cursor-pointer rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 p-5 hover:border-emerald-400 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Grid className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Puzzle &amp; Focus
                  </span>
                </div>
                <h5 className="mt-3 font-bold text-white group-hover:text-amber-400 transition">3. Sunlit Memory Match</h5>
                <p className="mt-1 text-xs text-slate-400">
                  Match 8 pairs of iconic Rishikesh landmarks (Ram Jhula, Triveni Ghat, Beatles Ashram, Homestay Pool).
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-amber-400 font-semibold pt-2 border-t border-slate-800">
                  <span>+25 pts on win</span>
                  <span className="flex items-center gap-1 text-emerald-400 group-hover:translate-x-1 transition">
                    Play Now →
                  </span>
                </div>
              </div>

              {/* Game 4: Brain Quest */}
              <div
                onClick={() => {
                  setActiveTab('brain_quest');
                  startBrainQuest();
                }}
                className="group cursor-pointer rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 p-5 hover:border-purple-400 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                    <Brain className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                    Trivia &amp; Culture
                  </span>
                </div>
                <h5 className="mt-3 font-bold text-white group-hover:text-amber-400 transition">4. Rishikesh Brain Quest</h5>
                <p className="mt-1 text-xs text-slate-400">
                  Test your knowledge of Tapovan yoga, Beatles history, Ganga aartis, and mountain secrets.
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-amber-400 font-semibold pt-2 border-t border-slate-800">
                  <span>Streak multiplier!</span>
                  <span className="flex items-center gap-1 text-purple-400 group-hover:translate-x-1 transition">
                    Play Now →
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* GAME 1: GANGA QUEST SCREEN */}
        {/* ==================================================== */}
        {activeTab === 'ganga_quest' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center space-y-4">
            {/* HUD */}
            <div className="flex items-center justify-between w-full max-w-[380px] bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-xs font-semibold">
              <div className="flex items-center gap-1 text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Score: <strong>{g1Score} pts</strong></span>
              </div>
              <div className="text-slate-300">
                <span>Distance: <strong>{g1Distance}m</strong></span>
              </div>
              <div className="flex items-center gap-1 text-rose-400">
                <span>❤️</span>
                <span>{g1Health} Lives</span>
              </div>
            </div>

            {/* Canvas */}
            <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-xl bg-sky-700 w-[380px] h-[440px]">
              <canvas ref={canvasRef1} width={380} height={440} className="block w-full h-full" />

              {/* Trivia Checkpoint */}
              {g1State === 'trivia' && currentTrivia && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 text-white">
                  <div className="bg-slate-900 border border-amber-400/40 rounded-2xl p-5 text-center space-y-3 max-w-xs shadow-2xl">
                    <div className="flex items-center justify-center gap-1 text-amber-300 font-bold text-xs uppercase tracking-wider">
                      <HelpCircle className="w-4 h-4" />
                      <span>Rishikesh Checkpoint (+10 pts)</span>
                    </div>
                    <h5 className="font-bold text-sm text-amber-100">{currentTrivia.q}</h5>
                    <div className="space-y-1.5">
                      {currentTrivia.options.map((opt, idx) => (
                        <button
                          key={opt}
                          disabled={triviaResult !== null}
                          onClick={() => {
                            if (idx === currentTrivia.correct) {
                              setTriviaResult('correct');
                              setG1Score((s) => s + 10);
                              setTimeout(() => {
                                setG1State('playing');
                                setCurrentTrivia(null);
                                setTriviaResult(null);
                              }, 1500);
                            } else {
                              setTriviaResult('wrong');
                              setTimeout(() => {
                                setG1State('playing');
                                setCurrentTrivia(null);
                                setTriviaResult(null);
                              }, 1800);
                            }
                          }}
                          className="w-full py-2 px-3 rounded-xl text-xs font-semibold border border-slate-700 bg-slate-800 hover:bg-slate-700 text-left transition"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {triviaResult === 'correct' && (
                      <div className="text-emerald-400 font-bold text-xs">Correct! +10 Points!</div>
                    )}
                    {triviaResult === 'wrong' && (
                      <div className="text-rose-400 text-xs">Not quite! {currentTrivia.fact}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Game Over */}
              {g1State === 'gameover' && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 text-white">
                  <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-3 max-w-xs shadow-2xl">
                    <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
                    <h4 className="text-lg font-bold text-amber-300">Rafting Complete!</h4>
                    <p className="text-xs text-slate-400">You navigated {g1Distance}m on the Holy Ganga.</p>
                    <div className="bg-slate-800 p-2.5 rounded-xl text-xs text-emerald-400 font-bold">
                      Points Credited: +{pointsAwardedThisSession} pts
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={startGangaQuest}
                        className="flex-1 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
                      >
                        Play Again
                      </button>
                      <button
                        onClick={() => setActiveTab('games_menu')}
                        className="flex-1 py-2 bg-slate-700 text-white rounded-xl text-xs"
                      >
                        All Games
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Steer controls for touch */}
            <div className="flex items-center gap-4 w-full max-w-[380px] justify-between">
              <button
                onClick={() => {
                  raftRef.current.x = Math.max(30, raftRef.current.x - 45);
                }}
                className="flex-1 py-2.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Steer Left
              </button>
              <button
                onClick={() => {
                  raftRef.current.x = Math.min(330, raftRef.current.x + 45);
                }}
                className="flex-1 py-2.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
              >
                Steer Right <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* GAME 2: RISHIKESH RUNNER SCREEN */}
        {/* ==================================================== */}
        {activeTab === 'runner' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center justify-between w-full max-w-[380px] bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-xs font-semibold">
              <div className="text-amber-400">Score: <strong>{runnerScore} pts</strong></div>
              <div className="text-slate-300">Distance: <strong>{runnerDistance}m</strong></div>
              <div className="text-xs text-slate-400">Controls: Space/Up (Jump), Down (Duck)</div>
            </div>

            <div className="relative border-4 border-slate-800 rounded-2xl overflow-hidden shadow-xl bg-slate-950 w-[380px] h-[360px]">
              <canvas ref={canvasRef2} width={380} height={360} className="block w-full h-full" />

              {runnerState === 'gameover' && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 text-white">
                  <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-3 max-w-xs shadow-2xl">
                    <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
                    <h4 className="text-lg font-bold text-amber-300">Run Complete!</h4>
                    <p className="text-xs text-slate-400">You ran {runnerDistance}m across Lakshman Jhula bridge.</p>
                    <div className="bg-slate-800 p-2.5 rounded-xl text-xs text-emerald-400 font-bold">
                      Points Credited: +{pointsAwardedThisSession} pts
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={startRunner}
                        className="flex-1 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
                      >
                        Run Again
                      </button>
                      <button
                        onClick={() => setActiveTab('games_menu')}
                        className="flex-1 py-2 bg-slate-700 text-white rounded-xl text-xs"
                      >
                        All Games
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Jump & Duck */}
            <div className="flex items-center gap-4 w-full max-w-[380px] justify-between">
              <button
                onMouseDown={() => {
                  if (!runnerRef.current.isJumping) {
                    runnerRef.current.isJumping = true;
                    runnerRef.current.vy = -12;
                  }
                }}
                className="flex-1 py-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ArrowUp className="h-4 w-4" /> Jump (Log/Obstacle)
              </button>
              <button
                onMouseDown={() => {
                  runnerRef.current.isDucking = true;
                }}
                onMouseUp={() => {
                  runnerRef.current.isDucking = false;
                }}
                className="flex-1 py-3 bg-sky-500/20 border border-sky-500/40 text-sky-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ArrowDown className="h-4 w-4" /> Duck (Temple Bell)
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* GAME 3: SUNLIT MEMORY MATCH SCREEN */}
        {/* ==================================================== */}
        {activeTab === 'memory' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-xs">
              <div className="text-white font-bold">
                Matches: <span className="text-emerald-400">{memoryMatches} / {MEMORY_PAIRS.length}</span>
              </div>
              <div className="text-slate-300">
                Moves: <span className="text-amber-400 font-bold">{memoryMoves}</span>
              </div>
              <button
                onClick={startMemoryMatch}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                Restart Cards
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2.5 max-w-md mx-auto">
              {memoryCards.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleCardClick(c.id)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-1.5 text-center cursor-pointer transition-all duration-300 border ${
                    c.isFlipped || c.isMatched
                      ? 'bg-amber-500/20 border-amber-500/40 text-white'
                      : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {c.isFlipped || c.isMatched ? (
                    <>
                      <span className="text-2xl">{c.icon}</span>
                      <span className="text-[10px] font-semibold text-amber-200 mt-1 line-clamp-1">
                        {c.label}
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-500 font-bold text-sm">☀️</span>
                  )}
                </div>
              ))}
            </div>

            {memoryState === 'completed' && (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-2">
                <h5 className="font-bold text-emerald-400 text-base">Victory! All 8 Landmark Pairs Matched!</h5>
                <p className="text-xs text-slate-300">You earned +25 Sunlit Rewards Points in {memoryMoves} moves!</p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={startMemoryMatch}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => setActiveTab('games_menu')}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs"
                  >
                    All Games
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* GAME 4: RISHIKESH BRAIN QUEST SCREEN */}
        {/* ==================================================== */}
        {activeTab === 'brain_quest' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between bg-slate-800/80 p-3 rounded-2xl border border-slate-700 text-xs">
              <span className="text-slate-300">
                Question <strong>{quizIndex + 1}</strong> of {TRIVIA_QUESTIONS.length}
              </span>
              <span className="text-amber-400 font-bold">Score: {quizScore} pts</span>
              {quizStreak >= 2 && (
                <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-orange-400 font-bold text-[10px]">
                  🔥 {quizStreak}x Streak
                </span>
              )}
            </div>

            {quizState === 'playing' && (
              <div className="space-y-4 max-w-lg mx-auto">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <h5 className="text-base font-bold text-white leading-relaxed">
                    {TRIVIA_QUESTIONS[quizIndex].q}
                  </h5>
                </div>

                <div className="space-y-2">
                  {TRIVIA_QUESTIONS[quizIndex].options.map((opt, idx) => {
                    const isSelected = quizSelectedOption === idx;
                    const isCorrect = idx === TRIVIA_QUESTIONS[quizIndex].correct;
                    const showCorrectness = quizSelectedOption !== null;

                    return (
                      <button
                        key={opt}
                        onClick={() => handleQuizAnswer(idx)}
                        disabled={showCorrectness}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold transition ${
                          showCorrectness
                            ? isCorrect
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : isSelected
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-slate-800/40 border-slate-800 text-slate-500'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-amber-500/60 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{opt}</span>
                          {showCorrectness && isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {quizSelectedOption !== null && (
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300">
                    <span className="font-bold text-amber-400">Did you know? </span>
                    {TRIVIA_QUESTIONS[quizIndex].fact}
                  </div>
                )}
              </div>
            )}

            {quizState === 'completed' && (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3 max-w-md mx-auto">
                <Trophy className="h-12 w-12 text-amber-400 mx-auto" />
                <h4 className="text-lg font-bold text-white">Quiz Completed!</h4>
                <p className="text-xs text-slate-400">You scored {quizScore} points on Rishikesh cultural trivia.</p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={startBrainQuest}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={() => setActiveTab('games_menu')}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs"
                  >
                    All Games
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
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Available Balance</span>
                <span className="text-2xl font-black text-white">{progress?.pointsBalance ?? 0} Points</span>
              </div>
              <button
                onClick={() => setActiveTab('games_menu')}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition"
              >
                Play Games to Earn More
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Voucher 1: ₹50 Off */}
              <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/60 hover:border-amber-500/40 transition flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm mb-2">
                    ₹50
                  </div>
                  <h5 className="font-bold text-white text-sm">Ganga Explorer</h5>
                  <p className="text-xs text-slate-400 mt-0.5">₹50 flat discount on any room booking</p>
                  <div className="text-xs font-bold text-amber-400 mt-2">Cost: 50 Points</div>
                </div>

                <button
                  disabled={(progress?.pointsBalance ?? 0) < 50}
                  onClick={() => handleRedeemVoucher(50, 50, 'GANGA50')}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl font-bold text-xs transition"
                >
                  {(progress?.pointsBalance ?? 0) < 50 ? 'Needs 50 Pts' : 'Redeem Voucher'}
                </button>
              </div>

              {/* Voucher 2: ₹100 Off */}
              <div className="border border-amber-500/30 rounded-2xl p-4 bg-amber-500/5 hover:border-amber-500/50 transition flex flex-col justify-between space-y-3 relative overflow-hidden">
                <span className="absolute top-2 right-2 text-[9px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Popular
                </span>
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm mb-2">
                    ₹100
                  </div>
                  <h5 className="font-bold text-white text-sm">Tapovan Pilgrim</h5>
                  <p className="text-xs text-slate-400 mt-0.5">₹100 flat discount on minimum 1-night stay</p>
                  <div className="text-xs font-bold text-amber-400 mt-2">Cost: 100 Points</div>
                </div>

                <button
                  disabled={(progress?.pointsBalance ?? 0) < 100}
                  onClick={() => handleRedeemVoucher(100, 100, 'GANGA100')}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl font-bold text-xs transition"
                >
                  {(progress?.pointsBalance ?? 0) < 100 ? 'Needs 100 Pts' : 'Redeem Voucher'}
                </button>
              </div>

              {/* Voucher 3: ₹250 Off */}
              <div className="border border-slate-800 rounded-2xl p-4 bg-slate-950/60 hover:border-purple-500/40 transition flex flex-col justify-between space-y-3">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-sm mb-2">
                    ₹250
                  </div>
                  <h5 className="font-bold text-white text-sm">Himalayan Patron</h5>
                  <p className="text-xs text-slate-400 mt-0.5">₹250 flat discount on 2+ nights stay</p>
                  <div className="text-xs font-bold text-purple-400 mt-2">Cost: 250 Points</div>
                </div>

                <button
                  disabled={(progress?.pointsBalance ?? 0) < 250}
                  onClick={() => handleRedeemVoucher(250, 250, 'GANGA250')}
                  className="w-full py-2 bg-purple-500 hover:bg-purple-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl font-bold text-xs transition"
                >
                  {(progress?.pointsBalance ?? 0) < 250 ? 'Needs 250 Pts' : 'Redeem Voucher'}
                </button>
              </div>
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
                <p className="text-xs text-slate-400">Play games to earn points and unlock discounts!</p>
                <button
                  onClick={() => setActiveTab('games_menu')}
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
                >
                  Start Playing
                </button>
              </div>
            ) : (
              vouchers.map((v) => (
                <div
                  key={v.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                    v.isUsed
                      ? 'bg-slate-950/40 border-slate-800 opacity-60'
                      : 'bg-slate-900 border-amber-500/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-300 text-sm bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
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
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedCode === v.voucherCode ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                      {onSelectVoucherForBooking && (
                        <button
                          onClick={() => {
                            onSelectVoucherForBooking(v.voucherCode);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold"
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
