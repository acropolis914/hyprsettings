export default class NiriShaderPreview {
	constructor() {
		this.config = {
			aspectRatio: '4/3',
			osBackground: 'var(--surface-0)',
			windowBorderRadius: 10.0,
			windowTitlebarColor: '#1e1e2e',
			windowContentColor: '#313244',

			// Fixed Anchor: Maintains Status Quo (Top-Left rooted)
			winPctX: 0.2,
			winPctY: 0.2,
			prevPctW: 0.5,
			prevPctH: 0.5,
			nextPctW: 0.6,
			nextPctH: 0.7,
		}

		this.state = {
			isPlaying: false,
			startTime: 0,
			textures: { prev: null, next: null },
			sequence: [],
			programs: {},
		}

		this.dom = { wrapper: null, canvas: null }
		this.gl = null
		this.reqId = null
		this.onError = (err) => console.error(err)
		this.onSequenceUpdate = (seq) => {}
		this._setupShaders()
	}

	static applyGl(canvas, userCode, configOpts = {}) {
		const engine = new NiriStudio()
		engine.dom.canvas = canvas
		engine.gl = canvas.getContext('webgl', {
			alpha: true,
			premultipliedAlpha: true,
		})
		engine.gl.enable(engine.gl.BLEND)
		engine.gl.blendFunc(engine.gl.ONE, engine.gl.ONE_MINUS_SRC_ALPHA)
		engine.vbo = engine.gl.createBuffer()
		engine.gl.bindBuffer(engine.gl.ARRAY_BUFFER, engine.vbo)
		engine.gl.enableVertexAttribArray(0)
		engine.gl.vertexAttribPointer(0, 2, engine.gl.FLOAT, false, 0, 0)
		engine.setConfig(configOpts)

		// Lock internal resolution for High DPI
		canvas.width = 1920
		canvas.height = 1080
		engine.gl.viewport(0, 0, 1920, 1080)

		engine._generateTextures()
		engine.setShader(userCode)
		engine.play()
		return engine
	}

	mount(container) {
		if (this.dom.wrapper) this.dom.wrapper.remove()

		if (!document.getElementById('niri-library-styles')) {
			const style = document.createElement('style')
			style.id = 'niri-library-styles'
			style.textContent = `
                .niri-os-screen { position: relative; aspect-ratio: var(--niri-aspect, 16/9); background-color: var(--surface-1, #11111b); background-size: cover; background-position: center; background-repeat: no-repeat; overflow: hidden; transition: background 0.3s ease; }
                .niri-os-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; }
            `
			document.head.appendChild(style)
		}

		this.dom.wrapper = document.createElement('div')
		this.dom.wrapper.className = 'niri-os-screen'
		this.dom.canvas = document.createElement('canvas')
		this.dom.canvas.className = 'niri-os-canvas'
		this.dom.wrapper.appendChild(this.dom.canvas)
		container.appendChild(this.dom.wrapper)
		this._applyCSSConfig()

		this.gl = this.dom.canvas.getContext('webgl', {
			alpha: true,
			premultipliedAlpha: true,
		})
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA)
		this.vbo = this.gl.createBuffer()
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo)
		this.gl.enableVertexAttribArray(0)
		this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0)

		// Lock internal resolution to 1080p, CSS handles responsive scaling
		this.dom.canvas.width = 1920
		this.dom.canvas.height = 1080
		this.gl.viewport(0, 0, 1920, 1080)
		this._generateTextures()
	}

	setBackground(source) {
		if (!this.dom.wrapper) return

		// Checks for http/https, data:, blob:, or absolute/relative paths
		const isImage = /^(https?:\/\/|data:image|blob:|\/|\.\/)/i.test(source)

		if (isImage) {
			this.dom.wrapper.style.backgroundImage = `url('${source}')`
			this.dom.wrapper.style.setProperty('--niri-bg-color', 'transparent')
		} else {
			this.dom.wrapper.style.backgroundImage = 'none'
			this.dom.wrapper.style.setProperty('--niri-bg-color', source)
		}
	}

	setWindowContent(source) {
		const isImage = /^(https?:\/\/|data:image|blob:|\/|\.\/)/i.test(source)

		if (isImage) {
			const img = new Image()
			img.onload = () => {
				this.state.winImage = img
				this._generateTextures()
			}
			img.src = source
		} else {
			this.state.winImage = null
			this.config.windowContentColor = source
			this._generateTextures()
		}
	}

	setConfig(configUpdates) {
		Object.assign(this.config, configUpdates)
		this._applyCSSConfig()
		this._generateTextures()
	}

	setShader(userCode) {
		this.state.programs = {}
		this.state.sequence = []
		try {
			if (userCode.includes('open_color(')) this.state.sequence.push('open')
			if (userCode.includes('resize_color(')) this.state.sequence.push('resize')
			if (userCode.includes('close_color(')) this.state.sequence.push('close')
			if (this.state.sequence.length === 0) {
				if (userCode.includes('window_color(')) this.state.sequence.push('window')
				else if (userCode.includes('void main(')) this.state.sequence.push('raw')
				else throw new Error('No entry point found.')
			}

			for (const mode of this.state.sequence) {
				const sFrag = this.gl.createShader(this.gl.FRAGMENT_SHADER)
				this.gl.shaderSource(sFrag, this.shaders.prelude + userCode + this.shaders.epilogues[mode])
				this.gl.compileShader(sFrag)
				const sVert = this.gl.createShader(this.gl.VERTEX_SHADER)
				this.gl.shaderSource(sVert, this.shaders.vert)
				this.gl.compileShader(sVert)

				const prog = this.gl.createProgram()
				this.gl.attachShader(prog, sVert)
				this.gl.attachShader(prog, sFrag)
				this.gl.linkProgram(prog)
				if (!this.gl.getProgramParameter(prog, this.gl.LINK_STATUS))
					throw new Error(`[${mode}] ` + this.gl.getProgramInfoLog(prog))
				this.state.programs[mode] = prog
			}
			this.onSequenceUpdate(this.state.sequence)
			this.onError(null)
			if (!this.state.isPlaying) {
				this.state.startTime = performance.now()
				this._renderFrame()
			}
		} catch (e) {
			this.onError(e.message)
		}
	}

	play() {
		if (this.state.isPlaying) return
		this.state.isPlaying = true
		this.state.startTime = performance.now()
		this._renderLoop()
	}

	_applyCSSConfig() {
		if (this.dom.wrapper) this.dom.wrapper.style.setProperty('--niri-aspect', this.config.aspectRatio)
	}

	_getTexMat(w, h) {
		const texW = w + 2
		const texH = h + 2
		return [w / texW, 0, 0, 0, h / texH, 0, 1 / texW, 1 / texH, 1]
	}

	// Roots the matrix scaling to the Top-Left to maintain the CSS status quo
	_getTopLeftScaleMat(wCurr, hCurr, targetW, targetH) {
		const scaleX = wCurr / targetW
		const scaleY = hCurr / targetH
		return [scaleX, 0, 0, 0, scaleY, 0, 0, 0, 1]
	}

	_drawOSWindow(title, w, h, isPrev) {
		if (w <= 0 || h <= 0) return null
		const texW = w + 2
		const texH = h + 2
		const c = document.createElement('canvas')
		c.width = texW
		c.height = texH
		const ctx = c.getContext('2d')

		ctx.clearRect(0, 0, texW, texH)
		ctx.translate(1, 1)

		ctx.fillStyle = '#74c7ec'
		ctx.fillRect(0, 0, w, h)
		const contentH = h - 60 // Slightly thicker title bar for 1080p scaling

		ctx.fillStyle = isPrev ? this.config.windowContentColor : this.config.windowContentColor
		ctx.fillRect(0, 60, w, contentH)
		ctx.fillStyle = isPrev ? '#74c7ec' : '#74c7ec'
		for (let i = 0; i < 8; i++) ctx.fillRect(40, 100 + i * 45, (w - 80) * (0.4 + Math.random() * 0.4), 18)

		ctx.fillStyle = isPrev ? this.config.windowTitlebarColor : this.config.windowTitlebarColor
		ctx.fillRect(0, 0, w, 60)
		// ctx.fillStyle = '#ff5f56';
		// ctx.beginPath();
		// ctx.arc(30, 30, 9, 0, Math.PI * 2);
		// ctx.fill();
		// ctx.fillStyle = '#ffbd2e';
		// ctx.beginPath();
		// ctx.arc(60, 30, 9, 0, Math.PI * 2);
		// ctx.fill();
		// ctx.fillStyle = '#27c93f';
		// ctx.beginPath();
		// ctx.arc(90, 30, 9, 0, Math.PI * 2);
		// ctx.fill();
		ctx.fillStyle = '#a6adc8'
		ctx.font = 'bold 20px sans-serif'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText(title, w / 2, 30)

		const tex = this.gl.createTexture()
		this.gl.bindTexture(this.gl.TEXTURE_2D, tex)
		this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, c)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE)
		this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE)
		return tex
	}

	_generateTextures() {
		if (!this.gl || this.dom.canvas.width === 0) return
		if (this.state.textures.prev) this.gl.deleteTexture(this.state.textures.prev)
		if (this.state.textures.next) this.gl.deleteTexture(this.state.textures.next)

		const cW = this.dom.canvas.width
		const cH = this.dom.canvas.height
		this.state.textures.prev = this._drawOSWindow('Previous', cW * this.config.prevPctW, cH * this.config.prevPctH, true)
		this.state.textures.next = this._drawOSWindow('Active App', cW * this.config.nextPctW, cH * this.config.nextPctH, false)
	}

	_setUniform(prog, type, name, ...args) {
		if (!prog) return
		const loc = this.gl.getUniformLocation(prog, name)
		if (loc !== null) {
			if (type === '1f') this.gl.uniform1f(loc, args[0])
			if (type === '2f') this.gl.uniform2f(loc, args[0], args[1])
			if (type === '4f') this.gl.uniform4f(loc, args[0], args[1], args[2], args[3])
			if (type === '1i') this.gl.uniform1i(loc, args[0])
			if (type === 'mat3') this.gl.uniformMatrix3fv(loc, false, args[0])
		}
	}

	_renderFrame() {
		if (this.state.sequence.length === 0 || !this.gl || this.dom.canvas.width === 0) return
		const gl = this.gl
		const cW = this.dom.canvas.width
		const cH = this.dom.canvas.height

		gl.clearColor(0.0, 0.0, 0.0, 0.0)
		gl.clear(gl.COLOR_BUFFER_BIT)

		const PHASE_TIME = 1500
		const PAUSE_TIME = 500
		const TOTAL_CYCLE = this.state.sequence.length * (PHASE_TIME + PAUSE_TIME)

		const elapsed = performance.now() - this.state.startTime
		let t = 0
		if (this.state.isPlaying) t = elapsed % TOTAL_CYCLE

		const phaseIndex = Math.floor(t / (PHASE_TIME + PAUSE_TIME))
		const activeMode = this.state.sequence[phaseIndex]
		const activeProg = this.state.programs[activeMode]
		if (!activeProg) return

		gl.useProgram(activeProg)

		const isStatic = activeMode === 'window' || activeMode === 'raw'
		let eased = 1.0
		if (!isStatic) {
			const phaseT = t % (PHASE_TIME + PAUSE_TIME)
			eased = Math.min(phaseT / PHASE_TIME, 1.0)
		}

		const pW = cW * this.config.prevPctW
		const pH = cH * this.config.prevPctH
		const nW = cW * this.config.nextPctW
		const nH = cH * this.config.nextPctH
		const ident = [1, 0, 0, 0, 1, 0, 0, 0, 1]

		const matP = this._getTexMat(pW, pH)
		const matN = this._getTexMat(nW, nH)

		let wCurr, hCurr
		let texMain, texPrev, texNext
		let matMain, matPrev, matNext
		let matGeoToPrev, matGeoToNext

		if (activeMode === 'open') {
			wCurr = pW
			hCurr = pH
			texMain = this.state.textures.prev
			texPrev = this.state.textures.prev
			texNext = this.state.textures.next
			matMain = matP
			matPrev = matP
			matNext = matN
			matGeoToPrev = ident
			matGeoToNext = ident
		} else if (activeMode === 'resize') {
			wCurr = pW + (nW - pW) * eased
			hCurr = pH + (nH - pH) * eased
			texMain = this.state.textures.next
			texPrev = this.state.textures.prev
			texNext = this.state.textures.next
			matMain = matP
			matPrev = matP
			matNext = matN
			matGeoToPrev = this._getTopLeftScaleMat(wCurr, hCurr, pW, pH)
			matGeoToNext = this._getTopLeftScaleMat(wCurr, hCurr, nW, nH)
		} else {
			wCurr = nW
			hCurr = nH
			texMain = this.state.textures.next
			texPrev = this.state.textures.prev
			texNext = this.state.textures.next
			matMain = matN
			matPrev = matP
			matNext = matN
			matGeoToPrev = ident
			matGeoToNext = ident
		}

		// Fixed Top-Left Anchor
		const winX = cW * this.config.winPctX
		const winY = cH * this.config.winPctY

		gl.activeTexture(gl.TEXTURE0)
		gl.bindTexture(gl.TEXTURE_2D, texMain)
		this._setUniform(activeProg, '1i', 'niri_tex', 0)
		gl.activeTexture(gl.TEXTURE1)
		gl.bindTexture(gl.TEXTURE_2D, texPrev)
		this._setUniform(activeProg, '1i', 'niri_tex_prev', 1)
		gl.activeTexture(gl.TEXTURE2)
		gl.bindTexture(gl.TEXTURE_2D, texNext)
		this._setUniform(activeProg, '1i', 'niri_tex_next', 2)

		this._setUniform(activeProg, '2f', 'u_monitor_size', cW, cH)
		this._setUniform(activeProg, '4f', 'u_curr_rect', winX, winY, wCurr, hCurr)
		this._setUniform(activeProg, '1f', 'niri_progress', eased)
		this._setUniform(activeProg, '1f', 'niri_clamped_progress', eased)
		this._setUniform(activeProg, '1f', 'niri_alpha', 1.0)
		this._setUniform(activeProg, '1f', 'niri_scale', 1.0)
		this._setUniform(activeProg, '1f', 'niri_clip_to_geometry', 1.0)
		this._setUniform(activeProg, '1f', 'niri_random_seed', 0.85)
		this._setUniform(activeProg, '2f', 'niri_size', wCurr, hCurr)
		this._setUniform(activeProg, '2f', 'niri_geo_size', wCurr, hCurr)
		this._setUniform(activeProg, '2f', 'niri_curr_geo_size', wCurr, hCurr)

		const r = this.config.windowBorderRadius
		this._setUniform(activeProg, '4f', 'niri_corner_radius', r, r, r, r)

		this._setUniform(activeProg, 'mat3', 'niri_geo_to_tex', matMain)
		this._setUniform(activeProg, 'mat3', 'niri_geo_to_tex_prev', matPrev)
		this._setUniform(activeProg, 'mat3', 'niri_geo_to_tex_next', matNext)
		this._setUniform(activeProg, 'mat3', 'niri_input_to_geo', ident)
		this._setUniform(activeProg, 'mat3', 'niri_input_to_curr_geo', ident)
		this._setUniform(activeProg, 'mat3', 'niri_curr_geo_to_prev_geo', matGeoToPrev)
		this._setUniform(activeProg, 'mat3', 'niri_curr_geo_to_next_geo', matGeoToNext)

		const padX = cW * 0.15
		const padY = cH * 0.15
		const minX = winX - padX
		const minY = winY - padY
		const maxX = winX + wCurr + padX
		const maxY = winY + hCurr + padY

		const vertices = new Float32Array([minX, maxY, maxX, maxY, minX, minY, maxX, minY])
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
	}

	_renderLoop() {
		if (!this.state.isPlaying) return
		this._renderFrame()
		this.reqId = requestAnimationFrame(() => this._renderLoop())
	}

	_setupShaders() {
		this.shaders = {
			vert: `
                attribute vec2 position; varying vec2 niri_v_coords;
                uniform vec4 u_curr_rect; uniform vec2 u_monitor_size;
                void main() {
                    niri_v_coords = (position - u_curr_rect.xy) / u_curr_rect.zw;
                    vec2 ndc = (position / u_monitor_size) * 2.0 - 1.0;
                    ndc.y = -ndc.y; gl_Position = vec4(ndc, 0.0, 1.0);
                }
            `,
			prelude: `
                precision highp float;
                varying vec2 niri_v_coords;
                uniform vec2 niri_size; uniform vec2 niri_geo_size; uniform vec2 niri_curr_geo_size;
                uniform sampler2D niri_tex; uniform sampler2D niri_tex_prev; uniform sampler2D niri_tex_next;
                uniform mat3 niri_geo_to_tex; uniform mat3 niri_geo_to_tex_prev; uniform mat3 niri_geo_to_tex_next;
                uniform mat3 niri_input_to_geo; uniform mat3 niri_input_to_curr_geo;
                uniform mat3 niri_curr_geo_to_prev_geo; uniform mat3 niri_curr_geo_to_next_geo;
                uniform float niri_progress; uniform float niri_clamped_progress; uniform float niri_random_seed;
                uniform vec4 niri_corner_radius; uniform float niri_clip_to_geometry;
                uniform float niri_alpha; uniform float niri_scale;

                float niri_rounding_alpha(vec2 coords, vec2 size, vec4 corner_radius) {
                    vec2 center; float radius;
                    if (coords.x < corner_radius.x && coords.y < corner_radius.x) { radius = corner_radius.x; center = vec2(radius, radius); }
                    else if (size.x - corner_radius.y < coords.x && coords.y < corner_radius.y) { radius = corner_radius.y; center = vec2(size.x - radius, radius); }
                    else if (size.x - corner_radius.z < coords.x && size.y - corner_radius.z < coords.y) { radius = corner_radius.z; center = vec2(size.x - radius, size.y - radius); }
                    else if (coords.x < corner_radius.w && size.y - corner_radius.w < coords.y) { radius = corner_radius.w; center = vec2(radius, size.y - radius); }
                    else { return 1.0; }
                    float t = clamp((distance(coords, center) - radius) * niri_scale + 0.5, 0.0, 1.0);
                    return 1.0 - t * t * (3.0 - 2.0 * t);
                }
            `,
			epilogues: {
				open: `void main() { vec3 c = niri_input_to_geo * vec3(niri_v_coords, 1.0); vec3 s = vec3(niri_geo_size, 1.0); vec4 col = open_color(c, s); if (niri_clip_to_geometry == 1.0) { if (c.x < 0.0 || 1.0 < c.x || c.y < 0.0 || 1.0 < c.y) { col = vec4(0.0); } else { col *= niri_rounding_alpha(c.xy * s.xy, s.xy, niri_corner_radius); } } gl_FragColor = col * niri_alpha; }`,
				close: `void main() { vec3 c = niri_input_to_geo * vec3(niri_v_coords, 1.0); vec3 s = vec3(niri_geo_size, 1.0); vec4 col = close_color(c, s); if (niri_clip_to_geometry == 1.0) { if (c.x < 0.0 || 1.0 < c.x || c.y < 0.0 || 1.0 < c.y) { col = vec4(0.0); } else { col *= niri_rounding_alpha(c.xy * s.xy, s.xy, niri_corner_radius); } } gl_FragColor = col * niri_alpha; }`,
				resize: `void main() { vec3 c = niri_input_to_curr_geo * vec3(niri_v_coords, 1.0); vec3 s = vec3(niri_curr_geo_size, 1.0); vec4 col = resize_color(c, s); if (niri_clip_to_geometry == 1.0) { if (c.x < 0.0 || 1.0 < c.x || c.y < 0.0 || 1.0 < c.y) { col = vec4(0.0); } else { col *= niri_rounding_alpha(c.xy * s.xy, s.xy, niri_corner_radius); } } gl_FragColor = col * niri_alpha; }`,
				window: `void main() { vec3 c = niri_input_to_geo * vec3(niri_v_coords, 1.0); vec3 s = vec3(niri_geo_size, 1.0); vec4 col = window_color(c, s); if (niri_clip_to_geometry == 1.0) { if (c.x < 0.0 || 1.0 < c.x || c.y < 0.0 || 1.0 < c.y) { col = vec4(0.0); } else { col *= niri_rounding_alpha(c.xy * s.xy, s.xy, niri_corner_radius); } } gl_FragColor = col * niri_alpha; }`,
				raw: ``,
			},
		}
	}
}
