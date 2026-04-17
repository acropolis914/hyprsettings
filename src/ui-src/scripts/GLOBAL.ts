import type { ItemPropsFile } from '@scripts/types/editorItemTypes.ts'

type ViewType = 'tabs' | 'main' | 'search' | 'dmenu' | 'overlay' | 'colorSelect' | 'editorItem' | 'wikiNavigation' | 'wikiContent'
// type ConfigGlobal = {
// 	file: string
// 	name: string
// 	value: string | number | any
// 	uuid: string
// }

export class GLOBAL {
	// Map of key → array of callbacks
	static _listeners: Map<string, (() => void)[]> = new Map()

	// Optional config string
	static configText?: string

	// Wiki tree object (generic object, refine if you know the structure)
	static wikiTree?: Record<string, any>

	// Boolean for compact mode
	static compact: boolean = false

	// Arbitrary data storage
	static data?: any

	// Versions
	static wikiVersion?: string
	static version?: string
	static githubVersion?: string

	// UI state
	static activeTab?: string
	static currentView?: ViewType
	static previousView?: ViewType

	// Focus tracking: tab ID → element UUID
	static mainFocus: Record<string, string> = {}
	static configGlobals: Record<string, any> = {}
	static config: Record<string, any> = {}
	static persistence: Record<string, any> = null
	static changedFiles: string[] = []

	//rendererTemporaryContainer
	static editorItemTemporaryContainers: Record<string, DocumentFragment> = {}
	static config_info: any
	static files: Record<string, ItemPropsFile> = {}

	static onChange<K extends keyof typeof GLOBAL>(
		key: string,
		callback: {
			(): Promise<void>
			(value: any): void
			(): void
		},
	) {
		if (!this._listeners.has(key)) {
			this._listeners.set(key, [])
		}
		this._listeners.get(key).push(callback)
	}

	static setKey<K extends keyof typeof GLOBAL>(key: string, value: string | number | boolean | any[] | Record<string, any>) {
		// console.trace(`setkey was called for: ${key}`)
		if (value === undefined || value === null) {
			console.trace('GLOBAL setKey()', key, value)
			return
		}
		if (this[key] === value) return

		this[key] = value

		const list = this._listeners.get(key)
		if (list) {
			for (const fn of list) fn(value)
		}
	}
}
