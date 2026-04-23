from .hyprsettings_config import save_window_config, read_window_config
from .pywebview_apis import api
from flask import send_from_directory, jsonify, request, Flask
from flask_cors import CORS
import urllib.request
import rich.traceback

from .utils import log

rich.traceback.install(show_locals=True)


# app = state.app
def register_routes(app: Flask):
	CORS(app, origins='*', supports_credentials=True)

	@app.route('/')
	def home():
		log('Serving UI home page', only_verbose=True)
		return send_from_directory('ui', 'index.html')

	@app.route('/wiki', strict_slashes=False)
	def wiki():
		log('Serving wiki home page', only_verbose=True)
		return send_from_directory('hyprland-wiki', 'index.html')

	@app.route('/wiki/<path:path>', strict_slashes=False)
	def wiki_assets(path):
		log(f'Serving wiki asset: {path}', only_verbose=True)
		path = str(path)
		if '.' not in path and not path.endswith('/'):
			path += '/'
		if path.endswith('/'):
			path += 'index.html'
		return send_from_directory('hyprland-wiki', path)

	@app.route('/<path:path>')
	def ui_files(path):
		log(f'Serving UI file: {path}', only_verbose=True)
		return send_from_directory('ui', path)

	@app.route('/api/init', methods=['GET'])
	def api_init():
		log('API initialization requested')
		return jsonify(api.init())

	@app.route('/api/get_hyprland_config', methods=['GET'])
	def api_get_hyprland_config():
		path = request.args.get('path')
		log(f'Hyprland config requested. Path: {path}')
		try:
			config = api.get_hyprland_config(path)
			log(f'Hyprland config successfully parsed', only_verbose=True)
			return jsonify(config), 200
		except Exception as e:
			log(f'Error getting Hyprland config: {e}')
			return jsonify({'error': str(e)}), 500

	@app.route('/api/load_from_string', methods=['POST'])
	def api_get_hypr_from_string():
		log('Loading Hyprland config from string')
		string = request.get_json()
		return api.parse_hypr_string(string)

	@app.route('/api/get_hyprland_config_texts', methods=['POST'])
	def api_get_hyprland_config_texts():
		data = request.get_json()
		json_string = data.get('json_string')
		log('Fetching Hyprland config texts', only_verbose=True)
		# print(json_string)
		files = api.get_hyprland_config_texts(json_string)

		return jsonify(files), 200

	@app.route('/api/save_config', methods=['POST'])
	def api_save_config():
		# log('Saving Hyprland config')
		data = request.get_json()
		config, changedFiles = data['config'], data['changedFiles']
		log(f'Files changed: {changedFiles}. Saving config.', only_verbose=False)
		#     log(data)
		preview = api.save_config(config, changedFiles)
		# log('Hyprland config saved successfully')
		return jsonify({'status': 'ok', 'preview': preview}), 200

	@app.route('/api/get_hyprsettings_version', methods=['GET'])
	def api_get_hyprsettings_version():
		log('Hyprsettings version requested', only_verbose=True)
		return jsonify(api.get_hyprsettings_version()), 200

	@app.route('/api/new_uuid', methods=['GET'])
	def api_new_uuid():
		length = request.args.get('length', default=8, type=int)
		log(f'New UUID requested (length: {length})', only_verbose=True)
		return jsonify({'uuid': api.new_uuid(length)})

	@app.route('/api/read_window_config', methods=['GET'])
	def api_read_window_config():
		# log("Hyprsettings config requested")
		config = read_window_config()
		# log(config)
		jsonified = jsonify(config)
		# log(jsonified)
		return jsonified

	@app.route('/api/save_window_config', methods=['POST'])
	def api_save_window_config():
		data = request.get_json()
		label = request.args.get('label', 'config')
		# log(f'Saving application window config (label: {label})')
		save_window_config(data, part=label)
		# log('Window config saved')
		return jsonify({'status': 'ok'})

	@app.route('/api/get_builtin_themes', methods=['GET'])
	def api_get_builtin_themes():
		log('Built-in themes requested', only_verbose=True)
		return jsonify(api.get_builtin_themes())

	@app.route('/api/get_debug_status', methods=['GET'])
	def api_get_debug_status():
		log('Debug status requested', only_verbose=True)
		return jsonify(api.getDebugStatus())

	@app.route('/api/open_file')
	def api_open_file():
		data = request.args.get('path')
		log(f'Request to open file in default application: {data}')
		api.open_file(data)
		return jsonify({'status': 'ok'})

	COPYANDPASTE_LOG_URL = 'https://copyandpaste.at/api/log'

	@app.route('/api/share', methods=['POST'], strict_slashes=False)
	def share_text():
		log('Received request to share text configuration')
		data = request.json
		if not data or 'text' not in data:
			log('Share failed: Missing text in request body')
			return jsonify({'error': "Missing 'text' in request body"}), 400

		text = data['text'].encode('utf-8')  # encode as bytes

		try:
			log(f'Uploading data to {COPYANDPASTE_LOG_URL}', only_verbose=True)
			req = urllib.request.Request(COPYANDPASTE_LOG_URL, data=text, method='POST',
			                             headers={'Content-Type': 'text/plain; charset=utf-8'})
			with urllib.request.urlopen(req) as res:
				url = res.read().decode('utf-8').strip()
			log(f'Text shared successfully. URL: {url}')
			return jsonify({'url': url})
		except Exception as e:
			log(f'Error sharing text: {e}')
			return jsonify({'error': str(e)}), 500
