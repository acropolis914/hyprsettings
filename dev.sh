#!/usr/bin/env bash
echo " Watching for changes..."
uv run watchmedo auto-restart --pattern="*.py" --recursive -- python main.py
