# QuickVault

> **Your stuff. Everywhere.**  
> A private, personal cloud locker and clipboard for saving exam questions, code snippets, notes, photos, videos, links, and documents seamlessly across your devices.

Inspired by **Apple Notes**, **Apple Settings**, and modern iOS design principles: minimal, fluid, elegant, responsive, and intuitive.

---

## 🚀 Key Features

- **Instant Phone-to-Computer Workflow**:
  - Save a question or code snippet on your mobile phone in seconds.
  - Open QuickVault on any computer browser, find your saved item, and click **Copy** to place it directly on your clipboard with preserved formatting and line breaks.
- **Apple Notes-Inspired Aesthetics**:
  - Distraction-free typography, restrained 8pt spacing grid, smooth rounded cards, and subtle borders.
  - Dedicated comfortable reading view with a **Monospace toggle** for code snippets and programming problems.
  - Floating iOS pill toasts for real-time feedback (*"Copied to clipboard"*, *"Saved to QuickVault"*).
- **Zero-Dependency Username + Key Auth**:
  - Requires both **Username** and **Key** to log in (key-alone login disabled).
  - Multiple users can register with the exact same key without conflicts (global key uniqueness constraint removed).
  - Keys hashed using salted **Argon2id** with timing-safe dummy verification for unknown users to eliminate timing-based user enumeration.
  - Generic error message (`Invalid username or key.`) for both nonexistent usernames and wrong keys.
  - Secure HTTP-only, SameSite=Lax session cookies with signed JWT tokens (`jose`) and Bearer token support.
- **Security-Question Key Recovery**:
  - Set a security question (curated presets or custom question) and answer during registration or in Settings.
  - Answers are normalized (Unicode NFKC, lowercased, trimmed, whitespace collapsed) and stored strictly as salted **Argon2id** hashes (never plaintext).
  - Anti-enumeration protection: querying unknown usernames returns deterministic fake questions derived via HMAC-SHA-256 with constant-time dummy verification on reset.
  - Persistent abuse protection: 5 wrong recovery attempts trigger a 30-minute lockout (exponentially doubling up to 24 hours), tracked persistently across serverless lambdas.
  - Safe key reset: revokes all active sessions by incrementing `session_version`, resets lockout counters, and displays a security notice on next login.
  - Existing user migration: mandatory, blocking setup prompt upon login for accounts lacking a security question.
- **Date-Wise Organization & Timeline**:
  - Content automatically categorized into clear chronological groups:
    - *Today · [Date]*
    - *Yesterday · [Date]*
    - *Earlier This Week*
    - *Earlier This Month*
    - *Older*
- **Real Full-Text & Tag Search**:
  - Search across item titles, note text, programming questions, links, tags, and original filenames.
  - Debounced input with keyboard shortcut (`⌘K` / `Ctrl+K`).
- **Cloudflare R2 Object Storage**:
  - S3-compatible cloud file storage for photos, videos, PDFs, and documents.
  - Direct client-to-R2 presigned upload URLs (PUT) with server-side size and MIME verification.
  - Short-lived expiring download and streaming URLs (GET) ensuring files remain private.
  - Zero-config local storage fallback for immediate offline testing.
- **Trash & Soft Deletion**:
  - Safe soft-delete to Trash with instant restore or permanent deletion and cloud object cleanup.
- **Settings & Data Sovereignty**:
  - Live storage meter with visual quota progress and item-type breakdown.
  - One-click JSON data export.
  - Dark mode and light mode switcher.
  - Account and vault deletion with password confirmation.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) + TypeScript + React 19 |
| **Styling** | Tailwind CSS v4 + Vanilla CSS Design Tokens |
| **Icons** | Lucide React |
| **Validation** | Zod v3 |
| **Authentication** | Username + Key + Argon2id + JOSE (JWT) + Secure Cookies |
| **Database** | Supabase PostgreSQL (`pg`) with automatic embedded SQLite (`@libsql/client`) fallback |
| **Object Storage** | Cloudflare R2 (`@aws-sdk/client-s3`) with local storage fallback |

---

## 📦 Getting Started Locally

### 1. Prerequisites
- **Node.js** >= 18.x
- **npm** >= 9.x

### 2. Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd quickvault
npm install
```

### 3. Environment Setup
QuickVault is designed to work **out of the box** for local testing without requiring external credentials:
```bash
cp .env.example .env.local
```
If `DATABASE_URL` is omitted, QuickVault automatically initializes an embedded SQLite database in `.data/quickvault.db` and routes file uploads to local storage `.data/uploads/`.

### 4. Run Development Server
```bash
npm run dev -- --port 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄️ Supabase PostgreSQL Setup

To connect QuickVault to a production Supabase PostgreSQL database:

1. Create a new project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
4. Retrieve your database connection string under **Project Settings → Database → Connection String (URI)**.
5. Add it to your `.env.local` or hosting environment variables:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   DATABASE_SSL=true
   ```

---

## ☁️ Cloudflare R2 File Storage Setup

To configure Cloudflare R2 for file, photo, and video uploads:

1. Sign in to your [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **R2**.
2. Click **Create bucket** and name it `quickvault`.
3. In **Settings → Bucket Details**, ensure the bucket remains **Private** (no public access).
4. Configure **CORS Policy** under bucket settings:
   ```json
   [
     {
       "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
5. Navigate to **R2 → Manage R2 API Tokens** and click **Create API token** with **Object Read & Write** permissions.
6. Copy the credentials to your environment:
   ```env
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key_id
   R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
   R2_BUCKET_NAME=quickvault
   ```

---

## 🧪 Testing

Run the automated test suite across configuration and system tests:
```bash
npm test
```
The test suite (`test_config.mjs` and `test_globalsend.mjs`) verifies:
- Username + Key authentication (key-only rejected, identical 401 error message for wrong username and wrong key).
- Two distinct users registering and authenticating with the exact same key without conflict.
- Security question validation (curated presets and custom questions) and normalized answer hashing (Unicode NFKC, lowercase, trimmed, whitespace collapsed).
- Constant-time dummy verification on nonexistent usernames.
- Anti-enumeration defense via HMAC-SHA-256 fake questions for unknown accounts.
- Two-step recovery flow (`/api/auth/recovery/question` and `/api/auth/recovery/reset`), updating the key and invalidating previous sessions.
- Persistent abuse protection: lockout after 5 failed recovery attempts, enforced across multiple sessions and IPs.
- Deprecated `/api/auth/recover` endpoint returning HTTP 410 Gone.
- Existing user migration path with mandatory security question setup before vault access.
- Cross-user data isolation, file upload / expiry mechanics, item clipboard preservation, and chat persistence.

---

## 🚀 Production Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. In **Environment Variables**, configure:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string.
   - `JWT_SECRET`: A secure 32+ character random secret (`openssl rand -base64 32`).
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (or Google Drive credentials).
   - `NEXT_PUBLIC_APP_URL`: Your production domain (e.g. `https://gsend.in`).
4. Apply database migration `supabase/migrations/004_security_questions_and_username_auth.sql` to your Supabase PostgreSQL instance.
5. Click **Deploy**.

### Custom Domain Configuration
- In Vercel, go to **Settings → Domains**.
- Add your domain (e.g., `gsend.in` or `vault.mydomain.com`).
- Add the CNAME or A record pointed to `cname.vercel-dns.com` in your DNS provider (e.g., Cloudflare DNS).
- Ensure SSL is set to **Full** in Cloudflare.

---

## 🔒 Security Summary

- **Server-Side Authorization**: Every database query and file access enforces user ownership checks.
- **Timing-Safe Enumeration Defenses**: Generic authentication error messages (`Invalid username or key.`) and constant-time dummy Argon2id verifications on nonexistent accounts eliminate timing-based username enumeration.
- **HMAC Fake Questions**: Recovery question requests for unknown accounts return deterministic fake questions derived from HMAC-SHA-256 of the username and server secret, maintaining identical response shapes and HTTP 200 status.
- **Persistent Rate Limiting & Account Lockout**: Recovery endpoints are protected by persistent database rate limiting (`rate_limits` table), locking out accounts after 5 consecutive failed attempts for 30 minutes (doubling up to 24 hours), surviving serverless container restarts.
- **Session Revocation**: Key resets immediately increment `session_version`, invalidating all existing JWT sessions, tokens, and active cookies.
- **Zero Plaintext Credentials**: Keys and security answers are strictly stored as salted Argon2id hashes and never exposed in logs, API responses, or error traces.
- **CSRF & Cookie Hardening**: HTTP-only, SameSite=Lax, Secure session cookies prevent script injection and unauthorized cross-site requests.

---

## 📊 Feature Verification & Status Matrix

| Feature | Implementation Status | Test & Verification Method | External Credential Requirement |
|---|---|---|---|
| **Username + Key Auth** | ✅ Fully Implemented | Verified via `test_globalsend.mjs` (Suite 1: registration, login, identical 401s, duplicate keys) | None (Local Argon2id & JWT) |
| **Security Question Recovery** | ✅ Fully Implemented | Verified via `test_globalsend.mjs` (2-step recovery, 5-strike persistent lockout, fake HMAC questions) | None |
| **Existing User Migration** | ✅ Fully Implemented | Verified via `test_globalsend.mjs` & `SecurityQuestionSetupModal` blocking vault access | None |
| **Phone-to-Computer Text Sharing** | ✅ Fully Implemented | Verified with complex multiline programming questions & code snippets | None |
| **Clipboard Copy & Linebreak Preservation** | ✅ Fully Implemented | Verified via `navigator.clipboard.writeText` and floating iOS toasts | None |
| **Date-Wise Organization** | ✅ Fully Implemented | Verified grouping (*Today*, *Yesterday*, *Earlier This Week*, *Older*) and custom sorting | None |
| **Full Search & Tag Filtering** | ✅ Fully Implemented | Verified across item titles, question bodies, URLs, and tags with debounced input | None |
| **Trash, Restore & Empty Trash** | ✅ Fully Implemented | Verified soft-deletion, restore, and permanent deletion with storage cleanup | None |
| **Settings & Storage Meter** | ✅ Fully Implemented | Verified storage calculation, breakdown counts, appearance toggle, and key / recovery question updates | None |
| **PostgreSQL Database** | ✅ Production Code Ready | Verified schema in `supabase/schema.sql` & migrations 001-004; tests run on embedded engine | `DATABASE_URL` (Supabase connection string) for cloud deployment |
| **Cloud Storage (R2 / Google Drive)** | ✅ Production Code Ready | S3-compatible client / Google Drive OAuth adapter; verified end-to-end via local storage adapter | Cloud credentials for live buckets/drive |
| **Dark / Light Mode** | ✅ Fully Implemented | Verified with CSS custom properties and instant toggle | None |

