import Fuse from '../jslib/fuse.basic.min.mjs'
import { GLOBAL } from '../GLOBAL.js'
import { createOverlay, destroyOverlay } from './darken_overlay.js'

let searchBar
let searchResultEl

export async function initializeSearchBar() {
	searchBar = document.getElementById('search-bar')
	searchResultEl = document.querySelector('#results')

	function search() {
		searchResultEl.style.display = 'flex'
		searchResultEl.innerHTML = ''

		const resultsPool = []
		let searchItems = document.querySelectorAll('.editor-item')
		searchItems.forEach((item) => {
			let itemProps = { ...item.dataset }
			if (item.classList.contains('config-group')) {
				itemProps['type'] = 'GROUP'
			}
			if (item.classList.contains('wiki-item')) {
				itemProps['type'] = 'WIKI'
				if (itemProps.name.startsWith('_')) {
					itemProps.name = 'Wiki Homepage'
					itemProps.cleanName = 'Wiki Homepage'
				}
				let html_string = JSON.parse(itemProps.value).value
				let text_string = new DOMParser().parseFromString(
					html_string,
					'text/html',
				).body.textContent
				itemProps['value'] = text_string
			}
			if (
				itemProps.type === 'COMMENT' &&
				itemProps.comment.trim().startsWith('#####')
			) {
				return
			}
			resultsPool.push(itemProps)
			// if (item.dataset.type === 'GROUP') {
			// 	console.log(itemProps)
			// }
		})
		// console.log(resultsPool)
		const fuse = new Fuse(resultsPool, {
			keys: [
				'name',
				'value',
				'comment',
				'position',
				'type',
				'cleanName',
			],
			ignoreLocation: true,
			threshold: 0.4,
		})

		const results = fuse.search(searchBar.value)
		results.forEach((result) => {
			const resultDiv = document.createElement('div')
			resultDiv.classList.add('result')
			resultDiv.setAttribute('tabindex', '0')
			const configLineDiv = document.createElement('div')
			configLineDiv.classList.add('config-line')
			if (!result.item.name || !result.item.type) {
				return
			}
			if (result.item.type.toLowerCase() === 'comment') {
				configLineDiv.innerHTML = `
				  <span class="comment">${result.item.comment || ''}</span>
				`
			} else if (result.item.type.toLowerCase() === 'key') {
				configLineDiv.innerHTML = `
				  <span class="name">${result.item.name}</span>&nbsp;&nbsp;</br>
				  <span class="value">${result.item.value}</span>&nbsp;</br>
				  <span class="comment" style ="font-size:1.2rem">${result.item.comment || ''}</span>
				`
			} else if (result.item.type.toLowerCase() === 'group') {
				configLineDiv.innerHTML = `Group: <span class="name">${result.item.name}</span>`
			} else if (result.item.type.toLowerCase() === 'wiki') {
				configLineDiv.innerHTML = `
				<span class="wiki">${result.item.cleanName}</span>`
			}

			const locationDiv = document.createElement('div')
			locationDiv.className = 'location'
			try {
				let slices = 1
				result.item.type === 'WIKI' ? (slices = 0) : 1
				locationDiv.innerHTML = `${result.item.position.split(':').slice(slices).join(' 󰄾 ')}`
			} catch (e) {
				console.error(e, result.item)
			}

			resultDiv.appendChild(configLineDiv)
			resultDiv.appendChild(locationDiv)

			if (result.item.type.toLowerCase() === 'wiki') {
				resultDiv.addEventListener('click', (e) => {
					const wikiView = document.getElementById('wikiView')
					searchAndScroll(wikiView, searchBar.value)
				})
			}

			resultDiv.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					let goto = document.querySelector(
						`.editor-item[data-uuid="${result.item.uuid}"]`,
					)
					goto.scrollIntoView({
						behavior: 'smooth',
						block: 'center',
					})
					resultDiv.click()
				}
				if (e.key === 'ArrowDown') {
					e.preventDefault()
					// console.log('ArrowDown is clicked finding next element')
					let next = resultDiv.nextElementSibling
					while (next && next.tagName !== 'DIV') {
						next = next.nextElementSibling
					}
					if (!next) {
						next = resultDiv.parentElement.firstElementChild
					}
					resultDiv.classList.remove('selected')
					next.focus({ preventScroll: true })
				}
				if (e.key === 'ArrowUp') {
					e.preventDefault()
					console.log(
						'ArrowDown is clicked finding next element',
					)
					let previous = resultDiv.previousElementSibling
					while (previous && previous.tagName !== 'DIV') {
						previous = previous.previousElementSibling
					}
					if (!previous) {
						previous =
							resultDiv.parentElement.lastElementChild
					}
					resultDiv.classList.remove('selected')
					console.debug('Next element is focused')
					previous.focus({ preventScroll: true })
				}
			})
			resultDiv.addEventListener('click', (e) => {
				let goto = document.querySelector(
					`.editor-item[data-uuid="${result.item.uuid}"]`,
				)
				let closest = goto.closest('.config-set').id
				// console.log(closest)
				document.querySelector(`aside>ul>li#${closest}`).click()
				// console.debug(goto)
				goto.scrollIntoView({ behavior: 'smooth', block: 'center' })
				// goto.click()
				// goto.style.outline = '1px solid red'

				goto.focus()
				goto.click()
				if (GLOBAL.config.ui_animations) {
					goto.style.scale = '1.03'
					setTimeout(() => {
						goto.style.outline = '0px solid red'
						goto.style.scale = '1.0'
					}, 300)
				}
				cleanUp()
			})

			resultDiv.addEventListener('focus', (e) => {
				resultDiv.classList.add('selected')
				resultDiv.scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
				})
			})

			searchResultEl.appendChild(resultDiv)
		})
		if (results.length === 0 && searchBar.value) {
			searchResultEl.innerHTML = 'No results found.'
		} else if (searchBar.value === '') {
			searchResultEl.innerHTML = 'Type anything to search'
		}
	}

	searchBar.addEventListener('input', (e) => {
		searchResultEl.style.display = 'flex'
		search()
	})

	searchBar.addEventListener('click', (e) => {
		e.stopPropagation()
		GLOBAL['previousView'] = GLOBAL['currentView']
		GLOBAL['currentView'] = 'search'
		searchResultEl.style.display = 'flex'
		createOverlay()
		search()
	})

	searchBar.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			e.preventDefault()
			cleanUp()
		}
		if (e.key === 'Enter') {
			searchResultEl.firstChild.click()
		}
		if (e.key === 'ArrowDown') {
			searchResultEl.firstChild.focus()
		}
	})
	searchResultEl.addEventListener('focus', (e) => {
		GLOBAL['currentView'] = 'search'
		searchResultEl.style.display = 'flex'
	})
	searchResultEl.addEventListener('keydown', (e) => {
		if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
			e.preventDefault()
		}

		if (/^[a-zA-Z_.]$/.test(e.key)) {
			e.preventDefault()
			searchBar.focus()
			searchBar.value += e.key
		}
		if (e.key === 'Escape') {
			cleanUp()
		}
	})
	document.addEventListener('click', (e) => {
		let clickedInsideSearchbar = searchBar.contains(e.target)
		let clickedInsideSearchResults = searchResultEl.contains(e.target)
		if (
			!clickedInsideSearchbar &&
			!clickedInsideSearchResults &&
			GLOBAL['currentView'] === 'search'
		) {
			cleanUp()
		}

		// GLOBAL['currentView'] = GLOBAL['previousView']
	})
	hotkeys('*', (event) => {
		const pressedKey = event.key
		const target = event.target
	})
	function cleanUp() {
		searchResultEl.style.display = 'none'
		searchBar.value = ''
		searchBar.blur()
		destroyOverlay()
		// console.log(GLOBAL['currentView'])
		if (GLOBAL['previousView']) {
			GLOBAL['currentView'] = GLOBAL['previousView']
			GLOBAL['previousView'] = 'search'
		}
		// console.log(GLOBAL['currentView'])
	}
}

const searchAndScroll = (container, query) => {
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
	let bestMatch = null
	let highestScore = -1

	while (walker.nextNode()) {
		const text = walker.currentNode.textContent.toLowerCase()
		const search = query.toLowerCase()

		// Minimal scoring: does it include it, or how many chars overlap?
		if (text.includes(search)) {
			bestMatch = walker.currentNode.parentElement
			break // Exact(ish) match found, stop early
		}
	}

	if (bestMatch) {
		bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' })
		bestMatch.style.backgroundColor = 'yellow' // Quick highlight
		setTimeout(() => (bestMatch.style.backgroundColor = ''), 2000)
	}
}
