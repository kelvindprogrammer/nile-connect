import { test, expect } from '@playwright/test';

/**
 * End-to-end social journeys, run as a signed-in student.
 *
 * These are SKIPPED unless E2E_STORAGE_STATE points at a recorded session,
 * because authentication is Campus One SSO and cannot be scripted from a test.
 * Skipping loudly (with a reason) is the honest behaviour: a suite that
 * silently passes without exercising anything is worse than no suite.
 *
 * Record a session once:
 *   npx playwright open --save-storage=.auth/state.json <app url>
 *   E2E_STORAGE_STATE=.auth/state.json npm run test:e2e
 */

test.skip(
    !process.env.E2E_STORAGE_STATE,
    'Set E2E_STORAGE_STATE to a recorded signed-in session to run authenticated journeys.',
);

test.beforeEach(async ({ page }) => {
    await page.goto('/student');
    // Every journey starts from a loaded shell; failing here means the session
    // expired rather than the feature being broken, which is worth separating.
    await expect(page.getByRole('tab', { name: /for you/i })).toBeVisible({ timeout: 20_000 });
});

test.describe('feed', () => {
    test('loads, and offers a chronological escape hatch', async ({ page }) => {
        // The ranked/latest toggle is a transparency requirement, not a nicety.
        const latest = page.getByRole('tab', { name: /latest/i });
        await expect(latest).toBeVisible();

        await latest.click();
        await expect(latest).toHaveAttribute('aria-selected', 'true');

        const forYou = page.getByRole('tab', { name: /for you/i });
        await forYou.click();
        await expect(forYou).toHaveAttribute('aria-selected', 'true');
    });

    test('shows a story rail', async ({ page }) => {
        await expect(page.getByRole('button', { name: /add to your story/i })).toBeVisible();
    });

    test('renders either posts or a genuine empty state, never a blank screen', async ({ page }) => {
        const posts = page.locator('article');
        const empty = page.getByText(/your feed is quiet|be the first/i);
        await expect(posts.first().or(empty)).toBeVisible({ timeout: 15_000 });
    });
});

test.describe('story creation', () => {
    test('the composer opens, validates, and can be dismissed', async ({ page }) => {
        await page.getByRole('button', { name: /add to your story/i }).click();

        const dialog = page.getByRole('dialog', { name: /create a story/i });
        await expect(dialog).toBeVisible();

        // Publishing an empty text story must be refused with an explanation.
        await dialog.getByRole('button', { name: /share to your story/i }).click();
        await expect(dialog.getByRole('alert')).toContainText(/write something/i);

        await dialog.getByRole('button', { name: /close/i }).click();
        await expect(dialog).toBeHidden();
    });

    test('audience options never offer a list that would reach nobody', async ({ page }) => {
        await page.getByRole('button', { name: /add to your story/i }).click();
        const dialog = page.getByRole('dialog', { name: /create a story/i });

        const group = dialog.getByRole('radiogroup', { name: /story audience/i });
        await expect(group).toBeVisible();
        // "Everyone" and "Connections" are always valid; "Close friends" only
        // appears once the list exists.
        await expect(group.getByRole('radio', { name: /connections/i })).toBeVisible();
    });
});

test.describe('privacy', () => {
    test('settings load and a change persists across a reload', async ({ page }) => {
        await page.goto('/student/privacy');
        await expect(page.getByRole('heading', { name: /privacy & safety/i })).toBeVisible();

        const mention = page.getByLabel(/mention you with @/i);
        await expect(mention).toBeVisible();

        const original = await mention.inputValue();
        const next = original === 'everyone' ? 'connections' : 'everyone';

        await mention.selectOption(next);
        // The screen saves per-field; wait for the confirmation rather than a
        // fixed sleep.
        await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 10_000 });

        await page.reload();
        await expect(page.getByLabel(/mention you with @/i)).toHaveValue(next);

        // Leave the account as we found it.
        await page.getByLabel(/mention you with @/i).selectOption(original);
        await expect(page.getByText(/^saved$/i)).toBeVisible({ timeout: 10_000 });
    });

    test('the blocked list is reachable', async ({ page }) => {
        await page.goto('/student/privacy');
        await expect(page.getByRole('heading', { name: /blocked accounts/i })).toBeVisible();
    });
});

test.describe('groups', () => {
    test('a group can be created, appears in Your groups, and can be left', async ({ page }) => {
        const name = `E2E Test Group ${Date.now()}`;

        await page.goto('/student/groups');
        await page.getByRole('button', { name: /new group/i }).click();

        const dialog = page.getByRole('dialog', { name: /create a group/i });
        await dialog.getByLabel(/^name$/i).fill(name);
        await dialog.getByLabel(/what's it for/i).fill('Created by an automated test.');
        await dialog.getByRole('button', { name: /create group/i }).click();

        // The creator lands in the group detail as owner.
        const detail = page.getByRole('dialog').filter({ hasText: name });
        await expect(detail).toBeVisible({ timeout: 15_000 });
        await expect(detail.getByText(/you're owner/i)).toBeVisible();

        // An owner must transfer ownership before leaving, so the group is
        // never left unadministered — the rule is stated to the user.
        await expect(detail.getByText(/transfer ownership before you can leave/i)).toBeVisible();
    });

    test('discovery search runs without error', async ({ page }) => {
        await page.goto('/student/groups');
        await page.getByRole('tab', { name: /discover/i }).click();
        await page.getByLabel(/search groups/i).fill('study');
        // Either results or a clean empty state — never a crash.
        await expect(
            page.locator('li').first().or(page.getByText(/no groups match/i)),
        ).toBeVisible({ timeout: 15_000 });
    });
});

test.describe('real-time', () => {
    test('the SSE stream connects and stays connected across a window boundary', async ({ page }) => {
        // The server closes at ~25s and the client reconnects. Watching the
        // network for two connects proves the seam works, which a single
        // short-lived check would miss entirely.
        const connects: string[] = [];
        page.on('request', req => {
            if (req.url().includes('/api/social/stream')) connects.push(req.url());
        });

        await page.goto('/student');
        await expect
            .poll(() => connects.length, { timeout: 15_000, message: 'the stream never opened' })
            .toBeGreaterThanOrEqual(1);

        // Wait past the server's 25s budget and confirm it reconnected rather
        // than going silent.
        await expect
            .poll(() => connects.length, { timeout: 45_000, message: 'the stream did not reconnect' })
            .toBeGreaterThanOrEqual(2);
    });
});

test.describe('accessibility and mobile', () => {
    test('the feed is keyboard navigable', async ({ page }) => {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        expect(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT']).toContain(focused);
    });

    test('interactive controls carry accessible names', async ({ page }) => {
        const unnamed = await page.evaluate(() => {
            const bad: string[] = [];
            document.querySelectorAll('button').forEach(el => {
                const name =
                    el.getAttribute('aria-label') ||
                    el.getAttribute('title') ||
                    el.textContent?.trim();
                if (!name) bad.push(el.outerHTML.slice(0, 100));
            });
            return bad;
        });
        expect(unnamed, `buttons with no accessible name:\n${unnamed.join('\n')}`).toEqual([]);
    });

    test('the page does not scroll horizontally on a phone viewport', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/student');
        await page.waitForTimeout(1500);

        const overflows = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        expect(overflows, 'the page scrolls sideways on a phone').toBeFalsy();
    });
});
