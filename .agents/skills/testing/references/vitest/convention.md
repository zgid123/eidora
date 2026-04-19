---
name: Test Convention
description: Vitest test structure convention for Alpha's JS/TS projects
---

# Test Convention

Each test should follow one of the patterns below.

```ts
describe('#<name of function to be tested>', () => {
  suite('when <context>', () => {
    it('<action> something', () => {
      // do something here
      // expect result
    });
  });

  suite('when <context>', () => {
    it('<action> something', () => {
      // do something here
      // expect result
    });
  });

  describe('<nested context group>', () => {
    suite('when <context>', () => {
      it('<action> something', () => {
        // do something here
        // expect result
      });
    });

    suite('when <context>', () => {
      it('<action> something', () => {
        // do something here
        // expect result
      });
    });
  });
});
```

```ts
describe('#<name of class to be tested>', () => {
  describe('.<name of method>', () => {
    suite('when <context>', () => {
      it('<action> something', () => {
        // do something here
        // expect result
      });
    });

    suite('when <context>', () => {
      it('<action> something', () => {
        // do something here
        // expect result
      });
    });

    describe('<nested context group>', () => {
      suite('when <context>', () => {
        it('<action> something', () => {
          // do something here
          // expect result
        });
      });

      suite('when <context>', () => {
        it('<action> something', () => {
          // do something here
          // expect result
        });
      });
    });
  });
});
```

### Rules

- One `suite` has **only one** `it`. Do not put multiple `it` blocks inside a single `suite`.
- For services that follow the **Service Object pattern** (single `exec`/`execute`/`call` method), you can omit `describe('.<name of method>')` and declare all `suite` blocks directly under `describe('#ServiceName', ...)`.
- Unit and integration test files use the `.spec.ts` extension.
- E2E test files use the `.e2e.ts` extension.
- All test files live under `src/__tests__` mirroring the source structure.

### Sample test file

```ts
// utils/math.ts
export function add(a: number | string, b: number): number {
  return Number(a) + b;
}

// __tests__/utils/math.spec.ts
import { add } from '../../utils/math';

describe('#add', () => {
  suite('when a is string', () => {
    it('converts a to number and does sum a and b', () => {
      const result = add('2', 3);

      expect(result).toEqual(5);
    });
  });

  suite('when a is number', () => {
    it('does sum a and b', () => {
      const result = add(2, 3);

      expect(result).toEqual(5);
    });
  });
});
```

```ts
// services/MathService.ts
export class MathService {
  public static add(a: number | string, b: number): number {
    return Number(a) + b;
  }
}

// __tests__/services/MathService.spec.ts
import { MathService } from '../../services/MathService';

describe('#MathService', () => {
  describe('.add', () => {
    suite('when a is string', () => {
      it('converts a to number and does sum a and b', () => {
        const result = MathService.add('2', 3);

        expect(result).toEqual(5);
      });
    });

    suite('when a is number', () => {
      it('does sum a and b', () => {
        const result = MathService.add(2, 3);

        expect(result).toEqual(5);
      });
    });
  });
});
```
