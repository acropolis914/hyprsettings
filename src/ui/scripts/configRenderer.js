import { ContextMenu } from "./contextMenu.js";
import { bindFlags, modkeys, dispatchers, dispatcherParams, noneDispatchers } from "../hyprland-specific/binds.js"
import { debounce, deleteKey, hideAllContextMenus, saveKey, waitFor } from "./utils.js"

//tabids for comment stacks so configRenderer() knows where to put them
//[HeaderCommentBlockName(case insensitive),tabID
let tabids = [
    ["general", "general"],
    ["monitor", "monitor"],
    ["keybindings", "keybinds"],
    ["miscellaneous", "miscellaneous"],
    ["programs", "globals"],
    ["windows and workspaces", "win-rules"],
    ["layer rules", "layer-rules"],
    ["autostart", "autostart"],
    ["variables", "envars"],
    ["permissions", "permissions"],
    ["look and feel", "looknfeel"],
    ["animations", "animations"],
    ["input", "input"],
    ["debug", "debug"]
];
let keyNameStarts = [
    ["$", "globals"],
    ["windowrulev2", "win-rules"],
    ["bind", "keybinds"],
    ["layerrule", "layer-rules", ["workspace_wraparound"]],
    ["workspace", "workspaces"],
    ["env", "envars"],
    ["permission", "persmissions"],
    ["exec", "autostart"],
    ["layerrule", "layerrules"],
    ["source", "general"],
];
export class configRenderer {
    constructor(json) {
        this.json = json
        this.current_container = []
        this.current_container.push(document.querySelector(".config-set#general"))
        this.comment_stack = []
        this.group_stack = []
        this.parse(this.json)
        document.querySelectorAll(".editor-item").forEach((element) => {
            element.addEventListener("click", () => {
                window.currentView = "main";
                window.mainFocus[window.activeTab] = element.dataset.uuid
            })

        })

    }

    async parse(json) {
        //Comment Stacking for three line label comments from default hyprland.conf
        if (json["type"] === "COMMENT" && json["comment"].startsWith("####") && (1 < this.comment_stack.length < 3)) {
            this.comment_stack.push(json)
            if (this.comment_stack.length === 3) {
                for (let i = 0; i < this.comment_stack.length; i++) {
                    let comment_item = new EditorItem_Comments(this.comment_stack[i])
                    //
                    comment_item.el.classList.add("block-comment")
                    if (!window.config["show_header_comments"]) {
                        comment_item.el.classList.add("settings-hidden")
                    }

                    comment_item.addToParent(this.current_container.at(-1))
                }
                this.comment_stack = []
            }
        }

        else if (json["type"] === "COMMENT" && json["comment"].includes("### ") && (this.comment_stack.length == 1)) {
            this.comment_stack.push(json)
            let comment = json["comment"].trim().replace(/^#+|#+$/g, "").trim();

            for (const [key, value] of tabids) {
                if (comment.toLowerCase().includes(key)) {
                    this.current_container.pop()
                    this.current_container.push(document.querySelector(`.config-set#${value}`))
                    if (!document.querySelector(`.config-set#${value}`)) {
                        waitFor(() => this.current_container.push(document.querySelector(`.config-set#${val}`)))
                        break
                    }
                }
            }

        } // end of comment stacks
        // TODO: Think of a way to make it so if the next comment after ## NAME is !startswith(#### end the group)
        //inline comments
        else if (json["type"] === "COMMENT") {
            if (this.comment_stack.length > 0) { //catch for when there is a comment stack that didnt end
                for (let i = 0; i < this.comment_stack.length; i++) {
                    let comment_item = new EditorItem_Comments(this.comment_stack[i])
                    //
                    comment_item.el.classList.add("block-comment")
                    if (!window.config["show_header_comments"]) {
                        comment_item.el.classList.add("settings-hidden")
                    }

                    comment_item.addToParent(this.current_container.at(-1))
                }
                this.comment_stack = []
            }
            let comment_item = new EditorItem_Comments(json, false)
            comment_item.addToParent(this.current_container.at(-1))
        }

        // else if (json["type"] === "BLANK") {
        //     let blankline = document.createElement("div")
        //     blankline.classList.add("blank-line")
        //     blankline.textContent = "THIS IS A BLANK LINE"
        //     this.current_container.at(-1).appendChild(blankline)
        // } //fugly

        else if (json["type"] === "GROUP") {
            if (json["position"] && json["position"].split(":").length > 1) {
                //
                let group_el = new ConfiGroup(json).return()
                this.current_container.at(-1).appendChild(group_el)
                this.current_container.push(group_el)
            }
        }
        else if (json["position"] && json["type"] === "GROUPEND" && json["position"].split(":").length > 1) {
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
            //decision on where to put new Editor Item Keys
            let genericItem = new EditorItem_Generic(json, json["disabled"])
            let tabToAddTo
            for (const [key, value] of keyNameStarts) {
                if (json.name.trim().startsWith(key)) {
                    tabToAddTo = document.querySelector(`.config-set#${value}`)
                    break
                }
            }
            if (!tabToAddTo) {
                tabToAddTo = this.current_container.at(-1)
            }
            tabToAddTo.appendChild(genericItem.el)
        }

        //recursive children rendering
        for (let key in json) {
            if (key === "children") {
                for (let child of json[key]) {
                    this.parse(child)
                    //
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
    constructor(json, disabled = false) {//disabled is separate cause I needed it sometimes for debug. should I remove it?
        this.inital_load = true
        let name = json["name"]
        let uuid = json["uuid"]
        let value = json["value"]
        let comment = json["comment"] ? `${json["comment"]}` : ""
        let position = json["position"]
        this.saveDebounced = debounce(() => this.save(), 250);

        const template = document.getElementById("generic-template")
        this.el = template.content.firstElementChild.cloneNode(true)
        this.el.classList.add("editor-item")
        this.el.classList.add("editor-item-generic")
        if (window.config.compact) {
            this.el.classList.add("compact")
        }
        this.el.title = json["position"].replace("root:", "").replaceAll(":", "   ")
        this.el.dataset.name = name
        this.el.dataset.uuid = uuid
        this.el.dataset.value = value ?? ""
        this.el.dataset.comment = comment ?? ""
        this.el.dataset.position = position ?? ""
        this.el.dataset.disabled = disabled ? "true" : "false" //lol vscode badly wants to be a string that's why 
        this.el.dataset.type = "KEY"
        if (disabled === true) {
            this.el.classList.add("disabled")
        }

        this.preview_el = this.el.querySelector(".editor-item-preview")
        this.preview_el.innerHTML = `<span id="key">${json["name"]} </span> <span id="value">${json["value"]}</span>&nbsp;${comment}`

        this.genericEditor_el = this.el.querySelector(".generic-editor")
        this.genericEditor_el.innerHTML = ""
        this.keyEditor = document.createElement("textarea")
        this.keyEditor.rows = 1
        this.keyEditor.id = "generic-key"
        this.valueEditor = document.createElement("textarea")
        this.valueEditor.rows = 1
        this.valueEditor.id = "generic-value"
        if (name.startsWith("$")) {
            this.genericEditor_el.appendChild(this.keyEditor)
        }

        this.genericEditor_el.appendChild(this.valueEditor)
        this.keyEditor.value = name
        this.valueEditor.value = value



        this.contextMenu = new ContextMenu([
            { label: "Add Above", icon: "󰅃", action: () => this.addAbove() },
            { label: "Add Below", icon: "󰅀", action: () => this.addAbove() },
            { label: "Toggle Disable", icon: "󰈉", action: () => this.disable() },
            { label: "Delete Key", icon: "󰗩", action: () => this.delete() }
        ])

        this.el.appendChild(this.contextMenu.el)

        this.el.addEventListener("click", (e) => {

            this.el.classList.remove("compact")
            this.contextMenu.show()
        })
        this.el.addEventListener("contextmenu", (e) => {
            e.preventDefault()

            this.contextMenu.show()
        })
        this.el.addEventListener("dblclick", (e) => {

            this.el.classList.toggle("compact")
            this.contextMenu.hide()
        })
        this.el.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this.el.classList.toggle("compact")
                this.contextMenu.el.classList.toggle("hidden")
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
        this.inital_load = false
    }

    update() {
        if (!this.inital_load) {
            this.saveDebounced()
        }
    }

    addToParent(parent) {
        parent.appendChild(this.el)
    }
    addAbove() {
    }
    delete() {
        deleteKey(this.el.dataset.uuid, this.el.dataset.position)
        this.el.remove()
    }
    disable() {
        this.el.dataset.disabled = this.el.dataset.disabled === "true" ? "false" : "true"
        this.el.classList.toggle("disabled")
        this.saveDebounced()
    }

    save() {
        let type = this.el.dataset.type
        let name = this.el.dataset.name
        let uuid = this.el.dataset.uuid
        let value = this.el.dataset.value
        let comment = this.el.dataset.comment
        let position = this.el.dataset.position
        let disabled = this.el.dataset.disabled === "true" ? true : false
        saveKey(type, name, uuid, position, value, comment, disabled)
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
        this.el.title = position.replace("root:", "").replaceAll(":", "   ")
        this.el.classList.add("editor-item")
        this.el.setAttribute("tabindex", 0)
        if (hidden) {
            this.el.classList.add("settings-hidden")
        }
        this.textarea = this.el.appendChild(document.createElement("textarea"))
        // this.textarea.contentEditable = "true"
        this.textarea.setAttribute("rows", "1")
        this.textarea.classList.add("editor-item-comment")
        this.textarea.value = comment
        this.saveDebounced = debounce(() => this.save(), 100);
        this.textarea.addEventListener("input", () => this.update())
        this.contextMenu = new ContextMenu([
            { label: "Add Above", icon: "󰅃", action: () => this.addAbove() },
            { label: "Add Below", icon: "󰅀", action: () => this.addAbove() },
            { label: "Delete Key", icon: "󰗩", action: () => this.delete() }
        ])
        this.el.appendChild(this.contextMenu.el)
        this.el.addEventListener("click", (e) => {
            this.contextMenu.show()
        })
        this.el.addEventListener("contextmenu", (e) => {
            e.preventDefault()

            this.contextMenu.show()
        })
        this.el.addEventListener("dblclick", (e) => {
            this.contextMenu.hide()
        })
        this.el.addEventListener("keydown", (e) => {
            let editing = false
            if (e.key === "Enter") {
                if (!editing) {
                    e.preventDefault()
                    setTimeout(() => this.textarea.focus(), 0);
                    editing = true
                    this.contextMenu.show()
                } else {
                    this.textarea.blur()
                    this.el.focus()
                    editing = !editing
                }
            }
            if (e.key === "Escape") {
                e.preventDefault()
                const editorItem = this.textarea.closest(".editor-item")
                editorItem.focus()
                editing = false
                this.textarea.blur()
            }
            if (e.key === "ArrowDown") {
                // this.el.classList.toggle("compact")
                e.preventDefault()
                // this.textarea.blur()
                this.contextMenu.show()

            }
        })
        this.textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                this.el.focus()
                // this.textarea.blur()
            }
            //testing signed commit
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault()
                this.el.focus()
            }
        })
        this.el.addEventListener("focus", (e) => {
            this.contextMenu.show()
        })

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
    delete() {
        deleteKey(this.el.dataset.uuid, this.el.dataset.position)
        this.el.remove()
    }
    save() {
        if (this.el.dataset.comment.startsWith("#")) {
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
                saveKey(type, name, uuid, position, value, comment = comment, disabled = false)
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
            return
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
        this.el.title = position.replace("root:", "")
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
            { label: "Delete Key", icon: "󰗩", action: () => this.delete() }
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
            //
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
        }

        let params_additem = values[3] ? values[3].trim() : null
        // this.paramTS.createItem(params_additem)
        paramSelect_el.value = params_additem
        paramSelect_el.addEventListener("input", () => {
            //
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
        this.el.addEventListener("contextmenu", (e) => {
            e.preventDefault()
            this.contextMenu.show()
        })
        this.el.addEventListener("dblclick", (e) => {
            // let target = e.target()
            this.el.classList.toggle("compact")
            this.contextMenu.hide()
        })
        this.el.addEventListener("keydown", (e) => {
            // e.stopPropagation()
            if (e.key === "Enter") {
                this.el.classList.toggle("compact")
                this.contextMenu.show()
            }
            if (e.key === "Delete") {
                e.preventDefault()
                Array.from(this.contextMenu.el.children).forEach(element => {
                    let label_el = element.querySelector(".ctx-button-label")
                    if (label_el.textContent.toLowerCase().includes("delete")) {
                        setTimeout(() => element.click(), 0);
                    }
                });

            }
        })
        this.el.addEventListener("focus", (e) => {
            this.contextMenu.show()
        })
        this.el.addEventListener("blur", () => {
            this.contextMenu.hide()
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
        preview_el.innerHTML = `<span id="key">${bindflagString}<span/> = <span id="value">${modKeyString}, ${keyPress}, ${disPatcherString}, ${paramString}<span/><i>${comment}</i>`
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
    }
    delete() {
        deleteKey(this.el.dataset.uuid, this.el.dataset.position)
        this.el.remove()
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


class ConfiGroup {
    constructor(json) {
        this.group_el = document.createElement("div")
        this.group_el.classList.add("config-group")
        this.group_el.setAttribute("tabindex", 0)
        this.group_el.classList.add("editor-item")
        this.group_el.dataset.name = json["name"]
        this.group_el.dataset.uuid = json["uuid"]
        this.group_el.dataset.postion = json["position"]
        this.group_el.setAttribute("title", json["position"].replace("root:", ""))
        if (json["comment"]) {
            this.group_el.dataset.comment = json["comment"]
        }
        this.group_el.addEventListener("keydown", (e) => {
            if (e.key == "Enter") {
                group_el.querySelector(".editor-item").focus()
                console.log("Group is entered")
            }
        })
    }

    return() {
        return this.group_el
    }
}

