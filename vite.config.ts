import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            // Proxy AI calls to the local Flask dev server (python -m flask run --port 5001)
            '/api/ai': {
                target: 'http://localhost:5001',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/ai/, ''),
            },
        },
    },
    build: {
        // Ensure sourcemaps are generated for debugging in production
        sourcemap: false,
        rollupOptions: {
            output: {
                // Split vendor libraries into a separate chunk for better caching
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    utils: ['axios', 'animejs'],
                },
            },
        },
    },
    define: {
        // Explicitly surface env prefix so TypeScript can pick it up
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || ''),
        'import.meta.env.VITE_AI_BASE_URL': JSON.stringify(process.env.VITE_AI_BASE_URL || ''),
    },
})
