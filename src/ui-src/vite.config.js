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
		sourcemap: true,
		rollupOptions: {
			input: resolve(__dirname, 'index.html'),
			output: {
				entryFileNames: 'index.js',
				chunkFileNames: 'index-[name].js', // For code-split chunks
				assetFileNames: 'index.[ext]', // For CSS, images, etc. (e.g., index.css)
			},
		},
		assetsDir: 'assets',
	},
	server: {
		port: 3000,
		open: false,
		proxy: {
			'/api': 'http://localhost:6969',
		},
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			'@scripts': resolve(__dirname, 'scripts'),
			'@stylesheets': resolve(__dirname, 'stylesheets'),
		},
	},
})
