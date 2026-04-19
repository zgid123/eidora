---
name: TypeScript Style
description: Naming and formatting guidelines for Alpha's TypeScript projects
---

# Style and Formatting

- Use the project's linter and formatter; run the project's check or format script when making changes.
- Prefix **interfaces** with `I`, for example `IUser` or `IUserRepository`.
- Prefix **type aliases** with `T`, for example `TUser` or `TStatus`.
- Use PascalCase for classes, camelCase for functions/variables, and UPPER_SNAKE for constants when appropriate.
- Avoid `enum`; prefer a plain object with `as const` and a T-prefixed type alias.
- Prefer `const` over `let`.
- Define private class fields and methods with ECMAScript `#private` syntax instead of the TypeScript `private` keyword.
- Prefer early returns and guard clauses to reduce nesting.
- Conditions must always use block braces `{}`; do not use single-statement form without braces.
- Format objects with one property per line and a trailing comma after the last property.
- When passing an object parameter to a function, always put it on multiple lines, even with one property. Put each property on its own line, include a trailing comma, and sort properties by key length from shortest to longest.
- In callbacks, use a concise arrow return only when the return value is a **single, simple expression** (e.g., accessing a property or calling one function). When the return value is an object literal or requires any multi-step mapping, always use a block body with `return`.
- Use `_` as a numeric separator for numbers with four or more digits (`1_000`, `10_000`, `100_000`).
- **Destructure function parameters** at the first level in the function signature. Do not destructure nested properties (level 2+) in the signature; handle nested destructuring inside the function body. If the entire parameter object is needed for other calls, destructure its properties inside the function body instead of the signature.

```ts
// Do:

// ✅ Prefer const over let
const maxRetries = 3;

// ✅ Use _ as numeric separator for numbers with 4+ digits
const rateLimitMs = 1_000;
const maxRequestsPerDay = 10_000;
const uploadLimitBytes = 100_000_000;

// ✅ Plain object + as const, not enum
const status = {
  pending: 'pending',
  done: 'done',
} as const;

type TStatus = (typeof status)[keyof typeof status];

// ✅ Early return; if/switch use {}; object one property per line + trailing comma
async function handleUser(user: IUser | null) {
  if (!user) {
    return {
      ok: false,
      error: new Error('Not found'),
    };
  }

  await process(user);
}

// ✅ Conditions always use block braces
if (a) {
  return 1;
}

function getLabel(value: number) {
  switch (value) {
    case 1: {
      return 'one';
    }
    default: {
      return 'other';
    }
  }
}

// ✅ Object parameters are multi-line and sorted by key length
const user = await userRepository.findById({
  id: userId,
});

await emailService.sendWelcomeEmail({
  to: user.email,
  locale: user.locale,
  userName: user.name,
});

// ✅ Private class fields and methods use #private syntax
class UserService {
  readonly #userRepository: IUserRepository;

  public constructor(params: IUserServiceParams) {
    this.#userRepository = params.userRepository;
  }

  public async find(params: IFindUserParams): Promise<IUser | null> {
    return this.#findById(params.id);
  }

  async #findById(id: TUserId): Promise<IUser | null> {
    return this.#userRepository.findById(id);
  }
}

// ✅ Concise arrow: single simple expression
const ids = products.map((product) => product.id);

// ✅ Block body + return: return value is an object
const summaries = products.map((product) => {
  return {
    id: product.id,
    name: product.name,
  };
});

// ✅ Block body + return for multi-step object mapping
const orderSummaries = orders.map((order) => {
  return {
    id: order.id,
    customerName: order.customer.name,
    total: order.items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0),
  };
});

// ✅ Destructure function parameters at the first level in the signature
function doSomethingGood({ email }: IParams): void {
  verifyEmail({
    email,
  });
}

// ✅ Destructure level 2+ properties inside the function body
function doSomethingNested({ email, credentials }: IParams): void {
  const { accessToken, secretToken } = credentials;
  verifyEmail({
    email,
  });
}

// ✅ Destructure inside the body if the original parameter object is needed
function doSomethingWithParams(params: IParams): void {
  const { email } = params;
  verifyEmail({
    email,
  });
  const data = extractParams(params);
}
```

```ts
// Don't:

// ❌ Use const when value does not change
let maxRetries = 3;

// ❌ Do not write large numbers without _ separators
const rateLimitMs = 1000;
const maxRequestsPerDay = 10000;
const uploadLimitBytes = 100000000;

// ❌ Use plain object + as const, not enum
enum StatusEnum {
  Pending,
  Done,
}

// ❌ Use early return instead of nested if/else
async function handleUserNested(user: IUser | null) {
  if (user) {
    await process(user);
  } else {
    return {
      ok: false,
      error: new Error('Not found'),
    };
  }
}

// ❌ Conditions must not use single-statement form without braces
if (a) return 1;
if (flag) doSomething();
switch (x) {
  case 1:
    return 'a';
}

// ❌ Object: one property per line + trailing comma
return { ok: false, error: new Error('Not found') };

// ❌ Object parameters must not be inline, even with one property
const user = await userRepository.findById({ id: userId });

// ❌ Object parameters must not be sorted longest-first
await emailService.sendWelcomeEmail({
  userName: user.name,
  locale: user.locale,
  to: user.email,
});

// ❌ Do not use TypeScript private keyword for class internals
class UserService {
  private readonly userRepository: IUserRepository;

  public constructor(params: IUserServiceParams) {
    this.userRepository = params.userRepository;
  }

  public async find(params: IFindUserParams): Promise<IUser | null> {
    return this.findById(params.id);
  }

  private async findById(id: TUserId): Promise<IUser | null> {
    return this.userRepository.findById(id);
  }
}

// ❌ Do not use inline object arrow return — wrap in a block with return instead
const summaries = products.map((product) => ({ id: product.id, name: product.name }));

// ❌ Do not use concise arrow for multi-step object mapping either
const orderSummaries = orders.map((order) => ({
  id: order.id,
  customerName: order.customer.name,
  total: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
}));

// ❌ Do not use params.propertyName instead of first-level destructuring
function doSomethingBad(params: IParams): void {
  verifyEmail({
    email: params.email,
  });
}

// ❌ Do not destructure from level 2+ in the function signature
function doSomethingNestedBad({ email, credentials: { accessToken, secretToken } }: IParams): void {
  verifyEmail({
    email,
  });
}

// ❌ Do not use params.propertyName if the original parameter object is needed
function doSomethingWithParamsBad(params: IParams): void {
  verifyEmail({
    email: params.email,
  });
  const data = extractParams(params);
}
```
