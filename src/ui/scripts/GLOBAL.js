export class GLOBAL {
	static _listeners = new Map(); // key → array of callbacks

	static onChange(key, callback) {
		if (!this._listeners.has(key)) {
			this._listeners.set(key, []);
		}
		this._listeners.get(key).push(callback);
	}

	static setKey(key, value) {
		if (this[key] === value) return;

		this[key] = value;

		const list = this._listeners.get(key);
		if (list) {
			for (const fn of list) fn(value);
		}
	}
}


