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


const pressed = new Set();
hotkeys('*', { keydown: true, keyup: true }, (event) => {
	if (event.type === 'keydown') pressed.add(event.key);
	if (event.type === 'keyup') {
		setTimeout(() => {
			pressed.delete(event.key);
		}, 200)

	}
	document.querySelector("#keys-display").innerHTML =
		Array.from(pressed).join(" + ");
	// Array.from(pressed)
	// 	.map(string => `<div class="keypress">${string}</div>`)
	// 	.join(" + ");
	setTimeout(() => {
		pressed.clear()
		document.querySelector("#keys-display").textContent = ""
	}, 1500)
});



window.currentView = "tabs";
window.activeTab;
window.mainFocus = {};
window.currentFocus = null;

hotkeys('*', (event) => {
	let focused = document.activeElement;

	if (event.key === "Escape") {
		event.preventDefault();
	}
	if (event.key === "Tab") {
		event.preventDefault();
	}

	if (event.key === "ArrowRight" && window.currentView === "tabs") {
		const currentSet = document.querySelector(`.config-set#${window.activeTab}`);
		if (!currentSet) {
			console.log(`Config set ${window.activeTab} doesnt exist.`);
			return;
		} else {
			console.log(`Config set ${window.activeTab} exists.`);
		}
		document.querySelector(".sidebar-item.keyboard-selected")?.classList.remove("keyboard-selected");
		if (window.mainFocus[window.activeTab] && currentSet.querySelector(`[data-uuid='${window.mainFocus[window.activeTab]}']`)) {
			const prevFocus = currentSet.querySelector(`[data-uuid='${window.mainFocus[window.activeTab]}']`);
			if (prevFocus) {
				window.currentFocus = prevFocus;
				prevFocus.focus({ preventScroll: true });
				window.currentView = "main";
			}
		} else {
			const firstChild = Array.from(currentSet.children).find(
				child => !child.classList.contains("settings-hidden") && child.getAttribute("tabindex") != null
			);
			if (firstChild) {
				window.currentFocus = firstChild;
				firstChild.focus({ preventScroll: true });
				window.mainFocus[window.activeTab] = firstChild.dataset.uuid || 0;
				window.currentView = "main";
			}
		}
	}

	if (event.key === "ArrowLeft" && window.currentView === "main") {
		const activeElem = document.activeElement;
		if (activeElem && activeElem.dataset.uuid != null) {
			window.mainFocus[window.activeTab] = activeElem.dataset.uuid;
		}
		window.currentFocus.blur();
		window.currentView = "tabs";
		const selectedTab = document.querySelector(`.selected`);
		if (selectedTab) {
			selectedTab.classList.add("keyboard-selected");
			selectedTab.click();
			console.log(selectedTab);
		}
	}

	switch (window.currentView) {
		case "main": {
			const currentSet = document.querySelector(`.config-set#${window.activeTab}`);
			if (!currentSet) break;

			let activeElement = currentSet.querySelector(`[data-uuid='${window.mainFocus[window.activeTab]}']`);
			if (!activeElement) {
				activeElement = document.activeElement;
				if (activeElement.getAttribute("tabindex") == null) {
					break;
				}
			}

			const children = Array.from(currentSet.querySelectorAll(".editor-item"));
			let index = children.indexOf(activeElement);
			let newIndex = index;

			switch (event.key) {
				case "ArrowDown":
					event.preventDefault();
					newIndex = (index === children.length - 1) ? 0 : index + 1;
					while (children[newIndex].classList.contains("settings-hidden")) {
						newIndex = (newIndex + 1) % children.length;
					}
					break;
				case "ArrowUp":
					event.preventDefault();
					newIndex = (index === 0) ? children.length - 1 : index - 1;
					while (children[newIndex].classList.contains("settings-hidden")) {
						newIndex = (newIndex - 1 + children.length) % children.length;
					}
					break;
			}

			activeElement.blur();
			const newActiveElement = children[newIndex];
			if (!activeElement) break;
			window.currentFocus = newActiveElement;
			newActiveElement.focus();
			window.mainFocus[window.activeTab] = newActiveElement.dataset.uuid;

			if (newActiveElement.classList.contains(".config-group")) {
				console.log(newActiveElement.classList);
				const offset = 80;
				const top = element.getBoundingClientRect().top + window.scrollY - offset;
				window.scrollTo({ top, behavior: "smooth" });
			} else {
				newActiveElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
			}
			break;
		}

		case "tabs": {
			const currentSelected = document.querySelector(".selected");
			if (!currentSelected) break;
			const parent = currentSelected.parentElement;
			if (!parent) break;
			const children = Array.from(parent.children);
			let index = children.indexOf(currentSelected);
			let newIndex = index;

			switch (event.key) {
				case "ArrowDown":
					event.preventDefault();
					newIndex = (index === children.length - 1) ? 0 : index + 1;
					while (children[newIndex].tagName === "DIV") {
						newIndex = (newIndex + 1) % children.length;
					}
					break;
				case "ArrowUp":
					event.preventDefault();
					newIndex = (index === 0) ? children.length - 1 : index - 1;
					while (children[newIndex].tagName === "DIV") {
						newIndex = (newIndex - 1 + children.length) % children.length;
					}
					break;
				// (add other per-tabs keys if ever needed)
			}

			currentSelected.classList.remove("selected");
			currentSelected.classList.remove("keyboard-selected");
			const newSelected = children[newIndex];
			newSelected.classList.add("selected");
			newSelected.classList.add("keyboard-selected");
			newSelected.click();
			newSelected.scrollIntoView({ behavior: "smooth", block: "nearest" });
			window.activeTab = newSelected.id;
			break;
		}
	}
});