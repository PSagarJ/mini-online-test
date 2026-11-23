# Online Test Application (MERN)

A complete university online assessment platform engineered with modern full-stack web technologies, featuring real-time timed tests, question bank snapshots, automatic evaluation, anti-cheat deterrence, and a comprehensive administrative dashboard.

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [The Six Auto-Submit Reasons](#the-six-auto-submit-reasons)
3. [Main Admin Account](#main-admin-account)
4. [Environment Variables](#environment-variables)
5. [Local Setup in Numbered Steps](#local-setup-in-numbered-steps)
6. [Classes, Banks, and CSV Import Format](#classes-banks-and-csv-import-format)
7. [API Overview](#api-overview)
8. [Automated Test Suite](#automated-test-suite)
9. [Design Decisions](#design-decisions)
10. [Technical Limitations & Tradeoffs](#technical-limitations--tradeoffs)
11. [Deployment Guide (MongoDB Atlas, Render, Vercel)](#deployment-guide-mongodb-atlas-render-vercel)

---

## Overview & Architecture
The system is built as a clean JavaScript monorepo:
- **Server**: Node.js 20+, Express, Mongoose (MongoDB), JSON Web Tokens (jsonwebtoken), bcryptjs, helmet, cors, express-rate-limit, dotenv, csv-parse.
- **Client**: React 18, Vite, React Router v6, Lucide React icons.
- **Styling**: Pure CSS with design tokens defined as CSS custom properties (no Tailwind, MUI, Bootstrap, or shadcn/ui).
- **Snapshot Architecture**: When a student begins a test, an immutable snapshot of 10 questions is cloned directly into the `Attempt` document. Future edits or deletions of questions in the question bank never alter historical test results.

---

## The Six Auto-Submit Reasons
Every assessment attempt is monitored by server-side evaluation and client-side anti-cheat deterrence. Submissions completed normally by the student are labelled **"Submitted by you"**. When auto-submitted by the system, one of the following exact reasons is assigned:

1. **Time ran out (time_up)**: the timer reached zero while the test was open.
2. **Tab switches (6) (tab_switch)**: the sixth tab switch.
3. **Window switches (6) (window_switch)**: the sixth window or app switch.
4. **Reloads or closing (6) (reload_or_close)**: the sixth reload or closing of the tab.
5. **Back navigation (6) (navigation)**: the sixth back or forward navigation during the test.
6. **Time passed while away (deadline_passed)**: the deadline passed while the student was away, so the server scored the saved answers.

*(Reasons 2 to 5 share a unified threshold of 6 violations. Violations 1–5 issue visible warnings. Violation 6 auto-submits the exam).*

### Result Page Banners:
- **time_up**: `"Time ran out. Your answers were submitted."`
- **Violation endings (tab_switch, window_switch, reload_or_close, navigation)**: `"Submitted automatically after 6 violations. The last one was: [label]."`
- **deadline_passed**: `"The time limit passed before you came back, so your saved answers were scored."`
- **Manual submission**: No banner is displayed.

---

## Main Admin Account
- **Email**: `adminemail123@gmail.com`
- **Password**: Hard-coded in `server/src/config/mainAdmin.js` for this university assignment as required by specification. *(The password itself is not printed here to maintain security).*
- **Rules**:
  - The main admin always holds the administrator role (`admin`), enforced at the server code level by comparing against `MAIN_ADMIN_EMAIL`.
  - On every server boot, the main admin account is created if missing and its password hash is verified/updated from `MAIN_ADMIN_PASSWORD`.
  - The main admin cannot be demoted, deleted, or altered by anyone.
  - In the admin UI, this account is labelled with a distinct **"Main admin"** badge, and all modification actions are disabled.
  - No administrator can remove their own admin role.

---

## Environment Variables

| Variable | Scope | Description | Default / Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Server | Port on which the Express server listens | `5000` |
| `MONGODB_URI` | Server | MongoDB Atlas or local MongoDB connection URI | `mongodb://localhost:27017/minitest` |
| `JWT_SECRET` | Server | Cryptographic key used to sign and verify JWT tokens | *(32+ character random secret)* |
| `CLIENT_URL` | Server | Allowed origin for Cross-Origin Resource Sharing (CORS) | `http://localhost:5173` |
| `TEST_DURATION_SECONDS`| Server | Duration allocated for each 10-question assessment | `600` (10 minutes) |
| `VITE_API_URL` | Client | Backend API base URL consumed by Vite frontend | `http://localhost:5000` |

---

## Local Setup in Numbered Steps

### Step 1: Clone Repository & Install Dependencies
```bash
git clone <repository-url>
cd mini-online-test
npm install
npm --prefix server install
npm --prefix client install
```

### Step 2: Configure Environment Files
Copy the provided `.env.example` templates to `.env`:
- Create `server/.env`:
  ```env
  PORT=5000
  MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/minitest?retryWrites=true&w=majority
  JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long
  CLIENT_URL=http://localhost:5173
  TEST_DURATION_SECONDS=600
  ```
- Create `client/.env`:
  ```env
  VITE_API_URL=http://localhost:5000
  ```

### Step 3: Seed Database
Seed Class 8 and Class 10 question banks with 12 factually accurate, grade-appropriate questions each:
```bash
npm run seed
```
*(The seed script is fully idempotent; running it multiple times creates zero duplicate questions).*

### Step 4: Run Application Concurrently
Start both backend and frontend development servers concurrently:
```bash
npm run dev
```
- Frontend application: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- API Health check: `http://localhost:5000/api/health`

---

## Classes, Banks, and CSV Import Format

### School Classes
- The server automatically initializes **Class 1** through **Class 12** on boot if no classes exist.
- Administrators can add new classes or rename existing classes via the Admin panel (`/admin/classes`).
- Students select their class upon registration or on their dashboard.

### Question Banks
- Question banks are tied to a specific class and subject (e.g. `Class 8 · Science`).
- Banks are unique on `classId + subject`.
- Banks are archived rather than deleted to ensure complete audit integrity.
- Each assessment randomly selects 10 active questions from the bank.

### CSV Import Specification
Administrators can batch import up to 500 questions (up to 1 MB) into any question bank via the Bank Detail view.
- **Exact Header Row**:
  ```csv
  question,option_a,option_b,option_c,option_d,correct,explanation
  ```
- **Validation Rules**:
  - `question`: Non-empty string.
  - `option_a`, `option_b`, `option_c`, `option_d`: Exactly four distinct non-empty strings.
  - `correct`: Single letter `A`, `B`, `C`, or `D` (case-insensitive).
  - `explanation`: Optional single-sentence rationale.
  - Commas within questions or options are fully supported when enclosed in standard double quotes (`"..."`).
  - **Atomic Validation**: If any single row contains an error, the entire import is rejected and detailed row-by-row errors are returned. No partial data is saved.
- **Template Download**: Administrators can click the **"Download template"** button in the UI to obtain a formatted CSV template.

---

## API Overview

All JSON endpoints reside under `/api`. Protected routes require `Authorization: Bearer <token>`.

### Public & Auth
- `GET /api/health` -> `{ ok: true }`
- `GET /api/classes` -> `{ classes }` (public list for signup dropdown)
- `POST /api/auth/signup` `{ name, email, password, classId? }` -> 201 `{ token, user }`
- `POST /api/auth/login` `{ email, password }` -> 200 `{ token, user }`
- `GET /api/auth/me` -> 200 `{ user }`
- `PATCH /api/auth/me/class` `{ classId }` -> 200 `{ user }` (sets class if unset)

### Student Assessment
- `GET /api/banks` -> `{ banks }` (active banks in student's class with question counts and user's best score)
- `POST /api/attempts` `{ bankId }` -> Starts 10-question test or returns active in-progress attempt
- `GET /api/attempts/active` -> Returns current active in-progress attempt or `{ attempt: null }`
- `PUT /api/attempts/:id/answers` `{ answers }` -> Autosaves student selections
- `POST /api/attempts/:id/submit` `{ answers }` -> Finalizes exam and computes score
- `POST /api/attempts/:id/violations` `{ type }` -> Records anti-cheat infraction (auto-submits on 6th)
- `GET /api/attempts` -> History of user's past attempts, newest first
- `GET /api/attempts/:id` -> Detailed result review for attempt owner

### Admin Management (`admin` role required)
- `GET /api/admin/users?search=&role=` -> User list with class names
- `PATCH /api/admin/users/:id` `{ role?, classId? }` -> Update role/class (main admin and self protected)
- `GET /api/admin/classes` -> List classes
- `POST /api/admin/classes` `{ name }` -> Create new class
- `PATCH /api/admin/classes/:id` `{ name }` -> Rename class
- `GET /api/admin/banks?classId=` -> List banks with active question counts
- `POST /api/admin/banks` `{ classId, subject }` -> Create bank
- `PATCH /api/admin/banks/:id` `{ subject?, archived? }` -> Archive/restore/rename bank
- `GET /api/admin/banks/:id/questions` -> List questions in bank
- `POST /api/admin/banks/:id/questions` -> Add question
- `PUT /api/admin/questions/:id` -> Update question
- `PATCH /api/admin/questions/:id` `{ archived }` -> Archive/restore question
- `DELETE /api/admin/questions/:id` -> Delete question (204)
- `POST /api/admin/banks/:id/import` `{ csv }` -> Validate & import CSV batch
- `GET /api/admin/results?classId=&bankId=` -> Comprehensive score report

---

## Automated Test Suite
Run the test suite natively with Node.js test runner:
```bash
npm test
```
The test suite validates:
1. **Scoring Engine**: Correct answer increments, partial/unanswered scoring, percentage calculation.
2. **Deadline & Grace Period**: Expiry rule cutoff, `time_up` (within 15s) vs `deadline_passed` (> 15s).
3. **Anti-Cheat Counter**: Warnings 1–5, auto-finalize on 6th violation with correct reason, 1-second debounce, post-finalization idempotence.
4. **CSV Parsing**: Valid rows, quoted commas, atomic import rejection on invalid rows.
5. **Role Security**: Main admin demotion immunity, self-demotion prevention.

---

## Design Decisions
- **Typography**: Editorial serif font (*Newsreader*) for titles, wordmarks, and score numerals; clean sans-serif (*Inter*) for all UI controls and forms; tabular figures (`tabular-nums`) for timers, metrics, and dates.
- **Color Tokens**: Natural paper surface (`#F6F4EF`), crisp card surface (`#FFFFFF`), deep ink (`#1B1A17`), and dignified evergreen accent (`#1E5A47`). High contrast ratio meeting WCAG AA requirements (4.5:1).
- **Hairline Aesthetic**: Crisp 1px solid hairline borders (`#E3DED3`) rather than heavy drop shadows, providing an academic, reliable feel.
- **Dense Admin Tooling**: Admin tables prioritize information density, rapid inline filtering, and clear confirmation modals over decorative cards.

---

## Technical Limitations & Tradeoffs
1. **Deterrence vs True Proctoring**: Browser event listeners (`visibilitychange`, `blur`, `popstate`, `beforeunload`) deter tab switching and window switching. However, client-side browsers cannot prevent students from consulting separate physical devices (e.g., smartphones).
2. **Local Storage Token Storage**: Authentication tokens are stored in `localStorage` for seamless SPA persistence across page refreshes. In production banking/enterprise environments, `HttpOnly` Secure cookies are preferred to mitigate XSS exposure.
3. **Render Free Tier Spin-Down**: On Render's free tier, the backend web service spins down after 15 minutes of inactivity. The initial request may experience a 30–50 second cold start delay.
4. **Hard-Coded Password**: For university grading compliance, the main admin password is hard-coded in `server/src/config/mainAdmin.js`. In commercial production, admin passwords must always be securely hashed and provisioned through external secrets managers or SSO.

---

## Deployment Guide (MongoDB Atlas, Render, Vercel)

### Phase A: MongoDB Atlas Setup
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and deploy an M0 Free Tier cluster.
2. Under **Database Access**, create a user with read and write privileges on `minitest`.
3. Under **Network Access**, add `0.0.0.0/0` to allow connections from Render.
4. Copy the connection string format:
   `mongodb+srv://<username>:<password>@cluster.mongodb.net/minitest?retryWrites=true&w=majority`

### Phase B: Backend Deployment on Render
1. Log in to [Render](https://render.com) and create a **New Web Service** pointing to your repository.
2. Configure settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. In the **Environment** tab, set:
   - `PORT`: `5000`
   - `MONGODB_URI`: `<Your MongoDB Atlas connection URI>`
   - `JWT_SECRET`: `<A random string of 32+ characters>`
   - `TEST_DURATION_SECONDS`: `600`
   - `CLIENT_URL`: `http://localhost:5173` (temporarily until Vercel URL is generated)
4. Deploy the service and note your live URL: `https://<service-name>.onrender.com`.

### Phase C: Frontend Deployment on Vercel
1. Log in to [Vercel](https://vercel.com) and import the repository.
2. Configure settings:
   - **Root Directory**: `client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `vite build`
   - **Output Directory**: `dist`
3. **Environment Variable (Set before deploying)**:
   - `VITE_API_URL`: `https://<service-name>.onrender.com` (Your live Render backend URL)
4. Deploy the project and note your production URL: `https://<project-name>.vercel.app`.

### Phase D: Finalize CORS on Render
1. In the Render Dashboard, update `CLIENT_URL` to your live Vercel URL:
   `CLIENT_URL = https://<project-name>.vercel.app`
2. Save changes to trigger an automatic reload.
3. Review [DEPLOY_CHECKLIST.md](file:///d:/mini-online-test/DEPLOY_CHECKLIST.md) for verification steps.
