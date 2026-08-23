import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * Two deliberate choices:
 *
 * 1. `baseURL` comes from E2E_BASE_URL so the same suite runs against a local
 *    `vercel dev`, a Vercel preview deployment, or production. Hard-coding
 *    localhost would mean the suite can only ever prove that the dev server
 *    works.
 *
 * 2. The suite is split into two projects. `public` covers everything an
 *    unauthenticated visitor can reach and runs anywhere, including CI with no
 *    credentials. `authenticated` covers the social features and is SKIPPED
 *    unless E2E_STORAGE_STATE points at a saved signed-in session — because
 *    auth is Campus One SSO, which cannot be scripted from a test.
 *
 * To record a session for the authenticated project:
 *   npx playwright open --save-storage=.auth/state.json <your app url>
 *   E2E_STORAGE_STATE=.auth/state.json npm run test:e2e
 */

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const storageState = process.env.E2E_STORAGE_STATE;

export default defineConfig({
    testDir: './e2e',
    // Fail the build rather than silently passing if someone commits test.only.
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? [['github'], ['list']] : [['list']],

    timeout: 30_000,
    expect: { timeout: 10_000 },

    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // The audience is largely on mobile data; a test that only passes on a
        // fast connection is not testing the real thing.
        actionTimeout: 15_000,
    },

    projects: [
        {
            name: 'public-desktop',
            testMatch: /.*\.public\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'public-mobile',
            testMatch: /.*\.public\.spec\.ts/,
            // The spec calls the mobile experience "especially important", so
            // it is a first-class project rather than an afterthought.
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'authenticated',
            testMatch: /.*\.auth\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                ...(storageState ? { storageState } : {}),
            },
        },
    ],
});
