//@ts-check
/* eslint-env browser */
/* global pywebview, TomSelect */
import { waitFor } from "./utils.js"
import { configRenderer } from "./configRenderer.js"
import { renderSettings } from "./settings.js"
import { createDynamicTabs } from "./createDynamicTabs.js"
import { setupTheme } from "./setupTheme.js"
import "./documentListeners.js"
import "./onboarding.js"
import "./testingScreen.js"
// @ts-ignore
window.jsonViewer = document.querySelector("andypf-json-viewer")


async function setupData() {
    await waitFor(() => window.pywebview?.api.init)
    // @ts-ignore
    window.data = await JSON.parse(await window.pywebview.api.init())
    // @ts-ignore
    window.jsViewer = document.createElement("andypf-json-viewer")
    document.querySelector(".config-set#debug").appendChild(jsViewer)
    window.jsViewer.data = window.data
    console.log(window.themeVariant)
    if (window.themeVariant === "dark") {
        window.jsViewer.setAttribute("theme", "papercolor-dark")
    } else {
        window.jsViewer.setAttribute("theme", "default-light")
    }
    new configRenderer(window.data)
}

async function load_config() {
    await waitFor(() => window.pywebview?.api.init)
    window.windowConfig = await window.pywebview.api.read_window_config()
    window.themes = window.windowConfig.theme //just to globally access it for setupTheme
    window.config = window.config || {}
    for (let key in window.windowConfig.config) {
        window.config[key] = windowConfig.config[key]
    }
    if (window.config["first_run"]) {
        document.getElementById("onboarding").classList.remove("hidden")
    }
}


document.addEventListener("DOMContentLoaded", async () => {
    await load_config()
    await setupTheme()
    document.documentElement.style.opacity = window.config["transparency"] || 1; // fade in root to prevent FOUC
    createDynamicTabs()
    await setupData()
    renderSettings()
})
