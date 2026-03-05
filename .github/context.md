# Project Context for AI Assistants

## What This Project Does
One-Click AWS Deployer is a platform that lets users deploy full-stack Next.js + Node.js applications to AWS EC2 by simply providing a GitHub repository URL. The system handles all infrastructure provisioning, server configuration, and application deployment automatically.

## Architecture Summary

```
┌────────────────────────────────────────────────────────────────┐
│                         USER                                    │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  DASHBOARD (Next.js 14 + Tailwind)                             │
│  ├── DeployForm: GitHub URL input, instance type selection     │
│  ├── DeploymentCard: Instance status, controls                 │
│  ├── LogViewer: Real-time bootstrap logs                       │
│  └── StatusBadge: Visual state indicator                       │
└────────────────────────────────────────────────────────────────┘
                              │
                    REST API + WebSocket
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  BACKEND (Express + Socket.io)                                 │
│  ├── /api/deploy: Launch EC2 instance                          │
│  ├── /api/instances: List/control instances                    │
│  └── services/ec2Service.js: AWS SDK v3 wrapper                │
└────────────────────────────────────────────────────────────────┘
                              │
                         AWS SDK v3
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  AWS EC2 (Ubuntu 22.04 LTS)                                    │
│  ├── UserData script executes on boot                          │
│  ├── Installs Node.js, Git, PM2                                │
│  ├── Clones GitHub repo                                        │
│  └── Runs app via PM2                                          │
└────────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `oneclick_deploy/app/layout.tsx` | Root layout, global providers |
| `oneclick_deploy/app/page.tsx` | Home page with deploy form |
| `oneclick_deploy/components/deployment/DeployForm.tsx` | GitHub URL input form |
| `oneclick_deploy/components/deployment/DeploymentCard.tsx` | Instance control card |
| `oneclick_deploy/components/deployment/LogViewer.tsx` | Real-time log viewer |
| `oneclick_api/index.js` | Express server entry point |
| `oneclick_api/routes/deploy.js` | Deploy endpoint handler |
| `oneclick_api/routes/instances.js` | Instance management endpoints |
| `oneclick_api/services/ec2Service.js` | AWS SDK wrapper |
| `oneclick_api/services/userDataScript.js` | EC2 UserData generator |

## Deployment Flow

1. User enters GitHub URL in DeployForm
2. Frontend validates URL, sends POST to /api/deploy
3. Backend generates UserData script with GitHub URL
4. Backend calls AWS RunInstancesCommand
5. EC2 instance boots and runs UserData script
6. Script installs Node.js, clones repo, builds app
7. PM2 starts the application
8. Dashboard polls for status updates via Socket.io
9. User sees "Running" status when app is live

## Important Constraints

- All GitHub repos must be public (no PAT support yet)
- Only t2.micro, t2.small, t2.medium instance types
- Single AWS region (ap-southeast-1)
- No database persistence (in-memory state)
- No authentication on backend API
