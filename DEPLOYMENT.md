# 🚀 Deployment Guide: Scheme Guard

This document provides a step-by-step walkthrough to deploy the Scheme Guard platform using free-tier services.

## 🏗️ Architecture for Deployment
- **Database**: MongoDB Atlas (Free Shared Cluster).
- **Backend (Node.js)**: Render (Free Web Service).
- **ML Service (Python)**: Render (Free Web Service).
- **Frontend (React)**: Vercel (Fast & Free).

---

## Step 1: MongoDB Atlas Setup
1. Sign up for a free account at [mongodb.com](https://www.mongodb.com/cloud/atlas/register).
2. Create a **Shared Cluster** (M0 - Free).
3. In **Network Access**, add `0.0.0.0/0` (allows access from Render/Vercel).
4. In **Database Access**, create a user with `Read and Write to any database` permissions.
5. Get your **Connection String** (Drivers > Node.js). It should look like:
   `mongodb+srv://<username>:<password>@cluster.mongodb.net/scheme_guard?retryWrites=true&w=majority`

---

## Step 2: Deploy ML Service (Render)
1. Go to [Render](https://render.com/) and create a **New Web Service**.
2. Connect your GitHub repository.
3. Set the following:
   - **Name**: `schemeguard-ml`
   - **Root Directory**: `ml`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
4. **Environment Variables**:
   - `PORT`: `10000`
5. Note down the **ML Service URL** once deployed (e.g., `https://schemeguard-ml.onrender.com`).

---

## Step 3: Deploy Backend (Render)
1. Create another **New Web Service** on Render.
2. Connect the same GitHub repository.
3. Set the following:
   - **Name**: `schemeguard-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. **Environment Variables**:
   - `MONGODB_URI`: Your Atlas connection string.
   - `ML_SERVICE_URL`: Your ML Service URL (from Step 2).
   - `JWT_SECRET`: A long random string (e.g., `shhh_it_is_a_secret`).
   - `AADHAAR_KEY`: A 32-character string for encryption (e.g., `SchemeGuard2026__SecureKey123456`).
   - `FRONTEND_URL`: `*` (or your Vercel URL later).
5. Note down the **API URL** (e.g., `https://schemeguard-api.onrender.com`).

---

## Step 4: Deploy Frontend (Vercel)
1. Sign in to [Vercel](https://vercel.com/) and click **Add New > Project**.
2. Connect your GitHub repository.
3. Set the following:
   - **Framework Preset**: `Vite`.
   - **Root Directory**: `scheme-guard`.
4. **Environment Variables**:
   - `VITE_API_URL`: Your API URL (from Step 3, *without* the trailing slash).
5. Click **Deploy**.

---

## 🛠️ Summary of Environment Variables

| Service | Variable | Value |
| :--- | :--- | :--- |
| **Backend** | `MONGODB_URI` | `mongodb+srv://...` |
| **Backend** | `ML_SERVICE_URL` | `https://your-ml.onrender.com` |
| **Backend** | `JWT_SECRET` | `your_secret` |
| **Backend** | `AADHAAR_KEY` | `32_char_key` |
| **Frontend** | `VITE_API_URL` | `https://your-backend.onrender.com` |

---
**Note**: On Render's free tier, the services may go to sleep after 15 minutes of inactivity. The first request might take 30-60 seconds to "wake up" the servers.
