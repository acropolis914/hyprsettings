import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkFrontmatter from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import {matter} from  "vfile-matter"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { shortcodes } from 'remark-hugo-shortcodes'
import remarkDirective from "remark-directive"
import { remarkObsidianAdmonitions } from "./markdown/remarkObsidianAdmonitions.ts"
import { remarkHugoTabsToDirectives } from "./markdown/remarkTabs"

export default async function parseMarkdown(input: string) {
	// console.log("parseMarkdown")
	const processor = unified()
		.use(remarkParse).use(remarkDirective)
		.use(remarkObsidianAdmonitions)
		.use(remarkHugoTabsToDirectives)
		.use(remarkFrontmatter)
		.use(remarkGfm)
		.use(() => (tree, file) => {
			matter(file)              // ← parses YAML
		})
		.use(remarkRehype)
		.use(rehypeStringify)
		// .use(shortcodes, {
		// 	tokens: [["{{<", ">}}"]],
		// 	inlineMode: true
		// })
		// .use(rehypeSanitize)

	const file = await processor.process(input)
	// console.log("parseMarkdown", file)
	// console.log("parseMarkdownDone")
	return file
}
