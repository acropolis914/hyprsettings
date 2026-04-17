/**
 * Represents the specific data types allowed in Hyprland configuration options.
 */
export type ConfigDataType =
	/** Boolean value. Default value. e.g. `true`, `false` */
	| 'CONFIG_OPTION_BOOL'
	/** A predefined list of choices. Represented as `defaultIndex, "choices"`. e.g. `0, "Disabled,Enabled,Auto"`, `0, "disable,always,ondemand,ignore"` */
	| 'CONFIG_OPTION_CHOICE'
	/** Color value. Standard hex without `#`. e.g. `0xee1a1a1a`, `0xffffffff` */
	| 'CONFIG_OPTION_COLOR'
	/** Floating point number. Represented as `default, min, max`. e.g. `1, 0, 1`, `0.5, 0, 1`, `0.8916, 0, 2` */
	| 'CONFIG_OPTION_FLOAT'
	/** Gradient color definition. Supports multiple values. e.g. `0xff444444`, `0xffffaaff`, `0x66ffff00` */
	| 'CONFIG_OPTION_GRADIENT'
	/** Integer number. Represented as `default, min, max`. e.g. `1, 0, 20`, `1000, 10, 2000`, `0, 0, INT_MAX` */
	| 'CONFIG_OPTION_INT'
	/** Standard string value */
	| 'CONFIG_OPTION_STRING'
	/** Long string value, potentially multiline or containing complex text */
	| 'CONFIG_OPTION_STRING_LONG'
	/** Short text string (up to a specific internal limit). e.g. `dwindle`, `us`, `normal`, `none` */
	| 'CONFIG_OPTION_STRING_SHORT'
	/** Vector/coordinates. Represented as `{defaultX, defaultY}, {minX, minY}, {maxX, maxY}` or similar ranges. e.g. `{}, {-250, -250}, {250, 250}`, `{0, 0}, {0, 0}, {1000., 1000.}` */
	| 'CONFIG_OPTION_VECTOR'
	/** Represents a configuration group or section */
	| 'GROUP'

/**
 * Structure for metadata and documentation of specific Hyprland settings.
 */
export interface ConfigDescription {
	/** The specific setting name (e.g., 'border_size') */
	name: string
	/** The section path (e.g., 'general' or 'decoration/blur') */
	path: string
	/** The expected data type for validation and UI rendering */
	type: ConfigDataType
	/** Range or default values (e.g., '1, 0, 20') */
	data: string
	/** Human-readable explanation of what the setting does */
	description: string
	uuid?: string | null
}
