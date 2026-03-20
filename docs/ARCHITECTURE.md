# System Architecture

## Overview

OneClick AWS Deployer is a full-stack application that automates EC2 deployment of GitHub repositories. The system follows a clean 4-layer architecture with real-time updates via WebSockets.

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
│  │  │  useDeployments  │  │    useDeploy     │  │useRealtimeUpdates│     │  │
│  │  │                  │  │                  │  │                  │     │  │
│  │  │   React Query    │  │   Mutations      │  │    Socket.io     │     │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘     │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                         │
│                                     ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         LAYER 2: DATA                                   │  │
│  │  ┌────────────────────────────────────────────────────────────────┐   │  │
│  │  │                   deployment.repository.ts                      │   │  │
│  │  │  • deploy()      • getAll()      • start()     • getLogs()     │   │  │
│  │  │  • getById()     • stop()        • terminate()                 │   │  │
│  │  └────────────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                         │
│                                     ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                        LAYER 1: DOMAIN                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │    Types     │  │   Schemas    │  │    Utils     │                 │  │
│  │  │  Deployment  │  │  Zod Valid.  │  │canStartInst. │                 │  │
│  │  │  DeployConf  │  │deployConfig  │  │canStopInst.  │                 │  │
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
│  │  │ POST /api/deploy   │    │    │  │   Connection Handler     │    │    │
│  │  │ GET  /api/instances│    │    │  │   • subscribe:instance   │    │    │
│  │  │ PUT  /stop, /start │    │    │  │   • unsubscribe:instance │    │    │
│  │  │ DELETE /instances  │    │    │  │   • instance:status      │    │    │
│  │  │ GET  /logs         │    │    │  │   • instance:updated     │    │    │
│  │  └────────────────────┘    │    │  └──────────────────────────┘    │    │
│  └─────────────────────────────┘    └──────────────────────────────────┘    │
│                    │                              │                          │
│                    ▼                              ▼                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           SERVICES                                      │ │
│  │  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐         │ │
│  │  │  ec2Service  │  │ userDataScript   │  │   statusPoller   │         │ │
│  │  │              │  │                  │  │                  │         │ │
│  │  │• launchInst. │  │• generateScript  │  │• startPolling    │         │ │
│  │  │• describeInst│  │• Node.js setup   │  │• stopPolling     │         │ │
│  │  │• stop/start  │  │• PM2 config      │  │• pollAllInstances│         │ │
│  │  │• terminate   │  │• Nginx setup     │  │                  │         │ │
│  │  │• getLogs     │  │                  │  │ Emits updates    │         │ │
│  │  └──────────────┘  └──────────────────┘  └──────────────────┘         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ AWS SDK v3
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                                AWS                                            │
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   EC2 Service   │  │ Security Groups │  │    Key Pairs    │              │
│  │                 │  │                 │  │                 │              │
│  │ • RunInstances  │  │ • Inbound Rules │  │ • SSH Access    │              │
│  │ • DescribeInst  │  │   - 22 (SSH)    │  │                 │              │
│  │ • Start/Stop    │  │   - 80 (HTTP)   │  │                 │              │
│  │ • Terminate     │  │   - 443 (HTTPS) │  │                 │              │
│  │ • GetConsoleOut │  │   - 3000 (App)  │  │                 │              │
│  │                 │  │   - 4000 (API)  │  │                 │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        EC2 Instance (Deployed App)                      │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │ │
│  │  │  Ubuntu 22   │  │   Node.js    │  │    PM2       │                  │ │
│  │  │              │  │    v20 LTS   │  │  (Process    │                  │ │
│  │  │              │  │              │  │   Manager)   │                  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │ │
│  │  │    Nginx     │  │  User's App  │  │     Git      │                  │ │
│  │  │   (Reverse   │  │  (Cloned     │  │   (Clone     │                  │ │
│  │  │    Proxy)    │  │   from GH)   │  │    Repo)     │                  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Deploy Flow

```
User → DeployForm → useDeploy() → repository.deploy() 
    → POST /api/deploy → ec2Service.launchInstance()
    → AWS RunInstances → EC2 Created
    → UserData script runs → App deployed
```

### 2. Real-time Updates Flow

```
Backend: statusPoller polls AWS every 10s
    ↓
State change detected
    ↓
io.emit('instance:updated', { state, publicIp })
    ↓
Frontend: onInstanceStatus() receives event
    ↓
React Query cache updated
    ↓
UI re-renders with new state
```

### 3. Log Viewing Flow

```
User clicks "Logs" → LogViewer mounts
    ↓
useInstanceSubscription(instanceId)
    ↓
socket.emit('subscribe:instance', instanceId)
    ↓
Backend starts polling this instance more frequently
    ↓
useDeploymentLogs() fetches GET /api/instances/:id/logs
    ↓
Logs displayed in terminal-style viewer
```

## Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Domain** | `domain/` | Types, schemas, pure business logic |
| **Data** | `data/` | API calls, repository pattern |
| **Application** | `application/` | React Query hooks, orchestration |
| **Presentational** | `components/` | UI components, user interaction |

## Key Technologies

- **React Query**: Server state management, caching, background refetching
- **Socket.io**: Real-time bidirectional communication
- **Zod**: Runtime type validation
- **AWS SDK v3**: Modern, modular AWS client
- **PM2**: Production process manager for Node.js
