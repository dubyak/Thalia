---
name: new-component
description: Scaffold a new React component following Thalia project conventions
disable-model-invocation: true
---

# New Component

Create a new React component for the Thalia MSME prototype.

## Arguments

- `name` (required): Component name in PascalCase (e.g., `LoanSummary`)
- `group` (required): Component group folder — one of `chat`, `app-shell`, `home`, `cashout`, `offer`, `survey`, `terms`, `ui`, or a new folder name
- `client` (optional): Whether it needs `'use client'` directive. Default: false. Set true if the component uses hooks, event handlers, or browser APIs.

## Conventions

Follow these patterns from the existing codebase:

### File placement
- `frontend/components/{group}/{Name}.tsx`

### Structure
```tsx
// 'use client' only if client=true

import { cn } from '@/lib/utils'
// Import types from @/lib/types
// Import icons from lucide-react
// Import brand constants from @/lib/constants

interface {Name}Props {
  // typed props
}

export function {Name}({ ...props }: {Name}Props) {
  return (
    // JSX
  )
}
```

### Styling rules
- Use Tailwind utility classes — no CSS modules or styled-components
- Use brand colors from `tailwind.config.ts` via classes: `text-teal`, `bg-brand-bg`, `text-brand-text-primary`, `text-brand-text-secondary`, `border-brand-border`
- Use `cn()` from `@/lib/utils` for conditional classes
- Use `animate-fade-in` for entrance animations
- Font families: `font-lexend` (headings), `font-jakarta` (body) — both defined in tailwind config
- Mobile-first: this is a mobile app prototype, max-width constrained by `--app-max-width` CSS variable

### Export pattern
- Named exports only (no default exports)
- One component per file

### Common imports
```tsx
import { cn } from '@/lib/utils'                    // class merging
import type { ... } from '@/lib/types'               // shared types
import { formatMXN, calculateLoan } from '@/lib/constants'  // financial helpers
import { Home, ChevronRight } from 'lucide-react'    // icons
```
