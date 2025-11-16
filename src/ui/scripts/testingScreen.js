let testingScreen = document.querySelector(".testing-screen")
let open = false
document.addEventListener('keydown', (event) => {
	if (event.key === 'F3') {
		event.preventDefault(); // stop browser's built-in search
		// setInterval(()=>{
		// 	testingScreen.style.opacity += open ? -0.001 : +0.001
		// }, 1)
		if (!open) {
			testingScreen.classList.remove("hidden")
		} else {
		testingScreen.classList.add("hidden")
		}
		open = !open


	}
});

testingScreen.addEventListener("transitionend", (e) => {
	if (e.propertyName === "opacity" && getComputedStyle(e.target).opacity === "0") {
		console.log("Element is now invisible");
		testingScreen.classList.add("hidden")
	} else if (e.propertyName === "opacity" && getComputedStyle(e.target).opacity > "0" && open) {

	}
});

