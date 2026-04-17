import { jsViewerInit } from '@scripts/ui_components/debugTab.ts'
import { GLOBAL } from '../GLOBAL.ts'
import { debounce, waitFor } from './helpers.js'

async function fetchFlask(path: string, options = {}) {
	const url = '/api/' + path
	console.debug(`[Backend API] Fetching: ${url}`, options)
	const resp = await fetch(url, options)
	const data = await resp.json()
	console.debug(`[Backend API] Response from ${url}:`, data)
	return data
}

export const saveConfigDebounced = debounce((configJSON: any, changedFiles = []) => {
	console.debug('[Backend API] saveConfigDebounced executing', { changedFiles })
	Backend.saveConfig(configJSON, changedFiles).then()
}, 50)

export const Backend = {
	async readWindowConfig() {
		console.debug('[Backend API] readWindowConfig called')
		let config = await fetchFlask('read_window_config')
		return config
	},

	async getHyprlandConfig(path = null) {
		console.debug(`[Backend API] getHyprlandConfig called with path: ${path}`)
		const query = path ? `?path=${encodeURIComponent(path)}` : ''
		GLOBAL.setKey('data', ' ')
		let hyprlandConfig = await fetchFlask('get_hyprland_config' + query)
		let stringifiedHyprlandConfig = typeof hyprlandConfig === 'string' ? JSON.parse(hyprlandConfig) : hyprlandConfig
		GLOBAL.setKey('data', stringifiedHyprlandConfig)
		return hyprlandConfig
	},
	async getHyprlandConfigFromString(configString: string) {
		try {
			console.debug('[Backend API] getHyprlandConfigFromString called')
			const response = await fetch('/api/load_from_string', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(configString),
			})

			if (!response.ok) {
				throw new Error(`Server responded with ${response.status}`)
			}

			const data = await response.json()
			console.debug('[Backend API] getHyprlandConfigFromString response:', data)
			return data
		} catch (error) {
			console.error('[Backend API] Failed to load Hyprland config:', error)
		}
	},
	async debounceGetHyprlandConfig() {
		console.debug('[Backend API] debounceGetHyprlandConfig triggered')
		debounce(this.getHyprlandConfig(), 2000)
	},
	async debounceGetHyprlandConfigTexts() {
		console.debug('[Backend API] debounceGetHyprlandConfigTexts triggered')
		debounce(this.getHyprlandConfigTexts(), 2000)
	},
	async getHyprlandConfigTexts(path = null) {
		console.debug(`[Backend API] getHyprlandConfigTexts called with path: ${path}`)
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
			console.debug('[Backend API] getHyprlandConfigTexts success')
			GLOBAL.setKey('configText', response)
		}
	},

	async getHyprSettingsVersion() {
		console.debug('[Backend API] getHyprSettingsVersion called')
		let currentVersion = await fetchFlask('get_hyprsettings_version')
		GLOBAL.setKey('version', currentVersion)
		return currentVersion
	},

	async getDebugStatus() {
		console.debug('[Backend API] getDebugStatus called')
		return await fetchFlask('get_debug_status')
	},

	async getBuiltinThemes() {
		console.debug('[Backend API] getBuiltinThemes called')
		return await fetchFlask('get_builtin_themes')
	},

	async saveConfig(configJSON: any, changedFiles = []) {
		console.debug('[Backend API] saveConfig called', { changedFiles })
		// console.log({configJSON})
		const response = await fetchFlask('save_config', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				config: configJSON,
				changedFiles,
			}),
		})
		if (response.status !== 'ok') {
			console.error('[Backend API] saveConfig failed', response)
			throw new Error('Failed to save config: ' + response.message)
		} else {
			console.debug('[Backend API] saveConfig successful')
			GLOBAL.setKey('configText', response.preview)
		}
	},

	async newUUID(length = 8) {
		console.debug(`[Backend API] newUUID called (length: ${length})`)
		const data = await fetchFlask(`new_uuid?length=${length}`)
		return data.uuid
	},

	saveWindowConfig(json: any, label = 'config') {
		console.debug(`[Backend API] saveWindowConfig called for label: ${label}`)
		fetchFlask(`save_window_config?label=${label}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(json),
		})
	},

	async getHyprlandWikiNavigation() {
		try {
			console.debug('[Backend API] getHyprlandWikiNavigation called')
			const tree = await fetchFlask('wiki_tree', {
				method: 'GET',
			})
			GLOBAL.setKey('wikiTree', tree)
			return tree
		} catch (e) {
			console.error('[Backend API] getHyprlandWikiNavigation error:', e)
		}
	},
}
