// import { hideAllContextMenus, waitFor } from './utils.js'
import { EditorItem_Generic } from './hyprland-components/EditorItem_Generic.ts'
import { EditorItem_Comments } from './hyprland-components/EditorItem_Comments.js'
import { EditorItem_Binds } from './hyprland-components/EditorItem_Binds.ts'
import {
	tabids,
	keyNameStarts,
	configGroups,
} from './hyprland-specific/configMap.js'
import { ConfigGroup } from './hyprland-components/ConfigGroup.ts'
import { GLOBAL } from './GLOBAL.js'
import { Backend } from '@scripts/backendAPI.js'
import { destroyOverlay } from '@scripts/ui_components/darken_overlay.js'

export default async function getAndRenderConfig() {
	GLOBAL.onChange('data', () => {
		new ConfigRenderer(GLOBAL.data)
	})
	await Backend.getHyprlandConfig()
	await Backend.getHyprlandConfigTexts()
}

function clearConfigItems() {
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

export class ConfigRenderer {
	private readonly json: Record<string, any>
	current_container: any[]
	comment_stack: any[]
	comment_queue: any[]
	group_stack: any[]
	temporaryElement: HTMLDivElement
	renderTo: HTMLElement
	renderAfter: boolean
	constructor(
		json: Record<string, any>,
		renderTo: HTMLElement = null,
		renderAfter: boolean = true,
	) {
		this.renderTo = renderTo
		this.renderAfter = renderAfter
		this.json = json
		this.current_container = []
		if (renderTo) {
			console.log('renderTo', renderTo)
			this.temporaryElement = document.createElement('div')
			this.temporaryElement.style.display = 'none'
			document.body.appendChild(this.temporaryElement)
			this.current_container.push(this.temporaryElement)
		} else {
			this.current_container.push(
				document.querySelector('.config-set#general'),
			)
		}

		this.comment_stack = [] //for the block comments
		this.comment_queue = []
		this.group_stack = []
		if (!renderTo) {
			clearConfigItems()
		}
		this.invokeParser()
		document
			.querySelectorAll<HTMLElement>('.editor-item')
			.forEach((element) => {
				element.addEventListener('click', (e) => {
					// let target = e.target
					GLOBAL.setKey('currentView', 'main')
					// @ts-ignore
					GLOBAL['mainFocus'][GLOBAL['activeTab']] =
						element.dataset.uuid
				})
			})
	}
	async invokeParser() {
		await this.parse(this.json)
		console.log('done parsing')
		console.log(this.temporaryElement)
		while (this.renderTo && this.temporaryElement.firstChild) {
			console.log('temp.firstChild', this.temporaryElement.firstChild)
			if (this.renderAfter) {
				this.renderTo.after(this.temporaryElement.firstChild)
			} else {
				this.renderTo.before(this.temporaryElement.firstChild)
			}
		}
	}

	async parse(json: string | Record<string, any> | JSON) {
		//Comment Stacking for three line label comments from default hyprland.conf
		const self = this
		function renderCommentStack() {
			for (let i = 0; i < self.comment_stack.length; i++) {
				let comment_item = new EditorItem_Comments(
					self.comment_stack[i],
				)
				comment_item.el.classList.add('block-comment')
				if (!GLOBAL['config']['show_header_comments']) {
					comment_item.el.classList.add('settings-hidden')
				}
				comment_item.addToParent(self.current_container.at(-1))
			}
			self.comment_stack = []
		}
		if (
			// is a comment that looks like the start of a comment block
			json['type'] === 'COMMENT' &&
			(json['comment'].startsWith('####') ||
				json['comment'].startsWith('# ====')) &&
			(this.comment_stack.length === 0 ||
				this.comment_stack.length === 2)
		) {
			// console.debug({json})
			this.comment_stack.push(json)
			// @ts-ignore
			if (this.comment_stack.length === 3) {
				renderCommentStack()
			}
		} else if (
			//if there is a comment block start and there is another comment
			json['type'] === 'COMMENT' &&
			// json['comment'].includes('### ') &&
			this.comment_stack.length > 0
		) {
			// console.log(json['comment'])
			this.comment_stack.push(json)
			let comment = json['comment']
				.trim()
				.replace(/^#+|#+$/g, '')
				.trim()

			for (const [key, value] of tabids) {
				if (comment.toLowerCase().includes(key)) {
					this.current_container.pop()
					this.current_container.push(
						document.querySelector(`.config-set#${value}`),
					)
					if (!document.querySelector(`.config-set#${value}`)) {
						await waitFor(() =>
							this.current_container.push(
								document.querySelector(
									`.config-set#${value}`,
								),
							),
						)
						break
					}
				}
			}
		} // end of comment stacks

		//inline comments
		else if (
			json['type'] === 'COMMENT' &&
			this.comment_stack.length === 0
		) {
			// console.debug({json})
			if (this.comment_stack.length > 0) {
				//catch for when there is a comment stack that didnt end
				renderCommentStack()
			}
			let comment_item = new EditorItem_Comments(json, false)
			if (!GLOBAL['config']['show_line_comments']) {
				comment_item.el.classList.add('settings-hidden')
			}
			this.comment_queue.push(comment_item)
			if (this.comment_queue.length > 1) {
				for (let i = 0; i < this.comment_queue.length - 1; i++) {
					comment_item = this.comment_queue[0]
					comment_item.addToParent(this.current_container.at(-1))
					this.comment_queue.splice(0, 1)
				}
			}
		} else if (json['type'] === 'BLANK') {
			if (this.comment_queue.length > 0) {
				for (let i = 0; i < this.comment_queue.length; i++) {
					let comment_item = this.comment_queue[0]
					comment_item.addToParent(this.current_container.at(-1))
					this.comment_queue.splice(0, 1)
				}
			}
			// let blankline = document.createElement("div")
			// blankline.classList.add("blank-line")
			// blankline.textContent = "THIS IS A BLANK LINE"
			// this.current_container.at(-1).appendChild(blankline)
			/////fugly
		} else if (json['type'] === 'GROUP') {
			if (json['position'] && json['position'].split(':').length > 1) {
				if (this.comment_queue.length > 0) {
					for (let i = 0; i < this.comment_queue.length; i++) {
						let comment_item = this.comment_queue[0]
						comment_item.addToParent(
							this.current_container.at(-1),
						)
						this.comment_queue.splice(0, 1)
					}
				}
				//
				let group_el = new ConfigGroup(json).return()

				// if (this.comment_queue.length > 0) {
				// 	for (let i = 0; i < this.comment_queue.length; i++) {
				// 		let comment_item = this.comment_queue[0]
				// 		comment_item.addToParent(this.current_container.at(-1))
				// 		this.comment_queue.splice(0, 1)
				// 	}
				// }
				let matched
				if (!this.renderTo) {
					for (const [key, value] of configGroups) {
						if (json.name.trim().startsWith(key)) {
							document
								.querySelector(`.config-set#${value}`)
								.appendChild(group_el)
							matched = true
							break
						}
					}
				}

				if (!matched) {
					this.current_container.at(-1).appendChild(group_el)
				}
				this.current_container.push(group_el)
			}
		} else if (
			json['position'] &&
			json['type'] === 'GROUPEND' &&
			json['position'].split(':').length > 1
		) {
			this.current_container.pop()
		} else if (json['type'] === 'KEY') {
			try {
				let genericItem
				if (json['name'].startsWith('bind')) {
					genericItem = new EditorItem_Binds(
						json,
						json['disabled'],
					)
				} else {
					genericItem = new EditorItem_Generic(
						json,
						json['disabled'],
					)
				}

				let tabToAddTo
				for (const [key, value, exclude] of keyNameStarts) {
					if (
						this.current_container
							.at(-1)
							.classList.contains('config-group')
					) {
						break
					}
					let excluded = exclude ? exclude : []
					if (
						json.name.trim().startsWith(key) &&
						!excluded.includes(json.name.trim())
					) {
						tabToAddTo = document.querySelector(
							`.config-set#${value}`,
						)
						if (json.name.startsWith('bind')) {
							// console.log()
						}
						break
					}
				}
				if (!tabToAddTo) {
					tabToAddTo = this.current_container.at(-1)
				}
				if (this.comment_queue.length > 0) {
					this.comment_queue.forEach((commentEl) => {
						commentEl.addToParent(tabToAddTo)
						this.comment_queue.pop()
					})
				}
				genericItem.el.addEventListener('focus', () => {
					GLOBAL['mainFocus'][GLOBAL['activeTab']] =
						genericItem.el.dataset.uuid
					GLOBAL.setKey('currentView', 'main')
				})
				genericItem.el.addEventListener('click', () => {
					GLOBAL['mainFocus'][GLOBAL['activeTab']] =
						genericItem.el.dataset.uuid
					GLOBAL.setKey('currentView', 'main')
				})
				genericItem.addToParent(tabToAddTo)
			} catch (e) {
				console.log(e, json)
			}
		}

		//recursive children rendering
		if (json['children']) {
			for (const child of json.children) {
				await this.parse(child)
			}
		}
		setTimeout(() => destroyOverlay(), 1)
	}
}
