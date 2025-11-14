export class ConfigGroup {
	constructor(json) {
		this.group_el = document.createElement("div");
		this.group_el.classList.add("config-group");
		this.group_el.setAttribute("tabindex", "0");
		this.group_el.classList.add("editor-item");
		this.group_el.dataset.name = json["name"];
		this.group_el.dataset.uuid = json["uuid"];
		this.group_el.dataset.postion = json["position"];
		this.group_el.setAttribute("title", json["position"].replace("root:", ""));
		if (json["comment"]) {
			this.group_el.dataset.comment = json["comment"];
		}
		this.group_el.addEventListener("keydown", (e) => {
			if (e.key == "Enter") {
				e.preventDefault()
				// this.group_el.querySelector(".editor-item").focus();
				const firstChild = Array.from(this.group_el.children).find(child => child.classList.contains('editor-item'))
				firstChild.click()
				console.log(firstChild)
				console.log("Group is entered");
			}
		});
	}

	return() {
		return this.group_el;
	}
}
