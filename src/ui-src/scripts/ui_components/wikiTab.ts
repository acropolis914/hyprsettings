import { GLOBAL } from '../GLOBAL'
import { Backend } from '../utils/backendAPI'
// import * as util from 'node:util'
import { makeUUID } from '../utils/utils.ts'
import parseMarkdown from '../wiki/parseMarkdown.ts'
import normalizeText from '../utils/normalizeText.ts'
import Prism from 'prismjs/prism'
import 'prismjs/components/prism-ini.min.js'
import 'prismjs/components/prism-bash.min.js'
import 'prismjs/plugins/toolbar/prism-toolbar.min.js'
import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard.js'
import '@stylesheets/subs/prism.css'
import '@stylesheets/subs/tippy.css'
import tippy, { followCursor } from 'tippy.js'

export default async function createWiki() {
	console.log('Creating Wiki...')
	GLOBAL.onChange('wikiTree', createWikiNavigation)
	await Backend.getHyprlandWikiNavigation()
}

async function createWikiNavigation() {
	let wikiRoot_el = document.querySelector('.config-set#wiki')
	wikiRoot_el.innerHTML = ''
	let navigationEl = document.createElement('div')
	navigationEl.setAttribute('id', 'wikiNavigation')
	navigationEl.setAttribute('tabindex', '0')
	navigationEl.dataset.uuid = 'wikiNavigation'

	let open = true

	let viewEl = document.createElement('div')
	viewEl.setAttribute('id', 'wikiView')
	viewEl.setAttribute('tabindex', '0')
	viewEl.dataset.uuid = 'wikiView'

	let navigationElToggle = document.createElement('div')
	navigationElToggle.setAttribute('id', 'navigation_toggle')
	navigationElToggle.innerText = ''

	if (GLOBAL.activeTab !== 'wiki') {
		navigationElToggle.classList.add('hidden')
	}

	GLOBAL.onChange('activeTab', (value) => {
		if (GLOBAL.activeTab !== 'wiki') {
			navigationElToggle.classList.add('hidden')
		} else {
			navigationElToggle.classList.remove('hidden')
		}
	})
	navigationElToggle.addEventListener('click', (e) => {
		if (open) {
			navigationEl.style.display = 'none'
			viewEl.style.display = 'block'
		} else {
			navigationEl.style.display = 'block'
			viewEl.style.display = 'none'
		}
		open = !open
	})

	navigationEl.addEventListener('click', (e) => {
		if (!open) {
			navigationElToggle.click()
		}
		open = !open
	})

	let configSetInfoEl = document.getElementById('config-set-info')
	configSetInfoEl.appendChild(navigationElToggle)

	let viewEl_title = document.createElement('div')
	viewEl_title.setAttribute('id', 'wikiView_title')
	viewEl_title.classList.add('hidden')
	viewEl.appendChild(viewEl_title)

	let viewEl_position = document.createElement('div')
	viewEl_position.setAttribute('id', 'wikiView_position')
	viewEl.appendChild(viewEl_position)

	let viewEl_content = document.createElement('div')
	viewEl_content.setAttribute('id', 'wikiView_content')
	viewEl.appendChild(viewEl_content)

	wikiRoot_el.appendChild(navigationEl)
	wikiRoot_el.appendChild(viewEl)
	// viewEl.classList.add("config-set", "editor-item")

	let objectTree = []
	objectTree.push(navigationEl)

	let tree: Object = GLOBAL.wikiTree
	GLOBAL.setKey('wikiEntry', [])
	async function setupNavigation(object: object, indentation = 0, path = 'wiki') {
		let indent = '       '.repeat(indentation)
		for (const [key, value] of Object.entries(object)) {
			if (key === 'navigation.txt' || key === 'version-selector.md') {
				continue
			}
			if (key === '.version') {
				GLOBAL.setKey('wikiVersion', value)
				continue
			}

			let el = document.createElement('div')
			el.classList.add('editor-item')
			el.classList.add('wiki-item')
			el.setAttribute('tabindex', 0)
			el.dataset.uuid = makeUUID()
			el.dataset.name = key
			el.dataset.cleanName = key.trim().replace('.md', '').replace('-', ' ')
			el.dataset.position = path
			function setElValue(el) {
				setViewElValue(el.dataset.value, el.dataset.position)
			}

			if (typeof value == 'string' && key != '_index.md') {
				el.classList.add('wiki-file')
				el.innerHTML = el.dataset.cleanName
				let parsed = await parseMarkdown(value)
				el.dataset.value = JSON.stringify(parsed)
				let uuid = makeUUID() //TODO
				el.dataset.wikiEntry = uuid
				GLOBAL['wikiEntry'][uuid] = JSON.stringify(parsed)
				el.dataset.weight = parsed.data.matter.weight || -1
				if (key === 'LICENSE') {
					el.dataset.weight = 1000
				}
				objectTree.at(-1).appendChild(el)
			} else if (key != '_index.md' && typeof value != 'string') {
				el.classList.add('wiki-folder', 'config-group')
				el.dataset.position = `${path}:${key}`
				objectTree.at(-1).appendChild(el)
				objectTree.push(el)
				indentation += 1
				await setupNavigation(value, indentation, `${path}:${key}`)
				indentation -= 1

				objectTree.pop()
			} else if (key == '_index.md' && typeof value === 'string' && objectTree.length != 1) {
				// console.log(value)
				let parsed = await parseMarkdown(value)
				// el.dataset.value =

				objectTree.at(-1).dataset.value = JSON.stringify(parsed)
				let uuid = makeUUID() //TODO
				el.dataset.wikiEntry = uuid
				GLOBAL['wikiEntry'][uuid] = JSON.stringify(parsed)
				objectTree.at(-1).dataset.wikiEntry = uuid
				objectTree.at(-1).dataset.weight = parsed.data.matter.weight || -1
				continue
			} else if (objectTree.length === 1 && key == '_index.md') {
				el.classList.add('wiki-file')
				el.innerHTML = 'Welcome to the Wiki!'
				el.dataset.weight = '-2'
				objectTree.at(-1).appendChild(el)
				let parsed = await parseMarkdown(value)
				parsed.value = `
					<blockquote class="info">
					This wiki is sourced from the hyprwm/hyprland-wiki github page. It was pulled with version <strong>${GLOBAL.wikiVersion.split('\n')[0]}.</strong>
					<br>
					All rights reserved to vaxry and the hyprland contributors! See <a href="./LICENSE">LICENSE</a> for the hyprland wiki.
					</blockquote>
					${parsed.value}
					`
				let markdown_json_parsed = JSON.stringify(parsed)
				el.dataset.value = markdown_json_parsed
				let uuid = makeUUID() //todo
				el.dataset.wikiEntry = uuid
				GLOBAL['wikiEntry'][uuid] = JSON.stringify(parsed)
				setViewElValue(markdown_json_parsed, path, 'Hyprland Wiki')
			} else {
				console.warn(`Error parsing "${key}: ${value}"`)
			}
			el.addEventListener('click', (e) => {
				if (e.target != el) {
					return
				}
				// let target = e.target
				GLOBAL.setKey('currentView', 'main')
				// @ts-ignore
				GLOBAL['mainFocus'][GLOBAL['activeTab']] = el.dataset.uuid
				if (el.innerText.startsWith('Welcome')) {
					console.warn(`Welcome to the Wiki!`)
				}
				let wikiContentUUID = el.dataset.wikiEntry //TODO
				let wikiContent = GLOBAL['wikiEntry'][wikiContentUUID]
				setViewElValue(wikiContent, el.dataset.position)
			})
			el.addEventListener('focus', (e) => {
				if (e.target != el) {
					return
				}
				let wikiContentUUID = el.dataset.wikiEntry //TODO
				let wikiContent = GLOBAL['wikiEntry'][wikiContentUUID]
				setViewElValue(wikiContent, el.dataset.position)
			})
		}
	}
	await setupNavigation(tree, 0, 'Wiki')
	let navigationNode = document.getElementById('wikiNavigation')
	reorderByWeight(navigationNode)
}

export function reorderByWeight(el: HTMLElement): void {
	// console.log(el)
	if (!el) return

	// Grab only .editor-item children
	const items = el.children
	// console.log(items)

	// Sort by dataset.weight (allow negatives, treat invalid as 0)
	const sorted = [...items].sort((a, b) => {
		const aw = Number(a.dataset.weight?.trim() || 0)
		const bw = Number(b.dataset.weight?.trim() || 0)
		return aw - bw
	})

	// console.log(sorted)
	// Re-append in order if needed
	for (let i = 0; i < sorted.length; i++) {
		const currentNode = sorted[i]
		if (el.children[i] !== currentNode) {
			el.insertBefore(currentNode, el.children[i] || null)
		}
		// recurse into children
		reorderByWeight(currentNode)
	}
}

function findWikiViewElement(target_element: string): HTMLElement {
	let linkTargetName = target_element.replace('#', '').replaceAll('-', ' ')
	let wikiView = document.getElementById('wikiView_content')
	let element = Array.from(wikiView.childNodes).find((element: HTMLElement) => {
		if (element.innerText) {
			return element.innerText.toLowerCase() === linkTargetName.toLowerCase()
		}
	})
	return <HTMLElement>element
}

function fixLinxElement(element: HTMLElement, position: string) {
	let link = element.getAttribute('href')
	let title = link

	if (link.startsWith('..') || link.startsWith('.')) {
		// console.log({ position })
		let link_without_section = link.replace(link.substring(link.indexOf('#')), '')
		// console.log(link_without_section)
		let position_paths = position.split(':').filter(Boolean)
		let link_parts = link
			.split('/')
			.filter(Boolean)
			.filter((item) => !item.startsWith('#'))
		let link_section = link
			.split('/')
			.filter(Boolean)
			.filter((item) => item.startsWith('#'))
		let linkToFix = link_parts.join(':')
		while (link_parts[0] === '..') {
			link_parts.shift()
			if (!link_without_section.endsWith('/') && position_paths.length > 1) {
				position_paths.pop()
			}
		}
		while (link_parts[0] === '.') {
			link_parts.shift()
		}
		const newLink = [...position_paths, ...link_parts, ...link_section].join(':')
		title = newLink
		// console.log('Fixing link element', { link_without_section, position,newLink })
		element.addEventListener('click', (e) => {
			e.preventDefault()
			gotoWikiEvent(e)
		})
		function gotoWikiEvent(e) {
			console.log('Navigating to', newLink)
			gotoWiki(newLink)
		}
	} else if (link.startsWith('#')) {
		element.addEventListener('click', (e) => {
			e.preventDefault()
			let element = findWikiViewElement(link)
			element.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	} else if (link.trim().startsWith('http')) {
		element.setAttribute('target', '_blank')
	}
	let content
	if (title.startsWith('http')) {
		content = title
	} else {
		content = title.replace(':', '  ')
	}
	tippy(element, {
		content: content,
		followCursor: true,
		plugins: [followCursor],
	})
}
window.gotoWiki = gotoWiki
export function gotoWiki(wikidir: string) {
	document.querySelector('.sidebar-item#wiki').click()
	let wikiDir_path = wikidir.split(':').filter((e) => !e.startsWith('#'))
	let wikiDir_path_immutable = wikiDir_path
	let wikiDir_section = wikidir.split(':').filter((e) => e.startsWith('#'))

	// console.log(`Wiki: ${wikiDir_path.join(":")}`)
	console.log(wikiDir_path)
	let wikiDirNavigationEl = document.querySelector('#wikiNavigation')
	wikiDir_path.shift()

	let node = wikiDirNavigationEl
	while (wikiDir_path.length > 0) {
		let node_children = Array.from(node.children)

		node = node_children.find((e) => {
			let name = normalizeText(e.dataset.name)
			let target = normalizeText(wikiDir_path[0])
			// console.log({ name, target })
			return target === name
		})

		if (!node) {
			console.error('Could not find wiki node:', wikiDir_path[0])
		}
		wikiDir_path.shift()
	}
	// console.log(node)
	if (node) {
		node.click()
	} else {
		let directory = wikidir
			.split(':')
			.filter((e) => !e.startsWith('#'))
			.at(-1)
		console.log(directory)
		let directories = Array.from(wikiDirNavigationEl.querySelectorAll('.wiki-item'))
		let found = directories.find((e) => normalizeText(e.dataset.name) === normalizeText(directory))
		console.log({ directory, directories, found })
		if (found) {
			found.click()
		} else {
			console.error('Could not find wiki node:', wikiDir_path[0])
		}
	}

	setTimeout(() => {
		if (wikiDir_section[0]) {
			let section = findWikiViewElement(wikiDir_section[0])

			// console.log(section)
			section.scrollIntoView({ behavior: 'smooth', block: 'start' })
		} else {
			let wikiView_content = document.querySelector('#wikiView_content')
			wikiView_content.scrollTo(0, 0)
		}
	}, 100)
}

async function setViewElValue(value: string, position: string, title = '') {
	// console.log(value, title, position)
	const parsed = JSON.parse(value)
	// console.log(parsed)
	if (parsed['value']) {
		// viewEl.innerHTML = ""
		// @ts-ignore
		let viewEl = document.getElementById('wikiView')
		let viewEl_title = document.getElementById('wikiView_title')
		let viewEl_content = document.getElementById('wikiView_content')
		let viewEl_position = document.getElementById('wikiView_position')
		if (parsed.data.matter.title) {
			viewEl_title.textContent = parsed.data.matter.title || 'Hyprland Wiki'
			viewEl_title.classList.remove('hidden')
		} else if (title) {
			viewEl_title.textContent = title
			viewEl_title.classList.remove('hidden')
		} else {
			viewEl_title.textContent = 'Hyprland Wiki'
			// viewEl_title.classList.add('hidden')
		}

		viewEl_position.innerHTML = ` ${position.split(':').join('  ')} `

		viewEl_content.innerHTML = parsed['value']
		// console.clear()
		viewEl_content.querySelectorAll('a').forEach((element: HTMLElement) => {
			fixLinxElement(element, position)
		})
		const wikiWarning = viewEl_content.querySelector('p:has(> em > strong)')
		if (wikiWarning) {
			wikiWarning.style.border = '1px solid #ff4444'
			wikiWarning.classList.add('hidden')
		}
		let codePreEl = viewEl_content.querySelectorAll('pre')
		if (codePreEl) {
			codePreEl.forEach((element: HTMLElement) => {
				let code = element.querySelector('code') || element
				code.classList.add('copy-to-clipboard-button')
				let shebang = code.innerText.toLowerCase().split('\n')[0]
				if (shebang && shebang.trim().endsWith('sh')) {
					code.classList.add('language-bash')
					element.classList.add('language-bash')
					Prism.highlightElement(code)
				} else if (code.innerText.toLowerCase().includes('vga compatible')) {
					console.log(code.innerText)
					code.classList.add('language-shell-session')
					element.classList.add('language-shell-session')
					code.classList.add('language-bash')
					element.classList.add('language-bash')
					Prism.highlightElement(code)
				} else {
					code.classList.add('language-ini')
					element.classList.add('language-ini')
					Prism.highlightElement(code)
				}
			})
		}
		viewEl.scrollTo({ top: 0, behavior: 'smooth' })
	}
}
