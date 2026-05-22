/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                'nile-blue': {
                    DEFAULT: '#1E499D',
                    50:  '#EEF2FB',
                    100: '#D4E0F5',
                    200: '#A9C1EB',
                    300: '#7EA2E1',
                    400: '#4E7ED4',
                    500: '#1E499D',
                    600: '#1A3F8A',
                    700: '#143071',
                    800: '#0D2157',
                    900: '#07123D',
                },
                'nile-green': {
                    DEFAULT: '#6CBB56',
                    50:  '#F0FAF0',
                    100: '#D4EFCC',
                    200: '#AAE09A',
                    300: '#84CF6A',
                    400: '#6CBB56',
                    500: '#52A83C',
                    600: '#3D8B2D',
                    700: '#2B6D1E',
                    800: '#1C4F13',
                    900: '#0D310A',
                },
                'nile-white': '#F8F8F8',
            },
            boxShadow: {
                'soft-xs': '0 1px 2px 0 rgba(0,0,0,0.05)',
                'soft-sm': '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
                'soft':    '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
                'soft-md': '0 8px 16px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)',
                'soft-lg': '0 16px 24px -5px rgba(0,0,0,0.09), 0 8px 10px -6px rgba(0,0,0,0.04)',
                'card':    '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                'card-hover': '0 8px 24px rgba(0,0,0,0.09)',
                'blue':    '0 4px 14px 0 rgba(30,73,157,0.18)',
                'green':   '0 4px 14px 0 rgba(108,187,86,0.22)',
                'nav':     '0 0 0 1px rgba(30,73,157,0.08), 0 2px 8px rgba(30,73,157,0.08)',
                // kept for backward compat
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
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
