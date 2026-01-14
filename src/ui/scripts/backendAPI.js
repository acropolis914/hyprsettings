import { saveWindowConfig, waitFor } from "./utils.js";



async function waitForPyWebview() {
	// simple poll until window.pywebview.api is available
	while (!window.pywebview?.api) {
		await new Promise(r => setTimeout(r, 50)); // wait 50ms
	}
}
export const Backend = {
	async readWindowConfig() {
		// await waitForPyWebview();
		await waitFor(() => window.pywebview?.api.init)
		return await window.pywebview.api.read_window_config()
	},

	async getHyprlandConfig(path = null) {
		await waitFor(() => window.pywebview?.api.init)
		let config = await window.pywebview.api.init()
		// console.debug(config)
		return config
	},

	async getDebugStatus() {
		await waitFor(() => window.pywebview?.api.init)
		let isDebug = JSON.parse(await window.pywebview.api.getDebugStatus());
		console.debug(isDebug)
		return isDebug
	},

	async getBuiltinThemes() {
		return await window.pywebview.api.get_builtin_themes()
	},

	saveConfig(configJSON) {
		window.pywebview.api.save_config(configJSON)
	},

	async newUUID() {
		return window.pywebview.api.new_uuid()
	},

	async saveWindowConfig(json, label){
		await window.pywebview.api.save_window_config(json,label)
	}
}
