# Online Test Application (MERN)

A university online assessment platform built with MongoDB, Express, React and Node.js. Students sign up, take timed 10-question multiple-choice tests drawn from their class's question banks, review their results, and check their attempt history. Administrators manage users and roles, classes, question banks, questions, CSV imports and class results.

## Live Links
- **Application (Vercel):** https://mini-online-test.vercel.app
- **Backend API (Render):** https://mini-online-test.onrender.com
- **API health check:** https://mini-online-test.onrender.com/api/health (should show `{"ok":true}`)
- **Repository:** https://github.com/PSagarJ/mini-online-test

The backend runs on Render's free tier, so the first request after a quiet period can be slow.

---

## Table of Contents
1. [Features](#features)
2. [Overview & Architecture](#overview--architecture)
3. [The Six Auto-Submit Reasons](#the-six-auto-submit-reasons)
4. [Main Admin Account](#main-admin-account)
5. [Environment Variables](#environment-variables)
6. [Local Setup in Numbered Steps](#local-setup-in-numbered-steps)
7. [Classes, Banks, and CSV Import Format](#classes-banks-and-csv-import-format)
8. [API Overview](#api-overview)
9. [Automated Test Suite](#automated-test-suite)
10. [Design Decisions](#design-decisions)
11. [Technical Limitations & Tradeoffs](#technical-limitations--tradeoffs)
12. [Deployment Guide (MongoDB Atlas, Render, Vercel)](#deployment-guide-mongodb-atlas-render-vercel)

---

## Features
- **Accounts:** student signup and login with email and password. Passwords are hashed with bcrypt, and sessions use JSON Web Tokens.
- **Timed test:** 10 random multiple-choice questions from the student's class bank, with a 10-minute countdown that submits automatically at zero.
- **Results:** score, right and wrong answers, the correct answer for each question, and an explanation.
- **History:** every past attempt with its score, percentage and date.
- **Anti-cheat deterrence:** tab switches, window switches, reloads, closing the tab and back navigation are counted. Violations 1 to 5 show a warning, and the sixth submits the test automatically.
- **Admin panel (bonus):** user roles, classes, question banks, questions, CSV import with a template, and class results.

---

## Overview & Architecture
- **Server:** Node.js 20 or newer, Express, Mongoose (MongoDB), jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, dotenv, csv-parse.
- **Client:** React 18, Vite, React Router v6, Lucide React icons.
- **Styling:** plain CSS with design tokens defined as CSS custom properties. No Tailwind, MUI, Bootstrap or shadcn/ui.
- **Snapshots:** when a student starts a test, 10 questions are copied into the `Attempt` document. Later edits or deletions of questions never change past results.

---

## The Six Auto-Submit Reasons
Tests that a student submits manually are labelled **"Submitted by you"** in the history. When the system submits a test, it records one of these reasons:

1. **`time_up`**: the timer reached zero while the test was open.
2. **`tab_switch`**: the sixth tab switch.
3. **`window_switch`**: the sixth switch to another window or app.
4. **`reload_or_close`**: the sixth reload or close of the test tab.
5. **`navigation`**: the sixth back or forward navigation during the test.
6. **`deadline_passed`**: the deadline passed while the student was away, so the server scored the saved answers.

Reasons 2 to 5 share one counter with a limit of 6. Violations 1 to 5 show a warning, and the sixth submits the test. Repeated events within one second count only once.

### Result Page Messages
- `time_up`: "Time ran out. Your answers were submitted."
- `tab_switch`, `window_switch`, `reload_or_close`, `navigation`: "Submitted automatically after 6 violations. The last one was: [reason]."
- `deadline_passed`: "The time limit passed before you came back, so your saved answers were scored."
- Manual submissions show no banner.

---

## Main Admin Account
- **Email:** `adminemail123@gmail.com`
- **Password:** `adminpass369#$`
- The password is hard-coded in `server/src/config/mainAdmin.js` because this university assignment requires it. A production system would keep admin credentials in a secrets manager instead.
- The main admin always holds the `admin` role. The server enforces this by comparing the login email with `MAIN_ADMIN_EMAIL` in `mainAdmin.js`.
- The account is created or updated on every server start, so its password always matches `mainAdmin.js`.
- The main admin cannot be demoted or changed from the admin panel. The panel labels the account **"Main admin"** and disables its actions.
- No administrator can remove their own admin role.

### Demo Student Accounts
These are created by `seedDemoData.js` (Step 3b below). Each one has sample completed attempts, so the history page has data to show.

| Email | Password | Class |
| :--- | :--- | :--- |
| `student@university.edu` | `password123` | Class 8 (Jane Student) |
| `alex.smith@university.edu` | `password123` | Class 10 (Alex Smith) |

You can also register a new student account at `/signup`.

---

## Environment Variables

| Variable | Scope | Description | Default / Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Server | Port the Express server listens on | `5000` |
| `MONGODB_URI` | Server | MongoDB Atlas or local MongoDB connection string | `mongodb://localhost:27017/minitest` |
| `JWT_SECRET` | Server | Secret used to sign login tokens | A random string of 32+ characters |
| `CLIENT_URL` | Server | Allowed origin for cross-origin requests (CORS) | `http://localhost:5173` |
| `TEST_DURATION_SECONDS` | Server | Time allowed for each 10-question test | `600` (10 minutes) |
| `VITE_API_URL` | Client | Backend base URL used by the Vite frontend | `http://localhost:5000` |

---

## Local Setup in Numbered Steps

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/PSagarJ/mini-online-test.git
cd mini-online-test
npm install
npm --prefix server install
npm --prefix client install
```

### Step 2: Configure Environment Files
Create two files from the `.env.example` templates.

`server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/minitest?retryWrites=true&w=majority
JWT_SECRET=<a random string of 32+ characters>
CLIENT_URL=http://localhost:5173
TEST_DURATION_SECONDS=600
```

`client/.env`:
```env
VITE_API_URL=http://localhost:5000
```

Replace `<user>`, `<password>` and `<cluster>` with your MongoDB Atlas details. The `.gitignore` file already excludes `.env` files, so they are never committed.

### Step 3: Seed Classes and Question Banks
```bash
npm run seed
```
This creates Classes 1 to 12 and the main admin account if they are missing. It then creates four question banks: Class 8 · Mathematics, Class 8 · Science, Class 10 · Mathematics and Class 10 · English. Each bank has 12 questions, except Class 10 · English, which has 13. Running the command again does not add duplicate questions.

### Step 3b: Add the Demo Students (optional)
Run this after Step 3 to create the two demo students listed under [Demo Student Accounts](#demo-student-accounts):
```bash
cd server
node src/scripts/seedDemoData.js
cd ..
```
It is safe to run again. Existing students and sample attempts are skipped.

### Step 4: Run Application Concurrently
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- API health check: `http://localhost:5000/api/health`

---

## Classes, Banks, and CSV Import Format

### School Classes
- Classes 1 to 12 are created automatically when the server starts and no classes exist.
- Administrators can add or rename classes at `/admin/classes`.
- Students choose their class when they sign up. A student without a class can set one once. After that, only an administrator can change it.

### Question Banks
- Each bank belongs to one class and one subject, for example `Class 8 · Science`. A class can have only one bank per subject.
- Banks are archived rather than deleted, so past results keep their context.
- A bank needs at least 10 active questions before students can start a test.
- Each test picks 10 random active questions and copies them into the attempt.
- Administrators can edit questions at any time. They can also archive, restore or delete them. Past results are not affected.

### CSV Import Specification
Administrators can import up to 500 questions (1 MB maximum) into a bank from the bank detail page.

- **Header row (exact):**
  ```csv
  question,option_a,option_b,option_c,option_d,correct,explanation
  ```
- **Rules for each row:**
  - `question`: required.
  - `option_a` to `option_d`: four different, non-empty options.
  - `correct`: `A`, `B`, `C` or `D`, in any letter case.
  - `explanation`: optional. It is shown on the result page.
  - Commas inside a question or option must be inside double quotes, for example `"Paris, France"`.
- **All or nothing:** if any row is invalid, the whole import is rejected and the errors are listed by row number. Nothing is saved.
- **Template:** click **Download template** on the bank page to get a correctly formatted file.

---

## API Overview
All JSON endpoints live under `/api`. Protected routes require the header `Authorization: Bearer <token>`.

### Public & Auth
- `GET /api/health` -> `{"ok":true}`
- `GET /api/classes` -> `{ classes }` (public list for the signup dropdown)
- `POST /api/auth/signup` `{ name, email, password, classId? }` -> 201 `{ token, user }`
- `POST /api/auth/login` `{ email, password }` -> 200 `{ token, user }`
- `GET /api/auth/me` -> 200 `{ user }`
- `PATCH /api/auth/me/class` `{ classId }` -> 200 `{ user }` (sets the class only if none is set)

### Student Assessment
- `GET /api/banks` -> `{ banks }` (active banks for the student's class, with question counts and the best score so far)
- `POST /api/attempts` `{ bankId }` -> starts a 10-question test, or returns the active in-progress attempt
- `GET /api/attempts/active` -> the current in-progress attempt, or `{ attempt: null }`
- `PUT /api/attempts/:id/answers` `{ answers }` -> autosaves the student's selections
- `POST /api/attempts/:id/submit` `{ answers }` -> finalizes the test and computes the score
- `POST /api/attempts/:id/violations` `{ type }` -> records an anti-cheat violation (auto-submits on the sixth)
- `GET /api/attempts` -> the user's past attempts, newest first
- `GET /api/attempts/:id` -> detailed result for the attempt's owner

### Admin Management (`admin` role required)
- `GET /api/admin/users?search=&role=` -> user list with class names
- `PATCH /api/admin/users/:id` `{ role?, classId? }` -> updates role or class (the main admin and the admin's own role are protected)
- `GET /api/admin/classes` -> list classes
- `POST /api/admin/classes` `{ name }` -> create a class
- `PATCH /api/admin/classes/:id` `{ name }` -> rename a class
- `GET /api/admin/banks?classId=` -> list banks with active question counts
- `POST /api/admin/banks` `{ classId, subject }` -> create a bank
- `PATCH /api/admin/banks/:id` `{ subject?, archived? }` -> rename, archive or restore a bank
- `GET /api/admin/banks/:id/questions` -> list questions in a bank
- `POST /api/admin/banks/:id/questions` -> add a question
- `PUT /api/admin/questions/:id` -> update a question
- `PATCH /api/admin/questions/:id` `{ archived }` -> archive or restore a question
- `DELETE /api/admin/questions/:id` -> delete a question (204)
- `POST /api/admin/banks/:id/import` `{ csv }` -> validate and import a CSV batch
- `GET /api/admin/results?classId=&bankId=` -> class score report

---

## Automated Test Suite
Run the tests from the project root with Node's built-in test runner:
```bash
npm test
```
There are 16 tests in five files:

1. **Scoring (3 tests):** mixed correct, wrong and unanswered answers; 10 out of 10 gives 100%; no answers gives 0%.
2. **Deadline and grace period (3 tests):** attempts stay in progress during the exam and the grace period; after the deadline plus 15 seconds, an attempt is finalized with the `deadline_passed` reason; submission timing is correct for manual, `time_up` and `deadline_passed` submissions.
3. **Anti-cheat counter (4 tests):** warnings for violations 1 to 5; auto-submit on the sixth violation with the matching reason; repeated events within one second are ignored; violations after the test is finalized are ignored.
4. **CSV import (3 tests):** valid rows and quoted commas are parsed; one invalid row rejects the whole import; an incorrect correct-answer letter is rejected.
5. **Role security (3 tests):** the main admin cannot be demoted or changed; no administrator can remove their own admin role; administrators can promote students and demote other administrators, except the main admin.

---

## Design Decisions
- **Typography:** *Newsreader* (serif) for headings and score figures, and *Inter* (sans-serif) for interface text and forms.
- **Colors:** paper background `#F6F4EF`, white cards `#FFFFFF`, ink text `#1B1A17`, muted text `#6B675E`, evergreen accent `#1E5A47`, green for correct answers `#2D7A4F`, red for wrong answers `#B0432E`, and amber for warnings `#9A5A0E`.
- **Contrast:** the main text color pairs meet WCAG AA (4.5:1 for normal text). The lowest is muted text on the paper background, at 5.1:1.
- **Hairline borders:** 1px borders in `#E3DED3` separate panels and tables.
- **Admin tables:** dense layouts with inline filtering, so staff can work through many records quickly.

---

## Technical Limitations & Tradeoffs
1. **Deterrence, not proctoring:** browser events (`visibilitychange`, `blur`, `popstate`, `beforeunload`) detect tab switches, window switches and back navigation. They cannot stop a student from using a phone or another device.
2. **Tokens in localStorage:** login tokens are kept in `localStorage` so that a session survives page reloads. Production systems usually use HttpOnly, Secure cookies, which reduce exposure to cross-site scripting.
3. **Render free tier:** the backend sleeps after about 15 minutes without requests, so the first request can take a while.
4. **Hard-coded admin password:** done only to meet the assignment brief. A production system would load admin credentials from a secrets manager or single sign-on.

---

## Deployment Guide (MongoDB Atlas, Render, Vercel)

### Phase A: MongoDB Atlas Setup
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create an M0 free cluster.
2. Under **Database Access**, create a database user with read and write access to the `minitest` database.
3. Under **Network Access**, add `0.0.0.0/0` so that Render can connect.
4. Copy the connection string and replace the username and password:
   `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/minitest?retryWrites=true&w=majority`

### Phase B: Backend on Render
1. Log in to [Render](https://render.com) and create a **New Web Service** from this repository.
2. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Under **Environment**, set:
   - `PORT`: `5000`
   - `MONGODB_URI`: your Atlas connection string
   - `JWT_SECRET`: a random string of 32+ characters
   - `TEST_DURATION_SECONDS`: `600`
   - `CLIENT_URL`: `http://localhost:5173` for now. You will update it in Phase D.
4. Deploy the service, then open `https://<your-render-url>/api/health`. It should show `{"ok":true}`.

### Phase C: Frontend on Vercel
1. Log in to [Vercel](https://vercel.com) and import this repository.
2. Settings:
   - **Root Directory:** `client`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Under **Environment Variables**, set `VITE_API_URL` to your Render URL, for example `https://<your-render-url>`. Set it before the first deployment. Vite builds this value into the app, so if you change it later, you must redeploy.
4. Deploy, and note your production URL, for example `https://<your-project>.vercel.app`.

### Phase D: Update CORS on Render
1. In the Render dashboard, set `CLIENT_URL` to your Vercel URL, for example `https://<your-project>.vercel.app`.
2. Save. Render restarts the service with the new value.
3. Work through the full list in [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md).

### Verifying the Live App
- `/api/health` returns `{"ok":true}`.
- Log in as the main admin and open the admin panel.
- Log in as a demo student, start a test, then check the result and history pages.
