import { saveConfig } from "./utils.js";

let tabs = [
	{
		name: "General",
		id: "general",
		default: true,
	},
	{
		name: "Keybinds",
		id: "keybinds",
	},

	{
		name: "separator",
		label: "Appearance",
	},
	{
		name: "Look & Feel",
		id: "looknfeel",
	},
	{
		name: "Animations",
		id: "animations",
	},

	{
		name: "separator",
		label: "Layouts",
	},
	{
		name: "Workspaces",
		id: "workspaces",
	},
	{
		name: "Window Rules",
		id: "win-rules",
	},
	{
		name: "Layer Rules",
		id: "layer-rules",
	},

	{
		name: "separator",
		label: "System & Devices",
	},
	{
		name: "Monitor",
		id: "monitor",
	},
	{
		name: "Input",
		id: "input",
	},
	{
		name: "Environment Variables",
		id: "envars",
	},

	{
		name: "separator",
		label: "System Behavior",
	},
	{
		name: "Globals",
		id: "globals",
	},
	{
		name: "Permissions",
		id: "permissions",
	},
	{
		name: "AutoStart",
		id: "autostart",
	},
	{
		name: "Miscellaneous",
		id: "miscellaneous",
	},

	{
		name: "separator",
		label: "Utility & Debugging",
	},
	{
		name: "Settings",
		id: "settings",
	},
	{
		name: "Debug / Testing",
		id: "js_debug",
	},
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
		this.sidebar.appendChild(separator);
	}

	makeSidebarItem() {
		let item = document.createElement("li");
		item.classList.add("sidebar-item");
		item.tabIndex = 0;
		item.textContent = this.name;
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
	if(window.config["last_tab"]){
		let id = window.config["last_tab"]
		let selected_tab = document.querySelector(`aside#sidebar>ul>#${id}`)
		selected_tab.click()
	}

	// document.querySelectorAll(".sidebar-item").forEach((li) => {
	//     li.addEventListener("click", () => {
	//         handleTabClick(li.id)
	//     })
	//     li.setAttribute("tabindex", "0");
	//     li.addEventListener("focus", (e) => { handleTabClick(li.id) })
	// })
}
