# ClaimSaathi

**ClaimSaathi** is a web app that helps people understand health insurance policies and prepare insurance claims: upload a policy for AI-assisted coverage summaries, walk through a guided claim flow with document analysis, and (optionally) sync policies and claims to **Supabase** after sign-in.

---

## Features

### Policy Management
- **Policy Reader** — Upload a PDF or image of your insurance policy; It extracts coverage amounts, limits, exclusions, and disclaimers into a clean summary.
- **Policy Saathi Chat** — Ask natural-language questions about your uploaded policy (multilingual replies where supported).
- **ABHA-Linked Policy Fetch** — Verify your 14-digit ABHA ID (Verhoeff checksum validation) and securely retrieve linked insurance details via a consent-based ABDM flow.

### Claims
- **Guided Claim Wizard** — Upload hospital bill, discharge summary, ID proof, and insurer claim form; It suggests field values and can fill **fillable PDF** forms when AcroForm fields are detected.
- **Claims Tracking** — View all filed claims with status badges (Approved, Pending, Rejected) from the dashboard and profile.

### User Profile & Health Records
- **Profile Customization** — Edit name, phone, email, blood group, emergency contact, allergies, and select from 5 default avatar options. All data persists to localStorage.
- **ABHA ID Verification** — Enter and verify your Ayushman Bharat Health Account ID with Verhoeff checksum validation.
- **E-Health Card** — View a digital health card with ABHA details, blood group, emergency contact, and allergies.
- **Digital Health Records** — Past claims history and diagnostic reports displayed on the E-Health Card page.
- **Government Scheme Eligibility** — Information on PM-JAY, PMSBY, and PMJJBY schemes based on ABHA registration.

### Dashboard & UX
- **Interactive Hero** — Hospital-themed plus symbols on a non-overlapping grid that react to mouse movement with parallax drift and proximity scaling — even when the cursor is outside the hero area.
- **Smart Actions** — Three quick-access buttons: "My Policy & Ask AI", "File a Claim", and "My Claims".
- **Notification System** — Bell icon with popup dropdown; badge only appears when unread notifications exist.
- **Dark / Light Theme** — Toggle from the profile settings; persisted to localStorage.
- **Multilingual** — English, Hindi, Tamil, Telugu, and Bangla language preference.

### Platform
- **Cloud Sync** — With Supabase configured, policies and claims are stored under the signed-in user (RLS).
- **Authentication** — Email & password via Supabase Auth (when env vars are set).
- **Offline-First Profile** — User profile data persists to localStorage even without Supabase.

---

## Run Locally

---

## Tech stack

| Area | Choice |
|------|--------|
| UI | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| State | Zustand |
| Motion | Motion (`motion/react`) |
| Auth & DB | Supabase JS (`@supabase/supabase-js`) |
| AI | Google Gemini (`@google/genai`), optional OpenAI for claim vision |
| PDFs | pdf-lib, pdfjs-dist, jsPDF |

---

## Prerequisites

- **Node.js** 20+ (or current LTS) and npm  
- **Google AI (Gemini) API key** — required for policy analysis from uploads  
- **Supabase project** (optional) — for login and persisting `policies` / `claims`  
- **OpenAI API key** (optional) — fallback for claim document vision if Gemini is unavailable or you prefer OpenAI

---

## Quick start

```bash
git clone https://github.com/d4rk3stV0id/MicroSwiftAuto_AI.git
cd MicroSwiftAuto_AI
npm install
```

1. Copy the environment template and fill in real values:

   ```bash
   cp .env.example .env
   ```

2. Add at least **`GEMINI_API_KEY`** to `.env` (see [Environment variables](#environment-variables)).

3. If you use Supabase, create a project and run **`database.sql`** once in the SQL Editor (see [Supabase setup](#supabase-setup)).

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app listens on **http://localhost:3000** (see `package.json` `dev` script).

---

## Environment variables

Create a **`.env`** file in the project root (never commit real keys). Vite loads these for the dev server; Supabase URLs use the `VITE_` prefix so they are exposed to the browser **only** with the **anon** key (never put the service role key in the frontend).

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | **Yes** for policy upload & most AI flows | Google Gemini API key ([AI Studio](https://aistudio.google.com/apikey)) |
| `VITE_SUPABASE_URL` | For auth + DB sync | Project URL, e.g. `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | For auth + DB sync | Supabase **anon** public key |
| `OPENAI_API_KEY` | No | Optional; claim vision can use OpenAI when configured |
| `CLAIM_VISION` | No | Set to `0` or `false` to skip cloud multimodal claim extraction |
| `GEMINI_CLAIM_MODEL` | No | Override first Gemini model for claim vision (see `vite.config.ts`) |
| `OPENAI_CLAIM_MODEL` | No | Override OpenAI model for claim vision |
| `GEMINI_POLICY_CHAT_MODEL` | No | Override first model for policy chat |
| `GEMINI_POLICY_ANALYSIS_MODEL` | No | Override first model for policy analysis |
| `APP_URL` | No | Base URL when deployed (callbacks / links) |

After changing `.env`, restart `npm run dev`.

---

## Supabase setup

1. In the [Supabase dashboard](https://supabase.com/dashboard), create a project.
2. **Authentication → Providers** — Enable **Email** (and configure confirmation email if you want verified sign-ups).
3. **SQL → New query** — Paste the full contents of [`database.sql`](./database.sql) and run it.

That script:

- Creates **`public.policies`** and **`public.claims`** keyed to `auth.users`.
- Enables **row level security (RLS)** so users only read/write their own rows.
- Grants **`authenticated`** clients `SELECT` / `INSERT` / `UPDATE` / `DELETE` on those tables (needed for the browser client with the anon key + user JWT).

4. **Project Settings → API** — Copy **Project URL** and **anon public** key into `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

If claims still do not appear in the Table Editor after filing from the app, open the browser **Network** tab or toast errors: common causes are missing SQL grants, RLS policy mismatch, or not being signed in.

---

## Deploy to Vercel

This app is a **Vite + React** static client. Vercel runs `npm run build` and serves the `dist/` output. [`vercel.json`](./vercel.json) adds a SPA fallback so deep links load `index.html` (static files under `/assets/` are still served first).

### 1. Create the project

1. Push this repo to GitHub (if it is not already).
2. In [Vercel](https://vercel.com/new), **Add New… → Project** and import the repository.
3. Leave defaults unless you use a monorepo:
   - **Framework Preset:** Vite (auto-detected).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### 2. Environment variables (required for a working deploy)

In the project **Settings → Environment Variables**, add the same names you use locally. Set them for **Production** (and **Preview** if you want preview deployments to work).

| Name | Environment | Notes |
|------|-------------|--------|
| `GEMINI_API_KEY` | Production, Preview | Inlined at build time via `vite.config.ts` |
| `OPENAI_API_KEY` | Optional | Same |
| `CLAIM_VISION`, `GEMINI_*_MODEL`, `OPENAI_CLAIM_MODEL` | Optional | Same pattern as local |
| `VITE_SUPABASE_URL` | Production, Preview | Public URL |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | Public anon key only |
| `APP_URL` | Production | Your live site URL, e.g. `https://your-app.vercel.app` |

**Important:** Vite reads these at **build** time. Redeploy after you change variables so a new build picks them up.

**Security:** `GEMINI_API_KEY` and `OPENAI_API_KEY` end up inside the client bundle (same as a local `npm run build`). Treat them as **browser-exposed**. For production hardening, move AI calls to a small serverless API and keep keys server-side only.

### 3. Supabase auth URLs (if you use login)

After the first successful deploy, copy your production URL (e.g. `https://your-app.vercel.app`).

In Supabase: **Authentication → URL configuration**

- **Site URL:** your Vercel production URL.
- **Redirect URLs:** add your production URL and a wildcard if you use previews, for example:
  - `https://your-app.vercel.app/**`
  - `https://*.vercel.app/**` (optional, for preview deployments)

Save, then test sign-in on the live site.

### 4. Deploy from the CLI (optional)

```bash
npm i -g vercel
vercel login
vercel
```

Link the project and pass `--prod` when you are ready for production.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (port 3000) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Typecheck with `tsc --noEmit` |

---

## Project layout

```
├── database.sql          # Supabase schema + RLS + grants (run in SQL editor)
├── src/
│   ├── App.tsx           # Auth gate, tab shell, theme
│   ├── components/       # Layout, shared UI
│   ├── lib/              # Supabase client, Gemini/OpenAI, PDF helpers, DB access
│   ├── store/            # Zustand store (session, policy, claims)
│   ├── views/            # Dashboard, policy, claim wizard, profile, auth
│   └── types.ts          # Shared TypeScript types
├── vite.config.ts        # Vite + env injection for Gemini/OpenAI keys
└── .env.example          # Template only — copy to `.env`
```

---

## Security notes

- **Do not commit `.env`** or real API keys. `.gitignore` already excludes `.env*`.
- Use the Supabase **anon** key in the frontend only; keep the **service role** key server-side if you add backend APIs later.
- This app **does not** submit claims to insurers; it helps you prepare documents. Always verify outputs with your insurer or TPA.

---

## Contributing & support

Issues and pull requests are welcome on [MicroSwiftAuto_AI](https://github.com/d4rk3stV0id/MicroSwiftAuto_AI).  
If the repo uses branch protection, open a PR from a feature branch (for example `chore/initial-import`) into `main` instead of pushing directly to `main`.

---

## Acknowledgements

Built with [Vite](https://vitejs.dev/), [Supabase](https://supabase.com/), and [Google AI](https://ai.google.dev/).
