# Global Send: Native Android Client (Kotlin + Jetpack Compose)

A complete, production-quality native Android application for **Global Send** (`gsend.in`), built with **Kotlin**, **Jetpack Compose**, and **Material 3**.

---

## 🚀 Key Highlights & Architectural Features

### 1. 100% Native Jetpack Compose UI
- **Exact Brand Aesthetic**: Replicates the Global Send dark-minimalist design language, crisp border treatments (`1.dp` subtle borders), card corner radii (`18.dp`), and vibrant neo-accent badges (Neon Lime `#CDFF5D`, Coral `#FC6742`, Purple `#C17BF3`, Sky Blue `#38BDF8`).
- **Apple Notes / Settings Style**: Clean typography with dedicated **Monospace Reader** for programming problems and exam questions, accompanied by floating iOS-style pill toasts.
- **Edge-to-Edge Experience**: Modern Android 15+ compatible edge-to-edge window insets.

### 2. Zero-Dependency Username + Key Auth & Recovery
- **Username + Private Key**: No phone numbers, no passwords, no email tracking.
- **Security Question Key Recovery**: Anti-enumeration key recovery flow powered by the backend's Argon2id validation.
- **Biometric App Lock**: Secure session token storage using Android's `EncryptedSharedPreferences` and biometric prompt authentication.

### 3. Date-Wise Locker & Timeline
- Content is automatically categorized into clear chronological groups:
  - *Today*
  - *Yesterday*
  - *Earlier This Week*
  - *Earlier This Month*
  - *Older*
- Category filters: *All*, *Notes*, *Questions*, *Links*, *Photos*, *Videos*, *Files*, and *Favourites*.
- **Verbatim Clipboard Copy**: 1-tap copy action that strictly preserves all indentation, newlines, tabs, and characters.

### 4. Direct Encrypted Messenger
- Built-in 1-on-1 private messaging directly with any Global Send username.
- Send text messages and share vault attachments seamlessly.
- Contact blocking and unblocking.

### 5. Multi-Mode Storage & TTL Expiration
- Set auto-disintegration timers on every item: `1h`, `6h`, `12h`, `24h` (default), `3d`, or `7d`.
- Upload photos, videos, PDFs, and documents through multipart requests.
- Live storage usage progress meter with item breakdown.
- Soft-delete Trash with 1-tap restore or permanent wipe.
- One-click JSON vault data export.

### 6. Android System Share Target
- Intercepts Android's native `ACTION_SEND` and `ACTION_SEND_MULTIPLE` intents.
- Users can highlight text in Chrome, select a photo in Gallery, or share a file from another app directly into Global Send with a 1-tap expiry picker.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Language** | Kotlin 2.0.21 |
| **UI Framework** | Jetpack Compose + Material 3 |
| **Architecture** | MVVM + Repository Pattern |
| **Networking** | Retrofit 2.11 + OkHttp 4.12 + Gson |
| **Local Database** | Room 2.6.1 + KSP |
| **Security** | EncryptedSharedPreferences (Android Keystore) + BiometricPrompt |
| **Image Loading** | Coil 2.7.0 (Compose) |
| **Build System** | Gradle 8.11+ / 8.14 |

---

## 📱 How to Run & Build

### 1. Build Debug APK
```bash
cd android
.\gradlew.bat assembleDebug
```
The generated APK will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 2. Install on Connected Device or Emulator
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### 3. Backend Connectivity
In the app's Login screen or Settings tab:
- **Android Emulator**: Uses `http://10.0.2.2:3000`
- **Physical Phone**: Uses your host computer's LAN IP (e.g. `http://192.168.1.50:3000`) or production domain `https://gsend.in`
