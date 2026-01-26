def createArgParse(parser):
    parser.add_argument(
        "-d",
        "--daemon",
        action="store_true",
        help="If not running, run as a daemon in the background. If already running, connect to the existing daemon.",
    )

    # parser.add_argument("-b", "--browser", action="store_true", help="Run in browser mode only")
    parser.add_argument(
        "-H",
        "--hidden",
        action="store_true",
        help="Makes it hidden at the start. Useful for autostarting with daemon\n e.g. on your hyprland.conf (exec-once = hyprsettings -d -H)",
    )
    parser.add_argument(
        "-u",
        "--ui",
        nargs=1,
        choices=["gtk", "qt"],
        default="gtk",
        help="Run the ui with qt backend (requires qt library)",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true", help="Get more descriptive logs"
    )
    parser.add_argument(
        "-k",
        "--kill",
        action="store_true",
        help="Use this arg to kill any running hyprsettings process",
    )
    parser.add_argument(
        "-N",
        "--no-daemon",
        action="store_true",
        help="Starts a new session without using existing daemon if it exists.",
    )
    parser.add_argument(
        "-b",
        "--no-window",
        action="store_true",
        help="Do not spawn a webview window. Access the ui via browser.",
    )
    parser.add_argument(
        "-c", "--config", metavar="FILE", type=str, help="Configuration file"
    )
    parser.add_argument(
        "--debug", action="store_true", help="Enable debug and devtools"
    )

    return parser
