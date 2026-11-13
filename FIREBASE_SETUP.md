# Firebase Setup & Administration Guide
**Application:** Devashish Sunlit Homestay  
**Project ID:** `daring-beacon-vw1rw`  
**Database ID:** `ai-studio-6d43d606-e8a5-4ad4-bc7a-d328ca806195`

---

## 1. Google Authentication Setup
1. Open the [Firebase Console](https://console.firebase.google.com/project/daring-beacon-vw1rw/authentication/providers).
2. Under **Sign-in method**, ensure **Google** and **Email/Password** are enabled.
3. Add your production and staging domains under **Authorized domains**:
   - `localhost`
   - `*.firebaseapp.com`
   - `*.run.app`
   - `*.vercel.app` (Add your custom Vercel domain once deployed)
4. Primary owner account `subhpan8449@gmail.com` is granted administrative access.

---

## 2. Firestore Database Collections
The database is structured into 24 core collections:
- `users`: Authenticated guest and admin profiles
- `adminRoles`: Authorized administrative permissions (Primary Owner Subhashish Pandey, Co-partner Vivek Singh Negi)
- `rooms`: Room units, pricing, capacities, and city-view flags
- `facilities`: Homestay amenities including swimming pool rules
- `offers`: Promotional coupons (`STUDENT500`, `LONGSTAY20`, `SUNLITCOUPLE`, `PILGRIM10`)
- `bookings`: Guest room reservations and pay-at-property records
- `playAreaSettings`: Daily operational timings (Morning, Afternoon, Evening) and safety rules
- `playAreaBookings`: Guest slot reservations for the kids play area
- `rooftopPackages`: Private sunset dinners and celebration setups
- `rooftopBookings`: Guest rooftop reservation requests
- `expenses`: Operational expenses ledger (Electricity, Water, Cleaning, Staff, Repairs)
- `adminAuditLogs`: Immutable security audit logs of administrative actions
- `notifications`: In-app guest and admin alerts
- `contactEnquiries`: Contact form submissions

---

## 3. Deploying Security Rules & Indexes
To deploy rules manually using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```
All rules are authored under `rules_version = '2'` with default-deny architecture.
