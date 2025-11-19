import Fuse from '../jslib/fuse.basic.min.mjs'
import { GLOBAL } from '../GLOBAL.js'

let searchBar
let searchResultEl

export async function initializeSearchBar() {
	searchBar = document.getElementById('search-bar')
	searchResultEl = document.querySelector('#results')

	searchBar.addEventListener('input', (e) => {
		searchResultEl.style.display = 'flex'
		searchResultEl.innerHTML = ''
		const resultsPool = []
		let searchItems = document.querySelectorAll('.editor-item')
		searchItems.forEach(item => {
			let itemProps = { ...item.dataset }
			resultsPool.push(itemProps)
		})
		const fuse = new Fuse(resultsPool, {
			keys: ['name', 'value', 'comment', 'position']
		})

		const results = fuse.search(searchBar.value)
		if (results.length === 0) {
			searchResultEl.innerHTML = 'No results found.'
			// searchResultEl.style.display = 'none'
		}
		results.forEach((result) => {
			const resultDiv = document.createElement('div')
			resultDiv.classList.add('result')
			resultDiv.setAttribute('tabindex', '0')
			const configLineDiv = document.createElement('div')
			configLineDiv.classList.add('config-line')
			if (result.item.type.toLowerCase() === 'comment') {
				configLineDiv.innerHTML = `
				  <span class="comment">${result.item.comment || ''}</span>
				`
			} else if (result.item.type.toLowerCase() === 'key') {
				configLineDiv.innerHTML = `
				  <span class="name">${result.item.name}</span>&nbsp;=&nbsp;
				  <span class="value">${result.item.value}</span>&nbsp;
				  <span class="comment">${result.item.comment || ''}</span>
				`
			} else {
				configLineDiv.innerHTML = `Group: <span class="name">${result.item.name}</span>`
			}

			const locationDiv = document.createElement('div')
			locationDiv.className = 'location'
			locationDiv.innerHTML = `${result.item.position}`
			resultDiv.appendChild(configLineDiv)
			resultDiv.appendChild(locationDiv)

			resultDiv.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					let goto = document.querySelector(`.editor-item[data-uuid="${result.item.uuid}"]`)
					goto.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
				goto.style.scale = '1.05'
				goto.focus()
				goto.click()
				setTimeout(() => {
					goto.style.outline = '0px solid red'
					goto.style.scale = '1.0'
				}, 1000)
				searchResultEl.style.display = 'none'
				searchResultEl.innerHTML = ''
				searchBar.value = ''
			})

			searchResultEl.appendChild(resultDiv)
		})

	})

	searchBar.addEventListener('blur', (e) => {
		// if (e._nodefocus) {
		// 	return
		// }
		searchResultEl.style.display = 'none'
	})
	searchResultEl.addEventListener('focus', (e) => {
		GLOBAL['currentView'] = 'search'
		e._nodefocus = true
		searchResultEl.style.display = 'flex'
	})


}
