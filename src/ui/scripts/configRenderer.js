
import { hideAllContextMenus, waitFor } from "./utils.js"
import { EditorItem_Generic } from "./components/EditorItem_Generic.js";
import { EditorItem_Comments } from "./components/EditorItem_Comments.js";
import { EditorItem_Binds } from "./components/EditorItem_Binds.js";
import { tabids, keyNameStarts, configGroups } from "./configMap.js";
import { ConfigGroup } from "./components/ConfigGroup.js";
import { GLOBAL } from "./GLOBAL.js";

export class configRenderer {
    constructor(json) {
        this.json = json
        this.current_container = []
        this.current_container.push(document.querySelector(".config-set#general"))
        this.comment_stack = [] //for the block comments
        this.comment_queue = []
        this.group_stack = []
        this.parse(this.json)
        document.querySelectorAll(".editor-item").forEach((element) => {
            element.addEventListener("click", (e) => {
                let target = e.target
                GLOBAL.setKey("currentView", "main")
                GLOBAL["mainFocus"][GLOBAL["activeTab"]] = element.dataset.uuid
            })

        }) //maybe I can instead check for focuswithin
    }

    async parse(json) {
        //Comment Stacking for three line label comments from default hyprland.conf
        if (json["type"] === "COMMENT" && json["comment"].startsWith("####") && (this.comment_stack.length == 0 || this.comment_stack.length == 2)) {
            this.comment_stack.push(json)
            // @ts-ignore
            if (this.comment_stack.length === 3) {
                for (let i = 0; i < this.comment_stack.length; i++) {
                    let comment_item = new EditorItem_Comments(this.comment_stack[i])
                    comment_item.el.classList.add("block-comment")
                    if (!GLOBAL["config"]["show_header_comments"]) {
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
        //inline comments
        else if (json["type"] === "COMMENT") {
            if (this.comment_stack.length > 0) { //catch for when there is a comment stack that didnt end
                for (let i = 0; i < this.comment_stack.length; i++) {
                    let comment_item = new EditorItem_Comments(this.comment_stack[i])
                    //
                    comment_item.el.classList.add("block-comment")
                    if (!GLOBAL["config"]["show_header_comments"]) {
                        comment_item.el.classList.add("settings-hidden")
                    }

                    comment_item.addToParent(this.current_container.at(-1))
                }
                this.comment_stack = []
            }
            let comment_item = new EditorItem_Comments(json, false)
            this.comment_queue.push(comment_item)
            if (this.comment_queue.length > 1) {
                for (let i = 0; i < this.comment_queue.length - 1; i++) {
                    comment_item = this.comment_queue[0]
                    comment_item.addToParent(this.current_container.at(-1))
                    this.comment_queue.splice(0, 1)
                }
            }
        }

        else if (json["type"] === "BLANK") {
            if (this.comment_queue.length > 0) {
                for (let i = 0; i < this.comment_queue.length; i++) {
                    let comment_item = this.comment_queue[0]
                    comment_item.addToParent(this.current_container.at(-1))
                    this.comment_queue.splice(0, 1)
                }
            }
            // let blankline = document.createElement("div")
            // blankline.classList.add("blank-line")
            // blankline.textContent = "THIS IS A BLANK LINE"
            // this.current_container.at(-1).appendChild(blankline)
        } //fugly

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
            let genericItem
            if (json["name"].startsWith("bind")) {
                genericItem = new EditorItem_Binds(json, json["disabled"])
            } else {
                genericItem = new EditorItem_Generic(json, json["disabled"])
            }

            let tabToAddTo
            for (const [key, value, exclude] of keyNameStarts) {
                let excluded = exclude ? exclude : []
                if (json.name.trim().startsWith(key) && !excluded.includes(json.name.trim())) {
                    tabToAddTo = document.querySelector(`.config-set#${value}`)
                    if (json.name.startsWith("bind")) {
                        console.log()
                    }
                    break
                }
            }
            if (!tabToAddTo) {
                tabToAddTo = this.current_container.at(-1)
            }
            if (this.comment_queue.length > 0) {
                // console.log("A new key is being added with comment", genericItem.name)
                this.comment_queue.forEach(commentEl => {
                    commentEl.addToParent(tabToAddTo)
                    this.comment_queue.pop()
                })
            }
            genericItem.el.addEventListener("focus", () => {
                GLOBAL["mainFocus"][GLOBAL["activeTab"]] = genericItem.el.dataset.uuid
            })
            genericItem.addToParent(tabToAddTo)
        }

        //recursive children rendering

        if (json["children"]) {
            for (const child of json.children) {
                this.parse(child)
            }
        }



    }
}


