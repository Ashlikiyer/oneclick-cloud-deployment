# 🚀 OneClick AWS Deployer

Deploy full-stack Next.js and Node.js applications to AWS EC2 with a single click. No manual SSH, no complex configs—just paste your GitHub URL and deploy.

<img width="1919" height="842" alt="Screenshot 2026-03-05 103504" src="https://github.com/user-attachments/assets/15059a77-7724-4567-a4cc-8fb2c6a5e812" />


## ✨ Features

- **One-Click Deployment** - Paste a GitHub URL, click Deploy, get a running app
- **Real-time Status Updates** - Watch your deployment progress live via WebSockets
- **Full Instance Management** - Start, stop, terminate instances from the dashboard
- **Console Log Viewer** - View EC2 bootstrap logs in real-time
- **Auto-Configuration** - Automatically sets up Node.js, PM2, and Nginx
- **Multiple Instance Types** - Choose from t2.micro (Free Tier) to t3.medium

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
│  │  /deploy    │  │ ec2Service  │  │Status Poller│                  │
│  │ /instances  │  │userDataScript│  │  Real-time │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ AWS SDK v3
┌─────────────────────────────────────────────────────────────────────┐
│                         AWS (EC2)                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  EC2 Inst.  │  │   Security  │  │  Key Pairs  │                  │
│  │  Ubuntu 22  │  │    Groups   │  │             │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - App Router, Server Components
- **TypeScript** - Type-safe development
- **React Query** - Server state management
- **Socket.io Client** - Real-time updates
- **Tailwind CSS** - Utility-first styling
- **Zod** - Runtime validation

### Backend
- **Express.js** - REST API server
- **Socket.io** - WebSocket server
- **AWS SDK v3** - EC2 management
- **PM2** - Process management (on deployed instances)

### Infrastructure
- **AWS EC2** - Compute instances
- **Ubuntu 22.04 LTS** - Base AMI
- **Nginx** - Reverse proxy (on deployed instances)

## 📦 Project Structure

```
oneclick-deploy/
├── oneclick_deploy/          # Frontend (Next.js)
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   │   ├── shared/           # Design system (Button, Card, etc.)
│   │   ├── deployment/       # Feature components
│   │   └── providers/        # Context providers
│   ├── domain/               # Types, schemas, business logic
│   ├── data/                 # API calls (repository pattern)
│   ├── application/          # React Query hooks
│   └── lib/                  # Utilities
├── oneclick_api/             # Backend (Express)
│   ├── routes/               # API endpoints
│   └── services/             # Business logic
├── scripts/                  # Bootstrap scripts
└── documentation/            # Project docs
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- AWS Account with:
  - IAM user with EC2 permissions
  - Security group (ports 22, 80, 443, 3000, 4000)
  - Key pair for SSH access
- A public GitHub repository to deploy

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/oneclick-deploy.git
cd oneclick-deploy

# Install backend dependencies
cd oneclick_api
npm install

# Install frontend dependencies
cd ../oneclick_deploy
npm install
```

### 2. Configure Environment

Create `.env` in project root:

```env
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-1

# EC2 Configuration
EC2_AMI_ID=ami-08d59269edddde222
EC2_KEY_PAIR_NAME=oneclick-deployer-key
EC2_SECURITY_GROUP_ID=sg-xxxxxxxxx

# Server Configuration
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

### 3. Start the Servers

```bash
# Terminal 1: Backend
cd oneclick_api
npm run dev

# Terminal 2: Frontend
cd oneclick_deploy
npm run dev
```

### 4. Open Dashboard

Visit [http://localhost:3000](http://localhost:3000)

## 📖 API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/deploy` | Deploy a GitHub repo |
| `GET` | `/api/instances` | List all instances |
| `GET` | `/api/instances/:id` | Get instance details |
| `PUT` | `/api/instances/:id/stop` | Stop instance |
| `PUT` | `/api/instances/:id/start` | Start instance |
| `DELETE` | `/api/instances/:id` | Terminate instance |
| `GET` | `/api/instances/:id/logs` | Get console logs |
| `GET` | `/api/health` | Health check |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connected` | Server → Client | Connection confirmed |
| `instances:all` | Server → Client | Initial instances list |
| `instance:status` | Server → Client | Status update for subscribed instance |
| `instance:updated` | Server → Client | Global status update |
| `subscribe:instance` | Client → Server | Subscribe to instance updates |
| `unsubscribe:instance` | Client → Server | Unsubscribe from instance |

## 💡 How It Works

1. **User enters GitHub URL** → Frontend validates and sends to backend
2. **Backend generates UserData script** → Bash script with Node.js setup, git clone, PM2
3. **Backend calls AWS RunInstances** → Creates EC2 with UserData
4. **EC2 boots and runs script** → Clones repo, installs deps, starts app
5. **Status Poller monitors instance** → Polls DescribeInstances every 10s
6. **Socket.io broadcasts updates** → Frontend receives real-time status
7. **App is live** → Access via public IP on port 3000

## ⚠️ Cost Warning

**AWS EC2 instances incur costs!**

- `t2.micro`: Free Tier eligible (750 hours/month for 12 months)
- After Free Tier: ~$8-9/month if running 24/7

**Always terminate instances when not in use!**

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [AWS SDK for JavaScript v3](https://github.com/aws/aws-sdk-js-v3)
- [Next.js](https://nextjs.org/)
- [Socket.io](https://socket.io/)
- [Tailwind CSS](https://tailwindcss.com/)

---

Built with ❤️ by Ashley Kier Ferreol
