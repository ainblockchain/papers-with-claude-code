# Project Guidelines

> **IMPORTANT: All commits and code must be in English only. Do not write Korean in any commit messages, comments, variable names, or documentation.**

## Project Root

The root of this project is `/Users/comcom/Desktop/papers-with-claudecode/knowledge-graph-builder`.

## Reference Codebase

- When expressions like "original intent", "existing", or "existing implementation" appear, explore under `/Users/comcom/Desktop/papers-with-claudecode/knowledge-graph-builder/knowledge_graph_builder` to understand the original intent.
- **Files in that directory must never be modified.** Read (reference) only.

## Analyzer Architecture (`analyzer/`)

A newly developed general-purpose repo analyzer. Extends the HF-specific structure of `knowledge_graph_builder/` to analyze arbitrary paper repositories.

### UniversalRepoAnalysis Field Definitions

| Field | Type | Description |
|---|---|---|
| `components` | `list[ComponentInfo]` | List of classes/functions (name, path, type, metadata) |
| `commits` | `list[CommitInfo]` | Keyword-filtered commits (sha, date, message, tags) |
| `documentation` | `list[DocumentationInfo]` | README/docs summaries (path, title, summary, category) |
| `structure` | `dict` | **Model class hierarchy**: `{ClassName: {inherits: [...], file: path}}` |
| `dependencies` | `dict` | **Package dependencies**: `{frameworks, domain_libs, data, other, raw, source_files}` |
| `extensions` | `dict` | Repo-type-specific data (HF: `extensions.models`) |

### `structure` Design Intent
- This is **not** a directory tree
- Represents Python class inheritance/composition relationships → model architecture hierarchy
- Distinguished from `components` (flat list): structure represents **inter-class relationships**
- Can be used for automatic placement of prerequisite nodes in learning paths
- `HuggingFaceAnalyzer`: scans only `modeling_utils.py` + top 10 representative models (size limit)
- `GenericAnalyzer`: scans all Python files up to 50 (size limit)

### `dependencies` Design Intent
- Parses `requirements.txt`, `pyproject.toml`, `setup.py`, `package.json`
- Category classification:
  - `frameworks`: torch, jax, tensorflow, etc. → framework prerequisites
  - `domain_libs`: peft, flash-attn, diffusers, etc. → domain-specific prerequisites
  - `data`: numpy, datasets, pandas, etc.
  - `other`: everything else
- Used for automatic extraction of "what you need to know before reading this paper" in learning paths
- Implementation location: `BaseRepoAnalyzer.scan_dependencies()` (shared by all analyzers)

### Analyzer File Structure

```
analyzer/
├── base.py          # BaseRepoAnalyzer: shared scan_dependencies() implementation
├── models.py        # UniversalRepoAnalysis data models
├── registry.py      # @register_analyzer decorator
└── analyzers/
    ├── huggingface.py  # HF Transformers-specific (structure: top 10 representative models)
    └── generic.py      # General-purpose fallback (structure: up to 50 files)
```