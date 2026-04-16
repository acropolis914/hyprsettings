from rich.console import Console
from .shared import state, hs_globals
import socket
from .utils import log
import threading
import subprocess
import os

console = Console()


def handle_client(conn):
	try:
		data = conn.recv(1024)
		if data.decode() == 'TOGGLE' and state.window_instance:
			toggle_window()
	except Exception as e:
		log(e)

	finally:
		conn.close()


def start_window_server():
	with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as window_socket:
		window_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
		window_socket.bind((hs_globals.HOST, state.webview_port))
		window_socket.listen()
		while True:
			conn, addr = window_socket.accept()
			threading.Thread(target=handle_client, args=(conn,), daemon=True).start()


def start_window(frontend_link):
	import webview
	def start_webview_window():
		if state.args.no_dmabuf:
			os.environ['WEBKIT_DISABLE_DMABUF_RENDERER'] = '1'
			os.environ['GTK_OVERLAY_SCROLLING'] = '1'
		if state.args.no_devtools:
			webview.settings['OPEN_DEVTOOLS_IN_DEBUG'] = False
		state.window_thread = threading.Thread(target=start_window_server, daemon=state.daemon)
		state.window_thread.start()
		state.window_instance = webview.create_window(
			  'HyprSettings',
			  frontend_link,
			  transparent=True,
			  width=800,
			  height=600,
			  easy_drag=True,
			  min_size=(400, 300),
			  hidden=state.args.hidden,
		)
		state.window_visible = not state.args.hidden

		def on_loaded(window):
			window.events.loaded -= on_loaded

		def on_closing(window):
			disabled_dmabuf = os.environ.get('WEBKIT_DISABLE_DMABUF_RENDERER')
			if state.daemon:  # and (disabled_dmabuf is None or disabled_dmabuf != '1')
				if state.window_instance:
					state.window_instance.hide()
				state.window_visible = False
				log('[yellow]Called close window. Window is hidden since daemon is enabled[/yellow]')
				return False
			else:
				# if disabled_dmabuf == '1':
				# 	log('Environment variable "WEBKIT_DISABLE_DMABUF_RENDERER" is set to 1.')
				# 	log('Restoring from daemon will fail. Daemon setting is dishonored.')
				log('Window closed. Terminating process.')
				os._exit(0)
				# kill_hyprsettings()
				return None

		state.window_instance.events.loaded += on_loaded
		state.window_instance.events.closing += on_closing

		webview.start(
			  gui=state.args.ui[0],
			  debug=state.args.debug,
			  private_mode=True,
			  storage_path=hs_globals.CACHE_PATH,
			  icon='icon-48.png',
		)

	try:
		log('',
		    '[red][bold]NVIDIA ONLY USERS:[/red][/bold]: If this fails with error 71, please run with [code]--no-dmabuf[/code]')
		start_webview_window()
	except (Exception, SystemError) as e:
		log(f'Failed to start window:{e}', '[red]GTK ERROR[/red]')
		log('[red]THIS IS A KNOWN BUG FOR NVIDIA ONLY SETUPS. PLEASE DO NOT CREATE A NEW GITHUB ISSUE FOR IT[/red]')
		log('Trying to set enviroment fixes. It will cause some graphical issues but will make it open.')
		os.environ['WEBKIT_DISABLE_DMABUF_RENDERER'] = '1'
		start_webview_window()
	finally:
		log('Done.')


def toggle_window():
	has_hyprctl = False
	hyprctl = None
	try:
		hyprctl = subprocess.run(["hyprctl", "workspaces"], capture_output=True, text=True)
		has_hyprctl = hyprctl.returncode == 0
	except FileNotFoundError:
		has_hyprctl = False
	match has_hyprctl:
		case False:
			if state.window_visible:
				state.window_instance.hide()
				state.window_visible = False
			else:
				# state.window_instance.hide()
				# state.window_visible = False
				state.window_instance.restore()
				state.window_instance.show()
				state.window_visible = True
		case True:
			activeworkspace = (
				  subprocess.run(
					    "hyprctl monitors -j | jq '.[] | select(.focused==true) | .activeWorkspace.name'",
					    shell=True,
					    capture_output=True,
					    text=True,
				  )
				  .stdout.strip()

				  .strip('"')
			)
			log(f"Active workspace from focused monitor: '{activeworkspace}'")

			specialworkspace = (
				  subprocess.run(
					    "hyprctl monitors -j | jq '.[] | select(.focused==true) | .specialWorkspace.name'",
					    shell=True,
					    capture_output=True,
					    text=True,
				  )
				  .stdout.strip()
				  .strip('"')
			)
			log(
				  f"Special workspace from focused monitor: '{specialworkspace}'",
				  only_verbose=True,
			)

			if specialworkspace:
				log(f'Special workspace {specialworkspace} detected, overriding active workspace')
				activeworkspace = specialworkspace
			log(f"Workspace to target: '{activeworkspace}'", only_verbose=True)

			# get hyprsettings window workspace
			hyprsettings_window_workspace_name = subprocess.run(
				  'hyprctl -j clients | jq -r \'.[] | select(.initialClass=="hyprsettings") | .workspace.name\'',
				  shell=True,
				  capture_output=True,
				  text=True,
			).stdout.strip()
			log(
				  f"HyprSettings window currently on workspace: '{hyprsettings_window_workspace_name}'",
				  only_verbose=True,
			)

			if state.window_visible and activeworkspace == hyprsettings_window_workspace_name:
				log(f'Window visible AND on current workspace ({activeworkspace}) → hiding')
				state.window_instance.hide()
				state.window_visible = False

			elif state.window_visible and activeworkspace != hyprsettings_window_workspace_name:
				log(f'Window visible BUT on different workspace ({hyprsettings_window_workspace_name}) → moving')
				move = subprocess.run(
					  [
						    'hyprctl',
						    'dispatch',
						    'movetoworkspace',
						    f'{activeworkspace},initialclass:hyprsettings',
					  ],
					  capture_output=True,
					  text=True,
				)
				state.window_instance.restore()  # restore if minimized
				state.window_instance.show()
				state.window_visible = True

			else:
				log('Window not visible → restoring and showing')
				state.window_instance.restore()  # restore if minimized
				state.window_instance.show()
				state.window_visible = True


def send_toggle():
	try:
		with socket.create_connection((hs_globals.HOST, state.webview_port), timeout=0.1) as s:
			s.sendall(b'TOGGLE')
			log(f'Toggled existing window daemon at port {state.webview_port} instead of spawning a new one.')
			return True
	except (ConnectionRefusedError, socket.timeout):
		return False
