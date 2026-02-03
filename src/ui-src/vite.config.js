import { defineConfig } from 'vite'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
	root: '.',
	publicDir: 'public',
	build: {
		// output to ../ui (relative to src/ui-src)
		minify: 'esbuild',
		treeshake: true,
		outDir: resolve(__dirname, '..', 'ui'),
		// set false while you verify; switch to true later to allow Vite to clean target
		emptyOutDir: true,
		sourcemap: true,
		rollupOptions: {
			plugins: [visualizer({ open: true })],
			input: resolve(__dirname, 'index.html'),
			output: {
				entryFileNames: 'index.js',
				chunkFileNames: 'chunks/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash][extname]',
				manualChunks(id) {
					if (id.includes('node_modules')) return 'vendor'
					if (id.includes('/wiki/')) return 'wiki'
				},
			},

		},
		assetsDir: 'assets',
	},
	server: {
		port: 3000,
		open: false,
		proxy: {
			'/api': 'http://localhost:6969',
			'/wiki': 'http://localhost:6969',
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
