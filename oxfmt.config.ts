import sharedConfig from '@alphacifer/oxc/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...sharedConfig,
  ignorePatterns: [
    ...sharedConfig.ignorePatterns,
    '**/package.json',
    '.agents/**',
  ],
});
