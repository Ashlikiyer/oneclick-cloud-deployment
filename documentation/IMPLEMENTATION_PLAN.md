# OneClick Deploy - Vercel/Railway Implementation Plan

## Overview
This plan pivots from EC2 deployment to **Vercel + Railway**, enabling users to deploy their GitHub repositories to modern serverless and container platforms. Users provide their own API tokens for full ownership of deployments.

**Key Benefits Over EC2:**
- Zero server management
- Faster deploys (seconds vs. minutes)
- Built-in CI/CD with auto-redeploy
- Preview deployments for branches
- Cost-efficient (free tiers available)

---

## 📊 Progress Tracker

| Phase | Name | Status | Completed |
|-------|------|--------|-----------|
| 1 | Platform Setup & Auth | ⬜ NOT STARTED | - |
| 2 | Domain & Types Refactor | ⬜ NOT STARTED | - |
| 3 | Backend Services | ⬜ NOT STARTED | - |
| 4 | Frontend Refactor | ⬜ NOT STARTED | - |
| 5 | Real-time & Webhooks | ⬜ NOT STARTED | - |
| 6 | Database Provisioning | ⬜ NOT STARTED | - |

---

## Architecture Overview

### Deployment Targets
| App Type | Platform | API Used |
|----------|----------|----------|
| Next.js / Frontend | **Vercel** | Vercel REST API v9 |
| Node.js / Express / Backend | **Railway** | Railway GraphQL API |
| PostgreSQL Database | **Railway** | Railway GraphQL API |

### Authentication Flow
```
User enters API tokens → Stored in encrypted session/localStorage
                      → Backend proxies API calls with user tokens
                      → User retains full ownership of deployments
```

### Token Requirements
| Platform | Token Type | How to Get |
|----------|------------|------------|
| Vercel | Personal Access Token | vercel.com/account/tokens |
| Railway | API Token | railway.app/account/tokens |

---

## Phase 1: Platform Setup & Auth
**Goal:** Set up token management and validate API connectivity  
**Success Criteria:** Can list user's existing Vercel projects and Railway services via API

### Tasks

#### 1.1 Create Token Management System
- [ ] Create `domain/auth/auth.types.ts`:
  - `PlatformTokens` interface (vercelToken?, railwayToken?)
  - `TokenValidationResult` interface
  - `PlatformConnection` interface
- [ ] Create `domain/auth/auth.schema.ts` — Zod schemas for token validation
- [ ] Create `domain/auth/auth.utils.ts` — Token encryption/decryption helpers

#### 1.2 Implement Token Storage
- [ ] Create `lib/tokenStorage.ts`:
  - `saveTokens(tokens)` — Encrypt and store in localStorage
  - `getTokens()` — Decrypt and retrieve
  - `clearTokens()` — Remove all tokens
  - `hasToken(platform)` — Check if specific platform token exists
- [ ] Use AES-256 encryption with user-derived key

#### 1.3 Build Token Setup UI
- [ ] Create `components/auth/TokenSetup.tsx`:
  - Vercel token input with visibility toggle
  - Railway token input with visibility toggle
  - "Validate" button per platform
  - Connection status indicators (✅ Connected / ❌ Invalid)
  - Link to token generation pages
- [ ] Create `components/auth/PlatformStatus.tsx` — Shows connected platforms

#### 1.4 Implement Token Validation
- [ ] Create `data/auth/auth.repository.ts`:
  - `validateVercelToken(token)` — GET /v2/user
  - `validateRailwayToken(token)` — GraphQL query { me { ... } }
- [ ] Return user info on success (name, email, teamId)

#### 1.5 Update Environment Configuration
- [ ] Update `.env.example`:
```env
# App Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
ENCRYPTION_KEY=your-32-char-encryption-key

# Optional: Default tokens for development
VERCEL_TOKEN=
RAILWAY_TOKEN=
```
- [ ] Remove all AWS-related environment variables

---

## Phase 2: Domain & Types Refactor
**Goal:** Update domain types for Vercel/Railway deployment model  
**Success Criteria:** All types compile, no EC2-specific types remain

### Tasks

#### 2.1 Create Platform-Specific Types
- [ ] Create `domain/vercel/vercel.types.ts`:
```typescript
interface VercelProject {
  id: string;
  name: string;
  framework: 'nextjs' | 'react' | 'vue' | 'other';
  latestDeployment?: VercelDeployment;
}

interface VercelDeployment {
  id: string;
  url: string;
  state: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  createdAt: number;
  buildingAt?: number;
  readyAt?: number;
}
```

- [ ] Create `domain/railway/railway.types.ts`:
```typescript
interface RailwayProject {
  id: string;
  name: string;
  services: RailwayService[];
  environments: RailwayEnvironment[];
}

interface RailwayService {
  id: string;
  name: string;
  source: { repo: string } | { image: string };
}

interface RailwayDeployment {
  id: string;
  status: 'BUILDING' | 'DEPLOYING' | 'SUCCESS' | 'FAILED' | 'CRASHED';
  createdAt: string;
}
```

#### 2.2 Update Unified Deployment Types
- [ ] Refactor `domain/deployment/deployment.types.ts`:
```typescript
type DeploymentPlatform = 'vercel' | 'railway';

interface Deployment {
  id: string;
  platform: DeploymentPlatform;
  projectName: string;
  githubUrl: string;
  branch: string;
  status: DeploymentStatus;
  url?: string;                    // Deployed URL
  createdAt: string;
  updatedAt: string;
  // Platform-specific IDs
  vercelProjectId?: string;
  vercelDeploymentId?: string;
  railwayProjectId?: string;
  railwayServiceId?: string;
}

type DeploymentStatus = 
  | 'queued'
  | 'building' 
  | 'deploying'
  | 'ready'
  | 'failed'
  | 'canceled';
```

#### 2.3 Create Deploy Config Types
- [ ] Update `domain/deployment/deployment.schema.ts`:
```typescript
const vercelDeployConfigSchema = z.object({
  platform: z.literal('vercel'),
  githubUrl: z.string().url(),
  branch: z.string().default('main'),
  projectName: z.string().optional(),
  framework: z.enum(['nextjs', 'react', 'vue', 'other']).default('nextjs'),
  envVars: z.record(z.string()).optional(),
});

const railwayDeployConfigSchema = z.object({
  platform: z.literal('railway'),
  githubUrl: z.string().url(),
  branch: z.string().default('main'),
  projectName: z.string().optional(),
  envVars: z.record(z.string()).optional(),
  includeDatabase: z.boolean().default(false),
  databaseType: z.enum(['postgresql', 'mysql', 'redis']).optional(),
});

const deployConfigSchema = z.discriminatedUnion('platform', [
  vercelDeployConfigSchema,
  railwayDeployConfigSchema,
]);
```

#### 2.4 Remove EC2-Specific Code
- [ ] Delete `oneclick_api/services/ec2Service.js`
- [ ] Delete `oneclick_api/services/userDataScript.js`
- [ ] Delete `scripts/ec2-bootstrap.sh`
- [ ] Remove EC2 types from `deployment.types.ts`
- [ ] Update `deployment.utils.ts` — remove EC2 utilities

---

## Phase 3: Backend Services
**Goal:** Implement Vercel and Railway API integrations  
**Success Criteria:** Can deploy a Next.js app to Vercel and a Node.js app to Railway via API

### Tasks

#### 3.1 Implement Vercel Service
- [ ] Create `oneclick_api/services/vercelService.js`:
```javascript
const VERCEL_API = 'https://api.vercel.com';

export const vercelService = {
  // Projects
  async listProjects(token) { ... },
  async createProject(token, config) { ... },
  async getProject(token, projectId) { ... },
  async deleteProject(token, projectId) { ... },
  
  // Deployments
  async createDeployment(token, projectId, config) { ... },
  async getDeployment(token, deploymentId) { ... },
  async listDeployments(token, projectId) { ... },
  async cancelDeployment(token, deploymentId) { ... },
  
  // Domains
  async getDomains(token, projectId) { ... },
  
  // Environment Variables
  async setEnvVars(token, projectId, envVars) { ... },
  async getEnvVars(token, projectId) { ... },
};
```

#### 3.2 Implement Railway Service
- [ ] Create `oneclick_api/services/railwayService.js`:
```javascript
const RAILWAY_API = 'https://backboard.railway.app/graphql/v2';

export const railwayService = {
  // Projects
  async listProjects(token) { ... },
  async createProject(token, name) { ... },
  async getProject(token, projectId) { ... },
  async deleteProject(token, projectId) { ... },
  
  // Services
  async createService(token, projectId, config) { ... },
  async getService(token, serviceId) { ... },
  async redeployService(token, serviceId) { ... },
  
  // Deployments
  async getDeployment(token, deploymentId) { ... },
  async getDeploymentLogs(token, deploymentId) { ... },
  
  // Databases
  async createPostgresDatabase(token, projectId) { ... },
  async getDatabaseCredentials(token, pluginId) { ... },
  
  // Environment Variables
  async setEnvVars(token, serviceId, envVars) { ... },
};
```

#### 3.3 Update API Routes
- [ ] Refactor `oneclick_api/routes/deploy.js`:
  - `POST /api/deploy/vercel` — Deploy to Vercel
  - `POST /api/deploy/railway` — Deploy to Railway
  - Both accept user token in Authorization header

- [ ] Create `oneclick_api/routes/projects.js`:
  - `GET /api/projects/vercel` — List Vercel projects
  - `GET /api/projects/railway` — List Railway projects
  - `DELETE /api/projects/:platform/:id` — Delete project

- [ ] Refactor `oneclick_api/routes/instances.js` → `deployments.js`:
  - `GET /api/deployments` — List all deployments (both platforms)
  - `GET /api/deployments/:id` — Get deployment details
  - `DELETE /api/deployments/:id` — Cancel/delete deployment
  - `POST /api/deployments/:id/redeploy` — Trigger redeploy

- [ ] Create `oneclick_api/routes/databases.js`:
  - `POST /api/databases/railway` — Provision PostgreSQL
  - `GET /api/databases/railway` — List databases
  - `GET /api/databases/:id/credentials` — Get connection string

#### 3.4 Implement Deployment Orchestration
- [ ] Create `oneclick_api/services/deploymentOrchestrator.js`:
```javascript
export async function orchestrateDeploy(config, tokens) {
  // 1. Validate GitHub repo exists and is accessible
  // 2. Detect project type (Next.js, Node.js, etc.)
  // 3. Route to appropriate platform service
  // 4. Create project if needed
  // 5. Configure environment variables
  // 6. Trigger deployment
  // 7. Return deployment ID for tracking
}
```

#### 3.5 Add GitHub Repo Validation
- [ ] Create `oneclick_api/services/githubService.js`:
  - `validateRepoUrl(url)` — Check repo exists and is public
  - `detectFramework(url)` — Read package.json to detect Next.js/Express/etc.
  - `getBranches(url)` — List available branches

---

## Phase 4: Frontend Refactor
**Goal:** Update dashboard for Vercel/Railway deployments  
**Success Criteria:** Can deploy to Vercel or Railway from UI, see deployment status

### Tasks

#### 4.1 Update Repository Layer
- [ ] Refactor `data/deployment/deployment.repository.ts`:
```typescript
export const deploymentRepository = {
  // Deploy
  deployToVercel: (config: VercelDeployConfig) => Promise<Deployment>,
  deployToRailway: (config: RailwayDeployConfig) => Promise<Deployment>,
  
  // Read
  getAll: () => Promise<Deployment[]>,
  getById: (id: string) => Promise<Deployment>,
  getVercelProjects: () => Promise<VercelProject[]>,
  getRailwayProjects: () => Promise<RailwayProject[]>,
  
  // Actions
  redeploy: (id: string) => Promise<Deployment>,
  cancel: (id: string) => Promise<void>,
  delete: (id: string) => Promise<void>,
  
  // Logs
  getLogs: (id: string) => Promise<string>,
};
```

#### 4.2 Update Application Hooks
- [ ] Refactor `application/deployment/useDeployment.ts`:
  - `useDeployToVercel()` — Mutation hook for Vercel deploys
  - `useDeployToRailway()` — Mutation hook for Railway deploys
  - `useDeployments()` — Query hook for all deployments
  - `useDeploymentLogs(id)` — Query hook for logs

- [ ] Create `application/auth/useAuth.ts`:
  - `useTokens()` — Get/set platform tokens
  - `useValidateToken(platform)` — Validate token mutation
  - `usePlatformStatus()` — Which platforms are connected

#### 4.3 Build Updated DeployForm
- [ ] Refactor `components/deployment/DeployForm.tsx`:
  - Platform selector (Vercel / Railway)
  - GitHub URL input
  - Branch selector (fetch from GitHub)
  - Project name input
  - Framework auto-detection
  - Environment variables editor (key-value pairs)
  - "Include Database" checkbox (Railway only)
  - Deploy button with platform-specific styling

#### 4.4 Build Updated DeploymentCard
- [ ] Refactor `components/deployment/DeploymentCard.tsx`:
  - Platform icon (Vercel triangle / Railway icon)
  - Project name and deployed URL
  - Status badge with platform-specific states
  - "View Logs" button
  - "Open" button (link to deployed app)
  - "Redeploy" button
  - "Delete" button
  - Environment indicator (production/preview)

#### 4.5 Update StatusBadge
- [ ] Refactor `components/shared/StatusBadge.tsx`:
```typescript
// New status mappings
const statusColors = {
  queued: 'bg-yellow-100 text-yellow-800',
  building: 'bg-blue-100 text-blue-800',
  deploying: 'bg-indigo-100 text-indigo-800',
  ready: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  canceled: 'bg-gray-100 text-gray-800',
};
```

#### 4.6 Build Environment Variables Editor
- [ ] Create `components/deployment/EnvVarsEditor.tsx`:
  - Add/remove key-value rows
  - "Secret" toggle (masks value)
  - Import from .env file
  - Validation for key format

#### 4.7 Update Main Page Layout
- [ ] Refactor `app/page.tsx`:
  - Token setup prompt (if no tokens configured)
  - Platform connection status bar
  - Tab navigation: All / Vercel / Railway
  - Filter by status
  - DeployForm in modal or sidebar

---

## Phase 5: Real-time & Webhooks
**Goal:** Live deployment status updates without polling  
**Success Criteria:** UI updates automatically when deployment completes

### Tasks

#### 5.1 Set Up Vercel Webhooks
- [ ] Create `oneclick_api/routes/webhooks/vercel.js`:
  - `POST /api/webhooks/vercel` — Receive deployment events
  - Verify webhook signature
  - Events: `deployment.created`, `deployment.ready`, `deployment.error`
- [ ] Document webhook setup in Vercel dashboard

#### 5.2 Set Up Railway Webhooks (if available)
- [ ] Research Railway webhook support
- [ ] Implement webhook handler if supported
- [ ] Fallback to polling if not

#### 5.3 Implement Polling Fallback
- [ ] Create `oneclick_api/services/deploymentPoller.js`:
  - Poll active deployments every 5 seconds
  - Stop polling when deployment reaches terminal state
  - Emit Socket.io events on status change

#### 5.4 Update Socket.io Events
- [ ] Refactor socket events:
```typescript
// Server → Client
'deployment:created'   { deployment }
'deployment:building'  { deploymentId, progress? }
'deployment:ready'     { deploymentId, url }
'deployment:failed'    { deploymentId, error }
'deployment:logs'      { deploymentId, logLine }

// Client → Server
'subscribe:deployment' { deploymentId }
'unsubscribe:deployment' { deploymentId }
```

#### 5.5 Update Frontend Socket Integration
- [ ] Refactor `application/deployment/useSocketDeployment.ts`:
  - Handle new event types
  - Update React Query cache on events
  - Auto-subscribe when viewing deployment

#### 5.6 Update LogViewer
- [ ] Refactor `components/deployment/LogViewer.tsx`:
  - Stream logs in real-time via Socket.io
  - Build phase labels (Installing, Building, Deploying)
  - Error highlighting
  - Auto-scroll to bottom
  - "Download Logs" button

---

## Phase 6: Database Provisioning
**Goal:** One-click PostgreSQL database on Railway  
**Success Criteria:** Can provision database and see connection string

### Tasks

#### 6.1 Build Database Types
- [ ] Create `domain/database/database.types.ts`:
```typescript
interface Database {
  id: string;
  platform: 'railway';
  type: 'postgresql' | 'mysql' | 'redis';
  name: string;
  projectId: string;
  status: 'provisioning' | 'available' | 'failed';
  connectionString?: string;
  createdAt: string;
}
```

#### 6.2 Build Database UI
- [ ] Create `components/database/DatabaseCard.tsx`:
  - Database type icon
  - Connection status
  - "Show Credentials" button (masked by default)
  - Copy connection string button
  - Delete button

- [ ] Create `components/database/DatabaseProvisionForm.tsx`:
  - Database type selector
  - Name input
  - Link to existing Railway project (optional)
  - Provision button

#### 6.3 Implement Database Hooks
- [ ] Create `application/database/useDatabase.ts`:
  - `useDatabases()` — List all databases
  - `useProvisionDatabase()` — Create database mutation
  - `useDatabaseCredentials(id)` — Fetch credentials

#### 6.4 Add Database Tab to Dashboard
- [ ] Add "Databases" tab to main navigation
- [ ] List provisioned databases with DatabaseCard
- [ ] "New Database" button opens DatabaseProvisionForm

---

## Post-Implementation Checklist

### Documentation
- [ ] Update README.md with new setup instructions
- [ ] Document Vercel token generation steps
- [ ] Document Railway token generation steps
- [ ] Add API endpoint documentation
- [ ] Create troubleshooting guide

### Security Review
- [ ] Verify token encryption implementation
- [ ] Audit token storage (no plain text)
- [ ] Review webhook signature validation
- [ ] Ensure tokens never logged

### Testing
- [ ] Test Vercel deployment flow end-to-end
- [ ] Test Railway deployment flow end-to-end
- [ ] Test database provisioning
- [ ] Test with various frameworks (Next.js, Express, etc.)
- [ ] Test error handling (invalid token, failed deploy)

### Code Cleanup
- [ ] Remove all AWS/EC2 related code
- [ ] Update all imports and barrel exports
- [ ] Run `npm run build` — zero errors
- [ ] Run lint and fix issues

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Platform Setup & Auth | 4-6 hours |
| Phase 2: Domain & Types Refactor | 2-3 hours |
| Phase 3: Backend Services | 10-14 hours |
| Phase 4: Frontend Refactor | 8-12 hours |
| Phase 5: Real-time & Webhooks | 4-6 hours |
| Phase 6: Database Provisioning | 4-6 hours |
| **Total** | **32-47 hours** |

---

## Dependencies Between Phases

```
Phase 1 (Platform Setup & Auth)
    │
    ├──────────────────────────────┐
    ▼                              ▼
Phase 2 (Domain & Types)    Phase 3 (Backend Services)
    │                              │
    └──────────────┬───────────────┘
                   ▼
            Phase 4 (Frontend Refactor)
                   │
                   ▼
            Phase 5 (Real-time & Webhooks)
                   │
                   ▼
            Phase 6 (Database Provisioning)
```

---

## API Reference

### Vercel API Endpoints Used
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v9/projects` | GET | List projects |
| `/v9/projects` | POST | Create project |
| `/v13/deployments` | POST | Create deployment |
| `/v13/deployments/:id` | GET | Get deployment status |
| `/v9/projects/:id/env` | POST | Set env vars |

### Railway GraphQL Queries Used
```graphql
# List projects
query { me { projects { edges { node { id name } } } } }

# Create project
mutation { projectCreate(input: { name: $name }) { id } }

# Create service from repo
mutation { serviceCreate(input: { projectId: $projectId, source: { repo: $repo } }) { id } }

# Get deployment logs
query { deploymentLogs(deploymentId: $id) { logs } }

# Create PostgreSQL
mutation { pluginCreate(input: { projectId: $projectId, type: "postgresql" }) { id } }
```

---

*Pivoted from AWS EC2 to Vercel/Railway — March 2026*
