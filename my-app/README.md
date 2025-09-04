# Daily Tasks — Expo + Supabase

Minimalist, offline-first task manager with optional cloud sync.

## 1) Setup & Run

Prerequisites:
- Node.js 18+
- Git, Android/iOS tooling (optional)

Install:
```bash
npm install
```

Configure environment (PowerShell on Windows):
```powershell
$env:SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co"
$env:SUPABASE_ANON_KEY="YOUR-ANON-PUBLIC-KEY"
```

Start (clear cache recommended after config changes):
```bash
npx expo start -c
```

Open on device/emulator:
- Press `a` for Android, `i` for iOS, or `w` for Web in the Expo terminal

## 2) Cloud Sync (Supabase)

This app supports syncing tasks across devices via Supabase.

Setup:
- Create a Supabase project
- Create table `tasks` with columns:
  - `id` text primary key
  - `title` text
  - `description` text
  - `due_date` timestamptz
  - `priority` text
  - `completed` boolean
  - `created_at` timestamptz
  - `updated_at` timestamptz
- Set environment variables (in your shell) used by `app.json` extra before running:

Use the PowerShell instructions above (or `.env` with a shell that exports envs).

Sync behavior:
- Offline-first: tasks are stored locally
- Pull remote and push local on pull-to-refresh
- Last-write-wins via `updatedAt`

## 3) Technical Choices (Why)

- Expo Router (file-based routing): simple navigation, auth gating via `app/_layout.tsx`.
- AsyncStorage for offline-first: tasks work without network, optimistic updates.
- Supabase for sync: easy email/password auth and Postgres; last-write-wins via `updatedAt`.
- Gesture Handler + Reanimated: smooth swipe to complete/delete.
- Minimal UI: clear hierarchy, category chips, accent color FAB.

Trade-offs:
- LWW conflict resolution is predictable but not merge-aware; sufficient for a personal task app.
- Sync on pull-to-refresh to keep network usage explicit.

## 4) Screenshots / Demo

- Video/GIF: <add Loom/YouTube link here>
- Screenshots:
  - Login: `assets/screens/login.png`
  - Tasks: `assets/screens/tasks.png`
  - Add Task: `assets/screens/add-task.png`

Tip: Add files under `assets/screens/` and update the links above.

## 5) Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## 6) Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## 7) Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
