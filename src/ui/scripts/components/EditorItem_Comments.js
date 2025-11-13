import { ContextMenu } from "./contextMenu.js";
import { debounce, deleteKey, saveKey } from "../utils.js";

export class EditorItem_Comments {
	constructor(json, hidden = false) {
		let comment = json["comment"];
		let uuid = json["uuid"];
		let position = json["position"];
		this.initial_load = true;
		this.el = document.createElement("div");
		this.el.dataset.name = "comment";
		this.el.dataset.comment = comment;
		this.el.dataset.uuid = uuid;
		this.el.dataset.position = position;
		// let [name, value] = this.el.dataset.comment.replace(/^[ #]+/, '').split(/=(.*)/).slice(0, 2).map(p => (p.trim()))
		// if (name && value){
		// }
		this.el.title = position.replace("root:", "").replaceAll(":", "   ");
		this.el.classList.add("editor-item");
		this.el.setAttribute("tabindex", 0);
		if (hidden) {
			this.el.classList.add("settings-hidden");
		}
		this.textarea = this.el.appendChild(document.createElement("textarea"));
		// this.textarea.contentEditable = "true"
		this.textarea.setAttribute("rows", "1");
		this.textarea.classList.add("editor-item-comment");
		this.textarea.value = comment;
		this.saveDebounced = debounce(() => this.save(), 100);
		this.textarea.addEventListener("input", () => this.update());
		this.contextMenu = new ContextMenu([
			{ label: "Add Above", icon: "󰅃", action: () => this.addAbove() },
			{ label: "Add Below", icon: "󰅀", action: () => this.addAbove() },
			{ label: "Delete Key", icon: "󰗩", action: () => this.delete() }
		]);
		this.el.appendChild(this.contextMenu.el);
		this.addListeners();

		this.initial_load = false;
	}

	update() {
		this.el.dataset.comment = this.textarea.value;
		if (!this.initial_load) {
			this.saveDebounced();
		}

	}
	addListeners() {
		this.el.addEventListener("click", (e) => {
			this.contextMenu.show();
		});
		this.el.addEventListener("contextmenu", (e) => {
			e.preventDefault();

			this.contextMenu.show();
		});
		this.el.addEventListener("dblclick", (e) => {
			this.contextMenu.hide();
		});
		this.el.addEventListener("keydown", (e) => {
			let editing = false;
			if (e.key === "Enter") {
				if (!editing) {
					e.preventDefault();
					setTimeout(() => this.textarea.focus(), 0);
					editing = true;
					this.contextMenu.show();
				} else {
					this.textarea.blur();
					this.el.focus();
					editing = !editing;
				}
			}
			if (e.key === "Escape") {
				e.preventDefault();
				const editorItem = this.textarea.closest(".editor-item");
				editorItem.focus();
				editing = false;
				this.textarea.blur();
			}
			if (e.key === "ArrowDown") {
				// this.el.classList.toggle("compact")
				e.preventDefault();
				// this.textarea.blur()
				this.contextMenu.show();

			}
		});
		this.textarea.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				this.el.focus();
				// this.textarea.blur()
			}
			//testing signed commit
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				this.el.focus();
			}
		});
		this.el.addEventListener("focus", (e) => {
			this.contextMenu.show();
		});
	}
	addToParent(parent) {
		parent.appendChild(this.el);
	}
	delete() {
		deleteKey(this.el.dataset.uuid, this.el.dataset.position);
		this.el.remove();
	}
	save() {
		if (!this.el.dataset.comment.trim().startsWith("#") && this.el.dataset.comment.split("=").length > 1) {
			console.log("detected comment to key transformation");
			let [name, value] = this.el.dataset.comment.split(/=(.*)/).slice(0, 2).map(p => (p.trim()));
			let [new_value, comment] = value.split(/#(.*)/).slice(0, 2).map(p => (p.trim()));
			let uuid = this.el.dataset.uuid;
			let type = "KEY";
			let position = this.el.dataset.position;
			if (name && value) {
				saveKey(type, name, uuid, position, value, comment = comment, false);
			}
		}
		else {
			let type = "COMMENT";
			let name = this.el.dataset.name;
			let uuid = this.el.dataset.uuid;
			let position = this.el.dataset.position;
			let value = null;
			let comment
			if(!this.el.dataset.comment.trim().startsWith("#")){
				comment = `# ${this.el.dataset.comment}`;
			} else {
				comment = this.el.dataset.comment
			}
			saveKey(type, name, uuid, position, value, comment, false);
		}
	}
}
