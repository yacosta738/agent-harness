---
name: typescript
description: >
  Use when writing, editing, or reviewing TypeScript code, especially strict types, interfaces,
  generics, type guards, utility types, imports, or avoiding any.
license: Apache-2.0
metadata:
  author: yacosta738
  version: "1.0"
---

# TypeScript Strict Patterns

## Overview

TypeScript is most valuable when types describe real domain boundaries and survive refactors. Prefer
explicit, composable types over clever shortcuts.

**Core principle:** one runtime source of truth, narrow unknown inputs, and no `any` unless there is
a documented escape hatch.

## When to Use

- Writing or reviewing `.ts` / `.tsx` code.
- Defining domain models, DTOs, config objects, action names, statuses, or constants.
- Handling unknown JSON, API responses, form values, or third-party data.
- Refactoring interfaces, generics, imports, or utility types.

Do not use to replace framework-specific guidance. Pair with React, Next.js, Node, or test skills
when those contexts dominate.

## Const Types Pattern

Prefer a `const` object first, then derive the union type from it. This keeps runtime values and
compile-time types in sync.

```typescript
const USER_STATUS = {
  Active: "active",
  Inactive: "inactive",
  Pending: "pending",
} as const;

type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
```

Avoid direct unions when the values are also needed at runtime:

```typescript
type UserStatus = "active" | "inactive" | "pending";
```

Direct unions are acceptable only for local, purely type-level values that never need iteration,
validation, labels, or runtime lookup.

## Flat Interfaces

Keep interfaces shallow. Extract nested object shapes into named interfaces so boundaries stay
reusable and readable.

```typescript
interface UserAddress {
  street: string;
  city: string;
}

interface User {
  id: string;
  name: string;
  address: UserAddress;
}

interface AdminUser extends User {
  permissions: string[];
}
```

Avoid inline nested object types in exported interfaces:

```typescript
interface User {
  address: { street: string; city: string };
}
```

## No `any`

Use `unknown` for external or untrusted data, then narrow it with type guards or schemas.

```typescript
function parseUser(input: unknown): User {
  if (isUser(input)) {
    return input;
  }

  throw new Error("Invalid user");
}
```

Use generics when the caller owns the type:

```typescript
function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}
```

If `any` is unavoidable, isolate it in the smallest scope and add a comment explaining why the safer
alternatives do not work.

## Type Guards

Type guards should validate enough structure to make downstream code safe. Avoid pretending that
checking one field proves a whole object.

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string"
  );
}
```

For complex API payloads, prefer a runtime schema validator when the project already uses one.

## Utility Types Quick Reference

| Utility                 | Use                                    |
|-------------------------|----------------------------------------|
| `Pick<T, K>`            | Select fields                          |
| `Omit<T, K>`            | Exclude fields                         |
| `Partial<T>`            | Make all fields optional               |
| `Required<T>`           | Make all fields required               |
| `Readonly<T>`           | Prevent mutation                       |
| `Record<K, V>`          | Map keys to values                     |
| `Extract<T, U>`         | Keep union members assignable to `U`   |
| `Exclude<T, U>`         | Remove union members assignable to `U` |
| `NonNullable<T>`        | Remove `null` and `undefined`          |
| `ReturnType<typeof fn>` | Derive function return type            |
| `Parameters<typeof fn>` | Derive function parameter tuple        |

Prefer deriving types from existing public functions or constants instead of duplicating shapes.

## Imports

Use type-only imports for values used only at compile time. This keeps emitted JavaScript clean and
avoids accidental runtime dependencies.

```typescript
import type { User } from "./types";
import { createUser, type CreateUserConfig } from "./users";
```

## Review Checklist

- [ ] No unexplained `any`.
- [ ] External data starts as `unknown` and is narrowed.
- [ ] Runtime constants derive their union types.
- [ ] Exported interfaces avoid inline nested object types.
- [ ] Generics improve caller type safety instead of hiding complexity.
- [ ] Type-only imports are marked with `import type`.
- [ ] Utility types reduce duplication without making types unreadable.

## Common Mistakes

| Mistake                                            | Fix                                          |
|----------------------------------------------------|----------------------------------------------|
| Direct union duplicated beside runtime values      | Use `as const` object and derive the type    |
| `any` for API responses                            | Accept `unknown`, validate, then narrow      |
| Huge nested exported interface                     | Extract named child interfaces               |
| Over-generic helpers                               | Let the real call sites drive the generic    |
| Type imports mixed as runtime imports              | Use `import type`                            |
| Type guard checks only `typeof value === "object"` | Validate required fields and primitive types |

## Keywords

typescript, ts, strict mode, no any, unknown, type guards, const assertions, as const, interfaces,
generics, utility types, import type
