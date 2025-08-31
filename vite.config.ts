import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
    root: '.',
    base: './',
    server: { port: 8001, open: true },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
