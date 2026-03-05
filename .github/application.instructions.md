---
applyTo: "src/application/**"
---

# Application Layer Instructions

These rules apply to all files inside `src/application/` — hooks and services.

---

## What the Application Layer Is

This layer **orchestrates** — it connects the data layer to the UI layer.
It contains React Query hooks, business service functions, and permission helpers.

- It **calls repositories** — never raw `fetch()` or `apiClient` directly
- It **returns data and handlers** — never renders JSX
- It **contains business logic** — never in components

---

## Hooks — React Query Pattern

All data-fetching hooks use React Query. Always call the repository — never fetch directly.

```typescript
// src/application/hooks/useUsers.ts

// ✅ Correct — delegates to repository
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userRepository.getAll(),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => userRepository.getById(id),
    enabled: !!id,  // don't fetch if id is empty
  });
}

// ✅ Correct — mutation with cache invalidation
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => userRepository.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ❌ Wrong — raw fetch in application layer
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users'); // ← never do this
      return res.json();
    },
  });
}
```

### Query Key Conventions
Use a consistent, hierarchical query key pattern across the whole codebase:

```typescript
// All users
queryKey: ['users']

// Single user
queryKey: ['users', id]

// User's orders
queryKey: ['users', userId, 'orders']

// Orders with filters
queryKey: ['orders', { status, page }]
```

---

## Services — Pure Business Logic

Service files contain business logic that doesn't belong in hooks or components.
These are plain functions — no React hooks, no JSX.

```typescript
// src/application/services/userPermissions.ts

export function canDeleteUser(user: User, currentUser: User): boolean {
  return currentUser.role === 'admin' && user.id !== currentUser.id;
}

export function canEditProfile(targetUserId: string, currentUser: User): boolean {
  return currentUser.role === 'admin' || currentUser.id === targetUserId;
}

export function getVisibleFields(user: User, currentUser: User): (keyof User)[] {
  if (currentUser.role === 'admin') return Object.keys(user) as (keyof User)[];
  return ['id', 'name', 'email'];
}
```

---

## File Size Limits

```
Hooks (.ts)     → 150 lines max
Services (.ts)  → 100 lines max
```

If a hook file is growing large, split by concern:
```
// ❌ One giant hook file
src/application/hooks/useUsers.ts  (300 lines — queries + mutations + optimistic updates)

// ✅ Split by responsibility
src/application/hooks/useUsers.ts         ← read queries only
src/application/hooks/useUserMutations.ts ← create, update, delete mutations
```

---

## Application Layer Checklist

- [ ] All data fetching goes through the repository — no raw `fetch()` or `apiClient`
- [ ] No JSX or React component rendering — pure logic and hooks only
- [ ] No `async/await` outside of `mutationFn` and `queryFn` callbacks
- [ ] Query keys follow the hierarchical convention
- [ ] Mutations invalidate the correct query keys on success
- [ ] Permission/service functions are pure — same input, same output
- [ ] Hook files under 150 lines — split by concern if larger
- [ ] No business logic duplicated from `src/domain/` — import and reuse it
