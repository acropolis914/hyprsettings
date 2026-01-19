import { GLOBAL } from './GLOBAL.js'
import { waitFor } from './utils.js'

async function fetchFlask(path, options = {}) {
	const url = '/api/' + path
	const resp = await fetch(url, options)
	return await resp.json()
}

export const Backend = {
	async readWindowConfig() {
		switch (GLOBAL.backend) {
			case 'pywebview':
				await waitFor(() => window.pywebview?.api.init)
				return await window.pywebview.api.read_window_config()
			case 'flask':
				return await fetchFlask('read_window_config')
			default:
				throw new Error('Unknown backend: ' + GLOBAL.backend)
		}
	},

	async getHyprlandConfig(path = null) {
		switch (GLOBAL.backend) {
			case 'pywebview':
				await waitFor(() => window.pywebview?.api.init)
				return await window.pywebview.api.init()
			case 'flask':
				const query = path
					? `?path=${encodeURIComponent(path)}`
					: ''
				return await fetchFlask('get_config' + query)
			default:
				throw new Error('Unknown backend: ' + GLOBAL.backend)
		}
	},

	async getDebugStatus() {
		switch (GLOBAL.backend) {
			case 'pywebview':
				await waitFor(() => window.pywebview?.api.init)
				return JSON.parse(
					await window.pywebview.api.getDebugStatus()
				)
			case 'flask':
				return await fetchFlask('get_debug_status')
			default:
				throw new Error('Unknown backend: ' + GLOBAL.backend)
		}
	},

	async getBuiltinThemes() {
		switch (GLOBAL.backend) {
			case 'pywebview':
				return await window.pywebview.api.get_builtin_themes()
			case 'flask':
				return await fetchFlask('get_builtin_themes')
			default:
				throw new Error('Unknown backend: ' + GLOBAL.backend)
		}
	},

	saveConfig(configJSON) {
		switch (GLOBAL.backend) {
			case 'pywebview':
				window.pywebview.api.save_config(configJSON)
				break
			case 'flask':
				fetchFlask('save_config', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: configJSON,
				})
				break
			default:
				throw new Error('Unknown backend: ' + GLOBAL.backend)
		}
	},

	async newUUID(length = 8) {
		switch (GLOBAL.backend) {
			case 'pywebview':
				return await window.pywebview.api.new_uuid(length)
			case 'flask':
				const data = await fetchFlask(
					`new_uuid?length=${length}`
				)
				return data.uuid
			default:
				throw new Error('Unknown backend: ' + GLOBAL.backend)
		}
	},

	saveWindowConfig(json, label = 'config') {
		switch (GLOBAL.backend) {
			case 'pywebview':
				window.pywebview.api.save_window_config(
					json,
					label
				)
				break
			case 'flask':
				fetchFlask(`save_window_config?label=${label}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(json),
				})
				break
			default:
				throw new Error('Unknown backend: ' + GLOBAL.backend)
		}
	},
}
