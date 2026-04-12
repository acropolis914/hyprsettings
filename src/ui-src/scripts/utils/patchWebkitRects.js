;(function patchWebKitLayoutRects() {
	const isWebKit = /AppleWebKit/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg/i.test(navigator.userAgent)
	if (!isWebKit) return

	// Cache the original native functions
	const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect
	const originalGetClientRects = Element.prototype.getClientRects

	function getZoom() {
		const computed = getComputedStyle(document.documentElement)
		return parseFloat(computed.zoom) || parseFloat(computed.getPropertyValue('--zoom-factor')) || 1
	}

	function scaleRect(rect, zoom) {
		if (zoom === 1) return rect

		// NOTE: Depending on where the CSS `zoom` is applied (body vs container),
		// WebKit might require dividing instead of multiplying here.
		// If * zoom makes it worse, change this to 1 / zoom.
		const scale = zoom

		// We return a plain object that perfectly mimics a DOMRect.
		// We can't easily construct a native DOMRect without a DOMMatrix,
		// but libraries only check for these specific properties anyway.
		return {
			x: rect.x * scale,
			y: rect.y * scale,
			width: rect.width * scale,
			height: rect.height * scale,
			top: rect.top * scale,
			right: rect.right * scale,
			bottom: rect.bottom * scale,
			left: rect.left * scale,
			toJSON: () => rect.toJSON(),
		}
	}

	// 1. Patch the main layout rect getter
	Element.prototype.getBoundingClientRect = function () {
		// Call the original native method first
		const rect = originalGetBoundingClientRect.call(this)
		return scaleRect(rect, getZoom())
	}

	// 2. Patch getClientRects (crucial for inline elements and SVG text)
	Element.prototype.getClientRects = function () {
		const rects = originalGetClientRects.call(this)
		const zoom = getZoom()
		if (zoom === 1) return rects

		// getClientRects returns a DOMRectList, which is array-like.
		// We have to map it into a standard array of scaled rects.
		const scaledRects = []
		for (let i = 0; i < rects.length; i++) {
			scaledRects.push(scaleRect(rects[i], zoom))
		}

		// Add item() method to perfectly mimic DOMRectList
		scaledRects.item = function (index) {
			return this[index] || null
		}

		return scaledRects
	}
})()
