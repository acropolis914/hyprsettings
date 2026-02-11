def createArgParse(parser):
	# General Options
	general = parser.add_argument_group('General Options')
	general.add_argument(
		'-d',
		'--daemon',
		action='store_true',
		help='If not running, run as a daemon in the background. If already running, connect to the existing daemon.',
	)
	general.add_argument('-k', '--kill', action='store_true', help='Use this arg to kill any running hyprsettings process.')
	general.add_argument('-N', '--no-daemon', action='store_true', help='Starts a new session without using existing daemon if it exists.')
	general.add_argument('-vv', '--verbose', action='store_true', help='Get more descriptive logs.')
	# general.add_argument('--version', action='version', version=f'%(prog)s {hs_globals.CURRENT_VERSION}')

	# UI / Browser Options
	ui = parser.add_argument_group('UI / Browser Options')
	ui.add_argument('-u', '--ui', nargs=1, choices=['gtk', 'qt'], default='gtk', help='Run the UI with specified backend (qt requires qt library).')
	ui.add_argument('-H', '--hidden', action='store_true', help='Start hidden. Useful for autostarting with daemon (e.g., in hyprland.conf).')
	ui.add_argument('-b', '--no-window', action='store_true', help='Do not spawn a webview window. Access the UI via browser.')
	ui.add_argument('-nb', '--no-browser', action='store_true', help='Do not open the browser automatically.')

	# Dev / Debug Options
	dev = parser.add_argument_group('Development / Debug Options')
	dev.add_argument('--debug', action='store_true', help='Enable debug and devtools.')

	dev.add_argument('--no-devtools', action='store_true', help='Initially hide devtools in the webview window.')
	dev.add_argument(
		'--no-dmabuf',
		action='store_true',
		help='Disable dmabuf to fix Error 71 (Protocol error) dispatching to Wayland display. Happens with some NVIDIA only setups. Causes minor visual side effects.',
	)
	dev.add_argument(
		'--bun-dev', action='store_true', help='[Deprecated] Use the Bun development server (localhost:3000). WARNING: FOR DEVELOPMENT ONLY.'
	)
	# Configuration
	config = parser.add_argument_group('Configuration')
	config.add_argument('-c', '--config', metavar='FILE', type=str, help='Path to your hyprland configuration file.')

	return parser
