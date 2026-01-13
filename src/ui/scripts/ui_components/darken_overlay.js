export function createOverlay() {
	const overlay = document.createElement("div");
	overlay.id = "dmenu-overlay";
	document.getElementById("content-area").appendChild(overlay);
}

export function destroyOverlay() {
	const overlay = document.getElementById("dmenu-overlay")
	try{
		overlay.parentNode.removeChild(overlay);
	} catch(err){

	}

}