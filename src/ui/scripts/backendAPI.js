import { waitFor } from "./utils.js";



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
		console.debug(config)
		return config
	},

}
