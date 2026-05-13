export const niriInputOptions = [
	// --- COMMON MODIFIERS ---
	{ label: 'Mod (Niri Dynamic)', value: 'Mod', description: 'Super on TTY, Alt when nested.' },
	{ label: 'Super / Win', value: 'Super', description: 'Primary TWM modifier.' },
	{ label: 'Alt', value: 'Alt', description: 'Standard Alt key.' },
	{ label: 'Control', value: 'Ctrl', description: 'Standard Ctrl key.' },
	{ label: 'Shift', value: 'Shift', description: 'Standard Shift key.' },

	// --- HARD-TO-TYPE STRUCTURAL ---
	{ label: 'Return', value: 'Return', description: 'Often used for terminal spawn.' },
	{ label: 'Tab', value: 'Tab', description: 'Difficult to type in-browser (focus shift).' },
	{ label: 'Escape', value: 'Escape', description: 'Difficult to type (usually closes menus).' },
	{ label: 'Backspace', value: 'Backspace', description: 'Difficult to type (navigates back/deletes).' },
	{ label: 'Space', value: 'Space', description: 'Standard space key.' },
	{ label: 'Print Screen', value: 'Print', description: 'Often intercepted by system screenshot tools.' },

	// --- WEB NAVIGATION (HARD TO TYPE) ---
	{ label: 'Web Back', value: 'XF86Back', description: 'Navigates browser history back.' },
	{ label: 'Web Forward', value: 'XF86Forward', description: 'Navigates browser history forward.' },
	{ label: 'Web Refresh', value: 'XF86Refresh', description: 'Reloads the page (Data loss risk!).' },
	{ label: 'Web Search', value: 'XF86Search', description: 'Triggers browser search/find.' },

	// --- SPECIALIZED MODIFIERS ---
	{ label: 'AltGr (Mod5)', value: 'Mod5', description: 'ISO_Level3_Shift; for international layouts.' },
	{ label: 'ISO Level 5 Shift', value: 'ISO_Level5_Shift', description: 'Often mapped to CapsLock via XKB options.' },

	// --- XF86 MULTIMEDIA KEYS ---
	{ label: 'Audio Raise', value: 'XF86AudioRaiseVolume', description: 'Increase system volume.' },
	{ label: 'Audio Lower', value: 'XF86AudioLowerVolume', description: 'Decrease system volume.' },
	{ label: 'Audio Mute', value: 'XF86AudioMute', description: 'Toggle audio mute.' },
	{ label: 'Audio Mic Mute', value: 'XF86AudioMicMute', description: 'Toggle microphone mute.' },
	{ label: 'Mon Brightness Up', value: 'XF86MonBrightnessUp', description: 'Increase backlight.' },
	{ label: 'Mon Brightness Down', value: 'XF86MonBrightnessDown', description: 'Decrease backlight.' },
	{ label: 'Audio Play/Pause', value: 'XF86AudioPlay', description: 'Toggle media playback.' },
	{ label: 'Audio Next', value: 'XF86AudioNext', description: 'Skip to next track.' },
	{ label: 'Audio Prev', value: 'XF86AudioPrev', description: 'Go to previous track.' },

	// --- POINTER & SCROLL ---
	{ label: 'Mouse Left', value: 'MouseLeft', description: 'Overrides window move gesture.' },
	{ label: 'Mouse Right', value: 'MouseRight', description: 'Overrides window resize gesture.' },
	{ label: 'Mouse Middle', value: 'MouseMiddle', description: 'Standard middle click.' },
	{ label: 'Wheel Scroll Up', value: 'WheelScrollUp', description: 'Vertical mouse wheel.' },
	{ label: 'Wheel Scroll Down', value: 'WheelScrollDown', description: 'Vertical mouse wheel.' },
	{ label: 'Touchpad Scroll Up', value: 'TouchpadScrollUp', description: 'Discrete touchpad intervals.' },
	{ label: 'Touchpad Scroll Down', value: 'TouchpadScrollDown', description: 'Discrete touchpad intervals.' },
]

/**
 * Niri Input Values - Ordered by Functional Importance
 */
export const niriKeyOrder = [
	// --- 1. CORE MODIFIERS ---
	'Mod',
	'Super',
	'Alt',
	'Ctrl',
	'Shift',

	// --- 2. STRUCTURAL (Hard to type) ---
	'Return',
	'Tab',
	'Escape',
	'Backspace',
	'Space',
	'Print',

	// --- 3. WEB INTERACTION ---
	'XF86Back',
	'XF86Forward',
	'XF86Refresh',
	'XF86Search',

	// --- 4. SYSTEM & MULTIMEDIA (XF86) ---
	'XF86AudioRaiseVolume',
	'XF86AudioLowerVolume',
	'XF86AudioMute',
	'XF86AudioMicMute',
	'XF86MonBrightnessUp',
	'XF86MonBrightnessDown',
	'XF86AudioPlay',
	'XF86AudioPause',
	'XF86AudioNext',
	'XF86AudioPrev',

	// --- 5. MOUSE & POINTER ---
	'MouseLeft',
	'MouseRight',
	'MouseMiddle',
	'MouseForward',
	'MouseBack',
	'WheelScrollUp',
	'WheelScrollDown',
	'WheelScrollLeft',
	'WheelScrollRight',
	'TouchpadScrollUp',
	'TouchpadScrollDown',
	'TouchpadScrollLeft',
	'TouchpadScrollRight',

	// --- 6. ADVANCED / LAYOUT ---
	'Mod5',
	'ISO_Level3_Shift',
	'ISO_Level5_Shift',
]

export const niriKeyOrderMap = new Map(niriKeyOrder.map((val, i) => [val, i]))
