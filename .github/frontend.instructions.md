---
applyTo: "src/components/**,src/app/**"
---

# Frontend & UI Instructions

These rules apply to all files inside `src/components/` and `src/app/`.

---

## Design System — Always Check Shared First

**Before generating any UI code, check `src/components/shared/` first.**
If a component or token already exists, use it. Never redefine colors, spacing, or
typography inline or in a new file.

### Shared Folder Structure
```
src/components/shared/
├── tokens/
│   ├── colors.ts         ← ALL color values — no hardcoded hex anywhere else
│   ├── typography.ts     ← font sizes, weights, line heights
│   ├── spacing.ts        ← spacing scale for padding, margin, gap
│   ├── radius.ts         ← border radius scale
│   ├── shadows.ts        ← box shadow definitions
│   └── index.ts          ← barrel export: import { colors, spacing } from '@/components/shared/tokens'
├── ui/
│   ├── Button.tsx        ← all variants: primary, secondary, ghost, danger
│   ├── Card.tsx          ← surface/container with consistent shadow + radius
│   ├── Input.tsx         ← text, email, password with label + error state
│   ├── Badge.tsx         ← status badges: success, warning, error, info
│   ├── Modal.tsx         ← dialog/modal with overlay
│   ├── Spinner.tsx       ← loading indicator
│   ├── Avatar.tsx        ← user avatar with initials fallback
│   └── Tooltip.tsx       ← hover tooltip
├── layout/
│   ├── PageWrapper.tsx   ← page max-width + consistent horizontal padding
│   ├── Section.tsx       ← vertical section with consistent spacing
│   ├── Stack.tsx         ← vertical/horizontal flex stack with gap prop
│   ├── Grid.tsx          ← responsive CSS grid wrapper
│   └── Divider.tsx       ← horizontal rule using theme border color
└── theme/
    ├── theme.config.ts   ← CSS variable definitions for light + dark mode
    └── ThemeProvider.tsx ← wraps the app, injects CSS variables into :root
```

---

## Token Definitions

All colors and design values are CSS variables applied at `:root`.
Reference them — never hardcode values anywhere in the codebase.

```typescript
// src/components/shared/tokens/colors.ts
export const colors = {
  primary:      'var(--color-primary)',
  primaryHover: 'var(--color-primary-hover)',
  secondary:    'var(--color-secondary)',
  success:      'var(--color-success)',
  warning:      'var(--color-warning)',
  error:        'var(--color-error)',
  info:         'var(--color-info)',
  bg:           'var(--color-bg)',        // page background
  surface:      'var(--color-surface)',   // card / panel background
  border:       'var(--color-border)',
  muted:        'var(--color-muted)',     // secondary / disabled text
  text:         'var(--color-text)',      // primary body text
} as const;

// src/components/shared/tokens/spacing.ts
export const spacing = {
  xs: '4px', sm: '8px', md: '16px',
  lg: '24px', xl: '32px', '2xl': '48px', '3xl': '64px',
} as const;

// src/components/shared/tokens/typography.ts
export const typography = {
  size: {
    xs: '0.75rem', sm: '0.875rem', base: '1rem',
    lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem',
  },
  weight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
  leading: { tight: '1.25', normal: '1.5', relaxed: '1.75' },
} as const;
```

---

## Tailwind + Token Usage Rules

Use Tailwind for layout, flexbox, grid, and interactive states.
Use CSS variable tokens for all brand colors, surfaces, and text.

```typescript
// ✅ Layout via Tailwind, brand colors via tokens
<div
  className="flex items-center gap-4 rounded-xl p-4"
  style={{ background: colors.surface, borderColor: colors.border }}
>

// ✅ Use shared component — it handles its own styling
<Button variant="primary" size="md">Save Changes</Button>

// ❌ Hardcoded hex defeats the design system
<div className="bg-[#1a73e8] text-white rounded-lg px-4 py-2">

// ❌ Raw button when Button component already exists
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
  Save Changes
</button>
```

---

## Shared Component Standards

Every component in `src/components/shared/ui/` must follow this pattern:

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;        // always allow one-off overrides
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className,
  children,
  onClick,
}: ButtonProps) {
  // uses tokens internally, not hardcoded values
}
```

- All shared components accept `className` for one-off overrides — never fork just to change styling
- Use `variant` prop for visual variants — not separate component files per variant
- Dark mode via CSS variables in `theme.config.ts` only — never Tailwind `dark:` on hardcoded colors
- Any component used in 2+ features belongs in `src/components/shared/`, not a feature folder

---

## Component Consistency Rules

- **Before creating any new component**, check `src/components/shared/ui/` first
- Use and extend existing components — never create a parallel version of something that exists
- If a shared component almost fits but needs a new variant, add the variant — don't create a new file
- New reusable UI (used in 2+ places) must live in `src/components/shared/`, not a feature folder

---

## File Size — Hard Limits for UI Files

```
Component files (.tsx)   → 200 lines max
JSX return block         → 80 lines max (split into sub-components beyond this)
```

**Split a component when:**
- File exceeds 200 lines
- JSX return block exceeds 80 lines
- Component renders more than 3 distinct visual sections
- Component has more than 5 `useState` / `useReducer` calls

```
// ✅ Large page decomposed correctly
src/components/dashboard/
├── Dashboard.tsx          ← orchestrator only (~60 lines)
├── DashboardStats.tsx     ← stat cards section
├── DashboardChart.tsx     ← chart rendering
├── DashboardTable.tsx     ← data table
├── DashboardFilters.tsx   ← filter bar
└── dashboard.types.ts     ← shared types for this feature
```

---

## Accessibility Rules

- All interactive elements must be fully keyboard accessible
- Images: meaningful `alt` text, or `alt=""` if purely decorative
- Semantic HTML: `<button>` for actions, `<a>` for navigation, never `<div onClick>`
- Every form input must have an associated `<label>` element
- Use `next/image` for all images — never raw `<img>`
- Use `next/link` for all internal navigation — never raw `<a href>`

---

## UI Checklist (run after every UI phase)

- [ ] No hardcoded hex colors, pixel values, or font sizes — all from tokens
- [ ] No raw `<div>` where a shared component (`Card`, `Stack`, `Button`) already exists
- [ ] New reusable UI moved to `src/components/shared/`
- [ ] Component split into sub-components if JSX return exceeds 80 lines
- [ ] All states handled: loading → `<Spinner />`, error → `<ErrorMessage />`, empty → `<EmptyState />`
- [ ] Dark mode works via CSS variables (not hardcoded Tailwind colors)
- [ ] All interactive elements are keyboard accessible
