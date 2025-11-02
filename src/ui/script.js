//@ts-check
import { waitFor } from "./utils.js"
import { configRenderer } from "./configRenderer.js";
import { renderSettings } from "./settings.js";
window.jsonViewer = document.querySelector("andypf-json-viewer")

let themeButton = document.getElementById("theme-toggle")
let root = document.querySelector("html")
let current_theme;
let themeIndex = Number(localStorage.getItem("themeIndex") ?? 0)
let themes = ["mocha", "tokyo", "siloe"]

function setupTheme() {
    current_theme = themes[themeIndex]
    root?.classList.add(current_theme)
    themeButton.onclick = toggle_theme
}

function toggle_theme() {
    root?.classList.remove(current_theme)
    themeIndex == themes.length - 1 ? themeIndex = 0 : themeIndex += 1
    localStorage.setItem("themeIndex", String(themeIndex))
    current_theme = themes[themeIndex]
    root?.classList.add(current_theme)
    console.log("Theme toggled")
}


class ConfigTabs {
    constructor(tab) {
        // console.log(tab)
        if (tab.name === "separator") {
            this.sidebar = document.querySelector("aside#sidebar>ul")
            this.make_separator(tab)
            return
        }
        this.id = tab.id
        let exists = document.querySelector(`aside#sidebar>ul>li#${this.id}`)
        if (exists) {
            console.warn(`A tab with id ${tab.id} already exists.`)
            return
        }
        this.name = tab.name
        this.shown = tab.shown
        this.sidebar = document.querySelector("aside#sidebar>ul")
        this.configview = document.querySelector("#content-area")
        this.makeSidebarItem()
        this.makeContentView()

    }

    make_separator(tab) {
        let separator = document.createElement("div")
        separator.classList.add("tab-separator")
        separator.textContent = tab.label
        this.sidebar.appendChild(separator)
    }

    makeSidebarItem() {
        let item = document.createElement("li")
        item.classList.add("sidebar-item")
        item.tabIndex = 0
        item.textContent = this.name
        item.id = this.id
        item.dataset.label = this.name
        // console.log(item.dataset.label)
        if (this.shown) {
            document.querySelectorAll("aside#sidebar>ul>li").forEach(i =>
                i.classList.remove("selected")
            )
            item.classList.add("selected")
        }
        item.addEventListener("click", () => {
            this.handleTabClick(this.id)
        })
        item.addEventListener("focus", (e) => { this.handleTabClick(this.id) })
        this.sidebar.append(item)
    }

    makeContentView() {
        let item = document.createElement("div")
        item.classList.add("config-set")
        item.id = this.id
        item.classList.add("hidden")
        if (this.shown) {
            document.querySelectorAll("#content-area>.config-set").forEach(i =>
                i.classList.add("hidden")
            )
            item.classList.remove("hidden")
            document.getElementById("config-set-title").textContent = this.name
        }
        this.configview.appendChild(item)
    }
    handleTabClick(id) {
        document.querySelectorAll(".config-set").forEach((element) => {
            element.id === id ? element.classList.remove("hidden") : element.classList.add("hidden")
        })
        document.querySelectorAll(".sidebar-item").forEach((element) => {
            element.id === id ? element.classList.add("selected") : element.classList.remove("selected")
        })
        const sidebarItem = document.querySelector(`ul>#${id}`);
        const sidebarItemTitle = sidebarItem.dataset.label;
        const configSetTitle = document.querySelector("#config-set-title")
        configSetTitle.textContent = sidebarItemTitle
    }

}


async function createDynamicTabs() {
    let tabs = [
        {
            "name": "General",
            "shown": true,
            "id": "general"
        },
        {
            "name": "Keybinds",
            "shown": false,
            "id": "keybinds"
        },

        {
            "name": "separator",
            "label": "Appearance"
        },
        {
            "name": "Look & Feel",
            "shown": false,
            "id": "looknfeel"
        },
        {
            "name": "Animations",
            "shown": false,
            "id": "animations"
        },

        {
            "name": "separator",
            "label": "Layouts"
        },
        {
            "name": "Workspaces",
            "shown": false,
            "id": "workspaces"
        },
        {
            "name": "Window Rules",
            "shown": false,
            "id": "win-rules"
        },

        {
            "name": "separator",
            "label": "System & Devices"
        },
        {
            "name": "Monitor",
            "shown": false,
            "id": "monitor"
        },
        {
            "name": "Input",
            "shown": false,
            "id": "input"
        },
        {
            "name": "Environment Variables",
            "shown": false,
            "id": "envars"
        },

        {
            "name": "separator",
            "label": "System Behavior"
        },
        {
            "name": "Globals",
            "shown": false,
            "id": "globals"
        },
        {
            "name": "Permissions",
            "shown": false,
            "id": "permissions"
        },
        {
            "name": "AutoStart",
            "shown": false,
            "id": "autostart"
        },
        {
            "name": "Miscellaneous",
            "shown": false,
            "id": "miscellaneous"
        },

        {
            "name": "separator",
            "label": "Utility & Debugging"
        },
        {
            "name": "Settings",
            "shown": false,
            "id": "settings"
        },
        {
            "name": "Debug / Testing",
            "shown": false,
            "id": "js_debug"
        }
    ];


    for (let tab of tabs) {
        // console.log(tab)
        new ConfigTabs(tab)
    }
    return true

    // document.querySelectorAll(".sidebar-item").forEach((li) => {
    //     li.addEventListener("click", () => {
    //         handleTabClick(li.id)
    //     })
    //     li.setAttribute("tabindex", "0");
    //     li.addEventListener("focus", (e) => { handleTabClick(li.id) })
    // })
}


async function setupData() {
    await waitFor(() => window.pywebview?.api.init)
    window.data = await JSON.parse(await window.pywebview.api.init())
    window.jsViewer = document.createElement("andypf-json-viewer")
    document.querySelector(".config-set#js_debug").appendChild(jsViewer)
    window.jsViewer.data = window.data
    // console.log(windowConfig)
    new configRenderer(window.data)
}

async function load_config() {
    await waitFor(() => window.pywebview?.api.init)
    let windowConfig = await window.pywebview.api.read_window_config()
    window.config = window.config || {}
    for (let key in windowConfig.config) {
        // console.log(key, windowConfig.config[key])
        window.config[key] = windowConfig.config[key]
    }
}


document.addEventListener("DOMContentLoaded", async () => {
    load_config()
    setupTheme()
    await waitFor(() => createDynamicTabs())
    await setupData()
    renderSettings()
})
