import { defineConfig } from 'vitest/config';

// Unit tests for the ES modules in src/, run straight from source (no build).
// Pure modules run in Node; files that need a DOM opt in with
// `// @vitest-environment jsdom` at the top.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    restoreMocks: true,
    unstubGlobals: true,
  },
});
