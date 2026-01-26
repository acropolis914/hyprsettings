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
		searchItems.forEach(item => {
			let itemProps = { ...item.dataset }
			if (item.classList.contains('config-group')) {
				itemProps['type'] = 'GROUP'
			}
			if (itemProps.type === 'COMMENT' && itemProps.comment.trim().startsWith('#####')) {
				return
			}
			resultsPool.push(itemProps)
			// if (item.dataset.type === 'GROUP') {
			// 	console.log(itemProps)
			// }
		})
		// console.log(resultsPool)
		const fuse = new Fuse(resultsPool, {
			keys: ['name', 'value', 'comment', 'position']
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
			} else {
				configLineDiv.innerHTML = `Group: <span class="name">${result.item.name}</span>`
			}

			const locationDiv = document.createElement('div')
			locationDiv.className = 'location'
			try {
				locationDiv.innerHTML = `${result.item.position.split(':').slice(1).join(' 󰄾 ')}`
			} catch (e) {
				console.error(e, result.item)
			}

			resultDiv.appendChild(configLineDiv)
			resultDiv.appendChild(locationDiv)

			resultDiv.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					let goto = document.querySelector(`.editor-item[data-uuid="${result.item.uuid}"]`)
					goto.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
					console.log('ArrowDown is clicked finding next element')
					let previous = resultDiv.previousElementSibling
					while (previous && previous.tagName !== 'DIV') {
						previous = previous.previousElementSibling
					}
					if (!previous) {
						previous = resultDiv.parentElement.lastElementChild
					}
					resultDiv.classList.remove('selected')
					console.debug('Next element is focused')
					previous.focus({ preventScroll: true })

				}
			})
			resultDiv.addEventListener('click', (e) => {
				let goto = document.querySelector(`.editor-item[data-uuid="${result.item.uuid}"]`)
				let closest = goto.closest('.config-set').id
				console.log(closest)
				document.querySelector(`aside>ul>li#${closest}`).click()
				console.debug(goto)
				goto.scrollIntoView({ behavior: 'smooth', block: 'center' })
				// goto.click()
				// goto.style.outline = '1px solid red'

				goto.focus()
				goto.click()
				if (GLOBAL.config.ui_animations) {
					goto.style.scale = '1.02'
					setTimeout(() => {
						goto.style.outline = '0px solid red'
						goto.style.scale = '1.0'
					}, 200)
				}
				cleanUp()
				searchResultEl.style.display = 'none'
				searchResultEl.innerHTML = ''
				searchBar.value = ''
			})

			resultDiv.addEventListener('focus', (e) => {
				resultDiv.classList.add('selected')
				resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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
			e.preventDefault();
			searchBar.focus();
			searchBar.value += e.key;
		}
		if (e.key === 'Escape') {
			cleanUp()
		}
	})
	document.addEventListener('click', (e) => {
		let clickedInsideSearchbar = searchBar.contains(e.target)
		let clickedInsideSearchResults = searchResultEl.contains(e.target)
		if (!clickedInsideSearchbar && !clickedInsideSearchResults && GLOBAL['currentView'] === 'search') {
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
