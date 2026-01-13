import { GLOBAL } from '../GLOBAL.js'

export function selectFrom(options, addCustom = true) {
	return new Promise((resolve, reject) => {
		GLOBAL['previousView'] = GLOBAL['currentView']
		GLOBAL['currentView'] = 'dmenu'

		const overlay = document.createElement("div");
		overlay.className = "dmenu-overlay";
		document.getElementById("content-area").appendChild(overlay);

		const selectorParentEl = document.createElement("div");
		selectorParentEl.className = "dmenu";
		selectorParentEl.id = "dmenu";
		selectorParentEl.tabIndex = 0;

		const selectorLaberEl = document.createElement("div");
		selectorLaberEl.className = "dmenu-prompt";
		selectorLaberEl.id = "dmenu-prompt";


		const selectorEl = document.createElement("ul");
		selectorEl.id = "dmenu-list";
		selectorEl.className = "dmenu-list";
		selectorEl.tabIndex = 0;

		selectorParentEl.appendChild(selectorEl);

		function cleanup() {
			selectorParentEl.remove();
			overlay.parentNode.removeChild(overlay);
			// console.log(GLOBAL['currentView']);
			GLOBAL['currentView'] = GLOBAL['previousView']
			// console.log(GLOBAL['currentView']);
		}

		options.forEach((element) => {
			const selectorItem = document.createElement("li");
			selectorItem.className = "dmenu-item";
			selectorItem.tabIndex = 0;
			selectorItem.textContent = element.name;

			function choose() {
				cleanup();
				resolve(element);
			}

			selectorItem.addEventListener("click", choose);

			selectorItem.addEventListener("keydown", (e) => {
				if (e.key === "Enter") choose();
				if (e.key === "Escape") {
					cleanup();
					reject(new Error("Selection cancelled"));
				}

				if (e.key === 'ArrowDown') {
					e.preventDefault()
					// console.log('ArrowDown is clicked finding next element')
					let next = selectorItem.nextElementSibling
					while (next && next.tagName !== 'LI') {
						next = next.nextElementSibling
					}
					if (!next) {
						next = selectorItem.parentElement.firstElementChild
					}
					selectorItem.classList.remove('selected')
					next.focus({ preventScroll: true })
					next.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
				}
				if (e.key === 'ArrowUp') {
					e.preventDefault()
					console.log('ArrowDown is clicked finding next element')
					let previous = selectorItem.previousElementSibling
					while (previous && previous.tagName !== 'LI') {
						previous = previous.previousElementSibling
					}
					if (!previous) {
						previous = selectorItem.parentElement.lastElementChild
					}
					selectorItem.classList.remove('selected')
					console.debug('Next element is focused')
					previous.focus({ preventScroll: true })
					previous.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

				}
			});

			selectorItem.addEventListener("focus", (e)=>{
				selectorItem.classList.add('selected')
			});

			selectorEl.appendChild(selectorItem);
		});

		document
			.getElementById("content-area")
			.appendChild(selectorParentEl);

		selectorEl.firstElementChild.focus();
	});
}
