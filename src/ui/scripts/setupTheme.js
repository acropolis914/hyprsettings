import { saveConfig, waitFor } from "./utils.js";

let themeButton = document.getElementById("theme-toggle");
let currentThemeIndex = 0;
var root = document.querySelector(":root");
let headers = ["description", "link", "author", "variant"];

export async function setupTheme() {
	let currentTheme = window.config["current_theme"];
	root.style.setProperty(`--font-primary`, window.config["font"])
	window.themes.forEach(theme => {
		if (theme.name == currentTheme) {
			currentThemeIndex = window.themes.findIndex(theme => theme.name === currentTheme);
			window.themeVariant = theme.variant.toLowerCase()
			console.log(`Initially setting ${theme.name} as theme from config`);
			Object.entries(theme).forEach(([key, value]) => {
				if (headers.includes(key)) {
					return;
				}
				root.style.setProperty(`--${key}`, value, "important");
			});
			root.classList.remove("dark")
			root.classList.remove("light")
			root.classList.add(theme.variant.toLowerCase())
			window.config["current_theme"] = theme.name
		}
	});
}

themeButton.addEventListener("click", () => {
	changeTheme()
});

function changeTheme() {
	currentThemeIndex += 1;
	currentThemeIndex = currentThemeIndex % (window.themes.length);
	let theme = window.themes[currentThemeIndex]
	console.log(`Changing theme to ${theme.name}`)
	Object.entries(theme).forEach(([key, value]) => {
		if (headers.includes(key)) {
			return;
		}
		root.style.setProperty(`--${key}`, value, "important");
	});
	window.config["current_theme"] = theme.name
	window.themeVariant = theme["variant"].toLowerCase()
	// console.log(window.themeVariant)
	if (window.themeVariant === "dark") {
		window.jsViewer.setAttribute("theme", "default-dark")
	} else {
		window.jsViewer.setAttribute("theme", "default-light")
	}
	root.classList.remove("dark")
	root.classList.remove("light")
	root.classList.add(theme.variant.toLowerCase())
	saveConfig()
}