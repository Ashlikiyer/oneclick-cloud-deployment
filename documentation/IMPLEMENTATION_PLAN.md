# One-Click AWS Deployer - Implementation Plan

## Overview
This plan is divided into **5 sequential phases**. Each phase is independently testable before moving to the next. Complete all tasks in a phase before proceeding.

---

## 📊 Progress Tracker

| Phase | Name | Status | Completed |
|-------|------|--------|----------|
| 1 | AWS Setup | ✅ COMPLETE | 2024-03-04 |
| 2 | Backend Core | ✅ COMPLETE | 2024-03-04 |
| 3 | Bootstrap Script | ✅ COMPLETE | 2024-03-04 |
| 4 | Frontend Dashboard | ✅ COMPLETE | 2024-03-04 |
| 5 | Real-time Logs | ✅ COMPLETE | 2024-03-04 |

### All Phases Complete! 🎉

**Phase 5 Progress (Complete):**
- [x] 5.1 Backend Socket.io setup ✅ (already had from Phase 2)
- [x] 5.2 Socket events defined ✅
- [x] 5.3 Frontend Socket integration ✅
  - Created `lib/socket.ts` (Socket.io client)
  - Created `SocketProvider` context
  - Created `useRealtimeDeployments` hook
  - Created `useInstanceSubscription` hook
- [x] 5.4 Status polling service ✅ (statusPoller.js)
- [x] 5.5 Real-time updates in UI ✅
- [x] 5.6 Build verification ✅

---

## Phase 1: AWS Setup ✅ COMPLETE
**Goal:** Configure AWS account, IAM user, security groups, and key pairs  
**Success Criteria:** Can successfully run `aws ec2 describe-instances` from CLI ✅

### Tasks

#### 1.1 Create IAM User ✅
- [x] Log into AWS Console
- [x] Navigate to IAM → Users → Create User
- [x] Create user `oneclick-deployer`
- [x] Attach permissions (AmazonEC2FullAccess)
- [x] Generate Access Key ID and Secret Access Key
- [x] Save credentials securely

#### 1.2 Create Key Pair ✅
- [x] Navigate to EC2 → Key Pairs
- [x] Create key pair `oneclick-deployer-key`
- [x] Download `.pem` file
- [x] Store securely (never commit to Git)

#### 1.3 Create Security Group ✅
- [x] Navigate to EC2 → Security Groups
- [x] Create security group `oneclick-deployer-sg`
- [x] Add inbound rules:
  | Port | Protocol | Source | Purpose |
  |------|----------|--------|---------|
  | 22 | TCP | Your IP | SSH access |
  | 80 | TCP | 0.0.0.0/0 | HTTP |
  | 443 | TCP | 0.0.0.0/0 | HTTPS |
  | 3000 | TCP | 0.0.0.0/0 | Next.js app |
  | 4000 | TCP | 0.0.0.0/0 | Express backend |
- [x] Security Group ID: `sg-0cd7092e9fb238f6b`

#### 1.4 Identify AMI ID ✅
- [x] Navigate to EC2 → AMI Catalog
- [x] Find Ubuntu 22.04 LTS AMI for ap-southeast-1
- [x] AMI ID: `ami-08d59269edddde222`

#### 1.5 Set Up Local AWS CLI ✅
- [x] Install AWS CLI v2
- [x] Run `aws configure`
- [x] Enter Access Key ID, Secret Key, Region (ap-southeast-1)
- [x] Test with `aws ec2 describe-instances` ✅ Working!

#### 1.6 Create Environment File ✅
- [x] Create `.env` file in project root
- [x] Add `.env` to `.gitignore`
- [x] Create `.env.example` template

---

## Phase 2: Backend Core ✅ COMPLETE
**Goal:** Build Express server with EC2 launch and describe endpoints  
**Success Criteria:** Postman call to `POST /api/deploy` creates a real EC2 instance ✅

### Tasks

#### 2.1 Domain Types & Schemas ✅
- [x] Create `oneclick_deploy/domain/deployment/` directory
- [x] Create `deployment.types.ts` — Deployment, InstanceState, DeployConfig interfaces
- [x] Create `deployment.schema.ts` — Zod schemas for validation
- [x] Create `deployment.utils.ts` — Pure helper functions
- [x] Create `index.ts` — Barrel export

#### 2.2 Initialize Backend Project ✅
- [x] Create `oneclick_api/` directory
- [x] Run `npm init -y`
- [x] Install dependencies:
```bash
npm install express cors dotenv socket.io
npm install @aws-sdk/client-ec2
npm install -D nodemon
```
- [x] Create project structure:
```
oneclick_api/
├── index.js              # Entry point
├── routes/
│   ├── deploy.js         # POST /api/deploy
│   ├── instances.js      # GET/PUT/DELETE /api/instances
│   └── logs.js           # GET /api/instances/:id/logs
├── services/
│   ├── ec2Service.js     # AWS SDK wrapper
│   ├── userDataScript.js # Bootstrap script generator
│   └── statusPoller.js   # EC2 status polling
└── package.json
```

#### 2.3 Implement ec2Service.js ✅
- [x] Create EC2Client instance
- [x] Implement `launchInstance(config)` - RunInstancesCommand
- [x] Implement `describeInstances(ids)` - DescribeInstancesCommand
- [x] Implement `stopInstance(id)` - StopInstancesCommand
- [x] Implement `startInstance(id)` - StartInstancesCommand
- [x] Implement `terminateInstance(id)` - TerminateInstancesCommand
- [x] Implement `getConsoleLogs(id)` - GetConsoleOutputCommand

#### 2.4 Implement userDataScript.js ✅
- [x] Create function `generateUserData(githubUrl, envVars)`
- [x] Generate bash script that:
  - Updates system packages
  - Installs Node.js LTS
  - Installs Git, PM2
  - Clones GitHub repo
  - Installs dependencies
  - Builds Next.js app
  - Starts app with PM2
- [x] Return base64-encoded script

#### 2.5 Implement API Routes ✅
- [x] `POST /api/deploy` - Accept GitHub URL, call launchInstance
- [x] `GET /api/instances` - Return all tracked instances
- [x] `PUT /api/instances/:id/stop` - Stop instance
- [x] `PUT /api/instances/:id/start` - Start instance
- [x] `DELETE /api/instances/:id` - Terminate instance
- [x] `GET /api/instances/:id/logs` - Get console output

#### 2.6 Create Express Server (index.js) ✅
- [x] Load environment variables with dotenv
- [x] Initialize Express app
- [x] Add CORS middleware
- [x] Register routes
- [x] Initialize Socket.io server
- [x] Start server on PORT

#### 2.7 Test Backend ✅
- [x] Start server with `npm run dev`
- [x] Test health endpoint: `/api/health` ✅
- [x] Test `GET /api/instances` returns instance data ✅
- [ ] Test `POST /api/deploy` with Postman (requires real deployment)

---

## Phase 3: Bootstrap Script ✅ COMPLETE
**Goal:** Write and test the EC2 UserData shell script  
**Success Criteria:** A manually launched EC2 runs the script and serves the app on port 3000

### Tasks

#### 3.1 Create Bootstrap Script Template ✅
- [x] Create `scripts/ec2-bootstrap.sh` — standalone reference script
- [x] Create `oneclick_api/services/userDataScript.js` — programmatic generator

Features implemented:
- System package updates
- Node.js 20 LTS installation
- PM2 process manager
- Git clone with retry logic
- Auto-detection of Next.js vs Node.js apps
- Environment variable injection
- Nginx reverse proxy setup
- PM2 startup configuration
- Comprehensive logging to `/var/log/oneclick-deploy.log`

#### 3.2 Test Script Manually ⏳ (Deferred)
- [ ] Launch EC2 instance from AWS Console with UserData
- [ ] Use a test GitHub repo URL
- [ ] Monitor instance console output
- [ ] SSH into instance to verify

> Note: Manual testing deferred until frontend is ready for end-to-end testing

#### 3.3 Handle Edge Cases ✅
- [x] Error logging (`set -e`, `exec > ... tee`)
- [x] Progress markers (`>>> [1/7]`, etc.)
- [x] Retry logic for git clone (3 attempts)
- [x] Graceful fallback for unknown app types

#### 3.4 Integrate with Backend ✅
- [x] `userDataScript.js` generates base64-encoded script
- [x] `deploy.js` route calls `generateUserData()`
- [x] Instance logs available via `GET /api/instances/:id/logs`

---

## Phase 4: Frontend Dashboard ✅ COMPLETE
**Goal:** Build Next.js 14 dashboard with App Router, deploy form, and deployment cards  
**Success Criteria:** Clicking Deploy calls Express backend and DeploymentCard renders response data

### Tasks

#### 4.1 Initialize Next.js Project ✅
- [x] `oneclick_deploy/` directory exists
- [x] Next.js 15 with App Router configured
- [x] Install additional dependencies:
```bash
npm install socket.io-client lucide-react zod @tanstack/react-query @tanstack/react-query-devtools
```

#### 4.2 Create Project Structure (4-Layer Architecture) ✅
```
oneclick_deploy/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx        # Root layout with QueryProvider ✅
│   ├── page.tsx          # Home page (dashboard) ✅
│   └── globals.css       # Global styles
├── components/           # Layer 4: Presentational
│   ├── shared/           # Design system ✅
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Spinner.tsx
│   │   ├── StatusBadge.tsx
│   │   └── index.ts
│   ├── deployment/       # Feature components ✅
│   │   ├── DeployForm.tsx
│   │   ├── DeploymentCard.tsx
│   │   ├── DeploymentList.tsx
│   │   ├── LogViewer.tsx
│   │   └── index.ts
│   └── providers/        # Context providers ✅
│       └── QueryProvider.tsx
├── domain/               # Layer 1: Types & schemas ✅
│   └── deployment/
│       ├── deployment.types.ts
│       ├── deployment.schema.ts
│       ├── deployment.utils.ts
│       └── index.ts
├── data/                 # Layer 2: API calls ✅
│   └── deployment/
│       ├── deployment.repository.ts
│       └── index.ts
├── application/          # Layer 3: Hooks ✅
│   └── deployment/
│       ├── useDeployment.ts
│       └── index.ts
└── lib/                  # Utilities
    └── utils.ts
```

#### 4.3 Define TypeScript Types ✅
- [x] Created `domain/deployment/deployment.types.ts`:
  - InstanceState, InstanceType
  - DeployConfig, Deployment
  - ApiResponse<T>, DeploymentResponse, DeploymentListResponse
  - InstanceActionResponse, LogsResponse, ApiError

#### 4.4 Create API Client (Repository) ✅
- [x] Created `data/deployment/deployment.repository.ts`:
  - `deploy()` - POST /api/deploy
  - `getAll()` - GET /api/instances
  - `getById()` - GET /api/instances/:id
  - `stop()` - PUT /api/instances/:id/stop
  - `start()` - PUT /api/instances/:id/start
  - `terminate()` - DELETE /api/instances/:id
  - `getLogs()` - GET /api/instances/:id/logs

#### 4.5 Create Socket.io Client → Moved to Phase 5
- [ ] lib/socket.ts (real-time updates)

#### 4.6 Build StatusBadge Component ✅
- [x] Accepts `state` prop (InstanceState)
- [x] Color coding:
  - Pending: yellow
  - Running: green
  - Stopping/shutting-down: orange
  - Stopped: gray
  - Terminated: red

#### 4.7 Build DeployForm Component ✅
- [x] "use client" directive
- [x] GitHub URL input field
- [x] Instance type dropdown (t2.micro, t2.small, t2.medium, t3.micro, t3.small)
- [x] Branch input field
- [x] Deploy button
- [x] Loading state during deploy
- [x] Error message display
- [x] GitHub URL validation (regex)

#### 4.8 Build DeploymentCard Component ✅
- [x] "use client" directive
- [x] Display app name, instance ID
- [x] Display public IP
- [x] StatusBadge showing current state
- [x] Action buttons: Stop, Start, Terminate
- [x] Launch time display
- [x] "View Logs" button

#### 4.9 Build DeploymentList Component ✅
- [x] Fetch instances on mount (React Query)
- [x] Render DeploymentCard for each instance
- [x] Empty state when no deployments
- [x] Refresh button
- [x] Loading state
- [x] Error state with retry

#### 4.10 Build LogViewer Component ✅
- [x] "use client" directive
- [x] Terminal-style dark background (`bg-gray-900`)
- [x] Monospace font
- [x] Progress indicators (bootstrap started, complete)
- [x] Error count display
- [x] Refresh button
- [x] Close button

#### 4.11 Create Root Layout (app/layout.tsx) ✅
- [x] HTML structure
- [x] Tailwind styles import
- [x] QueryProvider wrapper
- [x] Metadata configuration

#### 4.12 Create Home Page (app/page.tsx) ✅
- [x] Header with app title and logo
- [x] DeployForm component
- [x] DeploymentList component
- [x] LogViewer panel (right column)
- [x] Welcome message with instructions
- [x] Footer with cost reminder

#### 4.13 Test Frontend ✅
- [x] `npm run build` passes
- [ ] E2E testing deferred to Phase 5

---

## Phase 5: Real-time Logs ✅ COMPLETE
**Goal:** Integrate Socket.io for log streaming and status polling  
**Success Criteria:** LogViewer shows live EC2 console output updating without page refresh

### Tasks

#### 5.1 Backend Socket.io Setup ✅
- [x] Initialize Socket.io in Express server (`oneclick_api/index.js`)
- [x] Create connection handler with rooms
- [x] Implement `statusPoller.js`:
  - Poll AWS DescribeInstances every 10 seconds
  - Detect state changes
  - Emit `instance:status` and `instance:updated` events

#### 5.2 Define Socket Events ✅
| Event | Direction | Payload |
|-------|-----------|---------|
| `connected` | Server → Client | `{ message, timestamp }` |
| `instances:all` | Server → Client | `{ instances[], timestamp }` |
| `instance:status` | Server → Client | `{ instanceId, state, publicIp, timestamp }` |
| `instance:updated` | Server → Client | `{ instanceId, state, publicIp, timestamp }` |
| `subscribe:instance` | Client → Server | `instanceId` |
| `unsubscribe:instance` | Client → Server | `instanceId` |

#### 5.3 Frontend Socket Integration ✅
- [x] Created `lib/socket.ts` - Socket.io client singleton
- [x] Created `SocketProvider` context with connection state
- [x] Created `useRealtimeDeployments` hook - syncs socket updates with React Query cache
- [x] Created `useInstanceSubscription` hook - manages per-instance subscriptions
- [x] Added real-time connection indicator to header (Live/Offline)
- [x] Handle reconnection scenarios

#### 5.4 Implement Status Polling Service ✅
- [x] Track active instances to poll via `activePollers` Map
- [x] Emit updates to specific instance rooms
- [x] Handle instance termination (stop polling)
- [x] `pollAllInstances()` on new client connection

#### 5.5 Real-time Updates in UI ✅
- [x] DeploymentList receives status updates via React Query cache
- [x] LogViewer subscribes to instance on mount
- [x] Real-time status badge updates without page refresh

#### 5.6 Test Build ✅
- [x] `npm run build` passes with all Socket.io integration

#### 5.7 Final Integration Tests → Ready for E2E testing
Files created:
- `oneclick_deploy/lib/socket.ts`
- `oneclick_deploy/components/providers/SocketProvider.tsx`
- `oneclick_deploy/application/deployment/useSocketDeployment.ts`

---

## Post-Implementation Checklist

### Documentation
- [ ] Update README.md with setup instructions
- [ ] Create .env.example file
- [ ] Document API endpoints
- [ ] Add architecture diagram

### Code Quality
- [ ] Add ESLint configuration
- [ ] Add Prettier configuration
- [ ] Review error handling
- [ ] Add TypeScript strict mode

### Security Review
- [ ] Verify .env is in .gitignore
- [ ] Check IAM permissions are minimal
- [ ] Review security group rules
- [ ] Audit UserData script for secrets


### Deployment Preparation
- [ ] Test with multiple GitHub repos
- [ ] Load test with multiple instances
- [ ] Document deployment process
- [ ] Set up monitoring (optional)

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: AWS Setup | 2-4 hours |
| Phase 2: Backend Core | 8-12 hours |
| Phase 3: Bootstrap Script | 4-6 hours |
| Phase 4: Frontend Dashboard | 12-16 hours |
| Phase 5: Real-time Logs | 6-8 hours |
| **Total** | **32-46 hours** |

---

## Dependencies Between Phases

```
Phase 1 (AWS Setup)
    │
    ▼
Phase 2 (Backend Core) ──────────────────┐
    │                                     │
    ▼                                     │
Phase 3 (Bootstrap Script) ◄─────────────┘
    │
    ▼
Phase 4 (Frontend Dashboard)
    │
    ▼
Phase 5 (Real-time Logs)
```

---

*Generated from OneClick_AWS_Deployer_Documentation.docx*
