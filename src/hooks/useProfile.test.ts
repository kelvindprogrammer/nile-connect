import { describe, it, expect } from 'vitest';
import { getProfileCompletion, calculateProfileStrength, type ExtendedProfile } from './useProfile';

const empty: ExtendedProfile = {
    bio: '',
    location: '',
    major: '',
    linkedIn: '',
    portfolio: '',
    github: '',
    phone: '',
    experiences: [],
    skills: [],
};

const full: ExtendedProfile = {
    bio: 'Final-year computer science student focused on distributed systems and developer tooling.',
    location: 'Abuja, Nigeria',
    major: 'Computer Science',
    linkedIn: 'linkedin.com/in/real-person',
    portfolio: 'example.dev',
    github: 'github.com/real-person',
    phone: '+234 800 000 0000',
    experiences: [{ id: '1', title: 'Intern', company: 'Acme', duration: '2024', description: '' }],
    skills: ['Go', 'React', 'PostgreSQL'],
};

describe('profile completeness', () => {
    // The QA finding: "Profile Strength Incorrectly Shows 100%". The hook used
    // to seed every account with placeholder data that scored full marks, so a
    // profile nobody had filled in reported 100%.
    it('scores a brand-new profile far below complete', () => {
        const { percent } = getProfileCompletion(empty, { hasName: true, hasEmail: true });
        expect(percent).toBeLessThanOrEqual(15);
        expect(percent).toBeGreaterThan(0); // name + email are genuinely present
    });

    it('never reports 100% while anything is outstanding', () => {
        const almost = { ...full, phone: '' };
        const { percent, missing } = getProfileCompletion(almost, {
            hasName: true, hasEmail: true, hasAvatar: true, hasResume: true,
        });
        expect(missing).toContain('Phone number');
        expect(percent).toBeLessThan(100);
    });

    it('reports exactly 100% only when every criterion is met', () => {
        const { percent, missing } = getProfileCompletion(full, {
            hasName: true, hasEmail: true, hasAvatar: true, hasResume: true,
        });
        expect(missing).toEqual([]);
        expect(percent).toBe(100);
    });

    it('lists what is still missing rather than only a number', () => {
        const { missing } = getProfileCompletion(empty, { hasName: true, hasEmail: true });
        expect(missing).toContain('A short bio');
        expect(missing).toContain('At least three skills');
        expect(missing).toContain('An uploaded CV');
        expect(missing).not.toContain('Your name');
    });

    it('treats whitespace-only fields as empty', () => {
        const blank: ExtendedProfile = { ...empty, bio: '   ', major: '\t', location: ' ' };
        const a = getProfileCompletion(blank, { hasName: false, hasEmail: false });
        const b = getProfileCompletion(empty, { hasName: false, hasEmail: false });
        expect(a.percent).toBe(b.percent);
        expect(a.percent).toBe(0);
    });

    it('gives partial credit for skills so progress is visible', () => {
        const one = getProfileCompletion({ ...empty, skills: ['Go'] }, { hasName: false, hasEmail: false });
        const two = getProfileCompletion({ ...empty, skills: ['Go', 'React'] }, { hasName: false, hasEmail: false });
        const three = getProfileCompletion({ ...empty, skills: ['Go', 'React', 'SQL'] }, { hasName: false, hasEmail: false });
        expect(one.percent).toBeGreaterThan(0);
        expect(two.percent).toBeGreaterThan(one.percent);
        expect(three.percent).toBeGreaterThan(two.percent);
        // A fourth skill must not push past the section's weight.
        const four = getProfileCompletion(
            { ...empty, skills: ['Go', 'React', 'SQL', 'Rust'] },
            { hasName: false, hasEmail: false },
        );
        expect(four.percent).toBe(three.percent);
    });

    it('gives partial credit for a very short bio', () => {
        const short = getProfileCompletion({ ...empty, bio: 'Hi' }, { hasName: false, hasEmail: false });
        const long = getProfileCompletion({ ...empty, bio: full.bio }, { hasName: false, hasEmail: false });
        expect(short.percent).toBeGreaterThan(0);
        expect(long.percent).toBeGreaterThan(short.percent);
    });

    it('omitting the avatar/CV signals scores them zero rather than assuming them', () => {
        const withoutExtras = calculateProfileStrength(full, true, true);
        const withExtras = calculateProfileStrength(full, true, true, { hasAvatar: true, hasResume: true });
        expect(withoutExtras).toBeLessThan(withExtras);
        expect(withExtras).toBe(100);
    });

    it('always returns a percentage inside 0–100', () => {
        for (const p of [empty, full]) {
            for (const signals of [
                { hasName: false, hasEmail: false },
                { hasName: true, hasEmail: true, hasAvatar: true, hasResume: true },
            ]) {
                const { percent } = getProfileCompletion(p, signals);
                expect(percent).toBeGreaterThanOrEqual(0);
                expect(percent).toBeLessThanOrEqual(100);
            }
        }
    });
});
