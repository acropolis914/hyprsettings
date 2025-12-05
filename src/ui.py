#!/usr/bin/env python3
# ui.py launcher

import sys
import os

# Determine path to actual executable
current_dir = os.path.dirname(os.path.abspath(__file__))
hyprsettings_exec = os.path.join(current_dir, "hyprsettings")
print("\033[31mCalling ui.py is deprecated. Call src/hyprsettings or run.sh instead!\033[0m")
print("\033[31mui.py will be removed in the future.\033[0m")
# Run the new executable with all arguments
os.execv(hyprsettings_exec, [hyprsettings_exec] + sys.argv[1:])
