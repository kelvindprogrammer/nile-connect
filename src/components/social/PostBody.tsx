import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Renders user-authored text with @mentions and #hashtags as interactive
 * links.
 *
 * SECURITY: this component never builds an HTML string and never uses
 * dangerouslySetInnerHTML. It tokenises the raw text and returns React
 * elements, so user content is always escaped by React itself. Highlighting
 * user text by string-replacing into HTML is the single most common way a
 * social feed acquires stored XSS, and it is structurally impossible here.
 *
 * The tokeniser mirrors lib/textparse on the server (same trigger rules, same
 * boundary handling), so what gets highlighted matches what gets notified and
 * indexed. If they disagreed, a user would see a highlighted @name that never
 * received a notification.
 */

interface PostBodyProps {
    content: string;
    className?: string;
}

type Token =
    | { type: 'text'; value: string }
    | { type: 'mention'; value: string; raw: string }
    | { type: 'hashtag'; value: string; raw: string }
    | { type: 'url'; value: string };

const HANDLE_CHAR = /[A-Za-z0-9_.-]/;
const TAG_CHAR = /[\p{L}\p{N}_]/u;

/** Mirrors canStartToken in lib/textparse: a trigger only counts at a boundary. */
const canStart = (chars: string[], i: number): boolean => {
    if (i === 0) return true;
    const prev = chars[i - 1];
    if (/[A-Za-z0-9_]/.test(prev)) return false;
    return prev !== '@' && prev !== '#';
};

const trimTrailing = (s: string) => s.replace(/[.\-_]+$/, '');

const tokenize = (text: string): Token[] => {
    const tokens: Token[] = [];
    const chars = Array.from(text);
    let buffer = '';

    const flush = () => {
        if (buffer) {
            tokens.push({ type: 'text', value: buffer });
            buffer = '';
        }
    };

    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];

        // Bare URLs become links too — students paste a lot of them, and an
        // unclickable link is a small daily annoyance.
        if ((ch === 'h' || ch === 'H') && /^https?:\/\//i.test(chars.slice(i, i + 8).join(''))) {
            let j = i;
            while (j < chars.length && !/\s/.test(chars[j])) j++;
            const raw = chars.slice(i, j).join('').replace(/[.,;:!?)]+$/, '');
            if (raw.length > 8) {
                flush();
                tokens.push({ type: 'url', value: raw });
                i = i + raw.length - 1;
                continue;
            }
        }

        if ((ch === '@' || ch === '#') && canStart(chars, i)) {
            const isMention = ch === '@';
            const matcher = isMention ? HANDLE_CHAR : TAG_CHAR;
            const limit = isMention ? 32 : 64;

            let j = i + 1;
            while (j < chars.length && j - i - 1 < limit && matcher.test(chars[j])) j++;

            if (j > i + 1) {
                const rawToken = chars.slice(i + 1, j).join('');
                const value = trimTrailing(rawToken).toLowerCase();
                // A purely numeric hashtag is a figure, not a topic — matching
                // the server, which does not index those either.
                const numericTag = !isMention && /^\d+$/.test(value);
                if (value && !numericTag) {
                    flush();
                    tokens.push({
                        type: isMention ? 'mention' : 'hashtag',
                        value,
                        raw: chars.slice(i, i + 1 + trimTrailing(rawToken).length).join(''),
                    });
                    i = i + trimTrailing(rawToken).length;
                    continue;
                }
            }
        }

        buffer += ch;
    }
    flush();
    return tokens;
};

const PostBody: React.FC<PostBodyProps> = ({ content, className }) => {
    const navigate = useNavigate();
    const tokens = useMemo(() => tokenize(content ?? ''), [content]);

    if (!content) return null;

    return (
        <p className={className ?? 'text-sm text-ink-800 leading-relaxed whitespace-pre-wrap break-words'}>
            {tokens.map((tok, i) => {
                switch (tok.type) {
                    case 'mention':
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => navigate(`/student/network?q=${encodeURIComponent(tok.value)}`)}
                                className="text-nile-blue font-medium hover:underline"
                            >
                                {tok.raw}
                            </button>
                        );
                    case 'hashtag':
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => navigate(`/student/explore?tag=${encodeURIComponent(tok.value)}`)}
                                className="text-nile-blue font-medium hover:underline"
                            >
                                {tok.raw}
                            </button>
                        );
                    case 'url':
                        return (
                            <a
                                key={i}
                                href={tok.value}
                                target="_blank"
                                // noopener/noreferrer is mandatory on user-supplied
                                // links: without it the opened page can navigate
                                // this tab via window.opener.
                                rel="noopener noreferrer nofollow ugc"
                                className="text-nile-blue hover:underline break-all"
                            >
                                {tok.value}
                            </a>
                        );
                    default:
                        // Plain text goes through React, which escapes it.
                        return <React.Fragment key={i}>{tok.value}</React.Fragment>;
                }
            })}
        </p>
    );
};

export default PostBody;
