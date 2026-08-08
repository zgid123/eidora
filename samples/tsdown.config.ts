import { type Loader, transform } from 'esbuild';
import { defineConfig } from 'tsdown';

function resolveLoader(id: string): Loader | undefined {
  const fileName = id.split('?', 1)[0] || '';

  if (fileName.endsWith('.tsx')) {
    return 'tsx';
  }

  if (/\.[cm]?ts$/.test(fileName)) {
    return 'ts';
  }

  if (fileName.endsWith('.jsx')) {
    return 'jsx';
  }

  if (/\.[cm]?js$/.test(fileName)) {
    return 'js';
  }

  return undefined;
}

export default defineConfig({
  dts: true,
  entry: ['src/core/*.ts', 'src/zod/*.ts'],
  format: ['esm', 'cjs'],
  outDir: 'lib',
  plugins: [
    {
      name: 'stage-3-decorators',
      transform: {
        order: 'pre',
        async handler(code, id) {
          const loader = resolveLoader(id);

          if (!loader) {
            return null;
          }

          const result = await transform(code, {
            format: 'esm',
            loader,
            sourcefile: id,
            target: 'node20',
            tsconfigRaw: {
              compilerOptions: {
                experimentalDecorators: false,
                useDefineForClassFields: true,
              },
            },
          });

          return {
            code: result.code,
          };
        },
      },
    },
  ],
  target: 'node20',
});
