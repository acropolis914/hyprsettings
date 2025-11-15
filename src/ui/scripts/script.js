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
import { GLOBAL } from "./GLOBAL.js"
import { jsViewerInit } from "./components/jsViewer.js"
window.Global = GLOBAL
// @ts-ignore


async function setupData() {
    await waitFor(() => window.pywebview?.api.init)
    // @ts-ignore
    GLOBAL["data"]
    GLOBAL["data"] = await JSON.parse(await window.pywebview.api.init())
    jsViewerInit()
    new configRenderer(GLOBAL["data"])
}

async function load_config() {
    await waitFor(() => window.pywebview?.api.init)
    let windowConfig = await window.pywebview.api.read_window_config()
    if (windowConfig["configuration-error"]) {
        console.log("Configuration error: ", windowConfig["configuration-error"])
        return
    }

    window.themes = windowConfig.theme //just to globally access it for setupTheme
    GLOBAL["config"] = {}
    GLOBAL["persistence"] = {}
    for (let key in windowConfig.config) {
        GLOBAL["config"][key] = windowConfig.config[key]
    }
    if (windowConfig["persistence"]) {
        for (let key in windowConfig.persistence) {
            GLOBAL["persistence"][key] = windowConfig.persistence[key]
        }
    }

    if (GLOBAL["persistence"]["first_run"]) {
        document.getElementById("onboarding").classList.remove("hidden")
    } else {
        GLOBAL["persistence"]["first_run"] = false
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await load_config()
    await setupTheme()
    document.documentElement.style.opacity = GLOBAL["config"]["transparency"] || 1; // fade in root to prevent FOUC
    createDynamicTabs()
    await setupData()
    renderSettings()
})

window.addEventListener("error", e => {
    console.error("🔥", e.error?.stack || `${e.message}\n${e.filename}:${e.lineno}`);
});

window.addEventListener("unhandledrejection", e => {
    console.error("🚨 Unhandled Promise rejection:", e.reason?.stack || e.reason);
});


