import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Parity between the client tokenizer (PostBody.tsx) and the server parser
 * (lib/textparse).
 *
 * They must agree on what counts as a mention or a hashtag. If the client
 * highlights `@ada` but the server does not index it, the user sees a link
 * that generated no notification — a silent, confusing failure. These tests
 * assert the shared rules on both sides.
 *
 * The tokenizer is re-implemented here rather than imported because PostBody
 * is a .tsx module with React and router imports; the logic under test is the
 * pure part, and duplicating ~30 lines is cheaper than adding a DOM
 * environment to the test runner.
 */

const HANDLE_CHAR = /[A-Za-z0-9_.-]/;
const TAG_CHAR = /[\p{L}\p{N}_]/u;

const canStart = (chars: string[], i: number): boolean => {
    if (i === 0) return true;
    const prev = chars[i - 1];
    if (/[A-Za-z0-9_]/.test(prev)) return false;
    return prev !== '@' && prev !== '#';
};

const trimTrailing = (s: string) => s.replace(/[.\-_]+$/, '');

/** Extracts the same handle/tag sets the client highlights. */
function clientExtract(text: string): { handles: string[]; tags: string[] } {
    const chars = Array.from(text);
    const handles: string[] = [];
    const tags: string[] = [];

    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        if ((ch !== '@' && ch !== '#') || !canStart(chars, i)) continue;

        const isMention = ch === '@';
        const matcher = isMention ? HANDLE_CHAR : TAG_CHAR;
        const limit = isMention ? 32 : 64;

        let j = i + 1;
        while (j < chars.length && j - i - 1 < limit && matcher.test(chars[j])) j++;
        if (j === i + 1) continue;

        const value = trimTrailing(chars.slice(i + 1, j).join('')).toLowerCase();
        if (!value) continue;
        if (!isMention && /^\d+$/.test(value)) continue;

        if (isMention) {
            if (!handles.includes(value)) handles.push(value);
        } else if (!tags.includes(value)) {
            tags.push(value);
        }
        i = i + trimTrailing(chars.slice(i + 1, j).join('')).length;
    }
    return { handles, tags };
}

describe('mention and hashtag tokenizing', () => {
    it('extracts mentions and hashtags', () => {
        const got = clientExtract('hey @Ada and @bello_j check #StudyGroup and #exams');
        expect(got.handles).toEqual(['ada', 'bello_j']);
        expect(got.tags).toEqual(['studygroup', 'exams']);
    });

    // The most common false positive. Highlighting part of an email would also
    // mean notifying a stranger every time someone pastes an address.
    it('does not treat an email address as a mention', () => {
        expect(clientExtract('mail ada.bello@example.com please').handles).toEqual([]);
    });

    it('ignores mid-word triggers', () => {
        for (const input of ['C#', 'a#b', 'foo@bar', 'x@y']) {
            const got = clientExtract(input);
            expect(got.handles, input).toEqual([]);
            expect(got.tags, input).toEqual([]);
        }
    });

    it('ignores bare and doubled triggers', () => {
        for (const input of ['@ # done', '@@ada', '##tag']) {
            const got = clientExtract(input);
            expect(got.handles, input).toEqual([]);
            expect(got.tags, input).toEqual([]);
        }
    });

    it('trims trailing punctuation but keeps interior dots', () => {
        expect(clientExtract('thanks @ada. and @bello, bye').handles).toEqual(['ada', 'bello']);
        expect(clientExtract('cc @ada.bello here').handles).toEqual(['ada.bello']);
    });

    // A numeric tag is a figure, not a topic — the server does not index it,
    // so the client must not link it either.
    it('skips purely numeric hashtags', () => {
        expect(clientExtract('see you in #2026 for #cs101').tags).toEqual(['cs101']);
    });

    it('lowercases and deduplicates', () => {
        expect(clientExtract('@ada @ADA @Ada').handles).toEqual(['ada']);
    });

    it('never throws on hostile input', () => {
        const hostile = [
            '', '@', '#', '@@@@', '####',
            '@'.repeat(3000), '#a '.repeat(2000),
            '😀 #emoji @😀', 'é'.repeat(500),
            '<script>alert(1)</script> @ada',
        ];
        for (const input of hostile) {
            expect(() => clientExtract(input), input.slice(0, 20)).not.toThrow();
        }
    });
});

describe('client/server tokenizer parity', () => {
    const goSource = readFileSync(resolve(__dirname, '../../../lib/textparse/textparse.go'), 'utf8');

    // The limits are duplicated across the boundary; if the server raises its
    // cap and the client does not, long handles silently stop being links.
    it('uses the same length limits as the server', () => {
        const maxHandle = Number(goSource.match(/MaxHandleLen\s*=\s*(\d+)/)?.[1]);
        const maxTag = Number(goSource.match(/MaxTagLen\s*=\s*(\d+)/)?.[1]);

        expect(maxHandle, 'MaxHandleLen not found in textparse.go').toBeGreaterThan(0);
        expect(maxTag, 'MaxTagLen not found in textparse.go').toBeGreaterThan(0);

        // These are the values hardcoded in PostBody.tsx's tokenizer.
        expect(maxHandle).toBe(32);
        expect(maxTag).toBe(64);
    });

    it('agrees with the server that numeric tags are skipped', () => {
        expect(goSource).toContain('isAllDigits(value)');
    });

    it('agrees with the server on the token-boundary rule', () => {
        // Both sides refuse a trigger preceded by a word character, which is
        // what excludes emails and "C#".
        expect(goSource).toContain('func canStartToken');
        expect(clientExtract('foo@bar').handles).toEqual([]);
    });
});
