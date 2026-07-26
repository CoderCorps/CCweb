# Vercel Dual Deployment Guide: Separate Backend & Frontend Setup

This repository is configured for separate, independent Vercel deployments for the **FastAPI Backend** and **Next.js Frontend**.

---

## 1. Deploying Backend to Vercel (`backend/`)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... > Project**.
2. Select your GitHub repository `CoderCorps/CCweb`.
3. In the project setup form:
   - **Project Name**: `codercorps-backend` (or your preferred name)
   - **Root Directory**: Click *Edit* and select **`backend`**.
   - **Framework Preset**: Select **`Other`**.
   - **Build & Output Settings**: Leave as default.
4. **Environment Variables**: Add the following in Vercel project settings:
   - `FRONTEND_URL` = `https://your-frontend-domain.vercel.app` (or your frontend Vercel URL)
   - `SMTP_HOST` = `smtp.gmail.com`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = `codercorps@gmail.com`
   - `SMTP_PASSWORD` = `rnsjhylaigcnatef`
   - `SECRET_KEY` = `your-secure-jwt-secret`
5. Click **Deploy**. Vercel will build the Python FastAPI app via `backend/vercel.json` (`@vercel/python`).
6. Copy your deployed Backend URL (e.g. `https://codercorps-backend.vercel.app`).

---

## 2. Deploying Frontend to Vercel (`frontend/`)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... > Project**.
2. Select your GitHub repository `CoderCorps/CCweb` again.
3. In the project setup form:
   - **Project Name**: `codercorps-frontend` (or your preferred name)
   - **Root Directory**: Click *Edit* and select **`frontend`**.
   - **Framework Preset**: Select **`Next.js`**.
4. **Environment Variables**: Add the following:
   - `NEXT_PUBLIC_API_URL` = `https://codercorps-backend.vercel.app/api/v1` (replace with your backend Vercel URL)
5. Click **Deploy**. Vercel will build and host your Next.js frontend via `frontend/vercel.json`.

---

## Configuration Files Added:
- `backend/vercel.json` — Python serverless routing for FastAPI (`@vercel/python`).
- `frontend/vercel.json` — Next.js configuration settings.
