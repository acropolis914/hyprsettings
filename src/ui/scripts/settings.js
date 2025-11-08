import { GLOBAL } from "./GLOBAL.js"
import { saveConfig, waitFor } from "./utils.js"
let settingsEl = document.querySelector(".config-set#settings")


export async function renderSettings() {
	await waitFor(() => window.pywebview?.api?.save_window_config)
	settingsEl = document.querySelector(".config-set#settings")
	createLineCommentsVisibilitySetting()
	createHeaderCommentsVisibilitySetting()
	createSidebarIconsVisibilitySetting()
}

/**
 * Description
 * @param {String} id
 * @param {String} label
 * @param {String} config_key
 * @param {Boolean} default_value=true
 * @returns {HTMLElement}
 */
class CheckBoxItem {
	constructor(id, label, config_key, default_value = true) {
		this.settingContainer = document.createElement("div")
		this.settingContainer.classList.add("setting-container")
		this.settingContainer.classList.add("editor-item")
		this.settingContainer.setAttribute("tabindex", 0)
		this.checkbox = document.createElement("input")
		this.checkbox.id = id
		this.checkbox.setAttribute("type", "checkbox")
		this.checkbox.checked = window.config[config_key] || default_value
		this.label = document.createElement("label")
		this.label.setAttribute("for", id)
		this.label.textContent = label
		this.settingContainer.appendChild(this.checkbox)
		this.settingContainer.appendChild(this.label)
		this.addListeners()
		settingsEl.appendChild(this.settingContainer)
	}
	addListeners() {
		this.settingContainer.addEventListener("keydown", (e) => {
			if (e.key === "Space" || e.key === "Enter") {
				this.checkbox.click()
			}
		})
		this.settingContainer.addEventListener("click", () => {
			window.currentView = "main" //FIXME Change to global
			GLOBAL.setKey("currentView", "main")
		})
	}

	return() {
		return { container: this.settingContainer, checkbox: this.checkbox }
	}

}


function createLineCommentsVisibilitySetting() {
	let { container, checkbox } = new CheckBoxItem("show-line-comments",
		"Show line comments", "show_line_comments", window.config["show_line_comments"] || true).return()
	checkbox.addEventListener("change", async (e) => {
		const el = e.target
		window.config["show_line_comments"] = el.checked
		await window.pywebview.api.save_window_config(JSON.stringify(window.config))
		console.log(`Toggled: to ${el.checked}`)
		let commentItems = document.querySelectorAll(".editor-item:has(>.editor-item-comment)")
		if (el.checked) {
			commentItems.forEach(i =>
				i.classList.remove("settings-hidden")
			)
		} else {
			commentItems.forEach(i =>
				i.classList.add("settings-hidden")
			)
		}
		saveConfig()
	})
}

function createHeaderCommentsVisibilitySetting() {
	let { container, checkbox } = new CheckBoxItem("show-header-comments",
		"Show header comments", "show_header_comments", window.config["show_header_comments"] || false).return()
	checkbox.addEventListener("change", async (e) => {
		const el = e.target
		window.config["show_header_comments"] = el.checked
		await window.pywebview.api.save_window_config(JSON.stringify(window.config))
		console.log(`Toggled: show header comments to ${el.checked}`)
		let commentItems = document.querySelectorAll(".block-comment")
		if (el.checked) {
			commentItems.forEach((i) => {
				// console.log(i)
				i.classList.remove("settings-hidden")
			})
		} else {
			commentItems.forEach(i =>
				i.classList.add("settings-hidden")
			)
		}
		saveConfig()
	})
}

function createSidebarIconsVisibilitySetting() {
	let { container, checkbox } = new CheckBoxItem("show_sidebar_icons",
		"Show sidebar icons", "show_sidebar_icons", window.config["show_sidebar_icons"] || true).return()
	checkbox.addEventListener("change", async (e) => {
		const el = e.target
		window.config["show_sidebar_icons"] = el.checked
		await window.pywebview.api.save_window_config(JSON.stringify(window.config))
		console.log(`Toggled: to ${el.checked}`)
		let commentItems = document.querySelectorAll("#sidebar-icon")
		if (el.checked) {
			commentItems.forEach(i =>
				i.classList.remove("settings-hidden")
			)
		} else {
			commentItems.forEach(i =>
				i.classList.add("settings-hidden")
			)
		}
		saveConfig()
	})
}