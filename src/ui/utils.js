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