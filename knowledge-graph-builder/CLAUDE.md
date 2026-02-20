# Project Guidelines

## Project Root
The root of this project is `/Users/comcom/Desktop/papers-with-claudecode/knowledge-graph-builder`.

## Reference Codebase

- When expressions like "original intent", "existing", or "existing implementation" appear, explore the `/Users/comcom/Desktop/papers-with-claudecode/knowledge-graph-builder/knowledge_graph_builder` subdirectory to understand the original intent.
- **Never modify files in that directory.** Only reading (reference) is allowed.

## Analyzer Architecture (`analyzer/`)

A universal repo analyzer currently under development. It extends the HF-specific structure of `knowledge_graph_builder/` to analyze arbitrary paper repositories.

### UniversalRepoAnalysis Field Definitions

| Field | Type | Description |
|---|---|---|
| `components` | `list[ComponentInfo]` | List of classes/functions (name, path, type, metadata) |
| `commits` | `list[CommitInfo]` | Keyword-filtered commits (sha, date, message, tags) |
| `documentation` | `list[DocumentationInfo]` | README/docs summaries (path, title, summary, category) |
| `structure` | `dict` | **Model class hierarchy**: `{ClassName: {inherits: [...], file: path}}` |
| `dependencies` | `dict` | **Package dependencies**: `{frameworks, domain_libs, data, other, raw, source_files}` |
| `extensions` | `dict` | Repo type-specific data (HF: `extensions.models`) |

### `structure` Design Intent
- This is **not** a directory tree
- Represents Python class inheritance/composition relationships -> model architecture hierarchy
- Distinguished from `components` (flat list): structure captures **inter-class relationships**
- Can be used to automatically place prerequisite nodes in learning paths
- `HuggingFaceAnalyzer`: scans only `modeling_utils.py` + 10 representative models (size-limited)
- `GenericAnalyzer`: scans up to 50 total Python files

### `dependencies` Design Intent
- Parses `requirements.txt`, `pyproject.toml`, `setup.py`, `package.json`
- Category classification:
  - `frameworks`: torch, jax, tensorflow, etc. -> framework prerequisite knowledge
  - `domain_libs`: peft, flash-attn, diffusers, etc. -> domain-specific prerequisite knowledge
  - `data`: numpy, datasets, pandas, etc.
  - `other`: everything else
- Used to automatically extract "what you need to know before reading this paper" in learning paths
- Implementation location: `BaseRepoAnalyzer.scan_dependencies()` (shared across all analyzers)

### Analyzer File Structure

```
analyzer/
├── base.py          # BaseRepoAnalyzer: shared scan_dependencies() implementation
├── models.py        # UniversalRepoAnalysis data model
├── registry.py      # @register_analyzer decorator
└── analyzers/
    ├── huggingface.py  # HF Transformers specific (structure: 10 representative models)
    └── generic.py      # Universal fallback (structure: up to 50 files)
```
