
import { GLOBAL } from "../GLOBAL.js"

export function jsViewerInit() {
	// @ts-ignore
	window.jsViewer = document.createElement("andypf-json-viewer")
	document.querySelector(".config-set#debug").appendChild(jsViewer)
	window.jsViewer.data = GLOBAL["data"]
	if (window.themeVariant === "dark") {
		window.jsViewer.setAttribute("theme", "papercolor-dark")
	} else {
		window.jsViewer.setAttribute("theme", "default-light")
	}
}