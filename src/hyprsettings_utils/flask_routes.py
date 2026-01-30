from python.shared import state
from python.pywebview_apis import api
from flask import send_from_directory, jsonify, request

app = state.app


def register_routes(app):
	@app.route('/')
	def home():
		return send_from_directory('ui', 'index.html')

	@app.route('/<path:path>')
	def ui_files(path):
		return send_from_directory('ui', path)

	@app.route('/api/init', methods=['GET'])
	def api_init():
		return jsonify(api.init())

	@app.route('/api/get_config', methods=['GET'])
	def api_get_config():
		path = request.args.get('path')
		return jsonify(api.get_config(path=path))

	@app.route('/api/save_config', methods=['POST'])
	def api_save_config():
		data = request.get_json()
		config, changedFiles = data['config'], data['changedFiles']
		#     log(data)
		api.save_config(config, changedFiles)
		return jsonify({'status': 'ok'})

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
