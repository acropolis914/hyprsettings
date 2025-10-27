//@ts-check
import { configRenderer } from "./configRenderer.js";
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
        this.id = tab.id
        console.log(`Making tab: ${tab.name}`)
        let exists = document.querySelector(`aside#sidebar>ul>li#${this.id}`)
        if (exists) {
            console.log("a tab with that ID already exists")
            return
        }
        this.name = tab.name
        this.shown = tab.shown
        this.sidebar = document.querySelector("aside#sidebar>ul")
        this.configview = document.querySelector("#content-area")
        this.makeSidebarItem()
        this.makeContentView()

    }

    makeSidebarItem() {
        let item = document.createElement("li")
        item.classList.add("sidebar-item")
        item.textContent = this.name
        item.id = this.id
        item.dataset.label = this.name
        console.log(item.dataset.label)
        if (this.shown) {
            document.querySelectorAll("aside#sidebar>ul>li").forEach(i =>
                i.classList.remove("selected")
            )
            item.classList.add("selected")
        }
        item.addEventListener("click", () => {
            handleTabClick(this.id)
        })
        this.sidebar.append(item)
    }

    makeContentView() {
        let item = document.createElement("div")
        item.id = this.id
        if (this.shown) {
            document.querySelectorAll(".config-set").forEach(i =>
                i.classList.add("hidden")
            )
            item.classList.remove("hidden")
        }
        this.configview.appendChild(item)
    }
}

function handleTabClick(id) {
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

document.querySelectorAll(".sidebar-item").forEach((li) => {
    li.addEventListener("click", () => {
        handleTabClick(li.id)
    })
    li.setAttribute("tabindex", "0");
    li.addEventListener("keydown", (e) => { handleTabClick(li.id) })
})


async function setup() {
    await waitFor(() => window.pywebview?.api.init)
    window.data = JSON.parse(await window.pywebview.api.init())
    new configRenderer(window.data)
    jsonViewer.data = window.data

    let tabs = [
        {
            "name": "Halu",
            "shown": false,
            "id": "halu"
        }
    ]
    for (let tab of tabs) {
        new ConfigTabs(tab)
    }
}

async function waitFor(check, { interval = 50, timeout = 10000 } = {}) {
    const start = Date.now()
    while (!check()) {
        if (Date.now() - start > timeout) throw new Error('Timeout waiting for condition')
        await new Promise(r => setTimeout(r, interval))
    }
}

setupTheme()
console.log("pywebview is ready")
setup()


