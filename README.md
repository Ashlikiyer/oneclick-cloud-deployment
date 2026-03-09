# 🚀 OneClick Deploy

Deploy GitHub repositories to **Vercel** (frontend) and **Railway** (backend + databases) with a single click. No platform configuration needed—just paste your GitHub URL, provide your API tokens, and deploy.

![Dashboard Preview](docs/dashboard-preview.png)

## ✨ Features

- **One-Click Deployment** — Paste a GitHub URL, select platform, click Deploy
- **Multi-Platform Support** — Vercel for Next.js/React, Railway for backends
- **Database Provisioning** — One-click PostgreSQL on Railway
- **Real-time Updates** — Watch deployment progress via WebSockets
- **User-Owned Resources** — Your tokens, your deployments, your billing
- **Auto Framework Detection** — Automatically routes to the right platform
- **Environment Variables** — Built-in env var editor with secret masking

## 🆚 Why Vercel/Railway vs EC2?

| Aspect | EC2 (Old) | Vercel/Railway (New) |
|--------|-----------|---------------------|
| Deploy Time | 3-5 minutes | 30-90 seconds |
| Server Management | Manual SSH & updates | Zero maintenance |
| Scaling | Manual resize | Auto-scaling |
| SSL/HTTPS | Manual Certbot | Automatic |
| Preview Deploys | None | Automatic (Vercel) |
| Database | Self-managed | Managed PostgreSQL |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 15)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Domain    │  │    Data     │  │ Application │  │Presentational│ │
│  │   Types     │→ │  Repository │→ │    Hooks    │→ │  Components  │ │
│  │   Schemas   │  │  API Calls  │  │React Query  │  │    Pages     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ REST API + WebSocket
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (Express.js)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Routes    │  │  Services   │  │  Socket.io  │                  │
│  │ /deploy/*   │  │vercelService│  │  Real-time  │                  │
│  │/deployments │  │railwayService│  │   Updates   │                  │
│  │ /databases  │  │githubService│  │             │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
                    ↙               ↓               ↘
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │    Vercel    │  │   Railway    │  │    GitHub    │
        │  REST API    │  │ GraphQL API  │  │   REST API   │
        │              │  │              │  │              │
        │ • Projects   │  │ • Projects   │  │ • Validate   │
        │ • Deploys    │  │ • Services   │  │ • Branches   │
        │ • Env Vars   │  │ • PostgreSQL │  │ • Framework  │
        └──────────────┘  └──────────────┘  └──────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** — App Router, Server Components
- **TypeScript** — Type-safe development
- **React Query** — Server state management
- **Socket.io Client** — Real-time updates
- **Tailwind CSS** — Utility-first styling
- **Zod** — Runtime validation

### Backend
- **Express.js** — REST API server
- **Socket.io** — WebSocket server for real-time updates

### Deployment Platforms
- **Vercel** — Frontend/Next.js deployments (REST API v9)
- **Railway** — Backend services + PostgreSQL (GraphQL API v2)

## 📦 Project Structure

```
oneclick-deploy/
├── oneclick_deploy/          # Frontend (Next.js)
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   │   ├── shared/           # Design system (Button, Card, etc.)
│   │   ├── deployment/       # Deploy form, cards, log viewer
│   │   ├── auth/             # Token setup, platform status
│   │   ├── database/         # Database provisioning UI
│   │   └── providers/        # Context providers
│   ├── domain/               # Layer 1: Types, schemas
│   ├── data/                 # Layer 2: API repositories
│   ├── application/          # Layer 3: React Query hooks
│   └── lib/                  # Utilities, token storage
│
├── oneclick_api/             # Backend (Express)
│   ├── routes/               # API endpoints
│   │   ├── deploy.js         # /api/deploy/vercel, /api/deploy/railway
│   │   ├── deployments.js    # /api/deployments
│   │   ├── databases.js      # /api/databases
│   │   └── webhooks/         # /api/webhooks/vercel
│   └── services/
│       ├── vercelService.js  # Vercel API wrapper
│       ├── railwayService.js # Railway GraphQL wrapper
│       ├── githubService.js  # Repo validation, framework detection
│       └── deploymentPoller.js
│
├── docs/
│   └── ARCHITECTURE.md       # System architecture
│
└── documentation/
    ├── IMPLEMENTATION_PLAN.md
    └── OneClick_Deploy_Documentation.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Vercel Account → Get token at [vercel.com/account/tokens](https://vercel.com/account/tokens)
- Railway Account → Get token at [railway.app/account/tokens](https://railway.app/account/tokens)
- A public GitHub repository to deploy

### 1. Clone and Install

```bash
git clone https://github.com/your-username/oneclick-deploy.git
cd oneclick-deploy

# Install frontend dependencies
cd oneclick_deploy
npm install

# Install backend dependencies
cd ../oneclick_api
npm install
```

### 2. Configure Environment

```bash
# Frontend: oneclick_deploy/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# Backend: oneclick_api/.env
PORT=4000
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 3. Start Development Servers

```bash
# Terminal 1: Backend
cd oneclick_api
npm run dev

# Terminal 2: Frontend
cd oneclick_deploy
npm run dev
```

### 4. Configure Tokens

1. Open http://localhost:3000
2. Click "Configure Tokens" in the header
3. Enter your Vercel Personal Access Token
4. Enter your Railway API Token
5. Click "Validate" to verify connectivity

### 5. Deploy!

1. Paste a GitHub repository URL
2. Select platform (Vercel or Railway)
3. Optionally add environment variables
4. Click "Deploy"
5. Watch real-time build logs
6. Access your deployed app at the generated URL

## 🔑 Token Security

- Tokens are encrypted client-side with AES-256
- Stored in browser localStorage (never on server)
- Passed per-request in Authorization headers
- Server only proxies requests, never stores tokens
- You retain full ownership of all deployments

## 📚 Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture diagrams
- [IMPLEMENTATION_PLAN.md](documentation/IMPLEMENTATION_PLAN.md) — Development phases
- [Full Documentation](documentation/OneClick_Deploy_Documentation.md) — Complete system docs

## 🎯 Deployment Routing

| Framework Detected | Platform | Result |
|-------------------|----------|--------|
| Next.js | Vercel | *.vercel.app |
| React (CRA/Vite) | Vercel | *.vercel.app |
| Express/Node.js | Railway | *.railway.app |
| + "Include Database" | Railway | PostgreSQL provisioned |

## 🛣️ API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/deploy/vercel` | POST | Deploy to Vercel |
| `/api/deploy/railway` | POST | Deploy to Railway |
| `/api/deployments` | GET | List all deployments |
| `/api/deployments/:id` | DELETE | Delete deployment |
| `/api/deployments/:id/redeploy` | POST | Trigger redeploy |
| `/api/databases/railway` | POST | Provision PostgreSQL |
| `/api/auth/validate` | POST | Validate tokens |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the [4-layer architecture](.github/copilot-instructions.md)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built with ❤️ using Next.js, Express, Vercel, and Railway**
