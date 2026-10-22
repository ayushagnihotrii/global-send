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
- **Zero-Dependency Username & Password Auth**:
  - No Google OAuth or third-party tracking required.
  - Passwords hashed using salted `bcryptjs` (12 rounds) with timing-safe validation.
  - One-time human-friendly account **Recovery Code** generated at registration for secure password resets.
  - Secure HTTP-only, SameSite=Lax session cookies with signed JWT tokens (`jose`).
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
| **Authentication** | Username/Password + Bcrypt + JOSE (JWT) + Secure Cookies |
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

Run the automated end-to-end acceptance test suite:
```bash
node test_api.mjs
```
The acceptance test verifies:
- Username registration and one-time recovery code generation.
- Session authorization and cookie persistence.
- Phone-to-computer text saving with multiline indentation preservation.
- Link saving with domain extraction.
- Date-grouped item retrieval.
- Substring body search and tag filtering.
- Toggle favourite.
- Cross-user data isolation (rejects unauthorized access with 404).
- Presigned upload and file confirmation.
- Storage quota calculation.
- Trash soft-delete and item restoration.

---

## 🚀 Production Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. In **Environment Variables**, configure:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string.
   - `AUTH_SECRET`: A secure 32+ character random secret (`openssl rand -base64 32`).
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
   - `NEXT_PUBLIC_APP_URL`: Your production domain (e.g. `https://vault.yourdomain.com`).
4. Click **Deploy**.

### Custom Domain Configuration
- In Vercel, go to **Settings → Domains**.
- Add your short domain (e.g., `qv.sh` or `vault.mydomain.com`).
- Add the CNAME or A record pointed to `cname.vercel-dns.com` in your DNS provider (e.g., Cloudflare DNS).
- Ensure SSL is set to **Full** in Cloudflare.

---

## 🔒 Security Summary

- **Server-Side Authorization**: Every database query and file access enforces `WHERE user_id = $userId`.
- **Enumeration Defenses**: Generic authentication error messages and fake password hashing on nonexistent accounts prevent timing-based user enumeration.
- **Private Object Storage**: Files are never stored in public buckets; authenticated short-lived presigned URLs are generated on demand.
- **CSRF & Cookie Hardening**: HTTP-only, SameSite=Lax, Secure session cookies prevent script injection and unauthorized cross-site requests.
- **No Plaintext Passwords**: Password hashing handled with salted Bcrypt (12 rounds).

---

## 📊 Feature Verification & Status Matrix

| Feature | Implementation Status | Test & Verification Method | External Credential Requirement |
|---|---|---|---|
| **Username & Password Auth** | ✅ Fully Implemented | Verified via `test_api.mjs` & browser auth forms (Registration, Login, Logout, Session check) | None (Local bcrypt & JWT) |
| **Recovery Code Generation** | ✅ Fully Implemented | Verified with custom `QV-XXXX-XXXX-XXXX` format and database hash matching | None |
| **Phone-to-Computer Text Sharing** | ✅ Fully Implemented | Verified with complex multiline programming questions & code snippets | None |
| **Clipboard Copy & Linebreak Preservation** | ✅ Fully Implemented | Verified via `navigator.clipboard.writeText` and floating iOS toasts | None |
| **Date-Wise Organization** | ✅ Fully Implemented | Verified grouping (*Today*, *Yesterday*, *Earlier This Week*, *Older*) and custom sorting | None |
| **Full Search & Tag Filtering** | ✅ Fully Implemented | Verified across item titles, question bodies, URLs, and tags with debounced input | None |
| **Trash, Restore & Empty Trash** | ✅ Fully Implemented | Verified soft-deletion, restore, and permanent deletion with storage cleanup | None |
| **Settings & Storage Meter** | ✅ Fully Implemented | Verified storage calculation, breakdown counts, appearance toggle, and JSON data export | None |
| **PostgreSQL Database** | ✅ Production Code Ready | Verified schema in `supabase/schema.sql` with dual adapter; tests run on embedded engine | `DATABASE_URL` (Supabase connection string) for cloud deployment |
| **Cloudflare R2 File Storage** | ✅ Production Code Ready | S3-compatible client with presigned PUT/GET URLs; verified end-to-end via local storage adapter | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` for live Cloudflare bucket |
| **Dark / Light Mode** | ✅ Fully Implemented | Verified with CSS custom properties and instant toggle | None |

