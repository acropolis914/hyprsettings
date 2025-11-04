/* eslint-env browser */
/* global pywebview, TomSelect */

// TODO: WHAT TO DO WHEN COMMENTS ARE UNCOMMENTED?
// IDEA: change value to key and parse
import { ContextMenu } from "./contextMenu.js";
import { bindFlags, modkeys, dispatchers, dispatcherParams, noneDispatchers } from "../hyprland-specific/binds.js"
import { debounce, saveKey, waitFor } from "./utils.js"
// @ts-ignore


//tabids for comment stacks so configRenderer() knows where to put them
let tabids = [
    ["general", "general"],
    ["monitor", "monitor"],
    ["keybindings", "keybinds"],
    ["miscellaneous", "miscellaneous"],
    ["programs", "globals"],
    ["windows and workspaces", "win-rules"],
    ["autostart", "autostart"],
    ["variables", "envars"],
    ["permissions", "permissions"],
    ["look and feel", "looknfeel"],
    ["animations", "animations"],
    ["input", "input"],
    ["debug", "debug"]
];

let keyStarts = [

]
export class configRenderer {
    constructor(json) {
        this.json = json
        this.current_container = []
        this.current_container.push(document.querySelector(".config-set#general"))
        this.comment_stack = []
        this.group_stack = []
        this.parse(this.json)

    }

    async parse(json) {
        //Comment Stacking for three line label comments from default hyprland.conf
        if (json["type"] === "COMMENT" && json["comment"].startsWith("####")) {
            this.comment_stack.push(json)
            if (this.comment_stack.length === 3) {
                for (let i = 0; i < this.comment_stack.length; i++) {
                    let comment_item = new EditorItem_Comments(this.comment_stack[i])
                    // console.log(comment_item)
                    comment_item.el.classList.add("block-comment")
                    if (!window.config["show_header_comments"]) {
                        comment_item.el.classList.add("hidden")
                    }

                    comment_item.addToParent(this.current_container.at(-1))
                }
                this.comment_stack = []
            }
        }

        else if (json["type"] === "COMMENT" && json["comment"].includes("### ")) {
            this.comment_stack.push(json)
            let comment = json["comment"].trim().replace(/^#+|#+$/g, "").trim();
            tabids.forEach(([key, val]) => {
                if (comment.toLowerCase().includes(key)) {
                    this.current_container.pop()
                    this.current_container.push(document.querySelector(`.config-set#${val}`))
                    if (!document.querySelector(`.config-set#${val}`)) {
                        waitFor(() => this.current_container.push(document.querySelector(`.config-set#${val}`)))
                    }
                }
            });

        } // end of comment stacks
        // TODO: Think of a way to make it so if the next comment after ## NAME
        //inline comments
        else if (json["type"] === "COMMENT") {
            let comment_item = new EditorItem_Comments(json, false)
            comment_item.addToParent(this.current_container.at(-1))
        }

        // else if (json["type"] === "BLANK") {
        //     let blankline = document.createElement("div")
        //     blankline.classList.add("blank-line")
        //     blankline.textContent = "THIS IS A BLANK LINE"
        //     this.current_container.at(-1).appendChild(blankline)
        // }

        else if (json["type"] === "GROUP") {
            // console.log(`json group: ${json["name"]}`)
            if (json["position"] && json["position"].split(":").length > 1) {
                // console.log("Groupstart: ", json["position"])
                let group_el = document.createElement("div")
                group_el.classList.add("config-group")
                group_el.dataset.name = json["name"]
                group_el.dataset.uuid = json["uuid"]
                group_el.dataset.postion = json["position"]
                group_el.setAttribute("title", json["position"])
                if (json["comment"]) {
                    group_el.dataset.comment = json["comment"]
                }
                this.current_container.at(-1).appendChild(group_el)
                this.current_container.push(group_el)
            }

            // let currentpath = Array.from(this.)
            // console.log(`Group ${json["name"]} under ${currentpath} is not yet handled to make a new div.`)
        }
        else if (json["position"] && json["type"] === "GROUPEND" && json["position"].split(":").length > 1) {
            // console.log("Groupend: ", json["position"])
            this.current_container.pop()
        }

        else if (json["type"] === "KEY") {
            if (json["name"].startsWith("bind")) {
                let keybindsTab = document.querySelector(".config-set#keybinds")
                if (!keybindsTab) await waitFor(() => keybindsTab = document.querySelector(".config-set#keybinds"))
                let keybind_item = new EditorItem_Binds(json, json["disabled"], keybindsTab)
                this.current_container.pop()
                this.current_container.push(keybindsTab)
                keybind_item.addToParent(this.current_container.at(-1))
                return
            }
            let genericItem = new EditorItem_Generic(json, json["disabled"])
            this.current_container.at(-1).appendChild(genericItem.el)
        }

        //recursive children rendering
        for (let key in json) {
            if (key === "children") {
                for (let child of json[key]) {
                    this.parse(child)
                    // console.log(child)
                }
            }
        }
    }
}

// class EditorItem_Template {
//     constructor(json, disabled = false,) {
//         this.inital_load = true
//         this.saveDebounced = debounce(() => this.save(), 250);

//         this.update()
//         this.inital_load=true
//     }
//     update() {
//         if (!this.inital_load){
//             this.saveDebounced()
//         }
//     }

//     addToParent(parent){
//         parent.appendChild(this.el)
//     }

//     save() {
//         // saveKey(type, name, uuid, position, value)
//     }
// }

class EditorItem_Generic {
    constructor(json, disabled = false) {
        let name = json["name"]
        let uuid = json["uuid"]
        let value = json["value"]
        let comment = json["comment"]
        let position = json["position"]

        this.el = document.createElement("div")
        this.el.innerHTML = `<span id="key">${json["name"]} </span> = <span id="value">${json["value"]}</span>`
        this.el.title = json["position"]
        this.el.classList.add("todo")
        if (disabled === true) {
            this.el.classList.add("disabled")
        }

        this.el.setAttribute("contenteditable", "true")

        this.inital_load = true
        this.saveDebounced = debounce(() => this.save(), 250);

        this.update()
        this.inital_load = true
    }
    update() {
        if (!this.inital_load) {
            this.saveDebounced()
        }
    }

    addToParent(parent) {
        parent.appendChild(this.el)
    }

    save() {
        // saveKey(type, name, uuid, position, value)
    }
}

class EditorItem_Comments {
    constructor(json, hidden = false) {
        let comment = json["comment"]
        let uuid = json["uuid"]
        let position = json["position"]
        this.initial_load = true
        this.el = document.createElement("div")
        this.el.dataset.name = "comment"
        this.el.dataset.comment = comment
        this.el.dataset.uuid = uuid
        this.el.dataset.position = position
        this.el.setAttribute("title", position)
        this.el.classList.add("editor-item")
        if (hidden) {
            this.el.classList.add("settings-hidden")
        }
        this.textarea = this.el.appendChild(document.createElement("textarea"))
        // textarea.contentEditable = "true"
        this.textarea.setAttribute("rows", "1")
        this.textarea.classList.add("editor-item-comment")
        this.textarea.value = comment
        this.saveDebounced = debounce(() => this.save(), 100);
        this.textarea.addEventListener("input", () => this.update())
        this.initial_load = false
    }
    update() {
        this.el.dataset.comment = this.textarea.value
        if (!this.initial_load) {
            this.saveDebounced()
        }

    }

    addToParent(parent) {
        parent.appendChild(this.el)
    }

    save() {
        if (this.el.dataset.comment.startsWith("#")) {
            console.log("saving text inpuut")
            let type = "COMMENT"
            let name = this.el.dataset.name
            let uuid = this.el.dataset.uuid
            let position = this.el.dataset.position
            let value = null
            let comment = this.el.dataset.comment
            saveKey(type, name, uuid, position, value, comment)
        } else {
            let [name, value] = this.el.dataset.comment.split(/=(.*)/).slice(0, 2).map(p => (p.trim()))
            let [new_value, comment] = value.split(/#(.*)/).slice(0, 2).map(p => (p.trim()))
            let uuid = this.el.dataset.uuid
            let type = "KEY"
            let position = this.el.dataset.position
            if (name && value) {
                saveKey(type, name, uuid, position, value, comment = comment)
            }

        }

    }
}

class EditorItem_Binds {
    constructor(json, disabled = false, parent) {
        this.initial_load = true
        let name = json["name"]
        let uuid = json["uuid"]
        let value = json["value"]
        let comment = json["comment"]
        let position = json["position"]
        if (!name.trim().startsWith("bind")) {
            return console.warn(`Given json object is not sutable for this editor item:${name}=${value}`)
        }
        const template = document.getElementById("keybind-template")
        this.el = template.content.firstElementChild.cloneNode(true)
        // @ts-ignore
        if (window.config.compact) {
            this.el.classList.add("compact")
        }
        if (disabled) {
            this.el.classList.add("disabled")
        }
        this.el.setAttribute("title", position)
        this.el.dataset.name = name
        this.el.dataset.uuid = uuid
        this.el.dataset.value = value ?? ""
        this.el.dataset.comment = comment ?? ""
        this.el.dataset.position = position ?? ""
        this.el.dataset.disabled = disabled ?? false
        this.el.dataset.type = "KEY"
        this.preview = ""
        this.contextMenu = new ContextMenu([
            { label: "Add Above", icon: "󰅃", action: () => this.addAbove() },
            { label: "Add Below", icon: "󰅀", action: () => this.addAbove() },
            { label: "Toggle Disable", icon: "󰈉", action: () => this.disable() },
            { label: "Delete Key", icon: "󰗩", action: () => this.addAbove() }
        ])
        this.el.appendChild(this.contextMenu.el)
        this.saveDebounced = debounce(() => this.save(), 100);

        let values = value.split(",", 4)
        const renderflags = {
            option: function (data, escape) {
                return `<div title="${data.description}">` + escape(data.text) + `</div>`
            },
            item: function (data, escape) {
                return `<div title="${data.description}">` + escape(data.text) + `</div>`
            }
        }

        //bindflags
        let bindflag_select_el = this.el.querySelector(".bindflags")
        let bindflag_additems = name.trim().substring(4).split("")
        this.bindflagTS = new TomSelect(bindflag_select_el, {
            options: bindFlags,
            valueField: "value",
            searchField: "value",
            labelField: "value",
            highlight: false,
            duplicates: false,
            hideSelected: true,
            onChange: (value) => {
                if (!this.initial_load) {
                    this.update()
                }
            },
            render: renderflags
        })
        if (bindflag_additems.length == 0) {
            this.bindflagTS.addItem("")
        } else {
            bindflag_additems.forEach(element => {
                this.bindflagTS.addItem(element)
            });
        }

        //modkeys
        let modkey_select_el = this.el.querySelector(".modkey")
        this.modkeyTS = new TomSelect(modkey_select_el, {
            options: modkeys,
            create: true,
            highlight: false,
            valueField: "value",
            searchField: "text",
            onChange: (value) => {
                if (!this.initial_load) {
                    this.update()
                }
            },
            render: renderflags,
        })
        let modkeys_additems = values[0].split(" ")
        modkeys_additems.forEach(element => {
            if (this.hasMod(element)) {
                this.modkeyTS.addItem(element)
            } else {
                this.modkeyTS.createItem(element)
            }
        });

        let key_el = this.el.querySelector(".keypress")
        key_el.textContent = values[1].trim()
        key_el.addEventListener("input", () => {
            // console.log("textarea edited")
            if (!this.initial_load) {
                this.update()
            }
        })

        const dispatcherSelect_el = this.el.querySelector(".dispatcher");
        const paramSelect_el = this.el.querySelector(".params");
        this.dispatcherTS = new TomSelect(dispatcherSelect_el, {
            create: true,
            options: dispatchers,
            maxItems: 1,
            valueField: "value",
            searchField: "value",
            highlight: false,
            onChange: (value) => {
                if (!this.initial_load) {
                    this.update()
                }
            },
            render: renderflags
        });

        let dispatcher_additem = values[2].trim()
        if (this.hasDispatch(dispatcher_additem)) {
            this.dispatcherTS.addItem(dispatcher_additem)
        } else {
            this.dispatcherTS.createItem(dispatcher_additem)
            console.log(`No dispatcher defined: ${dispatcher_additem}`)
        }

        let params_additem = values[3] ? values[3].trim() : null
        // this.paramTS.createItem(params_additem)
        paramSelect_el.value = params_additem
        paramSelect_el.addEventListener("input", () => {
            // console.log("textarea edited")
            if (!this.initial_load) {
                this.update()
            }
        })

        this.comment_el = this.el.querySelector(".comment")
        this.comment_el.value = comment ?? ""
        this.comment_el.addEventListener("input", () => {
            if (!this.initial_load) {
                this.el.dataset.comment = this.comment_el.value
                this.update()
            }
        })
        if (parent) {
            this.addToParent(parent)
        }

        this.el.addEventListener("click", (e) => {
            this.el.classList.remove("compact")
            this.contextMenu.show()
        })
        this.el.addEventListener("dblclick", (e) => {
            console.log("Double clicked!")
            // let target = e.target()
            this.el.classList.toggle("compact")
            this.contextMenu.hide()
        })
        this.el.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this.el.classList.toggle("compact")
                // this.contextMenu.el.classList.toggle("hidden")
            }
        })
        this.el.addEventListener("focus", (e) => {
            this.contextMenu.show()
        })
        this.el.addEventListener("blur", () => {
            this.contextMenu.hide()
            // this.el.classList.add("compact")
        })
        this.update()
        this.initial_load = false
    }

    update() {
        let bindFlags = this.bindflagTS.getValue()
        let bindflagString = Array.isArray(bindFlags) ? `bind${bindFlags.join("")}` : bindFlags

        let modKeys = this.modkeyTS.getValue()
        let modKeyString = Array.isArray(modKeys) ? modKeys.join(" ") : modKeys

        let keyPress = this.el.querySelector(".keypress").value

        let disPatcherString = this.dispatcherTS.getValue()
        let paramString = this.el.querySelector(".params").value.trim()

        let preview_el = this.el.querySelector(".editor-item-preview")
        let comment = this.comment_el.value ? `# ${this.comment_el.value}` : ""
        preview_el.innerHTML = `${bindflagString} = ${modKeyString}, ${keyPress}, ${disPatcherString}, ${paramString} <i>${comment}</i>`
        this.preview = `${bindflagString} = ${modKeyString}, ${keyPress}, ${disPatcherString}, ${paramString} ${comment}`

        this.el.dataset.name = bindflagString
        this.el.dataset.value = `${modKeyString}, ${keyPress}, ${disPatcherString}, ${paramString}`

        let saved_comment = this.comment_el.value
        this.el.dataset.comment = saved_comment
        if (!this.initial_load) {
            this.saveDebounced()
        }
    }

    addToParent(parent) {
        parent.appendChild(this.el)
    }

    addAbove() {
        console.log("Addabove yet to be implemented")
    }

    disable() {
        if (this.el.dataset.disabled == "false") {
            this.el.dataset.disabled = true
            this.el.classList.add("disabled")
            this.save()
        } else {
            this.el.dataset.disabled = false
            this.el.classList.remove("disabled")
            this.save()
        }

    }

    hasMod(element) {
        for (const mod of modkeys) {
            if (mod.value.includes(element)) {
                return true;
            }
        }
        return false
    }

    hasDispatch(element) {
        for (const dispatcher of dispatchers) {
            if (dispatcher.value.includes(element)) {
                return true;
            }
        }
        return false
    }

    save() {
        console.log(`Element with uuid ${this.el.dataset.uuid} changed to ${this.preview} with comment ${this.el.dataset.comment}`)
        let name = this.el.dataset.name
        let uuid = this.el.dataset.uuid
        let position = this.el.dataset.position
        let value = this.el.dataset.value
        const commentToSave = this.comment_el.value.trim() === "" ? null : this.comment_el.value;
        let type = this.el.dataset.type
        let disabled = this.el.dataset.disabled === "true"
        saveKey(type, name, uuid, position, value, commentToSave, disabled)
    }

}


