# Global Send: Complete Deployment & Google Drive Integration Guide

This document details the complete production architecture, deployment procedure, Google Cloud OAuth configuration, and Android client setup for **Global Send** (`gsend.in`).

---

## 1. Architectural Overview

Global Send connects a web desktop application and a native Android mobile application to a unified backend:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Next.js Web Application     │       │    React Native Android App     │
│       (Browser on Desktop)      │       │     (Expo / Native Android)     │
│    Cookie-based JWT Session     │       │     Bearer JWT (SecureStore)    │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 └───────────────────┬─────────────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │   Global Send Backend (API)   │
                     │    Next.js Route Handlers     │
                     └───────────────┬───────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐
│       Supabase (PostgreSQL)         │     │     Google Drive (Owner 15 GB)      │
│  - User accounts & credentials      │     │  - Dedicated 'Global Send' folder   │
│  - Multiline questions & notes      │     │  - Photos, videos, and documents    │
│  - Saved links, titles, timestamps  │     │  - Range-streamed media playback    │
│  - Tags, favourites, and search     │     │  - Tokens kept strictly on server   │
│  - Server OAuth tokens (encrypted)  │     │  - drive.file narrowest scope       │
└─────────────────────────────────────┘     └─────────────────────────────────────┘
```

---

## 2. Google Drive Cloud Integration

### 2.1 Security & OAuth Principles
1. **Narrowest Scope (`drive.file`)**: The application only requests `https://www.googleapis.com/auth/drive.file`. This permits Global Send to access and manage only the files and folders created by Global Send itself. It **cannot** view, read, or modify the owner's private files, photos, or documents created outside the application.
2. **Server-Side Token Isolation**: All OAuth tokens, client secrets, and refresh tokens are stored in the server database (`app_settings` table). Neither browser clients nor the Android APK ever receive or inspect Google OAuth tokens.
3. **Decoupled User Authentication**: Regular Global Send users log in with their Global Send username and password. Ordinary use of the web or mobile app does **not** prompt for a Google sign-in.
4. **Dedicated Root Folder**: On first connection, the server automatically queries or creates a top-level folder named `'Global Send'` in the owner's Google Drive and stores its folder ID. All uploaded files are placed inside this folder.
5. **Private Streaming Downloads**: File downloads are routed through `/api/storage/file/[id]` with user authorization checks and HTTP 206 Partial Content range streaming.

### 2.2 Google Cloud Console Configuration
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., `Global Send Cloud`).
3. Navigate to **APIs & Services > Library**, search for **Google Drive API**, and click **Enable**.
4. Configure the **OAuth Consent Screen**:
   - **User Type**: External.
   - **App Name**: Global Send.
   - **User Support Email**: Your Google account email.
   - **Scopes**: Add `https://www.googleapis.com/auth/drive.file`.
5. **CRITICAL: Testing vs. Production Publishing Status**:
   > [!IMPORTANT]
   > When a Google Cloud OAuth consent screen is in **Testing** mode, refresh tokens expire automatically after **7 days** (resulting in `invalid_grant` errors).
   > For a durable, long-term deployment, navigate to **OAuth consent screen** and click **Publish App** to switch to "In Production". (Since you are only using the narrow `drive.file` scope for personal/owner use, Google verification is not required for up to 100 users).
6. Create **OAuth 2.0 Client ID**:
   - Navigate to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - **Application Type**: Web application.
   - **Name**: Global Send Web Server.
   - **Authorized Redirect URIs**:
     - Local Dev: `http://localhost:3000/api/admin/gdrive/callback` (or port `3005`)
     - Production: `https://gsend.in/api/admin/gdrive/callback`
7. Copy the generated **Client ID** and **Client Secret**.

---

## 3. Environment Configuration

### Production Variables (`.env.production` or Hosting Platform)

```bash
# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="Global Send"
NEXT_PUBLIC_APP_URL="https://gsend.in"

# Session Security
JWT_SECRET="<generate-a-random-64-character-hex-string>"

# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Storage Provider Selection
STORAGE_PROVIDER="google_drive"

# Google Drive Cloud Credentials
GDRIVE_CLIENT_ID="<your-google-client-id>.apps.googleusercontent.com"
GDRIVE_CLIENT_SECRET="<your-google-client-secret>"
GDRIVE_REDIRECT_URI="https://gsend.in/api/admin/gdrive/callback"

# Optional Alternative: Cloudflare R2
# STORAGE_PROVIDER="r2"
# R2_ACCOUNT_ID=""
# R2_ACCESS_KEY_ID=""
# R2_SECRET_ACCESS_KEY=""
# R2_BUCKET_NAME="globalsend"
```

---

## 4. Connecting the Owner's Google Account

1. Deploy the backend and database migrations:
   ```bash
   node scripts/migrate.mjs
   ```
2. Navigate to `https://gsend.in` in your browser.
3. Register or sign in to your owner Global Send account.
4. Go to **Settings > Cloud Storage Backend**.
5. Click **Connect Google Drive**.
6. Google's secure consent screen will appear asking to grant file access (`drive.file`).
7. Complete authorization; you will be redirected back to Global Send with the status:
   - Status: **Connected** (Green badge)
   - Account: your Google email
   - Folder: `Global Send` created in your Google Drive root.
8. Test an upload (photo, document, or video) to confirm that files appear in the `Global Send` folder in Drive.

---

## 5. Domain Configuration (`gsend.in`)

1. **DNS Records**:
   - Add an `A` record pointing `@` to your server or Vercel/Cloudflare ingress IP.
   - Add a `CNAME` record pointing `www` to `gsend.in` or your platform alias.
2. **SSL Certificate**:
   - Ensure HTTPS is enforced with HTTP Strict Transport Security (HSTS).
3. **CORS & Redirect URIs**:
   - Ensure the Google Cloud Console Authorized Redirect URI exactly matches `https://gsend.in/api/admin/gdrive/callback`.

---

## 6. Android Client Setup & Launch

1. Install dependencies in `apps/android`:
   ```bash
   cd apps/android
   npm install
   ```
2. Configuration:
   - For Android Emulator: Defaults to `http://10.0.2.2:3000`.
   - For Production: Enter `https://gsend.in` in the app's server configuration pill.
3. Start Expo:
   ```bash
   npm start
   ```
4. Build Release Standalone APK:
   ```bash
   npx eas build -p android --profile production
   ```
