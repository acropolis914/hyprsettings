import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
	root: '.',
	publicDir: 'public',
	build: {
		// output to ../ui (relative to src/ui-src)
		outDir: resolve(__dirname, '..', 'ui'),
		// set false while you verify; switch to true later to allow Vite to clean target
		emptyOutDir: true,
		rollupOptions: {
			input: resolve(__dirname, 'index.html'),
		},
		assetsDir: 'assets',
	},
	server: {
		port: 3000,
		open: false,
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			'@scripts': resolve(__dirname, 'scripts'),
			'@stylesheets': resolve(__dirname, 'stylesheets'),
		},
	},
})
