# Vercel Deployment Instructions
**Application:** Devashish Sunlit Homestay (Tapovan, Rishikesh)

---

## 1. Preparing for Vercel
This repository is configured for instantaneous deployment on Vercel:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

---

## 2. Environment Variables Configuration
In the Vercel project dashboard, navigate to **Settings > Environment Variables** and add:

| Key | Value / Source |
| :--- | :--- |
| `GEMINI_API_KEY` | Your Google AI Studio API key |
| `APP_URL` | Your production Vercel URL (e.g. `https://devashish-homestay.vercel.app`) |
| `VITE_FIREBASE_API_KEY` | Found in `firebase-applet-config.json` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `daring-beacon-vw1rw.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `daring-beacon-vw1rw` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `daring-beacon-vw1rw.firebasestorage.app` |
| `VITE_FIREBASE_APP_ID` | Found in `firebase-applet-config.json` |

---

## 3. Whitelist Vercel Domain in Firebase
Once your Vercel deployment URL is generated (e.g., `your-app.vercel.app`):
1. Go to the [Firebase Console](https://console.firebase.google.com/project/daring-beacon-vw1rw/authentication/settings).
2. Click **Authorized domains**.
3. Add your Vercel domain to allow Google Sign-In and popup authentication to execute seamlessly.
