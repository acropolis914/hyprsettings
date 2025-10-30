import { waitFor } from "./utils.js"
let settingsEl = document.querySelector(".config-set#settings")
window.config = JSON.parse(localStorage.getItem("config")) || {}

export function renderSettings() {
	settingsEl = document.querySelector(".config-set#settings")
	createLineCommentsVisibilitySetting()
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
		this.checkbox = document.createElement("input")
		this.checkbox.id = id
		this.checkbox.setAttribute("type", "checkbox")
		this.checkbox.checked = window.config[config_key] || default_value
		this.label = document.createElement("label")
		this.label.setAttribute("for", id)
		this.label.textContent = label
		this.settingContainer.appendChild(this.checkbox)
		this.settingContainer.appendChild(this.label)
		settingsEl.appendChild(this.settingContainer)
	}

	return() {
		return this.settingContainer, this.checkbox
	}

}


function createLineCommentsVisibilitySetting() {
	let showlinecomContainer, showlinecomCheckbox = new CheckBoxItem("show-line-comments",
		"Show line comments", "show_line_comments", true).return()
	showlinecomCheckbox.addEventListener("change", (e) => {
		const el = e.target
		console.log("toggled comments")
		window.config["show_line_comments"] = el.checked
		localStorage.setItem("config", JSON.stringify(window.config))
		let commentItems = document.querySelectorAll(".config-set>.editor-item:has(>.editor-item-comment)")
		if (el.checked) {
			commentItems.forEach(i =>
				i.classList.remove("hidden")
			)
		} else {
			commentItems.forEach(i =>
				i.classList.add("hidden")
			)
		}
	})
}