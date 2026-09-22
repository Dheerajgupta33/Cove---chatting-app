# Cove - real-time chat (MERN + Socket.IO)

Direct messages, group rooms, voice notes, polls, scheduled messages, an AI assistant, friend requests, an admin console and a dark/light glassmorphism UI.

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, Framer Motion, Redux Toolkit, React Hook Form + Zod, React Hot Toast, Lucide |
| Backend | Node 18+, Express 4, Mongoose 8, Socket.IO 4 |
| Auth | JWT access token (15 min) + rotating refresh token in an httpOnly cookie, Google sign-in, email verification, password reset |
| Files | Cloudinary (falls back to `server/uploads` in development) |
| Deploy | Vercel (client) + Render / Railway (server) |

> **Status note.** This code was written and statically checked (syntax, undefined names, unused/missing imports) but it has **not been run end-to-end**: the authoring environment had no access to the npm registry, so dependencies were never installed. Expect to spend a little time on first-run issues; see the [smoke-test checklist](#first-run-smoke-test).

## Quick start

```bash
# 1. install
npm run install:all

# 2. configure
cp server/.env.example server/.env    # set MONGO_URI + two long random JWT secrets
cp client/.env.example client/.env

# 3. run (two terminals)
npm run dev:server     # http://localhost:5000
npm run dev:client     # http://localhost:5173

# 4. optional: create the first admin (uses ADMIN_EMAIL / ADMIN_PASSWORD from server/.env)
npm run seed:admin
```

Everything optional degrades gracefully in development: without SMTP the verification/reset links are printed in the server console, without Cloudinary uploads go to `server/uploads`, without an AI key the assistant replies in demo mode, and without `GOOGLE_CLIENT_ID` the Google button is hidden.

## Feature map

| Area | Where |
|---|---|
| Register / login / refresh rotation / logout | `server/src/controllers/auth.controller.js`, `client/src/features/auth` |
| Email verification, forgot/reset password | `auth.controller.js`, `pages/VerifyEmailPage`, `ForgotPasswordPage`, `ResetPasswordPage` |
| Google OAuth | `@react-oauth/google` gets an ID token, the server verifies it (`google-auth-library`) |
| 1:1 + group chat, typing, presence, delivered/seen | `socket/index.js`, `services/message.service.js`, `chatSlice`, `useSocketEvents` |
| Reactions, edit, delete (me/everyone), reply, forward, pin, star | `message.controller.js`, `useMessageActions`, `MessageBubble` |
| Polls, scheduled messages | `message.controller.js`, `jobs/scheduler.js`, `PollModal`, `ScheduleModal` |
| Voice notes, images, video, documents, drag & drop | `useVoiceRecorder`, `useUploads`, `upload.controller.js`, `MessageContent` |
| Infinite history | cursor pagination (`GET /conversations/:id/messages?before=`), `MessageList` |
| Search, #hashtags, @mentions | `searchMessages`, `RichText`, `Composer` mention picker |
| AI assistant | `services/ai.service.js` (Anthropic Messages API; bot user "Cove AI") |
| Voice / video call + screen share UI | `CallOverlay`, `useCall`, socket `call:*` events |
| Friends, blocking, reporting, favorites, archive, custom status | `friend.controller.js`, `user.controller.js`, `social.controller.js` |
| Dashboard (recent chats, favorites, active users, stats) | `ConversationSidebar`, `DashboardHome` |
| Notifications, settings, chat backup | `NotificationsPage`, `SettingsPage`, `GET /users/me/backup` |
| Admin: users, chat monitoring, reports, analytics, ban/unban, logs, moderation | `admin.controller.js`, `pages/AdminPage` + `components/admin` |

## Project layout

```
cove/
├─ server/src
│  ├─ config/        env validation (zod), db
│  ├─ models/        User, Message, Conversation, Group, Notification, FriendRequest, Report, Settings, SystemLog
│  ├─ controllers/   one file per resource
│  ├─ routes/        auth | user | chat | social | admin
│  ├─ middleware/    auth, validate (zod), rateLimit, sanitize, upload, error
│  ├─ services/      message publishing, AI, storage, realtime registry, notifications, audit log
│  ├─ socket/        Socket.IO auth, presence, typing, call signalling
│  ├─ jobs/          scheduled-message worker
│  └─ validators/    all request schemas
└─ client/src
   ├─ app/           redux store
   ├─ features/      auth, chat, ui, notifications, friends slices
   ├─ services/      axios instance (auto refresh), per-domain API modules, socket
   ├─ hooks/         useSocketEvents, useUploads, useVoiceRecorder, useTyping, useMessageActions, ...
   ├─ components/    common (design system), chat, dashboard, admin, layout
   ├─ pages/         Landing, Login, Register, Forgot/Reset, Verify, Chat, Friends, Profile, Settings, Notifications, Admin
   └─ lib/           utils, time, chat helpers, zod schemas
```

## Realtime events

Rooms: `user:<id>` (all of a user's sockets), `conv:<id>` (members of a conversation), `admins`.

| Server → client | Payload |
|---|---|
| `message:new` | `{ message }` |
| `message:updated` | `{ conversationId, messageId, patch }` (edit, delete, reactions, pin, poll votes) |
| `conversation:delivered` / `conversation:seen` | `{ conversationId, userId, at? }` |
| `typing` | `{ conversationId, user, isTyping }` |
| `presence:update` | `{ userId, isOnline, lastSeen? }` |
| `conversation:new` / `updated` / `removed` | group lifecycle |
| `notification:new`, `friend:request`, `friend:accepted`, `admin:report` | |
| `call:incoming` / `accepted` / `declined` / `ended` / `signal` | call signalling |

| Client → server | |
|---|---|
| `typing` `{ conversationId, isTyping }` | |
| `call:invite` `{ conversationId, type }` (ack) · `call:accept` · `call:decline` · `call:end` · `call:signal` `{ callId, data }` | |

Messages are sent over REST (validated, rate-limited, idempotent via `clientId`) and fanned out over sockets.

## Calls: what is and isn't built

Ringing, accept/decline/end, in-call controls, mute, camera toggle and screen sharing are implemented, and the camera/mic/screen previews are real (`getUserMedia` / `getDisplayMedia`). **Audio/video is not yet streamed to the other person**: that needs an `RTCPeerConnection`. The server already relays opaque `call:signal` payloads between the two participants, so adding WebRTC means creating the peer connection in `CallOverlay`, sending offer/answer/ICE over `call:signal`, and configuring a TURN server for production.

## Security

- bcrypt (`bcryptjs`, cost 12); refresh tokens are stored only as SHA-256 hashes, rotated on every use, with reuse detection (a replayed token revokes all sessions).
- Helmet, CORS allow-list with credentials, `express-rate-limit` (global, stricter on auth, per-user on sends), `express-mongo-sanitize` (NoSQL injection), HTML stripped from all request strings (`xss`), Zod validation on every route, attachment URLs restricted to our own upload pipeline.
- The API never reveals whether an email is registered (forgot-password), bans revoke sessions and kick live sockets, admin access to conversations is audit-logged.
- Secure cookies: `httpOnly`, `secure` in production, `SameSite=None` for cross-site deployments.

## Deployment

**Server (Render):** New → Blueprint → select this repo (`server/render.yaml`). Set `MONGO_URI` (Atlas), `CLIENT_URL` (your Vercel URL), `SERVER_URL` (the Render URL), Cloudinary keys, optionally SMTP / `GOOGLE_CLIENT_ID` / `ANTHROPIC_API_KEY`. Railway works the same way with `npm start` from the `server` directory.

**Client (Vercel):** import the repo, root directory `client`, framework Vite. Set `VITE_API_URL` to the server URL and `VITE_GOOGLE_CLIENT_ID` if used. `vercel.json` handles SPA routing and security headers. Update the URLs in `public/robots.txt` and `public/sitemap.xml`.

**Cookies across domains.** Vercel and Render use different registrable domains, so the refresh cookie is third-party. Chrome allows it (`SameSite=None; Secure`), but Safari/Firefox tracking protection may block it. The reliable fix is a custom domain for both (e.g. `app.example.com` + `api.example.com`) and `COOKIE_SAMESITE=lax`.

## Scaling notes

- Presence and call tables live in process memory. For several server instances add the Socket.IO Redis adapter and move online tracking to Redis.
- The scheduler polls MongoDB every 15 s with an atomic claim (safe with multiple instances); use a queue (BullMQ) for heavy volumes.
- Message search is an unindexed case-insensitive regex, fine for moderate data; switch to a text/Atlas Search index for large datasets.
- The message list is not virtualised; pagination keeps it small in practice.

## First-run smoke test

1. Register two accounts in two browsers; confirm messages, typing, delivered → seen ticks and presence update live.
2. Send an image, a document and a voice note; drag a file onto the chat.
3. Create a group, @mention someone, pin a message, create a poll, schedule a message for 1 minute ahead.
4. Kill the server and restart it: the client should reconnect and resync. Wait 15+ minutes: the access token refreshes silently.
5. `npm run seed:admin`, sign in as admin, open `/app/admin`.
