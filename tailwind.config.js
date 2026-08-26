/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                // Every token is stored as an "R G B" triplet so Tailwind's
                // `/opacity` modifier keeps working. A bare `var(--x)` colour
                // silently drops utilities like `bg-nile-blue/10` — Tailwind v3
                // cannot compose alpha into an opaque custom property, so the
                // rule is never emitted and the element renders untinted.
                'harbour': {
                    DEFAULT: 'rgb(var(--harbour-500-rgb) / <alpha-value>)',
                    50:  'rgb(var(--harbour-050-rgb) / <alpha-value>)',
                    500: 'rgb(var(--harbour-500-rgb) / <alpha-value>)',
                    600: 'rgb(var(--harbour-600-rgb) / <alpha-value>)',
                },
                'app': {
                    accent: 'rgb(var(--app-accent-rgb) / <alpha-value>)',
                    tint:   'rgb(var(--app-tint-rgb) / <alpha-value>)',
                    ink:    'rgb(var(--app-ink-rgb) / <alpha-value>)',
                },
                'paper': {
                    0:   'rgb(var(--paper-000-rgb) / <alpha-value>)',
                    50:  'rgb(var(--paper-050-rgb) / <alpha-value>)',
                    100: 'rgb(var(--paper-100-rgb) / <alpha-value>)',
                    200: 'rgb(var(--paper-200-rgb) / <alpha-value>)',
                    300: 'rgb(var(--paper-300-rgb) / <alpha-value>)',
                    400: 'rgb(var(--paper-400-rgb) / <alpha-value>)',
                    500: 'rgb(var(--paper-500-rgb) / <alpha-value>)',
                    600: 'rgb(var(--paper-600-rgb) / <alpha-value>)',
                    700: 'rgb(var(--paper-700-rgb) / <alpha-value>)',
                },
                'ink': {
                    500: 'rgb(var(--ink-500-rgb) / <alpha-value>)',
                    600: 'rgb(var(--ink-600-rgb) / <alpha-value>)',
                    700: 'rgb(var(--ink-700-rgb) / <alpha-value>)',
                    800: 'rgb(var(--ink-800-rgb) / <alpha-value>)',
                    900: 'rgb(var(--ink-900-rgb) / <alpha-value>)',
                },
                // `nile-*` is the legacy vocabulary the pages are written in.
                // It is retained as a full scale — re-pointed at Harbour — so
                // the ~380 existing `nile-blue-700` / `nile-green/10` usages
                // keep resolving while pages are migrated to `app-*`.
                'nile-blue': {
                    DEFAULT: 'rgb(var(--harbour-500-rgb) / <alpha-value>)',
                    50:  'rgb(var(--harbour-050-rgb) / <alpha-value>)',
                    100: 'rgb(var(--nile-blue-100-rgb) / <alpha-value>)',
                    200: 'rgb(var(--nile-blue-200-rgb) / <alpha-value>)',
                    300: 'rgb(var(--nile-blue-300-rgb) / <alpha-value>)',
                    400: 'rgb(var(--nile-blue-400-rgb) / <alpha-value>)',
                    500: 'rgb(var(--harbour-500-rgb) / <alpha-value>)',
                    600: 'rgb(var(--harbour-600-rgb) / <alpha-value>)',
                    700: 'rgb(var(--nile-blue-700-rgb) / <alpha-value>)',
                    800: 'rgb(var(--nile-blue-800-rgb) / <alpha-value>)',
                    900: 'rgb(var(--nile-blue-900-rgb) / <alpha-value>)',
                },
                'nile-green': {
                    DEFAULT: 'rgb(var(--green-600-rgb) / <alpha-value>)',
                    50:  'rgb(var(--green-050-rgb) / <alpha-value>)',
                    100: 'rgb(var(--nile-green-100-rgb) / <alpha-value>)',
                    200: 'rgb(var(--nile-green-200-rgb) / <alpha-value>)',
                    300: 'rgb(var(--nile-green-300-rgb) / <alpha-value>)',
                    400: 'rgb(var(--nile-green-400-rgb) / <alpha-value>)',
                    500: 'rgb(var(--nile-green-500-rgb) / <alpha-value>)',
                    600: 'rgb(var(--green-600-rgb) / <alpha-value>)',
                    700: 'rgb(var(--nile-green-700-rgb) / <alpha-value>)',
                    800: 'rgb(var(--nile-green-800-rgb) / <alpha-value>)',
                    900: 'rgb(var(--nile-green-900-rgb) / <alpha-value>)',
                },
                'nile-white': 'rgb(var(--paper-000-rgb) / <alpha-value>)',
            },
            boxShadow: {
                'soft-xs': 'var(--shadow-xs)',
                'soft-sm': 'var(--shadow-sm)',
                'soft':    'var(--shadow-md)',
                'soft-md': 'var(--shadow-md)',
                'soft-lg': 'var(--shadow-lg)',
                'card':    'var(--shadow-xs)',
                'card-hover': 'var(--shadow-md)',
                'blue':    '0 4px 14px 0 rgba(38,101,140,0.18)',
                'green':   '0 4px 14px 0 rgba(47,122,77,0.22)',
                'nav':     '0 0 0 1px var(--border), var(--shadow-xs)',
                'brutalist':    '6px 6px 0px 0px rgba(0,0,0,1)',
                'brutalist-sm': '3px 3px 0px 0px rgba(0,0,0,1)',
            },
            spacing: {
                '4.5': '1.125rem',
            },
            borderRadius: {
                '4xl': '2rem',
            },
            borderWidth: {
                '3': '3px',
            },
            screens: {
                'xs': '375px',
            },
            fontFamily: {
                sans: ['var(--font-sans)', 'Inter', '-apple-system', 'sans-serif'],
                display: ['var(--font-display)', 'Instrument Serif', 'Georgia', 'serif'],
                mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
            },
        },
    },
    plugins: [],
}
