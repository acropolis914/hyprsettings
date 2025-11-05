import { saveConfig } from "./utils.js";

let tabs = [
	{ name: "General", id: "general", default: true, icon: "" }, // nf-md-settings
	{ name: "Keybinds", id: "keybinds", icon: "" }, // nf-md-key

	{ name: "separator", label: "Appearance" },

	{ name: "Look & Feel", id: "looknfeel", icon: "" }, // nf-md-brush
	{ name: "Animations", id: "animations", icon: "" }, // nf-md-movie

	{ name: "separator", label: "Layouts" },

	{ name: "Workspaces", id: "workspaces", icon: "" }, // nf-md-view_quilt
	{ name: "Window Rules", id: "win-rules", icon: "" }, // nf-md-window
	{ name: "Layer Rules", id: "layer-rules", icon: "" }, // nf-md-layers

	{ name: "separator", label: "System & Devices" },

	{ name: "Monitor", id: "monitor", icon: "󰨇" }, // nf-md-monitor
	{ name: "Input", id: "input", icon: "" }, // nf-md-keyboard
	{ name: "Environment Variables", id: "envars", icon: "" }, // nf-md-code

	{ name: "separator", label: "System Behavior" },

	{ name: "Globals", id: "globals", icon: "" }, // nf-md-globe
	{ name: "Permissions", id: "permissions", icon: "󰒃" }, // nf-md-lock
	{ name: "AutoStart", id: "autostart", icon: "" }, // nf-md-play_circle_outline
	{ name: "Miscellaneous", id: "miscellaneous", icon: "" }, // nf-md-more_horiz

	{ name: "separator", label: "Utility & Debugging" },

	{ name: "Settings", id: "settings", icon: "" }, // nf-md-tune
	{ name: "Debug / Testing", id: "debug", icon: "" }, // nf-md-bug_report
];


class ConfigTabs {
	constructor(tab) {
		// console.log(tab)
		if (tab.name === "separator") {
			this.sidebar = document.querySelector("aside#sidebar>ul");
			this.make_separator(tab);
			return;
		}
		this.id = tab.id;
		this.name = tab.name;
		this.icon = tab.icon;
		let exists = document.querySelector(
			`aside#sidebar>ul>li#${this.id}`
		);
		if (exists) {
			console.warn(`A tab with id ${tab.id} already exists.`);
			return;
		}

		this.shown = tab.default;


		this.sidebar = document.querySelector("aside#sidebar>ul");
		this.configview = document.querySelector("#content-area");
		this.makeSidebarItem();
		this.makeContentView();
	}

	make_separator(tab) {
		let separator = document.createElement("div");
		separator.classList.add("tab-separator");
		separator.textContent = tab.label;
		separator.setAttribute("title", tab.label)
		this.sidebar.appendChild(separator);
	}

	makeSidebarItem() {
		let item = document.createElement("li");
		item.classList.add("sidebar-item");
		item.tabIndex = 0;
		let icon = document.createElement("div")
		icon.textContent = this.icon
		icon.classList.add("sidebar-icon")
		icon.id = "sidebar-icon"
		let text = document.createElement("div")
		text.textContent = this.name
		text.classList.add("sidebar-text")
		item.appendChild(icon)
		item.appendChild(text)
		item.setAttribute("title", this.name)
		// item.textContent = this.name;
		item.id = this.id;
		item.dataset.label = this.name;
		// console.log(item.dataset.label)
		if (this.shown) {
			document
				.querySelectorAll("aside#sidebar>ul>li")
				.forEach((i) => i.classList.remove("selected"));
			item.classList.add("selected");
		}
		item.addEventListener("click", () => {
			this.handleTabClick(this.id);
		});
		item.addEventListener("focus", (e) => {
			this.handleTabClick(this.id);
		});
		this.sidebar.append(item);
	}

	makeContentView() {
		let item = document.createElement("div");
		item.classList.add("config-set");
		item.id = this.id;
		item.classList.add("hidden");
		if (this.shown) {
			document
				.querySelectorAll("#content-area>.config-set")
				.forEach((i) => i.classList.add("hidden"));
			item.classList.remove("hidden");
			document.getElementById("config-set-title").textContent =
				this.name;
		}
		this.configview.appendChild(item);
	}
	handleTabClick(id) {
		document.querySelectorAll(".config-set").forEach((element) => {
			element.id === id
				? element.classList.remove("hidden")
				: element.classList.add("hidden");
		});
		document.querySelectorAll(".sidebar-item").forEach((element) => {
			element.id === id
				? element.classList.add("selected")
				: element.classList.remove("selected");
		});
		const sidebarItem = document.querySelector(`aside#sidebar>ul>#${id}`);
		const sidebarItemTitle = sidebarItem.dataset.label;
		const configSetTitle = document.querySelector("#config-set-title");
		configSetTitle.textContent = sidebarItemTitle;
		window.config["last_tab"] = id
		saveConfig()
	}
}
export async function createDynamicTabs() {

	for (let tab of tabs) {
		// console.log(tab)
		new ConfigTabs(tab);
	}
	if (window.config["last_tab"]) {
		let id = window.config["last_tab"]
		let selected_tab = document.querySelector(`aside#sidebar>ul>#${id}`)
		if (selected_tab) {
			selected_tab.click()
		}

	}

	// document.querySelectorAll(".sidebar-item").forEach((li) => {
	//     li.addEventListener("click", () => {
	//         handleTabClick(li.id)
	//     })
	//     li.setAttribute("tabindex", "0");
	//     li.addEventListener("focus", (e) => { handleTabClick(li.id) })
	// })
}
