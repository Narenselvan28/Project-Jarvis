# ReFlow Deployment Guide: Vercel & Render

This guide outlines the production deployment procedure for the **ReFlow Adaptive Production Intelligence Platform**, splitting the application into a **Vercel** static frontend (React SPA) and a **Render** backend web service (Flask + Socket.IO + Gunicorn + MongoDB Atlas).

---

## 1. Architecture Overview

```
                          ┌────────────────────────┐
                          │   Vercel Edge Network  │
                          │   React SPA (Webpack)  │
                          │   reflow.vercel.app    │
                          └───────────┬────────────┘
                                      │
                   HTTPS API & WSS    │
                   (CORS / WebSocket) │
                                      ▼
                          ┌────────────────────────┐
                          │   Render Web Service   │
                          │  Gunicorn / Flask-WSGI │
                          │  reflow.onrender.com   │
                          └───────────┬────────────┘
                                      │
                                      │ PyMongo (+SRV)
                                      ▼
                          ┌────────────────────────┐
                          │     MongoDB Atlas      │
                          │   (M0 Free Cluster)    │
                          └────────────────────────┘
```

---

## 2. Prerequisites & Database Setup (MongoDB Atlas)

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create an **M0 Free Shared Cluster** (e.g. `reflow-cluster`).
3. Under **Security → Database Access**, create a user with `Read and write to any database` permissions (e.g., `reflow_admin`).
4. Under **Security → Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere, required for cloud web services like Render).
5. Under **Deployments → Database → Connect → Drivers (Python)**, copy your connection URI:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/reflow?retryWrites=true&w=majority&appName=ReFlow
   ```

---

## 3. Backend Deployment on Render

### Option A: Automated Blueprint Deployment (Recommended)
The repository includes a ready-to-use [`render.yaml`](file:///d:/Studies/Project - Jarvis/render.yaml) Blueprint.

1. Push your repository to **GitHub**.
2. Sign in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Select your GitHub repository.
5. Render detects `render.yaml` and populates the `reflow-backend` service.
6. When prompted for environment variables:
   - Provide `MONGODB_ATLAS_URI` with your connection string.
7. Click **Apply**. Render will automatically build the environment, train ML models, and launch Gunicorn.

---

### Option B: Manual Web Service Setup on Render

1. On the Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name**: `reflow-backend`
   - **Region**: Oregon (US West) or Frankfurt (EU Central)
   - **Branch**: `main`
   - **Root Directory**: (Leave blank / root)
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && python scripts/train_models.py
     ```
   - **Start Command**:
     ```bash
     gunicorn --worker-class gthread -w 1 --threads 8 -b 0.0.0.0:$PORT wsgi:app
     ```
   - **Health Check Path**: `/health`

4. Add the following **Environment Variables**:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | `3.11.9` | Python runtime version |
   | `DATABASE_MODE` | `atlas` | Direct connection to MongoDB Atlas |
   | `MONGODB_ATLAS_URI` | `mongodb+srv://...` | Your Atlas connection string |
   | `MONGODB_DB_NAME` | `reflow` | Target MongoDB database |
   | `SECRET_KEY` | *(Generate random string)* | Flask session secret |
   | `JWT_SECRET_KEY` | *(Generate random string)* | JWT authentication secret |
   | `AES_ENCRYPTION_KEY` | *(Generate 32-char string)* | Field encryption key |
   | `CORS_ORIGINS` | `*` *(or your Vercel URL)* | Allowed cross-origin sources |

5. Click **Create Web Service**. Wait for the build and ML training to finish.
6. Once deployed, test your backend URL (e.g., `https://reflow-backend.onrender.com/health`). You should receive `{"status": "healthy"}`.

---

## 4. Frontend Deployment on Vercel

### Step-by-Step Vercel Setup

1. Sign in to [Vercel Dashboard](https://vercel.com/).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository.
4. Under **Project Settings**:
   - **Framework Preset**: `Other`
   - **Root Directory**: Click "Edit" and select `frontend` (or leave as root; the repo contains root `vercel.json` and `frontend/vercel.json` to handle both).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Under **Environment Variables**, add:
   | Variable | Value |
   | :--- | :--- |
   | `REACT_APP_API_URL` | `https://reflow-backend.onrender.com` |
   | `REACT_APP_SOCKET_URL` | `https://reflow-backend.onrender.com` |
6. Click **Deploy**.
7. Vercel compiles the production bundle and assigns your live URL (e.g., `https://reflow-production.vercel.app`).

---

## 5. Post-Deployment Verification

1. **Verify Backend Health**:
   - Navigate to `https://<YOUR-RENDER-URL>/health`
   - Verify HTTP 200 with database status `connected`.
2. **Access Frontend**:
   - Navigate to your Vercel deployment URL.
3. **Login with Default Seed Accounts**:
   - **Plant Manager**: `manager` / `manager123`
   - **Shift Supervisor**: `supervisor` / `supervisor123`
   - **Operator**: `operator` / `operator123`
   - **System Administrator**: `admin` / `admin123`
4. **Test Real-Time Functionality**:
   - Open the **Gantt Schedule** view.
   - Click **Simulate Disruption** to trigger a breakdown.
   - Observe live notification banners and instant re-optimization suggestions delivered via WebSocket.

---

## 6. Maintenance & Operational Notes

- **Render Free Tier Cold Starts**: Render web services spin down after 15 minutes of inactivity on the free tier. The first request after a sleep period may take 30–50 seconds.
- **WebSocket Polling Fallback**: The frontend `SocketService` is configured with `["websocket", "polling"]` transports, guaranteeing reliable connections even if corporate proxies block native WebSocket upgrades.
- **SPA Routing**: Both `frontend/vercel.json` and root `vercel.json` configure catch-all rewrites (`/(.*) -> /index.html`), ensuring deep page refreshes (e.g. `/gantt`, `/admin`) resolve correctly without 404 errors.
