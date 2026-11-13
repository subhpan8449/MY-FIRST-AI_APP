# Devashish Sunlit Homestay — Professional Full-Stack Application

**Location:** Tapovan, Rishikesh, Uttarakhand, India  
**Technology Stack:** React, TypeScript, Tailwind CSS, Vite, Cloud Firestore, Firebase Authentication, Firebase Storage, Google Gemini AI.

---

## 1. Property & Business Overview
Devashish Sunlit Homestay is an affordable, clean, comfortable, and family-friendly homestay nestled in the Himalayan foothills of Tapovan, Rishikesh. The property features:
- **11+ Guest Rooms:** Budget studios, deluxe sunlit balcony rooms, family suites, and premier 3rd-floor rooms with panoramic city views.
- **Leisure Swimming Pool:** Sparkling freshwater pool included with eligible room bookings with daily hygiene maintenance.
- **Children's Play Area & Activity Zone:** Dedicated indoor soft-mat playground with 3 daily structured operating sessions (Morning, Afternoon, Evening) for ages 2–12.
- **Top-Floor City-View Terrace:** Panoramic vantage point across Rishikesh and Tapovan valley, offering private dinner and celebration packages.
- **Transparent & Accessible Pricing:** Starting from ₹1,000–₹2,500/night with special approved student discounts (`STUDENT500`) and long-stay packages (`LONGSTAY20`).

---

## 2. Ownership & Administration Structure
- **Primary Owner:** Subhashish Pandey (`subhpan8449@gmail.com` | +91 9897335265)
- **Co-Partner:** Vivek Singh Negi (+91 6398389019) — *Account invitation pending verified email address confirmation.*
- **Equal Admin Permissions:** Secure server-side role resolution ensuring equal administrative capabilities without client-side privilege escalation.

---

## 3. Technology Architecture & Status

| Module | Purpose | Status |
| :--- | :--- | :--- |
| **Stage 1: Foundation & UI** | 3-Zone Top Bar, Hero, Responsive Layout, Policies | **COMPLETED AND TESTED** |
| **Stage 2: Firebase Connection** | Google Sign-In, Email Auth, Cloud Firestore, Security Rules | **COMPLETED AND TESTED** |
| **Stage 3: Rooms & Booking** | 11+ Units, Overlap Protection, Transparent Pricing, Pay-at-Property | **COMPLETED AND TESTED** |
| **Stage 4: Facilities & Schedules** | Swimming Pool Rules, 3 Daily Kids Play Area Sessions, Rooftop Packages | **COMPLETED AND TESTED** |
| **Stage 5: Admin Management** | KPI Dashboard, Room Inventory CRUD, Status History, Audit Logs | **COMPLETED AND TESTED** |
| **Stage 6: Financial Performance** | Expense Ledger, ADR, RevPAR, Occupancy, P&L Accounting Basis | **COMPLETED AND TESTED** |
| **Stage 7: Gemini AI Advisor** | Hospitality Business Analysis, Data Figures, Impact, Approval Workflow | **COMPLETED AND TESTED** |
| **Stage 8: CookNow Food Service** | Independent Food Ordering Partner Module (Vivek Singh Negi) | **IMPLEMENTED BUT NEEDS CONFIGURATION** (Awaiting official API key) |
| **Stage 9: Deployment Prep** | GitHub repository structure, Vercel configuration, Index files | **COMPLETED AND TESTED** |

---

## 4. Local Development Setup

1. **Clone & Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env.local` and add any custom keys if running outside Google AI Studio:
   ```bash
   cp .env.example .env.local
   ```

3. **Start Local Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the homestay web application.

4. **Verify TypeScript & Linting:**
   ```bash
   npm run lint
   npm run build
   ```

---

## 5. Security & Privacy Highlights
- **Zero Client Trust:** Pricing, booking status, and permissions are validated against Firestore rules.
- **Children's Privacy Protection:** Only minimal operational details (child's first name, age) and guardian contact are collected for play area slots.
- **No Fabricated Data:** Reviews, awards, and fake food menus are strictly avoided. CookNow food service remains explicitly disabled until verified API endpoints are provided by Vivek Singh Negi.
