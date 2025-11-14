import { ContextMenu } from "./contextMenu.js";
import { addItem, debounce, deleteKey, saveKey } from "../utils.js";
import { GLOBAL } from "../GLOBAL.js";
import { findAdjacentConfigKeys, findConfigDescription } from "../../hyprland-specific/hyprland_config_descriptions.js";
import { EditorItem_Comments } from "./EditorItem_Comments.js";
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
export class EditorItem_Generic {
	constructor(json, disabled = false) {
		this.inital_load = true;
		let name = json["name"];
		let uuid = json["uuid"];
		let value = json["value"];
		let comment = json["comment"];
		let position = json["position"];
		this.saveDebounced = debounce(() => this.save(), 250);
		const template = document.getElementById("generic-template");
		this.el = template.content.firstElementChild.cloneNode(true);
		this.el.classList.add("editor-item");
		this.el.classList.add("editor-item-generic");
		if (GLOBAL["config"].compact) {
			this.el.classList.add("compact");
		}
		this.el.title = json["position"].replace("root:", "").replaceAll(":", "   ");
		this.el.dataset.name = name;
		this.el.dataset.uuid = uuid;
		this.el.dataset.value = value ?? "";
		this.el.dataset.comment = comment ?? "";
		this.el.dataset.position = position ?? "";
		this.el.dataset.disabled = disabled ? "true" : "false"; //lol vscode badly wants to be a string that's why 
		this.el.dataset.type = "KEY";
		if (disabled === true) {
			this.el.classList.add("disabled");
		}

		this.preview_el = this.el.querySelector(".editor-item-preview");

		this.genericEditor_el = this.el.querySelector(".generic-editor");
		this.genericEditor_el.innerHTML = "";
		this.keyEditor = document.createElement("textarea");
		this.keyEditor.rows = 1;
		this.keyEditor.id = "generic-key";
		this.config_position = position.split(":").slice(2).join(":")
		this.info = findConfigDescription(this.config_position, name)
		if (this.info) {
			if (this.info["type"] === "CONFIG_OPTION_INT" || this.info["type"] === "CONFIG_OPTION_FLOAT") {
				console.log(this.el.dataset.name, "is an int with range", this.info.data)
				const [defaultValue, min, max] = this.info["data"].split(",").map(item => item.trim())
				this.valueEditor = document.createElement("input")
				this.valueEditor.setAttribute("type", "range")
				this.valueEditor.setAttribute("min", min)
				this.valueEditor.setAttribute("max", max)
				const steps = this.info["type"] === "CONFIG_OPTION_INT" ? 1 : (max - min) / 100
				this.valueEditor.setAttribute("step", steps)
			}
			else {
				console.log(this.info["type"])
			}
		}
		if (!this.valueEditor) {

			this.valueEditor = document.createElement("textarea");
			this.valueEditor = document.createElement("textarea");
			this.valueEditor.rows = 1; this.valueEditor.rows = 1;
			if (this.info) {
				this.valueEditor.dataset.defaultData = this.info["data"]
			}

		}



		if (this.info) {
			let title = JSON.stringify(this.info["description"])
			let type = JSON.stringify(this.info["type"])
			this.valueEditor.title = `${JSON.parse(title)} || ${JSON.parse(type).replace("CONFIG_OPTION_", "")}`
		}


		this.valueEditor.id = "generic-value";
		if (name.startsWith("$") || name === "generic") {
			this.genericEditor_el.appendChild(this.keyEditor);
		}

		this.genericEditor_el.appendChild(this.valueEditor);
		this.keyEditor.value = name;
		this.valueEditor.value = value;
		this.commentArea = this.el.querySelector(".comment");
		this.commentArea.value = this.el.dataset.comment;

		let contextMenuItems = [
			{ label: "Comment Above", icon: "", action: () => this.add("COMMENT", false) },
			{ label: "Comment Below", icon: "", action: () => this.add("COMMENT", true) },
			{ label: "Add Above", icon: "󰅃", action: () => this.add("KEY", false) },
			{ label: "Add Below", icon: "󰅀", action: () => this.add("KEY", true) },
			{ label: "Toggle Disable", icon: "󰈉", action: () => this.disable() },
			{ label: "Delete Key", icon: "󰗩", action: () => this.delete() }
		]

		let contextMenuItem_reset = { label: "Reset to Default", icon: "", action: () => this.valueReset() }
		if (this.info) {
			contextMenuItems.splice(4, 0, contextMenuItem_reset)
		}

		this.contextMenu = new ContextMenu(contextMenuItems);
		this.el.appendChild(this.contextMenu.el);
		this.addListeners();
		this.update();
		this.inital_load = false;
	}

	update() {
		let name = this.keyEditor.value;
		let value = this.valueEditor.value;
		let comment = this.commentArea.value ? `# ${this.commentArea.value}` : "";
		this.preview_el.innerHTML = `<span id="key">${name} </span> <span id="value">${value}</span>&nbsp;<i>${comment}<i>`;
		if (!this.inital_load) {
			this.saveDebounced();
		}
	}
	addListeners() {
		this.el.addEventListener("click", (e) => {
			this.el.classList.remove("compact");
			this.contextMenu.show();
		});
		this.el.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			this.contextMenu.show();
		});
		this.el.addEventListener("dblclick", (e) => {
			this.el.classList.toggle("compact");
			this.contextMenu.hide();
		});
		this.el.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				this.el.classList.toggle("compact");
				this.contextMenu.el.classList.toggle("hidden");
			}
		});
		this.el.addEventListener("focus", (e) => {
			this.contextMenu.show();
		});
		this.el.addEventListener("blur", () => {
			this.contextMenu.hide();
			// this.el.classList.add("compact")
		});
		this.keyEditor.addEventListener("input", () => {
			this.el.dataset.name = this.keyEditor.value;
			this.update();
		});
		this.keyEditor.addEventListener("change", () => {
			this.el.dataset.name = this.keyEditor.value;
			this.update();
		});

		this.valueEditor.addEventListener("input", () => {
			this.el.dataset.value = this.valueEditor.value;
			this.update();
		});

		this.valueEditor.addEventListener("change", () => {
			this.el.dataset.value = this.valueEditor.value;
			this.update();
		});

		this.commentArea.addEventListener("input", () => {
			this.el.dataset.comment = this.commentArea.value;
			this.update();
		});

	}
	addToParent(parent) {
		parent.appendChild(this.el);
	}
	async add(type, below = true) {
		switch (type) {
			case ("KEY"):
				const existingSiblingKeys = Array.from(this.el.parentNode.children)
					.filter(el => el.classList.contains("editor-item-generic"))
					.map(el => el.dataset.name)
				// console.log(existingKeys)
				let availableKeys = findAdjacentConfigKeys(this.config_position, existingSiblingKeys) //TODO: Make a selector for this 
				let randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)]
				let name
				let value
				if (randomKey) {
					name = randomKey.name
					if (randomKey.type == "CONFIG_OPTION_INT" || (randomKey.data.includes(",") && randomKey.data.split(",").length === 3)) {
						value = randomKey["data"].split(",")[0].trim()
					} else {
						value = randomKey["data"]
					}
				}

				if (!name) {
					name = this.el.dataset.name
				}
				let newGenericItem = await addItem("KEY", name, value, "", this.el.dataset.position, this.el.dataset.uuid, below)
				let newGenericElement = new EditorItem_Generic({ name: newGenericItem["name"], uuid: newGenericItem["uuid"], value: newGenericItem["value"], comment: newGenericItem["comment"], position: this.el.dataset.position })
				if (below) {
					this.el.after(newGenericElement.el)
				} else {
					this.el.before(newGenericElement.el)
				}
				newGenericElement.save()
				break
			case ("COMMENT"):
				let newCommentItem = await addItem("COMMENT", "comment", "", "# New comment", this.el.dataset.position, this.el.dataset.uuid, below)
				let newCommentElement = new EditorItem_Comments({ name: newCommentItem["comment"], uuid: newCommentItem["uuid"], value: newCommentItem["value"], comment: newCommentItem["comment"], position: this.el.dataset.position }, false)
				if (below) {
					this.el.after(newCommentElement.el)
				} else {
					this.el.before(newCommentElement.el)
				}
				newCommentElement.save()
		}
	}
	valueReset() {
		if (this.info.type == "CONFIG_OPTION_INT" || (this.info.data.includes(",") && this.info.data.split(",").length === 3)) {
			this.valueEditor.value = this.info["data"].split(",")[0].trim()
		} else {
			this.valueEditor.value = this.info["data"]
		}
		this.el.dataset.value = this.valueEditor.value;
		this.update();
	}
	delete() {
		deleteKey(this.el.dataset.uuid, this.el.dataset.position);
		this.el.remove();
	}
	disable() {
		this.el.dataset.disabled = this.el.dataset.disabled === "true" ? "false" : "true";
		this.el.classList.toggle("disabled");
		this.saveDebounced();
	}

	save() {
		let type = this.el.dataset.type;
		let name = this.el.dataset.name;
		let uuid = this.el.dataset.uuid;
		let value = this.el.dataset.value;
		let comment = this.el.dataset.comment;
		let position = this.el.dataset.position;
		let disabled = this.el.dataset.disabled === "true" ? true : false;
		saveKey(type, name, uuid, position, value, comment, disabled);
	}
}
