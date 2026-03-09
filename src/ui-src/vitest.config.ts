import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
	test: {
		// Use jsdom to simulate a browser environment for DOM-touching utilities
		environment: 'jsdom',
		globals: true,
		include: ['tests/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			include: ['scripts/**/*.{js,ts}'],
			exclude: [
				'scripts/jslib/**',
				'scripts/ui_components/testingScreen.js',
			],
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
