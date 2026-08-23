import { defineConfig } from 'vitest/config';

/**
 * Vitest owns the unit tests under src/. Playwright owns e2e/.
 *
 * Without this split vitest collects the Playwright specs, fails to run them
 * (they use a different `test` API), and reports a red suite even though every
 * unit test passed — which trains people to ignore the result.
 */
export default defineConfig({
    test: {
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['node_modules/**', 'dist/**', 'e2e/**', 'backend/**'],
        environment: 'node',
    },
});
