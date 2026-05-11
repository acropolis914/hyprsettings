import { NiriLayoutCDs } from '@scripts/NiriSpecific/niriLayoutCDs.ts'
import type { ConfigDescription } from '@scripts/types/configDescriptionTypes.ts'

/**
 * Descriptions specific to the workspace block itself
 */
const workspaceRootCDs: ConfigDescription[] = [
	{
		name: 'workspace',
		path: 'root',
		type: 'GROUP',
		data: '',
		description: 'Declare a named workspace that persists even when empty.',
	},
	{
		name: 'off',
		path: 'workspace',
		type: 'CONFIG_OPTION_FLAG',
		data: '',
		description: 'Disable this named workspace declaration.',
	},
	{
		name: 'open-on-output',
		path: 'workspace',
		type: 'CONFIG_OPTION_STRING_SHORT',
		data: 'eDP-1',
		description: 'The output name, model, or serial where this workspace should open initially.',
	},
]

/**
 * Dynamically mapped Layout CDs for per-workspace overrides.
 * Prefixes "workspace:layout" to existing layout paths.
 * Excludes settings that don't apply at the workspace level.
 */
const workspaceLayoutOverrides: ConfigDescription[] = NiriLayoutCDs.filter(
	(cd) => cd.name !== 'empty-workspace-above-first' && cd.name !== 'insert-hint',
).map((cd) => ({
	...cd,
	path: `workspace:layout${cd.path === 'layout' ? '' : cd.path.replace('layout', '')}`,
}))

// Export the combined list
export const NiriWorkspaceCDs: ConfigDescription[] = [...workspaceRootCDs, ...workspaceLayoutOverrides]