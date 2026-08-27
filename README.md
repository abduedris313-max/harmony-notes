# Harmony Notes

> **Production-Grade End-to-End Encrypted Personal Hub, Routine Tracker & AI Coach**  
> Built with iOS-inspired Human Interface Guidelines, Client-Side AES-GCM-256 Cryptography, Firebase Firestore persistence, and Server-Side Gemini AI integration.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Key Capabilities](#key-capabilities)
3. [Security & Encryption Architecture](#security--encryption-architecture)
4. [Mobile-First iOS Design System](#mobile-first-ios-design-system)
5. [Progressive Web App (PWA) & Offline Mode](#progressive-web-app-pwa--offline-mode)
6. [Backend API & Gemini AI Integration](#backend-api--gemini-ai-integration)
7. [Database Security Rules](#database-security-rules)
8. [GitHub Actions CI/CD Pipeline](#github-actions-cicd-pipeline)
9. [Getting Started & Local Development](#getting-started--local-development)
10. [Production Build & Deployment](#production-build--deployment)

---

## 1. Architecture Overview

Harmony Notes follows a clean separation of concerns between client and server:

```
├── .github/workflows/deploy.yml   # Production CI/CD automated pipeline
├── public/                        # Static assets, Web App Manifest & Service Worker
│   ├── manifest.json              # PWA manifest with shortcuts and iOS theme colors
│   ├── sw.js                      # Cache-first service worker for offline resilience
│   └── icon-192.png / icon-512.png# App icons
├── src/                           # Client-Side Application (React 19 + TypeScript)
│   ├── components/                # Modular UI views & sections
│   │   ├── iOSLayout.tsx          # Dynamic island, navigation bar, and tab bar
│   │   ├── NotesSection.tsx       # E2E encrypted rich note cards, voice dictation & AI analysis
│   │   ├── TasksSection.tsx       # Daily checklist, routine templates, category filters
│   │   ├── ChallengesSection.tsx  # Habit challenges with Recharts progression & AI coach
│   │   ├── AssistantSection.tsx   # Dual-tier AI chat (Flash-Lite / Pro Deep Thinking)
│   │   ├── AuthScreen.tsx         # Google OAuth & Passphrase authentication
│   │   └── BackupSettings.tsx     # JSON export/import and offline local storage
│   ├── crypto.ts                  # Web Crypto API (PBKDF2 + AES-GCM-256)
│   ├── firebase.ts                # Client-side Firebase App, Auth & Firestore
│   ├── types.ts                   # Strongly typed application models
│   ├── main.tsx                   # Entry point with PWA registration
│   └── index.css                  # Tailwind CSS theme with safe-area variables
├── server.ts                      # Server-Side Backend (Express + Vite Middleware proxy)
├── firestore.rules                # Production security rules enforcing strict user isolation
├── metadata.json                  # Application metadata and platform capabilities
└── package.json                   # Dependencies, build scripts & production runner
```

---

## 2. Key Capabilities

* **End-to-End Encrypted Notes**: AES-GCM-256 encryption performed directly in browser memory using the Web Crypto API. Raw plaintext note content is never sent to the server or database.
* **Encrypted Voice Dictation**: Direct speech-to-text input via the Web Speech API; recorded transcripts are immediately encrypted before sync.
* **Daily Checklist with Categorization**: Group tasks by `Personal`, `Work`, `Health`, `Mindfulness`, `Study`, or `General` with filter chips and countdown deadline badges.
* **Habit & Self-Challenges**: Set multi-day habits with Recharts time-series progression charts and milestone check-ins.
* **Celebration Animations**: Haptic-style motivational confetti bursts on task completions, and celebratory fireworks when clearing 100% of daily routines.
* **Approaching Task Alarms**: Live timer loop that detects incomplete tasks due within 30 minutes and presents an actionable iOS-style banner.
* **AI Task Pattern Analyzer & Routine Suggestions**: Analyzes completion histories, category distribution, and streak velocities via Gemini 3.7 to discover habit strengths, behavioral bottlenecks, and recommend personalized daily routine templates.
* **Dual-Tier AI Coaching**: Server-side Gemini AI integration featuring instant low-latency Flash-Lite responses and Pro Deep Thinking for custom schedule design.

---

## 3. Security & Encryption Architecture

```
[User Passphrase] 
       │
       ▼ (PBKDF2 with 100,000 iterations + SHA-256)
[AES-GCM-256 Master Key] (Non-exportable, held in browser memory only)
       │
       ├──► Encrypt: Plaintext + Random 12-byte IV ──► Base64 Ciphertext ──► Firestore / LocalStorage
       └──► Decrypt: Base64 Ciphertext + IV ──► Plaintext in React State
```

* **Zero-Knowledge Architecture**: The database and backend only ever see random Base64 initialization vectors (IV) and ciphertexts.
* **Key Isolation**: Keys are marked `extractable: false` in SubtleCrypto to prevent JavaScript serialization attacks.

---

## 4. Mobile-First iOS Design System

* **Visual Design**: High-contrast typography (SF Pro / System fonts), optical borders, and balanced spacing.
* **Adaptive Light & Dark Modes**: Deep OLED `#000000` / `#1C1C1E` dark mode palette and clean `#F2F2F7` light mode canvas.
* **Safe-Area Insets**: Full support for `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` ensuring perfect layouts on iPhones with Dynamic Islands and Home Indicators.

---

## 5. Progressive Web App (PWA) & Offline Mode

* **Installable**: Full web app manifest (`manifest.json`) supporting standalone display on iOS and Android.
* **Offline Ready**: Service worker (`sw.js`) caches the application shell and static assets for instant load times when offline.
* **Guest Storage**: Full offline fallback storage using `localStorage` for users without an active network connection or Google account.

---

## 6. Backend API & Gemini AI Integration

All Gemini AI interactions are routed securely through server-side endpoints to keep API keys private:

| Endpoint | Method | Model | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | — | Production container health & uptime probe |
| `/api/suggest-routines` | `POST` | `gemini-3.7-flash` | Analyze task completion patterns & recommend routines |
| `/api/chat` | `POST` | `gemini-3.1-flash-lite` / `gemini-3.1-pro-preview` | AI lifestyle and routine coaching |
| `/api/suggest-challenge` | `POST` | `gemini-3.1-pro-preview` (Deep Thinking) | Generating customized multi-day habits |
| `/api/analyze-note` | `POST` | `gemini-3.1-flash-lite` | Extracting summaries & action items from notes |

---

## 7. Database Security Rules

Firestore security rules enforce that users can only read and write documents under their own UID:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 8. GitHub Actions CI/CD Pipeline

The `.github/workflows/deploy.yml` pipeline automatically verifies every pull request and push:
1. **Type Checking & Linting**: Runs `npm run lint` (`tsc --noEmit`).
2. **Production Bundle**: Runs `npm run build` compiling client assets to `dist/` and bundling the backend to `dist/server.cjs` via `esbuild`.
3. **Artifact Retention**: Stores release bundles for verified deployment.

---

## 9. Getting Started & Local Development

### Prerequisites
* Node.js 20+
* NPM / Bun

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Add your GEMINI_API_KEY in .env

# 3. Start development server
npm run dev
```

App will run at `http://localhost:3000`.

---

## 10. Production Build & Deployment

```bash
# Build client and server bundles
npm run build

# Start production server
npm start
```
