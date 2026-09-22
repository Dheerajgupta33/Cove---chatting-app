<div align="center">

# 💬 Cove

### A modern real-time chat application built with the MERN stack + Socket.IO ⚡

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-UI-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

> 🌊 **Cove** is a feature-rich real-time chat platform built to feel like a real product, not just a basic messaging demo.

</div>

---

## 👋 About Cove

Cove is a full-stack real-time chat application built with the MERN stack and Socket.IO. It brings direct messaging, group chats, voice notes, file sharing, polls, scheduled messages, an AI assistant, notifications, and moderation tools together in one place.

The main goal of this project was to build something beyond a simple chat box. I wanted to understand how real-time systems work when features like authentication, typing indicators, read receipts, media uploads, user presence, roles, scheduled tasks, and admin controls are involved.

> 🏝️ Cove is a space for conversations — quick messages, group planning, shared files, and everything in between.

---

## ✨ Features

### 💬 Messaging

- ⚡ Real-time direct and group messaging
- ⌨️ Live typing indicators
- 🟢 Online/offline presence and last-seen status
- ✅ Delivered and seen receipts
- 😀 Emoji reactions
- ✏️ Edit and delete messages
- ↩️ Reply to, forward, pin, and star messages
- 🔎 Search chats and hashtags
- ♾️ Cursor-based message history loading
- ⏰ Schedule messages for later

### 🎉 Media and Collaboration

- 🎙️ Record and send voice messages
- 🖼️ Share images and videos
- 📎 Upload documents and files with drag and drop
- 📊 Create single-choice and multiple-choice polls
- 📣 Mention group members with autocomplete
- 📦 Export chat backups as JSON

### 👥 Accounts and Social Features

- 🔐 Email and username login/registration
- 🔄 JWT access and refresh token authentication
- 🌐 Google Sign-In support
- 📧 Email verification and password reset flows
- 🧑 Profile, avatar, bio, and custom status
- 🤝 Friend requests
- 🚫 Block and unblock users
- ⭐ Favorite chats and messages
- 🗂️ Archive and unarchive conversations

### 🤖 AI, Calls, and Admin Tools

- 🤖 Built-in **Cove AI** assistant
- 📞 Voice and video call interface
- 🎥 Camera controls, mute controls, and screen sharing
- 🛡️ Admin roles and user moderation
- 🚩 Report users and messages
- 📋 Audit logs for admin activity
- 📈 Admin analytics dashboard
- 🌙 Dark/light theme support
- 🔔 Notification and privacy settings

---

## 🧰 Tech Stack

| Area | Technologies |
| --- | --- |
| 🎨 Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| 🧠 State Management | Redux Toolkit, React Redux |
| 🚀 Backend | Node.js, Express.js |
| 🗄️ Database | MongoDB, Mongoose |
| ⚡ Real-Time Communication | Socket.IO |
| 🔐 Authentication | JWT, bcrypt, Google OAuth |
| ✅ Validation | Zod |
| ☁️ File Storage | Cloudinary with local fallback |
| 📬 Email | Nodemailer |
| 🤖 AI | Anthropic Messages API |
| 🌍 Deployment | Vercel, Render, Railway |

---

## 🏗️ Architecture

Cove is divided into two independent applications:

```text
cove/
├── server/   # Express API, MongoDB, Socket.IO, authentication, jobs
└── client/   # React + Vite frontend and Redux state
```

- 🌐 **REST API** handles authentication, validation, database operations, uploads, and chat actions.
- ⚡ **Socket.IO** handles instant events such as new messages, typing, presence, notifications, delivery status, read receipts, and call signalling.
- 🗄️ **MongoDB** stores users, messages, groups, conversations, notifications, reports, settings, and logs.

### Socket Rooms

```text
user:<id>    # Every active connection of a user
conv:<id>    # All members of a conversation
admins       # Moderators and administrators
```

> 📡 Messages are saved through the REST API first and then broadcast instantly through Socket.IO.

---

## 🚀 Getting Started

### 📌 Requirements

Before running the project, make sure you have:

- Node.js 18 or newer
- npm
- MongoDB locally or a MongoDB Atlas connection string

Optional services:

- ☁️ Cloudinary for production media storage
- 📬 SMTP credentials for email verification and password reset
- 🌐 Google OAuth credentials
- 🤖 Anthropic API key for live Cove AI responses

---

## 📥 Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd cove
```

Install dependencies for both frontend and backend:

```bash
npm run install:all
```

Create environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

At minimum, add your MongoDB connection string and two strong JWT secrets in `server/.env`.

> 🔒 Never upload `.env` files, API keys, JWT secrets, or database credentials to GitHub.

---

## ▶️ Run Locally

Open two terminals.

### Terminal 1 — Start Server

```bash
npm run dev:server
```

### Terminal 2 — Start Client

```bash
npm run dev:client
```

| Service | Default URL |
| --- | --- |
| 🖥️ Client | `http://localhost:5173` |
| 🛠️ Server | `http://localhost:5000` |

Create the first admin account:

```bash
npm run seed:admin
```

---

## 🧩 Development Fallbacks

Cove can still run if some optional services are not configured:

- 📬 No SMTP? Password reset and verification links appear in the server console.
- ☁️ No Cloudinary? Uploads are saved locally during development.
- 🤖 No Anthropic API key? Cove AI works in demo mode.
- 🌐 No Google Client ID? The Google Sign-In button stays hidden.

---

## 🔐 Security Features

Security is built into the project from the beginning:

- 🔑 Short-lived JWT access tokens
- 🔄 Rotating refresh tokens
- 🕵️ Refresh-token reuse detection
- 🍪 `httpOnly` and secure cookies
- 🚦 API, authentication, message, and upload rate limiting
- ✅ Zod validation for request body, params, and query values
- 🧹 NoSQL injection protection
- 🛡️ XSS sanitization and Helmet security headers
- 🌐 Strict CORS configuration
- 📁 File-type allow-list and 25 MB upload limit
- 👁️ Privacy controls for presence, last seen, and read receipts
- 🧾 Audit logs for admin actions

---

## 🌍 Deployment

### 🖥️ Backend — Render or Railway

Deploy the `server` directory and configure:

```text
MONGO_URI
CLIENT_URL
SERVER_URL
```

Add other values only if you use those services:

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
GOOGLE_CLIENT_ID
ANTHROPIC_API_KEY
```

### 🌐 Frontend — Vercel

Deploy the `client` directory with the Vite framework preset.

Add:

```text
VITE_API_URL=<your-deployed-server-url>
```

> 🍪 **Cookie note:** If the frontend and backend are deployed on different domains, refresh cookies may be treated as third-party cookies. For better production reliability, use a shared custom domain such as `app.example.com` and `api.example.com`.

---

## 🧪 First-Run Checklist

Before considering the project production-ready, test these items:

- [ ] 👤 Register two accounts in separate browsers
- [ ] 💬 Send messages and verify real-time delivery
- [ ] ⌨️ Test typing indicators
- [ ] 🟢 Test presence and last-seen updates
- [ ] ✅ Test delivered and read receipts
- [ ] 📎 Upload an image, document, and voice note
- [ ] 👥 Create a group and test mentions
- [ ] 📊 Create and vote in a poll
- [ ] 📌 Pin a message
- [ ] ⏰ Schedule a message
- [ ] 🔁 Restart the server and verify client reconnection
- [ ] 🛡️ Create an admin user and open the admin dashboard
- [ ] 🔐 Test authentication and cookies after deployment

---

## 🚧 Current Limitation

### 📞 Voice and Video Calls

The call interface is implemented with:

- 📲 Ringing and incoming call alerts
- ✅ Accept and decline actions
- 🎙️ Mute/unmute controls
- 📷 Camera toggle
- 🖥️ Screen sharing
- 📡 Socket.IO call signalling
- 👀 Local camera, microphone, and screen previews

However, live audio and video are **not yet streamed to the other participant**.

The remaining work is to add WebRTC using:

```text
RTCPeerConnection
Offer / Answer exchange
ICE candidates
TURN server for production NAT traversal
```

> 🧩 The signalling system is ready. WebRTC peer-to-peer media streaming is the next major feature.

---

## 📈 Future Improvements

- 🔄 Add Socket.IO Redis adapter for multi-server scaling
- 🧰 Add BullMQ for high-volume scheduled-message processing
- 🔎 Use MongoDB text search or Atlas Search for large datasets
- 📞 Complete WebRTC voice/video streaming
- 🧪 Add API tests, Socket.IO tests, and end-to-end tests
- 📱 Improve mobile responsiveness
- 🌐 Add more OAuth providers

---

## 📁 Project Structure

```text
server/src/
├── config/         # Environment validation and database connection
├── models/         # Mongoose schemas
├── controllers/    # Route handlers
├── routes/         # API endpoints
├── middleware/     # Auth, validation, security, uploads, errors
├── services/       # Messaging, AI, storage, notifications, logging
├── socket/         # Socket authentication and real-time events
├── jobs/           # Scheduled-message worker
└── validators/     # Zod schemas

client/src/
├── app/            # Redux store
├── features/       # Auth, chat, UI, friends, notifications
├── services/       # Axios API modules and Socket.IO client
├── hooks/          # Reusable React hooks
├── components/     # Shared, chat, dashboard, admin, and layout UI
├── pages/          # Application pages
└── lib/            # Utilities and helpers
```

---

## 🎯 Why I Built This

I built Cove to practise creating a complete full-stack application where many systems need to work together properly.

This project helped me understand that a chat application is not only about sending messages. Real-time presence, unread messages, delivery status, read receipts, permissions, user roles, scheduled tasks, media handling, secure sessions, and moderation all need coordination between the frontend, backend, database, and Socket.IO server.

---

## 🗺️ Roadmap

- [x] Core real-time messaging
- [x] Groups, reactions, polls, and file uploads
- [x] JWT authentication with refresh-token rotation
- [x] AI assistant
- [x] Admin dashboard and reporting system
- [x] Call UI and Socket.IO signalling
- [ ] WebRTC peer-to-peer audio/video streaming
- [ ] Redis-backed Socket.IO scaling
- [ ] Automated testing suite
- [ ] Better mobile optimization

---

## 📄 License

Choose and add a license before making the repository public.

A common option for portfolio projects is the **MIT License**.

---

## 🙋 Author

**Dheeraj Gupta**


---

<div align="center">

Made with ☕, JavaScript, React, Node.js, MongoDB, and Socket.IO ⚡

⭐ If you like this project, consider giving the repository a star.

</div>
