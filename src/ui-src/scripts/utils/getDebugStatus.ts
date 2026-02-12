import { GLOBAL } from '../GLOBAL.ts'
import { Backend } from './backendAPI'
// Backend

export default async function getDebugStatus() {
	let debugIndicator = document.getElementById('debug-indicator')
	let isDebug: boolean
	try {
		console.log('Contacting backend if debug mode is on')
		isDebug = await Backend.getDebugStatus()
	} catch (e) {
		console.log('Error while contacting backend: ', e)
		isDebug = false
	}
	GLOBAL.setKey('isDebugging', isDebug)
	if (isDebug) {
		console.info('Debug mode is turned on.')
		debugIndicator.classList.remove('hidden')
	} else {
		debugIndicator.classList.add('hidden')
		console.info('Debug mode is turned off.')
	}
}
