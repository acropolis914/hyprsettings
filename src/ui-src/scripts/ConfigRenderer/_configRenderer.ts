// import { hideAllContextMenus, waitFor } from './utils.js'
// import { waitFor } from '../utils/helpers'
import { EditorItem_Generic } from './EditorItem_Generic.ts'
import { EditorItem_Comments } from './EditorItem_Comments.js'
// import { EditorItem_Binds } from './EditorItem_Binds.ts'
import { tabids, keyNameStarts, configGroups } from '@scripts/HyprlandSpecific/configMap.js'
import { ConfigGroup } from './ConfigGroup.ts'
import { GLOBAL } from '../GLOBAL.js'
import { Backend } from '@scripts/utils/backendAPI.js'
import { destroyOverlay } from '@scripts/ui_components/darkenOverlay.js'
import { focusTab } from '@scripts/ui_components/createTabView.ts'
import type { ItemProps, ItemPropsFile, ItemPropsMisc } from '@scripts/types/editorItemTypes.ts'

export default async function getAndRenderConfig() {
	GLOBAL.onChange('data', (value?: object): Promise<void> => {
		if (typeof value === 'object') {
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

	async parse(json: ItemProps) {
		const self = this

		function renderCommentStack() {
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

		function renderCommentQueue(all: boolean = false) {
			let limit = all ? self.comment_queue.length : self.comment_queue.length - 1
			let itemsToProcess = self.comment_queue.splice(0, limit)
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

		/**
		 * CommentBlock rendering
		 */
		if (
			// is a comment that looks like the start of a comment block
			json['type'] === 'COMMENT' &&
			(json['comment'].startsWith('####') || json['comment'].startsWith('# =====')) &&
			(this.comment_stack.length === 0 || this.comment_stack.length === 2)
		) {
			this.comment_stack.push(json)
			if (this.comment_stack.length > 2) {
				renderCommentStack()
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
			if (this.comment_queue.length > 1) {
				renderCommentQueue()
			}
		} else if (json['type'] === 'BLANK') {
			// if (this.comment_queue.length > 0) {
			// 	renderCommentQueue()
			// }
			// let blankLine = document.createElement('div')
			// blankLine.classList.add('blank-line', 'editor-item')
			// blankLine.style.height = 0
			// blankLine.style.overflow = 'hidden'
			// blankLine.dataset.uuid = json['uuid']
			// blankLine.tabIndex = 0
			// blankLine.textContent = 'THIS IS A BLANK LINE'
			// this.container_stack.at(-1).appendChild(blankLine)
			// /fugly
		} else if (json['type'] === 'GROUP') {
			if (
				(json['position'] && json['position'].indexOf(':') > -1) ||
				(json['name'] === 'root' && json['children'][0].type !== 'FILE')
			) {
				renderCommentStack()
				renderCommentQueue(true)
				let group_el = new ConfigGroup(json).return()
				let matched: boolean
				if (!this.renderTo) {
					for (const [key, value] of configGroups) {
						if (json['name'].trim().startsWith(key)) {
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
						if (index === json['children'].length - 1) {
							//Todo hmmm should this be -1?
							renderCommentQueue(true)
						}
						await this.parse(child)
					}
				} catch (e) {
					console.error(e, json)
				}
			}
		} else if (json['position'] && json['type'] === 'GROUPEND' && json['position'].indexOf(':') > -1) {
			if (this.comment_queue.length > 0) {
				renderCommentQueue(false)
			}
			this.container_stack.pop()
		} else if (json['type'] === 'KEY') {
			try {
				let genericItem: EditorItem_Generic = new EditorItem_Generic(json, json['disabled'])
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
				if (this.comment_queue.length > 0) {
					renderCommentQueue(true)
				}
				let parentStack = tabToAddTo
				let elementToAdd = genericItem.el
				if (parentStack?.classList?.contains('config-group')) {
					parentStack.appendConfigItems(elementToAdd)
				} else {
					parentStack.appendChild(elementToAdd)
				}
			} catch (e) {
				console.log(e, json)
			}
		} else if (json['type'] === 'FILE') {
			GLOBAL.files[json['resolved_path']] = json as ItemPropsFile
			renderCommentQueue()
			renderCommentStack()
			try {
				if (json && json['children']) {
					for (const child of json['children']) {
						if (child && typeof child.name === 'string') {
							if (child.name.startsWith('$')) {
								const key = json['resolved_path']

								// Make sure GLOBAL.configGlobals exists
								if (!GLOBAL.configGlobals || typeof GLOBAL.configGlobals !== 'object') {
									GLOBAL.configGlobals = {}
									//	console.log(GLOBAL.configGlobals)
								}

								// Ensure the object for this key exists
								if (!GLOBAL.configGlobals[key] || typeof GLOBAL.configGlobals[key] !== 'object') {
									GLOBAL.configGlobals[key] = {}
									//	console.log(GLOBAL.configGlobals)
								}

								// Only add child.value if it’s defined
								if (child['value'] !== undefined) {
									GLOBAL.configGlobals[key] = {
										...(GLOBAL.configGlobals[key] || {}), // default to empty object
										[child.name]: child['value'],
									}

									//	console.log(GLOBAL.configGlobals)
								} else {
									console.warn(`Child ${child.name} has undefined value, skipping`)
								}
							}
						} else {
							console.warn('Invalid child object:', child)
						}

						await this.parse(child)
					}
				}
				if (this.comment_queue.length > 0) {
					renderCommentQueue(true)
				}
				if (this.comment_stack.length > 0) {
					renderCommentStack()
				}
			} catch (e) {
				console.warn(e, json)
			}
		} else {
			console.log('Failed to render an item: ', json, 'Skipping')
		}

		if (json['children'] && json['name'] === 'root') {
			for (const child of json['children']) {
				await this.parse(child)
			}

			if (this.comment_queue.length > 0) {
				renderCommentQueue()
			}
			if (this.comment_stack.length > 0) {
				renderCommentStack()
			}
		}
	}
}
