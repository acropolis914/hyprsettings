export function createOverlay() {
	const overlay = document.createElement("div");
	overlay.id = "dmenu-overlay";
	document.getElementById("content-area").appendChild(overlay);
}

export function destroyOverlay() {
	const overlays = document.querySelectorAll("#dmenu-overlay")
	try{
		overlays.forEach(overlay => {
			overlay.parentNode.removeChild(overlay);
		})
	} catch(err){

	}

}