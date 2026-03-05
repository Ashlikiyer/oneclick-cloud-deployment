---
applyTo: "src/data/**,src/server/**,src/trpc/**,prisma/**"
---

# Backend, Data & API Instructions

These rules apply to all files inside `src/data/`, `src/server/`, `src/trpc/`, and `prisma/`.

---

## Layer 2 — Data Layer Rules

This is the **only layer allowed to call external APIs or the database.**
Every other layer gets data through repositories.

### Repository Pattern

```typescript
// src/data/[feature]/[feature].repository.ts
export const userRepository = {
  async getAll(params?: { limit?: number; offset?: number }) {
    const response = await apiClient.get('/users', { params });
    return response.data.map(mapUserFromApi);
  },

  async getById(id: string) {
    const response = await apiClient.get(`/users/${id}`);
    return mapUserFromApi(response.data);
  },

  async create(payload: CreateUserPayload) {
    const validated = createUserSchema.parse(payload);  // validate before sending
    const response = await apiClient.post('/users', mapUserToApi(validated));
    return mapUserFromApi(response.data);
  },

  async update(id: string, changes: Partial<User>) {
    const response = await apiClient.patch(`/users/${id}`, mapUserToApi(changes));
    return mapUserFromApi(response.data);
  },

  async delete(id: string) {
    await apiClient.delete(`/users/${id}`);
  },
};
```

### Mapper Rules — Pure Functions Only

Mappers transform data between API shape and domain shape.
They must be pure functions — no API calls, no async, no side effects.

```typescript
// src/data/[feature]/[feature].mapper.ts

// ✅ Pure transformation — correct
export function mapUserFromApi(apiUser: ApiUser): User {
  return {
    id: apiUser.user_id,
    email: apiUser.email_address,
    name: `${apiUser.first_name} ${apiUser.last_name}`,
    role: apiUser.role_type,
    createdAt: new Date(apiUser.created_timestamp),
  };
}

// ❌ API call inside mapper — never do this
export async function mapUserFromApi(apiUser: ApiUser): Promise<User> {
  const avatar = await fetchAvatar(apiUser.user_id); // ← WRONG
  return { ...apiUser, avatar };
}
```

---

## API & tRPC Handler Rules

- Validate **all** input with Zod at the entry boundary — before any business logic
- Check authentication **first** — before validation, before DB queries
- Check authorization (permissions) after authentication
- Never expose internal error messages, stack traces, or raw DB errors to clients
- Return consistent error shapes: `{ error: string, code: string, details?: unknown }`
- Log errors server-side as structured JSON with a `correlationId`

```typescript
// ✅ Correct handler order
export const updateUser = protectedProcedure
  .input(updateUserSchema)           // 1. validate input
  .mutation(async ({ input, ctx }) => {
    const { user: currentUser } = ctx.session;  // 2. auth already checked by protectedProcedure

    if (!canEditUser(input.id, currentUser)) {  // 3. check authorization
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    return userRepository.update(input.id, input); // 4. delegate to repository
  });
```

---

## Prisma & Database Rules

- Always use Prisma's typed query methods — never raw SQL string concatenation
- Select only the fields you need — never `findMany()` without a `select` or explicit columns
- Use `include` sparingly — N+1 queries are easy to accidentally introduce
- Add database indexes for any field used in `where` clauses on large tables
- Never return full Prisma model objects directly to the client — map to domain types first
- Use transactions (`prisma.$transaction`) for operations that must succeed or fail together

```typescript
// ✅ Scoped select, mapped to domain type
const user = await prisma.user.findUniqueOrThrow({
  where: { id },
  select: { id: true, email: true, name: true, role: true, createdAt: true },
});
return mapUserFromPrisma(user);

// ❌ Never — returns entire DB row including sensitive fields
const user = await prisma.user.findUnique({ where: { id } });
return user;
```

---

## Error Handling

```typescript
// Consistent error response shape
type ApiError = {
  error: string;       // human-readable message (safe to show)
  code: string;        // machine-readable code (e.g. USER_NOT_FOUND)
  details?: unknown;   // optional structured details (never stack traces)
};

// ✅ Structured server-side logging
logger.error({
  correlationId: ctx.correlationId,
  code: 'USER_UPDATE_FAILED',
  userId: input.id,
  error: err.message,
});

// Then throw a safe error to the client
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Failed to update user. Please try again.',
});
```

---

## Security Rules (Backend)

- Validate ALL input server-side with Zod — even if client already validated
- Re-verify permissions on every mutation — never trust client-sent role or ID claims
- `httpOnly`, `secure`, `sameSite` flags on all auth cookies
- Never store secrets or API keys in code — use environment variables only
- Rate-limit all auth endpoints: login, register, password reset, forgot password
- Scope all DB queries to the authenticated user where applicable
- Never log passwords, tokens, session IDs, or PII

---

## Backend Checklist (run after every data/server phase)

- [ ] All input validated with Zod before any logic runs
- [ ] Auth checked before any business logic or DB query
- [ ] Authorization (permissions) checked after auth
- [ ] No raw SQL string concatenation — Prisma parameterized queries only
- [ ] DB queries select only needed fields — no `findMany()` returning full rows
- [ ] Errors logged server-side with correlationId
- [ ] Safe error message returned to client — no internal details exposed
- [ ] Mapper functions are pure — no async, no API calls inside them
- [ ] Repository is the only file making API/DB calls for this feature
