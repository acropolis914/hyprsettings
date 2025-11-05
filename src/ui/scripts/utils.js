export async function waitFor(check, { interval = 50, timeout = 10000 } = {}) {
	const start = Date.now()
	while (!check()) {
		if (Date.now() - start > timeout) throw new Error('Timeout waiting for condition')
		await new Promise(r => setTimeout(r, interval))
	}
}

export const debounce = (fn, wait = 100) => {
	let timeout;
	return function (...args) {
		const context = this;
		clearTimeout(timeout);
		timeout = setTimeout(() => fn.apply(context, args), wait);
	};
};

export function hideAllContextMenus() {
	console.log("hiding all ctx")
	document.querySelectorAll(".context-menu").forEach((ctx) => {
		ctx.style.opacity = 0
		console.log("hid this ctx")
	})
}
/**
 * Description
 * @param {JSON} root
 * @param {String} path
 * @returns {JSON}
 */
function findParent(root, path) {
	let node = root;
	for (let i = 1; i < path.length; i++) {
		const key = path[i];
		if (!node.children) {
			console.log(`Node ${node} has no children`);
			return null;
		}
		node = node.children.find(child => child.name === key);
		if (!node) {
			console.log(`No parent node ${node} found`);
			return null;
		}
	}
	return node;
}
/**
 * Description
 * @param {String} type
 * @param {String} name
 * @param {String} uuid
 * @param {String} position
 * @param {String} value
 * @param {String} comment=null
 * @param {Boolean} disabled=false
 * @returns {any}
 */
export function saveKey(type, name, uuid, position, value, comment = null, disabled = false) {
	let root = window.data;
	let path = position.split(":");
	let parent = findParent(root, path);
	let node = parent.children.find(node => node.uuid === uuid);
	if (node && node.type === "KEY") {
		// console.log(node)
		// console.log(parent.children.indexOf(node))
	}
	node["name"] = name;
	node["type"] = type;
	node["uuid"] = uuid;
	node["position"] = position;
	node["value"] = value;
	if (disabled) {
		node["disabled"] = true;
	} else {
		node["disabled"] = false;
	}
	if (comment) {
		node["comment"] = comment;
	} else if (node.hasOwnProperty("comment")) {
		delete node["comment"];
	}

	window.jsViewer.data = window.data;

	if (!window.config.dryrun) {
		console.log(`Node ${uuid} saved:`, node);
		window.pywebview.api.save_config(JSON.stringify(window.data));
	} else {
		console.log(`Dryrun save ${uuid}:`, node);
	}
}

export function deleteKey(uuid, position) {
	console.log(`Deleting ${position} => with uuid ${uuid}`)
	let root = window.data;
	let path = position.split(":");
	let parent = findParent(root, path);
	let node = parent.children.find(node => node.uuid === uuid);
	let nodeIndex = parent.children.findIndex(node => node.uuid === uuid);
	if (!window.config.dryrun) {
		console.log(`Node ${uuid} deleted:`, node);
		parent.children.splice(nodeIndex, 1)
		window.pywebview.api.save_config(JSON.stringify(window.data));
		window.jsViewer.data = window.data;
	} else {
		console.log(`Dryrun delete ${uuid}:`, node);
	}
}

export async function saveConfig() {
	try {
		await window.pywebview.api.save_window_config(JSON.stringify(window.config))
	} catch (err) {
		console.error("Failed to save config:", err)
	}
}