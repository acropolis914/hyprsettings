import { GLOBAL } from "./GLOBAL.js"
import { saveWindowConfig, waitFor } from "./utils.js"
let settingsEl = document.querySelector(".config-set#settings")


export async function renderSettings() {
	await waitFor(() => window.pywebview?.api?.save_window_config)
	settingsEl = document.querySelector(".config-set#settings")
	createLineCommentsVisibilitySetting()
	createHeaderCommentsVisibilitySetting()
	createSidebarIconsVisibilitySetting()
	createAnimationsToggleSetting()
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
	constructor(label, config_key, default_value, actions = {}, tooltip) {
		this.configKey = config_key
		this.actions = actions
		this.settingContainer = document.createElement("div")
		this.settingContainer.setAttribute("title", tooltip)

		this.settingContainer.classList.add("setting-container")
		this.settingContainer.classList.add("editor-item")
		this.settingContainer.setAttribute("tabindex", 0)
		this.checkbox = document.createElement("input")
		this.checkbox.id = config_key
		this.checkbox.setAttribute("type", "checkbox")
		this.checkbox.checked = GLOBAL["config"][config_key] ?? default_value
		this.label = document.createElement("label")
		this.label.setAttribute("for", config_key)
		this.label.textContent = label
		this.settingContainer.appendChild(this.checkbox)
		this.settingContainer.appendChild(this.label)
		this.addListeners()
		settingsEl.appendChild(this.settingContainer)
	}
	addListeners() {
		this.settingContainer.addEventListener("keydown", (e) => {
			if (e.key === " " || e.key === "Enter") {
				this.checkbox.click()
			}
		})
		this.settingContainer.addEventListener("click", () => {
			GLOBAL.setKey("currentView", "main")
		})

		this.checkbox.addEventListener("change", async (e) => { this.handleToggle() })
	}

	handleToggle() {
		const checked = this.checkbox.checked
		GLOBAL["config"][this.configKey] = checked
		saveWindowConfig()
		if (checked && this.actions.onCheck) {
			this.actions.onCheck()
		}
		if (!checked && this.actions.onUncheck) {
			this.actions.onUncheck()
		}
	}
	return() {
		return { container: this.settingContainer, checkbox: this.checkbox }
	}

}

function createLineCommentsVisibilitySetting() {
	function onCheck() {
		let commentItems = document.querySelectorAll(".editor-item:has(>.editor-item-comment):not(.block-comment)")
		commentItems.forEach(i =>
			i.classList.remove("settings-hidden")
		)
	}
	function onUncheck() {
		let commentItems = document.querySelectorAll(".editor-item:has(>.editor-item-comment):not(.block-comment)")
		commentItems.forEach(i =>
			i.classList.add("settings-hidden")
		)
	}
	let tooltip = "Shows or hides independent comments (not including the header comments)"
	const item = new CheckBoxItem(
		"Show line comments", "show_line_comments", true, { onCheck, onUncheck }, tooltip = tooltip)
}
function createHeaderCommentsVisibilitySetting() {
	function onCheck() {
		document.querySelectorAll(".block-comment").forEach(i =>
			i.classList.remove("settings-hidden")
		)
	}
	function onUncheck() {
		document.querySelectorAll(".block-comment").forEach(i =>
			i.classList.add("settings-hidden")
		)
	}

	const tooltip = "Shows or hides header comments"
	new CheckBoxItem(
		"Show header comments",
		"show_header_comments",
		false,
		{ onCheck, onUncheck },
		tooltip
	)
}

function createSidebarIconsVisibilitySetting() {
	function onCheck() {
		document.querySelectorAll("#sidebar-icon").forEach(i =>
			i.classList.remove("settings-hidden")
		)
	}
	function onUncheck() {
		document.querySelectorAll("#sidebar-icon").forEach(i =>
			i.classList.add("settings-hidden")
		)
	}

	const tooltip = "Shows or hides sidebar icons"
	new CheckBoxItem(
		"Show sidebar icons",
		"show_sidebar_icons",
		true,
		{ onCheck, onUncheck },
		tooltip
	)
}


function createAnimationsToggleSetting() {
	function onCheck() {
		document.documentElement.classList.remove("no-anim")
	}
	function onUncheck() {
		document.documentElement.classList.add("no-anim")
	}

	const tooltip = "Shows or hides sidebar icons"
	console.log("bornick")
	new CheckBoxItem(
		"Enable Animations",
		"animations",
		true,
		{ onCheck, onUncheck },
		tooltip
	)
}