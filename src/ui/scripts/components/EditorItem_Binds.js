import { bindFlags, modkeys, dispatchers } from "../../hyprland-specific/hyprlandBindDefinitions.js";
import { ContextMenu } from "./contextMenu.js";
import { debounce, deleteKey, saveKey } from "../utils.js";

export class EditorItem_Binds {
	constructor(json, disabled = false, parent) {
		this.initial_load = true;
		let name = json["name"];
		let uuid = json["uuid"];
		let value = json["value"];
		let comment = json["comment"];
		let position = json["position"];
		if (!name.trim().startsWith("bind")) {
			return;
		}
		const template = document.getElementById("keybind-template");
		this.el = template.content.firstElementChild.cloneNode(true);
		// @ts-ignore
		if (window.config.compact) {
			this.el.classList.add("compact");
		}
		if (disabled) {
			this.el.classList.add("disabled");
		}
		this.el.title = position.replace("root:", "");
		this.el.dataset.name = name;
		this.el.dataset.uuid = uuid;
		this.el.dataset.value = value ?? "";
		this.el.dataset.comment = comment ?? "";
		this.el.dataset.position = position ?? "";
		this.el.dataset.disabled = disabled ?? false;
		this.el.dataset.type = "KEY";
		this.preview = "";
		this.contextMenu = new ContextMenu([
			{ label: "Add Above", icon: "󰅃", action: () => this.addAbove() },
			{ label: "Add Below", icon: "󰅀", action: () => this.addAbove() },
			{ label: "Toggle Disable", icon: "󰈉", action: () => this.disable() },
			{ label: "Delete Key", icon: "󰗩", action: () => this.delete() }
		]);
		this.el.appendChild(this.contextMenu.el);
		this.saveDebounced = debounce(() => this.save(), 100);

		let values = value.split(",", 4);
		const renderflags = {
			option: function (data, escape) {
				return `<div title="${data.description}">` + escape(data.text) + `</div>`;
			},
			item: function (data, escape) {
				return `<div title="${data.description}">` + escape(data.text) + `</div>`;
			}
		};

		//bindflags
		let bindflag_select_el = this.el.querySelector(".bindflags");
		let bindflag_additems = name.trim().substring(4).split("");
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
					this.update();
				}
			},
			render: renderflags
		});
		if (bindflag_additems.length == 0) {
			this.bindflagTS.addItem("");
		} else {
			bindflag_additems.forEach(element => {
				this.bindflagTS.addItem(element);
			});
		}

		//modkeys
		let modkey_select_el = this.el.querySelector(".modkey");
		this.modkeyTS = new TomSelect(modkey_select_el, {
			options: modkeys,
			create: true,
			highlight: false,
			valueField: "value",
			searchField: "text",
			onChange: (value) => {
				if (!this.initial_load) {
					this.update();
				}
			},
			render: renderflags,
		});
		let modkeys_additems = values[0].split(" ");
		modkeys_additems.forEach(element => {
			if (this.hasMod(element)) {
				this.modkeyTS.addItem(element);
			} else {
				this.modkeyTS.createItem(element);
			}
		});

		let key_el = this.el.querySelector(".keypress");
		key_el.textContent = values[1].trim();
		key_el.addEventListener("input", () => {
			//
			if (!this.initial_load) {
				this.update();
			}
		});

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
					this.update();
				}
			},
			render: renderflags
		});

		let dispatcher_additem = values[2].trim();
		if (this.hasDispatch(dispatcher_additem)) {
			this.dispatcherTS.addItem(dispatcher_additem);
		} else {
			this.dispatcherTS.createItem(dispatcher_additem);
		}

		let params_additem = values[3] ? values[3].trim() : null;
		// this.paramTS.createItem(params_additem)
		paramSelect_el.value = params_additem;
		paramSelect_el.addEventListener("input", () => {
			//
			if (!this.initial_load) {
				this.update();
			}
		});

		this.comment_el = this.el.querySelector(".comment");
		this.comment_el.value = comment ?? "";
		this.comment_el.addEventListener("input", () => {
			if (!this.initial_load) {
				this.el.dataset.comment = this.comment_el.value;
				this.update();
			}
		});
		if (parent) {
			this.addToParent(parent);
		}

		this.el.addEventListener("click", (e) => {
			this.el.classList.remove("compact");
			this.contextMenu.show();
		});
		this.el.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			this.contextMenu.show();
		});
		this.el.addEventListener("dblclick", (e) => {
			// let target = e.target()
			this.el.classList.toggle("compact");
			this.contextMenu.hide();
		});
		this.el.addEventListener("keydown", (e) => {
			// e.stopPropagation()
			if (e.key === "Enter") {
				this.el.classList.toggle("compact");
				this.contextMenu.show();
			}
			if (e.key === "Delete") {
				e.preventDefault();
				Array.from(this.contextMenu.el.children).forEach(element => {
					let label_el = element.querySelector(".ctx-button-label");
					if (label_el.textContent.toLowerCase().includes("delete")) {
						setTimeout(() => element.click(), 0);
					}
				});

			}
		});
		this.el.addEventListener("focus", (e) => {
			this.contextMenu.show();
		});
		this.el.addEventListener("blur", () => {
			this.contextMenu.hide();
		});
		this.update();
		this.initial_load = false;
	}

	update() {
		let bindFlags = this.bindflagTS.getValue();
		let bindflagString = Array.isArray(bindFlags) ? `bind${bindFlags.join("")}` : bindFlags;

		let modKeys = this.modkeyTS.getValue();
		let modKeyString = Array.isArray(modKeys) ? modKeys.join(" ") : modKeys;

		let keyPress = this.el.querySelector(".keypress").value;

		let disPatcherString = this.dispatcherTS.getValue();
		let paramString = this.el.querySelector(".params").value.trim();

		let preview_el = this.el.querySelector(".editor-item-preview");
		let comment = this.comment_el.value ? `# ${this.comment_el.value}` : "";
		preview_el.innerHTML = `<span id="key">${bindflagString}<span/> = <span id="value">${modKeyString}, ${keyPress}, ${disPatcherString}, ${paramString}<span/><i>${comment}</i>`;
		this.preview = `${bindflagString} = ${modKeyString}, ${keyPress}, ${disPatcherString}, ${paramString} ${comment}`;

		this.el.dataset.name = bindflagString;
		this.el.dataset.value = `${modKeyString}, ${keyPress}, ${disPatcherString}, ${paramString}`;

		let saved_comment = this.comment_el.value;
		this.el.dataset.comment = saved_comment;
		if (!this.initial_load) {
			this.saveDebounced();
		}
	}

	addToParent(parent) {
		parent.appendChild(this.el);
	}

	addAbove() {
	}
	delete() {
		deleteKey(this.el.dataset.uuid, this.el.dataset.position);
		this.el.remove();
	}

	disable() {
		if (this.el.dataset.disabled == "false") {
			this.el.dataset.disabled = true;
			this.el.classList.add("disabled");
			this.save();
		} else {
			this.el.dataset.disabled = false;
			this.el.classList.remove("disabled");
			this.save();
		}

	}

	hasMod(element) {
		for (const mod of modkeys) {
			if (mod.value.includes(element)) {
				return true;
			}
		}
		return false;
	}

	hasDispatch(element) {
		for (const dispatcher of dispatchers) {
			if (dispatcher.value.includes(element)) {
				return true;
			}
		}
		return false;
	}

	save() {
		let name = this.el.dataset.name;
		let uuid = this.el.dataset.uuid;
		let position = this.el.dataset.position;
		let value = this.el.dataset.value;
		const commentToSave = this.comment_el.value.trim() === "" ? null : this.comment_el.value;
		let type = this.el.dataset.type;
		let disabled = this.el.dataset.disabled === "true";
		saveKey(type, name, uuid, position, value, commentToSave, disabled);
	}
}
