# ONE-CLICK AWS DEPLOYER
## System Architecture & Project Documentation

**Next.js + Node.js Tech Stack | AWS EC2 Infrastructure | GitHub URL Source Input**

> Version 1.0 | March 2026 | Confidential

---

## 1. Executive Summary

The One-Click AWS Deployer is a full-stack web platform that enables developers and non-technical users to deploy Next.js + Node.js web applications to AWS EC2 instances with a single button click. By abstracting the complexity of cloud provisioning, SSH configuration, and server management into an intuitive dashboard, the system dramatically reduces deployment time from hours to minutes.

The platform accepts a GitHub repository URL as input, automatically provisions an EC2 virtual server, clones and builds the application, and provides real-time feedback through live deployment logs and status indicators. Users retain full control via start, stop, and terminate actions directly from the dashboard.

| Attribute | Detail |
|-----------|--------|
| **Project Name** | One-Click AWS Deployer |
| **Project Type** | Full-Stack Web Application + Cloud Automation Platform (Next.js + Express) |
| **Primary Users** | Developers, DevOps engineers, non-technical project owners |
| **Input** | GitHub repository URL (Next.js + Node.js application) |
| **Output** | Live, publicly accessible web application hosted on AWS EC2 |
| **Target Infrastructure** | Amazon EC2 (Ubuntu 22.04 LTS) |
| **Core Value** | Zero-friction cloud deployment — no AWS console knowledge required |

---

## 2. Problem Statement

Deploying a web application to AWS today requires deep knowledge of EC2 configuration, IAM policies, security groups, SSH key management, server provisioning scripts, and process management tools like PM2 or systemd. This creates a significant barrier for developers who want to quickly host projects without spending hours on infrastructure setup.

### Pain Points Addressed

- Manual EC2 setup requires navigating multiple AWS console screens and understanding networking concepts.
- SSH configuration and key pair management is error-prone and intimidating for non-DevOps users.
- Server bootstrap scripts (installing Node.js, cloning repos, starting servers) must be written and debugged manually.
- There is no unified view of deployment status, logs, and instance health in a single interface.
- Stopping or restarting a deployment requires returning to the AWS console or using the CLI.

---

## 3. System Overview

The system is composed of three tiers: a Next.js 14 frontend dashboard (App Router), a Node.js/Express backend API, and AWS cloud infrastructure managed via the AWS SDK. The dashboard communicates with the backend over HTTP REST and WebSockets. The backend communicates with AWS to provision, monitor, and control EC2 instances.

### High-Level Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Dashboard UI│     │ Backend API │     │ AWS SDK Layer│     │ EC2 Instance │
│ Next.js 14 +│ ←→  │ Node.js +   │ ←→  │ AWS SDK v3   │ ←→  │ Ubuntu 22.04 │
│ Tailwind    │     │ Express     │     │              │     │ + PM2        │
└─────────────┘     └─────────────┘     └──────────────┘     └──────────────┘

User → Dashboard ↔ REST/WebSocket ↔ Backend API ↔ AWS SDK → EC2 Instance
```

### Communication Protocols

| From | To | Protocol | Purpose |
|------|----|----------|---------|
| Dashboard UI | Backend API | HTTP REST | Deploy, list, stop, terminate instances |
| Dashboard UI | Backend API | WebSocket (Socket.io) | Receive real-time deployment logs and status updates |
| Backend API | AWS EC2 | AWS SDK v3 (HTTPS) | Launch, describe, stop, and terminate EC2 instances |
| EC2 Instance | GitHub | HTTPS (git clone) | Pull application source code from repository |
| EC2 Instance | Backend API | n/a (polling) | Status read via AWS DescribeInstances API |

---

## 4. Component Breakdown

### 4.1 Frontend Dashboard (Next.js 14 — App Router)

The dashboard is a Next.js 14 application using the App Router, styled with Tailwind CSS. Pages live under the `app/` directory. All components are React Server Components by default; interactive components (forms, log viewer, status polling) are marked with `"use client"`. The dashboard is divided into three primary functional areas:

| Component | Responsibility | Key Interactions |
|-----------|----------------|------------------|
| **DeployForm** | Client component (`"use client"`). Accepts GitHub URL, instance type selection, app name, and optional env vars. Validates input before submitting. | Calls `POST /api/deploy` on submit |
| **DeploymentCard** | Client component. Displays a card for each deployed instance showing: app name, public IP, instance state, and action buttons (Stop, Start, Terminate). | Calls `PUT/DELETE /api/instances/:id` |
| **LogViewer** | Client component. Terminal-style panel that streams EC2 bootstrap logs in real time. Auto-scrolls as new lines arrive. Shows timestamps per line. | Subscribes to Socket.io log events |
| **StatusBadge** | Shared component. Color-coded pill badge showing instance lifecycle state: Pending, Running, Stopping, Stopped, Terminated. | Receives state string as prop |
| **app/layout.tsx** | Root layout. Wraps all pages with global providers, Tailwind styles, and Socket.io context initialization. | Orchestrates all child pages/components |
| **app/page.tsx** | Home page (Server Component). Renders DeployForm and the live DeploymentCard list. Fetches initial instance list server-side. | Entry point of the dashboard |

### 4.2 Backend API (Node.js + Express)

The backend is a Node.js Express server that acts as the central orchestrator. It exposes RESTful endpoints consumed by the dashboard and manages all AWS interactions through a service layer. It also runs a WebSocket server using Socket.io for real-time log streaming.

| Route | Method | Description |
|-------|--------|-------------|
| `/api/deploy` | POST | Accepts deploy payload (GitHub URL, instance type, app name). Generates EC2 UserData bootstrap script. Calls `ec2Service.launchInstance()`. Returns instance ID and initial state. |
| `/api/instances` | GET | Calls AWS DescribeInstances for all tracked instances. Returns list with state, public IP, launch time, and instance type for each. |
| `/api/instances/:id/stop` | PUT | Calls AWS StopInstances for the given instance ID. Returns updated state. |
| `/api/instances/:id/start` | PUT | Calls AWS StartInstances for the given instance ID. Returns updated state. |
| `/api/instances/:id` | DELETE | Calls AWS TerminateInstances. Marks instance as terminated in local state. |
| `/api/instances/:id/logs` | GET | Calls AWS GetConsoleOutput for the instance. Returns raw console log text. |

### 4.3 AWS Service Layer (ec2Service.js)

This internal module wraps all AWS SDK v3 calls. It is not exposed directly to the frontend but is called exclusively by the Express route handlers. This separation ensures AWS credentials and logic are isolated on the server side.

| Function | AWS Command Used | Parameters |
|----------|------------------|------------|
| `launchInstance(config)` | RunInstancesCommand | ImageId (AMI), InstanceType, KeyName, SecurityGroupIds, UserData (base64), MinCount/MaxCount |
| `describeInstances(ids)` | DescribeInstancesCommand | InstanceIds array |
| `stopInstance(id)` | StopInstancesCommand | InstanceId |
| `startInstance(id)` | StartInstancesCommand | InstanceId |
| `terminateInstance(id)` | TerminateInstancesCommand | InstanceId |
| `getConsoleLogs(id)` | GetConsoleOutputCommand | InstanceId, Latest: true |

### 4.4 EC2 Bootstrap Script (UserData)

When an EC2 instance is launched via the AWS SDK, a shell script is passed as base64-encoded UserData. AWS automatically executes this script as root when the instance first boots. This is the mechanism that transforms a blank Ubuntu server into a running application.

| Step | Action | Tool Used |
|------|--------|-----------|
| 1 | Update system packages | `apt-get update && apt-get upgrade` |
| 2 | Install Node.js LTS and npm | NodeSource setup script + apt-get |
| 3 | Install Git | `apt-get install git` |
| 4 | Install PM2 (process manager) globally | `npm install -g pm2` |
| 5 | Clone the GitHub repository | `git clone <GITHUB_URL> /app` |
| 6 | Install backend dependencies | `cd /app && npm install` |
| 7 | Build the Next.js frontend | `cd /app/frontend && npm install && npm run build` |
| 8 | Start Next.js and Express with PM2 | `pm2 start /app/frontend/node_modules/.bin/next --name frontend -- start && pm2 start /app/backend/server.js --name backend` |
| 9 | Configure PM2 to restart on reboot | `pm2 startup && pm2 save` |

---

## 5. Data Flow & Deployment Lifecycle

The following describes the exact sequence of events from the moment a user clicks the Deploy button to when the application is live and accessible.

### Step 1: User Submits Deploy Request
User fills in GitHub URL, selects instance type (e.g., t2.micro), and clicks Deploy. The DeployForm client component validates the URL format and sends a POST request to `/api/deploy` on the Express backend with the payload as JSON.

### Step 2: Backend Generates Bootstrap Script
The `/api/deploy` route handler receives the request. It calls `userDataScript.js` to generate a customized shell script with the GitHub URL interpolated. The script is base64-encoded, as required by the AWS RunInstances API.

### Step 3: EC2 Instance is Provisioned
The `ec2Service.launchInstance()` function calls RunInstancesCommand. AWS allocates a virtual server, assigns a public IP, and begins the boot process. The instance ID is returned immediately and stored in the backend state.

### Step 4: Status Polling Begins
The `statusPoller.js` module begins polling AWS DescribeInstances every 5 seconds for the new instance. State transitions (pending → running) are emitted to the frontend via Socket.io events so the StatusBadge updates in real time.

### Step 5: Bootstrap Script Executes on EC2
Once the instance reaches the "running" state, the UserData script executes automatically. It installs Node.js, clones the GitHub repository, builds the React app, and starts the server with PM2. This typically takes 2-5 minutes.

### Step 6: Logs Stream to Dashboard
The LogViewer polls `GET /api/instances/:id/logs` every 10 seconds (or receives push via Socket.io) and displays the EC2 console output. The user can watch the git clone, npm install, and build steps in real time.

### Step 7: Application is Live
Once PM2 starts both processes, the Next.js frontend is accessible at `http://<PUBLIC_IP>:3000` and the Express backend runs on port 4000. The DeploymentCard updates with the live public IP, which becomes a clickable link. The status badge shows "Running" in green.

---

## 6. AWS Infrastructure Requirements

### 6.1 IAM Permissions

The AWS user or role used by the backend must have the following IAM permissions attached to operate correctly:

| Permission | Why It Is Required |
|------------|-------------------|
| `ec2:RunInstances` | Launch new EC2 instances on deployment |
| `ec2:DescribeInstances` | Poll instance state and retrieve public IP addresses |
| `ec2:StopInstances` | Allow users to stop instances from the dashboard |
| `ec2:StartInstances` | Allow users to restart stopped instances |
| `ec2:TerminateInstances` | Allow users to permanently destroy instances |
| `ec2:GetConsoleOutput` | Retrieve bootstrap script execution logs for the LogViewer |
| `ec2:DescribeKeyPairs` | Validate that the configured key pair exists in the region |
| `ec2:DescribeSecurityGroups` | Validate security group configuration before launch |

### 6.2 Security Group Configuration

A dedicated Security Group must be created and its ID provided to the backend via environment variables. The following inbound rules are required:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | 0.0.0.0/0 (or your IP) | SSH access for debugging |
| 80 | TCP | 0.0.0.0/0 | HTTP access for web traffic |
| 443 | TCP | 0.0.0.0/0 | HTTPS (for future SSL support) |
| 3000 | TCP | 0.0.0.0/0 | Node.js application default port |
| 5173 | TCP | 0.0.0.0/0 | Next.js dev server default port (local development only) |

### 6.3 EC2 Instance Specifications

| Parameter | Recommended Value | Notes |
|-----------|-------------------|-------|
| **AMI (OS Image)** | Ubuntu 22.04 LTS (ami-0c55b159cbfafe1f0) | Use the AMI ID specific to your AWS region |
| **Instance Type** | t2.micro | Free tier eligible; suitable for small apps |
| **Storage** | 8 GB gp2 EBS | Default root volume; increase for larger repos |
| **Key Pair** | Created in AWS EC2 console | PEM file stored securely; name set in .env |
| **Region** | ap-southeast-1 (Singapore) | Singapore region; must match credentials and AMI ID |

---

## 7. Environment Variables

All sensitive configuration is stored in a `.env` file at the project root and is never committed to version control. The backend reads these values at startup using the `dotenv` package.

| Variable | Example Value | Required | Description |
|----------|---------------|----------|-------------|
| `AWS_ACCESS_KEY_ID` | AKIAIOSFODNN7EXAMPLE | Yes | IAM user access key for AWS SDK authentication |
| `AWS_SECRET_ACCESS_KEY` | wJalrXUtnFEMI/K7MDENG | Yes | IAM user secret key |
| `AWS_REGION` | ap-southeast-1 | Yes | AWS Singapore region where EC2 instances will be launched |
| `EC2_KEY_PAIR_NAME` | my-deployer-keypair | Yes | Name of key pair in AWS for the EC2 instances |
| `EC2_SECURITY_GROUP_ID` | sg-0abc1234def56789 | Yes | ID of the pre-configured security group |
| `EC2_AMI_ID` | ami-0c55b159cbfafe1f0 | Yes | Ubuntu 22.04 AMI ID (region-specific) |
| `PORT` | 4000 | No | Port for the Express backend to listen on (default: 4000) |

---

## 8. Project Folder Structure

The project is a monorepo containing both the frontend and backend in a single root directory. This simplifies local development and version control.

```
one-click-deployer/          # Git repository root; contains .env, README
│
├── dashboard/               # Next.js 14 frontend application (App Router)
│   ├── app/                 # App Router pages and layouts
│   │   ├── layout.tsx       # Root layout with providers
│   │   └── page.tsx         # Home page (Server Component)
│   ├── components/          # DeployForm, DeploymentCard, LogViewer, StatusBadge
│   ├── public/              # Static assets
│   ├── package.json
│   └── next.config.js       # Next.js configuration
│
├── server/                  # Node.js Express backend
│   ├── routes/              # Route handlers: deploy.js, instances.js, logs.js
│   ├── services/            # Business logic layer
│   │   ├── ec2Service.js    # AWS SDK wrapper
│   │   ├── userDataScript.js# Bootstrap script generator
│   │   └── statusPoller.js  # EC2 polling intervals
│   ├── index.js             # Express app entry point
│   └── package.json
│
├── scripts/                 # Utility shell scripts
│   └── ec2-bootstrap.sh     # Template bootstrap script for EC2 UserData
│
├── .env                     # Environment variables (not committed)
├── .gitignore
└── README.md
```

---

## 9. Key Technical Decisions & Rationale

| Decision | Choice Made | Why |
|----------|-------------|-----|
| **Frontend Framework** | Next.js 14 (App Router) | Server Components reduce client JS bundle. App Router enables file-based routing. Built-in TypeScript support. SSR improves initial load performance of the dashboard. |
| **Backend Runtime** | Node.js + Express | Same language as the frontend; excellent AWS SDK support; lightweight for this use case. |
| **Real-time Updates** | Socket.io WebSockets | Enables push-based log streaming without client polling every second, reducing server load. |
| **AWS SDK Version** | v3 (Modular) | Smaller bundle size; tree-shakeable; modern async/await API; officially recommended by AWS. |
| **Process Manager on EC2** | PM2 | Automatically restarts crashed processes; supports startup scripts; provides built-in log management. |
| **Deployment Source** | GitHub URL only | Simplest, most universal input. Avoids file upload complexity and storage requirements. |
| **OS on EC2** | Ubuntu 22.04 LTS | Wide community support; stable LTS release; excellent Node.js ecosystem compatibility. |
| **Instance Type Default** | t2.micro | AWS Free Tier eligible; sufficient for demo and small applications; users can override. |

---

## 10. Error Handling & Edge Cases

The system must gracefully handle failures at every layer. The following table documents known failure scenarios and the expected system behavior:

| Failure Scenario | Where It Occurs | Handling Strategy |
|------------------|-----------------|-------------------|
| Invalid GitHub URL | DeployForm client component (frontend) | Regex validation before form submit. Show inline error message. Block API call entirely. |
| GitHub repo is private | EC2 bootstrap script | git clone exits with error. Captured in console logs. User sees error in LogViewer. |
| AWS credentials invalid | ec2Service.launchInstance() | AWS SDK throws AuthFailure. Backend returns 401 with descriptive message. Dashboard shows alert. |
| EC2 launch limit reached | AWS API response | AWS returns InstanceLimitExceeded. Backend catches and returns 503. Dashboard prompts user to terminate existing instances. |
| Bootstrap script fails | EC2 UserData execution | PM2 never starts. App is unreachable. Logs show the failure step. User must terminate and fix the repo. |
| Instance stuck in pending | AWS EC2 lifecycle | Polling detects no state change after 10 minutes. Dashboard marks as "Timed Out" and suggests manual check. |
| WebSocket disconnects | Socket.io connection | Client-side Socket.io auto-reconnects with exponential backoff. Log stream resumes. |

---

## 11. Build & Deployment Phases

The project is built in five sequential phases. Each phase is independently testable before moving to the next.

| Phase | Name | Goal | Success Criteria |
|-------|------|------|------------------|
| **Phase 1** | AWS Setup | Configure AWS account, IAM user, security groups, and key pairs | Can successfully run `aws ec2 describe-instances` from CLI |
| **Phase 2** | Backend Core | Build Express server with EC2 launch and describe endpoints | Postman call to `POST /api/deploy` creates a real EC2 instance |
| **Phase 3** | Bootstrap Script | Write and test the EC2 UserData shell script | A manually launched EC2 runs the script and serves the app on port 3000 |
| **Phase 4** | Frontend Dashboard | Build Next.js 14 dashboard with App Router, deploy form, and deployment cards | Clicking Deploy calls Express backend and DeploymentCard renders response data |
| **Phase 5** | Real-time Logs | Integrate Socket.io for log streaming and status polling | LogViewer shows live EC2 console output updating without page refresh |

---

## 12. Security Considerations

| Area | Consideration |
|------|---------------|
| **Credentials** | AWS credentials must never be committed to Git. Always use `.env` and add it to `.gitignore` immediately. |
| **IAM** | Use IAM policies with minimum required permissions (principle of least privilege). Do not use root account keys. |
| **SSH** | The EC2 security group on port 22 should ideally be restricted to your IP address, not 0.0.0.0/0. |
| **UserData** | Environment variables passed to EC2 UserData are visible in AWS console logs. Do not include secrets in UserData. |
| **API Auth** | The backend API has no authentication layer by default. For production use, add API key or OAuth2 before exposing publicly. |
| **GitHub** | All GitHub repos must be public for this version. Private repo support requires GitHub Personal Access Tokens stored securely server-side. |

---

## 13. Future Enhancements

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Custom Domain Support** | Automatically assign a Route 53 domain to the deployed instance and configure DNS records | High |
| **SSL / HTTPS** | Auto-provision Lets Encrypt certificate using Certbot on EC2 after deployment | Medium |
| **Private GitHub Repos** | Accept a GitHub PAT and inject it securely into the clone command on EC2 | Low |
| **Multi-region Support** | Allow users to select the AWS region for deployment from the dashboard | Medium |
| **Deployment History** | Persist deployment records in a database (e.g., DynamoDB) for audit trail | Medium |
| **Auto-scaling Groups** | Launch an ASG instead of a single EC2 for production-grade scalability | High |
| **Cost Estimator** | Show estimated monthly cost based on selected instance type before deploying | Low |
| **GitHub Actions Integration** | Trigger redeployment automatically on push to main branch via webhook | Medium |

---

## 14. Glossary

| Term | Definition |
|------|------------|
| **Next.js** | React framework by Vercel that adds server-side rendering, file-based routing, and full-stack capabilities to React applications |
| **App Router** | Next.js 13+ routing system using the `app/` directory. Supports React Server Components, layouts, and nested routing out of the box |
| **EC2** | Elastic Compute Cloud — AWS virtual server service |
| **IAM** | Identity and Access Management — AWS service for controlling user permissions |
| **AMI** | Amazon Machine Image — pre-configured OS snapshot used to launch EC2 instances |
| **UserData** | A shell script passed to EC2 at launch that runs automatically on first boot |
| **PM2** | Process Manager 2 — Node.js process manager that keeps apps running and restarts them on crash |
| **SDK** | Software Development Kit — here refers to the AWS SDK v3 for JavaScript/Node.js |
| **Socket.io** | Library enabling real-time bidirectional event-based communication between browser and server |
| **Bootstrap** | In EC2 context: the automated process of configuring a new server when it first starts |
| **Security Group** | AWS virtual firewall that controls inbound and outbound traffic to EC2 instances |
| **Public IP** | The externally accessible IP address assigned to a running EC2 instance |

---

**End of Document**

*One-Click AWS Deployer — System Documentation v1.0 — March 2026*
