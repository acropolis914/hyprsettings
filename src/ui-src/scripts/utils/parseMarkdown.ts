import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"
import rehypeSanitize from "rehype-sanitize"
// import { shortcodes } from 'remark-hugo-shortcodes'
import remarkDirective from "remark-directive"
import { remarkObsidianAdmonitions } from "./markdown/remarkObsidianAdmonitions.ts"
import { remarkHugoTabsToDirectives } from "./markdown/remarkTabs"
import { remarkHugoDetailsToHTML } from "./markdown/remarkHugoDetails"

/* -----------------------------
 * Minimal frontmatter stripper
 * ----------------------------- */
function stripFrontmatter(input: string) {
	if (!input.startsWith("---\n")) return { matter: {}, content: input }

	const end = input.indexOf("\n---", 4)
	if (end === -1) return { matter: {}, content: input }

	const raw = input.slice(4, end).trim()
	const content = input.slice(end + 5)

	const matter: Record<string, string> = {}

	for (const line of raw.split("\n")) {
		const idx = line.indexOf(":")
		if (idx === -1) continue
		const key = line.slice(0, idx).trim()
		const value = line.slice(idx + 1).trim()
		matter[key] = value
	}

	return { matter, content }
}

/* -----------------------------
 * Main parseMarkdown function
 * ----------------------------- */
export default async function parseMarkdown(input: string) {
	const { matter, content } = stripFrontmatter(input)

	const processor = unified()
		.use(remarkParse)
		.use(remarkDirective)
		.use(remarkObsidianAdmonitions)
		.use(remarkHugoTabsToDirectives)
		.use(remarkHugoDetailsToHTML)
		.use(remarkFrontmatter) // keeps frontmatter node stripped
		.use(remarkGfm)
		.use(() => (_tree, file) => {
			file.data.matter = matter // inject stripped frontmatter
		})
		.use(remarkRehype)
		.use(rehypeStringify)
		// .use(shortcodes, { tokens: [["{{<", ">}}"]], inlineMode: true })
		// .use(rehypeSanitize)

	const file = await processor.process(content)
	return file
}
