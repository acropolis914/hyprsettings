//@ts-check
let themeButton = document.getElementById("theme-toggle")
let root = document.querySelector("html")
let current_theme;
let themeIndex = 0
let themes = ["mocha", "tokyo", "siloe"]

function setupTheme (){
    current_theme = themes[themeIndex]
    root?.classList.add(current_theme)
    themeButton.onclick = toggle_theme
}

function toggle_theme() {
    root?.classList.remove(current_theme)
    themeIndex == themes.length - 1 ? themeIndex = 0 : themeIndex += 1
    current_theme = themes[themeIndex]
    root?.classList.add(current_theme)
    console.log("Theme toggled")
}

function setup() {
    setupTheme()

}

setup()


