import { bindFlags, modkeys, dispatchers, dispatcherParams, noneDispatchers } from "./hyprland-specific/binds.js"
let keybindsTab = document.querySelector(".config-set#keybinds")

export class configRenderer {
    constructor(json) {
        this.json = json
        this.parse(this.json)
    }

    parse(json) {
        // console.log(json["name"], json["uuid"])
        if (json["type"] === "KEY" && json["name"].startsWith("bind")) {
            let keybind_item = new EditorItem_Binds(json["name"], json["uuid"], json["value"], json["comment"], json["position"])
            keybind_item.addToParent(keybindsTab)
        }
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
        this.preview = ""
        this.initial_load = true

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
            console.log("textarea edited")
            if (!initial_load) {
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
            console.log("textarea edited")
            if (!this.initial_load) {
                this.update()
            }
        })

        this.comment_el = this.el.querySelector(".comment")
        this.comment_el.value = comment ?? ""
        this.comment_el.addEventListener("input", () => {
            if (!this.initial_load) {
                this.update()
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
        this.el.dataset.comment = comment
        if (!this.initial_load) {
            this.save()
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
        saveKey(name, uuid, position, value, comment)
    }

}


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

function saveKey(name, uuid, position, value, comment = null) {
    let root = window.data
    let path = position.split(":")
    let parent = findParent(root, path)
    let node = parent.children.find(node => node.uuid === uuid)
    if (node && node.type === "KEY") {
        console.log(node)
        console.log(parent.children.indexOf(node))
    }
    node["name"] = name
    node["uuid"] = uuid
    node["position"] = position
    node["value"] = value
    if (comment) node["comment"] = comment
    console.log(`Node ${uuid} saved(dryrun):`, node)
    window.jsonViewer.data = window.data
}