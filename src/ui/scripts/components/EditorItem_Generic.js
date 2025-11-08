import { ContextMenu } from "./contextMenu.js";
import { debounce, deleteKey, saveKey } from "../utils.js";

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
		if (window.config.compact) {
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
		this.valueEditor = document.createElement("textarea");
		this.valueEditor.rows = 1;
		this.valueEditor.id = "generic-value";
		if (name.startsWith("$")) {
			this.genericEditor_el.appendChild(this.keyEditor);
		}

		this.genericEditor_el.appendChild(this.valueEditor);
		this.keyEditor.value = name;
		this.valueEditor.value = value;
		this.commentArea = this.el.querySelector(".comment");
		this.commentArea.value = this.el.dataset.comment;



		this.contextMenu = new ContextMenu([
			{ label: "Add Above", icon: "󰅃", action: () => this.addAbove() },
			{ label: "Add Below", icon: "󰅀", action: () => this.addAbove() },
			{ label: "Toggle Disable", icon: "󰈉", action: () => this.disable() },
			{ label: "Delete Key", icon: "󰗩", action: () => this.delete() }
		]);
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
		this.valueEditor.addEventListener("input", () => {
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
	addAbove() {
	}
	addBelow(){
		
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
