export function createSwitchBox(defaultValue: boolean) {
	const wrapper = document.createElement('label')
	wrapper.classList.add('switch')

	const checkbox = document.createElement('input')
	checkbox.type = 'checkbox'
	checkbox.tabIndex = -1
	checkbox.checked = defaultValue

	const fakeSlider = document.createElement('span')
	fakeSlider.className = 'fake-slider'

	wrapper.appendChild(checkbox)
	wrapper.appendChild(fakeSlider)

	return { wrapper, checkbox }
}
