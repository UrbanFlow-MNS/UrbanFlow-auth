// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },

  // Base ESLint recommended
  eslint.configs.recommended,

  // TS + type-checking
  ...tseslint.configs.recommendedTypeChecked,

  {
    plugins: {
      unicorn,
    },

    rules: {
      // --- TS rules ---
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',

      // --- Unicorn rules (activées mais raisonnables) ---
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prevent-abbreviations': 'off', // trop strict pour Nest
      'unicorn/filename-case': [
        'warn',
        {
          case: 'kebabCase',
        },
      ],
      'unicorn/no-null': 'off', // Nest utilise null dans les DTO
      'unicorn/no-array-callback-reference': 'warn',

      // Tu peux en ajouter plus selon besoins
    },

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }
);
