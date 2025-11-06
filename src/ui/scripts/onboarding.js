import { saveConfig } from "./utils.js";

const onboardingUI = document.getElementById("onboarding");
const finishBtn = document.getElementById("onboarding-finish");
let isFading = false;

finishBtn.addEventListener("click", finishOnboarding);

onboardingUI.addEventListener("transitionend", () => {
	const opacity = parseFloat(getComputedStyle(onboardingUI).opacity);
	if (opacity === 0 && isFading) {
		isFading = false;
		onboardingUI.classList.add("hidden");
	}
});

function finishOnboarding() {
	if (isFading) return; // Prevent multiple clicks during fade
	isFading = true;
	console.log("finish onboarding");
	onboardingUI.style.opacity = 0;
	window.config["first_run"] = false;
	saveConfig();
}

// Explicitly show/hide with F1
document.addEventListener("keydown", (event) => {
	if (event.key === "F1") {
		event.preventDefault();

		const isHidden = onboardingUI.classList.contains("hidden");
		if (isHidden) {
			onboardingUI.classList.remove("hidden");
			onboardingUI.style.opacity = 1;
		} else {
			finishOnboarding();
		}
	}
});
