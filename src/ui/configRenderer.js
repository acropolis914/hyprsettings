// TODO: WHAT TO DO WHEN COMMENTS ARE UNCOMMENTED?
// IDEA: change value to key and parse
import { bindFlags, modkeys, dispatchers, dispatcherParams, noneDispatchers } from "./hyprland-specific/binds.js"
import { debounce, waitFor } from "./utils.js"
// @ts-ignore
window.dryrun = false

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
    ["input", "input"]
];
export class configRenderer {
    constructor(json) {
        this.json = json
        this.current_tab = document.querySelector(".config-set#general")
        this.comment_stack = []
        this.parse(this.json)
    }

    async parse(json) {
        //Comment Stacking for three line label comments from default hyprland.conf
        if (json["type"] === "COMMENT" && json["comment"].startsWith("####")) {
            this.comment_stack.push(json)
            if (this.comment_stack.length === 3) {
                for (let i = 0; i < this.comment_stack.length; i++) {
                    let comment_item = new EditorItem_Comments(this.comment_stack[i]["comment"], this.comment_stack[i]["uuid"], this.comment_stack[i]["position"], true)
                    // console.log(`Adding comment ${this.comment_stack[i]["comment"]} to ${this.current_tab}`)
                    comment_item.addToParent(this.current_tab)
                }
                this.comment_stack = []
            }
        }

        else if (json["type"] === "COMMENT" && json["comment"].includes("## ")) {
            this.comment_stack.push(json)
            let comment = json["comment"].trim().replace(/^#+|#+$/g, "").trim();
            tabids.forEach(([key, val]) => {
                if (comment.toLowerCase().includes(key)) {
                    this.current_tab = document.querySelector(`.config-set#${val}`)
                    if (!document.querySelector(`.config-set#${val}`)) {
                        waitFor(() => this.current_tab = document.querySelector(`.config-set#${val}`))
                    }
                }
            });

        } // end of comment stacks

        //inline comments
        else if (json["type"] === "COMMENT") {
            let comment_item = new EditorItem_Comments(`${json["comment"]}`, json["uuid"], json["position"])
            comment_item.addToParent(this.current_tab)
        }

        //bind editor
        else if (json["type"] === "KEY" && json["name"].startsWith("bind")) {
            let keybindsTab = document.querySelector(".config-set#keybinds")
            if (!keybindsTab) await waitFor(() => keybindsTab = document.querySelector(".config-set#keybinds"))
            let keybind_item = new EditorItem_Binds(json["name"], json["uuid"], json["value"], json["comment"], json["position"])
            keybind_item.addToParent(keybindsTab)
            this.current_tab = keybindsTab
        } else if (json["type"] === "KEY") {
            console.log(json["disabled"])
            let genericItem = document.createElement("div")
            genericItem.textContent = `${json["name"]} = ${json["value"]}`
            genericItem.title = json["position"]
            genericItem.classList.add("todo")
            console.log(json["disabled"])
            if (json["disabled"] === true) {
                console.log("Disabled item found")
                genericItem.classList.add("disabled")
            }
            genericItem.setAttribute("contenteditable", "true")
            this.current_tab.appendChild(genericItem)
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

class EditorItem_Comments {
    constructor(comment, uuid, position, hidden = false) {
        this.initial_load = true
        this.el = document.createElement("div")
        this.el.dataset.name = "comment"
        this.el.dataset.comment = comment
        this.el.dataset.uuid = uuid
        this.el.dataset.position = position
        this.el.setAttribute("title", position)
        this.el.classList.add("editor-item")
        if (hidden) {
            this.el.classList.add("hidden")
        }
        this.textarea = this.el.appendChild(document.createElement("textarea"))
        // textarea.contentEditable = "true"
        this.textarea.setAttribute("rows", 1)
        this.textarea.classList.add("editor-item-comment")
        this.textarea.value = comment
        this.saveDebounced = debounce(() => this.save(), 250);
        this.textarea.addEventListener("input", () => this.update())
        this.initial_load = false
    }
    update() {
        this.el.dataset.comment = this.textarea.value
        console.log(this.textarea.value)
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
            let name = this.el.dataset.name
            let uuid = this.el.dataset.uuid
            let position = this.el.dataset.position
            let value = this.el.dataset.value
            let comment = this.el.dataset.comment
            saveKey("COMMENT", name, uuid, position, value, comment)
        } else {
            let [name, value] = this.el.dataset.comment.split(/=(.*)/).slice(0, 2).map(p => (p.trim()))
            console.log(this.el.dataset.comment)
            let uuid = this.el.dataset.uuid
            let type = "KEY"
            let position = this.el.dataset.position
            // console.log(name, value)
            if (name && value) {
                saveKey(type, name, uuid, position, value)
            }

        }

    }
}

class EditorItem_Binds {
    constructor(name, uuid, value = null, comment = null, position = null) {
        if (!name.trim().startsWith("bind")) return console.warn(`Given json object is not sutable for this editor item:${name}=${value}`)
        const template = document.getElementById("keybind-template")
        this.el = template.content.firstElementChild.cloneNode(true)

        this.el.setAttribute("title", position)
        this.el.dataset.name = name
        // console.log(name, this.el.dataset.name)
        this.el.dataset.uuid = uuid
        this.el.dataset.value = value ?? ""
        this.el.dataset.comment = comment ?? ""
        this.el.dataset.position = position ?? ""
        this.el.dataset.type = "KEY"
        this.preview = ""
        this.initial_load = true
        this.saveDebounced = debounce(() => this.save(), 1000);

        let values = value.split(",", 4)
        // console.log(values)
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
                this.update()
                console.log(this.el.dataset.comment)
            }
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
        console.log(`Element with uuid ${this.el.dataset.uuid} changed to ${this.preview}`)
        let name = this.el.dataset.name
        let uuid = this.el.dataset.uuid
        let position = this.el.dataset.position
        let value = this.el.dataset.value
        let comment = this.el.dataset.comment
        let type = this.el.dataset.type
        saveKey(type, name, uuid, position, value, comment)
    }

}


/**
 * Description
 * @param {JSON} root
 * @param {String} path
 * @returns {JSON}
 */
function findParent(root, path) {
    let node = root
    for (let i = 1; i < path.length; i++) {
        const key = path[i]
        if (!node.children) {
            console.log(`Node ${node} has no children`)
            return null
        }
        node = node.children.find(child => child.name === key);
        if (!node) {
            console.log(`No parent node ${node} found`)
            return null
        }
    }
    return node
}
/**
 * Description
 * @param {String} type
 * @param {String} name
 * @param {String} uuid
 * @param {String} position
 * @param {String} value
 * @param {String} comment=null
 * @returns {any}
 */

function saveKey(type, name, uuid, position, value, comment = null) {
    let root = window.data
    let path = position.split(":")
    let parent = findParent(root, path)
    let node = parent.children.find(node => node.uuid === uuid)
    if (node && node.type === "KEY") {
        console.log(node)
        // console.log(parent.children.indexOf(node))
    }
    node["name"] = name
    node["type"] = type
    node["uuid"] = uuid
    node["position"] = position
    node["value"] = value
    if (comment) node["comment"] = comment

    window.jsViewer.data = window.data

    if (!window.dryrun) {
        console.log(`Node ${uuid} saved:`, node)
        window.pywebview.api.save_config(JSON.stringify(window.data))
    } else {
        console.log(`Node ${uuid} dryrun:`, node)
    }
}