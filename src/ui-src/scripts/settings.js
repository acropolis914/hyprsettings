import { GLOBAL } from './GLOBAL.js'
import { changeTheme, incrementCurrentTheme } from './setupTheme.js'
import { makeUUID, saveWindowConfig } from './utils.ts'
import { Backend } from '@scripts/backendAPI.js'

let settingsEl = document.querySelector('.config-set#settings')
let VERSION = '0.9.0'

export default async function renderSettings() {
	settingsEl = document.querySelector('.config-set#settings')
	await createAbout()
	getHyprsettingsGithubVersion()
	Backend.getHyprSettingsVersion()
	createHeaderCommentsVisibilitySetting()
	createLineCommentsVisibilitySetting()
	createItemPreviewCommentVisibilitySetting()
	createSidebarIconsVisibilitySetting()
	createAnimationsToggleSetting()
	createThemeSelectorSetting()
	// createShareConfigSetting()
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
		this.settingContainer = document.createElement('div')
		this.settingContainer.setAttribute('title', tooltip)
		this.settingContainer.classList.add('setting-container')
		this.settingContainer.classList.add('editor-item')
		this.settingContainer.setAttribute('tabindex', 0)
		this.settingContainer.dataset.uuid = makeUUID()
		this.checkbox = document.createElement('input')
		this.checkbox.id = config_key
		this.checkbox.setAttribute('type', 'checkbox')
		this.checkbox.checked = GLOBAL['config'][config_key] ?? default_value
		this.label = document.createElement('label')
		this.label.setAttribute('for', config_key)
		this.label.textContent = label
		this.settingContainer.appendChild(this.checkbox)
		this.settingContainer.appendChild(this.label)
		this.addListeners()
		settingsEl.appendChild(this.settingContainer)
		if (this.checkbox.checked) {
			this.actions.onCheck()
		} else {
			this.actions.onUncheck()
		}
	}
	addListeners() {
		this.settingContainer.addEventListener('keydown', (e) => {
			if (e.key === ' ' || e.key === 'Enter') {
				this.checkbox.checked = !this.checkbox.checked
				this.handleToggle()
			}
		})
		this.settingContainer.addEventListener('click', (e) => {
			// e.preventDefault()
			GLOBAL.setKey('currentView', 'main')
			GLOBAL['mainFocus'][GLOBAL['activeTab']] = this.settingContainer.dataset.uuid
			this.checkbox.checked = !this.checkbox.checked
			this.handleToggle()
			// this.settingContainer.focus()
		})
		this.settingContainer.addEventListener('focus', () => {
			GLOBAL.setKey('currentView', 'main')
			GLOBAL['mainFocus'][GLOBAL['activeTab']] = this.settingContainer.dataset.uuid
		})
		this.checkbox.addEventListener('mousedown', (e) => {
			// e.preventDefault()
			this.checkbox.checked = !this.checkbox.checked
			this.handleToggle()
			this.settingContainer.focus()
		})
		this.checkbox.addEventListener('change', async (e) => {
			this.handleToggle()
		})
	}

	handleToggle() {
		const checked = this.checkbox.checked
		GLOBAL['config'][this.configKey] = checked
		saveWindowConfig()
		if (checked && this.actions.onCheck) {
			this.actions.onCheck()
		}
		if (!checked && this.actions.onUncheck) {
			this.actions.onUncheck()
		}
		console.log(`${this.label.textContent}: ${this.checkbox.checked}`)
		saveWindowConfig()
	}
	return() {
		return { container: this.settingContainer, checkbox: this.checkbox }
	}
}

async function createAbout({ compact = false } = {}) {
	const aboutEl = document.createElement('div')
	aboutEl.classList.add('editor-item', 'editor-item-about')
	if (compact) aboutEl.classList.add('compact')
	aboutEl.tabIndex = 0

	const titleEl = document.createElement('div')
	titleEl.classList.add('title')
	const title = `╻ ╻╻ ╻┏━┓┏━┓┏━┓┏━╸╺┳╸╺┳╸╻┏┓╻┏━╸┏━┓
┣━┫┗┳┛┣━┛┣┳┛┗━┓┣╸  ┃  ┃ ┃┃┗┫┃╺┓┗━┓
╹ ╹ ╹ ╹  ╹┗╸┗━┛┗━╸ ╹  ╹ ╹╹ ╹┗━┛┗━┛
`
	titleEl.textContent = title
	aboutEl.appendChild(titleEl)

	const infoBoxEl = document.createElement('div')
	infoBoxEl.classList.add('info')
	aboutEl.appendChild(infoBoxEl)

	// Version block: "v 0.7.3 · link"
	const versionEl = document.createElement('div')
	versionEl.classList.add('version')
	const versionText = document.createElement('span')
	versionText.classList.add('version-text')
	versionText.textContent = VERSION
	GLOBAL.onChange('version', (value) => {
		versionText.textContent = value
	})
	const versionDot = document.createElement('span')
	versionDot.textContent = ' · '
	const githubUrl = 'https://github.com/acropolis914/hyprsettings'
	const versionLink = document.createElement('a')
	versionLink.href = githubUrl
	versionLink.target = '_blank'
	versionLink.rel = 'noopener noreferrer'
	versionLink.textContent = githubUrl

	const oudatedText = document.createElement('span')
	oudatedText.classList.add('outdated-text', 'hidden')
	oudatedText.textContent = 'Getting update info from Github....'
	versionText.addEventListener('click', (e) => {
		getHyprsettingsGithubVersion()
	})

	versionEl.append(versionLink, versionText, oudatedText)
	infoBoxEl.appendChild(versionEl)

	// Credits block
	const creditsEl = document.createElement('div')
	creditsEl.classList.add('credits')
	const creditsTitle = document.createElement('div')
	creditsTitle.classList.add('credits-title')
	creditsTitle.textContent = 'Contributors'
	const creditsBody = document.createElement('div')
	creditsBody.classList.add('credits-body')
	creditsBody.innerHTML =
		'Built with care by acropolis914.<br>With help from wiktormalyska, ritualcasts,  <a href="https://github.com/Nurysso/Hecate" target="_blank" title="Go check out his hyprland project called Hecate!" style="color:var(--accent)">nurysso.</a>'
	creditsEl.append(creditsTitle, creditsBody)
	infoBoxEl.appendChild(creditsEl)

	// Technologies block
	const techEl = document.createElement('div')
	techEl.classList.add('technologies')

	const langsEl = document.createElement('div')
	langsEl.classList.add('tech-group')
	const langsTitle = document.createElement('div')
	langsTitle.classList.add('tech-title')
	langsTitle.textContent = ' Python'
	const langsList = document.createElement('div')
	langsList.classList.add('tech-list')
	langsList.textContent = 'Pywebview • Flask • Rich'
	langsEl.append(langsTitle, langsList)

	const libsEl = document.createElement('div')
	libsEl.classList.add('tech-group')
	const libsTitle = document.createElement('div')
	libsTitle.classList.add('tech-title')
	libsTitle.textContent = ' Javascript and Web'
	const libsList = document.createElement('div')
	libsList.classList.add('tech-list')
	libsList.textContent = 'TomSelect, Coloris, Fuse.js, Eruda, Sortable, noUISlider'
	libsList.textContent = libsList.textContent.replaceAll(',', ' •')
	libsEl.append(libsTitle, libsList)

	techEl.append(langsEl, libsEl)
	infoBoxEl.appendChild(techEl)

	// Open GitHub on Enter or click
	const openGithub = () => versionLink.click()

	aboutEl.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			openGithub()
		}
	})

	// aboutEl.addEventListener('click', () => {
	// 	openGithub()
	// })

	aboutEl.addEventListener('focusin', () => {
		aboutEl.classList.remove('compact')
	})
	if (compact) {
		aboutEl.addEventListener('focusout', () => {
			aboutEl.classList.add('compact')
		})
	}

	settingsEl.appendChild(aboutEl)
}

function createLineCommentsVisibilitySetting() {
	function onCheck() {
		let commentItems = document.querySelectorAll('.editor-item:has(>.editor-item-comment):not(.block-comment)')
		commentItems.forEach((i) => i.classList.remove('settings-hidden'))
	}
	function onUncheck() {
		let commentItems = document.querySelectorAll('.editor-item:has(>.editor-item-comment):not(.block-comment)')
		commentItems.forEach((i) => i.classList.add('settings-hidden'))
	}
	let tooltip_text = 'Shows or hides independent comments (not including the header comments)'
	const item = new CheckBoxItem('Show line comments', 'show_line_comments', true, { onCheck, onUncheck }, tooltip_text)
}

function createHeaderCommentsVisibilitySetting() {
	function onCheck() {
		document.querySelectorAll('.block-comment').forEach((i) => i.classList.remove('settings-hidden'))
	}
	function onUncheck() {
		document.querySelectorAll('.block-comment').forEach((i) => i.classList.add('settings-hidden'))
	}

	const tooltip = 'Shows or hides header comments'
	new CheckBoxItem('Show header comments', 'show_header_comments', false, { onCheck, onUncheck }, tooltip)
}

function createItemPreviewCommentVisibilitySetting() {
	function onCheck() {
		document.querySelectorAll('i.preview-comment').forEach((i) => i.classList.remove('settings-hidden'))
	}
	function onUncheck() {
		document.querySelectorAll('i.preview-comment').forEach((i) => i.classList.add('settings-hidden'))
	}

	const tooltip = 'Shows or hides preview comments on config line previews.'
	new CheckBoxItem('Show config line preview comments', 'show_config_line_comments', true, { onCheck, onUncheck }, tooltip)
}

function createSidebarIconsVisibilitySetting() {
	function onCheck() {
		document.querySelectorAll('#sidebar-icon').forEach((i) => i.classList.remove('settings-hidden'))
	}
	function onUncheck() {
		document.querySelectorAll('#sidebar-icon').forEach((i) => i.classList.add('settings-hidden'))
	}

	const tooltip = 'Shows or hides sidebar icons'
	new CheckBoxItem('Show sidebar icons', 'show_sidebar_icons', true, { onCheck, onUncheck }, tooltip)
}

function createCompactViewSetting() {
	function onCheck() {
		document.querySelectorAll('.editor-item').forEach((i) => i.classList.remove('compact'))
	}
	function onUncheck() {
		document.querySelectorAll('.editor-item').forEach((i) => i.classList.add('compact'))
	}

	const tooltip = 'Shows or hides sidebar icons'
	new CheckBoxItem('Compact view', 'compact', true, { onCheck, onUncheck }, tooltip)
}

function createAnimationsToggleSetting() {
	function onCheck() {
		document.documentElement.classList.remove('no-anim')
	}
	function onUncheck() {
		document.documentElement.classList.add('no-anim')
	}

	const tooltip = 'Shows or hides sidebar icons'
	new CheckBoxItem('Enable Animations', 'ui_animations', true, { onCheck, onUncheck }, tooltip)
}

function createThemeSelectorSetting() {
	// console.log('Creating theme selector setting (coming soon)')
	let settingContainer = document.createElement('div')
	let tooltip = 'Select the application theme'
	settingContainer.setAttribute('title', tooltip)
	settingContainer.id = 'theme-selector-setting'
	settingContainer.classList.add('setting-container')
	settingContainer.classList.add('editor-item')
	settingContainer.setAttribute('tabindex', 0)
	settingContainer.dataset.uuid = makeUUID()

	let label = document.createElement('label')
	// this.label.setAttribute('for', config_key)
	label.textContent = 'Theme'
	// settingContainer.appendChild(this.checkbox)
	settingContainer.appendChild(label)

	let selectEl = document.createElement('select')
	window.themes.forEach((theme) => {
		let optionEl = document.createElement('option')
		optionEl.value = theme.name
		let optionName = String(theme.name)
		optionEl.textContent = optionName.includes('[builtin]') ? theme.name.replace('[builtin]', ' ') : ` ${theme.name}`
		selectEl.appendChild(optionEl)
	})
	let currentTheme = GLOBAL['config']['theme']

	settingContainer.appendChild(selectEl)
	// this.addListeners()
	settingsEl.appendChild(settingContainer)

	selectEl.addEventListener('change', (e) => {
		let selectedThemeName = e.target.value
		let selectedTheme = window.themes.find((t) => t.name === selectedThemeName)
		console.log(`Changing theme to ${selectedThemeName} from settings`)
		if (selectedTheme) {
			console.log(`Changing theme to ${selectedTheme.name} from settings`)
			changeTheme(selectedTheme)
		}
	})

	settingContainer.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			incrementCurrentTheme()
		}
	})
	settingContainer.addEventListener('click', (e) => {
		if (e.target !== selectEl) {
			incrementCurrentTheme()
		}
	})
}

export async function getHyprsettingsGithubVersion(element) {
	const res = await fetch('https://raw.githubusercontent.com/acropolis914/hyprsettings/refs/heads/master/src/.version')
	const full = (await res.text()).trim()
	console.log({
		full,
		base: full.split('.').slice(0, 4).join('.'),
	})
	GLOBAL.setKey('githubVersion', full)

	if (full !== GLOBAL.version) {
		console.error('Version', GLOBAL.version, 'is older than github version', GLOBAL.githubVersion)
		let versionEl = settingsEl.querySelector('.version-text')

		let outdatedEl = settingsEl.querySelector('.outdated-text')
		outdatedEl.classList.remove('hidden')
		outdatedEl.innerHTML = `
<span class="warn"> Outdated </span>
<span>Github version is ${full}</span>
<span class="outdated-message">Please update by running the same command</span>
<span class="outdated-message">you used for installing this.</span>
`
	}
}
