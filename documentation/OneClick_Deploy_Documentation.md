# ONECLICK DEPLOY
## System Architecture & Project Documentation

**Next.js + Node.js Tech Stack | Vercel + Railway Infrastructure | GitHub URL Source Input**

> Version 2.0 | March 2026 | Pivoted from EC2 to Vercel/Railway

---

## 1. Executive Summary

OneClick Deploy is a full-stack web platform that enables developers to deploy GitHub repositories to **Vercel** (for frontend/Next.js) and **Railway** (for backends/databases) with a single click. By abstracting the complexity of platform configuration, environment variables, and CI/CD pipelines into an intuitive dashboard, the system reduces deployment time from manual configuration to seconds.

Users provide their own Vercel and Railway API tokens, ensuring full ownership of deployed resources with no shared rate limits or billing. The platform automatically detects project type (Next.js, Express, etc.) and routes to the appropriate deployment target.

| Attribute | Detail |
|-----------|--------|
| **Project Name** | OneClick Deploy |
| **Project Type** | Full-Stack Deployment Dashboard (Next.js + Express) |
| **Primary Users** | Developers, indie hackers, startups, educators |
| **Input** | GitHub repository URL |
| **Output** | Live URL on Vercel (*.vercel.app) or Railway (*.railway.app) |
| **Target Platforms** | Vercel (frontend), Railway (backend + PostgreSQL) |
| **Core Value** | Zero-config deployment — no platform console knowledge required |

---

## 2. Problem Statement

Deploying modern web applications today requires navigating multiple platforms, understanding CI/CD pipelines, configuring environment variables, and managing separate services for frontend, backend, and databases. This creates friction for developers who want to quickly ship projects.

### Pain Points Addressed

- Setting up Vercel projects requires understanding framework detection, build settings, and environment configuration
- Railway deployments need GraphQL API knowledge and service/environment management
- Managing environment variables across platforms is error-prone
- No unified view of all deployments across Vercel and Railway in one interface
- Database provisioning requires separate steps and connection string management

### How OneClick Deploy Solves This

- **One interface** — Unified dashboard for Vercel + Railway deployments
- **Auto-detection** — Automatically identifies Next.js, Express, or plain Node.js projects
- **Token-based auth** — Users own their deployments, no shared resources
- **Database included** — One-click PostgreSQL provisioning on Railway
- **Real-time feedback** — Live deployment logs and status updates

---

## 3. System Overview

The system consists of a Next.js 15 frontend dashboard, a Node.js/Express backend API, and integrations with Vercel REST API and Railway GraphQL API. Real-time updates flow via Socket.io and Vercel webhooks.

### High-Level Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Dashboard UI│     │ Backend API │     │   Vercel     │     │   Railway    │
│ Next.js 15 +│ ←→  │ Node.js +   │ ←→  │   REST API   │     │ GraphQL API  │
│ Tailwind    │     │ Express     │     │              │     │              │
└─────────────┘     └─────────────┘     └──────────────┘     └──────────────┘

User → Dashboard ↔ REST/WebSocket ↔ Backend API ↔ Platform APIs → Deployed Apps
```

### Communication Protocols

| From | To | Protocol | Purpose |
|------|----|----------|---------|
| Dashboard UI | Backend API | HTTP REST | Deploy, list, manage deployments |
| Dashboard UI | Backend API | WebSocket (Socket.io) | Real-time deployment status and logs |
| Backend API | Vercel | HTTPS REST | Create projects, trigger deployments |
| Backend API | Railway | HTTPS GraphQL | Create services, provision databases |
| Vercel | Backend API | Webhook (HTTPS) | Deployment status notifications |
| Backend API | GitHub | HTTPS REST | Validate repos, detect frameworks |

---

## 4. Component Breakdown

### 4.1 Frontend Dashboard (Next.js 15 — App Router)

The dashboard is a Next.js 15 application using the App Router and Tailwind CSS. All components follow the 4-layer architecture defined in the project guidelines.

| Component | Layer | Responsibility |
|-----------|-------|----------------|
| **TokenSetup** | Presentational | Configure Vercel/Railway API tokens, validate connectivity |
| **DeployForm** | Presentational | GitHub URL input, platform selection, branch picker, env vars |
| **DeploymentCard** | Presentational | Status badge, deployed URL, redeploy/delete actions |
| **DeploymentList** | Presentational | Tabbed view (All/Vercel/Railway), filters, refresh |
| **LogViewer** | Presentational | Terminal-style build log streaming |
| **EnvVarsEditor** | Presentational | Key-value editor with secret masking |
| **DatabaseCard** | Presentational | Connection status, credentials display, copy button |

### 4.2 Backend API (Node.js + Express)

The backend acts as a proxy between the dashboard and external APIs. It never stores user tokens permanently — they are passed per-request.

| Route | Method | Description |
|-------|--------|-------------|
| `/api/deploy/vercel` | POST | Deploy GitHub repo to Vercel |
| `/api/deploy/railway` | POST | Deploy GitHub repo to Railway |
| `/api/deployments` | GET | List all deployments from both platforms |
| `/api/deployments/:id` | GET | Get specific deployment details |
| `/api/deployments/:id` | DELETE | Cancel or delete deployment |
| `/api/deployments/:id/redeploy` | POST | Trigger redeployment |
| `/api/deployments/:id/logs` | GET | Fetch build logs |
| `/api/databases/railway` | POST | Provision PostgreSQL database |
| `/api/databases/railway` | GET | List provisioned databases |
| `/api/databases/:id/credentials` | GET | Get database connection string |
| `/api/webhooks/vercel` | POST | Receive Vercel deployment events |
| `/api/auth/validate` | POST | Validate Vercel/Railway tokens |

### 4.3 Vercel Service (vercelService.js)

Wraps the Vercel REST API v9 for project and deployment management.

| Function | Vercel Endpoint | Purpose |
|----------|-----------------|---------|
| `listProjects(token)` | GET /v9/projects | Get user's existing projects |
| `createProject(token, config)` | POST /v9/projects | Create new project linked to GitHub |
| `getProject(token, id)` | GET /v9/projects/:id | Get project details |
| `deleteProject(token, id)` | DELETE /v9/projects/:id | Remove project |
| `createDeployment(token, cfg)` | POST /v13/deployments | Trigger deployment |
| `getDeployment(token, id)` | GET /v13/deployments/:id | Get deployment status |
| `listDeployments(token, proj)` | GET /v6/deployments | List deployments for project |
| `setEnvVars(token, projId, vars)` | POST /v9/projects/:id/env | Configure environment variables |
| `getEnvVars(token, projId)` | GET /v9/projects/:id/env | List environment variables |

### 4.4 Railway Service (railwayService.js)

Wraps the Railway GraphQL API v2 for service and database management.

| Function | GraphQL Operation | Purpose |
|----------|-------------------|---------|
| `listProjects(token)` | Query: me.projects | Get user's projects |
| `createProject(token, name)` | Mutation: projectCreate | Create new project |
| `getProject(token, id)` | Query: project | Get project details |
| `deleteProject(token, id)` | Mutation: projectDelete | Remove project |
| `createService(token, cfg)` | Mutation: serviceCreate | Create service from GitHub repo |
| `getService(token, id)` | Query: service | Get service details |
| `redeployService(token, id)` | Mutation: serviceRedeploy | Trigger redeployment |
| `getDeployment(token, id)` | Query: deployment | Get deployment status |
| `getDeploymentLogs(token, id)` | Query: deploymentLogs | Fetch build logs |
| `createPostgres(token, projId)` | Mutation: pluginCreate | Provision PostgreSQL |
| `getDbCredentials(token, id)` | Query: plugin.variables | Get connection string |
| `setEnvVars(token, svcId, vars)` | Mutation: variableUpsert | Set environment variables |

### 4.5 GitHub Service (githubService.js)

Validates repositories and detects project frameworks for auto-routing.

| Function | Purpose |
|----------|---------|
| `validateRepoUrl(url)` | Check if repo exists and is accessible |
| `getPackageJson(url)` | Fetch package.json to detect dependencies |
| `detectFramework(url)` | Determine if Next.js, Express, React, etc. |
| `listBranches(url)` | Get available branches for deployment |

### 4.6 Deployment Orchestrator (deploymentOrchestrator.js)

High-level orchestration logic that routes deployments to the correct platform.

```javascript
async function orchestrateDeploy(config, tokens) {
  // 1. Validate GitHub repo exists
  await githubService.validateRepoUrl(config.githubUrl);
  
  // 2. Detect framework if not specified
  const framework = config.framework || await githubService.detectFramework(config.githubUrl);
  
  // 3. Route to appropriate platform
  if (framework === 'nextjs' || framework === 'react') {
    return await vercelService.createDeployment(tokens.vercel, config);
  } else {
    return await railwayService.createService(tokens.railway, config);
  }
}
```

---

## 5. Data Flow & Deployment Lifecycle

### Deploy to Vercel

1. **User submits** — GitHub URL, selects Vercel, optionally adds env vars
2. **Token validation** — Backend validates Vercel token with GET /v2/user
3. **Project creation** — POST /v9/projects creates project linked to GitHub
4. **Deployment trigger** — Vercel auto-deploys on project creation
5. **Webhook received** — Vercel POSTs to /api/webhooks/vercel on completion
6. **Real-time update** — Socket.io emits `deployment:ready` with URL
7. **UI updates** — DeploymentCard shows live URL (*.vercel.app)

### Deploy to Railway

1. **User submits** — GitHub URL, selects Railway, optionally includes database
2. **Token validation** — Backend validates Railway token via GraphQL { me { ... } }
3. **Project creation** — GraphQL mutation: projectCreate
4. **Service creation** — GraphQL mutation: serviceCreate with GitHub source
5. **Build starts** — Railway clones repo and runs build
6. **Polling** — deploymentPoller checks status every 5 seconds
7. **Status change** — Socket.io emits `deployment:ready` when successful
8. **UI updates** — DeploymentCard shows live URL (*.railway.app)

### Database Provisioning

1. **User clicks** "Include Database" or "Add Database" button
2. **Railway call** — GraphQL mutation: pluginCreate with type: "postgresql"
3. **Provisioning** — Railway creates managed Postgres instance (~30s)
4. **Credentials** — Connection string available via plugin.variables query
5. **UI display** — DatabaseCard shows status and masked credentials
6. **Copy action** — User can copy connection string to clipboard

---

## 6. Platform Requirements

### 6.1 Vercel Token Permissions

Users generate a Personal Access Token at vercel.com/account/tokens. Required scopes:

| Scope | Why Required |
|-------|--------------|
| Read projects | List existing projects |
| Write projects | Create new projects |
| Read deployments | View deployment status |
| Write deployments | Trigger deployments |
| Read env vars | View environment configuration |
| Write env vars | Set environment variables |

### 6.2 Railway Token Permissions

Users generate an API Token at railway.app/account/tokens. The token grants access to:

- All projects owned by the user
- Create/delete projects and services
- Provision databases (PostgreSQL, MySQL, Redis)
- View deployment logs
- Manage environment variables

### 6.3 No Server-Side Secrets

Unlike the previous EC2 implementation, this system stores **no platform credentials** on the server. All tokens are:

1. Entered by the user in the dashboard
2. Encrypted client-side with AES-256
3. Stored in browser localStorage
4. Sent per-request in Authorization headers
5. Passed through to platform APIs

This ensures users retain full ownership and there are no shared rate limits.

---

## 7. Environment Variables

### Frontend (.env.local)

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Yes | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:4000` | Yes | WebSocket URL |

### Backend (.env)

| Variable | Example | Required | Description |
|----------|---------|----------|-------------|
| `PORT` | `4000` | No | Server port (default: 4000) |
| `ENCRYPTION_KEY` | `32-character-key` | Yes | AES-256 key for any server-side encryption |
| `VERCEL_WEBHOOK_SECRET` | `whsec_xxx` | No | Vercel webhook signature secret |

---

## 8. Project Structure

```
oneclick-deploy/
│
├── oneclick_deploy/           # Next.js 15 frontend
│   ├── app/                   # App Router pages
│   │   ├── layout.tsx         # Root layout with providers
│   │   └── page.tsx           # Dashboard home page
│   │
│   ├── components/            # Layer 4: Presentational
│   │   ├── shared/            # Design system (Button, Card, etc.)
│   │   ├── deployment/        # DeployForm, DeploymentCard, etc.
│   │   ├── auth/              # TokenSetup, PlatformStatus
│   │   ├── database/          # DatabaseCard, DatabaseForm
│   │   └── providers/         # QueryProvider, SocketProvider
│   │
│   ├── domain/                # Layer 1: Types, schemas, utils
│   │   ├── deployment/
│   │   ├── auth/
│   │   └── database/
│   │
│   ├── data/                  # Layer 2: API repositories
│   │   ├── deployment/
│   │   ├── auth/
│   │   └── database/
│   │
│   ├── application/           # Layer 3: React Query hooks
│   │   ├── deployment/
│   │   ├── auth/
│   │   └── database/
│   │
│   └── lib/                   # Utilities
│       ├── socket.ts
│       ├── tokenStorage.ts
│       └── utils.ts
│
├── oneclick_api/              # Express backend
│   ├── index.js               # Server entry point
│   ├── routes/
│   │   ├── deploy.js
│   │   ├── deployments.js
│   │   ├── databases.js
│   │   └── webhooks/
│   │       └── vercel.js
│   │
│   └── services/
│       ├── vercelService.js
│       ├── railwayService.js
│       ├── githubService.js
│       ├── deploymentOrchestrator.js
│       └── deploymentPoller.js
│
├── docs/
│   └── ARCHITECTURE.md        # System architecture diagram
│
├── documentation/
│   ├── IMPLEMENTATION_PLAN.md
│   └── OneClick_Deploy_Documentation.md (this file)
│
└── .github/
    └── copilot-instructions.md
```

---

## 9. Technical Decisions & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| **Deployment Platform** | Vercel + Railway | Native Next.js support (Vercel), excellent DX for backends (Railway), managed databases |
| **No AWS** | Removed EC2 | Serverless platforms eliminate server management, auto-scaling, faster deploys |
| **User-owned Tokens** | Token per user | No shared rate limits, users own resources, no billing pass-through |
| **Client Token Storage** | Encrypted localStorage | Tokens never sent to server for storage, only passed through |
| **Framework Detection** | package.json scan | Auto-route to Vercel (frontend) or Railway (backend) based on dependencies |
| **Real-time Updates** | Webhooks + Polling | Vercel supports webhooks, Railway requires polling |
| **PostgreSQL on Railway** | Built-in plugin | One-click provisioning, managed backups, connection pooling |

---

## 10. Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid Vercel token | API returns 401, UI shows "Invalid token" with re-auth prompt |
| Invalid Railway token | GraphQL returns UNAUTHORIZED, UI shows error |
| GitHub repo not found | 404 response, UI shows "Repository not found or private" |
| Private repo | Vercel/Railway need repo access, prompt to make public or connect GitHub |
| Build failure | Logs streamed to LogViewer, status shows "Failed" with error details |
| Database provision failure | Railway error returned, UI shows specific error message |
| Webhook signature invalid | Backend rejects webhook, logs warning |
| Token expired | 401 on any call, UI prompts to re-enter token |

---

## 11. Security Considerations

| Area | Implementation |
|------|----------------|
| **Token Storage** | AES-256 encrypted in localStorage, key derived from user passphrase |
| **Token Transmission** | HTTPS only, Authorization header, never in URL params |
| **Webhook Verification** | Vercel webhooks verified with HMAC signature |
| **No Server Storage** | Backend never persists tokens, only passes through per-request |
| **CORS** | Configured for dashboard origin only |
| **Input Validation** | All inputs validated with Zod schemas |

---

## 12. Future Enhancements

| Feature | Description | Priority |
|---------|-------------|----------|
| **GitHub OAuth** | Connect GitHub account instead of pasting URLs | High |
| **Custom Domains** | Configure custom domains via Vercel/Railway APIs | Medium |
| **Deployment Rollback** | One-click revert to previous deployment | Medium |
| **Team Support** | Share deployments across team members | Low |
| **Cost Estimator** | Show estimated monthly cost for Railway services | Low |
| **Monitoring Integration** | Connect to Vercel Analytics / Railway metrics | Low |

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **Vercel** | Frontend deployment platform optimized for Next.js, React, Vue |
| **Railway** | Backend deployment platform with managed databases |
| **GraphQL** | Query language used by Railway API |
| **Webhook** | HTTP callback to notify of deployment events |
| **Socket.io** | Library for real-time bidirectional communication |
| **Personal Access Token** | API key for authenticating with Vercel/Railway |
| **Framework Detection** | Analyzing package.json to determine project type |

---

## 14. Migration from EC2 (v1.0)

This document replaces the previous "One-Click AWS Deployer" documentation. Key changes:

| Aspect | v1.0 (EC2) | v2.0 (Vercel/Railway) |
|--------|------------|----------------------|
| Infrastructure | AWS EC2 instances | Managed platforms |
| Deploy Time | 3-5 minutes | 30-90 seconds |
| Server Management | Manual (SSH, updates) | None |
| Scaling | Manual resize | Automatic |
| SSL/HTTPS | Manual Certbot | Automatic |
| Database | Self-managed on EC2 | Managed Railway PostgreSQL |
| Cost Model | Hourly (always on) | Pay-per-use |
| User Credentials | Shared AWS account | User's own tokens |

---

**End of Document**

*OneClick Deploy — System Documentation v2.0 — March 2026*
*Pivoted from AWS EC2 to Vercel/Railway*
