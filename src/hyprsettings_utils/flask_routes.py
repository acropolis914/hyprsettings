from .pywebview_apis import api
from flask import send_from_directory, jsonify, request, Flask
from flask_cors import CORS
import urllib.request


# app = state.app
def register_routes(app: Flask):
	CORS(app, origins='*', supports_credentials=True)

	@app.route('/')
	def home():
		return send_from_directory('ui', 'index.html')

	@app.route('/wiki', strict_slashes=False)
	def wiki():
		return send_from_directory('hyprland-wiki', 'index.html')

	@app.route('/wiki/<path:path>', strict_slashes=False)
	def wiki_assets(path):
		path = str(path)
		if '.' not in path and not path.endswith('/'):
			path += '/'
		if path.endswith('/'):
			path += 'index.html'
		return send_from_directory('hyprland-wiki', path)

	@app.route('/<path:path>')
	def ui_files(path):
		return send_from_directory('ui', path)

	@app.route('/api/init', methods=['GET'])
	def api_init():
		return jsonify(api.init())

	@app.route('/api/get_hyprland_config', methods=['GET'])
	def api_get_hyprland_config():
		path = request.args.get('path')
		return jsonify(api.get_hyprland_config(path=path)), 200

	@app.route('/api/get_hyprland_config_texts', methods=['POST'])
	def api_get_hyprland_config_texts():
		data = request.get_json()
		json_string = data.get('json_string')
		# print(json_string)
		files = api.get_hyprland_config_texts(json_string)

		return jsonify(files), 200

	@app.route('/api/save_config', methods=['POST'])
	def api_save_config():
		data = request.get_json()
		config, changedFiles = data['config'], data['changedFiles']
		#     log(data)
		preview = api.save_config(config, changedFiles)
		return jsonify({'status': 'ok', 'preview': preview}), 200

	@app.route('/api/get_hyprsettings_version', methods=['GET'])
	def api_get_hyprsettings_version():
		return jsonify(api.get_hyprsettings_version()), 200

	@app.route('/api/new_uuid', methods=['GET'])
	def api_new_uuid():
		length = request.args.get('length', default=8, type=int)
		return jsonify({'uuid': api.new_uuid(length)})

	@app.route('/api/read_window_config', methods=['GET'])
	def api_read_window_config():
		return jsonify(api.read_window_config())

	@app.route('/api/save_window_config', methods=['POST'])
	def api_save_window_config():
		data = request.get_json()
		label = request.args.get('label', 'config')
		api.save_window_config(data, part=label)
		return jsonify({'status': 'ok'})

	@app.route('/api/get_builtin_themes', methods=['GET'])
	def api_get_builtin_themes():
		return jsonify(api.get_builtin_themes())

	@app.route('/api/get_debug_status', methods=['GET'])
	def api_get_debug_status():
		return jsonify(api.getDebugStatus())

	@app.route('/api/open_file')
	def api_open_file():
		data = request.args.get('path')
		api.open_file(data)
		return jsonify({'status': 'ok'})

	COPYANDPASTE_LOG_URL = 'https://copyandpaste.at/api/log'

	@app.route('/api/share', methods=['POST'], strict_slashes=False)
	def share_text():
		data = request.json
		if not data or 'text' not in data:
			return jsonify({'error': "Missing 'text' in request body"}), 400

		text = data['text'].encode('utf-8')  # encode as bytes

		try:
			req = urllib.request.Request(COPYANDPASTE_LOG_URL, data=text, method='POST', headers={'Content-Type': 'text/plain; charset=utf-8'})
			with urllib.request.urlopen(req) as res:
				url = res.read().decode('utf-8').strip()
			return jsonify({'url': url})
		except Exception as e:
			return jsonify({'error': str(e)}), 500
