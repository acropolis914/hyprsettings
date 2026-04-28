Parser specification for hyprsettings
===================================

Purpose
-------

This document defines the canonical parser contract and integration blueprint
for hyprsettings. Its purpose is to make the backend extensible so multiple
parsers (Hyprland, Niri, Mango, and others) can be added with minimal
changes to the API and frontend.

Location
--------

- Machine-readable interface: `src/hyprsettings_utils/parser_interface.py`
- Human-readable specification: this file (`src/hyprsettings_utils/PARSER_SPEC.md`)

Design goals
------------

- Single canonical node shape (ParserNode) used by all parsers.
- A small ParserInterface that concrete parsers implement or adapt to.
- A registry (future) that selects the appropriate parser for a file or
  content string.
- Keep public pywebview API signatures unchanged; the registry/adapter
  substitution happens internally in the backend.

Required model: ParserNode
--------------------------

Fields (summary):

- name: str — canonical name or key for the node
- type: NodeType — one of KEY, GROUP, GROUPEND, FILE, COMMENT, BLANK, UNKNOWN
- value: optional — value for KEY nodes
- comment: optional — comment string associated with node
- children: list[ParserNode] — nested nodes
- position: optional — textual position info (optional)
- uuid: str — unique id for the node (frontend depends on this)
- disabled: bool — whether the line/key is disabled (commented out)
- line_number: optional int — original line number if available
- resolved_path: optional str — path this node came from (for FILE nodes)

All parser adapters must produce a root ParserNode whose children follow
this structure. Parsers may add adapter-specific fields but must preserve
the above keys when converting to a dict via ParserNode.to_dict().

ParserInterface (summary)
-------------------------

Minimal methods to implement:

- parse_file(path: str | Path) -> ParserNode
  - Load and parse a file from disk, return root ParserNode.
  - Must raise ParserError on failure.

- parse_string(content: str, resolved_path: Optional[str] = None) -> ParserNode
  - Parse raw text and return root ParserNode.

- node_to_config(node: ParserNode, save: bool = False) -> List[dict] | str
  - Convert a node back into output file(s). Return either a string (single
    output) or a list of dicts: [{'path': '/abs/path', 'contents': '...'}, ...].
  - If save=True, the implementation MAY perform writes, but returning the
    file-list is preferred for testability.

- supports_path(path: str | Path) -> bool
  - Cheap check by extension or name if this parser should handle `path`.

Optional / helper methods:

- can_parse_content(content: str) -> bool
  - Content-sniﬃng heuristic used by registry when extension is ambiguous.
- node_to_json(node: ParserNode) -> str
  - Convenience method; adapters may implement for symmetry.

Error handling
--------------

Parsers should raise ParserError for parse or IO issues. The registry and
api layers will catch and present errors to the UI in a consistent way.

Registry and selection (future)
-------------------------------

The registry is responsible for returning a ParserInterface instance for a
given path or content string. Selection strategy (recommended):

1. If the user or caller provided an explicit parser name, use it.
2. Fast extension-based lookup via `supports_path()`.
3. Content-sniffing fallback: call `can_parse_content()` on known parsers.
4. Last-resort: fall back to a text-based generic parser.

When switching parsers in the pywebview API (future change), the APIs
should remain identical. Internally, the API will call the registry to
obtain a parser and then call parse_file/parse_string on that parser.

Adapter recommendations
-----------------------

- Prefer thin adapters: if an existing parser already produces a JSON
  shape compatible with ParserNode, wrap it and forward the results.
- If substantial conversion is needed, implement a deterministic mapping
  to ParserNode shape to avoid frontend regressions.
- Keep node_to_config deterministic and testable: returning a file-list
  (path+contents) is easier to assert than writing files in the adapter.

Example adapter skeleton (conceptual)
-------------------------------------

```text
from src.hyprsettings_utils.parser_interface import ParserInterface, ParserNode

class HyprlandAdapter(ParserInterface):
    name = 'hyprland'
    file_extensions = ['.conf']

    def parse_file(self, path):
        # use existing hyprland parser, convert to ParserNode
        # return ParserNode(...)

    def parse_string(self, content, resolved_path=None):
        # parse and return ParserNode

    def node_to_config(self, node, save=False):
        # return [{'path': node.resolved_path, 'contents': '...'}]

    def supports_path(self, path):
        return str(path).endswith('.conf')
```

Testing and migration notes
--------------------------

- Add unit tests for each adapter verifying:
  - parse_file and parse_string produce expected ParserNode shapes
  - node_to_config returns the correct text/file-list for roundtrip tests
- Add registry tests verifying selection rules.
- Migrate the backend in small steps: first add adapters and registry,
  then (in a separate change) make the pywebview apis consult the registry
  while keeping public signatures unchanged.

Questions for maintainer
------------------------

- Do you prefer adapter Option A: reuse existing parser JSON as-is (thin
  adapter), or Option B: map all parsers to the canonical ParserNode
  (stronger, safer, but more code)?
- Should node_to_config(save=True) perform file writes, or should adapters
  only return the file list and let the caller perform writes? The
  recommendation is the latter for easier testing.

That's the specification. Implement ParserInterface adapters under
`src/hyprsettings_utils/` (or a `parsers/` subpackage) and register them
with a small registry (see plan notes) when ready.


