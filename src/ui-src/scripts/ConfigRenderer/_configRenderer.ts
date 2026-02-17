// import { hideAllContextMenus, waitFor } from './utils.js'
import { EditorItem_Generic } from './EditorItem_Generic.ts'
import { EditorItem_Comments } from './EditorItem_Comments.js'
import { EditorItem_Binds } from './EditorItem_Binds.ts'
import { tabids, keyNameStarts, configGroups } from '@scripts/HyprlandSpecific/configMap.js'
import { ConfigGroup } from './ConfigGroup.ts'
import { GLOBAL } from '../GLOBAL.js'
import { Backend } from '@scripts/utils/backendAPI.js'
import { destroyOverlay } from '@scripts/ui_components/darkenOverlay.js'
import { waitFor } from '../utils/helpers'

export default async function getAndRenderConfig() {
	GLOBAL.onChange('data', (value: any) => {
		if (typeof value === 'object') {
			new _configRenderer(GLOBAL.data)
		}
	})
	await Backend.getHyprlandConfig()
	setTimeout(async () => {
		await Backend.getHyprlandConfigTexts()
	}, 2000)
	// }
}

export function clearConfigItems() {
	document.querySelectorAll('.config-set').forEach((element) => {
		if (['settings', 'debug', 'wiki'].includes(element.id)) {
			return
		} else {
			Array.from(element.children).forEach((child) => {
				child.remove()
			})
		}
	})
}

export class _configRenderer {
	private readonly json: Record<string, any>
	current_container: any[]
	comment_stack: any[]
	comment_queue: any[]
	group_stack: any[]
	temporaryElement: HTMLDivElement
	renderTo: HTMLElement
	renderAfter: boolean

	constructor(json: Record<string, any>, renderTo: HTMLElement = null, renderAfter: boolean = true) {
		this.renderTo = renderTo
		this.renderAfter = renderAfter
		this.json = json
		this.current_container = []
		if (renderTo) {
			this.temporaryElement = document.createElement('div')
			this.temporaryElement.style.display = 'none'
			document.body.appendChild(this.temporaryElement)
			this.current_container.push(this.temporaryElement)
		} else {
			this.current_container.push(document.querySelector('.config-set#general'))
		}

		this.comment_stack = [] //for the block comments
		this.comment_queue = []
		this.group_stack = []

		GLOBAL.configGlobals = []
		if (!renderTo) {
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
		destroyOverlay()

		while (this.renderTo && this.temporaryElement.firstChild) {
			let el = this.temporaryElement.firstElementChild as HTMLDivElement
			if (this.renderAfter) {
				this.renderTo.after(el)
			} else {
				this.renderTo.before(el)
			}
			el.tabIndex = 0
			el.focus()
			el.scrollIntoView({ behavior: 'smooth', block: 'center' })
		}

		document.querySelector('.config-set').addEventListener('click', (e) => {
			// let target = e.target
			GLOBAL.setKey('currentView', 'main')
			// @ts-ignore
			// GLOBAL['mainFocus'][GLOBAL['activeTab']] = element.dataset.uuid
		})
	}

	async parse(json: string | Record<string, any> | JSON) {
		//Comment Stacking for three line label comments from default hyprland.conf
		const self = this

		function renderCommentStack() {
			for (let i = 0; i < self.comment_stack.length; i++) {
				let comment_element = new EditorItem_Comments(self.comment_stack[i])
				comment_element.el.classList.add('block-comment')
				if (!GLOBAL['config']['show_header_comments']) {
					comment_element.el.classList.add('settings-hidden')
				}
				comment_element.addToParent(self.current_container.at(-1))
			}
			self.comment_stack = []
		}

		function renderCommentQueue(all: boolean = false) {
			let left = all ? 0 : 1
			while (self.comment_queue.length > 1) {
				let comment_item: JSON = self.comment_queue[0]
				let comment_item_el = new EditorItem_Comments(comment_item, false)
				if (!GLOBAL['config']['show_line_comments']) {
					comment_item_el.el.classList.add('settings-hidden')
				}
				comment_item_el.addToParent(self.current_container.at(-1))
				self.comment_queue.shift()
			}
		}

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
					// console.info(`Comment ${comment} includes [${key}]`)
					let container = document.querySelector(`.config-set#${value}`)
					if (container) {
						this.current_container.pop()
						this.current_container.push(container)
					}
					break
				}
			}
		} // end of comment stacks

		//inline comments
		else if (json['type'] === 'COMMENT' && this.comment_stack.length === 0) {
			// console.debug({json})
			this.comment_queue.push(json)
			if (this.comment_queue.length > 1) {
				renderCommentQueue()
			}
		} else if (json['type'] === 'BLANK') {
			if (this.comment_queue.length > 0) {
				renderCommentQueue()
			}
			// let blankline = document.createElement('div')
			// blankline.classList.add('blank-line', 'editor-item')
			// blankline.dataset.uuid = json['uuid']
			// blankline.tabIndex = 0
			// blankline.textContent = 'THIS IS A BLANK LINE'
			// this.current_container.at(-1).appendChild(blankline)
			///fugly
		} else if (json['type'] === 'GROUP') {
			if (json['position'] && json['position'].split(':').length > 1) {
				if (this.comment_stack.length > 0) {
					renderCommentStack()
				}
				//
				if (this.comment_queue.length > 0) {
					renderCommentQueue(false)
				}
				let group_el = new ConfigGroup(json).return()
				let matched: boolean
				if (!this.renderTo) {
					for (const [key, value] of configGroups) {
						if (json.name.trim().startsWith(key)) {
							document.querySelector(`.config-set#${value}`).appendChild(group_el)
							matched = true
							break
						}
					}
				}

				if (!matched) {
					this.current_container.at(-1).appendChild(group_el)
				}
				this.current_container.push(group_el)
				try {
					Array.from(json['children']).forEach((child, index, arr) => {
						if (index === arr.length - 1) {
							renderCommentQueue(true)
						}
						this.parse(child)
					})
					// for (const child of json['children']) {
					// 	this.parse(child)
					// }
				} catch (e) {
					console.error(e, json)
				}
			}
		} else if (json['position'] && json['type'] === 'GROUPEND' && json['position'].split(':').length > 1) {
			if (this.comment_queue.length > 0) {
				renderCommentQueue(false)
			}
			this.current_container.pop()
		} else if (json['type'] === 'KEY') {
			try {
				let genericItem: EditorItem_Binds | EditorItem_Generic
				if (json['name'].startsWith('bind')) {
					genericItem = new EditorItem_Binds(json, json['disabled'])
				} else {
					genericItem = new EditorItem_Generic(json, json['disabled'])
				}
				let tabToAddTo: any
				for (const [key, value, exclude] of keyNameStarts) {
					if (this.current_container.at(-1).classList.contains('config-group')) {
						break
					}
					let excluded = exclude ? exclude : []
					if (json.name.trim().startsWith(key) && !excluded.includes(json.name.trim())) {
						tabToAddTo = document.querySelector(`.config-set#${value}`)
						break
					}
				}
				if (!tabToAddTo) {
					tabToAddTo = this.current_container.at(-1)
				} else {
					this.current_container.pop()
					this.current_container.push(tabToAddTo)
				}
				if (this.comment_queue.length > 0) {
					renderCommentQueue()
				}
				// genericItem.el.addEventListener('focus', () => {
				// 	GLOBAL['mainFocus'][GLOBAL['activeTab']] = genericItem.el.dataset.uuid
				// 	GLOBAL.setKey('currentView', 'main')
				// })
				// genericItem.el.addEventListener('click', () => {
				// 	GLOBAL['mainFocus'][GLOBAL['activeTab']] = genericItem.el.dataset.uuid
				// 	GLOBAL.setKey('currentView', 'main')
				// })
				genericItem.addToParent(tabToAddTo)
			} catch (e) {
				console.log(e, json)
			}
		} else if (json['type'] === 'FILE') {
			renderCommentQueue()
			renderCommentStack()
			try {
				if (this.comment_queue.length > 0) {
					renderCommentQueue(true)
				}
				if (this.comment_stack.length > 0) {
					renderCommentStack()
				}
				if (json.children) {
					for (const child of json.children) {
						this.parse(child)
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
			// console.log()
		} else {
			console.log('Failed to render an item: ', json, 'Skipping')
		}

		//recursive children rendering
		if (json['children'] && json['name'] === 'root') {
			// console.log(json)
			for (const child of json.children) {
				this.parse(child)
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
