// console-tap.js
;(function () {
	const orig = { ...console }

	async function ship(level, args) {
		//     try {
		//       await fetch("https://your-api.example.com/logs", {
		//         method: "POST",
		//         headers: { "Content-Type": "application/json" },
		//         body: JSON.stringify({
		//           level,
		//           ts: Date.now(),
		//           message: args.map(String).join(" "),
		//           args, // raw args if you want to parse server-side
		//         }),
		//       });
		//     } catch (e) {
		//       // optional: fail silently or fall back
		//     }
	}

	function wrap(name) {
		return function (...args) {
			ship(name, args) // intercept and send
			;(globalThis.capturedLogs ??= []).push({
				level: name,
				args,
				ts: Date.now(),
			}) // local capture
			orig[name].apply(console, args) // still print to the real console
		}
	}

	Object.assign(console, {
		log: wrap('log'),
		info: wrap('info'),
		warn: wrap('warn'),
		error: wrap('error'),
		debug: wrap('debug'),
	})

	globalThis.restoreConsoleTap = () => Object.assign(console, orig)
})()
