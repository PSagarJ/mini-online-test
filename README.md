# Online Test Application (MERN)

A complete university online assessment platform featuring timed tests, question bank snapshots, automatic evaluation, anti-cheat tab-switch deterrence, and a full administrative dashboard.

## Overview
Built with a Node/Express/MongoDB backend and a React (Vite) frontend. The system allows students to take 10-question multiple-choice examinations generated from class-specific question banks, tracks compliance via window/tab focus monitoring, and provides teachers and administrators with real-time analytics and question management.

---

## The Six Auto-Submit Reasons
1. **Time ran out (time_up)**: the timer reached zero while the test was open.
2. **Tab switches (6) (tab_switch)**: the sixth tab switch.
3. **Window switches (6) (window_switch)**: the sixth window or app switch.
4. **Reloads or closing (6) (reload_or_close)**: the sixth reload or closing of the tab.
5. **Back navigation (6) (navigation)**: the sixth back or forward navigation during the test.
6. **Time passed while away (deadline_passed)**: the deadline passed while the student was away, so the server scored the saved answers.

*(Reasons 2 through 5 share a unified 6-violation threshold. Submissions completed normally by the student are labelled "Submitted by you".)*

---

## Main Admin Account
- **Email**: `adminemail123@gmail.com`
- **Password**: Hard-coded in `server/src/config/mainAdmin.js` for this assignment as required by specification. The server seeds/verifies this account automatically on every server boot.

---

## Local Setup

### 1. Prerequisites
- Node.js 20+
- npm 9+
- MongoDB instance (Local or Atlas URI)

### 2. Installation
Install dependencies across the monorepo:
```bash
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 3. Environment Configuration
Copy `.env.example` files to `.env`:
- `server/.env`:
  ```env
  PORT=5000
  MONGODB_URI=your_mongodb_connection_string
  JWT_SECRET=your_secret_key
  CLIENT_URL=http://localhost:5173
  TEST_DURATION_SECONDS=600
  ```
- `client/.env`:
  ```env
  VITE_API_URL=http://localhost:5000
  ```

### 4. Database Seed
Seed initial classes and question banks:
```bash
npm run seed
```

### 5. Running the Application
Run both backend and frontend concurrently:
```bash
npm run dev
```
Client: `http://localhost:5173`
Server: `http://localhost:5000`

---

## Running Automated Tests
```bash
npm test
```
Tests cover:
- Test scoring logic.
- Expiration & grace periods (`time_up` vs `deadline_passed`).
- Anti-cheat violation counter (warnings 1-5, auto-finalize on 6, 1-second debounce, post-finalization idempotence).
- Question CSV parsing (valid rows, quoted fields with commas, full transactional rollback on bad rows).
- Security & role immutability rules (main admin cannot be demoted, self-demotion blocked).

---

## Architecture & Design Decisions
- **Typography & Aesthetics**: Newsreader serif display font for page titles, wordmark, and score numerals; Inter for crisp, accessible UI controls; tabular numerals for timers and metrics.
- **Design Tokens**: Warm paper background (`#F6F4EF`), crisp card surfaces (`#FFFFFF`), charcoal ink (`#1B1A17`), and deep evergreen accent (`#1E5A47`). High contrast compliance (WCAG AA 4.5:1).
- **Snapshot Architecture**: When an exam starts, an immutable snapshot of 10 questions is cloned into the `Attempt` document. Subsequent edits or deletions of questions never alter historical exam data or results.
- **Deterrence vs Proctoring**: Browser APIs (`visibilitychange`, `blur`, `beforeunload`, `popstate`) act as a deterrence mechanism. Real proctoring requires locked-down OS agents.

---

## Deployment Configuration
- Backend on **Render** using `render.yaml`
- Frontend on **Vercel** with SPA fallback in `vercel.json`
See [DEPLOY_CHECKLIST.md](file:///d:/mini-online-test/DEPLOY_CHECKLIST.md) for step-by-step deployment instructions.
