import { GLOBAL } from './GLOBAL.js'
import { debounce, waitFor } from './helpers.js'

async function fetchFlask(path, options = {}) {
	const url = '/api/' + path
	const resp = await fetch(url, options)
	return await resp.json()
}

export const saveConfigDebounced = debounce((configJSON, changedFiles = []) => {
	Backend.saveConfig(configJSON, changedFiles)
}, 50)

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
				const query = path ? `?path=${encodeURIComponent(path)}` : ''
				GLOBAL.setKey('data', ' ')
				let hyprlandConfig = await fetchFlask('get_hyprland_config' + query)
				let stringifiedHyprlandConfig = JSON.parse(hyprlandConfig)
				GLOBAL.setKey('data', stringifiedHyprlandConfig)
				return hyprlandConfig
			default:
				throw new Error('Unknown backend: ' + GLOBAL.backend)
		}
	},

	async getHyprlandConfigTexts(path = null) {
		switch (GLOBAL.backend) {
			case 'flask':
				let json_string = JSON.stringify(GLOBAL['data']) || {}
				// console.log(json_string)
				const response = await fetchFlask('get_hyprland_config_texts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						json_string: json_string,
					}),
				})
				// console.log(response)
				if (response) {
					GLOBAL.setKey('configText', response)
				}
				break
			default:
				throw new Error('Unknown backend: ' + GLOBAL.backend)
		}
	},

	async getHyprSettingsVersion() {
		return await fetchFlask('get_hyprsettings_version')
	},

	async getDebugStatus() {
		return await fetchFlask('get_debug_status')
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

	async saveConfig(configJSON, changedFiles = []) {
		// console.log({configJSON})
		switch (GLOBAL.backend) {
			case 'pywebview':
				window.pywebview.api.save_config(configJSON, changedFiles)
				break
			case 'flask':
				const response = await fetchFlask('save_config', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						config: configJSON,
						changedFiles,
					}),
				})
				// console.log('response', response)
				if (response.status !== 'ok') {
					throw new Error('Failed to save config: ' + response.message)
				} else {
					GLOBAL.setKey('configText', response.preview)
					// console.log(response.preview)
				}
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
				const data = await fetchFlask(`new_uuid?length=${length}`)
				return data.uuid
			default:
				throw new Error('Unknown backend: ' + GLOBAL.backend)
		}
	},

	saveWindowConfig(json, label = 'config') {
		switch (GLOBAL.backend) {
			case 'pywebview':
				window.pywebview.api.save_window_config(json, label)
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

	async getHyprlandWikiNavigation() {
		try {
			const tree = await fetchFlask('wiki_tree', {
				method: 'GET',
			})
			GLOBAL.setKey('wikiTree', tree)
			// console.log(tree)
			return tree
		} catch (e) {
			console.error(e)
		}
	},
}
