import { hideAllContextMenus } from "./utils.js";

document.addEventListener('keydown', (event) => {
	if (event.key === 'F5') {
		event.preventDefault(); // stop browser's built-in search
		location.reload()

	}
});

document.addEventListener("mousedown", e => {
	if (!e.target.closest(".context-menu, .editor-item")) {
		hideAllContextMenus()
	}
})