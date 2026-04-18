import { GLOBAL } from '../GLOBAL.ts'
import { Backend } from '../utils/backendAPI.ts'
// import * as util from 'node:util'
import { makeUUID } from '../utils/utils.ts'
import parseMarkdown from '../wiki/parseMarkdown.ts'
import normalizeText from '../utils/normalizeText.ts'
import Prism from 'prismjs/prism'
import 'prismjs/components/prism-ini.min.js'
import 'prismjs/components/prism-bash.min.js'
// import 'prismjs/plugins/toolbar/prism-toolbar.min.js'
// import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard.js'
import '@stylesheets/subs/prism.css'
import '@stylesheets/subs/tippy.scss'
import tippy, { followCursor } from 'tippy.js'
import { attemptSwitchToMain } from '@scripts/ui_components/documentListeners.ts'
import { implementScrollHints } from '@scripts/utils/scrollHints.ts'

export default async function createWiki() {
	console.log('Creating Wiki...')
	GLOBAL.onChange('wikiTree', createWikiNavigation)
	await Backend.getHyprlandWikiNavigation()
}

// GLOBAL.onChange('currentView', (value) => {
// 	console.log('currentView: ', value)
// })

async function createWikiNavi(navigationEl: HTMLDivElement, viewEl_content: HTMLDivElement) {
	let objectTree = []
	let frag = document.createDocumentFragment()
	objectTree.push(frag)
	// objectTree.push(navigationEl)

	let tree: Object = GLOBAL.wikiTree
	GLOBAL.setKey('wikiEntry', {})

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
				if (parsed) {
					GLOBAL['wikiEntry'][uuid] = parsed
				} else {
					console.warn('Skipping null parse for', key)
				}
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
				if (parsed) {
					GLOBAL['wikiEntry'][uuid] = parsed
				} else {
					console.warn('Skipping null parse for', key)
				}
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
				let markdown_json_parsed = parsed
				let uuid = makeUUID() //todo
				el.dataset.wikiEntry = uuid
				if (parsed) {
					GLOBAL['wikiEntry'][uuid] = parsed
				} else {
					console.warn('Skipping null parse for', key)
				}
				setViewElValue(markdown_json_parsed, path, 'Hyprland Wiki')
			} else {
				console.warn(`Error parsing "${key}: ${value}"`)
			}
			el.addEventListener('click', (e) => {
				if (e.target != el) {
					return
				}
				// let target = e.target
				GLOBAL.setKey('currentView', 'wikiNavigation')
				// @ts-ignore
				GLOBAL['mainFocus'][GLOBAL['activeTab']] = el.dataset.uuid
				if (el.innerText.startsWith('Welcome')) {
					console.warn(`Welcome to the Wiki!`)
				}
				let wikiContentUUID = el.dataset.wikiEntry //TODO
				let wikiContent = GLOBAL['wikiEntry'][wikiContentUUID]
				setViewElValue(wikiContent, el.dataset.position)
				const isMobile = window.matchMedia('(max-width: 768px)').matches
				if (isMobile) {
					navigationEl.classList.add('hidden-wikinav')
				}
				// console.log({ isMobile, navi: navigationEl.style.display })
			})
			el.addEventListener('focus', (e) => {
				if (e.target != el) {
					return
				}
				let wikiContentUUID = el.dataset.wikiEntry //TODO
				let wikiContent = GLOBAL['wikiEntry'][wikiContentUUID]
				setViewElValue(wikiContent, el.dataset.position)
				navigationEl.classList.remove('hidden-wikinav')
			})
			el.addEventListener('keydown', (e) => {
				if (e.key === 'ArrowRight') {
					viewEl_content.focus()
					GLOBAL.setKey('previousView', 'wikiNavigation')
					GLOBAL.setKey('currentView', 'wikiContent')
				}
			})
		}
	}

	await setupNavigation(tree, 0, 'Wiki')
	navigationEl.appendChild(frag)
}

async function createWikiNavigation() {
	let wikiRoot_el = document.querySelector('.config-set#wiki')
	wikiRoot_el.innerHTML = ''
	let navigationEl = document.createElement('div')
	navigationEl.setAttribute('id', 'wikiNavigation')
	navigationEl.setAttribute('tabindex', '0')
	navigationEl.dataset.uuid = 'wikiNavigation'

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
		console.log({ activetab: value })
		if (GLOBAL.activeTab !== 'wiki') {
			navigationElToggle.classList.add('hidden')
		}
	})

	GLOBAL.onChange('activeTab', (value) => {
		if (GLOBAL.activeTab !== 'wiki') {
			navigationElToggle.classList.add('hidden')
		} else {
			navigationElToggle.classList.remove('hidden')
		}
	})
	navigationElToggle.addEventListener('click', (e) => {
		navigationEl.classList.toggle('hidden-wikinav')
	})
	implementScrollHints(navigationEl)

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
	viewEl_content.tabIndex = 0
	viewEl.appendChild(viewEl_content)
	implementScrollHints(viewEl_content)

	viewEl_content.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowDown') {
			viewEl_content.scrollBy({ top: 50, behavior: 'smooth' })
		}
		if (e.key === 'ArrowUp') {
		}
		if (e.key === 'ArrowLeft') {
			let naviUUID = GLOBAL.mainFocus[GLOBAL.activeTab]
			console.log('naviUUID', naviUUID)
			navigationEl.classList.remove('hidden-wikinav')
			open = true
			const toFocus = navigationEl.querySelector(`[data-uuid="${naviUUID}"]`) || navigationEl.firstElementChild
			toFocus.scrollIntoView({})
			toFocus.focus()
			// GLOBAL.setKey('currentView', 'wiki')
			setTimeout(() => {
				GLOBAL.currentView = 'wikiNavigation'
			}, 10)

			// attemptSwitchToMain()
		}
	})

	viewEl_content.addEventListener('click', (e) => {
		GLOBAL.setKey('currentView', 'wikiContent')
	})

	wikiRoot_el.appendChild(navigationEl)
	wikiRoot_el.appendChild(viewEl)
	await createWikiNavi(navigationEl, viewEl_content)
	// downloadTextFile('wikientries.txt', JSON.stringify(GLOBAL['wikiEntry']))
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

/**
 * Hyprland Wiki Element Resolver (SPA API)
 * like many other files here, I sometimes feed them to ai to complete my
 * documentation and stuff and you can notice them with the descriptive formatted
 * inline comments, cleaner formatting, naming etc, but the logic starts with
 * me manually coding them. AI is kind of last pass to help with readability and
 * stuff. I dont push stuff I dont understand.
 * =============================================================================
 * A high-performance, tiered resolution engine that maps string identifiers
 * to DOM elements within the Hyprland Wiki content container.
 *
 * DESIGN PRINCIPLE: "The Waterfall"
 * ---------------------------------
 * The function follows a strict priority hierarchy. If a higher-tier search
 * fails, it "falls through" to the next most logical match.
 *
 * RESOLUTION TIERS (In Order of Priority):
 * 1. [FAST PATH] Native ID Match: Case-insensitive check using browser CSS engine.
 * 2. [SYNTAX MATCH] Prefixed Search: Handles <tag>, #header, -list, `code`, **bold**.
 * 3. [EXACT TEXT] Case-insensitive, trimmed match of the full innerText.
 * 4. [STARTS-WITH] Case-insensitive match for the beginning of the innerText.
 * 5. [INCLUDES] Final loose "contains" search (Last resort).
 *
 * SAMPLE TEST RESOLUTIONS:
 * | Input String      | Resolver Logic                               | Target Example               |
 * |-------------------|----------------------------------------------|------------------------------|
 * | "animations"      | Fast Path (ID) -> Exact Text                 | <h2 id="animations">         |
 * | "#binds"          | Tier 2 (Header + ID/Text)                    | <h3>Binds</h3>              |
 * | "<pre>dispatch"   | Tier 2 (Specific Tag + ID/Text)              | <pre id="dispatch">          |
 * | "<a>"             | Tier 2 (Tag Only)                            | First <a> on page            |
 * | "- layout"        | Tier 2 (List + Includes)                     | <li>Set the layout to...</li>|
 * | "`rounding`"      | Tier 2 (Code + Includes)                     | <code>rounding = 10</code>   |
 * | "**strong**"      | Tier 2 (Bold + Includes)                     | <strong>strong</strong>      |
 * | "windowrulev2"    | Exact ID -> Exact Text -> StartsWith         | <div id="windowrulev2">      |
 *
 * CONSTRAINTS:
 * - target_element must not contain spaces.
 * - wikiView_content must be the parent container ID.
 * =============================================================================
 */
function findWikiViewElement(target_element: string): HTMLElement | null {
	if (target_element.startsWith('#uncommon')) {
		console.log({ target_element })
	}
	const raw = target_element.trim()
	if (!raw) {
		console.log('[wiki] section resolver: empty target')
		return null
	}

	const wikiView = document.getElementById('wikiView_content')
	if (!wikiView) {
		console.log('[wiki] section resolver: wikiView_content not found', {
			target: raw,
		})
		return null
	}

	const cleanId = raw
		.replace(/^[#<>\-\*`]+/, '') // Strip prefix
		.replace(/>$/, '') // Strip trailing HTML bracket
		.toLowerCase()

	const quickMatch = wikiView.querySelector(`#${cleanId}`) || wikiView.querySelector(`[id="${cleanId}" i]`)
	if (quickMatch) {
		console.log('[wiki] section resolver: fast-path id match', {
			target: raw,
			cleanId,
			matchedTag: (quickMatch as HTMLElement).tagName,
			matchedId: (quickMatch as HTMLElement).id,
		})
		return quickMatch as HTMLElement
	}

	// Convert NodeList to Array once for filtering
	const elements = Array.from(wikiView.querySelectorAll('*')) as HTMLElement[]

	// Safety: Ignore non-visible/metadata tags that might contain the search text
	const searchable = elements.filter((el) => !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName))

	// --- TIER 2: SYNTAX-SPECIFIC RESOLUTION ---

	// A. HTML Tag Logic: Handles <tag>id or <tag>
	const tagMatch = raw.match(/^<(\w+)>(.*)$/)
	if (tagMatch) {
		const [, tagName, identifier] = tagMatch
		const upperTag = tagName.toUpperCase()
		const idPart = identifier.trim().toLowerCase()

		const sameTags = searchable.filter((el) => el.tagName === upperTag)
		if (sameTags.length > 0) {
			console.log('[wiki] section resolver: tag syntax match', {
				target: raw,
				tag: upperTag,
				candidates: sameTags.length,
				identifier: idPart || null,
			})
			// Priority: ID Match inside tag -> Content Match inside tag -> First occurrence
			if (!idPart) {
				console.log('[wiki] section resolver: tag syntax used first candidate', {
					tag: upperTag,
				})
				return sameTags[0]
			}
			const tagIdMatch = sameTags.find((el) => el.id.toLowerCase() === idPart)
			if (tagIdMatch) {
				console.log('[wiki] section resolver: tag syntax id match', {
					tag: upperTag,
					identifier: idPart,
				})
				return tagIdMatch
			}
			const tagTextMatch = sameTags.find((el) => el.innerText.toLowerCase().includes(idPart))
			if (tagTextMatch) {
				console.log('[wiki] section resolver: tag syntax text match', {
					tag: upperTag,
					identifier: idPart,
				})
				return tagTextMatch
			}
			console.log('[wiki] section resolver: tag syntax falling back to first tag', {
				tag: upperTag,
			})
			return sameTags[0]
		}
	}

	// B. Markdown Header Match (#)
	if (raw.startsWith('#')) {
		const headerMatch =
			searchable.find(
				(el) =>
					/^H[1-6]$/.test(el.tagName) && (el.id.toLowerCase() === cleanId || el.innerText.toLowerCase().includes(cleanId)),
			) || null
		console.log('[wiki] section resolver: header syntax lookup', {
			target: raw,
			cleanId,
			matched: Boolean(headerMatch),
		})
		return headerMatch
	}

	// C. Markdown Inline Code (`)
	if (raw.startsWith('`')) {
		const codeMatch = searchable.find((el) => el.tagName === 'CODE' && el.innerText.toLowerCase().includes(cleanId)) || null
		console.log('[wiki] section resolver: code syntax lookup', {
			target: raw,
			cleanId,
			matched: Boolean(codeMatch),
		})
		return codeMatch
	}

	// D. Markdown List Item (-)
	if (raw.startsWith('-')) {
		const listMatch = searchable.find((el) => el.tagName === 'LI' && el.innerText.toLowerCase().includes(cleanId)) || null
		console.log('[wiki] section resolver: list syntax lookup', {
			target: raw,
			cleanId,
			matched: Boolean(listMatch),
		})
		return listMatch
	}

	// E. Markdown Emphasis (** or *)
	if (raw.startsWith('*')) {
		const isBold = raw.startsWith('**')
		const tag = isBold ? 'STRONG' : 'EM'
		const emphasisMatch = searchable.find((el) => el.tagName === tag && el.innerText.toLowerCase().includes(cleanId)) || null
		console.log('[wiki] section resolver: emphasis syntax lookup', {
			target: raw,
			cleanId,
			tag,
			matched: Boolean(emphasisMatch),
		})
		return emphasisMatch
	}

	// 1. Exact Match (The most specific text match)
	const exactMatch = searchable.find((el) => el.innerText?.trim().toLowerCase() === cleanId)
	if (exactMatch) {
		console.log('[wiki] section resolver: exact text match', {
			target: raw,
			cleanId,
			matchedTag: exactMatch.tagName,
			matchedId: exactMatch.id || null,
		})
		return exactMatch
	}

	// 2. Starts With (Better for matching "Binds" when searching "bind")
	const startsWithMatch = searchable.find((el) => el.innerText?.trim().toLowerCase().startsWith(cleanId))
	if (startsWithMatch) {
		console.log('[wiki] section resolver: starts-with text match', {
			target: raw,
			cleanId,
			matchedTag: startsWithMatch.tagName,
			matchedId: startsWithMatch.id || null,
		})
		return startsWithMatch
	}

	// 3. Includes (The broadest possible match)
	const includesMatch = searchable.find((el) => el.innerText?.toLowerCase().includes(cleanId)) || null
	console.log('[wiki] section resolver: includes fallback', {
		target: raw,
		cleanId,
		matched: Boolean(includesMatch),
	})
	return includesMatch
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
			let element = findWikiViewElement(link.replace('--', '-'))
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

	console.log('[wiki] gotoWiki request', {
		wikidir,
		path: [...wikiDir_path_immutable],
		section: wikiDir_section[0] || null,
	})
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
			console.error('[wiki] could not resolve navigation segment', {
				missingSegment: wikiDir_path[0],
				remainingPath: [...wikiDir_path],
				fullPath: [...wikiDir_path_immutable],
			})
		}
		wikiDir_path.shift()
	}
	// console.log(node)
	if (node) {
		console.log('[wiki] resolved node via tree traversal', {
			targetPath: [...wikiDir_path_immutable],
		})
		node.click()
	} else {
		let directory = wikidir
			.split(':')
			.filter((e) => !e.startsWith('#'))
			.at(-1)
		console.log('[wiki] tree traversal failed, trying flat lookup', {
			directory,
		})
		let directories = Array.from(wikiDirNavigationEl.querySelectorAll('.wiki-item'))
		let found = directories.find((e) => normalizeText(e.dataset.name) === normalizeText(directory))
		console.log('[wiki] flat lookup result', {
			directory,
			found: Boolean(found),
			candidateCount: directories.length,
		})
		if (found) {
			found.click()
		} else {
			console.error('[wiki] could not find wiki node in flat lookup', {
				directory,
				targetPath: [...wikiDir_path_immutable],
			})
		}
	}

	setTimeout(() => {
		if (wikiDir_section[0]) {
			console.log('[wiki] scrolling to section', {
				section: wikiDir_section[0],
			})
			let section = findWikiViewElement(wikiDir_section[0])
			if (!section) {
				console.log('[wiki] section not found', {
					section: wikiDir_section[0],
				})
				return
			}
			// console.log(section)
			section.scrollIntoView({ behavior: 'smooth', block: 'start' })
		} else {
			console.log('[wiki] no section provided, scrolling to top of wiki view')
			let wikiView_content = document.querySelector('#wikiView_content')
			wikiView_content.scrollTo(0, 0)
		}
	}, 100)
}

async function setViewElValue(value: string, position: string, title = '') {
	// console.log(value, title, position)
	const parsed = value
	function replaceImagesWithLocal(viewEl: HTMLElement) {
		let imageSources = [
			{ src: 'https://i.ibb.co/7rxTRrw/395854121-47ed1ae0-a660-46f3-9bf5-917da0d3f675.png', alt: 'ml4w.png' },
			{ src: 'https://i.ibb.co/7tMsnTv/default-waybar.png', alt: 'jakoolit.png' },
			{
				src: 'https://github.com/end-4/dots-hyprland/assets/97237370/5e081770-0f1e-45c4-ad9c-3d19f488cd85',
				alt: 'end4.png',
			},
			{ src: 'https://i.ibb.co/W3SYJCc/showcase-2-2412602747.png', alt: 'hyde.png' },
			{ src: 'https://i.ytimg.com/vi/Cft6mZDzIng/maxresdefault.jpg', alt: 'omarchy.jpg' },
		]
		viewEl.querySelectorAll('IMG').forEach((element: HTMLElement) => {
			let source = imageSources.find((i) => i.src === element.getAttribute('src'))
			if (source) {
				element.setAttribute('src', `assets/wiki/images/${source.alt}`)
			}
		})
	}

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
		replaceImagesWithLocal(viewEl)

		wrapAllElements('#wikiView table:not(.table-wrapper > table)', 'div.table-wrapper')
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

				const preToolbar = document.createElement('div')
				preToolbar.classList.add('pre-toolbar')
				element.after(preToolbar)
				const copyButton = document.createElement('button')
				copyButton.classList.add('copy-button')
				copyButton.innerText = ''
				preToolbar.appendChild(copyButton)

				copyButton.addEventListener('click', () => {
					const text = code.innerText
					navigator.clipboard.writeText(text)
				})
			})
		}

		/** Observe all table wrappers and add `.scrollable` if they overflow */
		const tableWrappers = viewEl.querySelectorAll<HTMLElement>('.table-wrapper')

		function updateScrollable(el: HTMLElement) {
			const isScrollable = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth
			el.classList.toggle('scrollable', isScrollable)
		}

		// Initialize for all current wrappers
		tableWrappers.forEach(updateScrollable)

		// Observe size changes
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				updateScrollable(entry.target as HTMLElement)
			}
		})

		// Start observing
		tableWrappers.forEach((el) => observer.observe(el))

		viewEl.scrollTo({ top: 0, behavior: 'smooth' })
	}
}

/**
 * Wrap all elements matching an Emmet-style selector in an Emmet-style wrapper
 * e.g., wrapAllElements('table', 'div.responsive-table')
 */
export function wrapAllElements(selector: string, wrapper: string) {
	const elements = Array.from(document.querySelectorAll(selector))
	// console.log('[wiki] wrapAllElements', elements)

	if (!elements.length) return

	// Parse wrapper Emmet: tag#id.class1.class2
	const emmetMatch = wrapper.match(/^([a-z]+)?(?:#([\w-]+))?(?:\.([\w-.]+))?$/i)
	if (!emmetMatch) throw new Error(`Invalid wrapper string: ${wrapper}`)

	const [, tag = 'div', id, classes] = emmetMatch

	elements.forEach((el) => {
		const wrapperEl = document.createElement(tag)
		if (id) wrapperEl.id = id
		if (classes) wrapperEl.className = classes.replace(/\./g, ' ')

		el.parentNode?.insertBefore(wrapperEl, el)
		wrapperEl.appendChild(el)
	})
}

function downloadTextFile(filename, content) {
	const blob = new Blob([content], { type: 'text/plain' })

	const a = document.createElement('a')
	a.href = URL.createObjectURL(blob)
	a.download = filename

	document.body.appendChild(a)
	a.click()

	document.body.removeChild(a)
	URL.revokeObjectURL(a.href)
}
