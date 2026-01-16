import { GLOBAL } from './GLOBAL.js'
import { makeUUID, saveWindowConfig, waitFor } from './utils.js'
let settingsEl = document.querySelector('.config-set#settings')

export async function renderSettings() {
	settingsEl = document.querySelector('.config-set#settings')
	createAbout()
	createHeaderCommentsVisibilitySetting()
	createLineCommentsVisibilitySetting()
	createItemPreviewCommentVisibilitySetting()
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
		this.settingContainer = document.createElement('div')
		this.settingContainer.setAttribute('title', tooltip)
		this.settingContainer.classList.add('setting-container')
		this.settingContainer.classList.add('editor-item')
		this.settingContainer.setAttribute('tabindex', 0)
		this.settingContainer.dataset.uuid = makeUUID()
		this.checkbox = document.createElement('input')
		this.checkbox.id = config_key
		this.checkbox.setAttribute('type', 'checkbox')
		this.checkbox.checked =
			GLOBAL['config'][config_key] ?? default_value
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
			GLOBAL['mainFocus'][GLOBAL['activeTab']] =
				this.settingContainer.dataset.uuid
			this.checkbox.checked = !this.checkbox.checked
			this.handleToggle()
			// this.settingContainer.focus()
		})
		this.settingContainer.addEventListener('focus', () => {
			GLOBAL.setKey('currentView', 'main')
			GLOBAL['mainFocus'][GLOBAL['activeTab']] =
				this.settingContainer.dataset.uuid
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

function createAbout({ compact = false } = {}) {
	const aboutEl = document.createElement('div')
	aboutEl.classList.add('editor-item', 'editor-item-about', 'compact')
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
	versionText.textContent = 'v 0.7.4'
	const versionDot = document.createElement('span')
	versionDot.textContent = ' · '
	const githubUrl = 'https://github.com/acropolis914/hyprsettings'
	const versionLink = document.createElement('a')
	versionLink.href = githubUrl
	versionLink.target = '_blank'
	versionLink.rel = 'noopener noreferrer'
	versionLink.textContent = githubUrl
	versionEl.append(versionText, versionDot, versionLink)
	infoBoxEl.appendChild(versionEl)

	// Credits block
	const creditsEl = document.createElement('div')
	creditsEl.classList.add('credits')
	const creditsTitle = document.createElement('div')
	creditsTitle.classList.add('credits-title')
	creditsTitle.textContent = 'Credits'
	const creditsBody = document.createElement('div')
	creditsBody.classList.add('credits-body')
	creditsBody.textContent = 'Built with care by acropolis914.'
	creditsEl.append(creditsTitle, creditsBody)
	infoBoxEl.appendChild(creditsEl)

	// Technologies block
	const techEl = document.createElement('div')
	techEl.classList.add('technologies')

	const langsEl = document.createElement('div')
	langsEl.classList.add('tech-group')
	const langsTitle = document.createElement('div')
	langsTitle.classList.add('tech-title')
	langsTitle.textContent = 'Languages / Core'
	const langsList = document.createElement('div')
	langsList.classList.add('tech-list')
	langsList.textContent = 'Python, JavaScript'
	langsEl.append(langsTitle, langsList)

	const libsEl = document.createElement('div')
	libsEl.classList.add('tech-group')
	const libsTitle = document.createElement('div')
	libsTitle.classList.add('tech-title')
	libsTitle.textContent = 'Libraries / Frameworks'
	const libsList = document.createElement('div')
	libsList.classList.add('tech-list')
	libsList.textContent = 'Flask, PyWebview'
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

	aboutEl.addEventListener('click', () => {
		openGithub()
	})

	aboutEl.addEventListener('focusin', () => {
		aboutEl.classList.remove('compact')
	})

	aboutEl.addEventListener('focusout', () => {
		aboutEl.classList.add('compact')
	})

	settingsEl.appendChild(aboutEl)
}

function createLineCommentsVisibilitySetting() {
	function onCheck() {
		let commentItems = document.querySelectorAll(
			'.editor-item:has(>.editor-item-comment):not(.block-comment)'
		)
		commentItems.forEach((i) => i.classList.remove('settings-hidden'))
	}
	function onUncheck() {
		let commentItems = document.querySelectorAll(
			'.editor-item:has(>.editor-item-comment):not(.block-comment)'
		)
		commentItems.forEach((i) => i.classList.add('settings-hidden'))
	}
	let tooltip =
		'Shows or hides independent comments (not including the header comments)'
	const item = new CheckBoxItem(
		'Show line comments',
		'show_line_comments',
		true,
		{ onCheck, onUncheck },
		(tooltip = tooltip)
	)
}

function createHeaderCommentsVisibilitySetting() {
	function onCheck() {
		document
			.querySelectorAll('.block-comment')
			.forEach((i) => i.classList.remove('settings-hidden'))
	}
	function onUncheck() {
		document
			.querySelectorAll('.block-comment')
			.forEach((i) => i.classList.add('settings-hidden'))
	}

	const tooltip = 'Shows or hides header comments'
	new CheckBoxItem(
		'Show header comments',
		'show_header_comments',
		false,
		{ onCheck, onUncheck },
		tooltip
	)
}

function createItemPreviewCommentVisibilitySetting() {
	function onCheck() {
		document
			.querySelectorAll('i.preview-comment')
			.forEach((i) => i.classList.remove('settings-hidden'))
	}
	function onUncheck() {
		document
			.querySelectorAll('i.preview-comment')
			.forEach((i) => i.classList.add('settings-hidden'))
	}

	const tooltip = 'Shows or hides preview comments on config line previews.'
	new CheckBoxItem(
		'Show config line preview comments',
		'show_config_line_comments',
		true,
		{ onCheck, onUncheck },
		tooltip
	)
}

function createSidebarIconsVisibilitySetting() {
	function onCheck() {
		document
			.querySelectorAll('#sidebar-icon')
			.forEach((i) => i.classList.remove('settings-hidden'))
	}
	function onUncheck() {
		document
			.querySelectorAll('#sidebar-icon')
			.forEach((i) => i.classList.add('settings-hidden'))
	}

	const tooltip = 'Shows or hides sidebar icons'
	new CheckBoxItem(
		'Show sidebar icons',
		'show_sidebar_icons',
		true,
		{ onCheck, onUncheck },
		tooltip
	)
}

function createCompactViewSetting() {
	function onCheck() {
		document
			.querySelectorAll('.editor-item')
			.forEach((i) => i.classList.remove('compact'))
	}
	function onUncheck() {
		document
			.querySelectorAll('.editor-item')
			.forEach((i) => i.classList.add('compact'))
	}

	const tooltip = 'Shows or hides sidebar icons'
	new CheckBoxItem(
		'Compact view',
		'compact',
		true,
		{ onCheck, onUncheck },
		tooltip
	)
}

function createAnimationsToggleSetting() {
	function onCheck() {
		document.documentElement.classList.remove('no-anim')
	}
	function onUncheck() {
		document.documentElement.classList.add('no-anim')
	}

	const tooltip = 'Shows or hides sidebar icons'
	new CheckBoxItem(
		'Enable Animations',
		'ui_animations',
		true,
		{ onCheck, onUncheck },
		tooltip
	)
}
