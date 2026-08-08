import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/*.{spec,e2e}.ts'],
    name: 'hono-zod',
  },
});
