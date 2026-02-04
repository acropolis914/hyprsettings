export default function normalizeText(s: string) {
	let sanitized = s
		.replaceAll(' ', '')
		.replaceAll('-', '')
		.replace('.md', '')
		.toLowerCase()
	return sanitized
}
