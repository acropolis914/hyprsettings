import { dispatcherParams, noneDispatchers } from "../hyprland-specific/binds.js"
import { hideAllContextMenus, waitFor } from "./utils.js"
import { EditorItem_Generic } from "./components/EditorItem_Generic.js";
import { EditorItem_Comments } from "./components/EditorItem_Comments.js";
import { EditorItem_Binds } from "./components/EditorItem_Binds.js";
import { tabids, keyNameStarts, configGroups } from "./configMap.js";
import { ConfigGroup } from "./components/ConfigGroup.js";


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
                let group_el = new ConfigGroup(json).return()

                let matched
                for (const [key, value] of configGroups) {
                    if (json.name.trim().startsWith(key)) {
                        document.querySelector(`.config-set#${value}`).appendChild(group_el)
                        matched = true
                        break
                    }
                }
                if (!matched) {
                    this.current_container.at(-1).appendChild(group_el)
                }
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


