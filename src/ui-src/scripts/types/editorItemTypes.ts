export type NodeType =
	| 'KEY'
	| 'GROUP'
	| 'COMMENT'
	| 'BLANK'
	| 'FILE'
	| 'GROUPEND'
	| 'UNKNOWN'

/**
 * Common properties shared across all configuration nodes.
 */
interface BaseNode {
	name?: string
	uuid?: string
	type: NodeType
	position?: string
	comment?: string | null
	line_number?: string | number | null
	disabled?: boolean
}

/**
 * Represents a key-value pair (e.g., `gaps_in = 5`).
 */
export interface ItemPropsKey extends BaseNode {
	type: 'KEY'
	value: string
}

/**
 * Represents a section block (e.g., `general { ... }`).
 */
export interface ItemPropsGroup extends BaseNode {
	type: 'GROUP'
	children: ItemProps[]
}

/**
 * Represents the root or an included configuration file.
 */
export interface ItemPropsFile extends BaseNode {
	type: 'FILE'
	resolved_path: string
	children: ItemProps[]
}

/**
 * Represents structural or ignored lines like whitespace and comments.
 */
export interface ItemPropsMisc extends BaseNode {
	type: 'COMMENT' | 'BLANK' | 'GROUPEND' | 'UNKNOWN'
	value?: string
	comment?: string | ''
}

/**
 * Unified type for handling any node in the Hyprland configuration tree.
 */
export type ItemProps =
	| ItemPropsKey
	| ItemPropsGroup
	| ItemPropsFile
	| ItemPropsMisc
