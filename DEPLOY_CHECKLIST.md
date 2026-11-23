# Deployment Checklist

This document details every account, secret, and manual step required to deploy the **Online Test Application** across **MongoDB Atlas**, **Render** (Backend), and **Vercel** (Frontend).

---

## 1. MongoDB Atlas (Database Setup)
- [ ] **Account Required**: Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
- [ ] **Deploy Free Cluster**: Create an M0 Free Tier cluster.
- [ ] **Database User**: Create a database user with read/write permissions on the target database (e.g. `minitest`).
- [ ] **Network Access**: Add `0.0.0.0/0` (Allow Access from Anywhere) to the IP Access List so Render can communicate with the cluster.
- [ ] **Connection URI**: Copy the connection string format:
  `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/minitest?retryWrites=true&w=majority`
  *(Store securely; never commit to public repositories).*

---

## 2. Render (Backend Web Service)
- [ ] **Account Required**: Sign in to [Render](https://render.com).
- [ ] **Create Web Service**: Click **New +** -> **Web Service** and connect this repository.
- [ ] **Configuration Settings**:
  - **Root Directory**: `server`
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
  - **Instance Type**: Free
- [ ] **Environment Variables**: Configure the following in the Render Dashboard (**Environment** tab):
  - `PORT`: `5000` (or Render standard default)
  - `MONGODB_URI`: `<Your MongoDB Atlas connection URI>`
  - `JWT_SECRET`: `<A cryptographically secure random string, 32+ characters>`
  - `TEST_DURATION_SECONDS`: `600` (10 minutes)
  - `CLIENT_URL`: `http://localhost:5173` (Temporarily set until Vercel URL is known).
- [ ] **Deploy Backend**: Click **Create Web Service** and wait for the service to report `MongoDB Connected` and start listening.
- [ ] **Copy Render URL**: Note your live backend URL (e.g., `https://mini-online-test-backend.onrender.com`).

---

## 3. Vercel (Frontend Single Page Application)
- [ ] **Account Required**: Sign in to [Vercel](https://vercel.com).
- [ ] **Import Git Repository**: Select your public GitHub repository.
- [ ] **Project Settings**:
  - **Root Directory**: `client`
  - **Framework Preset**: `Vite`
  - **Build Command**: `vite build` (or `npm run build`)
  - **Output Directory**: `dist`
- [ ] **Environment Variable (IMPORTANT - Before Build)**:
  - Add variable: `VITE_API_URL`
  - Value: `https://<your-render-service-name>.onrender.com` (Your live Render backend URL, without trailing slash)
- [ ] **Deploy Frontend**: Click **Deploy**.
- [ ] **Copy Vercel URL**: Note your public frontend URL (e.g., `https://mini-online-test.vercel.app`).

---

## 4. Final CORS Configuration on Render
- [ ] Return to **Render** -> Your Backend Web Service -> **Environment**.
- [ ] Update `CLIENT_URL` to your production Vercel frontend URL:
  `CLIENT_URL = https://<your-project>.vercel.app`
- [ ] Click **Save Changes** (Render will trigger a quick redeploy with updated CORS origins).

---

## 5. Verification on Production
- [ ] Open the live Vercel URL.
- [ ] Confirm the registration page loads and populates the class dropdown.
- [ ] Sign in with the Main Admin account:
  - **Email**: `adminemail123@gmail.com`
  - **Password**: *(The password configured in `server/src/config/mainAdmin.js`)*
- [ ] Verify that the Admin navigation appears and classes are listed.
- [ ] Run a test student session to verify test generation, timer, and score evaluation.
