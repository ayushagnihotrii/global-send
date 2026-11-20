# Global Send Architecture Specification (v2 Storage & Vault)

## 1. Overview & Vision
Global Send (`gsend.in`) is an end-to-end encrypted file sharing and permanent private storage locker.
It combines:
1. **Send Mode (Zero-Account):** Frictionless transfer of massive files (up to 10 GB+) with client-side encryption and key in `#fragment`.
2. **Vault Mode (Account-Backed):** Long-term private cloud locker with folders, media player, trash with 30-day restore, and configurable or permanent retention (`expires_at = null`).

---

## 2. Design System & Aesthetics
Global Send adheres to Apple-inspired minimalist design principles:
- **Typography:** SF Pro Display / SF Pro Text (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto`) with SF Mono for code/technical identifiers.
- **Color Tokens:**
  - Accent: `#0071e3` (System Apple Blue)
  - Dark Surface: `#0a0a0c`, `#141416`, `#1c1c1e`
  - Border System: `rgba(255, 255, 255, 0.08)` to `0.12`
  - Subtle micro-interactions, 8pt spatial grid, rounded 16px/24px cards.
- **Design Rule:** The current visual styling of the site is strictly preserved as the master template. New capabilities (Send/Vault switch, folders, storage meters, streaming players) integrate seamlessly into the existing layout without disrupting the clean UI.

---

## 3. Storage Architecture: Telegram MTProto Multi-Part Router
To allow free, high-capacity, zero-egress storage for massive files without high cloud bills, Global Send uses a **Telegram MTProto Multi-Part Router** as a primary storage driver:
- **Direct MTProto Protocol:** Connects to Telegram's binary network layer over TCP/WebSocket using GramJS (`telegram`), bypassing standard 50 MB HTTP Bot limits.
- **Chunk Slicing (1.9 GB Threshold):** Files exceeding MTProto's 2,000,000,000-byte cap are sliced into 1.9 GB parts.
- **Stateless Manifest Keys:** Storage keys self-contain all channel, part message IDs, and byte spans:
  ```text
  telegram://manifest?channel=-100xxx&parts=101:1992294400,102:150000000&total=2142294400&name=video.mp4&mime=video%2Fmp4
  ```
- **Virtual Concatenated Streaming:** When downloading, parts stream sequentially via Node.js `Readable` generator streams with backpressure. The browser receives a single contiguous file.
- **Dynamic HTTP Range Scrubbing:** When seeking in a 4K video, the engine calculates the intersecting part and requests only the exact byte offset from Telegram.
- **Atomic Deletion:** During TTL auto-disintegration or manual purge, all part messages are deleted from the Telegram channel in a single call.

---

## 4. Bypassing Vercel Serverless Limits
Vercel serverless functions enforce a **4.5 MB request body limit** and a **60s timeout**. To prevent `FUNCTION_PAYLOAD_TOO_LARGE` errors:
1. **Next.js on Vercel** serves UI, authentication, database transactions, access control, and generates signed upload session tokens.
2. File chunks (16 MB – 32 MB) are encrypted directly in the client's browser using a Web Worker.
3. Chunks stream directly to storage or via a lightweight streaming worker sidecar (`stream.gsend.in`), bypassing Vercel execution limits entirely.
4. During local development, the Next.js API handles direct chunk streams seamlessly.

---

## 5. Client-Side Cryptography (Zero-Knowledge E2EE)
- **Algorithm:** AES-256-GCM authenticated encryption using WebCrypto API.
- **Key Generation:** A unique 256-bit symmetric key is generated per file (`crypto.subtle.generateKey`).
- **Send Mode:** The decryption key is encoded into the URL hash fragment:
  ```text
  https://gsend.in/s/[shareId]#key=[base64urlKey]
  ```
  The hash fragment is never sent to the server in HTTP request headers.
- **Vault Mode:** The per-file key is encrypted (wrapped) using the user's master vault key derived from their private login key via Argon2id / PBKDF2.

---

## 6. Database Schema Evolution
The database maintains full backward compatibility while introducing:
- `quotas`: User storage usage, tier tracking, and file size ceilings.
- `spaces`: Organization spaces (Personal Vault, Project Spaces).
- `files`: Unified file model with folder hierarchies, client encryption flags, and nullable `expires_at` (null = permanent).
- `file_chunks`: Multi-part resumable upload session tracking.
- `shares`: Public Send links with password protection, download limits, and expiry dates.
- `access_logs`: Sender audit trail for link downloads.
- `reports`: Trust & Safety abuse reporting mechanism.

---

## 7. Delivery Roadmap & Implementation Status
- **Phase 1 [COMPLETED]:**
  - StorageProvider abstraction (`StorageProvider` interface).
  - Telegram MTProto multi-part router (`telegram-provider.ts`) with 1.9 GB chunking, virtual concatenation, and dynamic HTTP Range seeking.
  - Client-side zero-knowledge AES-256-GCM chunk encryption (`client-encryption.ts`).
  - Resumable chunk uploader with exponential backoff (`chunk-uploader.ts`).
  - File System Access API direct-to-disk streaming downloader (`stream-downloader.ts`).
  - 10 GB file and 15 GB user quota limits configured.
  - Phase 1 network drop recovery & SHA-256 verification tests (`test_phase1_resumable.mjs`).

- **Phase 2 [COMPLETED]:**
  - Vault Folders: Hierarchical folder creation (`parent_folder_id`), nested subfolder navigation, and interactive breadcrumbs.
  - Item Folder Movement: Moving items and subfolders across directories or back to Root Vault with circular reference protection (`/api/items/[id]/move`).
  - Permanent Vault Retention: Support for non-expiring vault archives (`is_permanent = true`, `expires_at = null`, `expiration_duration_sec = 0`).
  - 30-Day Trash Lifecycle: Soft delete with automatic 30-day purge threshold (`purge_at = now + 30 days`), folder cascade deletion/restoration, and background auto-purge during `runExpirationCleanup`.
  - Storage Quota & Meter: Dynamic storage usage accounting (`/api/user/storage`), sleek Apple-style progress bar in `DesktopSidebar`, and quota checking on upload.
  - Verification Suite: 14 new automated tests covering all folder, trash, permanent retention, and quota requirements (`test_phase2_folders_trash.mjs`).

- **Phase 3 [COMPLETED]:**
  - Send Link Controls: Granular expiration presets (1h, 24h, 7d, 30d), password protection using salted PBKDF2 (10,000 rounds), and download limit controls (Unlimited, 1-read burn-after-reading, 5, 10).
  - Public Share Endpoints:
    - `POST /api/shares`: Create secure share link with custom expiration, password, and download limit.
    - `GET /api/shares`: List active user shares.
    - `GET /api/shares/[id]`: Retrieve public link metadata without exposing password hashes.
    - `DELETE /api/shares/[id]`: Sender-authorized instantaneous revocation.
    - `POST /api/shares/[id]/access`: Password challenge verification before granting download authorization.
    - `GET /api/shares/[id]/download`: Chunked HTTP streaming download with range seeking, download counter decrementing, and automatic limit enforcement.
    - `GET /api/shares/[id]/logs`: Access logs endpoint for sender audit trail.
  - Access Logging & IP Masking: Automatic recording of downloads with privacy-preserving IP masking (`192.168.1.xxx` / `masked-ip`) and user agent strings.
  - Share Modal Component (`ShareModal.tsx`): Neo-Editorial modal with link generator, copy link feedback, dynamic high-res SVG QR code generator, live usage counters, collapsible access logs, and revocation controls.
  - Public Receiver Page (`src/app/s/[id]/page.tsx`): Zero-account recipient experience with URL hash key extraction (`#key=...`), password gate, real-time download streaming with speed indicator, and client-side WebCrypto AES-GCM decryption.
  - Verification Suite: 8 automated tests verifying open links, password protection, burn-after-reading limits, revocation, expiration, and privacy-preserving access logs (`test_phase3_shares_access.mjs`).

- **Phase 4 [COMPLETED]:**
  - Abuse Reporting & Trust/Safety Pipeline:
    - Database migration `007_trust_safety_reports.sql` (`reports` table) with target classification (share, file, user) and reason taxonomies (copyright/DMCA, malware, illegal, harassment).
    - `POST /api/reports`: Public rate-limited report submission endpoint with automated URL parsing and IP masking.
    - `GET /api/reports`: Admin report management endpoint with status filtering (`pending`, `reviewed`, `resolved`, `dismissed`).
    - Dedicated `/report` page (`src/app/report/page.tsx`) with zero-tolerance policy declaration, clean submission form, and reference tracking.
  - Rate Limiting Engine (`rate-limit.ts`):
    - Sliding-window in-memory rate limiter with periodic unref timers and standard headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).
  - Production Health Status Endpoint (`GET /api/health`):
    - Real database latency ping (`SELECT 1`), storage provider driver detection, server uptime metrics, and environment reporting.
  - Legal & Governance Pages:
    - Terms of Service (`/terms`): Acceptable Use Policy, key custody disclaimer, DMCA procedures, and liability disclaimers in Apple Notes theme.
    - Privacy Policy (`/privacy`): Zero-knowledge cryptographic guarantees, explanation of URL `#fragment` key mechanics, masked IP auditing, and automatic data purging.
  - Honest Landing Page Copy & Positioning:
    - Updated `src/app/page.tsx` and `src/components/site-footer.tsx` to honestly position Global Send: "Send any size file privately, and keep it as long as you need."
    - Removed false claims ("no accounts ever", "P2P direct", "no third party clouds"); clearly articulated the architecture as end-to-end encrypted cloud transfer with zero-account guest send and encrypted permanent vault.
    - Updated stats bento: 10 GB+ multi-gigabyte streaming, 256-bit client-side cipher, and zero-knowledge fragment keys.
  - Verification Suite: 5 automated tests verifying report creation, privacy masking, lifecycle status updates, and sliding-window rate limiting (`test_phase4_trust_safety.mjs`).

- **Phase 5 [NEXT]:** In-browser media previews/streaming, client-side thumbnail generation (keeping E2EE), and PWA share-target integration.
