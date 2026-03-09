# System Architecture

## Overview

OneClick Deploy is a full-stack application that automates deployment of GitHub repositories to **Vercel** (for frontend/Next.js apps) and **Railway** (for backend/databases). Users provide their own API tokens for full ownership of deployments. The system follows a clean 4-layer architecture with real-time updates via WebSockets and webhooks.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER (Browser)                                   │
│                                    │                                          │
│                          http://localhost:3000                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 15)                                 │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                    LAYER 4: PRESENTATIONAL                              │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │DeployForm│  │Deployment│  │Deployment│  │LogViewer │               │  │
│  │  │          │  │   Card   │  │   List   │  │          │               │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                             │  │
│  │  │TokenSetup│  │ EnvVars  │  │ Database │                             │  │
│  │  │          │  │  Editor  │  │   Card   │                             │  │
│  │  └──────────┘  └──────────┘  └──────────┘                             │  │
│  │                                                                         │  │
│  │  ┌──────────────────────────────────────────────────────────┐          │  │
│  │  │          SHARED COMPONENTS (Button, Card, etc.)           │          │  │
│  │  └──────────────────────────────────────────────────────────┘          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                         │
│                                     ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                      LAYER 3: APPLICATION                               │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐     │  │
│  │  │  useDeployments  │  │  useDeployToX    │  │useRealtimeUpdates│     │  │
│  │  │                  │  │                  │  │                  │     │  │
│  │  │   React Query    │  │   Mutations      │  │    Socket.io     │     │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘     │  │
│  │  ┌──────────────────┐  ┌──────────────────┐                           │  │
│  │  │    useTokens     │  │  useDatabases    │                           │  │
│  │  │                  │  │                  │                           │  │
│  │  │  Token Storage   │  │  Railway Postgres│                           │  │
│  │  └──────────────────┘  └──────────────────┘                           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                         │
│                                     ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         LAYER 2: DATA                                   │  │
│  │  ┌────────────────────────────────────────────────────────────────┐   │  │
│  │  │                   deployment.repository.ts                      │   │  │
│  │  │  • deployToVercel()   • deployToRailway()   • getLogs()        │   │  │
│  │  │  • getAll()           • redeploy()          • cancel()         │   │  │
│  │  └────────────────────────────────────────────────────────────────┘   │  │
│  │  ┌────────────────────────────────────────────────────────────────┐   │  │
│  │  │                     auth.repository.ts                          │   │  │
│  │  │  • validateVercelToken()    • validateRailwayToken()           │   │  │
│  │  └────────────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                         │
│                                     ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                        LAYER 1: DOMAIN                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │    Types     │  │   Schemas    │  │    Utils     │                 │  │
│  │  │  Deployment  │  │  Zod Valid.  │  │ statusHelpers│                 │  │
│  │  │  DeployConf  │  │deployConfig  │  │ tokenEncrypt │                 │  │
│  │  │  Platform    │  │tokenSchema   │  │              │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    │ REST API                           │ WebSocket
                    │ http://localhost:4000/api          │ ws://localhost:4000
                    ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express.js)                                  │
│                                                                               │
│  ┌─────────────────────────────┐    ┌──────────────────────────────────┐    │
│  │          ROUTES             │    │           SOCKET.IO               │    │
│  │  ┌────────────────────┐    │    │  ┌──────────────────────────┐    │    │
│  │  │ POST /deploy/vercel│    │    │  │   Connection Handler     │    │    │
│  │  │ POST /deploy/railway│   │    │  │   • subscribe:deployment │    │    │
│  │  │ GET  /deployments  │    │    │  │   • deployment:status    │    │    │
│  │  │ POST /databases    │    │    │  │   • deployment:logs      │    │    │
│  │  │ POST /webhooks/*   │    │    │  │   • deployment:ready     │    │    │
│  │  └────────────────────┘    │    │  └──────────────────────────┘    │    │
│  └─────────────────────────────┘    └──────────────────────────────────┘    │
│                    │                              │                          │
│                    ▼                              ▼                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           SERVICES                                      │ │
│  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐         │ │
│  │  │vercelService │  │  railwayService  │  │ deploymentPoller │         │ │
│  │  │              │  │                  │  │                  │         │ │
│  │  │• createProj  │  │• createProject   │  │• pollDeployment  │         │ │
│  │  │• deploy      │  │• createService   │  │• emitStatusChange│         │ │
│  │  │• getDeploy   │  │• createPostgres  │  │                  │         │ │
│  │  │• setEnvVars  │  │• getCredentials  │  │ Emits updates    │         │ │
│  │  └──────────────┘  └──────────────────┘  └──────────────────┘         │ │
│  │  ┌──────────────┐  ┌──────────────────┐                               │ │
│  │  │githubService │  │  orchestrator    │                               │ │
│  │  │              │  │                  │                               │ │
│  │  │• validateRepo│  │• detectFramework │                               │ │
│  │  │• getBranches │  │• routeToPlatform │                               │ │
│  │  └──────────────┘  └──────────────────┘                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     VERCEL      │      │     RAILWAY     │      │     GITHUB      │
│                 │      │                 │      │                 │
│ REST API v9     │      │ GraphQL API v2  │      │ REST API        │
│                 │      │                 │      │                 │
│ • Projects      │      │ • Projects      │      │ • Validate repo │
│ • Deployments   │      │ • Services      │      │ • List branches │
│ • Env Vars      │      │ • PostgreSQL    │      │ • Detect type   │
│ • Domains       │      │ • Env Vars      │      │                 │
│                 │      │ • Logs          │      │                 │
│ Webhooks:       │      │                 │      │                 │
│ deployment.*    │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐      ┌─────────────────┐
│  Deployed App   │      │  Deployed App   │
│  (Next.js)      │      │  (Node.js/DB)   │
│                 │      │                 │
│  *.vercel.app   │      │  *.railway.app  │
└─────────────────┘      └─────────────────┘
```

## Data Flow

### 1. Deploy to Vercel Flow

```
User → DeployForm → useDeployToVercel() → repository.deployToVercel()
    → POST /api/deploy/vercel → vercelService.createProject()
    → Vercel API → Project Created → Deployment Triggered
    → Webhook received → Socket.io emit → UI updates
```

### 2. Deploy to Railway Flow

```
User → DeployForm → useDeployToRailway() → repository.deployToRailway()
    → POST /api/deploy/railway → railwayService.createProject()
    → Railway GraphQL → Service Created → Build Started
    → Poller detects status → Socket.io emit → UI updates
```

### 3. Real-time Updates Flow

```
Vercel: Webhook POST /api/webhooks/vercel
    ↓
Event: deployment.ready | deployment.error
    ↓
io.emit('deployment:ready', { url })
    ↓
Frontend: React Query cache updated
    ↓
UI re-renders with deployed URL


Railway: deploymentPoller polls every 5s
    ↓
Status change detected (BUILDING → SUCCESS)
    ↓
io.emit('deployment:ready', { url })
    ↓
Frontend updates
```

### 4. Database Provisioning Flow

```
User clicks "Add Database" → DatabaseProvisionForm
    ↓
useProvisionDatabase() mutation
    ↓
POST /api/databases/railway
    ↓
railwayService.createPostgresDatabase()
    ↓
Railway GraphQL mutation: pluginCreate
    ↓
Returns connection string
    ↓
DatabaseCard shows credentials (masked)
```

## Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Domain** | `domain/` | Types, schemas, pure business logic (no framework code) |
| **Data** | `data/` | API calls, repository pattern (ONLY layer calling external APIs) |
| **Application** | `application/` | React Query hooks, orchestration (no JSX, no raw fetch) |
| **Presentational** | `components/` | UI components, user interaction (no business logic) |

## Key Technologies

| Technology | Purpose |
|------------|---------|
| **React Query** | Server state management, caching, background refetching |
| **Socket.io** | Real-time bidirectional communication |
| **Zod** | Runtime type validation for API responses and configs |
| **Vercel REST API** | Deploy Next.js apps, manage projects, env vars |
| **Railway GraphQL** | Deploy backends, provision PostgreSQL, manage services |

## Authentication Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    Token Management                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User enters Vercel/Railway tokens in TokenSetup UI         │
│                         ↓                                       │
│  2. Tokens encrypted with AES-256 (user-derived key)           │
│                         ↓                                       │
│  3. Stored in encrypted localStorage                           │
│                         ↓                                       │
│  4. On API call: tokens decrypted → sent in Authorization header│
│                         ↓                                       │
│  5. Backend proxies call to Vercel/Railway with user's token   │
│                                                                 │
│  Result: User retains full ownership of all deployments        │
│          No shared API limits, no central billing              │
└────────────────────────────────────────────────────────────────┘
```

## Deployment Targets

| App Type | Platform | Detection Method |
|----------|----------|------------------|
| Next.js | **Vercel** | `package.json` has `next` dependency |
| React (CRA/Vite) | **Vercel** | `react-scripts` or `vite` + no `next` |
| Express/Node.js | **Railway** | `express` dependency, or no frontend framework |
| PostgreSQL | **Railway** | User selects "Include Database" option |

## Environment Variables

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Yes | Backend API URL |
| `ENCRYPTION_KEY` | `32-char-key-here` | Yes | AES-256 key for token encryption |
| `PORT` | `4000` | No | Backend port (default: 4000) |

## Security Considerations

| Area | Implementation |
|------|----------------|
| **Token Storage** | AES-256 encrypted in localStorage, never plain text |
| **Token Transmission** | Sent only in Authorization header over HTTPS |
| **Webhook Verification** | Vercel webhooks verified with signature |
| **No Server Secrets** | All platform tokens owned by user, not stored on backend |
| **API Proxying** | Backend never stores tokens, only passes through |

## API Routes Summary

### Deploy Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/deploy/vercel` | POST | Deploy GitHub repo to Vercel |
| `/api/deploy/railway` | POST | Deploy GitHub repo to Railway |

### Deployment Management
| Route | Method | Description |
|-------|--------|-------------|
| `/api/deployments` | GET | List all deployments (both platforms) |
| `/api/deployments/:id` | GET | Get deployment details |
| `/api/deployments/:id` | DELETE | Cancel/delete deployment |
| `/api/deployments/:id/redeploy` | POST | Trigger redeploy |
| `/api/deployments/:id/logs` | GET | Get deployment logs |

### Database Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/databases/railway` | POST | Provision PostgreSQL |
| `/api/databases/railway` | GET | List databases |
| `/api/databases/:id/credentials` | GET | Get connection string |

### Webhook Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhooks/vercel` | POST | Receive Vercel deployment events |

## Comparison: EC2 vs Vercel/Railway

| Aspect | EC2 (Old) | Vercel/Railway (New) |
|--------|-----------|---------------------|
| Deploy Time | 3-5 minutes | 30-90 seconds |
| Server Management | Manual (SSH, updates) | None (managed) |
| Scaling | Manual (resize instance) | Auto-scaling |
| Cost Model | Hourly (always running) | Pay-per-use |
| SSL/HTTPS | Manual (Certbot) | Automatic |
| Preview Deployments | None | Automatic (Vercel) |
| Database | Self-managed | Managed (Railway) |
| CI/CD | Custom setup | Built-in |
