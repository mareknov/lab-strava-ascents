import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', '**/dist/**', '**/dist-tsc/**', 'node_modules/**', 'test/fixtures/**', '**/*.generated.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Cross-package encapsulation is enforced structurally by each package's
      // "exports" field — a deep path simply will not resolve. This rule turns
      // the same mistake into a lint error at the point it is written, with a
      // message that says where to put the export instead.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@ascents/*/src/*', '@ascents/*/dist/*'],
              message:
                'Import from the package root. If something is not exported, add it to that package index.ts.',
            },
          ],
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // The domain package must stay free of browser and Node APIs. Its tsconfig
    // already omits both type libraries, so this is a second line of defence.
    files: ['packages/domain/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'document', message: '@ascents/domain must stay pure — no DOM.' },
        { name: 'window', message: '@ascents/domain must stay pure — no DOM.' },
        { name: 'localStorage', message: '@ascents/domain must stay pure — no DOM.' },
      ],
    },
  },
  {
    files: ['tools/**/*.js', '*.config.ts', '*.config.js'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
