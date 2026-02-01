#!/usr/bin/env bun
// For Node fallback, you can run `node script.js`

import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // Node fallback if fetch not global

// -------------------------
// Config
// -------------------------
const TARGET_DIR = "../src/hyprland-wiki-content"; // same target dir as content
const OUTPUT_FILE = path.join(TARGET_DIR, "navigation.txt");
const URL = "https://wiki.hypr.land";

// Ensure target dir exists
fs.mkdirSync(TARGET_DIR, { recursive: true });

(async () => {
	try {
		// Fetch HTML
		const res = await fetch(URL);
		const html = await res.text();

		// Parse DOM
		const dom = new JSDOM(html);
		const document = dom.window.document;

		// Extract sidebar headers
		const seen = new Set();
		const result = [];

		for (const li of document.querySelectorAll("li")) {
			const isParent = li.querySelector("li");

			const text = isParent
				? [...li.childNodes]
					.filter(
						n =>
							n.nodeType === 3 || // TEXT_NODE
							(n.nodeType === 1 && !n.querySelector("li"))
					)
					.map(n => n.textContent)
					.join(" ")
				: li.textContent;

			const clean = (isParent ? "▸ " : "") + text.replace(/\s+/g, " ").trim();

			if (seen.has(clean)) break; // stop at second duplicate
			seen.add(clean);
			result.push(clean);
		}

		// Write to navigation.txt
		fs.writeFileSync(OUTPUT_FILE, result.join("\n"), "utf-8");
		console.log(`✅ Navigation written to ${OUTPUT_FILE}`);
	} catch (err) {
		console.error("❌ Error fetching or parsing wiki:", err);
		process.exit(1);
	}
})();
