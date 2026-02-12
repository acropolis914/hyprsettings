import { GLOBAL } from '../GLOBAL.js'
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
		return await fetchFlask('read_window_config')
	},

	async getHyprlandConfig(path = null) {
		const query = path ? `?path=${encodeURIComponent(path)}` : ''
		GLOBAL.setKey('data', ' ')
		let hyprlandConfig = await fetchFlask('get_hyprland_config' + query)
		let stringifiedHyprlandConfig = JSON.parse(hyprlandConfig)
		GLOBAL.setKey('data', stringifiedHyprlandConfig)
		return hyprlandConfig
	},
	async debounceGetHyprlandConfig() {
		debounce(this.getHyprlandConfig(), 2000)
	},
	async debounceGetHyprlandConfigTexts() {
		debounce(this.getHyprlandConfigTexts(), 2000)
	},
	async getHyprlandConfigTexts(path = null) {
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
	},

	async getHyprSettingsVersion() {
		let currentVersion = await fetchFlask('get_hyprsettings_version')
		GLOBAL.setKey('version', currentVersion)
		return currentVersion
	},

	async getDebugStatus() {
		return await fetchFlask('get_debug_status')
	},

	async getBuiltinThemes() {
		return await fetchFlask('get_builtin_themes')
	},

	async saveConfig(configJSON, changedFiles = []) {
		// console.log({configJSON})
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
	},

	async newUUID(length = 8) {
		const data = await fetchFlask(`new_uuid?length=${length}`)
		return data.uuid
	},

	saveWindowConfig(json, label = 'config') {
		fetchFlask(`save_window_config?label=${label}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(json),
		})
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
