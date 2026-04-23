/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                'nile-blue': '#1E499D',  // <--- Use this vibrant blue hex code
                'nile-green': '#6CBB56',
                'nile-white': '#F8F8F8',
            },
            boxShadow: {
                'brutalist': '8px 8px 0px 0px rgba(0,0,0,1)',
                'brutalist-sm': '4px 4px 0px 0px rgba(0,0,0,1)',
            }
        },
    },
    plugins: [],
}