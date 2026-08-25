/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                'harbour': {
                    50: 'var(--harbour-050)',
                    500: 'var(--harbour-500)',
                    600: 'var(--harbour-600)',
                },
                'app': {
                    accent: 'var(--app-accent)',
                    tint: 'var(--app-tint)',
                    ink: 'var(--app-ink)',
                },
                'paper': {
                    0: 'var(--paper-000)',
                    50: 'var(--paper-050)',
                    100: 'var(--paper-100)',
                    200: 'var(--paper-200)',
                    300: 'var(--paper-300)',
                    400: 'var(--paper-400)',
                    500: 'var(--paper-500)',
                    600: 'var(--paper-600)',
                    700: 'var(--paper-700)',
                },
                'ink': {
                    500: 'var(--ink-500)',
                    600: 'var(--ink-600)',
                    700: 'var(--ink-700)',
                    800: 'var(--ink-800)',
                    900: 'var(--ink-900)',
                },
                'nile-blue': {
                    DEFAULT: 'var(--harbour-500)',
                    50:  'var(--harbour-050)',
                    500: 'var(--harbour-500)',
                    600: 'var(--harbour-600)',
                },
                'nile-green': {
                    DEFAULT: 'var(--status-success)',
                    50:  'var(--green-050)',
                    600: 'var(--green-600)',
                },
                'nile-white': 'var(--paper-000)',
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
