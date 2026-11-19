import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory inventory hold store for active checkouts (15-minute TTL)
interface InventoryHold {
  holdId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  userId: string;
  expiresAt: number;
}

const activeInventoryHolds: Map<string, InventoryHold> = new Map();

// In-memory registry for anti-cheat game points and active vouchers
interface ActiveVoucher {
  code: string;
  discount: number;
  minSpend: number;
  userId: string;
  createdAt: number;
  used: boolean;
}

const activeVouchersMap: Map<string, ActiveVoucher> = new Map();
const dailyGamePointsMap: Map<string, number> = new Map();

// Helper to clean up expired holds
function cleanupExpiredHolds() {
  const now = Date.now();
  for (const [id, hold] of activeInventoryHolds.entries()) {
    if (hold.expiresAt < now) {
      activeInventoryHolds.delete(id);
    }
  }
}

// ==========================================
// 1. GEMINI AI SERVER ENDPOINTS (GEMINI 4 HYDROGEN + WORLD SEARCH GROUNDING)
// ==========================================

const GEMINI_MODEL = 'gemini-4-hydrogen';
const GEMINI_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

function getGeminiApiKey(): string | null {
  const key = (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();
  return key.length > 0 ? key : null;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' }
    }
  });
}

/**
 * Sanitizes multi-turn Gemini contents:
 * - Drops leading 'model' turns (e.g. client UI welcome banners)
 * - Merges consecutive turns of the same role so user/model strictly alternate
 * - Guarantees non-empty text parts and a trailing 'user' message
 */
function normalizeGeminiContents(
  rawTurns: { role: 'user' | 'model'; text: string }[],
  latestUserMessage: string
): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  const merged: { role: 'user' | 'model'; text: string }[] = [];

  for (const turn of rawTurns) {
    const cleanText = String(turn?.text || '').trim();
    if (!cleanText) continue;
    const role: 'user' | 'model' = turn.role === 'model' ? 'model' : 'user';

    // Skip any leading model greeting before the first user turn
    if (merged.length === 0 && role === 'model') continue;

    const prev = merged[merged.length - 1];
    if (prev && prev.role === role) {
      if (prev.text !== cleanText) {
        prev.text = `${prev.text}\n\n${cleanText}`;
      }
    } else {
      merged.push({ role, text: cleanText });
    }
  }

  const cleanLatest = String(latestUserMessage || '').trim();
  if (cleanLatest) {
    const last = merged[merged.length - 1];
    if (last && last.role === 'user') {
      if (last.text !== cleanLatest) {
        last.text = `${last.text}\n\n${cleanLatest}`;
      }
    } else {
      merged.push({ role: 'user', text: cleanLatest });
    }
  }

  return merged.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));
}

interface GroundingSource {
  title: string;
  uri: string;
}

function extractGroundingSources(aiResponse: any): GroundingSource[] {
  const chunks = aiResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const seen = new Set<string>();
  const sources: GroundingSource[] = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title;
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      let domainLabel = uri;
      try {
        domainLabel = new URL(uri).hostname.replace(/^www\./, '');
      } catch {
        // keep raw uri
      }
      sources.push({
        title: title || domainLabel,
        uri
      });
    }
  }
  return sources.slice(0, 6);
}

function extractReplyText(aiResponse: any): string {
  try {
    const direct = aiResponse?.text;
    if (typeof direct === 'string' && direct.trim().length > 0) {
      return direct.trim();
    }
  } catch {
    // ignore getter error
  }
  const parts = aiResponse?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const nonThoughtText = parts
      .filter((p: any) => typeof p?.text === 'string' && !p?.thought)
      .map((p: any) => p.text)
      .join('')
      .trim();
    if (nonThoughtText) return nonThoughtText;

    const anyText = parts
      .filter((p: any) => typeof p?.text === 'string')
      .map((p: any) => p.text)
      .join('')
      .trim();
    if (anyText) return anyText;
  }
  return '';
}

// Track temporary Google Search tool quota cooldown so chats stay instant on free-tier keys
let searchQuotaExhaustedUntil = 0;

interface CachedWeather {
  summary: string;
  fetchedAt: number;
}
let cachedWeather: CachedWeather | null = null;

function mapWmoWeatherCode(code: number): string {
  if (code === 0) return 'Clear sunny sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Morning river mist / fog';
  if (code <= 57) return 'Light drizzle';
  if (code <= 67) return 'Rain showers';
  if (code <= 77) return 'Himalayan snow higher up';
  if (code <= 82) return 'Heavy rain showers';
  return 'Thunderstorm / cloudy';
}

async function getLiveWorldWeatherAndClock(): Promise<string> {
  const istNow = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  if (cachedWeather && Date.now() - cachedWeather.fetchedAt < 15 * 60 * 1000) {
    return `Current Rishikesh IST Time: ${istNow}\n${cachedWeather.summary}`;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=30.1309&longitude=78.3238&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FKolkata&forecast_days=3',
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (resp.ok) {
      const w: any = await resp.json();
      const cur = w?.current;
      const daily = w?.daily;
      if (cur) {
        const cond = mapWmoWeatherCode(Number(cur.weather_code ?? 0));
        const todayHi = daily?.temperature_2m_max?.[0];
        const todayLo = daily?.temperature_2m_min?.[0];
        const rainProb = daily?.precipitation_probability_max?.[0];
        const summary = `Live Tapovan / Rishikesh Weather Now: ${cur.temperature_2m}°C (${cond}), Humidity ${cur.relative_humidity_2m}%, Wind ${cur.wind_speed_10m} km/h | Today Range: ${todayLo}°C – ${todayHi}°C, Rain chance: ${rainProb ?? 0}%`;
        cachedWeather = { summary, fetchedAt: Date.now() };
        return `Current Rishikesh IST Time: ${istNow}\n${summary}`;
      }
    }
  } catch {
    // Non-blocking live weather fetch
  }

  return `Current Rishikesh IST Time: ${istNow}`;
}

async function runResilientGeminiChat(params: {
  ai: GoogleGenAI;
  baseInstruction: string;
  contents: { role: 'user' | 'model'; parts: { text: string }[] }[];
}): Promise<{ reply: string; sources: GroundingSource[]; grounded: boolean; modelUsed: string }> {
  const trySearch = Date.now() > searchQuotaExhaustedUntil;
  const attemptErrors: string[] = [];

  // Attempt 1: gemini-4-hydrogen with Google Search Grounding (if not in cooldown)
  if (trySearch) {
    try {
      const searchInstruction = `${params.baseInstruction}

2. LIVE WORLD KNOWLEDGE & GOOGLE SEARCH GROUNDING:
Use your Google Search tool whenever helpful for current weather, live train/flight/transit status, Ganga Aarti timings, Char Dham updates, currency conversions, or any general world question.`;
      const r1 = await params.ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: params.contents,
        config: {
          systemInstruction: searchInstruction,
          tools: [{ googleSearch: {} }]
        }
      });
      const text1 = extractReplyText(r1);
      if (text1) {
        return {
          reply: text1,
          sources: extractGroundingSources(r1),
          grounded: true,
          modelUsed: GEMINI_MODEL
        };
      }
      attemptErrors.push(`${GEMINI_MODEL}+search returned empty text`);
    } catch (err: any) {
      const msg = String(err?.message || err || 'unknown error');
      attemptErrors.push(`${GEMINI_MODEL}+search: ${msg.slice(0, 180)}`);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
        searchQuotaExhaustedUntil = Date.now() + 5 * 60 * 1000;
      }
      console.warn('Search-grounded Gemini call skipped/retried without search tool:', msg.slice(0, 200));
    }
  }

  // Attempt 2: Direct generation without tool declarations across supported models
  const directInstruction = `${params.baseInstruction}

2. COMPREHENSIVE WORLD & TRAVEL KNOWLEDGE:
Answer directly in clear, natural text using your full world knowledge along with the live Rishikesh weather/time and Homestay Master Profile provided above. Do NOT attempt to invoke external function calls or tools.`;

  for (const candidateModel of [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]) {
    try {
      const r2 = await params.ai.models.generateContent({
        model: candidateModel,
        contents: params.contents,
        config: {
          systemInstruction: directInstruction
        }
      });
      const text2 = extractReplyText(r2);
      if (text2) {
        return {
          reply: text2,
          sources: [],
          grounded: false,
          modelUsed: candidateModel
        };
      }
      attemptErrors.push(`${candidateModel} returned empty text`);
    } catch (modelErr: any) {
      const msg = String(modelErr?.message || modelErr || 'unknown error');
      attemptErrors.push(`${candidateModel}: ${msg.slice(0, 180)}`);
      console.warn(`Gemini direct attempt (${candidateModel}) failed:`, msg.slice(0, 220));
    }
  }

  throw new Error(attemptErrors.join(' | ') || 'All Gemini generation attempts returned empty output');
}

// GET /api/ai/status - Lightweight server AI readiness probe (no secrets exposed)
app.get('/api/ai/status', (_req: Request, res: Response) => {
  res.json({
    configured: Boolean(getGeminiApiKey()),
    model: GEMINI_MODEL,
    fallbackModel: GEMINI_FALLBACK_MODEL,
    searchGrounding: Date.now() > searchQuotaExhaustedUntil
  });
});

const HOMESTAY_MASTER_PROFILE = `
DEVASHISH SUNLIT HOME STAY — COMPLETE PROPERTY & OPERATIONS PROFILE
- Brand & Ownership: Devashish Sunlit Homestay, hosted by Subhashish Pandey & Vivek Singh Negi.
- Location: Tapovan, Rishikesh, Uttarakhand, India (Near Laxman Jhula bypass; 1.2 km to Ram Jhula bridge walk, 1.8 km to Parmarth Niketan, ~2.8 km to Triveni Ghat, ~20 km / 40 min from Jolly Grant Airport Dehradun [typical cab fare ₹900–₹1,200], ~5 km from Yog Nagari Rishikesh Railway Station [auto ₹150–₹250], ~25 km from Haridwar Junction [cab ₹700–₹900 / auto ₹400], ~240 km / 5–6 hrs via NH-334 from New Delhi).
- Direct Host Desk Phone: +91 9897335265 | Owner Email: subhpan8449@gmail.com.
- Rooms (10+ Categories across Ground, 1st, 2nd & Top 3rd Floor, ₹599 to ₹1,599/night):
  * Room 101 Budget Standard Room (Ground Floor, Queen Bed, max 3 guests): ₹799/night (Student special: ₹599).
  * Room 102 Budget Double Room (Ground Floor, Garden view, Queen Bed, max 3): ₹999/night.
  * Room 103 Deluxe Room (1st Floor, Hill view balcony nook, King Bed, Smart TV, max 3): ₹1,199/night.
  * Room 104 Family Room (1st Floor, Hill view, 1 King + 1 Single Bed, max 5): ₹1,399/night.
  * Room 201 Couple Special Room (2nd Floor, Private Balcony Mountain View, King Bed, max 2): ₹1,099/night.
  * Room 202 Student Budget Room (2nd Floor, Study Desk, High-Speed Wi-Fi, Single Bed, max 1): ₹599/night.
  * Room 203 City View Room (2nd Floor, Town & Hill Vista balcony, Queen Bed, max 3): ₹1,299/night.
  * Room 301 Top Floor City View Room (3rd Floor, Panoramic City & Stargazing rooftop access, King Bed, max 3): ₹1,499/night.
  * Room 302 Long Stay Budget Room (3rd Floor, Workstation & wardrobe, Queen Bed, max 3): ₹699/night.
  * Room 303 Premium Family Room (3rd Floor, 1 King + 1 Queen Bed, Lounge seating, max 6): ₹1,599/night.
- Complimentary Inclusions (Free with every room booking):
  * Outdoor Freshwater Swimming Pool (7:00 AM – 7:30 PM; maintenance 1:00 PM – 2:30 PM; swimwear required, kids under 14 supervised).
  * Dedicated Kids Play Area (Ages 2–12; Morning 8 AM–12 PM, Afternoon 3 PM–6 PM, Evening 6 PM–8 PM; socks required; guardian supervision mandatory).
  * 3rd-Floor Rooftop City-View Terrace (6:00 AM – 10:00 PM; quiet hours after 9:30 PM). Private Rooftop Packages: Sunset Dinner Setup (₹1,800/couple), Celebration Deck (₹2,500 up to 6 guests), Morning Meditation & Chai (₹600).
  * High-Speed Optical Fiber Wi-Fi (24/7 across rooms & balconies) + 24/7 Power Inverter Backup + Solar Hot Water.
- Check-In / Check-Out & Policies:
  * Standard Check-In: 12:00 PM | Standard Check-Out: 10:00 AM / 11:00 AM (Early check-in & late checkout accommodated politely subject to turnover availability).
  * Payment Options: Pay at Property (cash/UPI upon arrival — 100% active) or Online via Razorpay when active.
  * Valid Govt ID required at check-in (Aadhaar/Passport/DL/Voter ID; Foreign guests Form C supported).
- Active Promo Codes & Discounts:
  * STUDENT500: Flat ₹500 off (min 1 night, student ID verified at check-in).
  * LONGSTAY20: 20% off (max ₹5,000, min 7 nights — popular with Yoga Teacher Training / remote workers).
  * SUNLITCOUPLE: 12% off (max ₹1,000, min 2 nights).
  * PILGRIM10: 10% off (max ₹800, pilgrims & senior citizens).
  * Game Reward Vouchers (GANGA50, GANGA100, GANGA250) & Sunlit Rewards Loyalty Points (redeemable for stay discounts).
- CookNow Homestyle & Satvik Dining (Delivered to Room, Rooftop Deck, or Poolside; 100% Pure Vegetarian & Satvik friendly; Pay on Delivery or Room Bill):
  * Fresh Breakfast (Aloo Paratha with Curd ₹130, Indori Poha ₹95, Masala Chai ₹35, Pancakes ₹149), North Indian Thalis (Satvik Thali ₹229, Paneer Butter Masala ₹249, Dal Tadka ₹169), South Indian, Chinese, Healthy Bowls, Beverages & Desserts.
- Rishikesh Quick Local Guide:
  * Triveni Ghat Ganga Aarti: ~5:30 PM – 6:30 PM in winter / ~6:00 PM – 7:00 PM in summer (arrive 30 mins early for riverside seating).
  * Parmarth Niketan Ganga Aarti (Swarg Ashram): ~5:30 PM – 6:30 PM winter / ~6:00 PM – 7:00 PM summer.
  * River Rafting: Brahmapuri (9 km), Shivpuri (16 km), Marine Drive (26 km); best Sept–June (closed monsoon July–Aug).
  * Nearby Waterfalls & Nature: Patna Waterfall (~6 km), Neer Garh Waterfall (~3.5 km), Vashistha Gufa (~22 km), Beatles Ashram (~3.5 km).
- Interactive Features in App:
  * 3D Interactive Room Walkthrough (Three.js), Sunlit Play & Earn (4 games earning points/vouchers), Sunlit Rewards Club (Explorer -> Pioneer -> Patron tiers).
`;

// POST /api/ai/advisor
app.post('/api/ai/advisor', async (req: Request, res: Response) => {
  try {
    const { metrics } = req.body;
    if (!metrics) {
      return res.status(400).json({ error: 'Metrics are required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ fallback: true, message: 'Server GEMINI_API_KEY not configured, using deterministic engine' });
    }

    const prompt = `
You are a senior hospitality business advisor analyzing Devashish Sunlit Homestay in Tapovan, Rishikesh, Uttarakhand, India.
This is a clean, affordable, family-friendly homestay with 10+ rooms, a swimming pool, a dedicated children's play area, and rooftop city views.

Current Database Metrics:
- Total Rooms: ${metrics.totalRooms}
- Confirmed Bookings: ${metrics.confirmedBookings}
- Cancelled Bookings: ${metrics.cancelledBookings}
- Total Homestay Revenue: ₹${metrics.totalRevenue}
- Total Operational Expenses: ₹${metrics.totalExpenses}
- Net Operating Balance: ₹${metrics.totalRevenue - metrics.totalExpenses}
- Estimated Occupancy Rate: ${metrics.occupancyRate}%
- Average Daily Rate (ADR): ₹${metrics.adr}
- RevPAR: ₹${metrics.revpar}
- Cancellation Rate: ${metrics.cancellationRate}%
- Average Length of Stay: ${metrics.averageNights} nights
- Rooftop Event Requests: ${metrics.rooftopBookingsCount}
- Kids Play Area Bookings: ${metrics.playAreaBookingsCount}
- Top Expense Categories: ${JSON.stringify(metrics.expensesByCategory)}

Generate exactly 3 actionable, highly professional business recommendations strictly based on these figures.
Respond ONLY with a valid JSON array of objects conforming to:
[
  {
    "category": "Pricing Strategy" | "Occupancy Growth" | "Expense Control" | "Family & Play Area" | "Rooftop Monetization",
    "observedCondition": "Specific condition observed in the data",
    "databaseFigures": {"key": value},
    "explanation": "Why this is happening based on market dynamics in Tapovan Rishikesh",
    "suggestedAction": "Concrete, step-by-step action for owner Subhashish Pandey to approve",
    "estimatedImpact": "Estimated monthly revenue increase or cost saving (e.g. +₹12,000 to ₹18,000/month)",
    "confidenceLevel": "High" | "Medium" | "Low",
    "dataLimitations": "Any caveats or sample size limitations"
  }
]
`;

    let lastErr: any = null;
    for (const model of [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]) {
      try {
        const aiResponse = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        const text = extractReplyText(aiResponse);
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ success: true, insights: parsed, model });
      } catch (e: any) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Failed to generate JSON advisor insights');
  } catch (error: any) {
    console.warn('Server Gemini Advisor fallback:', error?.message);
    return res.status(200).json({ fallback: true, error: error?.message });
  }
});

// POST /api/ai/command
app.post('/api/ai/command', async (req: Request, res: Response) => {
  try {
    const { question, metrics, serviceRequests = [], staff = [] } = req.body;
    if (!question || !metrics) {
      return res.status(400).json({ error: 'Question and metrics are required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ fallback: true, message: 'Server GEMINI_API_KEY not set' });
    }

    const prompt = `
You are the AI Business Co-Pilot for Subhashish Pandey & Vivek Singh Negi, owners of Devashish Sunlit Homestay in Tapovan, Rishikesh.
Answer the user's question accurately, concisely, and backed strictly by the provided hotel data.
Never make up facts, outside rankings, or fake reviews.

HOTEL DATA:
- Total Rooms: ${metrics.totalRooms}
- Total Revenue: ₹${metrics.totalRevenue}
- This Month Revenue: ₹${metrics.currentMonthRevenue}
- Previous Month Revenue: ₹${metrics.previousMonthRevenue}
- This Week Revenue: ₹${metrics.thisWeekRevenue}
- Previous Week Revenue: ₹${metrics.previousWeekRevenue}
- Total Expenses: ₹${metrics.totalExpenses}
- Net Profit: ₹${metrics.totalRevenue - metrics.totalExpenses}
- Occupancy Rate: ${metrics.occupancyRate}%
- ADR (Average Daily Rate): ₹${metrics.adr}
- RevPAR: ₹${metrics.revpar}
- Room-wise Revenue: ${JSON.stringify(metrics.roomWiseRevenue)}
- Top Expenses: ${JSON.stringify(metrics.expensesByCategory)}
- Confirmed Bookings: ${metrics.confirmedBookings}
- Cancelled Bookings: ${metrics.cancelledBookings}
- Cancellation Rate: ${metrics.cancellationRate}%
- Active Staff Count: ${staff.filter((s: any) => s.active).length}
- Total Customer Service Requests: ${serviceRequests.length}

USER QUESTION: "${question}"

Provide a structured response in plain JSON with:
{
  "answer": "Concise 2-4 sentence explanation referencing specific numbers",
  "keyFigures": { "metric_name": value },
  "actionableStep": "One concrete step the owner should take today"
}
`;

    let lastErr: any = null;
    for (const model of [GEMINI_MODEL, GEMINI_FALLBACK_MODEL]) {
      try {
        const aiResponse = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        const text = extractReplyText(aiResponse);
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ success: true, result: parsed, model });
      } catch (e: any) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Failed to generate JSON command answer');
  } catch (error: any) {
    console.warn('Server Gemini Command fallback:', error?.message);
    return res.status(200).json({ fallback: true, error: error?.message });
  }
});

function summarizeGeminiErrorReason(rawErr: string): string {
  const s = String(rawErr || '').trim();
  if (/API_KEY_INVALID|API key not valid|UNAUTHENTICATED|401/i.test(s)) {
    return 'Gemini API key invalid or expired (update GEMINI_API_KEY in Settings > Secrets)';
  }
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(s)) {
    return 'Gemini API quota temporarily reached';
  }
  if (/not configured|missing/i.test(s)) {
    return 'GEMINI_API_KEY not configured';
  }
  return 'Live Gemini engine temporarily unreachable';
}

function buildLiveHomestayDeskReply(params: {
  message: string;
  topic?: string;
  customerName?: string;
  bookingReference?: string;
  roomNumber?: string;
  homestayContext?: string;
  guestContext?: string;
  liveWeatherAndClock?: string;
  isAdminDesk: boolean;
}): string {
  const q = String(params.message || '').trim();
  const qLower = q.toLowerCase();
  const topicLower = String(params.topic || '').toLowerCase();
  const combined = `${qLower} ${topicLower}`;
  const greeting = params.customerName
    ? `Namaste **${params.customerName} ji**!`
    : 'Namaste!';

  const lines: string[] = [];
  const addSection = (text: string) => {
    if (text && !lines.includes(text)) lines.push(text);
  };

  // Extract live guest loyalty / booking snippets if present
  const guestLoyaltyMatch = params.guestContext?.match(/Loyalty Points:\s*([^\n]+)/i);
  const guestBookingMatch = params.guestContext?.match(/Recent Bookings:([\s\S]+)/i);

  // 1. Weather, Time, Ganga Aarti
  if (/(weather|temperature|rain|climate|hot|cold|forecast|aarti|triveni|parmarth|sunset|time|today)/i.test(combined)) {
    addSection(
      `${greeting} Here is the **live Rishikesh & Tapovan update**:\n` +
        `${params.liveWeatherAndClock ? `- **${params.liveWeatherAndClock.replace(/\n/g, '**\n- **')}**` : '- Pleasant Himalayan foothills weather in Tapovan, Rishikesh.'}\n` +
        `- **Triveni Ghat Maha Ganga Aarti:** ~5:30 PM – 6:30 PM (Winter) / ~6:00 PM – 7:00 PM (Summer) — arrive 30 minutes early for riverside seating (~2.8 km from Devashish).\n` +
        `- **Parmarth Niketan Ganga Aarti (Swarg Ashram):** ~5:30 PM – 6:30 PM (Winter) / ~6:00 PM – 7:00 PM (Summer) — ~1.8 km via Ram Jhula.`
    );
  }

  // 2. Promo Codes, Discounts, Loyalty & Game Points
  if (/(promo|coupon|discount|offer|code|cheap|student|couple|pilgrim|long.?stay|loyalty|reward|point|voucher|game|arcade)/i.test(combined)) {
    const loyaltyLine = guestLoyaltyMatch
      ? `- **Your Live Sunlit Rewards Balance:** ${guestLoyaltyMatch[1].trim()} *(2 pts = ₹1 direct checkout discount)*`
      : `- **Sunlit Rewards + Arcade Points:** Earn points on every booking and in our 4 **Sunlit Play & Earn** games (up to 200 pts/day). Points sync straight to your loyalty wallet (**2 pts = ₹1 discount**, redeemable directly in checkout or as vouchers starting at 50 pts = ₹25 off).`;
    addSection(
      `**Active Discount Codes & Loyalty Savings at Devashish Sunlit Homestay:**\n` +
        `- **\`STUDENT500\`** — Flat **₹500 OFF** (min 1 night; student ID verified at check-in).\n` +
        `- **\`PILGRIM10\`** — **10% OFF** (up to ₹800, min 1 night; pilgrims & senior citizens).\n` +
        `- **\`SUNLITCOUPLE\`** — **12% OFF** (up to ₹1,000, min **2+ nights**).\n` +
        `- **\`LONGSTAY20\`** — **20% OFF** (up to ₹5,000, min **7+ nights** — ideal for Yoga TTC & remote work).\n` +
        `${loyaltyLine}\n` +
        `*Tip: You can tap any promo pill inside the Booking modal to apply it in 1 click, and stack your Sunlit Loyalty points right underneath!*`
    );
  }

  // 3. Rooms, Pricing, Family / Couple / Student / Availability
  if (/(room|price|rate|tariff|book|stay|family|couple|solo|budget|deluxe|bed|guest|availab|floor|balcony|ac|wifi)/i.test(combined)) {
    const wantsFamily = /(family|4|5|6|kids|group|parent)/i.test(combined);
    const wantsCouple = /(couple|honeymoon|romantic|partner|2 guest)/i.test(combined);
    const wantsBudget = /(student|solo|budget|cheap|lowest|long)/i.test(combined);

    let roomRecommendation = '';
    if (wantsFamily) {
      roomRecommendation =
        `**Best Family Rooms for Your Stay:**\n` +
        `- **Room 104 · Family Room (1st Floor, Hill View):** 1 King + 1 Single Bed (up to 5 guests) — **₹1,399/night**.\n` +
        `- **Room 303 · Premium Family Room (3rd Floor, Lounge Seating):** 1 King + 1 Queen Bed (up to 6 guests) — **₹1,599/night**.\n` +
        `- **Complimentary:** Freshwater Swimming Pool, Kids Play Area (ages 2–12), Rooftop City-View Terrace & Fiber Wi-Fi.\n` +
        `- **Best Promo:** Apply **\`PILGRIM10\`** (10% off) or **\`SUNLITCOUPLE\`** (12% off on 2+ nights) plus your **Sunlit Rewards** points!`;
    } else if (wantsCouple) {
      roomRecommendation =
        `**Best Rooms for Couples:**\n` +
        `- **Room 201 · Couple Special Room (2nd Floor, Private Mountain-View Balcony):** King Bed (2 guests) — **₹1,099/night**.\n` +
        `- **Room 301 · Top Floor City View Room (3rd Floor, Stargazing Rooftop Access):** King Bed — **₹1,499/night**.\n` +
        `- **Best Promo:** Use **\`SUNLITCOUPLE\`** for **12% OFF** on 2+ night stays (plus optional Private Rooftop Sunset Dinner at ₹1,800/couple).`;
    } else if (wantsBudget) {
      roomRecommendation =
        `**Best Budget, Solo & Long-Stay Rooms:**\n` +
        `- **Room 202 · Student Budget Room (2nd Floor, Study Desk & Fiber Wi-Fi):** Single Bed — **₹599/night**.\n` +
        `- **Room 302 · Long Stay Budget Room (3rd Floor, Workstation):** Queen Bed (up to 3 guests) — **₹699/night**.\n` +
        `- **Room 101 · Budget Standard Room (Ground Floor):** Queen Bed — **₹799/night**.\n` +
        `- **Best Promo:** Use **\`STUDENT500\`** (flat ₹500 off) or **\`LONGSTAY20\`** (20% off on 7+ nights)!`;
    } else {
      roomRecommendation =
        `**Devashish Sunlit Homestay Rooms (Tapovan, Rishikesh):**\n` +
        `- **Budget & Solo (₹599 – ₹999/night):** Room 202 Student (₹599), Room 302 Long Stay (₹699), Room 101 Budget Standard (₹799), Room 102 Garden Double (₹999).\n` +
        `- **Couple & Deluxe (₹1,099 – ₹1,499/night):** Room 201 Couple Balcony (₹1,099), Room 103 Deluxe Hill-View (₹1,199), Room 203 City View (₹1,299), Room 301 Top Floor Panoramic (₹1,499).\n` +
        `- **Family Suites (₹1,399 – ₹1,599/night):** Room 104 Family (₹1,399, up to 5 guests), Room 303 Premium Family (₹1,599, up to 6 guests).\n` +
        `- **Every booking includes:** Free Swimming Pool, Kids Play Area, Rooftop Terrace, High-Speed Fiber Wi-Fi & 24/7 Power Backup.`;
    }
    addSection(roomRecommendation);
  }

  // 4. CookNow Satvik Food & Dining
  if (/(food|cook|menu|thali|eat|breakfast|lunch|dinner|satvik|veg|meal|chai|paratha|dining|order)/i.test(combined)) {
    addSection(
      `**CookNow Homestyle & 100% Pure Veg Satvik Dining:**\n` +
        `- **Fresh Breakfast:** Aloo Paratha with Curd (**₹130**), Indori Poha (**₹95**), Pancakes (**₹149**), Fresh Masala Chai (**₹35**).\n` +
        `- **Mains & Thalis:** Devashish Satvik Thali (**₹229**), Paneer Butter Masala (**₹249**), Homestyle Dal Tadka (**₹169**), plus South Indian, Healthy Bowls & Desserts.\n` +
        `- **Delivery:** Served hot directly to your **Room**, **Poolside**, or **3rd-Floor Rooftop Deck** (Pay on Delivery or add to Room Bill). Open the **CookNow Dining** button in the top menu to order in seconds!`
    );
  }

  // 5. Swimming Pool, Kids Play Area & Rooftop
  if (/(pool|swim|kid|child|play|rooftop|terrace|sunset|party|celebration|facilit|amenit)/i.test(combined)) {
    addSection(
      `**Complimentary Facilities & Rooftop Experiences:**\n` +
        `- **Outdoor Freshwater Swimming Pool:** Open **7:00 AM – 7:30 PM** (cleaning break 1:00 PM – 2:30 PM). Free for all staying guests; swimwear required & kids under 14 supervised.\n` +
        `- **Dedicated Kids Play Area (Ages 2–12):** Morning **8 AM – 12 PM**, Afternoon **3 PM – 6 PM**, Evening **6 PM – 8 PM** (socks required, guardian supervision).\n` +
        `- **3rd-Floor Rooftop City-View Terrace:** Open **6:00 AM – 10:00 PM** (quiet hours after 9:30 PM). Optional private setups: Sunset Dinner (**₹1,800/couple**), Celebration Deck (**₹2,500** up to 6 guests), Morning Meditation & Chai (**₹600**).`
    );
  }

  // 6. Check-in / Check-out / Early Check-in / Payment / ID / Cancellation
  if (/(check.?in|check.?out|early|late|arrival|payment|upi|cash|razorpay|cancel|refund|id|aadhaar|passport|policy|rule)/i.test(combined)) {
    addSection(
      `**Check-In, Payment & Guest Policies:**\n` +
        `- **Standard Check-In:** **12:00 PM** | **Standard Check-Out:** **10:00 AM – 11:00 AM**.\n` +
        `- **Early Check-In / Late Check-Out:** We gladly accommodate early arrivals (such as 10:00 AM) subject to room turnover availability — luggage storage and poolside lounge access are always complimentary while your room is prepared.\n` +
        `- **Payment:** **Pay at Property (Cash / UPI on arrival)** is 100% active with zero prepayment required.\n` +
        `- **ID Proof:** Valid Govt ID required at check-in (Aadhaar / Passport / DL / Voter ID; Foreign guest Form C supported).`
    );
  }

  // 7. How to Reach, Airport Pickup, Train, Delhi, Sightseeing & Rafting
  if (/(reach|airport|dehradun|jolly|train|station|haridwar|delhi|bus|cab|taxi|pickup|drop|rafting|waterfall|cafe|sightseeing|jhula|beatles|neer|patna|vashistha|travel|distance)/i.test(combined)) {
    addSection(
      `**Getting to Devashish Sunlit Homestay (Tapovan) & Local Exploration:**\n` +
        `- **Dehradun Jolly Grant Airport (DED):** ~20 km / 40 min — reception arranges private pickup cabs at **₹900 – ₹1,200**.\n` +
        `- **Yog Nagari Rishikesh Station:** ~5 km (auto **₹150 – ₹250**) | **Haridwar Junction:** ~25 km (cab **₹700 – ₹900**).\n` +
        `- **From New Delhi:** ~240 km / 5–6 hrs via NH-334 (frequent Volvo buses & Vande Bharat/Shatabdi to Haridwar/Dehradun).\n` +
        `- **Nearby Highlights:** Ram Jhula (**1.2 km**), Parmarth Niketan (**1.8 km**), Triveni Ghat (**2.8 km**), Neer Garh Waterfall (**3.5 km**), Beatles Ashram (**3.5 km**), Patna Waterfall (**6 km**), and Ganga River Rafting (Brahmapuri 9 km / Shivpuri 16 km, Sept–June).`
    );
  }

  // 8. Signed-in guest booking reference context if asked about their booking
  if (/(my booking|reservation|status|ref|confirmation)/i.test(combined) && (params.bookingReference || guestBookingMatch)) {
    addSection(
      `**Your Booking Context:**\n` +
        `${params.bookingReference ? `- **Reference:** ${params.bookingReference}\n` : ''}` +
        `${params.roomNumber ? `- **Room:** #${params.roomNumber}\n` : ''}` +
        `${guestBookingMatch ? `- ${guestBookingMatch[1].trim().split('\n').slice(0, 3).join('\n- ')}` : '- Our host desk has your booking details on file and can help with any modification.'}`
    );
  }

  // Fallback comprehensive overview if none of the specific sections triggered
  if (lines.length === 0) {
    addSection(
      `${greeting} Welcome to **Devashish Sunlit Homestay** in **Tapovan, Rishikesh** (hosted by Subhashish Pandey & Vivek Singh Negi).\n` +
        `- **Rooms:** 10+ sunlit rooms from **₹599 to ₹1,599/night** (Budget, Deluxe, Couple Balcony, Family Suites & Top-Floor City View) with free **Swimming Pool, Kids Play Area, Rooftop Terrace & Fiber Wi-Fi**.\n` +
        `- **Active Promos:** \`STUDENT500\` (₹500 off), \`PILGRIM10\` (10% off), \`SUNLITCOUPLE\` (12% off, 2+ nights), \`LONGSTAY20\` (20% off, 7+ nights) + unified **Sunlit Rewards & Arcade points**.\n` +
        `- **CookNow Dining:** Fresh homestyle pure-veg & Satvik meals delivered straight to your room or rooftop.\n` +
        `${params.liveWeatherAndClock ? `- **Live Tapovan Update:** ${params.liveWeatherAndClock.replace(/\n/g, ' · ')}` : ''}`
    );
  } else if (!lines[0].startsWith('Namaste')) {
    lines.unshift(
      params.isAdminDesk
        ? `${greeting} Thank you for messaging **Devashish Sunlit Homestay Host Desk**${params.topic ? ` regarding **${params.topic}**` : ''}. Here are the exact details for your query:`
        : `${greeting} Here are the exact live details from **Devashish Sunlit Homestay**:`
    );
  }

  if (params.isAdminDesk) {
    lines.push(
      `Our reception team (**Subhashish Pandey & Vivek Singh Negi · +91 9897335265**) has also logged your message${params.bookingReference ? ` (Ref: **${params.bookingReference}**)` : ''} for personal follow-up if you need custom arrangements, early check-in confirmation, or airport cab booking.`
    );
  } else {
    lines.push(
      `*Need custom room allocation or airport cab booking? Tap **Admin Desk** anytime or call **+91 9897335265**.*`
    );
  }

  return lines.join('\n\n');
}

// POST /api/ai/assistant - Ask Sunlit AI Concierge (Full Homestay + World Data Grounding)
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  const { message, history = [], homestayContext = '', guestContext = '' } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const liveWeatherAndClock = await getLiveWorldWeatherAndClock();

  try {
    const ai = getGeminiClient();
    if (!ai) {
      const reason = 'GEMINI_API_KEY not configured on server';
      const deskReply = buildLiveHomestayDeskReply({
        message: String(message).trim(),
        homestayContext,
        guestContext,
        liveWeatherAndClock,
        isAdminDesk: false
      });
      return res.json({
        success: true,
        reply: deskReply,
        sources: [],
        grounded: false,
        engine: 'homestay_desk',
        geminiError: reason,
        aiNotice: `Live Gemini unavailable (${reason}) — answered from Live Devashish Homestay & Weather Data.`
      });
    }

    const baseInstruction = `You are "Ask Sunlit AI", the intelligent 24/7 Travel & Hospitality Concierge for DEVASHISH SUNLIT HOME STAY in Tapovan, Rishikesh, Uttarakhand, India.

YOUR KNOWLEDGE SOURCES:
1. LIVE HOMESTAY PROPERTY DATABASE & REAL-TIME WEATHER:
${liveWeatherAndClock}
${HOMESTAY_MASTER_PROFILE}
${homestayContext ? `\nLIVE DATABASE SNAPSHOT:\n${homestayContext}` : ''}
${guestContext ? `\nCURRENT SIGNED-IN GUEST CONTEXT:\n${guestContext}` : ''}

RESPONSE GUIDELINES:
- Be warm, clear, intelligent, and genuinely helpful—never generic or robotic.
- Give complete, practical, well-structured answers (use clean bullet points or bold key numbers/prices/timings when helpful, without excessive length).
- When recommending rooms, food, or discounts, cite exact room names/numbers/₹ prices, CookNow items, or promo codes (e.g., STUDENT500, LONGSTAY20, SUNLITCOUPLE, PILGRIM10).
- If the guest asks a general world question unrelated to travel, answer accurately using your broad world knowledge, keeping a warm hospitality tone.
- Never invent fake homestay bookings or guarantees (e.g., early check-in is subject to room availability and handled by our host desk via "Message Admin" or +91 9897335265).`;

    const rawHistoryTurns = Array.isArray(history)
      ? history.slice(-10).map((turn: any) => ({
          role: (turn?.sender === 'assistant' || turn?.role === 'model' ? 'model' : 'user') as 'user' | 'model',
          text: String(turn?.text || '')
        }))
      : [];

    const contents = normalizeGeminiContents(rawHistoryTurns, String(message).trim());

    const result = await runResilientGeminiChat({
      ai,
      baseInstruction,
      contents
    });

    return res.json({
      success: true,
      reply: result.reply,
      sources: result.sources,
      grounded: result.grounded,
      model: result.modelUsed,
      engine: 'gemini'
    });
  } catch (error: any) {
    const rawErr = String(error?.message || error || 'AI Assistant temporarily unavailable');
    const shortReason = summarizeGeminiErrorReason(rawErr);
    console.warn('Ask Sunlit AI falling back to Live Homestay Desk:', shortReason);

    const deskReply = buildLiveHomestayDeskReply({
      message: String(message).trim(),
      homestayContext,
      guestContext,
      liveWeatherAndClock,
      isAdminDesk: false
    });

    return res.json({
      success: true,
      reply: deskReply,
      sources: [],
      grounded: false,
      engine: 'homestay_desk',
      geminiError: shortReason,
      aiNotice: `Live Gemini unavailable (${shortReason}) — answered from Live Devashish Homestay & Weather Data.`
    });
  }
});

// ==========================================
// 2. PRICING & INVENTORY HOLD ENDPOINTS
// ==========================================

function parseCanonicalDateUtcMs(dateStr: string): number | null {
  if (typeof dateStr !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const utc = Date.UTC(y, mo - 1, d);
  const verify = new Date(utc);
  if (verify.getUTCFullYear() !== y || verify.getUTCMonth() !== mo - 1 || verify.getUTCDate() !== d) {
    return null;
  }
  return utc;
}

// POST /api/pricing/calculate
app.post('/api/pricing/calculate', (req: Request, res: Response) => {
  try {
    const {
      basePrice,
      checkInDate,
      checkOutDate,
      promoCode,
      offerDefinition,
      voucherDefinition
    } = req.body;

    if (!basePrice || !checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'Base price and dates are required' });
    }

    const inMs = parseCanonicalDateUtcMs(String(checkInDate));
    const outMs = parseCanonicalDateUtcMs(String(checkOutDate));
    if (inMs === null || outMs === null || outMs <= inMs) {
      return res.status(400).json({ error: 'Please select valid dates.' });
    }
    const nights = Math.max(1, Math.round((outMs - inMs) / (1000 * 60 * 60 * 24)));

    const ratePerNight = Math.max(0, Number(basePrice));
    const roomSubtotal = Math.round(ratePerNight * nights);

    let discountAmount = 0;
    let appliedPromo: { code: string; name: string; discount: number; source?: string } | null = null;
    let promoError: string | null = null;

    if (promoCode && String(promoCode).trim()) {
      const code = String(promoCode).trim().toUpperCase().replace(/\s+/g, '');

      // 1. Check matched active Firestore offer definition first (supports admin-created & edited offers)
      if (
        offerDefinition &&
        typeof offerDefinition === 'object' &&
        String(offerDefinition.code || '').trim().toUpperCase() === code
      ) {
        const minStay = Math.max(1, Number(offerDefinition.minStay) || 1);
        const nowIso = new Date().toISOString().slice(0, 10);
        if (offerDefinition.isActive === false) {
          promoError = `Promo code ${code} is currently inactive.`;
        } else if (offerDefinition.validFrom && nowIso < String(offerDefinition.validFrom).slice(0, 10)) {
          promoError = `Promo code ${code} starts on ${offerDefinition.validFrom}.`;
        } else if (offerDefinition.validTo && nowIso > String(offerDefinition.validTo).slice(0, 10)) {
          promoError = `Promo code ${code} expired on ${offerDefinition.validTo}.`;
        } else if (nights < minStay) {
          promoError = `${code} requires a minimum stay of ${minStay} night${minStay > 1 ? 's' : ''} (you selected ${nights} night${nights > 1 ? 's' : ''}).`;
        } else {
          const val = Math.max(0, Number(offerDefinition.discountValue) || 0);
          const maxCap = Number(offerDefinition.maxDiscount) > 0 ? Number(offerDefinition.maxDiscount) : roomSubtotal;
          if (offerDefinition.discountType === 'percentage') {
            const pct = Math.min(val, 60);
            discountAmount = Math.min(Math.round((roomSubtotal * pct) / 100), maxCap, roomSubtotal);
          } else {
            discountAmount = Math.min(Math.round(val), maxCap, roomSubtotal);
          }
          appliedPromo = {
            code,
            name: String(offerDefinition.name || `${code} Offer`),
            discount: discountAmount,
            source: 'offer'
          };
        }
      }
      // 2. Check matched Firestore game reward voucher
      else if (
        voucherDefinition &&
        typeof voucherDefinition === 'object' &&
        String(voucherDefinition.code || voucherDefinition.voucherCode || '').trim().toUpperCase() === code
      ) {
        const isUsed = voucherDefinition.isUsed === true || voucherDefinition.status === 'used';
        const isExpired =
          voucherDefinition.status === 'expired' ||
          (voucherDefinition.expiresAt && new Date(voucherDefinition.expiresAt).getTime() < Date.now());
        const minSpend = Math.max(0, Number(voucherDefinition.minBookingAmount) || 0);
        const voucherDisc = Math.max(0, Math.min(Number(voucherDefinition.discountAmount) || 0, 1000));

        if (isUsed) {
          promoError = `Reward voucher ${code} has already been redeemed.`;
        } else if (isExpired) {
          promoError = `Reward voucher ${code} has expired.`;
        } else if (roomSubtotal < minSpend) {
          promoError = `Voucher ${code} requires a minimum booking subtotal of ₹${minSpend.toLocaleString('en-IN')} (current: ₹${roomSubtotal.toLocaleString('en-IN')}).`;
        } else {
          discountAmount = Math.min(voucherDisc, roomSubtotal);
          appliedPromo = {
            code,
            name: String(voucherDefinition.rewardName || `Sunlit Arcade Voucher (-₹${voucherDisc})`),
            discount: discountAmount,
            source: 'voucher'
          };
        }
      }
      // 3. Built-in official homestay promo codes
      else if (code === 'STUDENT500') {
        discountAmount = Math.min(500, roomSubtotal);
        appliedPromo = { code: 'STUDENT500', name: 'Student & Solo Explorer Special', discount: discountAmount, source: 'builtin' };
      } else if (code === 'LONGSTAY20') {
        if (nights < 7) {
          promoError = `LONGSTAY20 requires a minimum stay of 7 nights (you selected ${nights} night${nights > 1 ? 's' : ''}).`;
        } else {
          discountAmount = Math.min(Math.round((roomSubtotal * 20) / 100), 5000, roomSubtotal);
          appliedPromo = { code: 'LONGSTAY20', name: 'Long-Stay Himalayan Explorer (20% Off)', discount: discountAmount, source: 'builtin' };
        }
      } else if (code === 'SUNLITCOUPLE') {
        if (nights < 2) {
          promoError = `SUNLITCOUPLE requires a minimum stay of 2 nights (you selected ${nights} night).`;
        } else {
          discountAmount = Math.min(Math.round((roomSubtotal * 12) / 100), 1000, roomSubtotal);
          appliedPromo = { code: 'SUNLITCOUPLE', name: 'Couple Tapovan Getaway (12% Off)', discount: discountAmount, source: 'builtin' };
        }
      } else if (code === 'PILGRIM10') {
        discountAmount = Math.min(Math.round((roomSubtotal * 10) / 100), 800, roomSubtotal);
        appliedPromo = { code: 'PILGRIM10', name: 'Char Dham Pilgrim & Senior Citizen (10% Off)', discount: discountAmount, source: 'builtin' };
      } else if (activeVouchersMap.has(code)) {
        const v = activeVouchersMap.get(code)!;
        if (v.used) {
          promoError = 'This game reward voucher has already been redeemed.';
        } else if (roomSubtotal < v.minSpend) {
          promoError = `Voucher requires a minimum booking amount of ₹${v.minSpend.toLocaleString('en-IN')}.`;
        } else {
          discountAmount = Math.min(v.discount, roomSubtotal);
          appliedPromo = { code, name: `Sunlit Arcade Reward (-₹${v.discount})`, discount: discountAmount, source: 'voucher' };
        }
      } else if (/^(GANGA|QUEST|SUNLIT)(25|50|100|250|500)(-[A-Z0-9]+)?$/.test(code)) {
        const m = code.match(/^(?:GANGA|QUEST|SUNLIT)(25|50|100|250|500)/);
        const val = m ? Number(m[1]) : 50;
        const minSpend = val >= 250 ? 1500 : 500;
        if (roomSubtotal < minSpend) {
          promoError = `Voucher ${code} requires a minimum booking amount of ₹${minSpend.toLocaleString('en-IN')}.`;
        } else {
          discountAmount = Math.min(val, roomSubtotal);
          appliedPromo = { code, name: `Sunlit Arcade ₹${val} Reward`, discount: discountAmount, source: 'voucher' };
        }
      } else {
        promoError = `Promo code "${code}" is not valid. Try STUDENT500, PILGRIM10, SUNLITCOUPLE (2+ nights), or LONGSTAY20 (7+ nights).`;
      }
    }

    const finalTotal = Math.max(0, roomSubtotal - discountAmount);

    return res.json({
      success: true,
      nights,
      ratePerNight,
      roomSubtotal,
      discountAmount,
      appliedPromo,
      promoError,
      finalTotal,
      includesPoolAndPlayArea: true
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings/hold
app.post('/api/bookings/hold', (req: Request, res: Response) => {
  try {
    cleanupExpiredHolds();
    const { roomId, checkInDate, checkOutDate, userId } = req.body;

    if (!roomId || !checkInDate || !checkOutDate || !userId) {
      return res.status(400).json({ error: 'Missing required parameters for hold' });
    }

    const reqInMs = parseCanonicalDateUtcMs(String(checkInDate));
    const reqOutMs = parseCanonicalDateUtcMs(String(checkOutDate));
    if (reqInMs === null || reqOutMs === null || reqOutMs <= reqInMs) {
      return res.status(400).json({ error: 'Please select valid dates.' });
    }

    const reqInStr = String(checkInDate).trim();
    const reqOutStr = String(checkOutDate).trim();

    // Check if another active unexpired hold conflicts with requested dates
    const now = Date.now();
    for (const [id, hold] of activeInventoryHolds.entries()) {
      if (hold.expiresAt <= now) {
        activeInventoryHolds.delete(id);
        continue;
      }
      if (hold.roomId === roomId && hold.userId !== userId) {
        if (hold.checkInDate < reqOutStr && hold.checkOutDate > reqInStr) {
          return res.status(409).json({
            error: 'Room is temporarily held.'
          });
        }
      }
    }

    const holdId = `hold_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15-minute hold

    activeInventoryHolds.set(holdId, {
      holdId,
      roomId,
      checkInDate: reqInStr,
      checkOutDate: reqOutStr,
      userId,
      expiresAt
    });

    return res.json({
      success: true,
      holdId,
      expiresAt,
      expiresInMinutes: 15
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings/release-hold
app.post('/api/bookings/release-hold', (req: Request, res: Response) => {
  try {
    const { holdId } = req.body;
    if (holdId && activeInventoryHolds.has(holdId)) {
      activeInventoryHolds.delete(holdId);
    }
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2B. SUNLIT PLAY & EARN (ANTI-CHEAT VERIFIED POINTS)
// ==========================================

// POST /api/game/award-points
app.post('/api/game/award-points', (req: Request, res: Response) => {
  try {
    const { userId, tokensCollected, durationSeconds, gameName = 'Sunlit Arcade' } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const tokens = Number(tokensCollected) || 0;
    const duration = Number(durationSeconds) || 0;

    // Anti-cheat heuristic: must have played at least 3 seconds per session attempt
    if (duration < 3 || tokens < 1) {
      return res.status(400).json({ error: 'Gameplay verification not met (duration too short).' });
    }

    const safeTokens = Math.min(tokens, 200);
    const calculatedPoints = Math.max(5, Math.floor(safeTokens / 2));

    const todayStr = new Date().toISOString().slice(0, 10);
    const dailyKey = `${userId}_${todayStr}`;
    const currentDailyTotal = dailyGamePointsMap.get(dailyKey) || 0;
    const DAILY_CAP = 200;

    if (currentDailyTotal >= DAILY_CAP) {
      return res.json({
        success: true,
        pointsAwarded: 0,
        dailyTotal: currentDailyTotal,
        dailyCap: DAILY_CAP,
        dailyCapReached: true,
        message: 'Daily game earning cap of 200 points reached for today. Keep playing for fun & high scores!'
      });
    }

    const pointsToAward = Math.min(calculatedPoints, DAILY_CAP - currentDailyTotal);
    dailyGamePointsMap.set(dailyKey, currentDailyTotal + pointsToAward);

    return res.json({
      success: true,
      pointsAwarded: pointsToAward,
      dailyTotal: currentDailyTotal + pointsToAward,
      dailyCap: DAILY_CAP,
      dailyCapReached: currentDailyTotal + pointsToAward >= DAILY_CAP,
      message: `Verified! +${pointsToAward} Sunlit Rewards points added to your loyalty wallet from ${gameName}.`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/game/redeem-voucher
app.post('/api/game/redeem-voucher', (req: Request, res: Response) => {
  try {
    const { userId, discountAmount, minBookingAmount = 500 } = req.body;
    if (!userId || !discountAmount) {
      return res.status(400).json({ error: 'User ID and discount amount are required' });
    }

    const discount = Number(discountAmount);
    if (![25, 50, 100, 250, 500].includes(discount)) {
      return res.status(400).json({ error: 'Invalid reward discount amount' });
    }

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `GANGA${discount}-${randomSuffix}`;

    activeVouchersMap.set(code, {
      code,
      discount,
      minSpend: Number(minBookingAmount) || 500,
      userId,
      createdAt: Date.now(),
      used: false
    });

    return res.json({
      success: true,
      code,
      discount,
      minSpend: Number(minBookingAmount) || 500,
      message: `Reward voucher generated successfully: ${code}`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Shared helper for automatic smart host desk replies & admin drafts
async function buildSmartHostDeskReply(params: {
  topic?: string;
  customerName?: string;
  lastMessage: string;
  bookingReference?: string;
  roomNumber?: string;
  history?: any[];
  homestayContext?: string;
  guestContext?: string;
}): Promise<{
  reply: string;
  sources: GroundingSource[];
  grounded: boolean;
  modelUsed?: string;
  engine: 'gemini' | 'homestay_desk';
  geminiError?: string;
  aiNotice?: string;
}> {
  const ai = getGeminiClient();
  const liveWeatherAndClock = await getLiveWorldWeatherAndClock();

  if (!ai) {
    const reason = 'GEMINI_API_KEY not configured on server';
    return {
      reply: buildLiveHomestayDeskReply({
        message: params.lastMessage,
        topic: params.topic,
        customerName: params.customerName,
        bookingReference: params.bookingReference,
        roomNumber: params.roomNumber,
        homestayContext: params.homestayContext,
        guestContext: params.guestContext,
        liveWeatherAndClock,
        isAdminDesk: true
      }),
      sources: [],
      grounded: false,
      engine: 'homestay_desk' as const,
      geminiError: reason,
      aiNotice: `Live Gemini unavailable (${reason}) — auto-replied using Live Devashish Homestay & Weather Data.`
    };
  }

  const baseInstruction = `You are the Official Host Desk & Front Office Manager for DEVASHISH SUNLIT HOME STAY in Tapovan, Rishikesh, replying directly to a guest inside "Message Admin" (hosted by Subhashish Pandey & Vivek Singh Negi).

YOUR KNOWLEDGE SOURCES:
1. LIVE HOMESTAY MASTER DATA, INVENTORY & WEATHER:
${liveWeatherAndClock}
${HOMESTAY_MASTER_PROFILE}
${params.homestayContext ? `\nLIVE DATABASE SNAPSHOT:\n${params.homestayContext}` : ''}
${params.guestContext ? `\nGUEST PROFILE & BOOKINGS:\n${params.guestContext}` : ''}

CONVERSATION CONTEXT:
- Guest Name: ${params.customerName || 'Guest'}
- Selected Topic: ${params.topic || 'General Query'}
${params.bookingReference ? `- Booking Reference: ${params.bookingReference}` : ''}
${params.roomNumber ? `- Assigned Room Number: #${params.roomNumber}` : ''}

REPLY RULES:
- Greet the guest warmly by name ("Namaste ${params.customerName || 'Guest'} ji,") when natural (skip repetitive greeting on follow-up turns in an active thread).
- Answer the guest's exact question thoroughly and accurately using both Homestay DB figures (room prices, timings, CookNow items, promo codes) and live World / Rishikesh Data.
- Speak first-person plural as the Devashish Homestay Host Desk ("our team", "we at Devashish Sunlit Homestay").
- If the request needs physical confirmation (e.g., early check-in at a specific time, custom cab pickup, room upgrade approval, group negotiation), give clear expectations/pricing right away AND confirm that our reception team (+91 9897335265) has also flagged this thread for Subhashish ji's personal follow-up.
- Keep it warm, authoritative, well-formatted, and directly ready for the guest to read.`;

  const rawHistoryTurns = Array.isArray(params.history)
    ? params.history.slice(-10).map((turn: any) => ({
        role: (turn?.senderRole === 'admin' || turn?.role === 'model' ? 'model' : 'user') as 'user' | 'model',
        text: String(turn?.text || '')
      }))
    : [];

  const contents = normalizeGeminiContents(rawHistoryTurns, String(params.lastMessage || '').trim());

  try {
    const result = await runResilientGeminiChat({
      ai,
      baseInstruction,
      contents
    });
    return {
      reply: result.reply,
      sources: result.sources,
      grounded: result.grounded,
      modelUsed: result.modelUsed,
      engine: 'gemini' as const
    };
  } catch (err: any) {
    const shortReason = summarizeGeminiErrorReason(String(err?.message || err));
    console.warn('Smart Host Desk falling back to Live Homestay Desk:', shortReason);
    return {
      reply: buildLiveHomestayDeskReply({
        message: params.lastMessage,
        topic: params.topic,
        customerName: params.customerName,
        bookingReference: params.bookingReference,
        roomNumber: params.roomNumber,
        homestayContext: params.homestayContext,
        guestContext: params.guestContext,
        liveWeatherAndClock,
        isAdminDesk: true
      }),
      sources: [],
      grounded: false,
      engine: 'homestay_desk' as const,
      geminiError: shortReason,
      aiNotice: `Live Gemini unavailable (${shortReason}) — auto-replied using Live Devashish Homestay & Weather Data.`
    };
  }
}

// POST /api/ai/admin-auto-reply - Automatic Smart Host Desk Reply for Message Admin
app.post('/api/ai/admin-auto-reply', async (req: Request, res: Response) => {
  try {
    const {
      topic,
      customerName,
      lastMessage,
      message,
      bookingReference,
      roomNumber,
      history = [],
      homestayContext = '',
      guestContext = ''
    } = req.body;

    const finalMessage = String(lastMessage || message || '').trim();
    if (!finalMessage) {
      return res.status(400).json({ error: 'Customer message is required' });
    }

    const result = await buildSmartHostDeskReply({
      topic,
      customerName,
      lastMessage: finalMessage,
      bookingReference,
      roomNumber,
      history,
      homestayContext,
      guestContext
    });

    return res.json({
      success: true,
      reply: result.reply,
      sources: result.sources,
      grounded: result.grounded,
      senderName: 'Subhashish Pandey · Host Desk',
      model: (result as any).modelUsed || GEMINI_MODEL,
      engine: result.engine,
      geminiError: (result as any).geminiError,
      aiNotice: (result as any).aiNotice
    });
  } catch (error: any) {
    console.error('Admin Auto-Reply error:', error?.message || error);
    return res.status(502).json({
      success: false,
      error: error?.message || 'Smart Host Desk temporarily unavailable',
      reply: `Namaste! Thank you for reaching out to Devashish Sunlit Homestay. Our host desk (Subhashish Pandey · +91 9897335265) has logged your message and will respond right away.`
    });
  }
});

// POST /api/ai/suggest-reply - Admin Customer Support AI Draft
app.post('/api/ai/suggest-reply', async (req: Request, res: Response) => {
  try {
    const {
      topic,
      customerName,
      lastMessage,
      bookingReference,
      roomNumber,
      history = [],
      homestayContext = '',
      guestContext = ''
    } = req.body;
    if (!lastMessage) {
      return res.status(400).json({ error: 'Customer message is required' });
    }

    const result = await buildSmartHostDeskReply({
      topic,
      customerName,
      lastMessage,
      bookingReference,
      roomNumber,
      history,
      homestayContext,
      guestContext
    });

    return res.json({
      success: true,
      suggestedDraft: result.reply,
      sources: result.sources,
      grounded: result.grounded,
      model: (result as any).modelUsed || GEMINI_MODEL,
      engine: result.engine,
      geminiError: (result as any).geminiError,
      aiNotice: (result as any).aiNotice
    });
  } catch (error: any) {
    console.warn('AI Suggest Reply error:', error?.message);
    return res.status(502).json({
      success: false,
      error: error?.message,
      suggestedDraft: `Namaste! Thank you for reaching out to Devashish Sunlit Homestay. We would be delighted to assist you with any questions regarding our rooms, pool, or Rishikesh travels.`
    });
  }
});

// ==========================================
// 3. PAYMENT ARCHITECTURE (RAZORPAY + CONFIG-PENDING STATE)
// ==========================================

// GET /api/payment/config
app.get('/api/payment/config', (_req: Request, res: Response) => {
  const keyId = process.env.RAZORPAY_KEY_ID || null;
  const isAvailable = Boolean(keyId);
  res.json({
    available: isAvailable,
    keyId: keyId,
    gatewayPending: !isAvailable,
    allowPayAtProperty: true,
    notice: isAvailable 
      ? 'Payment gateway active.' 
      : 'Payment Gateway Setup Pending: Online payments will activate once official Razorpay keys are configured in environment. Pay at Property is 100% active.'
  });
});

// POST /api/payment/create-order
app.post('/api/payment/create-order', async (req: Request, res: Response) => {
  try {
    const { amount, bookingReference, guestEmail, guestPhone } = req.body;
    const amountInPaise = Math.round(Number(amount) * 100);

    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
      // Call official Razorpay Orders API
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: bookingReference || `rcpt_${Date.now()}`,
          notes: {
            homestay: 'Devashish Sunlit Homestay',
            location: 'Tapovan Rishikesh',
            guestEmail: guestEmail || '',
            guestPhone: guestPhone || ''
          }
        })
      });

      if (!rzpRes.ok) {
        const errData = await rzpRes.json();
        console.error('Razorpay API order error:', errData);
        return res.status(502).json({ error: 'Razorpay order creation failed', details: errData });
      }

      const orderData = await rzpRes.json();
      return res.json({
        success: true,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        gatewayPending: false
      });
    } else {
      // Per instructions: Do not simulate fake successful transactions!
      // Provide explicit, transparent gateway-pending state.
      return res.status(200).json({
        success: false,
        gatewayPending: true,
        allowPayAtProperty: true,
        message: 'Payment Gateway Setup Pending: Online payment processing requires official Razorpay API credentials configured by owner Subhashish Pandey. Please select "Pay at Property" upon arrival to confirm your room without any prepayment.'
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/payment/verify
app.post('/api/payment/verify', (req: Request, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return res.status(400).json({
        success: false,
        gatewayPending: true,
        error: 'Payment Gateway Setup Pending: Server-side Razorpay secret key has not been configured.'
      });
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isMatch = generatedSignature === razorpaySignature;

    if (isMatch) {
      return res.json({ success: true, verified: true });
    } else {
      return res.status(400).json({ success: false, verified: false, error: 'Invalid payment signature' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. VITE MIDDLEWARE / STATIC ASSETS
// ==========================================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
