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
- Write every `if`, `else if`, and `else` body as a multiline block with braces `{}`, even when it contains only one call, assignment, or early return. Apply this inside callbacks and nested functions as well. Braces keep control flow explicit and make later edits safer; the surrounding function's braces do not satisfy this rule.
- Format every non-empty object literal, including objects passed as function or method arguments, with one property per line and a trailing comma, even when it has only one shorthand property; see [Objects and Object Arguments](#objects-and-object-arguments).
- Use concise arrow bodies only for single, simple expressions whose entire containing statement stays comfortably short within the project's configured line width. Use a block body with an explicit `return` for object or array literals, multiline expressions, and complex transformations. Apply this to all arrow functions, including callbacks; see [Arrow Function Returns](#arrow-function-returns).
- Use `_` as a numeric separator for numbers with four or more digits (`1_000`, `10_000`, `100_000`).
- **Public API parameters**: Project-owned exported functions and public instance methods with inputs use one named interface parameter object. Keep zero-argument APIs parameterless and preserve signatures required by framework or third-party contracts (for example CQRS `exec(command)` handlers). Do not wrap contract arguments or destructure an object when its identity or behavior is needed.
- **Destructure function parameters** at the first level in the function signature when using individual properties. Do not destructure nested properties (level 2+) in the signature; handle nested destructuring inside the function body. If the entire parameter object is needed for other calls, destructure its properties inside the function body instead of the signature.

## Arrow Function Returns

Use an implicit return only when the arrow body is both simple and short. If it is complex or too long, use a block body with an explicit `return`. Both forms are arrow functions; the choice is whether to return implicitly or explicitly.

Keep concise arrows for expressions readers can understand at a glance. Returning a constructed object or array, nesting transformations, or spreading an expression over multiple lines warrants a block body with an explicit `return`, even when TypeScript considers it a single expression. Do not compress a complex expression onto one line to avoid this rule. Judge length using the entire containing statement, including indentation, the variable declaration, collection name, callback parameters, and surrounding call syntax—not just the returned expression. Even a straightforward function call needs a block body with `return` when that line becomes long or cramped. Use the project's configured line width as an upper bound, not a target; prefer a block body earlier when it improves readability, and when in doubt choose the explicit return. Do not merely wrap an implicit arrow body in parentheses or move it to another line to address length. Preserve the returned value when converting an implicit return to a block body.

```ts
// ✅ Short, simple expressions can stay concise
const ids = products.map((product) => product.id);
const labels = names.map((name) => trim(name));

// ✅ Use an explicit return when the containing statement feels long
const names = namesToNormalize.map((name) => {
  return normalizeName(name);
});

// ✅ Array construction uses a block body and explicit return
const messageFiles = ['en.json', 'vi.json'].flatMap((locale) => {
  return [resolve(sharedMessagesDirectory, locale), resolve(localMessagesDirectory, locale)];
});
```

```ts
// ❌ A multiline array return must not use a concise arrow body
const messageFiles = ['en.json', 'vi.json'].flatMap((locale) => [
  resolve(sharedMessagesDirectory, locale),
  resolve(localMessagesDirectory, locale),
]);
```

## Objects and Object Arguments

Write every non-empty object literal across multiple lines: put each property on its own line and add a trailing comma after the last one. This applies to returned objects, variable initializers, and objects passed as function or method arguments. It covers every call, not only project-owned APIs: options objects passed to third-party or framework APIs (Drizzle, ORM, HTTP, and validation libraries), objects nested inside other objects, and objects inside chained calls or schema definitions follow the same rule. A single property, including a shorthand property such as `{ id }`, gets no exception. Order the properties as described in [Property Ordering](#property-ordering).

Formatters such as Biome, Prettier, and oxfmt keep an expanded object expanded but never expand an inline one, so a passing format check does not mean the code follows this rule. Write the object expanded from the start.

```ts
// ✅ Single shorthand property is still multiline with a trailing comma
const project = await this.#projectRepository.findOne({
  id,
});

if (!project) {
  throw ProjectError.notFound();
}

await this.#projectRepository.delete({
  id,
});

// ✅ Library options objects inside chained schema calls are multiline too
export const seriesPosts = sqliteTable('series_posts', {
  ...baseUuidSchema,
  seriesId: text('series_id')
    .notNull()
    .references(() => series.id, {
      onDelete: 'cascade',
    }),
  postId: text('post_id')
    .notNull()
    .unique()
    .references(() => posts.id, {
      onDelete: 'cascade',
    }),
});
```

```ts
// ❌ Inline object arguments, even with one shorthand property
const project = await this.#projectRepository.findOne({ id });

await this.#projectRepository.delete({ id });

// ❌ Third-party options objects get no exception
const seriesId = text('series_id')
  .notNull()
  .references(() => series.id, { onDelete: 'cascade' });
```

This invalid example, which is multiline but missing the trailing comma, is shown as plain text so formatters preserve the violation:

```text
await this.#projectRepository.delete({
  id
});
```

Empty objects (`{}`) stay inline. Destructuring patterns in parameters and declarations are not object literals and are outside this rule.

## Statement Spacing

Use blank lines to separate control flow and asynchronous work from surrounding statements, including inside callbacks:

- Insert a blank line before an `if` when another statement precedes it in the same block, and after the entire conditional chain when another statement follows it. Keep `} else if (...) {` and `} else {` connected; do not insert blank lines between branches.
- Insert a blank line between an awaited statement and an adjacent non-awaited statement. This includes standalone `await` calls, assignments using `await`, declarations initialized with `await`, and `return await`.
- Consecutive awaited statements may stay together without blank lines, including consecutive declarations initialized with `await`.
- Do not add blank lines immediately after an opening block brace or immediately before a closing block brace solely to satisfy these rules. These rules separate statements; they do not add blank lines between properties inside interfaces, types, or object literals.

```ts
// ✅ Separate the lookup, guard clause, and subsequent statement
const answers = testCase.answers.map((answer) => {
  const question = seededQuestions[answer.questionNo - 1];

  if (!question) {
    throw new Error(`Question ${answer.questionNo} not found in seed`);
  }

  return {
    questionId: String(question.id),
    value: Math.round(answer.rawAnswer),
  };
});

// ✅ Keep consecutive awaits together, separated from synchronous statements
const before = 424;

await doSomething();
await doSomethingElse();

const after = 123;

// ✅ Awaited declarations form an asynchronous group too
const user = await loadUser();
const settings = await loadSettings();

useSettings(settings);
```

```ts
// ❌ Missing a blank line before the conditional
const question = seededQuestions[answer.questionNo - 1];
if (!question) {
  throw new Error('Question not found');
}

// ❌ Missing a blank line after the conditional
if (!question) {
  throw new Error('Question not found');
}
useQuestion(question);

// ❌ Awaited work must be separated from synchronous statements on both sides
const before = 424;
await doSomething();
const after = 123;
```

## Property Ordering

Organize properties in interfaces, object-shaped type aliases, and object literals (including function arguments) by meaning so readers can understand related data together. Apply this order at each nesting level:

1. **Identifiers and primary keys**: Unique IDs, UUIDs, and slugs.
2. **Core data fields**: Primary domain data. Keep tightly coupled fields adjacent, such as `firstName` and `lastName`, or `street`, `city`, and `zipCode`.
3. **System and metadata**: Internal metrics, flags, and system fields such as `status`, `isActive`, and `role`.
4. **Timestamps**: Creation, modification, and deletion dates, such as `createdAt`, `updatedAt`, and `deletedAt`.
5. **Optional and extension fields**: All properties marked with `?`, plus loose extension records such as `meta` and `customData`, at the absolute bottom. This takes precedence over the earlier groups: even optional identifiers and timestamps belong here. For object literals, use the declared shape to identify optional properties when available. Preserve semantic grouping within this final group.

Do not insert blank lines between property groups; keep interface, type, and object property blocks continuous. Do not sort properties by string length. Do not sort strictly alphabetically when it breaks semantic grouping or separates logical pairs.

When refactoring object literals, preserve runtime behavior: do not move spreads, duplicate keys, or expressions whose evaluation order matters merely to satisfy ordering.

```ts
interface IUserProfile {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  zipCode: string;
  status: string;
  isActive: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  externalId?: string;
  middleName?: string;
  deletedAt?: Date;
  meta?: Record<string, unknown>;
}

type TProfileSnapshot = {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;
  customData: Record<string, unknown>;
};
```

## General Examples

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

// ✅ A callback's conditional needs its own multiline block
const complete = () => {
  if (!cancelled) {
    onComplete();
  }
};

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

// ✅ Object parameters are multi-line and semantically grouped
const user = await userRepository.findById({
  id: userId,
});

await emailService.sendWelcomeEmail({
  to: user.email,
  userName: user.name,
  locale: user.locale,
});

// ✅ Private class fields and methods use #private syntax
class UserService {
  readonly #userRepository: IUserRepository;

  public constructor(params: IUserServiceParams) {
    this.#userRepository = params.userRepository;
  }

  public async find({ id }: IFindUserParams): Promise<IUser | null> {
    return this.#findById(id);
  }

  async #findById(id: TUserId): Promise<IUser | null> {
    return this.#userRepository.findById({
      id,
    });
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

// ❌ The arrow function's braces do not replace the if body's braces
const complete = () => {
  if (!cancelled) onComplete();
};
```

This invalid single-line block is shown as plain text so formatters preserve the violation:

```text
if (!cancelled) { onComplete(); }
```

```ts
switch (x) {
  case 1:
    return 'a';
}

// ❌ Object: one property per line + trailing comma
return { ok: false, error: new Error('Not found') };

// ❌ Object parameters must not be inline, even with one property
const user = await userRepository.findById({ id: userId });

// ❌ Sorting by key length separates recipient data (to and userName)
await emailService.sendWelcomeEmail({
  to: user.email,
  locale: user.locale,
  userName: user.name,
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

// ❌ Do not move first-level destructuring into the body when only a property is used
function findUserBad(params: IFindUserParams): Promise<IUser | null> {
  const { id } = params;
  return userRepository.findById({
    id,
  });
}

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
