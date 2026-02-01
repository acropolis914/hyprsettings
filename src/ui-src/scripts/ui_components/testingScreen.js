import { GLOBAL } from '@scripts/GLOBAL.js'
const testingScreen = document.querySelector(".testing-screen")
const testingScreenHeader = document.getElementById("testing-screen-header")
const iframe = document.querySelector('.testing-screen iframe');
let open = false;

GLOBAL.onChange("themeVariant", () => {
	updateIframeTheme()
})

iframe.addEventListener('load', () => {
	updateIframeTheme()
})

iframe.addEventListener('load', () => {
	try {
		const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
		const win = iframe.contentWindow;

		// Get current path as folder-style URL
		let basePath = win.location.pathname;
		if (!basePath.endsWith('/')) {
			// Remove the "file" part and keep folder path
			basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
		}

		iframeDoc.querySelectorAll('a[href^="../"]').forEach(link => {
			const hugoHref = link.getAttribute('href');

			// Resolve relative to folder path
			const resolvedUrl = new URL(hugoHref, win.location.origin + basePath);

			// Make href relative to /wiki/ root if needed
			link.href = resolvedUrl.pathname.replace(/^\/wiki\//, '');

			console.log(`Hugo link: ${hugoHref} → ${link.href}`);
		});
	} catch (e) {
		console.warn('Cannot access iframe content (cross-origin?)', e);
	}
});



function updateIframeTheme() {
	const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
	// console.log(window.themeVariant)
	if (window.themeVariant === 'dark') {
		iframeDoc.documentElement.classList.remove("light");
		iframeDoc.documentElement.classList.add("dark");
		iframeDoc.documentElement.style.colorScheme = "dark";
		// console.log("Set iframe to dark theme")
	} else {
		iframeDoc.documentElement.classList.remove("dark");
		iframeDoc.documentElement.classList.add("light");
		iframeDoc.documentElement.style.colorScheme = "light";
		// console.log("Set iframe to light theme")
	}
}

document.addEventListener('keydown', (event) => {
	if (event.key === 'F3') {
		event.preventDefault();
		toggleTestingScreen();
	}
	if (event.key === 'F3' || event.key === 'Escape') {
		// blur the iframe to remove its focus
		iframe.blur();
		console.log('Parent caught key:', event.key);
		// now you can do your exit logic
	}
});

testingScreen.addEventListener("transitionend", (e) => {
	if (e.propertyName === "opacity" && getComputedStyle(e.target).opacity === "0") {
		console.log("Element is now invisible");
		testingScreen.classList.add("hidden")
	} else if (e.propertyName === "opacity" && getComputedStyle(e.target).opacity > "0" && open) {

	}
});



function toggleTestingScreen() {
	if (!open) {
		testingScreen.classList.remove("hidden")
	} else {
		testingScreen.classList.add("hidden")
	}
	open = !open
}


import Prism from 'prismjs';
import "prismjs/components/prism-ini.js";
import '@stylesheets/prism.css';

export async function renderTextPreview(){
	let configPreview_el = document.getElementById("config-preview")
	let configPreviewTabs_el = document.getElementById("config-preview-tabs")
	let configPreviewCode_el = document.getElementById("config-preview-code")
	configPreviewTabs_el.innerHTML = ''
	configPreviewCode_el.innerHTML = ''
	configPreviewCode_el.classList.add("language-ini");
	let pre = configPreview_el.querySelector("pre")

	function createTab(path){
		let tab = document.createElement("div")
		configPreviewTabs_el.appendChild(tab)
		tab.classList.add("config-preview-tab-item")
		tab.textContent = path.split("/").at(-1).replace(".conf", "")
		tab.addEventListener("click", (e) => {
			Array.from(configPreviewTabs_el.children).forEach(child=>{child.classList.remove("active")})
			tab.classList.add("active")
		})
		return tab
	}
	const wikiLinkActive = await fetch('/wiki/', { method: 'HEAD' })
	let wikiTab;
	if (wikiLinkActive.ok){
	wikiTab = createTab("WIKI")
	wikiTab.addEventListener("click", (e) => {
		if (iframe.classList.contains("hidden")){
			iframe.classList.remove("hidden")
			configPreviewCode_el.classList.add("hidden")
			pre.classList.add("hidden")
		} else {
			iframe.classList.add("hidden")
			configPreviewCode_el.classList.remove("hidden")
			pre.classList.remove("hidden")
		}
	})}

	GLOBAL.configText.forEach((element, index) => {
		// console.log(element)
		let path = element.path;
		let text = element.content;

		// create tab
		let tab= createTab(path);

		tab.addEventListener("click", (e) => {
			configPreviewCode_el.textContent = text
			Prism.highlightElement(configPreviewCode_el)
			configPreviewCode_el.classList.remove("hidden")
			iframe.classList.add("hidden")
			pre.classList.remove("hidden")
		})
		tab.addEventListener("dblclick", async (e) => {
			const response = await fetch("/api/open_file?path=" + encodeURIComponent(path))
			if (!response.ok) {
				console.error("Failed to open file:", response.statusText)
			}
		})
	})
	wikiTab.click()

}

GLOBAL.onChange("configText", renderTextPreview)