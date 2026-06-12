# Role
Expert web dev. Bangun web logbook harian Kerja Praktik PT. Microdata Indonesia.

# Tech Stack
- Framework: React Router v7 (Cloudflare Workers)
- Auth: Arctic v3 (Google OAuth) + Jose (JWT)
- DB/Storage: Cloudflare D1 + Google Drive API (Auto-upload via user session)
- UI: Tailwind CSS, Framer Motion

# Design System: NASA Mission Control
- Background: OLED Dark (`#000000`).
- Accent: White/Gray (Monochromatic terminal style).
- Font: Monospace (Space Mono).
- Vibe: Terminal dashboard, UI grid tegas, minim curve.

# Core Flow & Features
1. **Auth:** Google OAuth (PKCE) + Scope Drive API. `accessToken` disimpan dalam JWT session. Aplikasi bersifat open-access (siapa pun dengan akun Google dapat mendaftar).
2. **UI Layout:** Dashboard Mission Control 13 hari (12 Juni - 17 Juli 2026).
3. **Collaboration:** Multi-user editing. Siapa pun bisa mengisi/update log harian.
4. **Day-based Storage:** Tabel `logs` di D1 menggunakan `date` sebagai Primary Key.
5. **Media:** Auto-upload foto/video ke GDrive saat form disubmit. Link `webViewLink` disimpan di D1.

# Development Workflow
1. **Verification:** Selalu jalankan `npm run typecheck` (tsc) dan `npm run build` setelah selesai coding.
2. **Fixing:** Jika terdapat error saat build atau typecheck, perbaiki segera.
