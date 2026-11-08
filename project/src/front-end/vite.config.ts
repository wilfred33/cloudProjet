import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			'@stores': path.resolve('./src/stores/'),
			'@interfaces': path.resolve('./src/interfaces')
		}
	},
	plugins: [sveltekit()],
	server: {
		proxy: {
			// En développement, /api/* redirige vers le gateway
			'/api': {
				target: 'http://localhost:8082',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '')
			}
		}
	}
});
