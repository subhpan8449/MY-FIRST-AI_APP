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
// 1. GEMINI AI SERVER ENDPOINTS
// ==========================================

// POST /api/ai/advisor
app.post('/api/ai/advisor', async (req: Request, res: Response) => {
  try {
    const { metrics } = req.body;
    if (!metrics) {
      return res.status(400).json({ error: 'Metrics are required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ fallback: true, message: 'Server GEMINI_API_KEY not configured, using deterministic engine' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are a senior hospitality business advisor analyzing Devashish Sunlit Homestay in Tapovan, Rishikesh, Uttarakhand, India.
This is a clean, affordable, family-friendly homestay with 11+ rooms, a swimming pool, a dedicated children's play area, and rooftop city views.

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

    const timeoutPromise = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('AI call timed out')), ms))
      ]);

    const aiResponse = await timeoutPromise(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      }),
      6000
    );

    const text = aiResponse.text || '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({ success: true, insights: parsed });
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ fallback: true, message: 'Server GEMINI_API_KEY not set' });
    }

    const ai = new GoogleGenAI({ apiKey });
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

    const timeoutPromise = <T>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('AI call timed out')), ms))
      ]);

    const aiResponse = await timeoutPromise(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      }),
      6000
    );

    const text = aiResponse.text || '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({ success: true, result: parsed });
  } catch (error: any) {
    console.warn('Server Gemini Command fallback:', error?.message);
    return res.status(200).json({ fallback: true, error: error?.message });
  }
});

// POST /api/ai/assistant - AI Guest Concierge
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        reply: "Welcome to Devashish Sunlit Homestay in Tapovan, Rishikesh! We offer 11+ peaceful rooms with swimming pool and children's play area privileges included. Check-in is at 12:00 PM and check-out at 10:00 AM. Our host desk is always available to assist."
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are the AI Guest Concierge for Devashish Sunlit Homestay in Tapovan, Rishikesh, Uttarakhand, India.
Property Highlights:
- 11+ clean, sunlit rooms across ground and upper floors (Budget Standard, Deluxe Balcony with mountain air, Family Suites, Top Floor City View).
- Inclusions for all guests at no additional charge: Outdoor freshwater swimming pool and dedicated children's indoor play area (ages 2-12).
- Optical fiber Wi-Fi across rooms and balconies.
- 3rd-floor rooftop terrace overlooking Rishikesh and sunset mountain ridge.
- Authentic satvik & homestyle dining service powered by CookNow partner.
- Check-in: 12:00 PM | Check-out: 10:00 AM (early check-in & late checkout requests accepted subject to turnover).
- Flexible payment: Pay at property upon arrival or online via Razorpay.
- Walking distance to Tapovan cafes, 1.2 km to Ram Jhula, 1.8 km to Parmarth Niketan.

Respond warmly, politely, and concisely (2 to 4 sentences). Never fabricate outside rankings or fake policies.
Guest inquiry: "${message}"`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt
    });

    const reply = aiResponse.text?.trim() || "Devashish Sunlit Homestay welcomes you to Tapovan, Rishikesh! How can we make your journey peaceful and memorable?";
    return res.json({ success: true, reply });
  } catch (error: any) {
    console.warn('AI Assistant fallback:', error?.message);
    return res.json({
      success: true,
      reply: "Namaste! Devashish Homestay offers comfortable rooms in Tapovan with pool and play area access included. Feel free to contact our host desk directly at 9897335265."
    });
  }
});

// ==========================================
// 2. PRICING & INVENTORY HOLD ENDPOINTS
// ==========================================

// POST /api/pricing/calculate
app.post('/api/pricing/calculate', (req: Request, res: Response) => {
  try {
    const { basePrice, checkInDate, checkOutDate, promoCode } = req.body;

    if (!basePrice || !checkInDate || !checkOutDate) {
      return res.status(400).json({ error: 'Base price and dates are required' });
    }

    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    const diffTime = outDate.getTime() - inDate.getTime();
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const ratePerNight = Number(basePrice);
    const roomSubtotal = ratePerNight * nights;

    let discountAmount = 0;
    let appliedPromo = null;

    if (promoCode) {
      const code = String(promoCode).trim().toUpperCase();
      if (code === 'STUDENT500') {
        discountAmount = Math.min(500, roomSubtotal);
        appliedPromo = { code: 'STUDENT500', name: 'Student Special', discount: discountAmount };
      } else if (code === 'LONGSTAY20' && nights >= 7) {
        discountAmount = Math.min(Math.round((roomSubtotal * 20) / 100), 5000);
        appliedPromo = { code: 'LONGSTAY20', name: 'Long Stay 20% Off', discount: discountAmount };
      } else if (code === 'SUNLITCOUPLE' && nights >= 2) {
        discountAmount = Math.min(Math.round((roomSubtotal * 12) / 100), 1000);
        appliedPromo = { code: 'SUNLITCOUPLE', name: 'Couple Getaway', discount: discountAmount };
      } else if (code === 'PILGRIM10') {
        discountAmount = Math.min(Math.round((roomSubtotal * 10) / 100), 800);
        appliedPromo = { code: 'PILGRIM10', name: 'Pilgrim & Senior Citizen Special', discount: discountAmount };
      } else if (activeVouchersMap.has(code)) {
        const v = activeVouchersMap.get(code)!;
        if (v.used) {
          return res.status(400).json({ error: 'This game reward voucher has already been redeemed.' });
        }
        if (roomSubtotal < v.minSpend) {
          return res.status(400).json({ error: `Voucher requires a minimum booking amount of ₹${v.minSpend}.` });
        }
        discountAmount = Math.min(v.discount, roomSubtotal);
        appliedPromo = { code, name: `Sunlit Ganga Quest Reward (-₹${v.discount})`, discount: discountAmount };
      } else if (code.startsWith('GANGA50') || code.startsWith('QUEST50')) {
        discountAmount = Math.min(50, roomSubtotal);
        appliedPromo = { code, name: 'Sunlit Ganga Quest ₹50 Reward', discount: discountAmount };
      } else if (code.startsWith('GANGA100') || code.startsWith('QUEST100')) {
        discountAmount = Math.min(100, roomSubtotal);
        appliedPromo = { code, name: 'Sunlit Ganga Quest ₹100 Reward', discount: discountAmount };
      } else if (code.startsWith('GANGA250') || code.startsWith('QUEST250')) {
        discountAmount = Math.min(250, roomSubtotal);
        appliedPromo = { code, name: 'Sunlit Ganga Quest ₹250 Reward', discount: discountAmount };
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

    const reqIn = new Date(checkInDate).getTime();
    const reqOut = new Date(checkOutDate).getTime();

    // Check if another active hold conflicts with requested dates
    for (const [_, hold] of activeInventoryHolds.entries()) {
      if (hold.roomId === roomId && hold.userId !== userId) {
        const holdIn = new Date(hold.checkInDate).getTime();
        const holdOut = new Date(hold.checkOutDate).getTime();
        if (reqIn < holdOut && reqOut > holdIn) {
          return res.status(409).json({
            error: 'Room is currently being booked by another guest. Please try another room or check back in a few minutes.'
          });
        }
      }
    }

    const holdId = `hold_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15-minute hold

    activeInventoryHolds.set(holdId, {
      holdId,
      roomId,
      checkInDate,
      checkOutDate,
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
    const { userId, tokensCollected, durationSeconds } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const tokens = Number(tokensCollected) || 0;
    const duration = Number(durationSeconds) || 0;

    // Anti-cheat heuristic: must have played at least 6 seconds per session attempt
    if (duration < 6 || tokens < 1) {
      return res.status(400).json({ error: 'Gameplay verification not met (duration too short).' });
    }

    const safeTokens = Math.min(tokens, 150);
    const calculatedPoints = Math.max(1, Math.floor(safeTokens / 2));

    const todayStr = new Date().toISOString().slice(0, 10);
    const dailyKey = `${userId}_${todayStr}`;
    const currentDailyTotal = dailyGamePointsMap.get(dailyKey) || 0;
    const DAILY_CAP = 100;

    if (currentDailyTotal >= DAILY_CAP) {
      return res.json({
        success: true,
        pointsAwarded: 0,
        dailyTotal: currentDailyTotal,
        dailyCapReached: true,
        message: 'Daily game earning cap of 100 points reached for today. Keep playing for fun & high scores!'
      });
    }

    const pointsToAward = Math.min(calculatedPoints, DAILY_CAP - currentDailyTotal);
    dailyGamePointsMap.set(dailyKey, currentDailyTotal + pointsToAward);

    return res.json({
      success: true,
      pointsAwarded: pointsToAward,
      dailyTotal: currentDailyTotal + pointsToAward,
      dailyCapReached: currentDailyTotal + pointsToAward >= DAILY_CAP,
      message: `Verified! You earned ${pointsToAward} Sunlit Rewards points.`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/game/redeem-voucher
app.post('/api/game/redeem-voucher', (req: Request, res: Response) => {
  try {
    const { userId, discountAmount, minBookingAmount = 800 } = req.body;
    if (!userId || !discountAmount) {
      return res.status(400).json({ error: 'User ID and discount amount are required' });
    }

    const discount = Number(discountAmount);
    if (![50, 100, 250].includes(discount)) {
      return res.status(400).json({ error: 'Invalid reward discount amount' });
    }

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `GANGA${discount}-${randomSuffix}`;

    activeVouchersMap.set(code, {
      code,
      discount,
      minSpend: Number(minBookingAmount) || 800,
      userId,
      createdAt: Date.now(),
      used: false
    });

    return res.json({
      success: true,
      code,
      discount,
      minSpend: Number(minBookingAmount) || 800,
      message: `Reward voucher generated successfully: ${code}`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/suggest-reply - Admin Customer Support AI Draft
app.post('/api/ai/suggest-reply', async (req: Request, res: Response) => {
  try {
    const { topic, customerName, lastMessage, bookingReference, roomNumber } = req.body;
    if (!lastMessage) {
      return res.status(400).json({ error: 'Customer message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        success: true,
        suggestedDraft: `Namaste ${customerName || 'Guest'}, thank you for contacting Devashish Sunlit Homestay in Tapovan, Rishikesh! We have received your query regarding ${topic || 'your stay'}. Our reception team is at your disposal. Swimming pool and kids play area access are always included with your booking. How may we assist you further?`
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are the Hospitality Desk Manager for Devashish Sunlit Homestay in Tapovan, Rishikesh.
Write a warm, polite, professional, and helpful reply to the following guest inquiry.
Guest Name: ${customerName || 'Guest'}
Topic: ${topic || 'General Inquiry'}
${bookingReference ? `Booking Reference: ${bookingReference}` : ''}
${roomNumber ? `Room Number: ${roomNumber}` : ''}
Guest Message: "${lastMessage}"

Homestay Facts:
- 11+ rooms in Tapovan, Rishikesh with scenic mountain & city views.
- Clean freshwater swimming pool & dedicated indoor kids play area included for all staying guests.
- Satvik & homestyle dining available via CookNow partner.
- 12:00 PM check-in, 10:00 AM check-out. Early check-in & late checkout accommodated when possible.
- Optical fiber Wi-Fi and 3rd floor rooftop terrace.
- Host contact: Subhashish Pandey / Vivek Singh Negi (9897335265).

Keep the draft concise (2-4 sentences), polite, ready to be reviewed and sent by the host.`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt
    });

    const suggestedDraft = aiResponse.text?.trim() || `Namaste ${customerName || 'Guest'}, thank you for reaching out! We are glad to help you with ${topic || 'your visit'}.`;
    return res.json({ success: true, suggestedDraft });
  } catch (error: any) {
    console.warn('AI Suggest Reply fallback:', error?.message);
    return res.json({
      success: true,
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
