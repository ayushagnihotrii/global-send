# Global Send: Android Client Application

A native Android mobile application built with React Native, Expo, and TypeScript for **Global Send** (`gsend.in`).

This mobile app connects directly to the unified Global Send Next.js backend, allowing users to save and retrieve texts, multiline questions, website links, photos, videos, and documents seamlessly between their Android phone and desktop devices.

---

## Architecture Overview

```
apps/android/
├── App.tsx                   # Main app component wrapping AuthProvider and RootNavigator
├── index.ts                  # Expo root registration
├── app.json                  # Expo config, permissions & Android Share Intent Filters
├── package.json              # React Native & Expo dependencies
├── src/
│   ├── components/           # UI components (ItemCard, Theme tokens)
│   ├── context/              # AuthContext (token persistence, user state)
│   ├── navigation/           # RootNavigator with bottom navigation & Android back handler
│   ├── screens/              # 12 Screens:
│   │   ├── AuthScreen.tsx        # 1. Login & Registration
│   │   ├── HomeScreen.tsx        # 2. Home timeline (date-grouped, pull-to-refresh)
│   │   ├── QuickSaveScreen.tsx   # 3. Quick Save modal sheet
│   │   ├── ComposerScreen.tsx    # 4. Text & question composer (multiline, tags)
│   │   ├── DetailScreen.tsx      # 5. Saved text & file detail (monospaced viewer, copy-all)
│   │   ├── SearchScreen.tsx      # 6. Full-text search
│   │   ├── PhotosScreen.tsx      # 7. Photos gallery (expo-image-picker)
│   │   ├── VideosScreen.tsx      # 8. Videos library (native picker & progress)
│   │   ├── DocumentsScreen.tsx   # 9. Document locker (expo-document-picker)
│   │   ├── LinksScreen.tsx       # 10. Saved links (open in browser, copy URL)
│   │   ├── FavouritesScreen.tsx  # 11. Starred favourites
│   │   └── SettingsScreen.tsx    # 12. Settings, Google Drive status & account management
│   ├── services/
│   │   ├── api.ts                # Typed HTTP client with Bearer auth & background uploads
│   │   ├── storage.ts            # Secure token storage via expo-secure-store
│   │   └── shareHandler.ts       # Android Share Sheet (ACTION_SEND) integration handler
│   └── types/                    # Shared TypeScript interfaces
```

---

## Key Features

1. **True Native Android UI (Not a WebView)**:
   - Built with native Android components, Material Design 3 tokens, and fluid navigation.
   - Respects Android system back button navigation.
2. **Dual-Mode Backend Connectivity**:
   - Android Emulator: Connects via `http://10.0.2.2:3000`.
   - Physical Phone: Connects via host LAN IP (`http://192.168.x.x:3000`) or production domain `https://gsend.in`.
   - Server URL can be edited anytime directly in the app from the login screen or settings.
3. **Session Security**:
   - Session Bearer tokens are stored in hardware-backed keystore via `expo-secure-store`.
   - Google Drive secrets and refresh tokens are **never** present on the mobile device.
4. **Native File & Media Pickers**:
   - `expo-image-picker` for camera and photo gallery uploads.
   - `expo-document-picker` for PDFs, archives, office documents, and code files.
   - Live upload progress percentage bar.
5. **Exact Formatting Preservation**:
   - One-tap clipboard copy preserving verbatim newlines, indentation, and characters.
6. **Android System Share Target**:
   - Configured in `app.json` with `intentFilters` for `android.intent.action.SEND` and `android.intent.action.SEND_MULTIPLE`.
   - Enables saving texts, links, photos, and files directly from other Android apps via the native Share Sheet.

---

## Running the Android App

### Prerequisites
- Node.js 18+
- Android Studio with an Android Virtual Device (AVD) or an authorized physical Android phone with USB debugging enabled.

### 1. Install Dependencies
```bash
cd apps/android
npm install
```

### 2. Start the Development Server
```bash
npm start
```

### 3. Launch on Android Emulator or Physical Device
- Press `a` in the Expo CLI terminal to open on your connected Android emulator or device.
- Or run directly:
```bash
npm run android
```

---

## Production APK Build

To generate a standalone APK:
```bash
npx eas build -p android --profile preview
```
Or with local credentials:
```bash
npx expo run:android --variant release
```
