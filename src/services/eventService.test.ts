import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EVENT_CATEGORIES, categoryLabel } from './eventService';

/**
 * The category vocabulary is defined twice — once in Go (`lib/eventcat`) for
 * validation and storage, once here for the three consoles that render it.
 * Divergence between spellings is exactly what caused the QA finding "Event
 * Category Tabs Appear Empty", so the two lists are asserted to agree.
 */
const goSource = readFileSync(resolve(__dirname, '../../lib/eventcat/eventcat.go'), 'utf8');

const goSlugs = (): string[] => {
    const block = goSource.match(/var canonical = \[\]string\{([\s\S]*?)\}/);
    if (!block) throw new Error('could not find the canonical slice in eventcat.go');
    const constNames = block[1].split(',').map(s => s.trim()).filter(Boolean);
    // Resolve each Go constant identifier to its string literal.
    return constNames.map(name => {
        const m = goSource.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]+)"`));
        if (!m) throw new Error(`no literal found for eventcat.${name}`);
        return m[1];
    });
};

const goLabels = (): Record<string, string> => {
    const block = goSource.match(/var labels = map\[string\]string\{([\s\S]*?)\n\}/);
    if (!block) throw new Error('could not find the labels map in eventcat.go');
    const out: Record<string, string> = {};
    for (const line of block[1].split('\n')) {
        const m = line.match(/^\s*(\w+):\s*"([^"]+)"/);
        if (!m) continue;
        const literal = goSource.match(new RegExp(`\\b${m[1]}\\s*=\\s*"([^"]+)"`));
        if (literal) out[literal[1]] = m[2];
    }
    return out;
};

describe('event category vocabulary', () => {
    it('matches the Go canonical slugs exactly, in the same order', () => {
        expect(EVENT_CATEGORIES.map(c => c.value)).toEqual(goSlugs());
    });

    it('uses the same human label for every slug as the server does', () => {
        const fromGo = goLabels();
        for (const { value, label } of EVENT_CATEGORIES) {
            expect(fromGo[value], `label for ${value}`).toBe(label);
        }
    });

    it('has no duplicate slugs', () => {
        const values = EVENT_CATEGORIES.map(c => c.value);
        expect(new Set(values).size).toBe(values.length);
    });

    it('labels a known slug and degrades gracefully for an unknown one', () => {
        expect(categoryLabel('career_fair')).toBe('Career Fair');
        expect(categoryLabel('info_session')).toBe('Info Session');
        // Legacy rows that predate normalisation must still render readably.
        expect(categoryLabel('some_new_thing')).toBe('Some New Thing');
        expect(categoryLabel('')).toBe('Other');
    });
});
