#!/usr/bin/env python3
# ui.py launcher

import sys
import os

# Determine path to actual executable
current_dir = os.path.dirname(os.path.abspath(__file__))
hyprsettings_exec = os.path.join(current_dir, "hyprsettings")

# Run the new executable with all arguments
os.execv(hyprsettings_exec, [hyprsettings_exec] + sys.argv[1:])
