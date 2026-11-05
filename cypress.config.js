import { defineConfig } from 'cypress';

// The e2e suite runs against scripts/serve.mjs (port 8765 by default, so it
// doesn't clash with a dev server on 8080). `npm run test:e2e` starts it.
const port = process.env.E2E_PORT ?? 8765;

export default defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL ?? `http://127.0.0.1:${port}`,
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1200,
    viewportHeight: 900,
    defaultCommandTimeout: 8000,
    video: false,
    screenshotOnRunFailure: true,
    retries: { runMode: 0, openMode: 0 }, // flakiness is a bug to fix, not to retry away
  },
});
