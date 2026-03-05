# Project Instructions for GitHub Copilot

## What This App Does
[One paragraph: purpose, audience, and core workflows of the application.]

## Tech Stack
- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- Backend: Next.js API routes + tRPC (or: Express / FastAPI / etc.)
- Database: PostgreSQL via Prisma ORM
- Auth: NextAuth.js v5
- Deployment: Vercel (frontend) + Railway (Postgres)

## Project Structure
```
src/
├── app/              → Next.js App Router pages and layouts
├── components/
│   ├── shared/       → ✅ Design system: tokens, base UI, layouts
│   └── [feature]/    → Feature-specific components
├── lib/              → Utilities, shared constants, helper functions
├── server/           → Server-only code: DB queries, services
├── trpc/             → tRPC router definitions
├── domain/           → Types, schemas, pure business logic (Layer 1)
├── data/             → Repositories, mappers, API abstraction (Layer 2)
└── application/      → Hooks, services, state orchestration (Layer 3)
prisma/               → Schema and migrations
```

---

## Architecture — 4-Layer Pattern

Every feature must respect layer boundaries. Copilot must never generate code that violates these rules.

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4 — PRESENTATIONAL  (src/components/, src/app/)      │
│  How things LOOK. Renders UI, handles user interactions.    │
│  ❌ NO business logic  ❌ NO direct API calls               │
└─────────────────────────────────────────────────────────────┘
                          ↓ uses
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3 — APPLICATION  (src/application/)                  │
│  How things WORK. Hooks, state, orchestration.              │
│  ❌ NO direct API calls  ❌ NO UI rendering                 │
└─────────────────────────────────────────────────────────────┘
                          ↓ uses
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2 — DATA  (src/data/)                                │
│  How things CONNECT. Repositories, mappers, API calls.      │
│  ✅ ONLY layer allowed to call external APIs                │
└─────────────────────────────────────────────────────────────┘
                          ↓ uses
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — DOMAIN  (src/domain/)                            │
│  What things ARE. Types, schemas, pure business functions.  │
│  ❌ NO framework code  ❌ NO side effects                   │
└─────────────────────────────────────────────────────────────┘
```

### Hard Rules (always enforced)
- **Never** call `fetch()` or `apiClient` outside of `src/data/`
- **Never** put business logic (conditionals, calculations, permissions) inside components
- **Never** import React or framework code into `src/domain/`
- **Never** make API calls inside mapper functions
- **Always** use the repository when writing a hook — not a raw API call
- **Always** use shared components and design tokens — never duplicate UI primitives
- Dependency direction is strictly downward: Presentational → Application → Data → Domain

### Folder Layout per Feature
```
src/
├── domain/[feature]/
│   ├── [feature].types.ts      ← interfaces, enums
│   ├── [feature].schema.ts     ← Zod schemas
│   └── [feature].utils.ts      ← pure business functions
├── data/[feature]/
│   ├── [feature].repository.ts ← API calls only
│   └── [feature].mapper.ts     ← API ↔ Domain transforms (pure)
├── application/[feature]/
│   ├── use[Feature].ts         ← React Query hooks
│   └── [feature].service.ts    ← business orchestration
└── components/
    ├── shared/                 ← design system (see frontend instructions)
    └── [feature]/
        ├── [Feature]Page.tsx   ← page/container (~60 lines max)
        └── [Feature]Card.tsx   ← presentational
```

### src/lib/ — Shared Utilities (no layer owns this)
Pure, framework-agnostic helpers usable from any layer.
- No React, Next.js, or Prisma imports
- No business logic (that belongs in `src/domain/`)
- No API calls — synchronous pure functions only
```
src/lib/
├── constants.ts  ← app-wide named constants
├── format.ts     ← formatCurrency(), formatDate(), formatName()
├── logger.ts     ← structured logger (never console.log directly)
├── cn.ts         ← classname utility (clsx + tailwind-merge)
└── utils.ts      ← misc pure helpers
```

---

## Implementation Approach — Plan First, Then Build by Phase

**Copilot must never jump straight into writing code.** Every task begins with a written plan, followed by phased implementation with a checkpoint after each phase.

### The Mandatory Workflow

```
1. UNDERSTAND  → Ask clarifying questions if anything is ambiguous
2. PLAN        → Write a structured plan before touching any file
3. CONFIRM     → Wait for approval of the plan before proceeding
4. PHASE 1     → Implement only Phase 1, then stop and report
5. VALIDATE    → Verify Phase 1 is correct before continuing
6. PHASE N...  → Continue one phase at a time with checkpoints
7. REVIEW      → Final pass: consistency, size limits, layer rules
```

Copilot must **stop and wait for confirmation** between each phase. Never chain all phases in one response unless the user explicitly says so.

---

### Step 1 — Understand Before Planning

Before writing the plan, surface any ambiguity. Do not assume. Ask.

**Always clarify if any of these are unknown:**
- Which layer does this logic belong to?
- Does a similar hook, component, repository, or utility already exist?
- What are the exact inputs, outputs, props, and return values?
- Are there edge cases that need explicit handling (empty, error, permissions)?
- Does this touch existing files — and if so, which ones?
- Is there an existing design token or shared component to use?

```
// ✅ Example output before planning:

"Before I write the plan, a few things to confirm:
1. Should notification count update in real-time or on poll?
2. Is there already a `useNotifications` hook, or should I create one?
3. Should unread count live in global state or be fetched per page?
4. Empty/error state — use the existing <EmptyState> component?"
```

---

### Step 2 — Write the Plan

Output a structured plan in this exact format before writing any code:

```
## Plan: [Feature Name]

### What this does
[One sentence description of the end result.]

### Files to create
- src/domain/notification/notification.types.ts
- src/data/notification/notification.repository.ts
- src/application/hooks/useNotifications.ts
- src/components/notification/NotificationBell.tsx
- src/components/notification/NotificationDropdown.tsx
- src/components/notification/NotificationItem.tsx

### Files to modify
- src/components/shared/ui/Badge.tsx  ← extend to support dot-only variant
- src/app/layout.tsx                  ← add NotificationBell to header

### Phase breakdown
- Phase 1: Domain — types, schema, pure utils
- Phase 2: Data — repository + mapper
- Phase 3: Application — useNotifications hook
- Phase 4: UI — NotificationBell + Dropdown + Item (split if >150 lines)
- Phase 5: Integration — wire into layout, verify end-to-end
- Phase 6: Cleanup & Review

### Risks / flags
- NotificationDropdown may need sub-components if it grows past 150 lines
- Needs auth — will use existing useSession() hook
```

---

### Step 3 — Phased Implementation

Work through one phase at a time. Stop after each phase and report before continuing.

#### Phase Report Template
```
## Phase [N] Complete — [Phase Name]

### What was done
- Created src/domain/notification/notification.types.ts
  → Notification interface, NotificationType enum
- Created src/domain/notification/notification.schema.ts
  → Zod schema for API response validation

### Verify before Phase [N+1]
- [ ] Types match feature requirements
- [ ] No framework imports in domain layer
- [ ] Schema covers all API fields

### Ready for Phase [N+1]?
```

#### Standard Phase Order
```
Phase 1 — Domain
  → types, enums, Zod schemas, pure utils
  → Verify: no React, no fetch, no side effects

Phase 2 — Data Layer
  → repository methods + mappers
  → Verify: only layer making API calls, mappers are pure

Phase 3 — Application Layer
  → React Query hooks, service functions
  → Verify: no JSX, uses repository not raw fetch

Phase 4 — UI / Presentational
  → components using shared tokens + components
  → Verify: no business logic in JSX, files under 200 lines

Phase 5 — Integration & Wiring
  → connect to pages/layouts, route guards
  → Verify: end-to-end flow works, no TS errors

Phase 6 — Cleanup & Review (always last)
  → check all files: size limits, naming, layer rules,
    import paths, consistency with existing code
```

#### Phasing for Non-Feature Tasks
```
# Refactor
Phase 1 — Audit: list every file that changes, flag risks
Phase 2 — Domain/type changes (if any)
Phase 3 — Logic/hook changes
Phase 4 — Component changes
Phase 5 — Verify nothing regressed

# Bug Fix
Phase 1 — Diagnose: identify root cause + affected files first
Phase 2 — Fix the root cause only
Phase 3 — Check if same pattern exists elsewhere
Phase 4 — Verify fix doesn't break adjacent behavior
```

---

## Code Consistency Rules

**Before writing any new code, scan the codebase for similar patterns.** Match and reuse what already exists. Never introduce a second way to do something already solved.

### Check Before You Create
- Hook already fetches this data? → Use it. Don't create `useUsers2.ts`
- Utility already does this transformation? → Import from `src/lib/`
- Zod schema already exists for this entity? → Extend it, don't duplicate
- Shared component already handles this layout? → Use it from `src/components/shared/`
- Repository method already exists for this call? → Use it, don't add a second one

### Naming Conventions (match what's already in the codebase)
```typescript
// Hooks
export function useUser(id: string) { ... }
export function useCreateOrder() { ... }

// Repositories
export const orderRepository = { ... }

// Mappers
export function mapOrderFromApi(raw: ApiOrder): Order { ... }
export function mapOrderToApi(order: Order): ApiOrder { ... }

// Components — PascalCase, filename = component name
export function OrderCard({ order }: OrderCardProps) { ... }
// → file: OrderCard.tsx
```

### Import Paths — always `@/`, never relative
```typescript
// ✅
import { Button }         from '@/components/shared/ui/Button';
import { colors }         from '@/components/shared/tokens';
import { userRepository } from '@/data/user/user.repository';
import { useOrders }      from '@/application/hooks/useOrders';
import { formatCurrency } from '@/lib/format';

// ❌
import { Button } from '../../../components/shared/ui/Button';
```

---

## Coding Standards

### TypeScript
- Strict mode always — no `any`, no `as unknown as X`, no `@ts-ignore`
- JSDoc on all exported functions, hooks, and public APIs
- Named exports only — default exports only for Next.js pages/layouts
- `interface` for object shapes, `type` for unions and derived types
- `satisfies` operator for typed config objects
- Functions max ~40 lines — extract named helpers if longer

### React Components
- One component per file, filename = component name exactly
- Props interface named `[ComponentName]Props`, defined at top of file
- Never use `React.FC` — plain function declarations with typed props
- No `useEffect` for data fetching — use React Query hooks from `src/application/`

### File & Component Size Limits — Hard Caps
```
Components (.tsx)      → 200 lines max
Hooks (.ts)            → 150 lines max
Repositories (.ts)     → 150 lines max
Utilities (.ts)        → 100 lines max
Types (.ts)            → 100 lines max (split by entity if larger)
JSX return block       → 80 lines max (split into sub-components)
```

**Split signals — Copilot must split proactively:**
- File approaching its line limit and needs more content
- Component renders more than 3 distinct visual sections
- More than 5 `useState` / `useReducer` calls in one component
- A helper function inside a component exceeds 20 lines

```typescript
// ✅ Decomposed correctly
// Dashboard.tsx (~60 lines) — orchestrator only
import { DashboardStats }   from './DashboardStats';
import { DashboardChart }   from './DashboardChart';
import { DashboardTable }   from './DashboardTable';
import { DashboardFilters } from './DashboardFilters';

export function Dashboard() {
  return (
    <PageWrapper>
      <DashboardStats />
      <DashboardFilters />
      <DashboardChart />
      <DashboardTable />
    </PageWrapper>
  );
}
```

### General Rules
- Validate all external input at the boundary with Zod (HTTP, forms, URL params)
- All API handlers check authentication before any business logic
- Never log sensitive data: passwords, tokens, PII, full request bodies
- No magic numbers or strings — named constants in `src/domain/` or `src/lib/constants.ts`
- Prefer `const` over `let`, never `var`
- Use early returns to keep nesting flat
- Use `next/image` for all images, `next/link` for all internal navigation
- Semantic HTML: `<button>` for actions, `<a>` for navigation, never `<div onClick>`

---

## Error Handling

- API errors: `{ error: string, code: string, details?: unknown }`
- Never expose internal messages, stack traces, or DB errors to clients
- Log server-side with structured JSON + `correlationId`
- Use Result types for recoverable errors — don't throw everywhere
- Always handle loading, error, and empty states — never assume data exists

```typescript
// ✅ Always handle all three states
function UserList() {
  const { data, isLoading, error } = useUsers();

  if (isLoading) return <Spinner />;
  if (error)     return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState message="No users found." />;

  return <>{data.map(user => <UserCard key={user.id} user={user} />)}</>;
}
```

---

## Security Baselines

- Validate ALL user input server-side — even if already validated client-side
- Re-verify permissions server-side on every mutation — never trust the client
- Parameterized queries via Prisma — never concatenate raw SQL
- `httpOnly`, `secure`, `sameSite` on all auth cookies
- Never store secrets or API keys in client-side code or committed `.env` files
- Rate-limit all auth endpoints: login, register, password reset
- Avoid `dangerouslySetInnerHTML` — sanitize with DOMPurify if unavoidable
- Scope API responses — never return full DB rows, select only needed fields

---

## Validation & Verification Rules

**Never assume something works. Always verify.**

### Before Writing Any Code
- [ ] Existing hook, component, utility, or repository that does this?
- [ ] Layer boundaries clear for everything being built?
- [ ] File names, folder paths, export names match existing patterns?
- [ ] Zod schema already defined for this entity?

### After Every Phase
- [ ] No file exceeds its line limit
- [ ] No `any`, no `@ts-ignore`, no implicit returns
- [ ] All imports use `@/` absolute paths
- [ ] No business logic in components (Layer 4)
- [ ] No API calls outside `src/data/` (Layer 2)
- [ ] No framework code in `src/domain/` (Layer 1)
- [ ] Shared UI uses design tokens, not hardcoded values
- [ ] Every component handles loading, error, and empty states

### Before Calling a Task Done
- [ ] All files follow naming conventions matching the existing codebase
- [ ] No duplicate logic — nothing recreated that already existed
- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)
- [ ] No `console.log` left in code (use structured logger)
- [ ] Data flows correctly: domain → data → application → UI

### Red Flags — Stop and Surface Immediately
- File approaching its limit and needs more content → propose split first
- New function very similar to one that already exists → flag it, don't duplicate
- Requirement unclear and assumptions affect architecture → ask before building
- Existing shared component almost fits but needs changes → ask: extend or new?
- Layer boundary must be broken to implement as described → raise it before coding

---

## Self-Review Checklist (Run Before Every Response)

```
PLAN
  ✅ Did I write a plan before coding?
  ✅ Did I identify all files to create AND modify?
  ✅ Did I break it into phases and stop for confirmation?

CONSISTENCY
  ✅ Did I check for existing hooks/components/utils first?
  ✅ Do all names match existing codebase conventions?
  ✅ Are all imports using @/ absolute paths?

ARCHITECTURE
  ✅ Is all business logic out of components?
  ✅ Is all API access inside src/data/ only?
  ✅ Is the domain layer free of React/framework code?

SIZE
  ✅ Is every file under its line limit?
  ✅ Did I split components that were getting large?
  ✅ Did I extract logic to a hook if component had too many useState calls?

DESIGN SYSTEM
  ✅ Did I use shared components instead of raw HTML elements?
  ✅ Did I use color/spacing tokens instead of hardcoded values?
  ✅ Is any new reusable UI in src/components/shared/?

VALIDATION
  ✅ Are all states handled: loading, error, empty?
  ✅ Is all external input validated with Zod?
  ✅ Are permissions checked server-side?

QUALITY
  ✅ No any types, no @ts-ignore, no magic numbers
  ✅ No console.log in committed code
  ✅ JSDoc on all exported functions and hooks
```
