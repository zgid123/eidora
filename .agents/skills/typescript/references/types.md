---
name: TypeScript Types
description: Type and interface guidelines for Alpha's TypeScript projects
---

# Types and Interfaces

- Use **interfaces** for object shapes that may be extended or implemented.
- Use **type** for unions, intersections, mapped types, and aliases.
- Order properties in interfaces and object-shaped types using the [semantic property ordering rules](./style.md#property-ordering): identifiers, core data, system/metadata, timestamps, then optional/extension fields. Keep related fields adjacent and do not insert blank lines between property groups.
- Prefer **readonly** and **const** assertions where values should not change.
- Model **nullable** intent explicitly: use `T | null` or optional `?`; avoid optional chaining as a substitute for proper null handling in domain logic.
- Prefer **branded types** or **nominal typing** for domain identifiers instead of raw primitives.
- For project-owned exported functions and public instance methods with inputs, accept a single parameter object typed by a named interface, even when there is only one input. Keep zero-argument APIs parameterless. Preserve signatures required by framework or third-party contracts, including CQRS handlers. Destructure first-level properties in the signature when using them individually; retain objects whose identity or behavior matters or that must be passed onward.
- For private methods and unexported helpers, do not create parameter interfaces just for local usage; use direct parameters for simple inputs, or reuse an existing interface when passing the same shape through.

```ts
// Do:

// ✅ Interface for object shape; type for union
interface IUser {
  readonly id: TUserId;
  name: string;
}

type TStatus = 'pending' | 'done';

// ✅ Readonly and const where values should not change
const status = {
  pending: 'pending',
  done: 'done',
} as const;

// ✅ Branded type for domain identity
type TUserId = string & { readonly __brand: unique symbol };

// ✅ Explicit nullable in and out
function find(id: string | null): IUser | null {
  return null;
}

// ✅ Exported functions use named interface parameters
interface ICreateUserParams {
  email: string;
  name: string;
}

export async function createUser(params: ICreateUserParams): Promise<IUser> {
  return userRepository.create(params);
}

interface IFindUserParams {
  id: TUserId;
}

export async function findUser({ id }: IFindUserParams): Promise<IUser | null> {
  return userRepository.findById({
    id,
  });
}

class UserService {
  // ✅ Public instance methods use named interface parameters
  public async invite(params: ICreateUserParams): Promise<IUser> {
    return createUser(params);
  }

  public async find({ id }: IFindUserParams): Promise<IUser | null> {
    return findUser({
      id,
    });
  }

  // ✅ Private methods use direct parameters for simple local inputs
  #normalizeName(name: string): string {
    return name.trim();
  }

  // ✅ Unexported helpers can reuse an existing interface when passing the same shape through
  #createDraftUser(params: ICreateUserParams): IUser {
    return UserEntity.create(params);
  }
}
```

```ts
// Don't:

// ❌ Do not use type for extendable object shapes
type User = { id: string; name: string };

// ❌ Do not leave immutable values mutable
let statusValue = 'pending';

// ❌ Do not use raw primitives for domain IDs
type UserId = string;

// ❌ Do not rely on optional chaining instead of explicit null modeling
function get(u?: User) {
  return u?.name;
}

// ❌ Do not use inline object parameter types for exported functions
export async function createUser(params: { email: string; name: string }): Promise<IUser> {
  return userRepository.create(params);
}

// ❌ Project-owned exported APIs with inputs use named interface parameters
export async function findUser(id: TUserId): Promise<IUser | null> {
  return userRepository.findById(id);
}

class UserService {
  // ❌ Do not use inline object parameter types for public instance methods
  public async invite(params: { email: string; name: string }): Promise<IUser> {
    return createUser(params);
  }

  // ❌ Project-owned public methods with inputs use named interface parameters
  public async find(id: TUserId): Promise<IUser | null> {
    return findUser(id);
  }
}

// ❌ Do not create one-off parameter interfaces for simple private helpers
interface INormalizeNameParams {
  name: string;
}

function normalizeName(params: INormalizeNameParams): string {
  return params.name.trim();
}
```
