import { saveConfig } from "./utils.js";

let onboardingUI = document.getElementById("onboarding")

document.getElementById("onboarding-finish").addEventListener("click", () => {
	finishOnboarding()
})

onboardingUI.addEventListener("transitionend", () => {
	const opacity = parseFloat(getComputedStyle(onboardingUI).opacity);
	if (opacity === 0) {
		setTimeout(() => onboardingUI.classList.add("hidden"), 1000);
	}
});


function finishOnboarding() {
	console.log("click")
	onboardingUI.style.opacity = 0
	window.config["first_run"] = false
	saveConfig()
}