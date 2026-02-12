import { defineConfig } from 'vite'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
	root: '.',
	publicDir: 'public',
	plugins: [
		svelte({
			preprocess: [],
			extensions: ['.svelte'],
			onwarn: (warning, handler) => {
				if (warning.code.includes('a11y')) return
				handler(warning)
			},
		}),
	],
	build: {
		// output to ../ui (relative to src/ui-src)
		minify: 'terser',
		terserOptions: {
			sourceMap: false,
			keep_fnames: true,
			keep_classnames: true,
			// treeshake: true,
		},
		treeshake: true,
		outDir: resolve(__dirname, '..', 'ui'),
		// set false while you verify; switch to true later to allow Vite to clean target
		emptyOutDir: true,
		sourcemap: false,
		rollupOptions: {
			plugins: [visualizer({ open: false })],
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
		allowedHosts: ['192.168.1.1'],
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
			'@scripts': resolve(__dirname, 'scripts'),
			'@stylesheets': resolve(__dirname, 'stylesheets'),
		},
	},
})
