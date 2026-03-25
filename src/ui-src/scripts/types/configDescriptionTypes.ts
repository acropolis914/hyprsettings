/**
 * Represents the specific data types allowed in Hyprland configuration options.
 */
export type ConfigDataType =
	| 'CONFIG_OPTION_INT'
	| 'CONFIG_OPTION_FLOAT'
	| 'CONFIG_OPTION_STR'
	| 'CONFIG_OPTION_COLOR'
	| 'CONFIG_OPTION_BOOL'
	| 'CONFIG_OPTION_STRING_SHORT'
	| 'CONFIG_OPTION_STRING_LONG'

/**
 * Structure for metadata and documentation of specific Hyprland settings.
 */
export interface ConfigDescription {
	/** The specific setting name (e.g., 'border_size') */
	name: string
	/** The section path (e.g., 'general' or 'decoration/blur') */
	path: string
	/** The expected data type for validation and UI rendering */
	type: ConfigDataType | string
	/** Range or default values (e.g., '1, 0, 20') */
	data: string
	/** Human-readable explanation of what the setting does */
	description: string
	uuid?: string | null
}
