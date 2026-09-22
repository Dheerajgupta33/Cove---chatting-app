<div align="center">

💬 Cove
A modern real-time chat application built with the MERN stack + Socket.IO ⚡
Status: The project has been statically checked, but it still needs an end-to-end integration test after dependencies are installed. 🧪

</div>

👋 About Cove
Cove is a full-stack chat application built to feel like a real product, not just a simple messaging demo. It brings together direct messaging, group chats, voice notes, file sharing, polls, scheduled messages, an AI assistant, notifications, and moderation tools in one place.

The goal of this project was to practise building the parts of a real-time application that are usually harder than sending a message: authentication, socket events, read receipts, presence, uploads, permissions, background jobs, and admin controls.

🏝️ Cove is a space for conversations — quick messages, group planning, shared files, and everything in between.

✨ What it can do
💬 Messaging
⚡ Real-time direct and group messages

⌨️ Live typing indicators

🟢 Online/offline presence and last-seen status

✅ Delivered and seen receipts

😀 Emoji reactions

✏️ Edit and delete messages

↩️ Reply to, forward, pin, and star messages

🔎 Search chats and hashtags

♾️ Cursor-based message history loading

⏰ Schedule messages for later

🎉 Media and collaboration
🎙️ Record and send voice messages

🖼️ Share images and videos

📎 Upload documents and files with drag and drop

📊 Create single-choice or multiple-choice polls

📣 Mention group members with autocomplete

👥 Accounts and social features
🔐 Email/username login and registration

🔄 Access and refresh token authentication

🌐 Google Sign-In support

📧 Email verification and password reset flows

🧑 Profile, avatar, bio, and custom status

🤝 Friend requests

🚫 Block and unblock users

⭐ Favorites and archived conversations

📦 Export chat backups as JSON

🤖 AI, calls, and admin tools
🤖 Built-in Cove AI chat assistant

📞 Voice and video call interface with Socket.IO signalling

🛡️ Admin roles, user moderation, and bans

🚩 User and message reporting workflow

📋 Audit logs for administrative actions

📈 Admin analytics dashboard

🌙 Dark/light mode, notification preferences, and privacy settings

🧰 Tech stack
Area	Tools used
🎨 Frontend	React 18, Vite, Tailwind CSS, Framer Motion
🧠 State management	Redux Toolkit, React Redux
🚀 Backend	Node.js, Express.js
🗄️ Database	MongoDB, Mongoose
⚡ Real-time	Socket.IO
🔐 Authentication	JWT, bcrypt, Google OAuth
✅ Validation	Zod
☁️ File storage	Cloudinary, with local fallback in development
📬 Email	Nodemailer, with console fallback in development
🤖 AI	Anthropic Messages API
🌍 Deployment	Vercel, Render, or Railway
🏗️ How it works
Cove has separate frontend and backend applications:

text

cove/
├── server/   # Express API, MongoDB, Socket.IO, authentication, jobs
└── client/   # React + Vite frontend and Redux state
🌐 REST API handles authentication, validation, database operations, file uploads, and chat actions.

⚡ Socket.IO handles instant events such as messages, typing, presence, notifications, receipts, and call signalling.

🗄️ MongoDB stores users, messages, conversations, groups, reports, settings, and system logs.

Socket rooms
text

user:<id>    # Every active connection for a user
conv:<id>    # Everyone in a conversation
admins       # Moderators and admins
📡 A message is saved through the API first, then instantly broadcast to the members of that conversation through Socket.IO.

🚀 Getting started
📌 Requirements
Before running the project, make sure you have:

Node.js 18 or newer

npm

MongoDB locally or a MongoDB Atlas connection string

Optional integrations:

☁️ Cloudinary for production media storage

📬 SMTP credentials for email verification and password reset emails

🌐 Google OAuth credentials

🤖 Anthropic API key for live Cove AI replies

📥 Installation
bash

git clone <your-repository-url>
cd cove
npm run install:all
Create local environment files:

bash

cp server/.env.example server/.env
cp client/.env.example client/.env
At minimum, add your MongoDB connection string and two strong JWT secrets to server/.env.

🔒 Never push your .env file, JWT secrets, API keys, or database credentials to GitHub.

▶️ Run the app
Open two terminals.

Terminal 1 — server

bash

npm run dev:server
Terminal 2 — client

bash

npm run dev:client
Service	Default URL
🖥️ Client	http://localhost:5173
🛠️ Server	http://localhost:5000
Create your first admin account if needed:

bash

npm run seed:admin
🧩 Development fallbacks
Cove can still run while optional services are missing:

📬 No SMTP? Verification and reset links appear in the server console.

☁️ No Cloudinary? Uploads are saved locally in development.

🤖 No Anthropic key? Cove AI responds in demo mode.

🌐 No Google client ID? The Google sign-in button stays hidden.

🔐 Security highlights
Security is built into the project instead of being added as an afterthought:

🔑 Short-lived access tokens

🔄 Rotating refresh tokens stored as SHA-256 hashes

🕵️ Refresh-token reuse detection

🍪 httpOnly, secure cookie handling

🚦 Rate limits for APIs, authentication, messages, and uploads

✅ Zod validation for request bodies, params, and queries

🧹 NoSQL-injection and XSS sanitization

🪖 Helmet security headers and strict CORS rules

📁 File-type allow-list with a 25 MB upload limit

👁️ Privacy controls for presence, last-seen, and read receipts

🧾 Audit logs for moderation activity

🌍 Deployment
🖥️ Backend — Render or Railway
Deploy the server application and set these environment variables:

text

MONGO_URI
CLIENT_URL
SERVER_URL
Also add Cloudinary, SMTP, Google OAuth, and Anthropic variables only if you are using those services.

🌐 Frontend — Vercel
Deploy the client directory using the Vite preset, then configure:

text

VITE_API_URL=<your-deployed-server-url>
🍪 Cookie note: Different client/server domains can make refresh cookies behave like third-party cookies. For a more reliable production setup, use a common custom domain such as app.example.com and api.example.com.

🧪 First-run checklist
Before calling the project production-ready, test the following:


👤 Register two accounts in different browsers


💬 Send messages and confirm real-time delivery


⌨️ Test typing indicators, presence, and read receipts


📎 Upload an image, document, and voice note


👥 Create a group and test mentions, pins, polls, and scheduled messages


🔁 Restart the server and confirm the client reconnects properly


🛡️ Seed an admin account and check the admin dashboard


🔐 Verify cookies, authentication, uploads, and errors after deployment

🚧 Current limitation
📞 Voice/video calls
The call UI, local microphone/camera previews, ringing flow, accept/decline actions, mute controls, screen sharing, and Socket.IO signalling are in place.

However, real audio/video is not streamed to the other participant yet. The next step is to add WebRTC on the client using RTCPeerConnection, exchange offer/answer and ICE-candidate data through the existing call:signal event, and configure a TURN server for production connectivity.

🧩 The signalling path is ready; WebRTC media transport is the remaining piece.

📈 Future improvements
🔄 Add the Socket.IO Redis adapter for multi-server scaling

🧰 Use BullMQ or another queue for very high volumes of scheduled messages

🔎 Move from regex search to MongoDB text search or Atlas Search for large datasets

📞 Finish WebRTC media streaming and TURN-server support

🧪 Add automated API, socket, and end-to-end tests

📁 Project structure
text

server/src/
├── config/         # Environment validation and database connection
├── models/         # Mongoose schemas
├── controllers/    # Route handlers
├── routes/         # API endpoints
├── middleware/     # Auth, validation, security, upload, and error handlers
├── services/       # Messages, AI, storage, notifications, logging
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
🎯 Why I built this
I built Cove to practise making a complete full-stack application where multiple systems need to work together: React UI, Express APIs, MongoDB data models, authentication, real-time events, file uploads, AI integration, moderation, and deployment.

It helped me understand that a messaging app is more than a message input and a database. Things like unread counts, user presence, permissions, scheduled tasks, delivery states, and secure session handling all need careful coordination between the frontend and backend.

🗺️ Roadmap

Core real-time messaging


Groups, reactions, polls, and media uploads


Authentication and refresh-token rotation


AI assistant and admin tools


Call UI and signalling


WebRTC peer-to-peer media streaming


Redis-backed Socket.IO scaling


Automated test suite

📄 License
Choose and add a license before making the repository public. The MIT License is a common choice for portfolio projects.

🙋 Author
Your Name

💻 GitHub: @your-username

🌐 Portfolio: your-portfolio-url

📧 Email: your-email@example.com
