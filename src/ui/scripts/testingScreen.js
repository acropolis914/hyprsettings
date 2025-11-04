let testingScreen = document.querySelector(".testing-screen")
let open = false
document.addEventListener('keydown', (event) => {
	if (event.key === 'F3') {
		event.preventDefault(); // stop browser's built-in search
		testingScreen.style.opacity = open ? 0 : 1
		open = !open
		testingScreen.classList.remove("hidden")
	}
});

testingScreen.addEventListener("transitionend", (e) => {
	if (e.propertyName === "opacity" && getComputedStyle(e.target).opacity === "0") {
		console.log("Element is now invisible");
		testingScreen.classList.add("hidden")
	}
});
