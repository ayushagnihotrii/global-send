# QuickVault: Defects, Technical Debt & Action Items Register

This document provides a prioritized inventory of confirmed defects, architectural risks, technical debt, and missing features discovered and addressed during the codebase audit and development phases.

---

## 1. Issue Classification & Priority Scale

- **P0 (Critical)**: Vulnerability, data corruption, silent fallback, or application-wide blocker.
- **P1 (High)**: Core user journey impaired or external cloud integration blocked.
- **P2 (Medium)**: Important functional feature missing or performance limitation.
- **P3 (Low)**: Quality-of-life enhancement or cosmetic improvement.

---

## 2. Issues Register

| ID | Issue Title | Category | Priority | Complexity | Affected Files | Status |
|---|---|---|---|---|---|---|
| **ISSUE-00** | Silent Local Storage Fallback in Production Mode | Reliability / Data Integrity | **P0** | Small | `src/lib/env-config.ts`, `src/lib/db.ts`, `src/lib/r2.ts` | **RESOLVED & VERIFIED** |
| **ISSUE-01** | Live Cloudflare R2 Cloud Integration Unverified | Integration / Cloud | **P1** | Small | `src/lib/r2.ts`, `.env.example` | Blocked (Needs Live Keys) |
| **ISSUE-02** | Live Supabase PostgreSQL Connection Unverified | Integration / DB | **P1** | Small | `src/lib/db.ts`, `supabase/migrations/` | Blocked (Needs Live URL) |
| **ISSUE-02B** | Database Migration Workflow | Database DevOps | **P1** | Small | `scripts/migrate.mjs`, `supabase/migrations/` | **RESOLVED & VERIFIED** |
| **ISSUE-03** | Missing PWA Web Manifest & App Icons | Mobile UX | **P2** | Small | `public/manifest.json`, `layout.tsx` | Next Milestone |
| **ISSUE-04** | Port 3000 Collision on Local Machine | Dev Environment | **P2** | Small | `package.json` | Mitigated (Port 3005) |
| **ISSUE-05** | In-Memory Rate Limiting Not Clustered | Security / Scalability | **P2** | Medium | `src/lib/auth.ts` | Technical Debt |
| **ISSUE-06** | Vault Export Omits Binary Files | Feature / Export | **P2** | Medium | `src/app/api/user/export/route.ts` | Incomplete |
| **ISSUE-07** | Regenerate Recovery Code in Settings View | Security / Account | **P3** | Small | `src/components/settings/SettingsView.tsx` | Enhancement |
| **ISSUE-08** | OCR for Image Screenshots Not Implemented | Feature / Search | **P3** | Large | N/A | Future Phase |

---

## 3. Detailed Issue Descriptions & Remediation

### ISSUE-00: Silent Local Storage Fallback in Production Mode (RESOLVED)
- **Category:** Reliability / Data Integrity
- **Priority:** `P0` | **Status:** **RESOLVED**
- **Resolution Details:**
  1. Authored `src/lib/env-config.ts` implementing `validateStorageConfig` and `ConfigurationError`.
  2. In `NODE_ENV === 'production'`, missing or invalid `DATABASE_URL` immediately throws an actionable `ConfigurationError` and halts server startup or route execution.
  3. In `NODE_ENV === 'production'`, missing `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, or `R2_SECRET_ACCESS_KEY` immediately throws an actionable `ConfigurationError` detailing precisely which keys are missing without leaking secrets.
  4. Local storage routes (`/api/storage/local-upload` and `/api/storage/local-file/[...key]`) strictly reject requests in production with HTTP 403 Forbidden.
  5. Implemented `deleteStorageFile()` in `src/lib/r2.ts` ensuring database and storage deletion remain synchronized across both local disk and R2.
  6. Added 28 automated test assertions in `test_config.mjs` verifying that development defaults correctly to SQLite/local disk, while production fails fast and cleanly under all incomplete/invalid configurations.

---

### ISSUE-01: Live Cloudflare R2 Bucket Integration Unverified
- **Category:** Integration / Cloud
- **Priority:** `P1` | **Status:** Blocked (Needs Live Keys)
- **Evidence:** `src/lib/r2.ts` contains the complete AWS S3 SDK integration, verified via local disk adapter and automated configuration tests. Real S3 HTTPS traffic is unverified due to lack of live credentials in `.env.local`.
- **Blocker:** Requires user-supplied Cloudflare R2 account ID, access key ID, secret key, and bucket name.
- **Remediation:** Create bucket in Cloudflare dashboard, apply CORS policy, and inject credentials.

---

### ISSUE-02: Live Supabase PostgreSQL Connection Unverified
- **Category:** Integration / Database
- **Priority:** `P1` | **Status:** Blocked (Needs Live URL)
- **Evidence:** Connection pool caching with `globalThis` and health check queries (`checkDatabaseHealth`) are implemented. Local verification operates cleanly via embedded SQLite. Real network connection to Supabase pooler on port 6543/5432 remains unverified.
- **Blocker:** Requires user-supplied PostgreSQL URI.
- **Remediation:** Provision Supabase instance, execute `npm run migrate`, and inject `DATABASE_URL`.

---

### ISSUE-02B: Database Migration Workflow (RESOLVED)
- **Category:** Database DevOps
- **Priority:** `P1` | **Status:** **RESOLVED**
- **Resolution Details:**
  1. Created `supabase/migrations/001_initial_schema.sql` containing baseline DDL.
  2. Implemented `scripts/migrate.mjs` supporting `--status` and `--apply` flags with `_migrations` history tracking.
  3. Added `npm run migrate` and `npm run migrate:status` scripts to `package.json`.
  4. Verified status inspection and table creation against local SQLite.
