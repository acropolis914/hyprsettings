import json
import re
import subprocess
from datetime import datetime
from pathlib import Path


def dumpjsobject(obj, indent=2):
	"""
	Dumps a Python dict/list into a JavaScript/TypeScript-like object literal string.
	Keys that are valid JS identifiers are not quoted. Values are dumped using json.dumps.
	"""

	def _format(o, level=0):
		spc = ' ' * (indent * level)
		spc_next = ' ' * (indent * (level + 1))

		if isinstance(o, dict):
			items = []
			for k, v in o.items():
				# remove quotes for valid JS identifiers
				if re.match(r'^[A-Za-z_]\w*$', str(k)):
					key = k
				else:
					key = json.dumps(k)
				items.append(f'{spc_next}{key}: {_format(v, level + 1)}')
			return '{\n' + ',\n'.join(items) + f'\n{spc}}}'

		elif isinstance(o, list):
			items = [_format(item, level + 1) for item in o]
			return '[\n' + ',\n'.join(f'{spc_next}{i}' for i in items) + f'\n{spc}]'

		else:
			return json.dumps(o)

	return _format(obj)


def get_wiki_version() -> str:
	SCRIPT_DIR = Path(__file__).parent.resolve()
	LOCAL_REPO = SCRIPT_DIR / '.hyprland-wiki'
	# Get latest commit date in ISO format
	commit_date_bytes = subprocess.check_output(['git', '-C', str(LOCAL_REPO), 'log', '-1', '--format=%cI'])
	commit_date_str = commit_date_bytes.decode().strip()
	commit_dt = datetime.fromisoformat(commit_date_str)

	# Get latest commit SHA (7 chars)
	commit_sha_bytes = subprocess.check_output(['git', '-C', str(LOCAL_REPO), 'rev-parse', '--short=7', 'HEAD'])
	commit_sha = commit_sha_bytes.decode().strip()
	version = f'v{commit_dt:%Y.%m.%d_%H%M}_{commit_sha}'
	return version
