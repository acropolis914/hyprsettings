let testingScreen = document.querySelector(".testing-screen")
document.addEventListener('keydown', (event) => {
	if (event.key === 'F3') {
		event.preventDefault(); // stop browser's built-in search
		testingScreen.classList.toggle("hidden")
	}
});