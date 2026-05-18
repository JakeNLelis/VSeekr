# VSeekr 🔍

A community-driven **lost & found mobile app** for campuses and local communities. VSeekr helps people report lost or found items on an interactive map, connect with finders, and get notified in real time — all within a sleek dark-mode interface.

Built with **Expo (React Native)** and powered by **Supabase**.

---

## Features

### 🔐 Authentication
- **Sign Up** — register with a username, email, and password
- **Sign In** — email + password login with show/hide password toggle
- **Forgot Password** — receive a deep-link reset email back into the app
- **Update Password** — reached from the reset email link
- Session persists across app restarts and auto-refreshes in the foreground
- Logout triggers an immediate redirect to the login screen
- **Delete Account** — permanently removes the account via a database function
- All protected routes (tabs, report details) redirect unauthenticated users to login

---

### 🗺️ Map Screen
- Full-screen **Google Maps** with live user location
- Custom colored pins per report type — 🔴 Lost, 🟢 Found
- Tap a pin's callout to navigate to the full report details
- Collapsible **bottom sheet** listing up to 5 nearby reports
- Standard ↔ Satellite map type toggle
- **Search bar** — filters by item name, description, or location name
- **Type filter** — All / Lost / Found
- **Category filter** — Electronics, Pets, Keys, Wallets/Cards, Apparel, Other
- Map pins and results update **in real time** via Supabase Realtime

---

### 📋 Feed Screen
- Chronological list of all active reports, newest first
- Each card shows: item name, lost/found badge, location, description snippet, thumbnail image, and relative timestamp
- Same search + type + category filter system as the Map screen
- Feed refreshes **automatically** via Supabase Realtime — no manual reload needed

---

### ➕ New Report Screen
- Choose **Lost** or **Found** as the report type
- Fill in item name, category, and description
- Open an interactive **map modal** to drop a pin at the exact GPS location
- Add an optional text description of the location
- Upload **up to 5 photos** from the device gallery (multi-select supported)
- Photos are uploaded to Supabase Storage; URLs are stored with the report

---

### 📄 Report Details Screen
- Swipeable **image carousel** with dot indicators
- Finder **contact card** (name, phone, email) — shown on Found reports
- Embedded **mini-map** showing the exact pin location
- Full description and status badge (Active / Closed)
- **Mark as Closed** — visible only to the report's owner while active
- **Comments section** — threaded chat-style bubbles (own vs. others)
- Sticky **comment input bar** at the bottom of the screen
- Posting a comment triggers:
  1. An activity log entry for the report owner
  2. A **push notification** sent to the owner via a Supabase Edge Function

---

### 🔔 Activity Screen
- Personal activity feed showing events on your own reports (e.g. "someone commented")
- Tap any activity card to navigate directly to the linked report
- Pull-to-refresh supported

---

### 👤 Profile Screen
- Avatar, username, and email display
- Stats card showing total Lost and Found reports submitted
- Editable **contact details** (name, phone, email) — shown to others on your Found reports
- Log Out and Delete Account actions

---

### 🔔 Push Notifications
- Expo Push Token registered on login and stored in the user's profile
- **In-app toast** slides down from the top when a new activity arrives (via Supabase Realtime)
- **Native push notification** sent through a Supabase Edge Function when someone comments on your report
- Tapping a native notification deep-links directly to the relevant report

---

### 🛡️ Security
- Row Level Security (RLS) enabled on all database tables
- The `anon` role has **zero access** — only authenticated JWT sessions can read or write data
- Write policies are scoped to the row owner (`auth.uid() = user_id`)

| Table | Unauthenticated | Authenticated |
|---|---|---|
| `reports` | ❌ | ✅ SELECT all active; INSERT/UPDATE own |
| `comments` | ❌ | ✅ SELECT all; INSERT own |
| `activities` | ❌ | ✅ SELECT own; INSERT own |
| `profiles` | ❌ | ✅ SELECT all; INSERT/UPDATE own |
| `users` | ❌ | ✅ SELECT all; UPDATE own |

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 |
| Navigation | Expo Router v6 (file-based routing) |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) |
| Maps | `react-native-maps` with Google Maps provider |
| Auth persistence | `@react-native-async-storage/async-storage` |
| Animations | `react-native-reanimated` v4 + `react-native-worklets` |
| Gestures | `react-native-gesture-handler` |
| Notifications | `expo-notifications` + Expo Push Service |
| Location | `expo-location` |
| Image picker | `expo-image-picker` |
| Deep linking | `expo-linking` with the `vseekr://` scheme |
| Architecture | New Architecture enabled (`newArchEnabled: true`) |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/)
- A [Supabase](https://supabase.com/) project with the required tables and RLS policies
- A Google Maps API key (for native map rendering)

### Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

### Installation

```bash
npm install
```

### Running the App

```bash
# Start the Expo dev server (clears cache)
npx expo start -c
```

Open the app in:
- **Expo Go** (iOS / Android) — scan the QR code
- **Development build** — `npx expo run:android` or `npx expo run:ios`
- **Android emulator** / **iOS simulator**

### Building for Production

```bash
# Build APK / IPA via EAS
eas build --platform android
eas build --platform ios
```

---

## Project Structure

```
vseekr/
├── app/
│   ├── _layout.tsx          # Root layout (providers, navigation stack)
│   ├── index.tsx            # Auth gate / entry redirect
│   ├── (auth)/              # Login, Register, Forgot & Update Password
│   ├── (tabs)/              # Map, Feed, Report, Activity, Profile
│   └── details/[id].tsx     # Report details screen
├── components/
│   ├── Map.tsx              # Native map re-export
│   ├── Map.web.tsx          # Web map stub
│   ├── ReportItem.tsx       # Reusable report card component
│   └── ui/                  # Design system components (Button, Card, Chip, etc.)
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── AuthProvider.tsx     # Auth context + session management
│   ├── NotificationProvider.tsx  # Push token + in-app toast
│   └── constants.ts         # Shared constants (categories, etc.)
└── plugins/
    └── withNativePatches.js # Custom Expo config plugin
```
