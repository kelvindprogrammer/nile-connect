import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * API contract and authorisation tests.
 *
 * These run WITHOUT credentials, which is exactly what makes them valuable:
 * they prove that an anonymous caller cannot reach anything they should not,
 * and that the public endpoints answer in the documented envelope.
 *
 * Everything here exercises the real deployment over HTTP — no mocks, no
 * stubs. A pass means the route table, the auth middleware and the response
 * envelope all agree in the environment under test.
 */

/** Every social route that must require a signed-in caller. */
const AUTHENTICATED_ROUTES: Array<{ path: string; method: 'get' | 'post' | 'put' | 'delete' }> = [
    // Social graph
    { path: '/api/social/follow?id=someone', method: 'post' },
    { path: '/api/social/block?id=someone', method: 'post' },
    { path: '/api/social/mute?id=someone', method: 'post' },
    { path: '/api/social/close-friends', method: 'get' },
    { path: '/api/social/relation?id=someone', method: 'get' },
    { path: '/api/social/followers', method: 'get' },
    { path: '/api/social/following', method: 'get' },
    // Privacy
    { path: '/api/social/privacy', method: 'get' },
    { path: '/api/social/privacy', method: 'put' },
    // Reactions & bookmarks
    { path: '/api/social/react', method: 'post' },
    { path: '/api/social/reactions?id=x&subject_type=post', method: 'get' },
    { path: '/api/social/bookmark', method: 'post' },
    { path: '/api/social/bookmarks', method: 'get' },
    { path: '/api/social/collections', method: 'get' },
    { path: '/api/social/feed-signal', method: 'post' },
    // Moderation
    { path: '/api/social/report', method: 'post' },
    // Stories
    { path: '/api/social/story-tray', method: 'get' },
    { path: '/api/social/stories', method: 'post' },
    { path: '/api/social/story-view', method: 'post' },
    { path: '/api/social/story-insights?id=x', method: 'get' },
    { path: '/api/social/story-reply', method: 'post' },
    // Polls
    { path: '/api/social/poll', method: 'post' },
    { path: '/api/social/poll-vote', method: 'post' },
    // Groups
    { path: '/api/social/groups', method: 'get' },
    { path: '/api/social/group-membership?id=x', method: 'post' },
    { path: '/api/social/group-members?id=x', method: 'get' },
    { path: '/api/social/group-invites', method: 'post' },
    { path: '/api/social/group-posts?id=x', method: 'get' },
    { path: '/api/social/communities', method: 'get' },
    // Discovery
    { path: '/api/social/mention-search?q=a', method: 'get' },
    { path: '/api/social/trending', method: 'get' },
    // Real-time & push
    { path: '/api/social/stream', method: 'get' },
    { path: '/api/social/push-subscribe', method: 'post' },
];

/** Routes only staff may reach. An authenticated student must also be refused. */
const STAFF_ONLY_ROUTES = [
    '/api/social/mod/queue',
    '/api/social/mod/stats',
    '/api/social/mod/history',
];

const call = (request: APIRequestContext, method: string, path: string) => {
    switch (method) {
        case 'post': return request.post(path, { data: {}, failOnStatusCode: false });
        case 'put': return request.put(path, { data: {}, failOnStatusCode: false });
        case 'delete': return request.delete(path, { failOnStatusCode: false });
        default: return request.get(path, { failOnStatusCode: false });
    }
};

test.describe('authorisation', () => {
    test('every protected social route refuses an anonymous caller', async ({ request }) => {
        const leaks: string[] = [];

        for (const route of AUTHENTICATED_ROUTES) {
            const response = await call(request, route.method, route.path);
            // 401 is correct. 403/404 are acceptable (a stricter refusal, or a
            // route that hides existence). Anything 2xx is a genuine leak.
            if (response.status() >= 200 && response.status() < 300) {
                leaks.push(`${route.method.toUpperCase()} ${route.path} -> ${response.status()}`);
            }
        }

        expect(leaks, `these routes served an anonymous caller:\n${leaks.join('\n')}`).toEqual([]);
    });

    test('staff-only moderation routes refuse an anonymous caller', async ({ request }) => {
        for (const path of STAFF_ONLY_ROUTES) {
            const response = await request.get(path, { failOnStatusCode: false });
            expect(response.status(), `${path} should not serve anonymously`).toBeGreaterThanOrEqual(400);
        }
    });

    test('an unknown social path returns 404, not a 500', async ({ request }) => {
        const response = await request.get('/api/social?path=definitely-not-a-route', {
            failOnStatusCode: false,
        });
        expect(response.status()).toBe(404);
    });
});

test.describe('public vocabulary endpoints', () => {
    test('the reaction catalog is served and contains no negative reaction', async ({ request }) => {
        const response = await request.get('/api/social/reaction-catalog', { failOnStatusCode: false });
        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(body).toHaveProperty('data.reactions');

        const kinds: string[] = body.data.reactions.map((r: { kind: string }) => r.kind);
        expect(kinds.length).toBeGreaterThan(0);

        // The product decision that there is no public downvote is a safety
        // property for a student audience, asserted end-to-end.
        for (const banned of ['dislike', 'angry', 'downvote', 'sad']) {
            expect(kinds, `${banned} must not be a reaction`).not.toContain(banned);
        }
        // Every entry must be renderable.
        for (const reaction of body.data.reactions) {
            expect(reaction.label, `${reaction.kind} needs a label`).toBeTruthy();
            expect(reaction.emoji, `${reaction.kind} needs an emoji`).toBeTruthy();
        }
    });

    test('report reasons are served, safety-critical ones present', async ({ request }) => {
        const response = await request.get('/api/social/report-reasons', { failOnStatusCode: false });
        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        const reasons: string[] = body.data.reasons.map((r: { reason: string }) => r.reason);

        for (const required of ['self_harm', 'harassment', 'hate_speech', 'spam']) {
            expect(reasons, `${required} must be reportable`).toContain(required);
        }
        // Self-harm must be first, so a distressed reporter finds it without
        // scrolling.
        expect(reasons[0]).toBe('self_harm');
    });

    test('responses use the documented { data: ... } envelope', async ({ request }) => {
        const response = await request.get('/api/social/reaction-catalog', { failOnStatusCode: false });
        const body = await response.json();
        expect(Object.keys(body)).toContain('data');
    });
});

test.describe('resilience', () => {
    test('malformed JSON is rejected cleanly, not with a 500', async ({ request }) => {
        const response = await request.post('/api/social/react', {
            headers: { 'Content-Type': 'application/json' },
            data: '{ this is not json',
            failOnStatusCode: false,
        });
        // Unauthenticated, so 401 comes first; either way it must not be a 5xx.
        expect(response.status()).toBeLessThan(500);
    });

    test('an oversized query string does not crash the handler', async ({ request }) => {
        const huge = 'a'.repeat(5000);
        const response = await request.get(`/api/social/mention-search?q=${huge}`, {
            failOnStatusCode: false,
        });
        expect(response.status()).toBeLessThan(500);
    });

    test('the health endpoint responds', async ({ request }) => {
        const response = await request.get('/api/health', { failOnStatusCode: false });
        expect(response.status()).toBeLessThan(500);
    });
});
