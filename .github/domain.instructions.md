---
applyTo: "src/domain/**"
---

# Domain Layer Instructions

These rules apply to all files inside `src/domain/`.

---

## What the Domain Layer Is

The domain layer is the foundation of the entire application.
It defines **what things are** — pure TypeScript with no dependencies on frameworks,
HTTP clients, databases, or UI libraries.

Everything here must be importable in any environment: browser, server, test runner,
or even a CLI script — without pulling in React, Next.js, Prisma, or fetch.

---

## What Belongs Here

```typescript
// ✅ Entity interfaces and types
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

// ✅ Enums and union types
type UserRole = 'admin' | 'user' | 'guest';

// ✅ Zod validation schemas
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user', 'guest']),
});

// ✅ Business constants
const MAX_USERNAME_LENGTH = 50;
const PASSWORD_MIN_LENGTH = 8;

// ✅ Pure business logic functions
function isAdminUser(user: User): boolean {
  return user.role === 'admin';
}

function canAccessResource(user: User, ownerId: string): boolean {
  return user.role === 'admin' || user.id === ownerId;
}
```

---

## What Does NOT Belong Here

```typescript
// ❌ React hooks or components
import { useState } from 'react';

// ❌ API calls or fetch
const response = await fetch('/api/users');

// ❌ Prisma or any database client
import { prisma } from '@/lib/prisma';

// ❌ Next.js imports
import { useRouter } from 'next/navigation';

// ❌ Side effects (localStorage, cookies, logging)
localStorage.setItem('user', JSON.stringify(user));

// ❌ Async functions (domain is synchronous pure logic)
export async function validateUser(user: User) { ... }
```

---

## File Structure per Feature

```
src/domain/[feature]/
├── [feature].types.ts    ← interfaces, enums, type aliases
├── [feature].schema.ts   ← Zod schemas (validation rules)
└── [feature].utils.ts    ← pure business logic functions
```

Example:
```
src/domain/user/
├── user.types.ts         ← User, UserRole, CreateUserPayload
├── user.schema.ts        ← userSchema, createUserSchema, updateUserSchema
└── user.utils.ts         ← isAdmin(), canEditProfile(), formatDisplayName()
```

---

## Domain Layer Checklist

- [ ] No imports from `react`, `next`, `prisma`, `axios`, or any HTTP client
- [ ] No `async` functions — all pure synchronous logic
- [ ] No side effects — no logging, no storage, no network
- [ ] All functions are pure — same input always produces same output
- [ ] Zod schemas live in `.schema.ts`, not mixed into `.types.ts`
- [ ] Types are exported and reused across layers — not redefined elsewhere
