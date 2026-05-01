// import { hideAllContextMenus, waitFor } from './utils.js'
// import { waitFor } from '../utils/helpers'
import { EditorItem_Generic } from './EditorItem_Generic.ts'
import { EditorItem_Comments } from './EditorItem_Comments.js'
// import { EditorItem_Binds } from './EditorItem_Binds.ts'
import { tabids, keyNameStarts, getConfigGroups } from '@scripts/HyprlandSpecific/configMap.js'
import { ConfigGroup } from './ConfigGroup.ts'
import { GLOBAL } from '../GLOBAL.js'
import { Backend } from '@scripts/utils/backendAPI.js'
import { destroyOverlay } from '@scripts/ui_components/darkenOverlay.js'
import { focusTab } from '@scripts/ui_components/createTabView.ts'
import type { ItemProps, ItemPropsFile, ItemPropsGroup, ItemPropsKey, ItemPropsMisc } from '@scripts/types/editorItemTypes.ts'
let configGroups
export default async function getAndRenderConfig() {
	GLOBAL.onChange('data', async (value?: object): Promise<void> => {
		if (typeof value === 'object') {
			if (GLOBAL.data['mode']) {
				GLOBAL.mode = GLOBAL.data['mode']
				const header = document.querySelector('body>header#main-header>#header-title>span#mode')
				if (GLOBAL.data['mode'] === 'hyprland') {
					header.textContent = 'Hypr'
				} else if (GLOBAL.data['mode'] === 'niri') {
					header.textContent = 'Niri'
				} else if (GLOBAL.data['mode'] === 'mango') {
					header.textContent = 'Mango'
				}
			} else {
				GLOBAL.mode = 'hyprland'
				GLOBAL.data.mode = 'hyprland'
			}
			configGroups = getConfigGroups()
			new _configRenderer(GLOBAL.data)
		}
		return
	})
	await Backend.getHyprlandConfig()
	setTimeout(async () => {
		Backend.getHyprlandConfigTexts().then()
	}, 2000)
}

export function clearConfigItems() {
	document.querySelectorAll('.config-set').forEach((element) => {
		if (['settings', 'debug', 'wiki'].includes(element.id)) {
			return
		}
		Array.from(element.children).forEach((child) => {
			child.remove()
		})
	})
}

export class _configRenderer {
	private readonly json: ItemProps
	container_stack: (DocumentFragment | HTMLDivElement)[]
	comment_stack: ItemPropsMisc[]
	comment_queue: ItemPropsMisc[]
	temporaryElement: HTMLDivElement
	renderTo: HTMLElement
	renderAfter: boolean
	renderInside: boolean

	constructor(json: ItemProps, renderTo: HTMLElement = null, renderAfter: boolean = true, renderInside: boolean = false) {
		this.renderTo = renderTo
		this.renderAfter = renderAfter
		this.renderInside = renderInside
		this.json = json
		this.container_stack = []
		if (renderTo || renderInside) {
			this.temporaryElement = document.createElement('div')
			this.temporaryElement.style.display = 'none'
			this.temporaryElement.id = 'temporary'
			document.body.appendChild(this.temporaryElement)
			this.container_stack.push(this.temporaryElement)
		} else {
			this.container_stack.push(GLOBAL.editorItemTemporaryContainers['general'])
		}

		this.comment_stack = []
		this.comment_queue = []

		if (!renderTo) {
			GLOBAL.configGlobals = {}
			clearConfigItems()
		}
		this.invokeParser().then(() => {
			console.log('Done rendering configs')
		})
	}

	async invokeParser() {
		console.time('parseJSON')
		await this.parse(this.json)
		console.timeEnd('parseJSON')

		console.time('appendNodes')
		for (const [key, val] of Object.entries(GLOBAL.editorItemTemporaryContainers)) {
			requestAnimationFrame(() => {
				let set = document.querySelector(`.config-set#${key}`)
				if (set && val) {
					set.appendChild(val)
				} else {
					console.log(`Encountered rendering issue for:${{ set, key, val }}`)
				}
			})
		}
		console.timeEnd('appendNodes')

		if (this.renderTo && this.temporaryElement) {
			let el = this.temporaryElement.firstElementChild as HTMLDivElement
			if (this.renderAfter && !this.renderInside) {
				this.renderTo.after(el)
			} else if (!this.renderAfter && !this.renderInside) {
				this.renderTo.before(el)
			} else if (!this.renderAfter && this.renderInside) {
				this.renderTo.appendChild(el as Node)
			}
			el.tabIndex = 0

			let configSet = el.closest('.config-set')
			if (GLOBAL.activeTab === configSet.id) {
			} else {
				await focusTab(configSet.id)
			}
			el.scrollIntoView({ behavior: 'smooth', block: 'center' })
			el.focus()
		}

		document.querySelectorAll('.config-set').forEach((el) => {
			if (el.id === 'wiki') {
				return
			}
			el.addEventListener('click', (e) => {
				// let target = e.target
				GLOBAL.setKey('currentView', 'main')
				// @ts-ignore
				// GLOBAL['mainFocus'][GLOBAL['activeTab']] = element.dataset.uuid
			})
		})
		destroyOverlay().then()
	}

	renderCommentStack(resolver: string = 'UNKNOWN') {
		const self = this
		// Only log when there are comments to render
		if (self.comment_stack.length > 0) {
			try {
				// clone the stack so console.log doesn't show a later-empty array
				const cloned = JSON.parse(JSON.stringify(self.comment_stack))
				console.log({ resolver, type: 'comment_stack', comments: cloned })
			} catch (e) {
				console.log('Failed to log comment_stack for', resolver)
			}
		}
		for (let i = 0; i < self.comment_stack.length; i++) {
			let comment_element = new EditorItem_Comments(self.comment_stack[i] as ItemPropsMisc)
			comment_element.el.classList.add('block-comment')
			if (!GLOBAL['config']['show_header_comments']) {
				comment_element.el.classList.add('settings-hidden')
			}
			const parentStack = self.container_stack?.at(-1)
			const elementToAdd: HTMLDivElement = comment_element.el
			if (parentStack?.classList?.contains('config-group')) {
				parentStack.appendConfigItems(elementToAdd)
			} else {
				parentStack.appendChild(elementToAdd)
			}
		}
		self.comment_stack = []
	}

	renderCommentQueue(all: boolean = false, resolver: string = 'UNKNOWN') {
		const self = this
		// Only log queued comments when there are any
		if (self.comment_queue.length > 0) {
			try {
				// clone queued comments for stable logging (avoid live mutation effects)
				const clonedQueue = JSON.parse(JSON.stringify(self.comment_queue))
				console.log({ resolver, type: 'comment_queue', queued: clonedQueue })
			} catch (e) {
				console.log('Failed to log comment_queue for', resolver)
			}
		}
		let limit = all ? self.comment_queue.length : self.comment_queue.length - 1
		let itemsToProcess = self.comment_queue.splice(0, limit)
		// if (itemsToProcess.length > 0) {
		// 	try {
		// 		const clonedItems = JSON.parse(JSON.stringify(itemsToProcess))
		// 		console.log({ resolver, type: 'comment_queue_process', items: clonedItems })
		// 	} catch (e) {
		// 		console.log('Failed to log itemsToProcess for', resolver)
		// 	}
		// }
		for (let comment_item of itemsToProcess) {
			let comment_item_el = new EditorItem_Comments(comment_item, false)
			if (!GLOBAL['config']['show_line_comments']) {
				comment_item_el.el.classList.add('settings-hidden')
			}
			let parentStack = self.container_stack.at(-1)
			let elementToAdd = comment_item_el.el
			if (parentStack?.classList?.contains('config-group')) {
				parentStack.appendConfigItems(elementToAdd)
			} else {
				parentStack.appendChild(elementToAdd)
			}
		}
	}

	async parse(json: ItemProps) {
		const self = this
		//recursive children rendering
		if (json['children'] && json['name'] === 'root') {
			// console.log(json)
			for (const child of json['children']) {
				await this.parse(child)
				this.renderCommentQueue(true, 'ROOT')
				this.renderCommentStack('ROOT')
			}
		} else if (json['type'] === 'FILE') {
			GLOBAL.files[json['resolved_path']] = json as ItemPropsFile
			try {
				if (json['children']) {
					for (const child of json['children']) {
						await this.parse(child)
						if (child && typeof child.name === 'string' && child.name.startsWith('$')) {
							const key = json['resolved_path']
							if (!GLOBAL.configGlobals || typeof GLOBAL.configGlobals !== 'object') {
								GLOBAL.configGlobals = {}
							}

							if (!GLOBAL.configGlobals[key] || typeof GLOBAL.configGlobals[key] !== 'object') {
								GLOBAL.configGlobals[key] = {}
							}

							if (child['value'] !== undefined) {
								GLOBAL.configGlobals[key] = {
									...(GLOBAL.configGlobals[key] || {}), // default to empty object
									[child.name]: child['value'],
								}
							} else {
								console.warn('Invalid child object:', child)
							}
						}
					}
				}
			} catch (e) {
				console.warn(e, json)
			}
			// this.renderCommentQueue(true)
			// this.renderCommentStack()
		} else if (
			// is a comment that looks like the start of a comment block
			json['type'] === 'COMMENT' &&
			(json['comment']?.startsWith('####') || json['comment']?.startsWith('# =====')) &&
			(this.comment_stack.length === 0 || this.comment_stack.length === 2)
		) {
			this.comment_stack.push(json)
			if (this.comment_stack.length > 2) {
				this.renderCommentStack('HEADER')
			}
		} else if (
			//if there is a comment block start and there is another comment
			json['type'] === 'COMMENT' &&
			this.comment_stack.length > 0
		) {
			this.comment_stack.push(json)
			let comment = json['comment']
				.trim()
				.replace(/^#+|#+$/g, '')
				.trim()

			for (const [key, value] of tabids) {
				if (comment.toLowerCase().includes(key)) {
					const container = GLOBAL.editorItemTemporaryContainers[value]
					if (container) {
						this.container_stack.pop()
						this.container_stack.push(container)
					}
					break
				}
			}
		} // end of comment stacks

		//inline comments
		else if (json['type'] === 'COMMENT' && this.comment_stack.length === 0) {
			this.comment_queue.push(json)
			// this.renderCommentQueue()
		} else if (json['type'] === 'BLANK') {
			// if (this.comment_queue.length > 0) {
			// 	renderCommentQueue()
			// }
			// let blankline = document.createElement('div')
			// blankline.classList.add('blank-line', 'editor-item')
			// blankline.dataset.uuid = json['uuid']
			// blankline.tabIndex = 0
			// blankline.textContent = 'THIS IS A BLANK LINE'
			// this.container_stack.at(-1).appendChild(blankline)
			// //fugly
		} else if (json['type'].startsWith('GROUP') && json['type'] !== 'GROUPEND' && json['name'] != 'root') {
			// console.log(json)
			this.renderCommentStack('GROUP')
			this.renderCommentQueue(true, 'GROUP')
			let group_el = new ConfigGroup(json as ItemPropsGroup).return()
			let matched: boolean
			if (!this.renderTo) {
				for (const [key, value] of configGroups) {
					if (json['name'].trim().startsWith(key) && !this.container_stack.at(-1).classList?.contains('config-group')) {
						const container = GLOBAL.editorItemTemporaryContainers[value]
						if (container) {
							container.appendChild(group_el)
						} else {
							console.warn(`No container for value: ${value}`, GLOBAL.editorItemTemporaryContainers)
						}
						matched = true
						break
					}
				}
			}

			if (!matched) {
				let parentStack = self.container_stack.at(-1)
				let elementToAdd = group_el
				if (parentStack?.classList?.contains('config-group')) {
					parentStack.appendConfigItems(elementToAdd)
				} else {
					parentStack.appendChild(elementToAdd)
				}
			}
			this.container_stack.push(group_el)

			try {
				for (const [index, child] of Array.from(json['children']).entries()) {
					await this.parse(child as ItemProps)
					if (child['type'] === 'GROUPEND' && child['comment']) {
						let lastOfStack = this.container_stack.at(-1) as HTMLDivElement
						// lastOfStack.style.backgroundColor = 'red' //TODO add a groupend comment
					}
				}
				this.renderCommentQueue(true, 'GROUP-END')
				this.container_stack.pop()
			} catch (e) {
				console.error(e, json)
			}
			// } else if (json['position'] && json['type'] === 'GROUPEND' && json['position'].indexOf(':') > -1) {
			// 	if (this.comment_queue.length > 0) {
			// 		renderCommentQueue(false)
			// 	}
			// 	this.container_stack.pop()
		} else if (json['type'] === 'KEY') {
			try {
				let genericItem: EditorItem_Generic = new EditorItem_Generic(json as ItemPropsKey, json['disabled'])
				let tabToAddTo: any
				const foundPair = keyNameStarts.find(([key, value, exclude]) => {
					if (this.container_stack.at(-1)?.classList?.contains('config-group')) {
						return false
					}
					let excluded = exclude ? exclude : []
					return json['name'].trim().startsWith(key as string) && !excluded.includes(json['name'].trim())
				})

				if (foundPair) {
					const [, value] = foundPair
					tabToAddTo = GLOBAL.editorItemTemporaryContainers[String(value)]
				}

				if (!tabToAddTo) {
					tabToAddTo = this.container_stack.at(-1)
				} else {
					this.container_stack.pop()
					this.container_stack.push(tabToAddTo)
				}
				// flush any header/block comments and queued inline comments before rendering the key
				this.renderCommentStack('KEY')
				this.renderCommentQueue(true, 'KEY')
				let parentStack = tabToAddTo //huh?
				let elementToAdd = genericItem.el
				if (parentStack?.classList?.contains('config-group')) {
					parentStack.appendConfigItems(elementToAdd)
				} else {
					parentStack.appendChild(elementToAdd)
				}
			} catch (e) {
				console.log(e, json)
			}
		} else if (json['type'] === 'GROUPEND') {
		} else {
			console.log('Failed to render an item: ', json, 'Skipping')
		}
	}
}
