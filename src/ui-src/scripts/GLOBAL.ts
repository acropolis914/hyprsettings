type ViewType = 'tabs' | 'main' | 'search' | 'dmenu' | 'overlay' | 'colorSelect' | 'editorItem'
type ConfigGlobal = {
	file: string
	name: string
	value: string | number | any
	uuid: string
}

export class GLOBAL {
	// Map of key → array of callbacks
	static _listeners: Map<string, (() => void)[]> = new Map()

	// Optional config string
	static configText?: string

	// Wiki tree object (generic object, refine if you know the structure)
	static wikiTree?: Record<string, any>

	// Boolean for compact mode
	compact: boolean = false

	// Arbitrary data storage
	static data?: any

	// Versions
	static wikiVersion?: string
	static version?: string
	static githubVersion?: string

	// UI state
	static activeTab?: string
	static currentView?: ViewType
	previousView?: ViewType

	// Focus tracking: tab ID → element UUID
	static mainFocus: Record<string, string> = {}
	static configGlobals: ConfigGlobal[]

	static onChange(
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

	static setKey(key: string, value: string | number | boolean | any[]) {
		if (this[key] === value) return

		this[key] = value

		const list = this._listeners.get(key)
		if (list) {
			for (const fn of list) fn(value)
		}
	}
}
